import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CHARIOW_BASE = "https://api.chariow.com/v1";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CHARIOW_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "CHARIOW_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/chariow-checkout\/?/, "");

    const chariowHeaders = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    let chariowRes: Response;

    if (path === "initiate" && req.method === "POST") {
      // CHARIOW_PRODUCT_ID must be set to a published product ID/slug from the Chariow dashboard
      const productId = Deno.env.get("CHARIOW_PRODUCT_ID");
      if (!productId) {
        return new Response(
          JSON.stringify({
            error: "CHARIOW_PRODUCT_ID not configured. Please add it in Edge Function secrets.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = await req.json();

      // Build a clean Chariow-compatible payload — only fields the API accepts
      const chariowPayload: Record<string, unknown> = {
        product_id: productId,
        email: body.email,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
      };

      if (body.redirect_url) chariowPayload.redirect_url = body.redirect_url;
      if (body.custom_metadata) chariowPayload.custom_metadata = body.custom_metadata;
      if (body.discount_code) chariowPayload.discount_code = body.discount_code;
      if (body.campaign_id) chariowPayload.campaign_id = body.campaign_id;

      chariowRes = await fetch(`${CHARIOW_BASE}/checkout`, {
        method: "POST",
        headers: chariowHeaders,
        body: JSON.stringify(chariowPayload),
      });

    } else if (path === "sales" && req.method === "GET") {
      chariowRes = await fetch(`${CHARIOW_BASE}/sales`, { headers: chariowHeaders });

    } else if (path.startsWith("sales/") && req.method === "GET") {
      const saleId = path.replace("sales/", "");
      chariowRes = await fetch(`${CHARIOW_BASE}/sales/${saleId}`, { headers: chariowHeaders });

    } else if (path === "store" && req.method === "GET") {
      chariowRes = await fetch(`${CHARIOW_BASE}/store`, { headers: chariowHeaders });

    } else {
      return new Response(
        JSON.stringify({ error: "Unknown route: " + path }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await chariowRes.json();
    return new Response(JSON.stringify(data), {
      status: chariowRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
