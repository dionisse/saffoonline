import { useState, useCallback, useEffect } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, RefreshCw, TicketPercent, Users, TrendingUp,
  Clock, CheckCircle2, XCircle, AlertTriangle, Eye, Copy, Check, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import type { PromoCode, PromoUsage, PromoPartnerType, PromoDiscountType, CommissionStatus } from '../../lib/database.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function isExpired(endsAt: string | null): boolean {
  if (!endsAt) return false;
  return new Date(endsAt).getTime() < Date.now();
}

function isUpcoming(startsAt: string | null): boolean {
  if (!startsAt) return false;
  return new Date(startsAt).getTime() > Date.now();
}

function getStatus(pc: PromoCode): { label: string; color: string; icon: React.ReactNode } {
  if (!pc.is_active) return { label: 'Inactif', color: 'brand-muted', icon: <XCircle className="w-3 h-3" /> };
  if (isExpired(pc.ends_at)) return { label: 'Expiré', color: 'brand-danger', icon: <AlertTriangle className="w-3 h-3" /> };
  if (isUpcoming(pc.starts_at)) return { label: 'À venir', color: 'brand-info', icon: <Clock className="w-3 h-3" /> };
  if (pc.max_uses !== null && pc.used_count >= pc.max_uses) return { label: 'Épuisé', color: 'brand-warning', icon: <AlertTriangle className="w-3 h-3" /> };
  return { label: 'Actif', color: 'brand-success', icon: <CheckCircle2 className="w-3 h-3" /> };
}

function renewalOptions(): { label: string; days: number }[] {
  return [
    { label: '7 jours', days: 7 },
    { label: '14 jours', days: 14 },
    { label: '30 jours', days: 30 },
    { label: '90 jours', days: 90 },
    { label: '180 jours', days: 180 },
    { label: '365 jours', days: 365 },
  ];
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8">
        <div className="flex items-center justify-between p-4 border-b border-brand-border sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-surface transition">
            <X className="w-5 h-5 text-brand-muted" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }: {
  title: string; message: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-brand-danger/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-brand-danger" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-brand-muted mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost">Annuler</button>
          <button onClick={onConfirm} className="btn-primary !bg-brand-danger hover:!bg-brand-danger/90">
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  code: string;
  partner_name: string;
  partner_phone: string;
  partner_email: string;
  partner_type: PromoPartnerType;
  commission_rate: number;
  discount_type: PromoDiscountType;
  discount_value: number;
  min_order_amount: number;
  max_uses: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  notes: string;
}

function emptyForm(): FormState {
  return {
    code: genCode(),
    partner_name: '',
    partner_phone: '',
    partner_email: '',
    partner_type: 'commercial',
    commission_rate: 5,
    discount_type: 'percentage',
    discount_value: 0,
    min_order_amount: 0,
    max_uses: '',
    starts_at: '',
    ends_at: '',
    is_active: true,
    notes: '',
  };
}

