complète : Edge Function Supabase

Fichier : `supabase/functions/fedapay-checkout/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function safeJson(res: Response) {
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
    if (!secretKey) return json({ error: "FEDAPAY_SECRET_KEY non configuré" }, 500);

    const environment = (Deno.env.get("FEDAPAY_ENVIRONMENT") ?? "live").trim();
    const BASE = environment === "sandbox"
      ? "https://sandbox-api.fedapay.com/v1"
      : "https://api.fedapay.com/v1";

    const apiHeaders = {
      "Authorization": `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    };

    const path = new URL(req.url).pathname.replace(/^\/fedapay-checkout\/?/, "");

    // POST /initiate — créer transaction + générer URL
    if (path === "initiate" && req.method === "POST") {
      const body = await req.json() as Record<string, unknown>;

      // Normaliser le téléphone
      const cust = (body.customer ?? {}) as Record<string, unknown>;
      const ph = (cust.phone_number ?? {}) as Record<string, unknown>;
      const customer = {
        ...cust,
        phone_number: ph.number ? {
          number: String(ph.number).replace(/\D/g, ""),
          country: String(ph.country ?? "bj").toLowerCase(),
        } : undefined,
      };

      // 1. Créer la transaction
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
        return json({ error: "FedaPay: création de transaction échouée", details: tx.data }, tx.status >= 400 ? tx.status : 502);
      }

      // Extraire l'ID (réponse nestée sous "v1/transaction")
      const d = tx.data as Record<string, unknown>;
      const txObj = (d?.["v1/transaction"] as Record<string, unknown>) ?? d;
      const txId = txObj?.["id"] as number | undefined;
      if (!txId) {
        return json({ error: `FedaPay: ID introuvable. Structure: ${JSON.stringify(tx.data).slice(0, 600)}` }, 500);
      }

      // 2. Générer le token de paiement
      const tokenFetch = await fetch(`${BASE}/transactions/${txId}/token`, {
        method: "POST",
        headers: apiHeaders,
      });

      const tok = await safeJson(tokenFetch);
      if (!tok.ok) {
        return json({ error: "FedaPay: génération du lien échouée", details: tok.data }, tok.status >= 400 ? tok.status : 502);
      }

      // Extraire token et URL (gère format nested et plat)
      const td = tok.data as Record<string, unknown>;
      const nested = td?.["v1/token"] as Record<string, unknown> | undefined;
      const tokenVal = (nested?.["token"] ?? td?.["token"]) as string | undefined;
      const paymentUrl = (nested?.["url"] ?? td?.["url"]) as string | undefined;

      if (!paymentUrl && !tokenVal) {
        return json({ error: `FedaPay: token absent. Réponse: ${JSON.stringify(td).slice(0, 400)}` }, 500);
      }

      const finalUrl = paymentUrl ?? `https://checkout.fedapay.com/payment?token=${tokenVal}`;
      return json({ transaction_id: txId, token: tokenVal, url: finalUrl });
    }

    // GET /transactions/:id — vérifier le statut
    if (path.startsWith("transactions/") && req.method === "GET") {
      const txId = path.replace("transactions/", "");
      const r = await fetch(`${BASE}/transactions/${txId}`, { headers: apiHeaders });
      const { data, raw, status } = await safeJson(r);
      return json(data ?? { raw }, status);
    }

    return json({ error: "Route inconnue: " + path }, 404);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
