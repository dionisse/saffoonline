import { useEffect, useState } from 'react';
import {
  Loader2, TrendingUp, DollarSign, ShoppingBag, BarChart3,
  Calendar, Download, Plus, X, TrendingDown, Wallet, Receipt,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import type { Order, Expense } from '../../lib/database.types';

type Period = 'today' | 'week' | 'month' | 'year';

interface DayStat { date: string; total: number; count: number; }

const EXPENSE_CATEGORIES = ['loyer', 'salaires', 'fournisseurs', 'transport', 'utilities', 'marketing', 'maintenance', 'autres'];
const CAT_LABELS: Record<string, string> = {
  loyer: 'Loyer', salaires: 'Salaires', fournisseurs: 'Fournisseurs',
  transport: 'Transport', utilities: 'Utilities', marketing: 'Marketing',
  maintenance: 'Maintenance', autres: 'Autres',
};

function getStart(period: Period): Date {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

// Marge brute: 30% du CA (coût marchandises estimé à 70%)
const COGS_RATE = 0.70;

export function AdminReports() {
  const [period, setPeriod] = useState<Period>('month');
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ label: '', category: 'autres', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const start = getStart(period).toISOString();
    const startDate = getStart(period).toISOString().split('T')[0];

    Promise.all([
      supabase.from('orders').select('*').gte('created_at', start).neq('status', 'cancelled').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').gte('date', startDate).order('date', { ascending: false }),
    ]).then(([ordersRes, expensesRes]) => {
      if (!mounted) return;
      setOrders((ordersRes.data as Order[]) ?? []);
      setExpenses((expensesRes.data as Expense[]) ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [period]);

  const totalRevenue = orders.reduce((a, o) => a + Number(o.total), 0);
  const onlineSales = orders.filter((o) => o.source === 'online').reduce((a, o) => a + Number(o.total), 0);
  const posSales = orders.filter((o) => o.source === 'pos').reduce((a, o) => a + Number(o.total), 0);
  const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

  const totalCOGS = totalRevenue * COGS_RATE;
  const grossMargin = totalRevenue - totalCOGS;
  const grossMarginPct = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const netProfit = grossMargin - totalExpenses;

  const byDay: DayStat[] = [];
  const dayMap = new Map<string, { total: number; count: number }>();
  orders.forEach((o) => {
    const day = o.created_at.split('T')[0];
    const existing = dayMap.get(day) ?? { total: 0, count: 0 };
    dayMap.set(day, { total: existing.total + Number(o.total), count: existing.count + 1 });
  });
  dayMap.forEach((v, k) => byDay.push({ date: k, total: v.total, count: v.count }));
  byDay.sort((a, b) => a.date.localeCompare(b.date));
  const maxTotal = Math.max(...byDay.map((d) => d.total), 1);

  const statusCounts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  const paymentBreakdown = orders.reduce((acc, o) => {
    acc[o.payment_method] = (acc[o.payment_method] ?? 0) + Number(o.total);
    return acc;
  }, {} as Record<string, number>);

  const expenseByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  async function saveExpense() {
    if (!expenseForm.label.trim() || !expenseForm.amount) {
      setExpenseError('Libellé et montant requis.');
      return;
    }
    setSavingExpense(true);
    setExpenseError(null);
    const { error, data } = await supabase.from('expenses').insert({
      label: expenseForm.label.trim(),
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      date: expenseForm.date,
      notes: expenseForm.notes.trim(),
    }).select().maybeSingle();

    setSavingExpense(false);
    if (error) { setExpenseError(error.message); return; }
    if (data) setExpenses((prev) => [data as Expense, ...prev]);
    setShowExpenseForm(false);
    setExpenseForm({ label: '', category: 'autres', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-brand-primary" />Rapports financiers</h1>
          <p className="text-sm text-brand-muted mt-1">{orders.length} commandes sur la période</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['today', 'week', 'month', 'year'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition ${period === p ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border hover:border-brand-primary'}`}>
              {p === 'today' ? "Aujourd'hui" : p === 'week' ? '7 jours' : p === 'month' ? 'Ce mois' : 'Cette année'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
      ) : (
        <>
          {/* KPI Row 1 — Ventes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Chiffre d'affaires" value={formatPrice(totalRevenue)} sub={`${orders.length} commandes`} color="primary" />
            <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Panier moyen" value={formatPrice(avgOrder)} sub="par commande" color="success" />
            <KpiCard icon={<ShoppingBag className="w-5 h-5" />} label="Ventes en ligne" value={formatPrice(onlineSales)} sub={`${orders.filter((o) => o.source === 'online').length} cmd.`} color="info" />
            <KpiCard icon={<Calendar className="w-5 h-5" />} label="Ventes POS" value={formatPrice(posSales)} sub={`${orders.filter((o) => o.source === 'pos').length} cmd.`} color="warning" />
          </div>

          {/* KPI Row 2 — Résultat financier */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="card p-5 border-l-4 border-l-brand-success">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-brand-muted font-medium uppercase tracking-wide mb-1">Marge Brute</p>
                  <p className="text-2xl font-bold text-brand-success">{formatPrice(grossMargin)}</p>
                  <p className="text-xs text-brand-muted mt-1">Après coût marchandises estimé</p>
                </div>
                <div className="bg-brand-success/10 text-brand-success rounded-lg p-2">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-brand-border">
                <div className="flex justify-between text-xs text-brand-muted mb-1">
                  <span>Taux de marge</span>
                  <span className="font-semibold text-brand-success">{grossMarginPct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <div className="h-full bg-brand-success rounded-full" style={{ width: `${Math.min(grossMarginPct, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="card p-5 border-l-4 border-l-brand-danger">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-brand-muted font-medium uppercase tracking-wide mb-1">Dépenses & Charges</p>
                  <p className="text-2xl font-bold text-brand-danger">{formatPrice(totalExpenses)}</p>
                  <p className="text-xs text-brand-muted mt-1">{expenses.length} entrée{expenses.length !== 1 ? 's' : ''} sur la période</p>
                </div>
                <div className="bg-brand-danger/10 text-brand-danger rounded-lg p-2">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-brand-border">
                <div className="flex justify-between text-xs text-brand-muted mb-1">
                  <span>% du CA</span>
                  <span className="font-semibold text-brand-danger">{totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0.0'}%</span>
                </div>
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <div className="h-full bg-brand-danger rounded-full" style={{ width: totalRevenue > 0 ? `${Math.min((totalExpenses / totalRevenue) * 100, 100)}%` : '0%' }} />
                </div>
              </div>
            </div>

            <div className={`card p-5 border-l-4 ${netProfit >= 0 ? 'border-l-brand-primary' : 'border-l-brand-warning'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-brand-muted font-medium uppercase tracking-wide mb-1">Bénéfice Net Avant Impôt</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-brand-primary' : 'text-brand-warning'}`}>{formatPrice(netProfit)}</p>
                  <p className="text-xs text-brand-muted mt-1">Marge brute − dépenses</p>
                </div>
                <div className={`rounded-lg p-2 ${netProfit >= 0 ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-warning/10 text-brand-warning'}`}>
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-brand-border">
                <div className="flex justify-between text-xs text-brand-muted mb-1">
                  <span>Marge nette</span>
                  <span className={`font-semibold ${netProfit >= 0 ? 'text-brand-primary' : 'text-brand-warning'}`}>
                    {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${netProfit >= 0 ? 'bg-brand-primary' : 'bg-brand-warning'}`}
                    style={{ width: totalRevenue > 0 ? `${Math.min(Math.abs(netProfit / totalRevenue) * 100, 100)}%` : '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chart */}
          {byDay.length > 0 && (
            <div className="card p-5 mb-5">
              <h2 className="font-semibold mb-4">Évolution des ventes</h2>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1.5 min-w-max" style={{ height: 140 }}>
                  {byDay.map((d) => {
                    const pct = (d.total / maxTotal) * 100;
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-1 group" style={{ minWidth: 36 }}>
                        <div className="relative w-full flex items-end justify-center" style={{ height: 110 }}>
                          <div className="w-7 rounded-t-sm bg-brand-primary/20 group-hover:bg-brand-primary transition-colors duration-150" style={{ height: `${Math.max(pct, 2)}%` }}>
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap text-xs bg-brand-dark text-white px-2 py-0.5 rounded">
                              {formatPrice(d.total)} ({d.count})
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-brand-muted">{d.date.slice(8)}/{d.date.slice(5, 7)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Statuts / Paiements / Canaux */}
          <div className="grid md:grid-cols-3 gap-4 mb-5">
            <div className="card p-5">
              <h2 className="font-semibold mb-3">Statuts des commandes</h2>
              <div className="space-y-2">
                {[
                  { label: 'En attente', key: 'pending' as const, color: 'bg-brand-warning' },
                  { label: 'En traitement', key: 'processing' as const, color: 'bg-brand-info' },
                  { label: 'Expédiées', key: 'shipped' as const, color: 'bg-brand-primary' },
                  { label: 'Livrées', key: 'delivered' as const, color: 'bg-brand-success' },
                ].map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="text-sm flex-1">{s.label}</span>
                    <span className="font-bold text-sm">{statusCounts[s.key]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold mb-3">Modes de paiement</h2>
              <div className="space-y-2">
                {Object.entries(paymentBreakdown).sort((a, b) => b[1] - a[1]).map(([method, amount]) => {
                  const labels: Record<string, string> = { cash: 'Espèces', mobile_money_mtn: 'MTN MoMo', mobile_money_moov: 'MOOV Money', mobile_money_celtis: 'CELTIS Pay', bank_transfer: 'Virement', cash_on_delivery: 'Livraison', fedapay_online: 'FedaPay', chariow_online: 'Chariow' };
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-brand-muted">{labels[method] || method}</span>
                        <span className="font-medium">{formatPrice(amount)}</span>
                      </div>
                      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                        <div className="h-full bg-brand-primary rounded-full" style={{ width: `${(amount / totalRevenue) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(paymentBreakdown).length === 0 && <p className="text-sm text-brand-muted text-center py-2">Aucune donnée</p>}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold mb-3">Canaux de vente</h2>
              <div className="space-y-3">
                {[
                  { label: 'Boutique en ligne', value: onlineSales, count: orders.filter((o) => o.source === 'online').length, color: 'bg-brand-primary' },
                  { label: 'Caisse POS', value: posSales, count: orders.filter((o) => o.source === 'pos').length, color: 'bg-brand-secondary' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{s.label}</span>
                      <span className="font-medium">{s.count} cmd.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-brand-border rounded-full overflow-hidden">
                        <div className={`h-full ${s.color} rounded-full`} style={{ width: totalRevenue > 0 ? `${(s.value / totalRevenue) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-xs font-medium w-20 text-right">{formatPrice(s.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Dépenses & Charges */}
          <div className="card mb-5">
            <div className="p-4 border-b border-brand-border flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold flex items-center gap-2"><Receipt className="w-4 h-4 text-brand-danger" />Dépenses & Charges</h2>
                <p className="text-xs text-brand-muted mt-0.5">Total : <span className="font-bold text-brand-danger">{formatPrice(totalExpenses)}</span></p>
              </div>
              <button onClick={() => setShowExpenseForm(true)} className="btn-primary text-sm gap-1.5">
                <Plus className="w-4 h-4" />Ajouter une dépense
              </button>
            </div>

            {showExpenseForm && (
              <div className="p-4 bg-brand-surface border-b border-brand-border">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium mb-1">Libellé *</label>
                    <input className="input text-sm" placeholder="Ex: Loyer du mois" value={expenseForm.label}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, label: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Catégorie</label>
                    <select className="input text-sm" value={expenseForm.category}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}>
                      {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Montant (FCFA) *</label>
                    <input className="input text-sm" type="number" min="0" placeholder="0" value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Date</label>
                    <input className="input text-sm" type="date" value={expenseForm.date}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-medium mb-1">Notes</label>
                    <input className="input text-sm" placeholder="Remarques optionnelles" value={expenseForm.notes}
                      onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                {expenseError && <p className="text-xs text-brand-danger mb-2">{expenseError}</p>}
                <div className="flex gap-2">
                  <button onClick={saveExpense} disabled={savingExpense} className="btn-primary text-sm">
                    {savingExpense ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Enregistrer'}
                  </button>
                  <button onClick={() => { setShowExpenseForm(false); setExpenseError(null); }} className="btn-secondary text-sm">Annuler</button>
                </div>
              </div>
            )}

            {/* Répartition par catégorie */}
            {Object.keys(expenseByCategory).length > 0 && (
              <div className="p-4 border-b border-brand-border">
                <p className="text-xs font-medium text-brand-muted uppercase tracking-wide mb-3">Répartition par catégorie</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="bg-brand-danger/5 border border-brand-danger/10 rounded-lg p-3">
                      <p className="text-xs text-brand-muted mb-1">{CAT_LABELS[cat] || cat}</p>
                      <p className="font-bold text-sm text-brand-danger">{formatPrice(amt)}</p>
                      <p className="text-xs text-brand-muted mt-0.5">{totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(0) : 0}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase">
                  <tr>
                    <th className="p-3 text-left">Libellé</th>
                    <th className="p-3 text-left hidden sm:table-cell">Catégorie</th>
                    <th className="p-3 text-left hidden md:table-cell">Date</th>
                    <th className="p-3 text-left hidden lg:table-cell">Notes</th>
                    <th className="p-3 text-right">Montant</th>
                    <th className="p-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-brand-surface/50">
                      <td className="p-3 font-medium">{e.label}</td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className="badge bg-brand-danger/10 text-brand-danger text-xs">{CAT_LABELS[e.category] || e.category}</span>
                      </td>
                      <td className="p-3 hidden md:table-cell text-brand-muted text-xs">{e.date}</td>
                      <td className="p-3 hidden lg:table-cell text-brand-muted text-xs">{e.notes || '—'}</td>
                      <td className="p-3 text-right font-bold text-brand-danger">{formatPrice(Number(e.amount))}</td>
                      <td className="p-3">
                        <button onClick={() => deleteExpense(e.id)} className="text-brand-muted hover:text-brand-danger transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {expenses.length === 0 && (
                <p className="p-8 text-center text-brand-muted text-sm">Aucune dépense enregistrée sur cette période</p>
              )}
            </div>
          </div>

          {/* Commandes */}
          <div className="card">
            <div className="p-4 border-b border-brand-border flex items-center justify-between">
              <h2 className="font-semibold">Détail des commandes ({orders.length})</h2>
              <button onClick={() => exportCSV(orders)} className="btn-secondary text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" />Exporter CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase">
                  <tr>
                    <th className="p-3 text-left">Commande</th>
                    <th className="p-3 text-left hidden md:table-cell">Client</th>
                    <th className="p-3 text-left hidden lg:table-cell">Date</th>
                    <th className="p-3 text-center hidden sm:table-cell">Source</th>
                    <th className="p-3 text-center hidden md:table-cell">Paiement</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {orders.slice(0, 50).map((o) => (
                    <tr key={o.id} className="hover:bg-brand-surface/50">
                      <td className="p-3 font-mono font-medium text-xs">{o.order_number}</td>
                      <td className="p-3 hidden md:table-cell">{o.customer_name || '—'}</td>
                      <td className="p-3 hidden lg:table-cell text-brand-muted text-xs">{formatDate(o.created_at)}</td>
                      <td className="p-3 text-center hidden sm:table-cell">
                        <span className={`badge text-xs ${o.source === 'pos' ? 'bg-brand-info/15 text-brand-info' : 'bg-brand-primary/10 text-brand-primary'}`}>
                          {o.source === 'pos' ? 'POS' : 'Web'}
                        </span>
                      </td>
                      <td className="p-3 text-center hidden md:table-cell text-xs text-brand-muted capitalize">{o.payment_method.replace('_', ' ')}</td>
                      <td className="p-3 text-right font-bold text-brand-primary">{formatPrice(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <p className="p-8 text-center text-brand-muted">Aucune commande sur cette période</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: 'primary' | 'success' | 'warning' | 'info' }) {
  const cls = { primary: 'bg-brand-primary/10 text-brand-primary', success: 'bg-brand-success/10 text-brand-success', warning: 'bg-brand-warning/10 text-brand-warning', info: 'bg-brand-info/10 text-brand-info' };
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${cls[color]}`}>{icon}</div>
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      <p className="text-xs text-brand-muted mt-1">{sub}</p>
    </div>
  );
}

function exportCSV(orders: Order[]) {
  const headers = ['Numéro', 'Client', 'Téléphone', 'Date', 'Source', 'Paiement', 'Statut', 'Total'];
  const rows = orders.map((o) => [
    o.order_number, o.customer_name, o.customer_phone,
    new Date(o.created_at).toLocaleDateString('fr-FR'),
    o.source, o.payment_method, o.status, o.total,
  ]);
  const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
