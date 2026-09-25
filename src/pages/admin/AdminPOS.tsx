import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Search, Plus, Minus, Trash2, ScanBarcode, CheckCircle2,
  Package2, Receipt, MessageCircle, Printer, Tag, Layers, X, Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice, formatDate } from '../../lib/format';
import { getEffectivePrice } from '../../contexts/CartContext';
import type { CartItem, Product, PaymentMethod, ProductOptionGroup, ProductOption, Category } from '../../lib/database.types';

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  mobile_money_mtn: 'MTN MoMo',
  mobile_money_moov: 'MOOV Money',
  mobile_money_celtis: 'CELTIS Pay',
  bank_transfer: 'Virement',
  cash_on_delivery: 'À la livraison',
  fedapay_online: 'FedaPay',
  chariow_online: 'En ligne',
};

interface ReceiptData {
  orderNumber: string;
  total: number;
  items: CartItem[];
  payment: PaymentMethod;
  customerName: string;
  customerPhone: string;
  date: string;
}

export function AdminPOS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [optionsByProduct, setOptionsByProduct] = useState<Record<string, ProductOptionGroup[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Option picker
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const parents = allCategories.filter((c) => !c.parent_id);
    return parents;
  }, [allCategories]);

  const subcategories = useMemo(() => {
    if (!activeCategory) return [];
    return allCategories.filter((c) => c.parent_id === activeCategory);
  }, [allCategories, activeCategory]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [prodRes, ogRes, catRes] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('product_option_groups').select('*, product_options(*)').order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
    ]);
    const prods = (prodRes.data as Product[]) ?? [];
    setProducts(prods);
    setAllCategories((catRes.data as Category[]) ?? []);

    // Build map productId → groups[]
    const map: Record<string, ProductOptionGroup[]> = {};
    for (const g of (ogRes.data as ProductOptionGroup[]) ?? []) {
      if (!map[g.product_id]) map[g.product_id] = [];
      map[g.product_id].push(g);
    }
    setOptionsByProduct(map);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (activeSubcategory) {
      list = list.filter((p) => p.category_id === activeSubcategory);
    } else if (activeCategory) {
      const childIds = allCategories.filter((c) => c.parent_id === activeCategory).map((c) => c.id);
      list = list.filter((p) => p.category_id === activeCategory || (p.category_id ? childIds.includes(p.category_id) : false));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ? p.sku.toLowerCase().includes(q) : false));
    }
    return list;
  }, [products, allCategories, activeCategory, activeSubcategory, search]);

  function handleProductClick(p: Product) {
    if (p.stock <= 0) return;
    const groups = optionsByProduct[p.id];
    if (groups && groups.length > 0) {
      setPickerProduct(p);
    } else {
      addToCart({ product: p, quantity: 1, cartKey: p.id });
    }
  }

  function addToCart(item: CartItem) {
    const key = item.cartKey ?? item.product.id;
    setCart((prev) => {
      const found = prev.find((it) => (it.cartKey ?? it.product.id) === key);
      if (found) {
        if (found.quantity >= item.product.stock) return prev;
        return prev.map((it) => (it.cartKey ?? it.product.id) === key ? { ...it, quantity: it.quantity + 1 } : it);
      }
      return [...prev, item];
    });
  }

  function updateQty(key: string, delta: number) {
    setCart((prev) => prev.flatMap((it) => {
      if ((it.cartKey ?? it.product.id) !== key) return [it];
      const q = it.quantity + delta;
      if (q <= 0) return [];
      if (q > it.product.stock) return [it];
      return [{ ...it, quantity: q }];
    }));
  }

  function setQty(key: string, qty: number) {
    const item = cart.find((it) => (it.cartKey ?? it.product.id) === key);
    if (!item) return;
    if (qty <= 0) { setCart((prev) => prev.filter((it) => (it.cartKey ?? it.product.id) !== key)); return; }
    setCart((prev) => prev.map((it) => (it.cartKey ?? it.product.id) === key ? { ...it, quantity: Math.min(qty, it.product.stock) } : it));
  }

  const subtotal = cart.reduce((acc, it) => acc + getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0) * it.quantity, 0);
  const originalTotal = cart.reduce((acc, it) => acc + it.product.price * it.quantity, 0);
  const hasBulkItems = cart.some((it) => it.product.bulk_quantity > 0 && it.quantity >= it.product.bulk_quantity && it.product.bulk_price > 0);
  const discount = originalTotal - subtotal;

  async function checkout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    const { data: order, error } = await supabase.from('orders').insert({
      customer_id: null,
      customer_name: customerName || 'Client de passage',
      customer_phone: customerPhone,
      total: subtotal,
      status: 'delivered',
      payment_method: payment,
      source: 'pos',
    }).select().single();

    if (error || !order) { setSubmitting(false); return; }

    const orderItems = cart.map((it) => {
      const unit = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
      const label = it.optionLabel ? ` (${it.optionLabel})` : '';
      return {
        order_id: (order as { id: string }).id,
        product_id: it.product.id,
        product_name: it.product.name + label,
        quantity: it.quantity,
        unit_price: unit,
        subtotal: unit * it.quantity,
      };
    });
    await supabase.from('order_items').insert(orderItems);

    for (const it of cart) {
      await supabase.from('products').update({ stock: it.product.stock - it.quantity }).eq('id', it.product.id);
    }

    setReceipt({
      orderNumber: (order as { order_number: string }).order_number,
      total: subtotal,
      items: [...cart],
      payment,
      customerName: customerName || 'Client de passage',
      customerPhone,
      date: new Date().toISOString(),
    });
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPayment('cash');
    setSubmitting(false);
    loadAll();
  }

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
      <div className="grid lg:grid-cols-5 gap-4" style={{ minHeight: 'calc(100vh - 8rem)' }}>

        {/* ── Product grid ── */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-brand-primary flex-shrink-0" />
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, SKU…" autoFocus className="input pl-9" />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button onClick={() => { setActiveCategory(null); setActiveSubcategory(null); }}
                className={`flex-shrink-0 px-3 py-1 rounded text-xs font-medium border transition ${!activeCategory ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border'}`}>
                Tout
              </button>
              {categories.map((cat) => {
                const childIds = allCategories.filter((c) => c.parent_id === cat.id).map((c) => c.id);
                const count = products.filter((p) => p.category_id === cat.id || (p.category_id ? childIds.includes(p.category_id) : false)).length;
                return (
                  <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null); }}
                    className={`flex-shrink-0 px-3 py-1 rounded text-xs font-medium border transition ${activeCategory === cat.id ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border'}`}>
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {subcategories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button onClick={() => setActiveSubcategory(null)}
                className={`flex-shrink-0 px-2.5 py-0.5 rounded text-[11px] font-medium border transition ${!activeSubcategory ? 'bg-brand-dark border-brand-dark text-white' : 'bg-white border-brand-border'}`}>
                Tout
              </button>
              {subcategories.map((sub) => {
                const count = products.filter((p) => p.category_id === sub.id).length;
                return (
                  <button key={sub.id} onClick={() => setActiveSubcategory(sub.id)}
                    className={`flex-shrink-0 px-2.5 py-0.5 rounded text-[11px] font-medium border transition ${activeSubcategory === sub.id ? 'bg-brand-dark border-brand-dark text-white' : 'bg-white border-brand-border'}`}>
                    {sub.name} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-1.5 overflow-auto flex-1">
            {filtered.map((p) => {
              const inCart = cart.filter((it) => it.product.id === p.id).reduce((a, it) => a + it.quantity, 0);
              const hasOptions = (optionsByProduct[p.id]?.length ?? 0) > 0;
              return (
                <button key={p.id} onClick={() => handleProductClick(p)} disabled={p.stock === 0}
                  className={`card overflow-hidden text-left hover:border-brand-primary hover:shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed group relative ${inCart > 0 ? 'ring-2 ring-brand-primary' : ''}`}>
                  {inCart > 0 && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
                      {inCart}
                    </div>
                  )}
                  <div className="aspect-square bg-brand-surface relative overflow-hidden">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" /> : <div className="w-full h-full flex items-center justify-center"><Package2 className="w-6 h-6 text-brand-muted" /></div>}
                    {p.stock === 0 && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><span className="text-[10px] font-semibold text-brand-danger">Rupture</span></div>}
                    {p.bulk_quantity > 0 && <div className="absolute top-0.5 left-0.5"><Tag className="w-3 h-3 text-brand-success" /></div>}
                    {hasOptions && <div className="absolute bottom-0.5 right-0.5 bg-brand-info text-white rounded-full p-0.5"><Layers className="w-2.5 h-2.5" /></div>}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[11px] font-medium line-clamp-1 leading-tight">{p.name}</p>
                    <p className="text-xs font-bold text-brand-primary leading-tight">{formatPrice(p.price)}</p>
                    <p className="text-[10px] text-brand-muted leading-tight">Stock: {p.stock}{hasOptions && ' · opt.'}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="col-span-full text-center py-16 text-brand-muted text-sm">Aucun produit</div>}
          </div>
        </div>

        {/* ── Cart panel ── */}
        <div className="lg:col-span-2 card flex flex-col">
          <div className="p-4 bg-brand-primary/5 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-brand-dark">
              <Receipt className="w-4 h-4 text-brand-primary" />Ticket de caisse
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-brand-muted hover:text-brand-danger transition">Effacer</button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-brand-muted text-sm">
                <ScanBarcode className="w-10 h-10 mb-3 opacity-30" />
                Aucun article — cliquez sur un produit
              </div>
            ) : (
              <div className="divide-y divide-brand-border">
                {cart.map((it) => {
                  const key = it.cartKey ?? it.product.id;
                  const price = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
                  const isBulk = it.product.bulk_quantity > 0 && it.quantity >= it.product.bulk_quantity && it.product.bulk_price > 0;
                  return (
                    <div key={key} className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{it.product.name}</p>
                          {it.optionLabel && (
                            <span className="inline-flex items-center gap-1 text-xs text-brand-info bg-brand-info/8 px-1.5 py-0.5 rounded">
                              <Layers className="w-2.5 h-2.5" />{it.optionLabel}
                            </span>
                          )}
                          {isBulk && <span className="badge bg-brand-success/10 text-brand-success text-xs ml-1"><Tag className="w-2.5 h-2.5 mr-0.5" />Lot</span>}
                        </div>
                        <button onClick={() => setCart((prev) => prev.filter((i) => (i.cartKey ?? i.product.id) !== key))}
                          className="text-brand-muted hover:text-brand-danger transition flex-shrink-0 ml-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-brand-border rounded overflow-hidden">
                          <button onClick={() => updateQty(key, -1)} className="px-2 py-1 hover:bg-brand-surface transition text-brand-muted"><Minus className="w-3 h-3" /></button>
                          <input type="number" value={it.quantity} onChange={(e) => setQty(key, parseInt(e.target.value) || 0)}
                            className="w-10 text-center text-sm font-medium border-x border-brand-border py-1 focus:outline-none" />
                          <button onClick={() => updateQty(key, 1)} disabled={it.quantity >= it.product.stock} className="px-2 py-1 hover:bg-brand-surface transition text-brand-muted disabled:opacity-40"><Plus className="w-3 h-3" /></button>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-primary text-sm">{formatPrice(price * it.quantity)}</p>
                          {(isBulk || (it.priceModifier ?? 0) !== 0) && (
                            <p className="text-xs text-brand-muted line-through">{formatPrice(it.product.price * it.quantity)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-brand-border p-4 space-y-3 bg-white">
            <div className="grid grid-cols-2 gap-2">
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nom client" className="input text-sm" />
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Téléphone" className="input text-sm" type="tel" />
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['cash', 'mobile_money_mtn', 'mobile_money_moov', 'mobile_money_celtis', 'bank_transfer', 'cash_on_delivery'] as PaymentMethod[]).map((m) => (
                <button key={m} onClick={() => setPayment(m)}
                  className={`py-2 border rounded text-xs font-medium transition ${payment === m ? 'bg-brand-primary border-brand-primary text-white' : 'border-brand-border hover:border-brand-primary bg-white'}`}>
                  {PAYMENT_LABELS[m]}
                </button>
              ))}
            </div>

            <div className="pt-1 border-t border-brand-border space-y-1">
              {hasBulkItems && discount > 0 && (
                <div className="flex justify-between text-sm text-brand-success">
                  <span>Remise de gros</span><span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-base">TOTAL</span>
                <span className="text-2xl font-bold text-brand-primary">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <button onClick={checkout} disabled={cart.length === 0 || submitting} className="btn-primary w-full text-base py-3">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" />Encaisser {formatPrice(subtotal)}</>}
            </button>
          </div>
        </div>
      </div>

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      {pickerProduct && (
        <OptionPickerModal
          product={pickerProduct}
          groups={optionsByProduct[pickerProduct.id] ?? []}
          onConfirm={(item) => { addToCart(item); setPickerProduct(null); }}
          onClose={() => setPickerProduct(null)}
        />
      )}
    </div>
  );
}

// ── OptionPickerModal ─────────────────────────────────────────────────────────

function OptionPickerModal({ product, groups, onConfirm, onClose }: {
  product: Product;
  groups: ProductOptionGroup[];
  onConfirm: (item: CartItem) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, ProductOption>>({});

  const allGroupsSelected = groups.every((g) => selected[g.id]);
  const totalModifier = Object.values(selected).reduce((a, o) => a + o.price_modifier, 0);
  const finalPrice = Math.max(0, product.price + totalModifier);
  const optionLabel = groups
    .filter((g) => selected[g.id])
    .map((g) => selected[g.id].label)
    .join(' / ');

  function confirm() {
    if (!allGroupsSelected) return;
    const cartKey = `${product.id}__${optionLabel}`;
    onConfirm({ product, quantity: 1, cartKey, optionLabel, priceModifier: totalModifier });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-brand-border">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-xs text-brand-muted uppercase tracking-wide font-medium mb-0.5">Choisir les options</p>
            <p className="font-semibold truncate">{product.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-brand-surface rounded-lg flex-shrink-0"><X className="w-4 h-4" /></button>
        </div>

        {/* Option groups */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {groups.map((group) => (
            <div key={group.id}>
              <p className="text-sm font-semibold mb-2 text-brand-dark">{group.name}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {((group.product_options as ProductOption[]) ?? []).map((opt) => {
                  const isSelected = selected[group.id]?.id === opt.id;
                  const adjusted = product.price + opt.price_modifier;
                  return (
                    <button key={opt.id} onClick={() => setSelected((prev) => ({ ...prev, [group.id]: opt }))}
                      className={`border rounded-xl p-2.5 text-left transition-all ${isSelected ? 'border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary' : 'border-brand-border hover:border-brand-primary/50'}`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />}
                      </div>
                      <p className={`text-xs font-semibold ${isSelected ? 'text-brand-primary' : 'text-brand-muted'}`}>
                        {formatPrice(Math.max(0, adjusted))}
                      </p>
                      {opt.price_modifier !== 0 && (
                        <p className="text-xs text-brand-muted">
                          {opt.price_modifier > 0 ? '+' : ''}{formatPrice(opt.price_modifier)}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-border bg-brand-surface/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-brand-muted">Prix total</span>
            <span className="text-xl font-bold text-brand-primary">{formatPrice(finalPrice)}</span>
          </div>
          {!allGroupsSelected && (
            <p className="text-xs text-brand-warning mb-2">Veuillez sélectionner une option pour chaque groupe.</p>
          )}
          <button onClick={confirm} disabled={!allGroupsSelected}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
            <Plus className="w-4 h-4" />Ajouter au ticket
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ReceiptModal ──────────────────────────────────────────────────────────────

function ReceiptModal({ receipt, onClose }: { receipt: ReceiptData; onClose: () => void }) {
  const whatsappMsg = encodeURIComponent(
    `Bonjour ${receipt.customerName},\nVotre reçu - Commande ${receipt.orderNumber}\n` +
    receipt.items.map((it) => {
      const price = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
      const optLabel = it.optionLabel ? ` (${it.optionLabel})` : '';
      return `• ${it.quantity}x ${it.product.name}${optLabel}: ${formatPrice(price * it.quantity)}`;
    }).join('\n') +
    `\nTOTAL: ${formatPrice(receipt.total)}\nPaiement: ${PAYMENT_LABELS[receipt.payment]}\nMerci pour votre achat !`
  );

  function printReceipt() {
    const win = window.open('', '_blank', 'width=350,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Reçu ${receipt.orderNumber}</title>
      <style>body{font-family:monospace;font-size:12px;padding:16px;max-width:280px;margin:0 auto}
      h2{text-align:center;font-size:14px;margin:0 0 4px}
      .center{text-align:center}.divider{border-top:1px dashed #000;margin:8px 0}
      .row{display:flex;justify-content:space-between}.total{font-size:16px;font-weight:bold}
      .option{font-size:10px;color:#666;margin-left:8px}
      </style></head>
      <body>
        <h2>BrasseriePro</h2>
        <p class="center" style="font-size:10px;margin:0">${formatDate(receipt.date)}</p>
        <div class="divider"></div>
        ${receipt.items.map((it) => {
          const price = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
          const optLabel = it.optionLabel ? `<span class="option">${it.optionLabel}</span>` : '';
          return `<div class="row"><span>${it.quantity}x ${it.product.name}${optLabel}</span><span>${formatPrice(price * it.quantity)}</span></div>`;
        }).join('')}
        <div class="divider"></div>
        <div class="row total"><span>TOTAL</span><span>${formatPrice(receipt.total)}</span></div>
        <div class="row" style="font-size:10px;margin-top:4px"><span>Paiement</span><span>${PAYMENT_LABELS[receipt.payment]}</span></div>
        <div class="divider"></div>
        <p class="center" style="font-size:10px">${receipt.orderNumber}</p>
        <p class="center" style="font-size:11px;margin-top:8px">Merci pour votre achat !</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-brand-success/10 p-6 text-center border-b border-dashed border-brand-border">
          <CheckCircle2 className="w-14 h-14 text-brand-success mx-auto mb-3" />
          <p className="text-brand-muted text-sm">Vente enregistrée avec succès</p>
          <p className="font-mono font-semibold text-lg mt-1 text-brand-dark">{receipt.orderNumber}</p>
          <p className="text-3xl font-bold text-brand-primary mt-1">{formatPrice(receipt.total)}</p>
          <p className="text-sm text-brand-muted mt-1">{PAYMENT_LABELS[receipt.payment]} — {receipt.customerName}</p>
        </div>
        <div className="p-4 max-h-52 overflow-auto text-sm">
          {receipt.items.map((it) => {
            const key = it.cartKey ?? it.product.id;
            const price = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
            const isBulk = it.product.bulk_quantity > 0 && it.quantity >= it.product.bulk_quantity && it.product.bulk_price > 0;
            return (
              <div key={key} className="flex justify-between py-1.5 border-b border-brand-border last:border-0 gap-2">
                <div className="min-w-0">
                  <span className="font-medium">{it.quantity}× {it.product.name}</span>
                  {it.optionLabel && <p className="text-xs text-brand-muted">{it.optionLabel}</p>}
                  {isBulk && <span className="ml-1 text-xs text-brand-success">(-{Math.round((1 - it.product.bulk_price / it.product.price) * 100)}%)</span>}
                </div>
                <span className="font-semibold flex-shrink-0">{formatPrice(price * it.quantity)}</span>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-brand-border grid grid-cols-2 gap-2">
          <button onClick={printReceipt} className="btn-secondary gap-1.5 text-sm">
            <Printer className="w-4 h-4" />Imprimer
          </button>
          {receipt.customerPhone ? (
            <a href={`https://wa.me/${receipt.customerPhone.replace(/\D/g, '')}?text=${whatsappMsg}`}
              target="_blank" rel="noopener noreferrer" className="btn-secondary gap-1.5 text-sm">
              <MessageCircle className="w-4 h-4" />WhatsApp
            </a>
          ) : (
            <button onClick={onClose} className="btn-secondary text-sm">Fermer</button>
          )}
          <button onClick={onClose} className="btn-primary col-span-2 gap-1.5">
            <ScanBarcode className="w-4 h-4" />Nouvelle vente
          </button>
        </div>
      </div>
    </div>
  );
}
