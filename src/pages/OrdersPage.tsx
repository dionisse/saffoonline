import { useEffect, useState } from 'react';
import { Loader2, Package, ChevronRight, ArrowLeft, MapPin, Phone, Calendar, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatPrice } from '../lib/format';
import type { Order, OrderItem, OrderStatus } from '../lib/database.types';
import type { View } from '../lib/views';

const STATUS_MAP: Record<OrderStatus, { label: string; cls: string }> = {
  pending:    { label: 'En attente',    cls: 'bg-brand-warning/15 text-brand-warning' },
  processing: { label: 'En traitement', cls: 'bg-brand-info/15 text-brand-info' },
  shipped:    { label: 'Expédiée',      cls: 'bg-brand-primary/15 text-brand-primary' },
  delivered:  { label: 'Livrée',        cls: 'bg-brand-success/15 text-brand-success' },
  cancelled:  { label: 'Annulée',       cls: 'bg-brand-danger/15 text-brand-danger' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS_MAP[status];
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function OrdersPage({ setView }: { setView: (v: View) => void }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let mounted = true;
    supabase.from('orders').select('*').eq('customer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (!mounted) return;
      setOrders((data as Order[]) ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [user]);

  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <h1 className="text-xl font-semibold mb-2">Connexion requise</h1>
      <button onClick={() => setView({ kind: 'auth' })} className="btn-primary mt-4">Se connecter</button>
    </div>
  );
  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <h1 className="text-2xl font-bold mb-6">Mes commandes</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 card">
          <Package className="w-10 h-10 text-brand-muted mx-auto mb-3" />
          <p className="font-medium">Aucune commande</p>
          <button onClick={() => setView({ kind: 'shop' })} className="btn-primary mt-4">Découvrir les produits</button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <button key={o.id} onClick={() => setView({ kind: 'order', id: o.id })}
              className="card w-full p-4 flex items-center justify-between hover:border-brand-primary transition text-left">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-semibold text-sm">{o.order_number}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-xs text-brand-muted">{formatDate(o.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-bold text-brand-primary">{formatPrice(o.total)}</span>
                <ChevronRight className="w-5 h-5 text-brand-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderDetailPage({ id, setView }: { id: string; setView: (v: View) => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from('orders').select('*').eq('id', id).maybeSingle(),
      supabase.from('order_items').select('*').eq('order_id', id),
    ]).then(([o, its]) => {
      if (!mounted) return;
      setOrder(o.data as Order | null);
      setItems((its.data as OrderItem[]) ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;
  if (!order) return <div className="max-w-md mx-auto px-4 py-16 text-center"><p>Commande introuvable</p><button onClick={() => setView({ kind: 'orders' })} className="btn-primary mt-4">Retour</button></div>;

  const whatsappMsg = encodeURIComponent(`Bonjour, je voudrais des infos sur ma commande ${order.order_number}.`);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <button onClick={() => setView({ kind: 'orders' })} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />Mes commandes
      </button>
      <div className="card p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-brand-muted">Commande</p>
            <h1 className="text-xl font-bold font-mono">{order.order_number}</h1>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-brand-muted mt-0.5" />
            <div><p className="text-brand-muted text-xs">Date</p><p>{formatDate(order.created_at)}</p></div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-brand-muted mt-0.5" />
            <div><p className="text-brand-muted text-xs">Contact</p><p>{order.customer_phone || '—'}</p></div>
          </div>
          <div className="flex items-start gap-2 sm:col-span-2">
            <MapPin className="w-4 h-4 text-brand-muted mt-0.5" />
            <div><p className="text-brand-muted text-xs">Adresse</p><p>{order.delivery_address || '—'}</p></div>
          </div>
        </div>
      </div>
      <div className="card mb-4">
        <h2 className="font-semibold p-4 border-b border-brand-border">Articles</h2>
        <div className="divide-y divide-brand-border">
          {items.map((it) => (
            <div key={it.id} className="p-4 flex justify-between gap-3">
              <div><p className="font-medium text-sm">{it.product_name}</p><p className="text-xs text-brand-muted">{it.quantity} × {formatPrice(it.unit_price)}</p></div>
              <span className="font-semibold text-sm">{formatPrice(it.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-brand-border flex justify-between items-baseline bg-brand-surface/50">
          <span className="font-semibold">Total</span>
          <span className="text-2xl font-bold text-brand-primary">{formatPrice(order.total)}</span>
        </div>
      </div>
      <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
        <MessageCircle className="w-4 h-4" />Contacter sur WhatsApp
      </a>
    </div>
  );
}
