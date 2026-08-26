import { useEffect, useState } from 'react';
import { Loader2, Search, Eye, Truck, MessageCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate, formatPrice } from '../../lib/format';
import { StatusBadge } from '../OrdersPage';
import type { Order, OrderItem, OrderStatus } from '../../lib/database.types';

const STATUS_OPTIONS: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return o.order_number.toLowerCase().includes(q) || o.customer_name.toLowerCase().includes(q) || o.customer_phone.includes(q);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Commandes</h1>
        <p className="text-sm text-brand-muted">{orders.length} commandes</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher numéro, client, téléphone..." className="input pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')} className="input sm:w-52">
          <option value="all">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-surface text-left text-xs font-medium text-brand-muted uppercase">
              <tr>
                <th className="p-3">N° / Date</th>
                <th className="p-3 hidden md:table-cell">Client</th>
                <th className="p-3 hidden lg:table-cell">Source</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Statut</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-brand-surface/50">
                  <td className="p-3"><p className="font-mono font-medium">{o.order_number}</p><p className="text-xs text-brand-muted">{formatDate(o.created_at)}</p></td>
                  <td className="p-3 hidden md:table-cell"><p className="font-medium">{o.customer_name || '—'}</p><p className="text-xs text-brand-muted">{o.customer_phone}</p></td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className={`badge ${o.source === 'pos' ? 'bg-brand-info/15 text-brand-info' : 'bg-brand-primary/10 text-brand-primary'}`}>{o.source === 'pos' ? 'POS' : 'En ligne'}</span>
                  </td>
                  <td className="p-3 text-right font-bold">{formatPrice(o.total)}</td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3 text-right"><button onClick={() => setSelected(o)} className="btn-ghost p-1.5"><Eye className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-8 text-center text-brand-muted">Aucune commande</p>}
        </div>
      </div>
      {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} onUpdated={() => { load(); setSelected(null); }} />}
    </div>
  );
}

function OrderDrawer({ order, onClose, onUpdated }: { order: Order; onClose: () => void; onUpdated: () => void }) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [assignee, setAssignee] = useState(order.delivery_assignee);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('order_items').select('*').eq('order_id', order.id).then(({ data }) => setItems((data as OrderItem[]) ?? []));
  }, [order.id]);

  async function save() {
    setSaving(true);
    await supabase.from('orders').update({ status, delivery_assignee: assignee, updated_at: new Date().toISOString() }).eq('id', order.id);
    setSaving(false);
    onUpdated();
  }

  const whatsappMsg = encodeURIComponent(`Bonjour ${order.customer_name}, votre commande ${order.order_number} est maintenant: ${status}.`);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-brand-border p-4 flex items-center justify-between">
          <div><p className="text-xs text-brand-muted">Commande</p><h2 className="font-bold font-mono">{order.order_number}</h2></div>
          <button onClick={onClose} className="p-1 hover:bg-brand-surface rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Client</h3>
            <div className="bg-brand-surface p-3 rounded text-sm">
              <p className="font-medium">{order.customer_name || '—'}</p>
              <p className="text-brand-muted">{order.customer_phone || '—'}</p>
              {order.delivery_address && <p className="mt-2 text-brand-muted">{order.delivery_address}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Articles</h3>
            <div className="border border-brand-border rounded divide-y divide-brand-border">
              {items.map((it) => (
                <div key={it.id} className="p-3 flex justify-between text-sm">
                  <div><p className="font-medium">{it.product_name}</p><p className="text-xs text-brand-muted">{it.quantity} × {formatPrice(it.unit_price)}</p></div>
                  <span className="font-semibold">{formatPrice(it.subtotal)}</span>
                </div>
              ))}
              <div className="p-3 bg-brand-surface flex justify-between items-baseline">
                <span className="font-medium">Total</span>
                <span className="text-lg font-bold text-brand-primary">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} className="input">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 flex items-center gap-1.5"><Truck className="w-4 h-4" />Livreur assigné</label>
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Nom du livreur" className="input" />
          </div>
          {order.notes && <div><h3 className="text-sm font-semibold mb-1">Notes</h3><p className="text-sm text-brand-muted bg-brand-surface p-3 rounded">{order.notes}</p></div>}
          <div className="flex flex-col gap-2 pt-2 border-t border-brand-border">
            <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}</button>
            {order.customer_phone && (
              <a href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
                <MessageCircle className="w-4 h-4" />WhatsApp client
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
