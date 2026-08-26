import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard, Loader2, RefreshCw, Search, CheckCircle, XCircle,
  Clock, RotateCcw, ExternalLink, ChevronDown, DollarSign,
  TrendingUp, AlertTriangle, Banknote, Smartphone, Building2,
  Truck, Edit2, X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import type { Payment, PaymentMethod, PaymentStatus } from '../../lib/database.types';
import { METHOD_LABELS } from '../CheckoutPage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentWithOrder extends Payment {
  orders?: { status: string; customer_name: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<PaymentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'En attente',  color: 'bg-brand-warning/15 text-brand-warning',  icon: <Clock className="w-3.5 h-3.5" /> },
  paid:     { label: 'Payé',        color: 'bg-brand-success/15 text-brand-success',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  failed:   { label: 'Échoué',      color: 'bg-brand-danger/15 text-brand-danger',    icon: <XCircle className="w-3.5 h-3.5" /> },
  refunded: { label: 'Remboursé',   color: 'bg-brand-muted/20 text-brand-muted',      icon: <RotateCcw className="w-3.5 h-3.5" /> },
  partial:  { label: 'Partiel',     color: 'bg-brand-info/15 text-brand-info',        icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash:                 <Banknote className="w-4 h-4" />,
  mobile_money_mtn:    <Smartphone className="w-4 h-4" />,
  mobile_money_moov:   <Smartphone className="w-4 h-4" />,
  mobile_money_celtis: <Smartphone className="w-4 h-4" />,
  bank_transfer:       <Building2 className="w-4 h-4" />,
  cash_on_delivery:    <Truck className="w-4 h-4" />,
  fedapay_online:      <CreditCard className="w-4 h-4" />,
  chariow_online:      <CreditCard className="w-4 h-4" />,
};

const METHOD_GROUPS: { label: string; methods: PaymentMethod[] }[] = [
  { label: 'Mobile Money', methods: ['mobile_money_mtn', 'mobile_money_moov', 'mobile_money_celtis'] },
  { label: 'En ligne', methods: ['fedapay_online', 'chariow_online'] },
  { label: 'Autres', methods: ['cash', 'bank_transfer', 'cash_on_delivery'] },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminPayments() {
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentStatus | 'all'>('all');
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit status modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<PaymentStatus>('paid');
  const [editTxId, setEditTxId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payments')
      .select('*, orders(status, customer_name)')
      .order('created_at', { ascending: false })
      .limit(500);
    setPayments((data as PaymentWithOrder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalPaid    = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === 'pending').reduce((a, p) => a + Number(p.amount), 0);
  const totalFailed  = payments.filter((p) => p.status === 'failed').reduce((a, p) => a + Number(p.amount), 0);
  const onlinePaid   = payments.filter((p) => p.status === 'paid' && (p.method === 'fedapay_online' || p.method === 'chariow_online')).reduce((a, p) => a + Number(p.amount), 0);

  const byMethod = payments
    .filter((p) => p.status === 'paid')
    .reduce((acc, p) => { acc[p.method] = (acc[p.method] ?? 0) + Number(p.amount); return acc; }, {} as Record<string, number>);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = payments.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterMethod !== 'all' && p.method !== filterMethod) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.order_number.toLowerCase().includes(q) ||
        p.payer_name.toLowerCase().includes(q) ||
        p.payer_phone.toLowerCase().includes(q) ||
        p.transaction_id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Update payment status ─────────────────────────────────────────────────
  function openEdit(p: PaymentWithOrder) {
    setEditingId(p.id);
    setEditStatus(p.status);
    setEditTxId(p.transaction_id);
    setEditNotes(p.notes);
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await supabase.from('payments').update({
      status: editStatus,
      transaction_id: editTxId.trim(),
      notes: editNotes.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', editingId);

    // If marked as paid, also update orders.payment_status
    const pay = payments.find((p) => p.id === editingId);
    if (pay?.order_id && editStatus === 'paid') {
      await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', pay.order_id);
    }
    if (pay?.order_id && editStatus === 'refunded') {
      await supabase.from('orders').update({ payment_status: 'refunded' }).eq('id', pay.order_id);
    }

    setSaving(false);
    setEditingId(null);
    load();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-primary" />Gestion des paiements
          </h1>
          <p className="text-sm text-brand-muted mt-1">Suivi de tous les paiements manuels et en ligne</p>
        </div>
        <button onClick={load} className="btn-secondary gap-1.5 text-sm">
          <RefreshCw className="w-3.5 h-3.5" />Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4 border-l-4 border-l-brand-success">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-brand-muted uppercase font-medium">Montant encaissé</p>
            <div className="bg-brand-success/10 text-brand-success rounded-md p-1.5"><DollarSign className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-bold text-brand-success">{formatPrice(totalPaid)}</p>
          <p className="text-xs text-brand-muted mt-1">{payments.filter((p) => p.status === 'paid').length} paiements</p>
        </div>
        <div className="card p-4 border-l-4 border-l-brand-warning">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-brand-muted uppercase font-medium">En attente</p>
            <div className="bg-brand-warning/10 text-brand-warning rounded-md p-1.5"><Clock className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-bold text-brand-warning">{formatPrice(totalPending)}</p>
          <p className="text-xs text-brand-muted mt-1">{payments.filter((p) => p.status === 'pending').length} paiements</p>
        </div>
        <div className="card p-4 border-l-4 border-l-brand-primary">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-brand-muted uppercase font-medium">En ligne (FedaPay / Chariow)</p>
            <div className="bg-brand-primary/10 text-brand-primary rounded-md p-1.5"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-bold text-brand-primary">{formatPrice(onlinePaid)}</p>
          <p className="text-xs text-brand-muted mt-1">{payments.filter((p) => (p.method === 'fedapay_online' || p.method === 'chariow_online') && p.status === 'paid').length} paiements</p>
        </div>
        <div className="card p-4 border-l-4 border-l-brand-danger">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-brand-muted uppercase font-medium">Échoués</p>
            <div className="bg-brand-danger/10 text-brand-danger rounded-md p-1.5"><XCircle className="w-4 h-4" /></div>
          </div>
          <p className="text-xl font-bold text-brand-danger">{formatPrice(totalFailed)}</p>
          <p className="text-xs text-brand-muted mt-1">{payments.filter((p) => p.status === 'failed').length} paiements</p>
        </div>
      </div>

      {/* Breakdown by method */}
      {Object.keys(byMethod).length > 0 && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold mb-3">Répartition par mode de paiement (encaissés)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([method, amount]) => (
              <div key={method} className="bg-brand-surface rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-brand-muted">{METHOD_ICONS[method as PaymentMethod]}</span>
                  <p className="text-xs text-brand-muted truncate">{METHOD_LABELS[method as PaymentMethod] ?? method}</p>
                </div>
                <p className="font-bold text-sm">{formatPrice(amount)}</p>
                <div className="mt-1.5 h-1 bg-brand-border rounded-full overflow-hidden">
                  <div className="h-full bg-brand-primary rounded-full" style={{ width: `${totalPaid > 0 ? (amount / totalPaid) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input className="input pl-9 text-sm" placeholder="Commande, client, transaction…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input text-sm max-w-40" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | 'all')}>
          <option value="all">Tous statuts</option>
          {(Object.keys(STATUS_META) as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select className="input text-sm max-w-48" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value as PaymentMethod | 'all')}>
          <option value="all">Tous les modes</option>
          {METHOD_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.methods.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase">
                <tr>
                  <th className="p-3 w-8" />
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">N° Commande</th>
                  <th className="p-3 text-left hidden md:table-cell">Client</th>
                  <th className="p-3 text-center">Mode</th>
                  <th className="p-3 text-center">Statut</th>
                  <th className="p-3 text-right">Montant</th>
                  <th className="p-3 text-left hidden lg:table-cell">Réf. transaction</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map((p) => (
                  <>
                    <tr key={p.id} className={`hover:bg-brand-surface/50 ${expandedId === p.id ? 'bg-brand-surface/30' : ''}`}>
                      <td className="p-3">
                        <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="text-brand-muted hover:text-brand-primary transition-colors">
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === p.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                      <td className="p-3 text-brand-muted text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                      <td className="p-3 font-mono text-xs font-medium text-brand-primary">{p.order_number}</td>
                      <td className="p-3 hidden md:table-cell">
                        <div>
                          <p className="font-medium text-xs">{p.payer_name || '—'}</p>
                          <p className="text-brand-muted text-xs">{p.payer_phone}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-brand-surface text-brand-muted text-xs">
                          {METHOD_ICONS[p.method]}
                          <span className="hidden sm:inline whitespace-nowrap">{METHOD_LABELS[p.method]}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 badge text-xs ${STATUS_META[p.status]?.color ?? ''}`}>
                          {STATUS_META[p.status]?.icon}
                          {STATUS_META[p.status]?.label}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-brand-primary">{formatPrice(Number(p.amount))}</td>
                      <td className="p-3 hidden lg:table-cell text-brand-muted text-xs font-mono truncate max-w-32">
                        {p.transaction_id || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(p)} title="Modifier le statut"
                            className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {p.chariow_checkout_url && (
                            <a href={p.chariow_checkout_url} target="_blank" rel="noopener noreferrer" title="Lien Chariow"
                              className="p-1.5 text-brand-muted hover:text-brand-info hover:bg-brand-info/10 rounded-md transition">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>

                    {expandedId === p.id && (
                      <tr key={p.id + '-detail'}>
                        <td colSpan={9} className="p-0 bg-brand-surface/40">
                          <div className="px-6 py-4 border-t border-brand-border grid sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-brand-muted uppercase mb-1">Mode de paiement</p>
                              <p className="font-medium flex items-center gap-1.5">{METHOD_ICONS[p.method]}{METHOD_LABELS[p.method]}</p>
                            </div>
                            <div>
                              <p className="text-xs text-brand-muted uppercase mb-1">Référence transaction</p>
                              <p className="font-mono text-xs">{p.transaction_id || '—'}</p>
                            </div>
                            {p.chariow_checkout_url && (
                              <div>
                                <p className="text-xs text-brand-muted uppercase mb-1">Lien Chariow</p>
                                <a href={p.chariow_checkout_url} target="_blank" rel="noopener noreferrer"
                                  className="text-brand-info text-xs hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3.5 h-3.5" />Ouvrir
                                </a>
                              </div>
                            )}
                            {p.notes && (
                              <div className="sm:col-span-3">
                                <p className="text-xs text-brand-muted uppercase mb-1">Notes</p>
                                <p>{p.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-8 text-center text-brand-muted text-sm">Aucun paiement trouvé</p>
            )}
          </div>
        </div>
      )}

      {/* Edit status modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <button onClick={() => setEditingId(null)} className="absolute top-4 right-4 text-brand-muted hover:text-brand-dark">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg mb-4">Mettre à jour le paiement</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Statut du paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_META) as PaymentStatus[]).map((s) => (
                    <button key={s} type="button" onClick={() => setEditStatus(s)}
                      className={`flex items-center gap-2 p-2.5 border rounded-lg text-sm transition ${
                        editStatus === s ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border hover:border-brand-primary/50'
                      }`}>
                      <span className={STATUS_META[s].color.includes('success') ? 'text-brand-success' : STATUS_META[s].color.includes('warning') ? 'text-brand-warning' : STATUS_META[s].color.includes('danger') ? 'text-brand-danger' : STATUS_META[s].color.includes('info') ? 'text-brand-info' : 'text-brand-muted'}>
                        {STATUS_META[s].icon}
                      </span>
                      <span className="font-medium">{STATUS_META[s].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Référence de transaction</label>
                <input className="input text-sm" placeholder="ID Chariow, réf. bancaire, N° MTN…"
                  value={editTxId} onChange={(e) => setEditTxId(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Notes internes</label>
                <textarea className="input text-sm resize-none" rows={2} placeholder="Remarques…"
                  value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={saveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </button>
              <button onClick={() => setEditingId(null)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
