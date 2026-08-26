import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function safeJson(res: Response): Promise<{ ok: boolean; status: number; data: unknown; raw: string }> {
  const raw = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(raw), raw };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw: raw.slice(0, 800) };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const secretKey = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!secretKey) {
      return json({ error: "FEDAPAY_SECRET_KEY non configuré" }, 500);
    }

    const environment = (Deno.env.get("FEDAPAY_ENVIRONMENT") ?? "live").trim();
    const BASE = environment === "sandbox"
      ? "https://sandbox-api.fedapay.com/v1"
      : "https://api.fedapay.com/v1";

    const apiHeaders = {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    };

    const reqUrl = new URL(req.url);
    const path = reqUrl.pathname.replace(/^\/fedapay-checkout\/?/, "");

    // ── POST /initiate ────────────────────────────────────────────────────────
    if (path === "initiate" && req.method === "POST") {
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Corps de requête JSON invalide" }, 400);
      }

      // Normalize customer phone: country lowercase, digits only
      const cust = (body.customer ?? {}) as Record<string, unknown>;
      const ph = (cust.phone_number ?? {}) as Record<string, unknown>;
      const customer = {
        ...cust,
        phone_number: ph.number
          ? { number: String(ph.number).replace(/\D/g, ""), country: String(ph.country ?? "bj").toLowerCase() }
          : undefined,
      };

      // 1. Create transaction
      const txFetch = await fetch(`${BASE}/transactions`, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          description: body.description ?? "Commande en ligne",
          amount: Number(body.amount),
          currency: { iso: "XOF" },
          callback_url: body.callback_url,
          custom_metadata: body.custom_metadata ?? {},
          customer,
        }),
      });

      const tx = await safeJson(txFetch);

      if (!tx.ok) {
        return json({ error: "FedaPay: création de transaction échouée", details: tx.data, raw: tx.raw }, tx.status >= 400 ? tx.status : 502);
      }

      // FedaPay REST API returns { "v1/transaction": { id, ... } }
      const d = tx.data as Record<string, unknown>;
      const txObj =
        (d?.["v1/transaction"] as Record<string, unknown>) ??
        ((d?.["v1"] as Record<string, unknown>)?.["transaction"] as Record<string, unknown>) ??
        (d?.["transaction"] as Record<string, unknown>) ??
        d;
      const txId = txObj?.["id"] as number | undefined;

      if (!txId) {
        const dump = JSON.stringify(tx.data ?? tx.raw).slice(0, 600);
        return json({ error: `FedaPay: ID introuvable. Structure: ${dump}` }, 500);
      }

      // 2. Generate payment token/URL
      const tokenFetch = await fetch(`${BASE}/transactions/${txId}/token`, {
        method: "POST",
        headers: apiHeaders,
      });

      const tok = await safeJson(tokenFetch);

      if (!tok.ok) {
        return json({ error: "FedaPay: génération du lien échouée", details: tok.data, raw: tok.raw }, tok.status >= 400 ? tok.status : 502);
      }

      const td = tok.data as Record<string, unknown>;
      const tokNested = td?.["v1/token"] as Record<string, unknown> | undefined;
      const tokenVal = (tokNested?.["token"] ?? td?.["token"]) as string | undefined;
      const paymentUrl = (tokNested?.["url"] ?? td?.["url"]) as string | undefined;

      if (!paymentUrl && !tokenVal) {
        return json({ error: `FedaPay: token absent. Réponse: ${JSON.stringify(td).slice(0, 400)}` }, 500);
      }

      const finalUrl = paymentUrl ?? `https://checkout.fedapay.com/payment?token=${tokenVal}`;

      return json({ transaction_id: txId, token: tokenVal, url: finalUrl });

    // ── GET /transactions/:id ─────────────────────────────────────────────────
    } else if (path.startsWith("transactions/") && req.method === "GET") {
      const txId = path.replace("transactions/", "");
      const r = await fetch(`${BASE}/transactions/${txId}`, { headers: apiHeaders });
      const { data, raw, status } = await safeJson(r);
      return json(data ?? { raw }, status);

    } else {
      return json({ error: "Route inconnue: " + path }, 404);
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return new Response(
      JSON.stringify({ error: message, stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
