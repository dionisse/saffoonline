import { useEffect, useState } from 'react';
import { Loader2, ShoppingBag, DollarSign, Package, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import { StatusBadge } from '../OrdersPage';
import type { Order, Product } from '../../lib/database.types';
import type { View } from '../../lib/views';

interface Stats {
  todaySales: number;
  weekSales: number;
  monthSales: number;
  pendingOrders: number;
  totalProducts: number;
  lowStockCount: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
}

export function AdminDashboard({ setView }: { setView: (v: View) => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    loadStats().then((s) => { if (mounted) { setStats(s); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  async function loadStats(): Promise<Stats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [todayRes, weekRes, monthRes, pendingRes, productsRes, recentRes] = await Promise.all([
      supabase.from('orders').select('total').gte('created_at', startOfDay).neq('status', 'cancelled'),
      supabase.from('orders').select('total').gte('created_at', startOfWeek).neq('status', 'cancelled'),
      supabase.from('orders').select('total').gte('created_at', startOfMonth).neq('status', 'cancelled'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('products').select('*'),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    ]);
    const sum = (rows: { total: number }[] | null) => (rows ?? []).reduce((a, b) => a + Number(b.total), 0);
    const products = (productsRes.data as Product[]) ?? [];
    return {
      todaySales: sum(todayRes.data as { total: number }[]),
      weekSales: sum(weekRes.data as { total: number }[]),
      monthSales: sum(monthRes.data as { total: number }[]),
      pendingOrders: pendingRes.count ?? 0,
      totalProducts: products.length,
      lowStockCount: products.filter((p) => p.stock <= p.low_stock_threshold).length,
      recentOrders: (recentRes.data as Order[]) ?? [],
      lowStockProducts: products.filter((p) => p.stock <= p.low_stock_threshold).slice(0, 5),
    };
  }

  if (loading || !stats) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-sm text-brand-muted mt-1">Vue d'ensemble de votre activité</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard icon={<DollarSign className="w-5 h-5" />} label="Ventes du jour" value={formatPrice(stats.todaySales)} color="primary" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="7 derniers jours" value={formatPrice(stats.weekSales)} color="success" />
        <StatCard icon={<Users className="w-5 h-5" />} label="Ce mois-ci" value={formatPrice(stats.monthSales)} color="info" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="En attente" value={stats.pendingOrders.toString()} color="warning" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <button onClick={() => setView({ kind: 'admin-products' })} className="card p-4 text-left hover:border-brand-primary transition">
          <Package className="w-5 h-5 text-brand-primary mb-2" />
          <p className="text-xs text-brand-muted">Produits</p>
          <p className="text-xl font-bold">{stats.totalProducts}</p>
        </button>
        <button onClick={() => setView({ kind: 'admin-products' })} className="card p-4 text-left hover:border-brand-warning transition">
          <AlertTriangle className="w-5 h-5 text-brand-warning mb-2" />
          <p className="text-xs text-brand-muted">Stock faible</p>
          <p className="text-xl font-bold">{stats.lowStockCount}</p>
        </button>
        <button onClick={() => setView({ kind: 'admin-orders' })} className="card p-4 text-left hover:border-brand-primary transition">
          <ShoppingBag className="w-5 h-5 text-brand-primary mb-2" />
          <p className="text-xs text-brand-muted">Commandes</p>
          <p className="text-sm font-medium">Voir toutes</p>
        </button>
        <button onClick={() => setView({ kind: 'admin-pos' })} className="card p-4 text-left hover:border-brand-success transition bg-gradient-to-br from-brand-success/5 to-transparent">
          <DollarSign className="w-5 h-5 text-brand-success mb-2" />
          <p className="text-xs text-brand-muted">Caisse</p>
          <p className="text-sm font-medium">Ouvrir POS</p>
        </button>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-semibold">Commandes récentes</h2>
            <button onClick={() => setView({ kind: 'admin-orders' })} className="text-xs text-brand-primary hover:underline">Voir tout</button>
          </div>
          {stats.recentOrders.length === 0
            ? <p className="p-6 text-sm text-brand-muted text-center">Aucune commande</p>
            : <div className="divide-y divide-brand-border">
              {stats.recentOrders.map((o) => (
                <div key={o.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium truncate">{o.order_number}</p>
                    <p className="text-xs text-brand-muted">{formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={o.status} />
                    <span className="font-bold text-sm">{formatPrice(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>}
        </div>
        <div className="card">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-semibold">Alertes stock</h2>
            <button onClick={() => setView({ kind: 'admin-products' })} className="text-xs text-brand-primary hover:underline">Gérer</button>
          </div>
          {stats.lowStockProducts.length === 0
            ? <p className="p-6 text-sm text-brand-muted text-center">Tous les stocks sont OK</p>
            : <div className="divide-y divide-brand-border">
              {stats.lowStockProducts.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-brand-muted">{p.sku || '—'}</p>
                  </div>
                  <span className={`badge ${p.stock === 0 ? 'bg-brand-danger/15 text-brand-danger' : 'bg-brand-warning/15 text-brand-warning'}`}>
                    {p.stock} en stock
                  </span>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'primary' | 'success' | 'warning' | 'info' }) {
  const cls = { primary: 'bg-brand-primary/10 text-brand-primary', success: 'bg-brand-success/10 text-brand-success', warning: 'bg-brand-warning/10 text-brand-warning', info: 'bg-brand-info/10 text-brand-info' };
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center mb-2 ${cls[color]}`}>{icon}</div>
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="text-lg lg:text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}
