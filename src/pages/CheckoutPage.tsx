import { useState } from 'react';
import {
  ArrowLeft, Loader2, CheckCircle2, MessageCircle,
  Banknote, Smartphone, Building2, Truck, CreditCard, ExternalLink, UserPlus, Copy, Check,
  TicketPercent, X,
} from 'lucide-react';
import { useCart, getEffectivePrice } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/format';
import type { PaymentMethod } from '../lib/database.types';
import type { PromoCode } from '../lib/database.types';
import type { View } from '../lib/views';

// ─── Payment method definitions ───────────────────────────────────────────────

interface PaymentOption {
  method: PaymentMethod;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  group: 'manual' | 'online';
  color: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { method: 'cash',               label: 'Espèces',                sublabel: 'Paiement en main propre',         icon: <Banknote className="w-5 h-5" />,    group: 'manual', color: 'brand-success' },
  { method: 'mobile_money_mtn',   label: 'MTN Mobile Money',       sublabel: 'MTN MoMo',                        icon: <Smartphone className="w-5 h-5" />,  group: 'manual', color: 'brand-warning' },
  { method: 'mobile_money_moov',  label: 'MOOV Money',             sublabel: 'Moov Africa',                     icon: <Smartphone className="w-5 h-5" />,  group: 'manual', color: 'brand-info' },
  { method: 'mobile_money_celtis',label: 'CELTIS Pay',             sublabel: 'Celtis Mobile',                   icon: <Smartphone className="w-5 h-5" />,  group: 'manual', color: 'brand-primary' },
  { method: 'bank_transfer',      label: 'Virement bancaire',      sublabel: 'Virement sur compte',             icon: <Building2 className="w-5 h-5" />,   group: 'manual', color: 'brand-secondary' },
  { method: 'cash_on_delivery',   label: 'Paiement à la livraison',sublabel: 'Règlement à réception',           icon: <Truck className="w-5 h-5" />,       group: 'manual', color: 'brand-muted' },
  { method: 'fedapay_online',     label: 'FedaPay',                sublabel: 'MoMo · Carte · Wave · etc.',      icon: <CreditCard className="w-5 h-5" />,  group: 'online', color: 'brand-success' },
  { method: 'chariow_online',     label: 'Chariow',                sublabel: 'Paiement via Chariow',            icon: <CreditCard className="w-5 h-5" />,  group: 'online', color: 'brand-primary' },
];

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  mobile_money_mtn: 'MTN Mobile Money',
  mobile_money_moov: 'MOOV Money',
  mobile_money_celtis: 'CELTIS Pay',
  bank_transfer: 'Virement bancaire',
  cash_on_delivery: 'Paiement à la livraison',
  fedapay_online: 'FedaPay (en ligne)',
  chariow_online: 'Chariow (en ligne)',
};

