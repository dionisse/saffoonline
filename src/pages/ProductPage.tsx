import { useEffect, useState } from 'react';
import {
  ArrowLeft, Loader2, Package2, Tag, Plus, Minus, ShoppingCart,
  MessageCircle, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice, parseImages } from '../lib/format';
import type { Product, ProductOptionGroup, ProductOption } from '../lib/database.types';
import { useCart, getEffectivePrice } from '../contexts/CartContext';
import { LazyImage, useRipple, useToast } from '../components/ui';
import type { View } from '../lib/views';

// ─── Image gallery ────────────────────────────────────────────────────────────

function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  // Reset to first image when the list changes
  useEffect(() => { setActive(0); }, [images.join(',')]);

  function prev() { setActive((i) => (i === 0 ? images.length - 1 : i - 1)); }
  function next() { setActive((i) => (i === images.length - 1 ? 0 : i + 1)); }

  if (images.length === 0) {
    return (
      <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: '60ms' }}>
        <div className="aspect-square w-full bg-brand-surface flex items-center justify-center">
          <Package2 className="w-20 h-20 text-brand-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden animate-fade-in-up" style={{ animationDelay: '60ms' }}>
      {/* Main image */}
      <div className="aspect-square w-full bg-brand-surface relative overflow-hidden group">
        <LazyImage
          key={images[active]}
          src={images[active]}
          alt={`${name} — photo ${active + 1}`}
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
        />
        {images.length > 1 && (
          <>
            <button onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100"
              aria-label="Photo précédente">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition opacity-0 group-hover:opacity-100"
              aria-label="Photo suivante">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`h-2 rounded-full transition-all ${i === active ? 'bg-white w-5' : 'bg-white/50 w-2 hover:bg-white/75'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-white border-t border-brand-border">
          {images.map((src, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === active
                  ? 'border-brand-primary shadow-md shadow-brand-primary/25 scale-105'
                  : 'border-brand-border hover:border-brand-primary/50 opacity-70 hover:opacity-100'
              }`}>
              <img src={src} alt={`Miniature ${i + 1}`} className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Option selector ──────────────────────────────────────────────────────────

interface SelectedOptions {
  [groupId: string]: ProductOption;
}

function OptionSelector({
  groups,
  selected,
  onSelect,
}: {
  groups: ProductOptionGroup[];
  selected: SelectedOptions;
  onSelect: (groupId: string, option: ProductOption) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-4 mb-5">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="text-sm font-semibold mb-2">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {(group.product_options ?? []).map((opt) => {
              const isSelected = selected[group.id]?.id === opt.id;
              const isOutOfStock = !product.track_stock ? false : opt.stock === 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => onSelect(group.id, opt)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${
                    isOutOfStock
                      ? 'border-brand-border bg-brand-surface text-brand-muted cursor-not-allowed opacity-60'
                      : isSelected
                        ? 'border-brand-primary bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                        : 'border-brand-border hover:border-brand-primary/60 hover:shadow-sm'
                  }`}
                >
                  {/* Option image thumbnail */}
                  {opt.image_url && (
                    <img
                      src={opt.image_url}
                      alt={opt.label}
                      className={`w-7 h-7 rounded-lg object-cover flex-shrink-0 ${isSelected ? 'ring-2 ring-white/60' : 'ring-1 ring-brand-border'}`}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}

                  <span>{opt.label}</span>

                  {opt.price_modifier !== 0 && (
                    <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-brand-muted'}`}>
                      {opt.price_modifier > 0 ? '+' : ''}{formatPrice(opt.price_modifier)}
                    </span>
                  )}

                  {/* Out of stock overlay */}
                  {isOutOfStock && (
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-brand-danger text-white px-1 py-0.5 rounded-full font-bold leading-none">
                      Rupture
                    </span>
                  )}

                  {/* Low stock indicator */}
                  {!isOutOfStock && opt.stock <= 5 && (
                    <span className={`text-[9px] ${isSelected ? 'text-white/70' : 'text-brand-warning'} font-medium`}>
                      ({opt.stock})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProductPage({ id, setView }: { id: string; setView: (v: View) => void }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<SelectedOptions>({});
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const ripple = useRipple();

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from('products').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('product_option_groups')
        .select('*, product_options(*)')
        .eq('product_id', id)
        .order('sort_order'),
    ]).then(([prod, opts]) => {
      if (!mounted) return;
      setProduct(prod.data as Product | null);
      const groups = (opts.data ?? []) as ProductOptionGroup[];
      // Sort options within each group by sort_order
      groups.forEach((g) => {
        if (g.product_options) {
          g.product_options.sort((a, b) => (a as ProductOption).sort_order - (b as ProductOption).sort_order);
        }
      });
      setOptionGroups(groups);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="max-w-md mx-auto px-4 py-16 text-center animate-fade-in-scale">
      <AlertCircle className="w-10 h-10 text-brand-muted mx-auto mb-3" />
      <p className="font-medium">Produit introuvable</p>
      <button onClick={() => setView({ kind: 'shop' })} className="btn-primary mt-4">Retour</button>
    </div>
  );

  // Build displayed images: if a selected option has an image, prepend it
  const productImages = parseImages(product.image_url);
  const selectedOptionImages = Object.values(selected)
    .map((o) => o.image_url)
    .filter((u): u is string => !!u);
  const displayImages = selectedOptionImages.length > 0
    ? [...selectedOptionImages, ...productImages]
    : productImages;

  // Calculate price modifier from selected options
  const totalPriceModifier = Object.values(selected).reduce((acc, o) => acc + o.price_modifier, 0);

  // Determine effective stock: minimum of product stock and all selected option stocks
  // When stock tracking is disabled, treat as unlimited
  const selectedOptionStocks = Object.values(selected).map((o) => o.stock);
  const effectiveStock = !product.track_stock
    ? Infinity
    : selectedOptionStocks.length > 0
      ? Math.min(product.stock, ...selectedOptionStocks)
      : product.stock;

  const hasBulk = product.bulk_quantity > 0 && product.bulk_price > 0;
  const isOutOfStock = product.track_stock && effectiveStock === 0;
  const effectivePrice = getEffectivePrice(product, quantity, totalPriceModifier);
  const total = effectivePrice * quantity;
  const savings = hasBulk && quantity >= product.bulk_quantity ? (product.price - product.bulk_price) * quantity : 0;

  // Check if all groups have a selection (required before adding to cart)
  const allGroupsSelected = optionGroups.length === 0 || optionGroups.every((g) => selected[g.id]);
  const missingSelection = optionGroups.length > 0 && !allGroupsSelected;

  function handleSelectOption(groupId: string, option: ProductOption) {
    setSelected((prev) => ({ ...prev, [groupId]: option }));
    setQuantity(1);
  }

  const optionLabel = optionGroups.length > 0
    ? optionGroups
        .map((g) => selected[g.id]?.label)
        .filter(Boolean)
        .join(' / ')
    : undefined;

  const whatsappMsg = encodeURIComponent(
    `Bonjour, je suis intéressé(e) par: ${product.name}${optionLabel ? ` (${optionLabel})` : ''}${product.sku ? ` — SKU: ${product.sku}` : ''}`,
  );

  function handleAdd(e: React.MouseEvent<HTMLButtonElement>) {
    if (isOutOfStock || missingSelection) return;
    ripple(e);
    addToCart(product, quantity, {
      optionLabel,
      priceModifier: totalPriceModifier || undefined,
      optionStock: selectedOptionStocks.length > 0 ? Math.min(...selectedOptionStocks) : undefined,
    });
    setAdded(true);
    toast(`${product.name}${optionLabel ? ` (${optionLabel})` : ''} × ${quantity} ajouté au panier`, 'success');
    setTimeout(() => setAdded(false), 2200);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 page-enter">
      <button onClick={() => setView({ kind: 'shop' })} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />Retour
      </button>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image gallery */}
        <ImageGallery images={displayImages} name={product.name} />

        {/* Details panel */}
        <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          {product.sku && (
            <p className="text-xs text-brand-muted mb-2 font-medium tracking-wide uppercase">SKU: {product.sku}</p>
          )}
          <h1 className="text-2xl lg:text-3xl font-bold mb-3">{product.name}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-brand-primary transition-all duration-200">
              {formatPrice(effectivePrice)}
            </span>
            {hasBulk && quantity >= product.bulk_quantity && (
              <span className="text-base text-brand-muted line-through">{formatPrice(product.price)}</span>
            )}
          </div>

          {/* Bulk pricing badge */}
          {hasBulk && (
            <div className="bg-brand-success/8 border border-brand-success/25 rounded-xl p-3.5 mb-4 flex items-start gap-2.5">
              <Tag className="w-4 h-4 text-brand-success mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-brand-success">Prix de gros disponible</p>
                <p className="text-brand-muted text-xs mt-0.5">
                  Achetez {product.bulk_quantity}+ unités : {formatPrice(product.bulk_price)}/unité
                  <span className="ml-1 text-brand-success font-medium">({Math.round((1 - product.bulk_price / product.price) * 100)}% de remise)</span>
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mb-5">
              <h2 className="text-sm font-semibold mb-1.5">Description</h2>
              <p className="text-sm text-brand-muted leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Option selector */}
          <OptionSelector groups={optionGroups} selected={selected} onSelect={handleSelectOption} />

          {/* Selection required hint */}
          {missingSelection && (
            <p className="text-xs text-brand-warning mb-3 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Veuillez sélectionner une option dans chaque groupe
            </p>
          )}

          {/* Stock status */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold">Stock :</span>
            {!product.track_stock ? (
              <span className="badge bg-brand-info/15 text-brand-info">Disponible</span>
            ) : isOutOfStock ? (
              <span className="badge bg-brand-danger/15 text-brand-danger">Rupture de stock</span>
            ) : effectiveStock <= product.low_stock_threshold ? (
              <span className="badge bg-brand-warning/15 text-brand-warning flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-warning animate-pulse" />
                Faible ({effectiveStock})
              </span>
            ) : (
              <span className="badge bg-brand-success/15 text-brand-success">En stock ({effectiveStock})</span>
            )}
          </div>

          {/* Quantity picker */}
          {!isOutOfStock && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Quantité</label>
                <div className="flex items-center border border-brand-border rounded-xl w-fit overflow-hidden shadow-sm">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2.5 hover:bg-brand-surface active:bg-brand-border transition-colors duration-100">
                    <Minus className="w-4 h-4" />
                  </button>
                  <input type="number" value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(effectiveStock === Infinity ? 9999 : effectiveStock, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center font-bold border-x border-brand-border py-2 focus:outline-none bg-white" />
                  <button onClick={() => setQuantity(Math.min(effectiveStock === Infinity ? 9999 : effectiveStock, quantity + 1))}
                    className="p-2.5 hover:bg-brand-surface active:bg-brand-border transition-colors duration-100">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total box */}
              <div className={`rounded-xl p-3.5 mb-5 border transition-all duration-300 ${
                savings > 0 ? 'bg-brand-success/5 border-brand-success/25' : 'bg-brand-surface border-brand-border'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-brand-muted">Total</span>
                  <span className="text-xl font-bold text-brand-primary">{formatPrice(total)}</span>
                </div>
                {savings > 0 && (
                  <p className="text-xs text-brand-success font-medium mt-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" />Économie : {formatPrice(savings)}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleAdd}
              disabled={isOutOfStock || missingSelection}
              title={missingSelection ? 'Sélectionnez toutes les options' : undefined}
              className={`btn-primary flex-1 transition-all duration-200 ${added ? 'bg-brand-success hover:bg-brand-success' : ''}`}
            >
              {added
                ? <><CheckCircle2 className="w-4 h-4 animate-success-pop" />Ajouté au panier !</>
                : isOutOfStock
                  ? 'Indisponible'
                  : <><ShoppingCart className="w-4 h-4" />Ajouter au panier</>}
            </button>
            <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              <MessageCircle className="w-4 h-4" />WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
