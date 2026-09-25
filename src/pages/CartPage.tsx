import { ArrowLeft, Trash2, Plus, Minus, Tag, Package2, ShoppingBag, Sparkles } from 'lucide-react';
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
                      <h3 className="font-semibold text-sm line-clamp-2 text-gray-900">
                        {item.customTitle ?? item.product.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.eventGuests && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D10024] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            🎉 Proposition Chatbot · {item.eventGuests} invités
                          </span>
                        )}
                        {item.optionLabel && (
                          <span className="text-xs text-brand-primary font-medium bg-brand-primary/8 px-2 py-0.5 rounded-full inline-block">
                            {item.optionLabel}
                          </span>
                        )}
                        {bulkActive && (
                          <span className="badge bg-brand-success/10 text-brand-success">
                            <Tag className="w-3 h-3 mr-1" />Prix de gros
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(key)} className="text-brand-muted hover:text-brand-danger transition flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Detailed list of beverages in the Dot, Mariage & Event Pack proposition */}
                  {item.packBreakdown && item.packBreakdown.length > 0 && (
                    <div className="mt-3 bg-red-50/50 border border-red-200/90 rounded-xl p-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1 pb-2 mb-2 border-b border-red-200/80">
                        <div className="flex items-center gap-1.5 font-black text-[#D10024] text-[11px] uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-[#FFB300]" />
                          <span>Liste de la proposition dans le Pack Dot, Mariage & Événement :</span>
                        </div>
                        <span className="text-[10px] bg-white text-gray-800 font-bold px-2 py-0.5 rounded border border-red-200 shadow-2xs">
                          {item.eventGuests ? `${item.eventGuests} convives` : `${item.packBreakdown.length} boissons`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.packBreakdown.map((elem, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-red-100 shadow-2xs">
                            <span className="text-base select-none leading-none">{elem.icon || '📦'}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-xs leading-tight">
                                <span className="text-[#D10024] font-black">{elem.quantity * item.quantity} ×</span> {elem.name}
                              </div>
                              <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <span>{elem.unit}</span>
                                {elem.note && (
                                  <span className="bg-green-100 text-green-800 font-bold px-1.5 py-0.2 rounded text-[9px]">
                                    {elem.note}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-red-200/60 flex flex-wrap items-center justify-between gap-1 text-[10px] text-gray-600">
                        <span>💡 Bouteilles & casiers livrés glacés · Reprise des casiers vides 1 pour 1</span>
                        <span className="font-bold text-green-700">✓ Prêt pour réception & cérémonie</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
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