```

---

## 12. Implémentation complète : Frontend React

```typescript
// Dans votre handler de soumission de commande
async function handleFedaPayCheckout(order: Order, cartItems: CartItem[]) {
  const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fedapay-checkout`;
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${EDGE_URL}/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`,
      "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      description: `Commande ${order.order_number}`,
      amount: order.total_amount,
      callback_url: `${window.location.origin}/commandes?order_id=${order.id}`,
      customer: {
        firstname: order.customer_name.split(" ")[0],
        lastname: order.customer_name.split(" ").slice(1).join(" "),
        email: user.email,
        phone_number: { number: order.customer_phone, country: "bj" },
      },
      custom_metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Erreur ${res.status}`);
  }

  const data = await res.json();
  const paymentUrl: string | undefined = data?.url;

  if (!paymentUrl) {
    throw new Error(`URL de paiement absente. Réponse: ${JSON.stringify(data)}`);
  }

  // IMPORTANT : utiliser window.open pour éviter les blocages service worker
  window.open(paymentUrl, '_blank');
}

// Sur la page callback (après retour de FedaPay)
async function verifyPayment(transactionId: string) {
  const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fedapay-checkout`;
  const res = await fetch(`${EDGE_URL}/transactions/${transactionId}`, {
    headers: { "Apikey": import.meta.env.VITE_SUPABASE_ANON_KEY },
  });
  const data = await res.json();
  const txObj = data?.["v1/transaction"] ?? data;
  return txObj?.status as "approved" | "declined" | "canceled" | "pending";
}
```

---

## 13. Pièges courants et solutions

### 1. Réponse JSON nestée (`v1/transaction`, `v1/token`)

**Symptôme** : `transaction.id` est `undefined`, ID non trouvé.  
**Cause** : La vraie réponse API est `{ "v1/transaction": { "id": 123 } }`, pas `{ "id": 123 }`.  
**Solution** : Toujours lire depuis `response["v1/transaction"]` avec fallback.

---

### 2. Redirection bloquée par le service worker

**Symptôme** : Transaction créée dans FedaPay (visible dans le dashboard) mais le client reste sur votre site avec une erreur.  
**Cause** : `window.location.href` est intercepté dans certains environnements (Bolt WebContainers, iframes).  
**Solution** : Utiliser `window.open(url, '_blank')`.

---

### 3. Numéro de téléphone invalide

**Symptôme** : Erreur `422` ou `400` de l'API FedaPay avec message sur le champ `phone_number`.  
**Cause** : Format `"+22997808080"` ou pays en majuscules `"BJ"`.  
**Solution** :
```typescript
number: phone.replace(/\D/g, ""),    // "97808080"
country: countryCode.toLowerCase()   // "bj"
```

---

### 4. Email client dupliqué

**Symptôme** : Erreur à la création de la transaction.  
**Cause** : FedaPay fusionne les clients par email. Envoyer le même email avec des données différentes met à jour le client, mais en cas de conflit ça peut échouer.  
**Solution** : Utiliser des emails cohérents et uniques par client.

---

### 5. Ne jamais faire confiance au `status` de l'URL callback

**Symptôme** : Des commandes validées même si le paiement a échoué.  
**Cause** : N'importe qui peut forger `?status=approved` dans l'URL.  
**Solution** : Toujours vérifier via `GET /v1/transactions/{id}` côté serveur.

---

### 6. Clé sandbox vs live

**Symptôme** : Erreur `401 Unauthorized`.  
**Cause** : Utiliser la clé sandbox avec l'URL live ou inversement.  
**Solution** :
- Sandbox : `sk_sandbox_xxx` → `https://sandbox-api.fedapay.com/v1`
- Live : `sk_live_xxx` → `https://api.fedapay.com/v1`

---

### 7. `merchant_reference` dupliqué

**Symptôme** : Erreur à la création si vous utilisez `merchant_reference`.  
**Cause** : FedaPay exige l'unicité de cette référence.  
**Solution** : Utiliser un UUID ou un timestamp unique par transaction.

---

## 14. Checklist de mise en production

- [ ] Remplacer la clé sandbox par la clé live dans les secrets
- [ ] Remplacer `FEDAPAY_ENVIRONMENT=sandbox` par `FEDAPAY_ENVIRONMENT=live`
- [ ] Vérifier que `callback_url` pointe vers votre domaine de production
- [ ] Implémenter la vérification du statut côté serveur (ne pas faire confiance à l'URL)
- [ ] Tester un vrai paiement Mobile Money en live (montant minimal : 100 XOF)
- [ ] Mettre en place un webhook FedaPay pour les paiements asynchrones
- [ ] Logger toutes les transactions côté base de données
- [ ] Gérer les timeouts (une transaction `pending` expire après 24h)

---

## Ressources

- Documentation officielle : https://docs.fedapay.com
- API Reference : https://docs.fedapay.com/api-reference/transactions/create-token
- Dashboard Sandbox : https://sandbox.fedapay.com
- Dashboard Live : https://dashboard.fedapay.com
