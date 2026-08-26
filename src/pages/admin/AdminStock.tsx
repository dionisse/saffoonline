import { useEffect, useState, useCallback } from 'react';
import {
  PackageSearch, Plus, ArrowUpCircle, AlertTriangle,
  Loader2, X, RefreshCw, BarChart2, Calendar, Trash2, ClipboardList, Tag,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import { useAuth } from '../../contexts/AuthContext';
import type { Brand, Product } from '../../lib/database.types';

// ─── Types ───────────────────────────────────────────────────────────────────

type MovementType = 'sale_online' | 'sale_pos' | 'purchase' | 'stock_in' | 'damaged' | 'adjustment';

interface StockMovement {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  reference: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  products?: { name: string; sku: string };
}

interface StockPeriod {
  id: string;
  period_label: string;
  start_date: string;
  end_date: string;
  product_id: string;
  opening_stock: number;
  closing_stock: number;
  total_in: number;
  total_damaged: number;
  sold_qty: number;
  products?: { name: string; sku: string };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_META: Record<MovementType, { label: string; color: string; sign: '+' | '-'; icon: string }> = {
  sale_online: { label: 'Vente web',       color: 'text-brand-primary bg-brand-primary/10',   sign: '-', icon: '🛒' },
  sale_pos:    { label: 'Vente POS',        color: 'text-brand-info bg-brand-info/10',          sign: '-', icon: '🏪' },
  purchase:    { label: 'Achat / Entrée',   color: 'text-brand-success bg-brand-success/10',    sign: '+', icon: '📦' },
  stock_in:    { label: 'Entrée stock',     color: 'text-brand-success bg-brand-success/10',    sign: '+', icon: '⬆️' },
  damaged:     { label: 'Produit endommagé',color: 'text-brand-danger bg-brand-danger/10',      sign: '-', icon: '⚠️' },
  adjustment:  { label: 'Ajustement',       color: 'text-brand-muted bg-brand-surface',         sign: '+', icon: '✏️' },
};

const ENTRY_TYPES: MovementType[] = ['purchase', 'stock_in', 'adjustment'];
const EXIT_TYPES: MovementType[] = ['damaged', 'adjustment'];

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'movements' | 'stock' | 'periods';

export function AdminStock() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stock');
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [periods, setPeriods] = useState<StockPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState<MovementType | ''>('');

  // Movement form
  const [showMovForm, setShowMovForm] = useState(false);
  const [movForm, setMovForm] = useState({ product_id: '', type: 'purchase' as MovementType, quantity: '', reference: '', notes: '' });
  const [savingMov, setSavingMov] = useState(false);
  const [movError, setMovError] = useState<string | null>(null);

  // Period form
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    period_label: '', start_date: '', end_date: '',
    product_id: '', opening_stock: '', closing_stock: '', total_in: '', total_damaged: '0',
  });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, movRes, perRes, brandRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('stock_movements').select('*, products(name, sku)').order('created_at', { ascending: false }).limit(300),
      supabase.from('stock_periods').select('*, products(name, sku)').order('created_at', { ascending: false }),
      supabase.from('brands').select('*').order('name'),
    ]);
    setProducts((prodRes.data as Product[]) ?? []);
    setMovements((movRes.data as StockMovement[]) ?? []);
    setPeriods((perRes.data as StockPeriod[]) ?? []);
    setBrands((brandRes.data as Brand[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save movement ──────────────────────────────────────────────────────────
  async function saveMovement() {
    if (!movForm.product_id || !movForm.quantity) { setMovError('Produit et quantité requis.'); return; }
    const qty = parseInt(movForm.quantity);
    if (isNaN(qty) || qty <= 0) { setMovError('Quantité invalide.'); return; }
    setSavingMov(true);
    setMovError(null);

    const isOut = EXIT_TYPES.includes(movForm.type) && movForm.type !== 'adjustment';
    const isEntry = ENTRY_TYPES.includes(movForm.type);
    const signedQty = (movForm.type === 'damaged') ? -qty
      : (movForm.type === 'adjustment') ? qty   // adjustment is always positive here; negative via negative qty not supported in UI
      : isEntry ? qty : -qty;

    const { error: mvErr } = await supabase.from('stock_movements').insert({
      product_id: movForm.product_id,
      type: movForm.type,
      quantity: signedQty,
      reference: movForm.reference.trim(),
      notes: movForm.notes.trim(),
      created_by: user?.id ?? null,
    });

    if (mvErr) { setSavingMov(false); setMovError(mvErr.message); return; }

    // Update products.stock
    const { data: prod } = await supabase.from('products').select('stock').eq('id', movForm.product_id).maybeSingle();
    if (prod) {
      await supabase.from('products').update({ stock: Math.max(0, Number(prod.stock) + signedQty) }).eq('id', movForm.product_id);
    }

    setSavingMov(false);
    setShowMovForm(false);
    setMovForm({ product_id: '', type: 'purchase', quantity: '', reference: '', notes: '' });
    load();
  }

  // ── Save period ────────────────────────────────────────────────────────────
  async function savePeriod() {
    if (!periodForm.period_label || !periodForm.product_id || !periodForm.start_date || !periodForm.end_date) {
      setPeriodError('Tous les champs obligatoires (*) doivent être remplis.'); return;
    }
    setSavingPeriod(true);
    setPeriodError(null);
    const { error } = await supabase.from('stock_periods').insert({
      period_label: periodForm.period_label.trim(),
      start_date: periodForm.start_date,
      end_date: periodForm.end_date,
      product_id: periodForm.product_id,
      opening_stock: parseInt(periodForm.opening_stock) || 0,
      closing_stock: parseInt(periodForm.closing_stock) || 0,
      total_in: parseInt(periodForm.total_in) || 0,
      total_damaged: parseInt(periodForm.total_damaged) || 0,
      created_by: user?.id ?? null,
    });
    setSavingPeriod(false);
    if (error) { setPeriodError(error.message); return; }
    setShowPeriodForm(false);
    setPeriodForm({ period_label: '', start_date: '', end_date: '', product_id: '', opening_stock: '', closing_stock: '', total_in: '', total_damaged: '0' });
    load();
  }

  async function deletePeriod(id: string) {
    await supabase.from('stock_periods').delete().eq('id', id);
    setPeriods((p) => p.filter((x) => x.id !== id));
  }

  async function deleteMovement(id: string, productId: string, qty: number) {
    // Reverse the stock impact
    const { data: prod } = await supabase.from('products').select('stock').eq('id', productId).maybeSingle();
    if (prod) {
      await supabase.from('products').update({ stock: Math.max(0, Number(prod.stock) - qty) }).eq('id', productId);
    }
    await supabase.from('stock_movements').delete().eq('id', id);
    setMovements((m) => m.filter((x) => x.id !== id));
  }

  // ── Filtered movements ─────────────────────────────────────────────────────
  const filteredMovements = movements.filter((m) => {
    if (filterProduct && m.product_id !== filterProduct) return false;
    if (filterType && m.type !== filterType) return false;
    return true;
  });

  // ── Stock summary per product (only for products with stock tracking enabled) ──
  const trackedProducts = products.filter((p) => p.track_stock);
  const lowStockProducts = trackedProducts.filter((p) => p.stock <= p.low_stock_threshold && p.stock >= 0);
  const outOfStock = trackedProducts.filter((p) => p.stock === 0);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-brand-primary" />Gestion des stocks
          </h1>
          <p className="text-sm text-brand-muted mt-1">{products.length} produits actifs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary gap-1.5 text-sm">
            <RefreshCw className="w-3.5 h-3.5" />Actualiser
          </button>
          <button onClick={() => setShowMovForm(true)} className="btn-primary gap-1.5 text-sm">
            <Plus className="w-4 h-4" />Mouvement
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
      ) : (
        <>
          {/* Alerts */}
          {(outOfStock.length > 0 || lowStockProducts.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3 mb-5">
              {outOfStock.length > 0 && (
                <div className="flex items-start gap-3 bg-brand-danger/5 border border-brand-danger/20 rounded-lg p-4">
                  <AlertTriangle className="w-5 h-5 text-brand-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-brand-danger">{outOfStock.length} produit{outOfStock.length > 1 ? 's' : ''} en rupture</p>
                    <p className="text-xs text-brand-muted mt-0.5">{outOfStock.slice(0, 3).map((p) => p.name).join(', ')}{outOfStock.length > 3 ? '…' : ''}</p>
                  </div>
                </div>
              )}
              {lowStockProducts.length > 0 && (
                <div className="flex items-start gap-3 bg-brand-warning/5 border border-brand-warning/20 rounded-lg p-4">
                  <AlertTriangle className="w-5 h-5 text-brand-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-brand-warning">{lowStockProducts.length} produit{lowStockProducts.length > 1 ? 's' : ''} en stock faible</p>
                    <p className="text-xs text-brand-muted mt-0.5">{lowStockProducts.slice(0, 3).map((p) => p.name).join(', ')}{lowStockProducts.length > 3 ? '…' : ''}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-brand-border mb-5">
            {([
              { id: 'stock', label: 'Niveaux de stock', icon: <BarChart2 className="w-4 h-4" /> },
              { id: 'movements', label: 'Mouvements', icon: <ArrowUpCircle className="w-4 h-4" /> },
              { id: 'periods', label: 'Inventaires périodiques', icon: <Calendar className="w-4 h-4" /> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${tab === t.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-muted hover:text-brand-dark'}`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Stock levels ── */}
          {tab === 'stock' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-brand-border">
                <p className="text-sm text-brand-muted">Niveaux actuels — mis à jour automatiquement après chaque vente ou mouvement.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase">
                    <tr>
                      <th className="p-3 text-left">Produit</th>
                      <th className="p-3 text-left hidden sm:table-cell">SKU</th>
                      <th className="p-3 text-left hidden lg:table-cell">Marque</th>
                      <th className="p-3 text-right">Stock actuel</th>
                      <th className="p-3 text-right hidden md:table-cell">Seuil alerte</th>
                      <th className="p-3 text-center">Statut</th>
                      <th className="p-3 text-right hidden lg:table-cell">Prix unitaire</th>
                      <th className="p-3 text-right hidden lg:table-cell">Valeur stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {products.map((p) => {
                      const isOut = p.track_stock && p.stock === 0;
                      const isLow = p.track_stock && p.stock > 0 && p.stock <= p.low_stock_threshold;
                      return (
                        <tr key={p.id} className={`hover:bg-brand-surface/50 ${isOut ? 'bg-brand-danger/3' : ''}`}>
                          <td className="p-3 font-medium">{p.name}</td>
                          <td className="p-3 hidden sm:table-cell text-brand-muted font-mono text-xs">{p.sku || '—'}</td>
                          <td className="p-3 hidden lg:table-cell">
                            {brands.find(b => b.id === p.brand_id) ? (
                              <span className="inline-flex items-center gap-1 text-xs bg-brand-primary/8 text-brand-primary px-2 py-0.5 rounded-full">
                                <Tag className="w-3 h-3" />{brands.find(b => b.id === p.brand_id)!.name}
                              </span>
                            ) : <span className="text-brand-muted text-xs">—</span>}
                          </td>
                          <td className={`p-3 text-right font-bold text-lg ${!p.track_stock ? 'text-brand-muted' : isOut ? 'text-brand-danger' : isLow ? 'text-brand-warning' : 'text-brand-dark'}`}>
                            {p.track_stock ? p.stock : '—'}
                          </td>
                          <td className="p-3 text-right hidden md:table-cell text-brand-muted text-xs">{p.track_stock ? p.low_stock_threshold : '—'}</td>
                          <td className="p-3 text-center">
                            {!p.track_stock ? (
                              <span className="badge bg-brand-border/30 text-brand-muted text-xs">Non suivi</span>
                            ) : isOut ? (
                              <span className="badge bg-brand-danger/15 text-brand-danger text-xs">Rupture</span>
                            ) : isLow ? (
                              <span className="badge bg-brand-warning/15 text-brand-warning text-xs">Faible</span>
                            ) : (
                              <span className="badge bg-brand-success/15 text-brand-success text-xs">OK</span>
                            )}
                          </td>
                          <td className="p-3 text-right hidden lg:table-cell text-brand-muted text-xs">{formatPrice(p.price)}</td>
                          <td className="p-3 text-right hidden lg:table-cell font-medium">{p.track_stock ? formatPrice(p.price * p.stock) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {products.length === 0 && <p className="p-8 text-center text-brand-muted">Aucun produit actif</p>}
              </div>
              {/* Stock value summary */}
              <div className="p-4 border-t border-brand-border bg-brand-surface flex flex-wrap gap-4 justify-end">
                <div className="text-sm">
                  <span className="text-brand-muted">Valeur totale du stock : </span>
                  <span className="font-bold text-brand-primary">{formatPrice(trackedProducts.reduce((a, p) => a + p.price * p.stock, 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Movements ── */}
          {tab === 'movements' && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select className="input text-sm max-w-xs" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
                  <option value="">Tous les produits</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="input text-sm max-w-xs" value={filterType} onChange={(e) => setFilterType(e.target.value as MovementType | '')}>
                  <option value="">Tous les types</option>
                  {(Object.keys(TYPE_META) as MovementType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_META[t].label}</option>
                  ))}
                </select>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase">
                      <tr>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Produit</th>
                        <th className="p-3 text-center">Type</th>
                        <th className="p-3 text-right">Quantité</th>
                        <th className="p-3 text-left hidden md:table-cell">Référence</th>
                        <th className="p-3 text-left hidden lg:table-cell">Notes</th>
                        <th className="p-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {filteredMovements.map((m) => {
                        const meta = TYPE_META[m.type] ?? TYPE_META.adjustment;
                        const isNeg = m.quantity < 0;
                        return (
                          <tr key={m.id} className="hover:bg-brand-surface/50">
                            <td className="p-3 text-brand-muted text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
                            <td className="p-3 font-medium">{m.products?.name ?? '—'}</td>
                            <td className="p-3 text-center">
                              <span className={`badge text-xs ${meta.color}`}>{meta.label}</span>
                            </td>
                            <td className={`p-3 text-right font-bold ${isNeg ? 'text-brand-danger' : 'text-brand-success'}`}>
                              {isNeg ? '' : '+'}{m.quantity}
                            </td>
                            <td className="p-3 hidden md:table-cell text-brand-muted text-xs">{m.reference || '—'}</td>
                            <td className="p-3 hidden lg:table-cell text-brand-muted text-xs">{m.notes || '—'}</td>
                            <td className="p-3">
                              <button onClick={() => deleteMovement(m.id, m.product_id, m.quantity)}
                                className="text-brand-muted hover:text-brand-danger transition-colors" title="Supprimer et inverser">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredMovements.length === 0 && <p className="p-8 text-center text-brand-muted">Aucun mouvement trouvé</p>}
                </div>
              </div>
            </>
          )}

          {/* ── TAB: Periods ── */}
          {tab === 'periods' && (
            <>
              <div className="card mb-4 p-4 bg-brand-surface/60 border border-brand-border">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-brand-primary" />Formule de calcul
                </p>
                <p className="text-sm text-brand-muted font-mono bg-white border border-brand-border rounded px-3 py-2 inline-block">
                  Stock Vendu = Stock Initial + Entrées − Stock Final − Produits Endommagés
                </p>
              </div>

              <div className="flex justify-end mb-4">
                <button onClick={() => setShowPeriodForm(true)} className="btn-primary gap-1.5 text-sm">
                  <Plus className="w-4 h-4" />Nouvel inventaire
                </button>
              </div>

              {showPeriodForm && (
                <div className="card p-5 mb-5 border-l-4 border-l-brand-primary">
                  <h3 className="font-semibold mb-4">Saisir un inventaire périodique</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Libellé de la période *</label>
                      <input className="input text-sm" placeholder="Ex: Juin 2026" value={periodForm.period_label}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, period_label: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Produit *</label>
                      <select className="input text-sm" value={periodForm.product_id}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, product_id: e.target.value }))}>
                        <option value="">— Choisir —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Date début *</label>
                      <input type="date" className="input text-sm" value={periodForm.start_date}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, start_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Date fin *</label>
                      <input type="date" className="input text-sm" value={periodForm.end_date}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, end_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Stock Initial (ouverture)</label>
                      <input type="number" min="0" className="input text-sm" placeholder="0" value={periodForm.opening_stock}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, opening_stock: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Total Entrées (achats)</label>
                      <input type="number" min="0" className="input text-sm" placeholder="0" value={periodForm.total_in}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, total_in: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Stock Final (clôture)</label>
                      <input type="number" min="0" className="input text-sm" placeholder="0" value={periodForm.closing_stock}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, closing_stock: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Produits Endommagés</label>
                      <input type="number" min="0" className="input text-sm" placeholder="0" value={periodForm.total_damaged}
                        onChange={(e) => setPeriodForm((f) => ({ ...f, total_damaged: e.target.value }))} />
                    </div>

                    {/* Live preview */}
                    {periodForm.opening_stock !== '' && (
                      <div className="flex flex-col justify-end">
                        <label className="block text-xs font-medium mb-1 text-brand-success">= Stock Vendu (calculé)</label>
                        <div className="input bg-brand-success/5 border-brand-success/30 text-brand-success font-bold text-sm flex items-center">
                          {Math.max(0,
                            (parseInt(periodForm.opening_stock) || 0) +
                            (parseInt(periodForm.total_in) || 0) -
                            (parseInt(periodForm.closing_stock) || 0) -
                            (parseInt(periodForm.total_damaged) || 0)
                          )} unités
                        </div>
                      </div>
                    )}
                  </div>
                  {periodError && <p className="text-xs text-brand-danger mb-2">{periodError}</p>}
                  <div className="flex gap-2">
                    <button onClick={savePeriod} disabled={savingPeriod} className="btn-primary text-sm">
                      {savingPeriod ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enregistrer'}
                    </button>
                    <button onClick={() => { setShowPeriodForm(false); setPeriodError(null); }} className="btn-secondary text-sm">Annuler</button>
                  </div>
                </div>
              )}

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase">
                      <tr>
                        <th className="p-3 text-left">Période</th>
                        <th className="p-3 text-left">Produit</th>
                        <th className="p-3 text-right">Stock Initial</th>
                        <th className="p-3 text-right">+ Entrées</th>
                        <th className="p-3 text-right">− Endommagés</th>
                        <th className="p-3 text-right">Stock Final</th>
                        <th className="p-3 text-right font-bold text-brand-primary">= Vendus</th>
                        <th className="p-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {periods.map((p) => (
                        <tr key={p.id} className="hover:bg-brand-surface/50">
                          <td className="p-3">
                            <p className="font-medium">{p.period_label}</p>
                            <p className="text-xs text-brand-muted">{p.start_date} → {p.end_date}</p>
                          </td>
                          <td className="p-3 text-brand-muted">{p.products?.name ?? '—'}</td>
                          <td className="p-3 text-right">{p.opening_stock}</td>
                          <td className="p-3 text-right text-brand-success">+{p.total_in}</td>
                          <td className="p-3 text-right text-brand-danger">−{p.total_damaged}</td>
                          <td className="p-3 text-right">{p.closing_stock}</td>
                          <td className="p-3 text-right font-bold text-brand-primary text-base">{p.sold_qty}</td>
                          <td className="p-3">
                            <button onClick={() => deletePeriod(p.id)} className="text-brand-muted hover:text-brand-danger transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {periods.length === 0 && (
                    <p className="p-8 text-center text-brand-muted text-sm">Aucun inventaire périodique. Cliquez sur "Nouvel inventaire" pour commencer.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Movement form modal */}
          {showMovForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowMovForm(false)} />
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <button onClick={() => setShowMovForm(false)} className="absolute top-4 right-4 text-brand-muted hover:text-brand-dark"><X className="w-5 h-5" /></button>
                <h3 className="font-bold text-lg mb-4">Nouveau mouvement de stock</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Produit *</label>
                    <select className="input text-sm" value={movForm.product_id}
                      onChange={(e) => setMovForm((f) => ({ ...f, product_id: e.target.value }))}>
                      <option value="">— Choisir —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Type de mouvement *</label>
                    <select className="input text-sm" value={movForm.type}
                      onChange={(e) => setMovForm((f) => ({ ...f, type: e.target.value as MovementType }))}>
                      <optgroup label="Entrées">
                        <option value="purchase">Achat / Entrée fournisseur</option>
                        <option value="stock_in">Autre entrée en stock</option>
                      </optgroup>
                      <optgroup label="Sorties">
                        <option value="damaged">Produit endommagé / perte</option>
                      </optgroup>
                      <optgroup label="Ajustement">
                        <option value="adjustment">Ajustement d'inventaire</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Quantité *</label>
                    <input type="number" min="1" className="input text-sm" placeholder="0" value={movForm.quantity}
                      onChange={(e) => setMovForm((f) => ({ ...f, quantity: e.target.value }))} />
                    <p className="text-xs text-brand-muted mt-1">
                      {movForm.type === 'damaged' ? 'Cette quantité sera déduite du stock.' : movForm.type === 'adjustment' ? 'Stock ajusté à ce niveau.' : 'Cette quantité sera ajoutée au stock.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Référence</label>
                    <input className="input text-sm" placeholder="N° bon de livraison, facture…" value={movForm.reference}
                      onChange={(e) => setMovForm((f) => ({ ...f, reference: e.target.value }))} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1">Notes</label>
                    <input className="input text-sm" placeholder="Remarques…" value={movForm.notes}
                      onChange={(e) => setMovForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>

                {movError && <p className="text-xs text-brand-danger mt-3">{movError}</p>}

                <div className="flex gap-2 mt-5">
                  <button onClick={saveMovement} disabled={savingMov} className="btn-primary flex-1">
                    {savingMov ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
                  </button>
                  <button onClick={() => { setShowMovForm(false); setMovError(null); }} className="btn-secondary">Annuler</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