function formFromPromo(pc: PromoCode): FormState {
  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };
  return {
    code: pc.code,
    partner_name: pc.partner_name,
    partner_phone: pc.partner_phone ?? '',
    partner_email: pc.partner_email ?? '',
    partner_type: pc.partner_type,
    commission_rate: pc.commission_rate,
    discount_type: pc.discount_type,
    discount_value: pc.discount_value,
    min_order_amount: pc.min_order_amount,
    max_uses: pc.max_uses === null ? '' : String(pc.max_uses),
    starts_at: toLocalInput(pc.starts_at),
    ends_at: toLocalInput(pc.ends_at),
    is_active: pc.is_active,
    notes: pc.notes ?? '',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPromos() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [usages, setUsages] = useState<PromoUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PromoCode | null>(null);
  const [viewingUsages, setViewingUsages] = useState<PromoCode | null>(null);
  const [renewing, setRenewing] = useState<PromoCode | null>(null);
  const [renewalDays, setRenewalDays] = useState(30);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: promoData }, { data: usageData }] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('promo_usages').select('*').order('created_at', { ascending: false }),
    ]);
    setPromos(promoData ?? []);
    setUsages(usageData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCommission = usages.reduce((s, u) => s + Number(u.commission_amount), 0);
  const pendingCommission = usages
    .filter((u) => u.commission_status === 'pending')
    .reduce((s, u) => s + Number(u.commission_amount), 0);
  const paidCommission = usages
    .filter((u) => u.commission_status === 'paid')
    .reduce((s, u) => s + Number(u.commission_amount), 0);
  const activeCount = promos.filter((p) => getStatus(p).label === 'Actif').length;

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setFormError(null);

    if (!form.code.trim()) { setFormError('Le code promo est requis'); return; }
    if (!form.partner_name.trim()) { setFormError('Le nom du partenaire est requis'); return; }
    if (form.commission_rate < 0 || form.commission_rate > 100) {
      setFormError('Le taux de commission doit être entre 0 et 100%'); return;
    }
    if (form.discount_type === 'percentage' && (form.discount_value < 0 || form.discount_value > 100)) {
      setFormError('La remise en pourcentage doit être entre 0 et 100%'); return;
    }
    if (form.discount_type === 'fixed' && form.discount_value < 0) {
      setFormError('La remise fixe ne peut pas être négative'); return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      partner_name: form.partner_name.trim(),
      partner_phone: form.partner_phone.trim() || null,
      partner_email: form.partner_email.trim() || null,
      partner_type: form.partner_type,
      commission_rate: form.commission_rate,
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      min_order_amount: form.min_order_amount,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
    };

    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('promo_codes').update(payload).eq('id', editing.id);
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('promo_codes').insert(payload);
      if (error) {
        setFormError(error.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    load();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) return;
    await supabase.from('promo_codes').delete().eq('id', confirmDelete.id);
    setConfirmDelete(null);
    load();
  }

  // ── Renew ──────────────────────────────────────────────────────────────────
  async function handleRenew() {
    if (!renewing) return;
    const base = renewing.ends_at ? new Date(renewing.ends_at) : new Date();
    const newEnd = new Date(Math.max(base.getTime(), Date.now()) + renewalDays * 86400000);
    await supabase.from('promo_codes').update({
      ends_at: newEnd.toISOString(),
      is_active: true,
    }).eq('id', renewing.id);
    setRenewing(null);
    load();
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function toggleActive(pc: PromoCode) {
    await supabase.from('promo_codes').update({ is_active: !pc.is_active }).eq('id', pc.id);
    load();
  }

  // ── Mark commission paid ───────────────────────────────────────────────────
  async function markCommissionPaid(u: PromoUsage) {
    await supabase.from('promo_usages')
      .update({ commission_status: 'paid' as CommissionStatus })
      .eq('id', u.id);
    load();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const usagesForPromo = (promoId: string) => usages.filter((u) => u.promo_code_id === promoId);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TicketPercent className="w-6 h-6 text-brand-primary" />
            Codes Promo Partenaires
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Gérez les codes promo des commerciaux et apporteurs d'affaire, suivez les commissions.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost">
            <RefreshCw className="w-4 h-4" />Actualiser
          </button>
          <button onClick={() => { setEditing(null); setForm(emptyForm()); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />Nouveau code
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-brand-primary" />
            <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">Codes actifs</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark">{activeCount}</p>
          <p className="text-xs text-brand-muted">{promos.length} au total</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-brand-success" />
            <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">Commission totale</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark">{formatPrice(totalCommission)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-brand-warning" />
            <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">En attente</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark">{formatPrice(pendingCommission)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-brand-info" />
            <span className="text-xs text-brand-muted font-medium uppercase tracking-wide">Versée</span>
          </div>
          <p className="text-2xl font-bold text-brand-dark">{formatPrice(paidCommission)}</p>
        </div>
      </div>

      {/* Promo codes table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-surface border-b border-brand-border">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold text-brand-muted">Code</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Partenaire</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Type</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Commission</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Remise client</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Utilisations</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Validité</th>
                <th className="px-4 py-3 font-semibold text-brand-muted">Statut</th>
                <th className="px-4 py-3 font-semibold text-brand-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {promos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-brand-muted">
                    <TicketPercent className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Aucun code promo pour le moment. Cliquez sur « Nouveau code » pour en créer un.
                  </td>
                </tr>
              ) : (
                promos.map((pc) => {
                  const st = getStatus(pc);
                  const promoUsages = usagesForPromo(pc.id);
                  const promoCommission = promoUsages.reduce((s, u) => s + Number(u.commission_amount), 0);
                  const expired = isExpired(pc.ends_at);
                  return (
                    <tr key={pc.id} className="hover:bg-brand-surface/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-semibold text-brand-primary bg-brand-primary/5 px-2 py-1 rounded">
                            {pc.code}
                          </code>
                          <button
                            onClick={() => copyCode(pc.code)}
                            className="p-1 rounded hover:bg-brand-surface text-brand-muted hover:text-brand-primary transition"
                            title="Copier le code"
                          >
                            {copiedCode === pc.code ? <Check className="w-3.5 h-3.5 text-brand-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-dark">{pc.partner_name}</p>
                        {pc.partner_phone && <p className="text-xs text-brand-muted">{pc.partner_phone}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pc.partner_type === 'commercial' ? 'bg-brand-info/10 text-brand-info' : 'bg-brand-warning/10 text-brand-warning'
                        }`}>
                          {pc.partner_type === 'commercial' ? 'Commercial' : 'Apporteur'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-brand-dark">{pc.commission_rate}%</p>
                        {promoCommission > 0 && (
                          <p className="text-xs text-brand-success">{formatPrice(promoCommission)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {pc.discount_value > 0 ? (
                          <span className="text-brand-dark">
                            {pc.discount_type === 'percentage' ? `${pc.discount_value}%` : formatPrice(pc.discount_value)}
                          </span>
                        ) : (
                          <span className="text-brand-muted text-xs">—</span>
                        )}
                        {pc.min_order_amount > 0 && (
                          <p className="text-xs text-brand-muted">min. {formatPrice(pc.min_order_amount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-brand-dark">
                          {pc.used_count}{pc.max_uses !== null ? ` / ${pc.max_uses}` : ''}
                        </p>
                        {promoUsages.length > 0 && (
                          <button
                            onClick={() => setViewingUsages(pc)}
                            className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />Voir {promoUsages.length}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {pc.starts_at && <p className="text-brand-muted">Du {formatDate(pc.starts_at)}</p>}
                        {pc.ends_at ? (
                          <p className={expired ? 'text-brand-danger font-medium' : 'text-brand-dark'}>
                            Au {formatDate(pc.ends_at)}
                          </p>
                        ) : (
                          <p className="text-brand-muted">Illimitée</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-${st.color}/10 text-${st.color}`}>
                          {st.icon}{st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {expired && (
                            <button
                              onClick={() => { setRenewing(pc); setRenewalDays(30); }}
                              className="p-1.5 rounded-lg hover:bg-brand-success/10 text-brand-success transition"
                              title="Renouveler"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleActive(pc)}
                            className={`p-1.5 rounded-lg transition ${
                              pc.is_active ? 'hover:bg-brand-warning/10 text-brand-warning' : 'hover:bg-brand-success/10 text-brand-success'
                            }`}
                            title={pc.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {pc.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => { setEditing(pc); setForm(formFromPromo(pc)); setShowForm(true); }}
                            className="p-1.5 rounded-lg hover:bg-brand-primary/10 text-brand-primary transition"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(pc)}
                            className="p-1.5 rounded-lg hover:bg-brand-danger/10 text-brand-danger transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent usages summary */}
      {usages.length > 0 && (
        <div className="card mt-6 overflow-hidden">
          <div className="p-4 border-b border-brand-border">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-primary" />
              Utilisations récentes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-surface border-b border-brand-border">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-brand-muted">Date</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted">Code</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted">Partenaire</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted">Montant commande</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted">Remise client</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted">Commission</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted">Statut commission</th>
                  <th className="px-4 py-3 font-semibold text-brand-muted text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {usages.slice(0, 10).map((u) => (
                  <tr key={u.id} className="hover:bg-brand-surface/50 transition">
                    <td className="px-4 py-3 text-xs text-brand-muted">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3"><code className="font-mono text-brand-primary">{u.code}</code></td>
                    <td className="px-4 py-3 text-brand-dark">{u.partner_name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(Number(u.order_total))}</td>
                    <td className="px-4 py-3 text-brand-danger">-{formatPrice(Number(u.discount_amount))}</td>
                    <td className="px-4 py-3 font-semibold text-brand-success">{formatPrice(Number(u.commission_amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.commission_status === 'paid'
                          ? 'bg-brand-success/10 text-brand-success'
                          : 'bg-brand-warning/10 text-brand-warning'
                      }`}>
                        {u.commission_status === 'paid' ? 'Versée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.commission_status === 'pending' && (
                        <button
                          onClick={() => markCommissionPaid(u)}
                          className="text-xs text-brand-primary hover:underline"
                        >
                          Marquer versée
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <Modal title={editing ? 'Modifier le code promo' : 'Nouveau code promo'} onClose={() => { setShowForm(false); setEditing(null); }}>
          <div className="space-y-4">
            {/* Code + Generate */}
            <div>
              <label className="block text-sm font-medium mb-1">Code promo</label>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input flex-1 font-mono uppercase"
                  placeholder="ABCD1234"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, code: genCode() })}
                  className="btn-secondary flex-shrink-0"
                  title="Générer un code aléatoire"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Partner info */}
            <div>
              <label className="block text-sm font-medium mb-1">Nom du partenaire *</label>
              <input
                value={form.partner_name}
                onChange={(e) => setForm({ ...form, partner_name: e.target.value })}
                className="input"
                placeholder="Ex: Jean Dupont, Société XYZ"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  value={form.partner_phone}
                  onChange={(e) => setForm({ ...form, partner_phone: e.target.value })}
                  className="input"
                  placeholder="Ex: 97000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  value={form.partner_email}
                  onChange={(e) => setForm({ ...form, partner_email: e.target.value })}
                  className="input"
                  placeholder="partenaire@email.com"
                />
              </div>
            </div>

            {/* Partner type */}
            <div>
              <label className="block text-sm font-medium mb-1">Type de partenaire</label>
              <div className="grid grid-cols-2 gap-2">
                {(['commercial', 'apporteur'] as PromoPartnerType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({
                      ...form,
                      partner_type: t,
                      commission_rate: t === 'commercial' ? 5 : 10,
                    })}
                    className={`p-3 border rounded-xl text-left transition-all ${
                      form.partner_type === t
                        ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary'
                        : 'border-brand-border hover:border-brand-primary/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{t === 'commercial' ? 'Commercial' : 'Apporteur d\'affaire'}</p>
                    <p className="text-xs text-brand-muted">
                      {t === 'commercial' ? 'Commission de 5%' : 'Commission de 10%'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Commission rate */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Taux de commission (%) — partenaire
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: Number(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-brand-muted mt-1">
                Pourcentage que le partenaire gagne sur chaque commande client.
              </p>
            </div>

            {/* Client discount */}
            <div className="border-t border-brand-border pt-4">
              <p className="text-sm font-semibold mb-2">Remise pour le client</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Type de remise</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as PromoDiscountType })}
                    className="input"
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Valeur de la remise</label>
                  <input
                    type="number"
                    min={0}
                    step={form.discount_type === 'percentage' ? 1 : 100}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-xs font-medium mb-1">Montant minimum de commande (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })}
                  className="input"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Validity */}
            <div className="border-t border-brand-border pt-4">
              <p className="text-sm font-semibold mb-2">Période de validité</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Début (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Expiration (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <p className="text-xs text-brand-muted mt-1">
                Laissez vide pour une validité illimitée. Le code est renouvelable après expiration.
              </p>
            </div>

            {/* Max uses */}
            <div>
              <label className="block text-sm font-medium mb-1">Nombre max d'utilisations</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                className="input"
                placeholder="Illimité"
              />
              <p className="text-xs text-brand-muted mt-1">Laissez vide pour un usage illimité.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes (optionnel)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="input resize-none"
                placeholder="Notes internes sur ce partenaire…"
              />
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary"
              />
              <span className="text-sm">Code actif</span>
            </label>

            {formError && (
              <div className="bg-brand-danger/10 text-brand-danger text-sm p-3 rounded-lg">{formError}</div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Enregistrer' : 'Créer le code'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Renew Modal ──────────────────────────────────────────────────────── */}
      {renewing && (
        <Modal title="Renouveler le code promo" onClose={() => setRenewing(null)}>
          <div className="space-y-4">
            <div className="bg-brand-info/5 border border-brand-info/20 rounded-lg p-4 text-sm">
              <p className="font-medium text-brand-info mb-1">Code : <code className="font-mono">{renewing.code}</code></p>
              <p className="text-brand-muted">
                Partenaire : {renewing.partner_name}
              </p>
              {renewing.ends_at && (
                <p className="text-brand-muted text-xs mt-1">
                  Expire le {formatDate(renewing.ends_at)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Durée du renouvellement</label>
              <div className="grid grid-cols-3 gap-2">
                {renewalOptions().map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setRenewalDays(opt.days)}
                    className={`p-2 border rounded-lg text-sm transition ${
                      renewalDays === opt.days
                        ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary font-medium'
                        : 'border-brand-border hover:border-brand-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-brand-surface rounded-lg p-3 text-sm text-brand-muted">
              Nouvelle date d'expiration :{' '}
              <span className="font-medium text-brand-dark">
                {formatDate(new Date(Math.max(
                  renewing.ends_at ? new Date(renewing.ends_at).getTime() : Date.now(),
                  Date.now()
                ) + renewalDays * 86400000).toISOString())}
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRenewing(null)} className="btn-ghost">Annuler</button>
              <button onClick={handleRenew} className="btn-primary">
                <RefreshCw className="w-4 h-4" />Renouveler
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Usages Modal ─────────────────────────────────────────────────────── */}
      {viewingUsages && (
        <Modal title={`Utilisations — ${viewingUsages.code}`} onClose={() => setViewingUsages(null)}>
          <PromoUsagesList usages={usagesForPromo(viewingUsages.id)} onMarkPaid={markCommissionPaid} />
        </Modal>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmDialog
          title="Supprimer le code promo"
          message={`Voulez-vous vraiment supprimer le code « ${confirmDelete.code} » du partenaire ${confirmDelete.partner_name} ? Cette action est irréversible.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Promo usages list (inside modal) ─────────────────────────────────────────

function PromoUsagesList({ usages, onMarkPaid }: {
  usages: PromoUsage[];
  onMarkPaid: (u: PromoUsage) => void;
}) {
  const totalCommission = usages.reduce((s, u) => s + Number(u.commission_amount), 0);
  const pendingAmount = usages.filter((u) => u.commission_status === 'pending').reduce((s, u) => s + Number(u.commission_amount), 0);

  if (usages.length === 0) {
    return <p className="text-sm text-brand-muted text-center py-8">Aucune utilisation enregistrée.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-surface rounded-lg p-3">
          <p className="text-xs text-brand-muted uppercase tracking-wide">Commission totale</p>
          <p className="text-lg font-bold text-brand-success">{formatPrice(totalCommission)}</p>
        </div>
        <div className="bg-brand-surface rounded-lg p-3">
          <p className="text-xs text-brand-muted uppercase tracking-wide">En attente</p>
          <p className="text-lg font-bold text-brand-warning">{formatPrice(pendingAmount)}</p>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto space-y-2">
        {usages.map((u) => (
          <div key={u.id} className="border border-brand-border rounded-lg p-3 text-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs text-brand-muted">{formatDate(u.created_at)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                u.commission_status === 'paid' ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-warning/10 text-brand-warning'
              }`}>
                {u.commission_status === 'paid' ? 'Versée' : 'En attente'}
              </span>
            </div>
            <div className="flex justify-between text-brand-dark">
              <span>Commande : <strong>{formatPrice(Number(u.order_total))}</strong></span>
              <span>Remise : <strong className="text-brand-danger">{formatPrice(Number(u.discount_amount))}</strong></span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-brand-success font-semibold">
                Commission : {formatPrice(Number(u.commission_amount))}
              </span>
              {u.commission_status === 'pending' && (
                <button
                  onClick={() => onMarkPaid(u)}
                  className="text-xs text-brand-primary hover:underline"
                >
                  Marquer versée
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
