import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Espèces",
  mobile_money_mtn: "MTN Mobile Money",
  mobile_money_moov: "MOOV Money",
  mobile_money_celtis: "CELTIS Pay",
  bank_transfer: "Virement bancaire",
  cash_on_delivery: "Paiement à la livraison",
  fedapay_online: "FedaPay (en ligne)",
  chariow_online: "Chariow (en ligne)",
};

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corps de requête JSON invalide" }, 400);
    }

    const {
      order_number,
      customer_name,
      customer_phone,
      total,
      payment_method,
      delivery_address,
      notes,
    } = body as Record<string, string>;

    const { data: settings } = await supabase
      .from("store_settings")
      .select("whatsapp_notify_number, callmebot_api_key, store_name")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.whatsapp_notify_number || !settings?.callmebot_api_key) {
      return json({ ok: false, reason: "WhatsApp notification non configurée" });
    }

    const phone = String(settings.whatsapp_notify_number).replace(/\D/g, "");
    const paymentLabel = PAYMENT_LABELS[payment_method] ?? payment_method;
    const amount = Number(total).toLocaleString("fr-FR");

    const lines = [
      `🛒 *Nouvelle commande !*`,
      ``,
      `📦 N° : *${order_number}*`,
      `👤 Client : ${customer_name}`,
      `📱 Tel : ${customer_phone}`,
      `💰 Montant : ${amount} FCFA`,
      `💳 Paiement : ${paymentLabel}`,
      `📍 Adresse : ${delivery_address || "Non précisée"}`,
      notes ? `📝 Notes : ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const text = encodeURIComponent(lines);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${text}&apikey=${settings.callmebot_api_key}`;

    const res = await fetch(url);
    const raw = await res.text();

    return json({ ok: res.ok, status: res.status, response: raw.slice(0, 300) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