export { METHOD_LABELS };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CheckoutPage({ setView }: { setView: (v: View) => void }) {
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [guestEmail, setGuestEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [chariowUrl, setChariowUrl] = useState<string | null>(null);
  const [autoCredentials, setAutoCredentials] = useState<{ email: string; password: string } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // ── Promo code state ──
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoReward, setPromoReward] = useState(0);

  const finalTotal = appliedPromo ? Math.max(0, subtotal - promoDiscount) : subtotal;

  async function applyPromo() {
    setPromoError(null);
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setPromoChecking(true);
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    setPromoChecking(false);

    if (error || !data) {
      setAppliedPromo(null);
      setPromoDiscount(0);
      setPromoReward(0);
      setPromoError('Code promo introuvable');
      return;
    }

    const pc = data as PromoCode;

    if (!pc.is_active) {
      setAppliedPromo(null); setPromoDiscount(0); setPromoReward(0);
      setPromoError('Ce code promo n\u2019est plus actif'); return;
    }
    if (pc.starts_at && new Date(pc.starts_at).getTime() > Date.now()) {
      setAppliedPromo(null); setPromoDiscount(0); setPromoReward(0);
      setPromoError('Ce code promo n\u2019est pas encore valide'); return;
    }
    if (pc.ends_at && new Date(pc.ends_at).getTime() < Date.now()) {
      setAppliedPromo(null); setPromoDiscount(0); setPromoReward(0);
      setPromoError('Ce code promo a expiré'); return;
    }
    if (pc.max_uses !== null && pc.used_count >= pc.max_uses) {
      setAppliedPromo(null); setPromoDiscount(0); setPromoReward(0);
      setPromoError('Ce code promo a atteint sa limite d\u2019utilisations'); return;
    }
    if (subtotal < pc.min_order_amount) {
      setAppliedPromo(null); setPromoDiscount(0); setPromoReward(0);
      setPromoError(`Montant minimum requis : ${formatPrice(pc.min_order_amount)}`); return;
    }

    const discount = pc.discount_type === 'percentage'
      ? Math.round(subtotal * pc.discount_value) / 100
      : Math.min(pc.discount_value, subtotal);
    const reward = Math.round((subtotal - discount) * pc.commission_rate) / 100;

    setAppliedPromo(pc);
    setPromoDiscount(discount);
    setPromoReward(reward);
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoDiscount(0);
    setPromoReward(0);
    setPromoError(null);
  }

  if (items.length === 0 && !orderNumber) { setView({ kind: 'shop' }); return null; }

  if (orderNumber) {
    const msg = encodeURIComponent(`Bonjour, ma commande ${orderNumber} d'un montant de ${formatPrice(subtotal)}. Merci de la confirmer.`);
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-brand-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-brand-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
        <p className="text-brand-muted mb-2">Numéro de commande :</p>
        <p className="text-lg font-mono font-semibold text-brand-primary mb-2">{orderNumber}</p>
        <p className="text-sm text-brand-muted mb-6">
          Mode de paiement : <span className="font-medium">{METHOD_LABELS[payment]}</span>
        </p>

        {/* Auto-created credentials */}
        {autoCredentials && (
          <div className="bg-brand-success/5 border border-brand-success/20 rounded-xl p-5 mb-6 text-left">
            <p className="font-semibold text-brand-success mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />Votre compte a été créé !
            </p>
            <p className="text-sm text-brand-muted mb-3">
              Notez ces identifiants pour suivre vos commandes :
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium w-28 flex-shrink-0 text-brand-dark">Email :</span>
                <code className="bg-white border border-brand-border rounded-md px-2 py-1 text-xs flex-1 truncate">
                  {autoCredentials.email}
                </code>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium w-28 flex-shrink-0 text-brand-dark">Mot de passe :</span>
                <code className="bg-white border border-brand-border rounded-md px-2 py-1 text-xs flex-1 font-mono tracking-widest">
                  {autoCredentials.password}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(autoCredentials.password);
                    setPasswordCopied(true);
                    setTimeout(() => setPasswordCopied(false), 2000);
                  }}
                  className="p-1.5 rounded hover:bg-brand-success/10 text-brand-success transition flex-shrink-0"
                  title="Copier le mot de passe"
                >
                  {passwordCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-brand-muted mt-3">
              Vous pouvez modifier ce mot de passe depuis votre profil après connexion.
            </p>
          </div>
        )}

        {/* Chariow payment link */}
        {chariowUrl && (
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-5 mb-6 text-left">
            <p className="font-semibold text-brand-primary mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />Finaliser le paiement en ligne
            </p>
            <p className="text-sm text-brand-muted mb-3">Cliquez sur le bouton ci-dessous pour être redirigé vers la page de paiement sécurisée Chariow.</p>
            <a href={chariowUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary w-full justify-center gap-2">
              <ExternalLink className="w-4 h-4" />Payer maintenant
            </a>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {user ? (
            <button onClick={() => setView({ kind: 'orders' })} className="btn-primary">Voir mes commandes</button>
          ) : (
            <button onClick={() => setView({ kind: 'auth' })} className="btn-primary">Se connecter</button>
          )}
          <a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <MessageCircle className="w-4 h-4" />Confirmer sur WhatsApp
          </a>
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // ── Step 0: resolve user identity ────────────────────────────────────────
    let resolvedId: string;
    let resolvedEmail: string;
    let newCredentials: { email: string; password: string } | null = null;

    if (user) {
      resolvedId = user.id;
      resolvedEmail = user.email ?? guestEmail;
    } else {
      const password = generatePassword();
      const { data: sd, error: se } = await supabase.auth.signUp({
        email: guestEmail,
        password,
      });

      if (se || !sd.user) {
        const msg = se?.message ?? '';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
          setError('Cet email est déjà enregistré. Connectez-vous avant de commander.');
        } else {
          setError(msg || 'Erreur lors de la création du compte. Réessayez.');
        }
        setSubmitting(false);
        return;
      }

      resolvedId = sd.user.id;
      resolvedEmail = guestEmail;
      newCredentials = { email: guestEmail, password };

      await supabase.from('profiles').insert({
        id: resolvedId,
        full_name: name,
        phone,
        role: 'customer',
      });
    }

    // ── Step 1: Create order ──────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      customer_id: resolvedId,
      customer_name: name,
      customer_phone: phone,
      delivery_address: address,
      notes,
      payment_method: payment,
      source: 'online',
      total: finalTotal,
      status: 'pending',
      payment_status: 'pending',
    }).select().single();

    if (orderErr || !order) {
      setError(orderErr?.message ?? 'Erreur lors de la création de la commande');
      setSubmitting(false);
      return;
    }

    // ── Step 2: Order items ───────────────────────────────────────────────────
    const orderItems = items.map((it) => {
      const unit = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
      return {
        order_id: (order as { id: string }).id,
        product_id: it.product.id,
        product_name: it.customTitle ?? it.product.name,
        quantity: it.quantity,
        unit_price: unit,
        subtotal: unit * it.quantity,
      };
    });
    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) { setError(itemsErr.message); setSubmitting(false); return; }

    // ── Step 2b: Promo code usage ──────────────────────────────────────────────
    if (appliedPromo) {
      await Promise.all([
        supabase.from('promo_usages').insert({
          promo_code_id: appliedPromo.id,
          order_id: (order as { id: string }).id,
          code: appliedPromo.code,
          partner_name: appliedPromo.partner_name,
          order_total: finalTotal,
          discount_amount: promoDiscount,
          commission_rate: appliedPromo.commission_rate,
          commission_amount: promoReward,
          commission_status: 'pending',
        }),
        supabase.rpc('increment_promo_used_count', { promo_id: appliedPromo.id }),
      ]).catch(() => { /* non-fatal */ });
    }

    // ── Step 2c: WhatsApp notification (fire-and-forget) ─────────────────────────
    fetch(`${SUPABASE_URL}/functions/v1/notify-order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_number: (order as { order_number: string }).order_number,
        customer_name: name,
        customer_phone: phone,
        total: finalTotal,
        payment_method: payment,
        delivery_address: address,
        notes,
      }),
    }).catch(() => { /* ignore notification failures */ });

    // ── Step 3: Payment entry ─────────────────────────────────────────────────
    await supabase.from('payments').insert({
      order_id: (order as { id: string }).id,
      order_number: (order as { order_number: string }).order_number,
      method: payment,
      amount: finalTotal,
      status: 'pending',
      payer_name: name,
      payer_phone: phone,
    });

    // ── Step 4a: FedaPay online ───────────────────────────────────────────────
    if (payment === 'fedapay_online') {
      try {
        const nameParts = name.trim().split(' ');
        const res = await fetch(`${SUPABASE_URL}/functions/v1/fedapay-checkout/initiate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: finalTotal,
            description: `Commande ${(order as { order_number: string }).order_number}`,
            callback_url: `${window.location.origin}?order=${(order as { order_number: string }).order_number}`,
            customer: {
              email: resolvedEmail,
              firstname: nameParts[0] ?? name,
              lastname: nameParts.slice(1).join(' ') || nameParts[0],
              phone_number: {
                number: phone.replace(/\D/g, '') || '0',
                country: 'bj',
              },
            },
            custom_metadata: {
              order_number: (order as { order_number: string }).order_number,
              order_id: (order as { id: string }).id,
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(`FedaPay : ${data?.error ?? data?.message ?? `Erreur ${res.status}`}`);
          setSubmitting(false);
          return;
        }

        const paymentUrl: string | undefined = data?.url;

        if (paymentUrl) {
          await supabase.from('payments').update({
            transaction_id: String(data.transaction_id ?? ''),
          }).eq('order_id', (order as { id: string }).id);

          if (newCredentials) setAutoCredentials(newCredentials);
          clearCart();
          setSubmitting(false);
          window.open(paymentUrl, '_blank');
          setOrderNumber((order as { order_number: string }).order_number);
          return;
        }

        setError(`FedaPay : URL absente. Données: ${JSON.stringify(data).slice(0, 500)}`);
        setSubmitting(false);
        return;
      } catch {
        setError('Impossible de contacter FedaPay. Vérifiez votre connexion.');
        setSubmitting(false);
        return;
      }
    }

    // ── Step 4b: Chariow online ───────────────────────────────────────────────
    if (payment === 'chariow_online') {
      try {
        const nameParts = name.trim().split(' ');
        const res = await fetch(`${SUPABASE_URL}/functions/v1/chariow-checkout/initiate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: resolvedEmail,
            first_name: nameParts[0] ?? name,
            last_name: nameParts.slice(1).join(' ') || nameParts[0],
            phone: { number: phone.replace(/\D/g, '') || '00000000', country_code: 'BJ' },
            redirect_url: `${window.location.origin}?order=${(order as { order_number: string }).order_number}`,
            custom_metadata: {
              order_number: (order as { order_number: string }).order_number,
              order_id: (order as { id: string }).id,
              order_amount: String(finalTotal),
              customer_name: name,
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(`Paiement Chariow indisponible : ${data?.error ?? data?.message ?? res.status}. Choisissez un autre mode ou contactez l'administrateur.`);
          setSubmitting(false);
          return;
        }

        const step = data?.data?.step;
        const checkoutUrl = data?.data?.payment?.checkout_url ?? null;

        if (step === 'payment' && checkoutUrl) {
          await Promise.all([
            supabase.from('orders').update({
              chariow_sale_id: data?.data?.purchase?.id ?? '',
            }).eq('id', (order as { id: string }).id),
            supabase.from('payments').update({
              transaction_id: data?.data?.purchase?.id ?? '',
              chariow_checkout_url: checkoutUrl,
            }).eq('order_id', (order as { id: string }).id),
          ]);

          setChariowUrl(checkoutUrl);
          if (newCredentials) setAutoCredentials(newCredentials);
          clearCart();
          setSubmitting(false);
          window.open(checkoutUrl, '_blank');
          setOrderNumber((order as { order_number: string }).order_number);
          return;
        }

        if (step === 'already_purchased') {
          setError('Ce produit Chariow a déjà été acheté par ce compte. Contactez l\'administrateur.');
          setSubmitting(false);
          return;
        }
      } catch {
        setError('Impossible de contacter Chariow. Vérifiez votre connexion ou choisissez un autre mode de paiement.');
        setSubmitting(false);
        return;
      }
    }

    // ── Success ───────────────────────────────────────────────────────────────
    if (newCredentials) setAutoCredentials(newCredentials);
    setOrderNumber((order as { order_number: string }).order_number);
    clearCart();
    setSubmitting(false);
  }

  const manualOptions = PAYMENT_OPTIONS.filter((o) => o.group === 'manual');
  const onlineOptions = PAYMENT_OPTIONS.filter((o) => o.group === 'online');

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <button onClick={() => setView({ kind: 'cart' })} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />Retour au panier
      </button>
      <h1 className="text-2xl font-bold mb-6">Finaliser la commande</h1>
      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* Contact */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Coordonnées</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom complet</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" className="input" placeholder="Ex: 97000000" />
              </div>
              {!user && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Email <span className="text-brand-muted font-normal">(pour recevoir vos commandes)</span>
                  </label>
                  <input
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                    type="email"
                    className="input"
                    placeholder="votre@email.com"
                    autoComplete="email"
                  />
                  <p className="text-xs text-brand-muted mt-1 flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    Un compte sera créé automatiquement pour suivre vos commandes.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Adresse de livraison</h2>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} required rows={3} placeholder="Adresse complète, quartier, ville…" className="input resize-none" />
          </div>

          {/* Payment methods */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Mode de paiement</h2>

            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Paiement manuel</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {manualOptions.map((opt) => (
                <button key={opt.method} type="button" onClick={() => setPayment(opt.method)}
                  className={`flex items-center gap-3 p-3 border rounded-xl text-left transition-all ${
                    payment === opt.method
                      ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                      : 'border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface'
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    payment === opt.method ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-muted'
                  }`}>
                    {opt.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${payment === opt.method ? 'text-brand-primary' : ''}`}>{opt.label}</p>
                    {opt.sublabel && <p className="text-xs text-brand-muted truncate">{opt.sublabel}</p>}
                  </div>
                  {payment === opt.method && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">Paiement en ligne</p>
            <div className="grid grid-cols-1 gap-2">
              {onlineOptions.map((opt) => (
                <button key={opt.method} type="button" onClick={() => setPayment(opt.method)}
                  className={`flex items-center gap-3 p-3 border rounded-xl text-left transition-all ${
                    payment === opt.method
                      ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                      : 'border-brand-border hover:border-brand-primary/50 hover:bg-brand-surface'
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    payment === opt.method ? 'bg-brand-primary text-white' : 'bg-brand-surface text-brand-muted'
                  }`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${payment === opt.method ? 'text-brand-primary' : ''}`}>{opt.label}</p>
                    {opt.sublabel && <p className="text-xs text-brand-muted">{opt.sublabel}</p>}
                  </div>
                  <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full font-medium flex-shrink-0">Sécurisé</span>
                  {payment === opt.method && (
                    <div className="w-4 h-4 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {payment === 'fedapay_online' && (
              <div className="mt-3 p-3 bg-brand-success/5 border border-brand-success/20 rounded-lg text-xs text-brand-success">
                Vous serez automatiquement redirigé vers FedaPay pour payer par Mobile Money (MTN, Moov), carte bancaire ou Wave.
              </div>
            )}
            {payment === 'chariow_online' && (
              <div className="mt-3 p-3 bg-brand-info/5 border border-brand-info/20 rounded-lg text-xs text-brand-info">
                Vous serez redirigé vers la page de paiement sécurisée Chariow après validation de votre commande.
              </div>
            )}
            {(payment === 'mobile_money_mtn' || payment === 'mobile_money_moov' || payment === 'mobile_money_celtis') && (
              <div className="mt-3 p-3 bg-brand-warning/5 border border-brand-warning/20 rounded-lg text-xs text-brand-warning">
                Après validation, vous recevrez les instructions de paiement par SMS ou WhatsApp.
              </div>
            )}
            {payment === 'bank_transfer' && (
              <div className="mt-3 p-3 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-muted">
                Les coordonnées bancaires vous seront communiquées après validation de la commande.
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Notes (optionnel)</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Instructions particulières…" className="input resize-none" />
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Récapitulatif</h2>
            <div className="space-y-3 text-sm max-h-72 overflow-auto pb-3 border-b border-brand-border">
              {items.map((it) => {
                const key = it.cartKey ?? it.product.id;
                const price = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="line-clamp-2 text-gray-900 font-medium text-xs">
                        {it.quantity} × {it.customTitle ?? it.product.name}
                      </span>
                      <span className="font-bold text-xs flex-shrink-0 text-brand-primary">
                        {formatPrice(price * it.quantity)}
                      </span>
                    </div>

                    {it.packBreakdown && it.packBreakdown.length > 0 && (
                      <div className="pl-2 border-l-2 border-[#D10024] bg-red-50/50 rounded-r p-1.5 text-[10px] space-y-0.5">
                        <p className="font-bold text-[#D10024] text-[9px] uppercase tracking-wider">
                          Détail Pack ({it.eventType || 'Dot & Mariage'}) :
                        </p>
                        {it.packBreakdown.map((b, idx) => (
                          <div key={idx} className="flex justify-between text-gray-700">
                            <span>{b.icon} {b.quantity * it.quantity} × {b.name}</span>
                            <span className="text-gray-400 text-[9px] ml-1">{b.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="py-3 border-b border-brand-border">
              <div className="flex justify-between text-sm text-brand-muted mb-1">
                <span>Mode de paiement</span>
                <span className="font-medium text-brand-dark text-xs text-right max-w-32 truncate">{METHOD_LABELS[payment]}</span>
              </div>
            </div>

            {/* Promo code input */}
            <div className="py-3 border-b border-brand-border">
              {appliedPromo ? (
                <div className="flex items-center justify-between gap-2 bg-brand-success/5 border border-brand-success/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <TicketPercent className="w-4 h-4 text-brand-success flex-shrink-0" />
                    <div className="min-w-0">
                      <code className="font-mono text-sm font-semibold text-brand-success">{appliedPromo.code}</code>
                      <p className="text-xs text-brand-muted truncate">
                        {appliedPromo.discount_value > 0
                          ? appliedPromo.discount_type === 'percentage'
                            ? `-${appliedPromo.discount_value}% pour vous`
                            : `-${formatPrice(appliedPromo.discount_value)} pour vous`
                          : 'Code partenaire appliqué'}
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={removePromo} className="p-1 rounded hover:bg-brand-danger/10 text-brand-danger transition flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <TicketPercent className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                        placeholder="Code promo"
                        className="input !pl-9 uppercase text-sm font-mono"
                        disabled={promoChecking}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={promoChecking || !promoInput.trim()}
                      className="btn-secondary text-sm flex-shrink-0"
                    >
                      {promoChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-brand-danger mt-1.5">{promoError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Discount line */}
            {appliedPromo && promoDiscount > 0 && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-brand-success">Remise promo</span>
                <span className="font-medium text-brand-success">-{formatPrice(promoDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between items-baseline pt-4 mb-4">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-brand-primary">{formatPrice(finalTotal)}</span>
            </div>
            {error && <div className="bg-brand-danger/10 text-brand-danger text-sm p-2 rounded mb-3">{error}</div>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                (payment === 'fedapay_online' || payment === 'chariow_online') ? 'Commander & Payer en ligne' : 'Confirmer la commande'}
            </button>
            {!user && (
              <p className="text-center text-xs text-brand-muted mt-3">
                Déjà client ?{' '}
                <button type="button" onClick={() => setView({ kind: 'auth' })} className="text-brand-primary hover:underline">
                  Se connecter
                </button>
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
