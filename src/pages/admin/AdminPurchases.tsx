import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ShoppingBasket, Plus, Loader2, X, CheckCircle, XCircle,
  Trash2, RefreshCw, FileText, Upload, ExternalLink,
  ChevronDown, ChevronUp, AlertTriangle, Search,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import { useAuth } from '../../contexts/AuthContext';
import type { Product, Purchase, PurchaseItem } from '../../lib/database.types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PurchaseWithItems extends Purchase {
  purchase_items?: (PurchaseItem & { products?: { name: string; sku: string } })[];
}

interface LineForm {
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: string;
}

const EMPTY_LINE: LineForm = { product_id: '', product_name: '', unit_price: '', quantity: '1' };

function newRef() {
  const d = new Date();
  return `APPRO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const STATUS_META = {
  draft:     { label: 'Brouillon',  color: 'bg-brand-muted/15 text-brand-muted' },
  validated: { label: 'Validé',     color: 'bg-brand-success/15 text-brand-success' },
  cancelled: { label: 'Annulé',     color: 'bg-brand-danger/15 text-brand-danger' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function AdminPurchases() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'validated' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New purchase form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    reference: newRef(),
    label: '',
    invoice_reference: '',
    supplier_name: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [lines, setLines] = useState<LineForm[]>([{ ...EMPTY_LINE }]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, purchRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('purchases')
        .select('*, purchase_items(*, products(name, sku))')
        .order('created_at', { ascending: false }),
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setPurchases((purchRes.data as PurchaseWithItems[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Line helpers ──────────────────────────────────────────────────────────
  function updateLine(idx: number, patch: Partial<LineForm>) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function pickProduct(idx: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateLine(idx, {
      product_id: productId,
      product_name: p?.name ?? '',
      unit_price: p ? String(p.price) : '',
    });
  }

  function addLine() { setLines((prev) => [...prev, { ...EMPTY_LINE }]); }
  function removeLine(idx: number) { setLines((prev) => prev.filter((_, i) => i !== idx)); }

  const lineTotal = lines.reduce((a, l) => a + (parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 0), 0);

  // ── File pick ─────────────────────────────────────────────────────────────
  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceFile(file);
    if (file.type.startsWith('image/')) {
      setInvoicePreview(URL.createObjectURL(file));
    } else {
      setInvoicePreview(null);
    }
  }

  // ── Save purchase (draft) ─────────────────────────────────────────────────
  async function savePurchase() {
    if (!form.label.trim()) { setFormError('Le libellé est requis.'); return; }
    const validLines = lines.filter((l) => l.product_name.trim() && parseFloat(l.unit_price) > 0 && parseInt(l.quantity) > 0);
    if (validLines.length === 0) { setFormError('Ajoutez au moins une ligne valide (produit, PU, quantité).'); return; }

    setSaving(true);
    setFormError(null);

    // Upload invoice file if provided
    let invoiceUrl = '';
    if (invoiceFile) {
      const ext = invoiceFile.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from('invoices').upload(path, invoiceFile, { upsert: false });
      if (upErr) { setSaving(false); setFormError('Erreur upload facture : ' + upErr.message); return; }
      const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(up.path);
      invoiceUrl = urlData.publicUrl;
    }

    // Insert purchase header
    const { data: purch, error: pErr } = await supabase.from('purchases').insert({
      reference: form.reference.trim(),
      label: form.label.trim(),
      invoice_reference: form.invoice_reference.trim(),
      supplier_name: form.supplier_name.trim(),
      date: form.date,
      status: 'draft',
      invoice_url: invoiceUrl,
      notes: form.notes.trim(),
      total_amount: lineTotal,
      created_by: user?.id ?? null,
    }).select().maybeSingle();

    if (pErr || !purch) { setSaving(false); setFormError(pErr?.message ?? 'Erreur création'); return; }

    // Insert lines
    const itemsPayload = validLines.map((l) => ({
      purchase_id: purch.id,
      product_id: l.product_id || null,
      product_name: l.product_name.trim(),
      unit_price: parseFloat(l.unit_price),
      quantity: parseInt(l.quantity),
    }));
    const { error: iErr } = await supabase.from('purchase_items').insert(itemsPayload);
    if (iErr) { setSaving(false); setFormError(iErr.message); return; }

    setSaving(false);
    setShowForm(false);
    setForm({ reference: newRef(), label: '', invoice_reference: '', supplier_name: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setLines([{ ...EMPTY_LINE }]);
    setInvoiceFile(null);
    setInvoicePreview(null);
    load();
  }

  // ── Validate purchase ─────────────────────────────────────────────────────
  async function validatePurchase(id: string) {
    setActionLoading(id + '-validate');
    const { error } = await supabase.from('purchases').update({ status: 'validated', updated_at: new Date().toISOString() }).eq('id', id);
    setActionLoading(null);
    if (error) { alert(error.message); return; }
    load();
  }

  // ── Cancel purchase ───────────────────────────────────────────────────────
  async function cancelPurchase(id: string, _currentStatus?: string) {
    if (!confirm('Confirmer l\'annulation ? Le stock sera reversé si l\'approvisionnement était validé.')) return;
    setActionLoading(id + '-cancel');
    await supabase.from('purchases').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
    setActionLoading(null);
    load();
  }

  // ── Delete purchase (draft only) ──────────────────────────────────────────
  async function deletePurchase(id: string) {
    if (!confirm('Supprimer ce brouillon ?')) return;
    await supabase.from('purchases').delete().eq('id', id);
    setPurchases((p) => p.filter((x) => x.id !== id));
  }

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = purchases.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.label.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) ||
        p.supplier_name.toLowerCase().includes(q) || p.invoice_reference.toLowerCase().includes(q);
    }
    return true;
  });

  const totalValidated = purchases.filter((p) => p.status === 'validated').reduce((a, p) => a + Number(p.total_amount), 0);
  const countDraft = purchases.filter((p) => p.status === 'draft').length;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBasket className="w-6 h-6 text-brand-primary" />Approvisionnements
          </h1>
          <p className="text-sm text-brand-muted mt-1">Achats fournisseurs — mise à jour automatique du stock à la validation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary gap-1.5 text-sm">
            <RefreshCw className="w-3.5 h-3.5" />Actualiser
          </button>
          <button onClick={() => { setShowForm(true); setForm((f) => ({ ...f, reference: newRef() })); }} className="btn-primary gap-1.5 text-sm">
            <Plus className="w-4 h-4" />Nouvel approvisionnement
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-brand-muted mb-1">Total approvisionnements validés</p>
          <p className="text-xl font-bold text-brand-primary">{formatPrice(totalValidated)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-brand-muted mb-1">Brouillons en attente</p>
          <p className="text-xl font-bold text-brand-warning">{countDraft}</p>
        </div>
        <div className="card p-4 sm:col-span-1 col-span-2">
          <p className="text-xs text-brand-muted mb-1">Total approvisionnements</p>
          <p className="text-xl font-bold">{purchases.length}</p>
        </div>
      </div>

      {/* New purchase form */}
      {showForm && (
        <div className="card mb-6 border-l-4 border-l-brand-primary overflow-hidden">
          <div className="p-4 border-b border-brand-border bg-brand-surface flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-brand-primary" />Nouvel approvisionnement</h2>
            <button onClick={() => { setShowForm(false); setFormError(null); }} className="text-brand-muted hover:text-brand-dark">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5">
            {/* Header fields */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium mb-1">Référence interne</label>
                <input className="input text-sm" value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Libellé *</label>
                <input className="input text-sm" placeholder="Ex: Achat mensuel stocks juin" value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Fournisseur</label>
                <input className="input text-sm" placeholder="Nom du fournisseur" value={form.supplier_name}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Référence facture</label>
                <input className="input text-sm" placeholder="N° facture fournisseur" value={form.invoice_reference}
                  onChange={(e) => setForm((f) => ({ ...f, invoice_reference: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Date</label>
                <input type="date" className="input text-sm" value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Notes</label>
                <input className="input text-sm" placeholder="Remarques…" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            {/* Invoice file */}
            <div className="mb-5">
              <label className="block text-xs font-medium mb-2">Joindre la facture (JPEG, PNG, PDF — max 10 Mo)</label>
              <div className="flex items-center gap-3 flex-wrap">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="btn-secondary gap-2 text-sm">
                  <Upload className="w-4 h-4" />{invoiceFile ? invoiceFile.name : 'Choisir un fichier'}
                </button>
                {invoiceFile && (
                  <button type="button" onClick={() => { setInvoiceFile(null); setInvoicePreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="text-brand-muted hover:text-brand-danger">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden" onChange={onFilePick} />
              </div>
              {invoicePreview && (
                <img src={invoicePreview} alt="Aperçu facture" className="mt-3 h-24 rounded-lg object-cover border border-brand-border" />
              )}
              {invoiceFile && invoiceFile.type === 'application/pdf' && (
                <p className="mt-2 text-xs text-brand-muted flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{invoiceFile.name}</p>
              )}
            </div>

            {/* Lines */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Lignes d'approvisionnement</h3>
                <button onClick={addLine} className="btn-secondary text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" />Ajouter une ligne
                </button>
              </div>

              <div className="border border-brand-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-brand-surface text-xs text-brand-muted uppercase">
                    <tr>
                      <th className="p-2 text-left">Produit</th>
                      <th className="p-2 text-right w-28">PU (FCFA)</th>
                      <th className="p-2 text-right w-20">Qté</th>
                      <th className="p-2 text-right w-28">Montant</th>
                      <th className="p-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <select className="input text-xs py-1" value={l.product_id}
                            onChange={(e) => pickProduct(idx, e.target.value)}>
                            <option value="">— Choisir un produit —</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          {!l.product_id && (
                            <input className="input text-xs py-1 mt-1" placeholder="Ou saisir un libellé libre"
                              value={l.product_name}
                              onChange={(e) => updateLine(idx, { product_name: e.target.value })} />
                          )}
                        </td>
                        <td className="p-2">
                          <input type="number" min="0" className="input text-xs py-1 text-right" placeholder="0"
                            value={l.unit_price}
                            onChange={(e) => updateLine(idx, { unit_price: e.target.value })} />
                        </td>
                        <td className="p-2">
                          <input type="number" min="1" className="input text-xs py-1 text-right" placeholder="1"
                            value={l.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })} />
                        </td>
                        <td className="p-2 text-right font-medium text-xs">
                          {formatPrice((parseFloat(l.unit_price) || 0) * (parseInt(l.quantity) || 0))}
                        </td>
                        <td className="p-2">
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(idx)} className="text-brand-muted hover:text-brand-danger">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-brand-surface">
                    <tr>
                      <td colSpan={3} className="p-2 text-right text-xs font-semibold text-brand-muted uppercase">Total</td>
                      <td className="p-2 text-right font-bold text-brand-primary">{formatPrice(lineTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {formError && (
              <div className="flex items-center gap-2 text-brand-danger text-sm bg-brand-danger/5 border border-brand-danger/20 rounded-lg px-3 py-2 mb-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{formError}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={savePurchase} disabled={saving} className="btn-primary gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Enregistrer en brouillon
              </button>
              <button onClick={() => { setShowForm(false); setFormError(null); }} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input className="input pl-9 text-sm" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(['all', 'draft', 'validated', 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${filterStatus === s ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border hover:border-brand-primary text-brand-muted'}`}>
              {s === 'all' ? 'Tous' : STATUS_META[s].label}
            </button>
          ))}
        </div>
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
                  <th className="p-3 text-left w-8" />
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Référence</th>
                  <th className="p-3 text-left">Libellé</th>
                  <th className="p-3 text-left hidden md:table-cell">Fournisseur</th>
                  <th className="p-3 text-left hidden lg:table-cell">Réf. facture</th>
                  <th className="p-3 text-center hidden sm:table-cell">Statut</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center hidden sm:table-cell">Facture</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map((p) => (
                  <>
                    <tr key={p.id} className={`hover:bg-brand-surface/50 cursor-pointer ${expandedId === p.id ? 'bg-brand-surface/30' : ''}`}>
                      <td className="p-3">
                        <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="text-brand-muted hover:text-brand-primary transition-colors">
                          {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="p-3 text-brand-muted text-xs whitespace-nowrap">{p.date}</td>
                      <td className="p-3 font-mono text-xs font-medium">{p.reference}</td>
                      <td className="p-3 font-medium max-w-48 truncate">{p.label}</td>
                      <td className="p-3 hidden md:table-cell text-brand-muted text-xs">{p.supplier_name || '—'}</td>
                      <td className="p-3 hidden lg:table-cell text-brand-muted text-xs">{p.invoice_reference || '—'}</td>
                      <td className="p-3 text-center hidden sm:table-cell">
                        <span className={`badge text-xs ${STATUS_META[p.status]?.color ?? ''}`}>
                          {STATUS_META[p.status]?.label ?? p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-brand-primary">{formatPrice(Number(p.total_amount))}</td>
                      <td className="p-3 text-center hidden sm:table-cell">
                        {p.invoice_url ? (
                          <a href={p.invoice_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-info hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" />Voir
                          </a>
                        ) : <span className="text-xs text-brand-muted">—</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === 'draft' && (
                            <>
                              <button
                                onClick={() => validatePurchase(p.id)}
                                disabled={actionLoading === p.id + '-validate'}
                                title="Valider et mettre à jour le stock"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-brand-success/10 text-brand-success hover:bg-brand-success/20 rounded-md transition disabled:opacity-50">
                                {actionLoading === p.id + '-validate' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Valider
                              </button>
                              <button
                                onClick={() => deletePurchase(p.id)}
                                title="Supprimer le brouillon"
                                className="p-1.5 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-md transition">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {p.status === 'validated' && (
                            <button
                              onClick={() => cancelPurchase(p.id, p.status)}
                              disabled={actionLoading === p.id + '-cancel'}
                              title="Annuler (le stock sera reversé)"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-brand-danger/10 text-brand-danger hover:bg-brand-danger/20 rounded-md transition disabled:opacity-50">
                              {actionLoading === p.id + '-cancel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                              Annuler
                            </button>
                          )}
                          {p.status === 'cancelled' && (
                            <span className="text-xs text-brand-muted italic">Annulé</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === p.id && (
                      <tr key={p.id + '-detail'}>
                        <td colSpan={10} className="p-0 bg-brand-surface/40">
                          <div className="px-6 py-4 border-t border-brand-border">
                            <div className="grid sm:grid-cols-3 gap-4 mb-4 text-sm">
                              {p.notes && (
                                <div><span className="text-xs text-brand-muted uppercase">Notes</span><p className="mt-0.5">{p.notes}</p></div>
                              )}
                              <div><span className="text-xs text-brand-muted uppercase">Créé le</span><p className="mt-0.5">{formatDate(p.created_at)}</p></div>
                              {p.invoice_url && (
                                <div>
                                  <span className="text-xs text-brand-muted uppercase">Facture jointe</span>
                                  <a href={p.invoice_url} target="_blank" rel="noopener noreferrer"
                                    className="mt-0.5 flex items-center gap-1 text-brand-info hover:underline text-sm">
                                    <ExternalLink className="w-3.5 h-3.5" />Ouvrir la facture
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Lines detail */}
                            <table className="w-full text-xs border border-brand-border rounded-lg overflow-hidden">
                              <thead className="bg-brand-surface text-brand-muted uppercase">
                                <tr>
                                  <th className="p-2 text-left">Produit</th>
                                  <th className="p-2 text-right">PU</th>
                                  <th className="p-2 text-right">Quantité</th>
                                  <th className="p-2 text-right">Montant</th>
                                  <th className="p-2 text-right">Prix total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-brand-border bg-white">
                                {(p.purchase_items ?? []).map((item) => (
                                  <tr key={item.id}>
                                    <td className="p-2 font-medium">{item.product_name}</td>
                                    <td className="p-2 text-right">{formatPrice(Number(item.unit_price))}</td>
                                    <td className="p-2 text-right font-bold">{item.quantity}</td>
                                    <td className="p-2 text-right">{formatPrice(Number(item.unit_price) * item.quantity)}</td>
                                    <td className="p-2 text-right font-bold text-brand-primary">{formatPrice(Number(item.subtotal))}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-brand-surface">
                                <tr>
                                  <td colSpan={4} className="p-2 text-right font-semibold text-brand-muted uppercase">Total général</td>
                                  <td className="p-2 text-right font-bold text-brand-primary text-sm">{formatPrice(Number(p.total_amount))}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="p-8 text-center text-brand-muted text-sm">Aucun approvisionnement trouvé</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
