import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BUCKET = "product-images";
const MAX_DIMENSION = 1400; // px — enough for any display at 2x

/**
 * Build a wsrv.nl URL that fetches the original, converts to WebP,
 * resizes to max MAX_DIMENSION on the longest side, strips metadata.
 */
function wsrvUrl(originalUrl: string): string {
  const params = new URLSearchParams({
    url: originalUrl,
    w: String(MAX_DIMENSION),
    h: String(MAX_DIMENSION),
    fit: "inside",      // keep aspect ratio, no crop
    output: "webp",
    q: "83",            // quality 83 — great visual / size balance
    n: "-1",            // strip EXIF / metadata
  });
  return `https://wsrv.nl/?${params}`;
}

/** Generate a stable filename from the URL to avoid re-uploading the same image */
async function hashFilename(url: string): Promise<string> {
  const data = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
  return `${hex}.webp`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json() as { urls: string[] };
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];

    if (urls.length === 0) return json({ error: "urls[] required" }, 400);

    const results: Array<{
      original: string;
      optimized: string;
      status: "optimized" | "already_stored" | "failed";
      size_kb?: number;
    }> = [];

    for (const rawUrl of urls) {
      const url = rawUrl.trim();
      if (!url) continue;

      // Skip if already stored on this Supabase project's storage
      if (url.startsWith(supabaseUrl) && url.includes("/storage/v1/object/public/")) {
        results.push({ original: url, optimized: url, status: "already_stored" });
        continue;
      }

      const filename = await hashFilename(url);

      // Check if we already uploaded this exact image before
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list("", { search: filename });

      if (existing && existing.some((f) => f.name === filename)) {
        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        results.push({ original: url, optimized: publicUrl, status: "already_stored" });
        continue;
      }

      // Fetch optimized image via wsrv.nl
      let imageBytes: ArrayBuffer | null = null;
      let fetchedViaProxy = false;

      try {
        const proxyRes = await fetch(wsrvUrl(url), {
          headers: { "User-Agent": "MagasinPro-ImageOptimizer/1.0" },
          signal: AbortSignal.timeout(20_000),
        });
        if (proxyRes.ok) {
          imageBytes = await proxyRes.arrayBuffer();
          fetchedViaProxy = true;
        }
      } catch {
        // wsrv.nl unavailable — fall back to fetching original
      }

      if (!imageBytes) {
        // Fallback: fetch original image directly
        try {
          const origRes = await fetch(url, {
            headers: { "User-Agent": "MagasinPro-ImageOptimizer/1.0" },
            signal: AbortSignal.timeout(15_000),
          });
          if (origRes.ok) imageBytes = await origRes.arrayBuffer();
        } catch {
          results.push({ original: url, optimized: url, status: "failed" });
          continue;
        }
      }

      if (!imageBytes || imageBytes.byteLength === 0) {
        results.push({ original: url, optimized: url, status: "failed" });
        continue;
      }

      // Upload to Supabase Storage
      const contentType = fetchedViaProxy ? "image/webp" : "image/jpeg";
      const uploadFilename = fetchedViaProxy ? filename : filename.replace(".webp", ".jpg");

      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(uploadFilename, imageBytes, {
          contentType,
          cacheControl: "31536000", // 1 year immutable
          upsert: false,
        });

      if (uploadErr || !uploaded) {
        results.push({ original: url, optimized: url, status: "failed" });
        continue;
      }

      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(uploaded.path);

      results.push({
        original: url,
        optimized: publicUrl,
        status: "optimized",
        size_kb: Math.round(imageBytes.byteLength / 1024),
      });
    }

    return json({ results });

  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
