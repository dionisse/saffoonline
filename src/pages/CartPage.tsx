import { ArrowLeft, Trash2, Plus, Minus, Tag, Package2, ShoppingBag } from 'lucide-react';
import { useCart, getEffectivePrice } from '../contexts/CartContext';
import { formatPrice, parseImages } from '../lib/format';
import type { View } from '../lib/views';

export function CartPage({ setView }: { setView: (v: View) => void }) {
  const { items, updateQuantity, removeFromCart, subtotal, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-16 text-center">
        <div className="w-16 h-16 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8 text-brand-muted" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Votre panier est vide</h1>
        <p className="text-brand-muted mb-6">Ajoutez des produits pour commencer.</p>
        <button onClick={() => setView({ kind: 'shop' })} className="btn-primary">Découvrir la boutique</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <button onClick={() => setView({ kind: 'shop' })} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />Continuer mes achats
      </button>
      <h1 className="text-2xl font-bold mb-6">Mon panier ({items.length})</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const key = item.cartKey ?? item.product.id;
            const price = getEffectivePrice(item.product, item.quantity, item.priceModifier ?? 0);
            const bulkActive = item.product.bulk_quantity > 0 && item.quantity >= item.product.bulk_quantity && item.product.bulk_price > 0;
            const maxQty = !item.product.track_stock ? 9999 : (item.optionStock !== undefined ? item.optionStock : item.product.stock);
            const firstImage = parseImages(item.product.image_url)[0] ?? null;
            return (
              <div key={key} className="card p-3 flex gap-3">
                <div className="w-20 h-20 bg-brand-surface rounded flex-shrink-0 overflow-hidden">
                  {firstImage
                    ? <img src={firstImage} alt={item.product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Package2 className="w-8 h-8 text-brand-muted" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2">{item.product.name}</h3>
                      {item.optionLabel && (
                        <span className="text-xs text-brand-primary font-medium bg-brand-primary/8 px-2 py-0.5 rounded-full mt-1 inline-block">
                          {item.optionLabel}
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeFromCart(key)} className="text-brand-muted hover:text-brand-danger transition flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {bulkActive && <span className="badge bg-brand-success/10 text-brand-success mt-1"><Tag className="w-3 h-3 mr-1" />Prix de gros</span>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border border-brand-border rounded">
                      <button onClick={() => updateQuantity(key, item.quantity - 1)} className="p-1.5 hover:bg-brand-surface transition"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="px-3 text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(key, item.quantity + 1)} disabled={item.quantity >= maxQty}
                        className="p-1.5 hover:bg-brand-surface transition disabled:opacity-40 disabled:cursor-not-allowed"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-brand-primary text-sm">{formatPrice(price * item.quantity)}</p>
                      <p className="text-xs text-brand-muted">{formatPrice(price)}/unité</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={clearCart} className="text-sm text-brand-muted hover:text-brand-danger transition flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" />Vider le panier
          </button>
        </div>
        <div className="lg:sticky lg:top-20 h-fit">
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Résumé</h2>
            <div className="space-y-2 text-sm pb-4 border-b border-brand-border">
              <div className="flex justify-between"><span className="text-brand-muted">Sous-total</span><span className="font-medium">{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-brand-muted">Livraison</span><span className="text-brand-muted text-xs">Calculée à la commande</span></div>
            </div>
            <div className="flex justify-between items-baseline pt-4 mb-4">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-brand-primary">{formatPrice(subtotal)}</span>
            </div>
            <button onClick={() => setView({ kind: 'checkout' })} className="btn-primary w-full">Passer la commande</button>
          </div>
        </div>
      </div>
    </div>
  );
}
