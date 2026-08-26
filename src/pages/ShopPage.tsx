import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, Tag, Package2, Plus, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, Clock, ArrowRight, Flame, Sparkles,
  Truck, RotateCcw, ShieldCheck, Headphones, ShoppingCart, SlidersHorizontal,
  X, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice, parseImages } from '../lib/format';
import { useStoreSettings } from '../contexts/StoreSettingsContext';
import type { Banner, Category, Product, Promotion, Publication } from '../lib/database.types';
import { useCart } from '../contexts/CartContext';
import { LazyImage, SkeletonCard, StaggerItem, useRipple, useToast } from '../components/ui';
import type { View } from '../lib/views';

// ─── PublicationsSection ──────────────────────────────────────────────────────

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
function IconWhatsapp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
function IconTiktokShop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z"/>
    </svg>
  );
}

function PublicationsSection() {
  const [pubs, setPubs] = useState<Publication[]>([]);

  useEffect(() => {
    supabase.from('publications').select('*').eq('active', true).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => setPubs((data as Publication[]) ?? []));
  }, []);

  if (pubs.length === 0) return null;

  function shareToFacebook(pub: Publication) {
    const url = encodeURIComponent(pub.link_url || window.location.origin);
    const quote = encodeURIComponent(`${pub.title}\n\n${pub.content}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank', 'width=600,height=500');
  }
  function shareToWhatsApp(pub: Publication) {
    const lines = [`*${pub.title}*`, '', pub.content, '', pub.link_url || window.location.origin];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }
  async function shareToTikTok(pub: Publication) {
    const text = `${pub.title}\n\n${pub.content}\n\n${pub.link_url || window.location.origin}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    window.open('https://www.tiktok.com', '_blank');
  }

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-brand-primary uppercase mb-1">Nos actualités</p>
          <h2 className="text-2xl lg:text-3xl font-black text-brand-dark">Publications & Offres</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pubs.map((pub) => (
          <div key={pub.id} className="card flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            {pub.image_url && (
              <img src={pub.image_url} alt={pub.title} className="w-full h-44 object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            )}
            <div className="p-4 flex-1 flex flex-col">
              <p className="font-bold text-brand-dark leading-snug mb-1.5">{pub.title}</p>
              <p className="text-sm text-brand-muted leading-relaxed flex-1 line-clamp-3">{pub.content}</p>
              {pub.link_url && (
                <a href={pub.link_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mt-2 hover:underline">
                  En savoir plus <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="border-t border-brand-border bg-brand-surface px-3 py-2.5 flex items-center gap-1.5">
              <span className="text-xs text-brand-muted font-medium mr-1">Partager :</span>
              <button onClick={() => shareToFacebook(pub)}
                className="w-7 h-7 rounded-lg bg-[#1877F2] flex items-center justify-center hover:opacity-80 transition flex-shrink-0" title="Facebook">
                <IconFacebook className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={() => shareToWhatsApp(pub)}
                className="w-7 h-7 rounded-lg bg-[#25D366] flex items-center justify-center hover:opacity-80 transition flex-shrink-0" title="WhatsApp">
                <IconWhatsapp className="w-3.5 h-3.5 text-white" />
              </button>
              <button onClick={() => shareToTikTok(pub)}
                className="w-7 h-7 rounded-lg bg-[#010101] flex items-center justify-center hover:opacity-80 transition flex-shrink-0" title="TikTok">
                <IconTiktokShop className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    function calc() {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      setRemaining({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!remaining) return <span className="text-xs opacity-70">Expiré</span>;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1 text-xs font-bold">
      <Clock className="w-3 h-3 opacity-60 flex-shrink-0" />
      {remaining.d > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded">{remaining.d}j</span>}
      <span className="bg-white/20 px-1.5 py-0.5 rounded">{pad(remaining.h)}h</span>
      <span className="bg-white/20 px-1.5 py-0.5 rounded">{pad(remaining.m)}m</span>
      <span className="bg-white/20 px-1.5 py-0.5 rounded">{pad(remaining.s)}s</span>
    </div>
  );
}

// ─── Banner carousel ──────────────────────────────────────────────────────────

function BannerCarousel({ banners, onAction }: { banners: Banner[]; onAction: (a: string | null) => void }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const id = setInterval(() => setActive((i) => (i + 1) % banners.length), 5500);
    return () => clearInterval(id);
  }, [banners.length, paused]);

  if (banners.length === 0) return null;
  const b = banners[active];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(320px, 62vh, 680px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((banner, i) => (
        <div key={banner.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <img src={banner.image_url} alt={banner.title ?? ''} loading={i === 0 ? 'eager' : 'lazy'}
            className="absolute inset-0 w-full h-full object-cover scale-[1.02] transition-transform duration-[8000ms] ease-out"
            style={{ transform: i === active ? 'scale(1)' : 'scale(1.04)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>
      ))}

      <div className="absolute inset-0 z-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-12">
          {b.title && (
            <p className="text-white/70 text-sm font-medium tracking-widest uppercase mb-3 animate-fade-in-up">
              Collection
            </p>
          )}
          {b.title && (
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-none mb-4 animate-fade-in-up drop-shadow-lg"
              style={{ animationDelay: '60ms' }}>
              {b.title}
            </h2>
          )}
          {b.subtitle && (
            <p className="text-white/80 text-base lg:text-lg max-w-lg leading-relaxed mb-8 animate-fade-in-up"
              style={{ animationDelay: '120ms' }}>
              {b.subtitle}
            </p>
          )}
          {b.cta_text && (
            <button onClick={() => onAction(b.cta_action)}
              className="group inline-flex items-center gap-3 bg-white text-brand-dark font-bold px-7 py-3.5 rounded-full text-sm hover:bg-brand-primary hover:text-white transition-all duration-300 shadow-xl animate-fade-in-up"
              style={{ animationDelay: '180ms' }}>
              {b.cta_text}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => { setActive((i) => (i === 0 ? banners.length - 1 : i - 1)); setPaused(true); }}
            className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => { setActive((i) => (i + 1) % banners.length); setPaused(true); }}
            className="absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white border border-white/20 flex items-center justify-center transition-all hover:scale-110">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => { setActive(i); setPaused(true); }}
                className={`rounded-full transition-all duration-400 ${i === active ? 'bg-white w-8 h-2' : 'bg-white/40 w-2 h-2 hover:bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────

function TrustBar() {
  const features = [
    { icon: Truck,        title: 'Livraison Cotonou',   desc: 'Dans tout le Bénin' },
    { icon: RotateCcw,    title: 'Retours faciles',     desc: '7 jours pour changer' },
    { icon: ShieldCheck,  title: 'Paiement sécurisé',   desc: 'Mobile Money & espèces' },
    { icon: Headphones,   title: 'Assistance client',   desc: 'Réponse rapide' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-odoo-border border border-brand-border rounded-2xl overflow-hidden bg-white my-8 shadow-sm">
      {features.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex items-center gap-3 px-5 py-4">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-brand-dark">{title}</p>
            <p className="text-xs text-brand-muted">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({ categories, products, onSelect }: {
  categories: Category[];
  products: Product[];
  onSelect: (id: string) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-brand-primary uppercase mb-1">Parcourez</p>
          <h2 className="text-2xl lg:text-3xl font-black text-brand-dark">Nos gammes de boissons</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {categories.map((cat, i) => {
          const count = products.filter((p) => p.category_id === cat.id).length;
          return (
            <StaggerItem key={cat.id} index={i}>
              <button
                onClick={() => onSelect(cat.id)}
                className="group w-full relative overflow-hidden rounded-2xl bg-brand-surface aspect-[3/4] focus:outline-none"
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 flex items-center justify-center">
                    <Package2 className="w-10 h-10 text-brand-primary/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-colors duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                  <p className="font-bold text-white text-sm leading-tight drop-shadow">{cat.name}</p>
                  <p className="text-white/60 text-xs mt-0.5">{count} articles</p>
                </div>
              </button>
            </StaggerItem>
          );
        })}
      </div>
    </section>
  );
}

// ─── Promotion card ───────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, string> = {
  red:    'bg-red-500 text-white',
  orange: 'bg-orange-500 text-white',
  green:  'bg-emerald-500 text-white',
  blue:   'bg-blue-500 text-white',
  yellow: 'bg-yellow-400 text-yellow-900',
};

const CARD_GRADIENTS = [
  'from-rose-600 to-orange-500',
  'from-blue-700 to-cyan-500',
  'from-emerald-700 to-teal-500',
  'from-violet-700 to-fuchsia-500',
  'from-amber-600 to-yellow-500',
  'from-pink-700 to-rose-500',
];

function PromotionCard({ promo, index, onAction }: { promo: Promotion; index: number; onAction: (a: string | null) => void }) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const badgeStyle = BADGE_STYLES[promo.badge_color] ?? 'bg-red-500 text-white';

  return (
    <div
      className="relative flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 group cursor-pointer"
      style={{ height: '200px' }}
      onClick={() => onAction(promo.cta_action)}
    >
      {promo.image_url ? (
        <>
          <img src={promo.image_url} alt={promo.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20" />
        </>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {promo.badge_text && (
        <span className={`absolute top-4 left-4 z-10 ${badgeStyle} text-xs font-black px-3 py-1.5 rounded-full shadow-lg tracking-wide`}>
          {promo.badge_text}
        </span>
      )}

      <div className="absolute inset-0 z-10 p-5 flex flex-col justify-end">
        <p className="font-black text-white text-xl leading-tight drop-shadow-lg">{promo.title}</p>
        {promo.subtitle && <p className="text-white/75 text-xs mt-1">{promo.subtitle}</p>}
        {promo.ends_at && <div className="mt-2 text-white"><Countdown endsAt={promo.ends_at} /></div>}
        {promo.cta_text && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-white text-xs font-semibold">
            {promo.cta_text} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category product section (horizontal scroll row) ────────────────────────

function CategoryProductsSection({ category, products, onView, onAdd, onSeeAll }: {
  category: Category;
  products: Product[];
  onView: (id: string) => void;
  onAdd: (product: Product) => void;
  onSeeAll: () => void;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mb-14">
      {/* Section header */}
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-center gap-3">
          {category.image_url && (
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-brand-border">
              <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-black text-brand-dark leading-tight">{category.name}</h2>
            <p className="text-xs text-brand-muted">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs font-semibold text-brand-primary hover:text-brand-primary/80 transition group"
        >
          Voir tout
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:overflow-visible sm:pb-0">
          {products.slice(0, 6).map((product, i) => (
            <div key={product.id} className="flex-shrink-0 w-[155px] sm:w-auto">
              <StaggerItem index={i}>
                <ProductCard
                  product={product}
                  onView={() => onView(product.id)}
                  onAdd={() => onAdd(product)}
                />
              </StaggerItem>
            </div>
          ))}
          {/* "See all" card when there are more than 6 products */}
          {products.length > 6 && (
            <div className="flex-shrink-0 w-[155px] sm:w-auto">
              <button
                onClick={onSeeAll}
                className="w-full h-full min-h-[200px] rounded-xl border-2 border-dashed border-brand-border hover:border-brand-primary hover:bg-brand-primary/3 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 group-hover:bg-brand-primary/20 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-5 h-5 text-brand-primary" />
                </div>
                <span className="text-xs font-semibold text-brand-primary">
                  +{products.length - 6} autres
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

export function ProductCard({ product, onView, onAdd }: {
  product: Product;
  onView: () => void;
  onAdd: () => void;
}) {
  const isOutOfStock = product.track_stock && product.stock === 0;
  const isLowStock = product.track_stock && product.stock > 0 && product.stock <= product.low_stock_threshold;
  const isNew = Date.now() - new Date(product.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
  const hasBulk = product.bulk_quantity > 0 && product.bulk_price > 0;
  const [justAdded, setJustAdded] = useState(false);
  const { toast } = useToast();
  const ripple = useRipple();
  const firstImage = parseImages(product.image_url)[0] ?? null;

  function handleAdd(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (isOutOfStock) return;
    ripple(e);
    onAdd();
    setJustAdded(true);
    toast(`${product.name} ajouté au panier`, 'success');
    setTimeout(() => setJustAdded(false), 1800);
  }

  return (
    <div className="group bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 border border-transparent hover:border-brand-border">
      {/* Image zone */}
      <div className="relative overflow-hidden bg-brand-surface" style={{ aspectRatio: '1/1' }}>
        <button onClick={onView} className="block w-full h-full focus:outline-none">
          {firstImage ? (
            <img src={firstImage} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-border to-brand-surface">
              <Package2 className="w-10 h-10 text-brand-muted/40" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isNew && !isOutOfStock && (
              <span className="bg-brand-dark text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase">
                New
              </span>
            )}
            {hasBulk && (
              <span className="bg-brand-success text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                Lot
              </span>
            )}
          </div>

          {isLowStock && (
            <span className="absolute top-2 right-2 bg-odoo-warning text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              Stock: {product.stock}
            </span>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-brand-dark text-white text-xs font-bold px-4 py-2 rounded-full">Rupture de stock</span>
            </div>
          )}
        </button>

        {/* Quick-add overlay — slides up on hover */}
        {!isOutOfStock && (
          <button
            onClick={handleAdd}
            className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 py-2.5 font-semibold text-xs
              transition-all duration-300 ease-out
              translate-y-full group-hover:translate-y-0
              ${justAdded
                ? 'bg-brand-success text-white'
                : 'bg-brand-dark text-white hover:bg-brand-primary'
              }`}
          >
            {justAdded
              ? <><CheckCircle2 className="w-3.5 h-3.5" />Ajouté !</>
              : <><ShoppingCart className="w-3.5 h-3.5" />Ajouter</>}
          </button>
        )}
      </div>

      {/* Text zone */}
      <button onClick={onView} className="w-full text-left p-2.5 focus:outline-none">
        <h3 className="font-semibold text-xs text-brand-dark line-clamp-2 leading-snug mb-1 group-hover:text-brand-primary transition-colors duration-200">
          {product.name}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-brand-primary">{formatPrice(product.price)}</span>
          {hasBulk && (
            <span className="text-[11px] text-brand-muted line-through">{formatPrice(product.price)}</span>
          )}
        </div>
        {hasBulk && (
          <p className="text-[11px] text-odoo-success font-semibold mt-0.5">
            Lot: {formatPrice(product.bulk_price)} / unité
          </p>
        )}
      </button>
    </div>
  );
}

// ─── Shop page ────────────────────────────────────────────────────────────────

export function ShopPage({ setView }: { setView: (v: View) => void }) {
  const { settings } = useStoreSettings();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc' | 'name'>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const { addToCart } = useCart();
  const productsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true }),
      supabase.from('banners').select('*').eq('is_active', true).order('sort_order').order('created_at'),
      supabase.from('promotions').select('*').eq('is_active', true)
        .or('ends_at.is.null,ends_at.gt.' + new Date().toISOString())
        .order('sort_order').order('created_at'),
    ]).then(([cats, prods, bnrs, promos]) => {
      if (!mounted) return;
      setCategories((cats.data as Category[]) ?? []);
      setProducts((prods.data as Product[]) ?? []);
      setBanners((bnrs.data as Banner[]) ?? []);
      setPromotions((promos.data as Promotion[]) ?? []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  function handleCTA(action: string | null) {
    if (!action || action === 'shop') {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (action.startsWith('http')) {
      window.open(action, '_blank', 'noopener,noreferrer');
    } else {
      setActiveCategory(action);
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const filtered = useMemo(() => {
    let list = [...products];
    if (activeSubcategory) {
      list = list.filter((p) => p.category_id === activeSubcategory);
    } else if (activeCategory) {
      const childIds = categories.filter((c) => c.parent_id === activeCategory).map((c) => c.id);
      list = list.filter((p) => p.category_id === activeCategory || childIds.includes(p.category_id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, categories, activeCategory, activeSubcategory, search, sortBy]);

  const activeCategoryName = activeCategory
    ? categories.find((c) => c.id === activeCategory)?.name
    : null;
  const activeSubcategoryName = activeSubcategory
    ? categories.find((c) => c.id === activeSubcategory)?.name
    : null;
  const subcategories = activeCategory
    ? categories.filter((c) => c.parent_id === activeCategory)
    : [];

  return (
    <div className="page-enter bg-white min-h-screen">

      {/* ── Banner ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="w-full bg-gradient-to-r from-brand-border/40 to-brand-border/20 animate-pulse"
          style={{ height: 'clamp(320px, 62vh, 680px)' }} />
      ) : banners.length > 0 ? (
        <BannerCarousel banners={banners} onAction={handleCTA} />
      ) : settings.hero_style === 'none' ? (
        /* No hero — minimal mode */
        null
      ) : (
        /* Fallback hero */
        <div className="relative overflow-hidden bg-brand-dark" style={{ height: 'clamp(320px, 62vh, 680px)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary via-brand-dark to-black opacity-90" />
          <div className="absolute top-0 right-0 w-96 h-96 -mr-32 -mt-32 rounded-full bg-brand-accent/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 -ml-16 -mb-16 rounded-full bg-brand-accent/10 blur-2xl" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto w-full px-6 lg:px-12">
              <p className="text-brand-accent text-xs font-bold tracking-widest uppercase mb-4">Grossiste en boissons · Bénin</p>
              <h1 className="text-5xl lg:text-7xl font-black text-white leading-none mb-6">
                Boissons fraîches<br /><span className="text-brand-accent">en gros & au détail.</span>
              </h1>
              <p className="text-white/60 text-lg max-w-md leading-relaxed mb-8">
                Bières, sodas, jus et eaux — prix dégressifs par carton, livraison rapide sur Cotonou et tout le Bénin.
              </p>
              <button onClick={() => productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="group inline-flex items-center gap-3 bg-brand-accent text-brand-dark font-bold px-8 py-4 rounded-full hover:bg-brand-accent-dark transition-all duration-300 shadow-accent text-sm">
                Voir le catalogue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6">

        {/* Trust bar */}
        <TrustBar />

        {/* Publications */}
        {!activeCategory && !search && <PublicationsSection />}

        {/* Categories */}
        {!activeCategory && !search && (
          <CategorySection categories={categories} products={products} onSelect={(id) => {
            setActiveCategory(id);
            productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }} />
        )}

        {/* Promotions */}
        {promotions.length > 0 && !activeCategory && !search && (
          <section className="mb-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-semibold tracking-widest text-brand-accent uppercase mb-1">Disponible maintenant</p>
                <h2 className="text-2xl lg:text-3xl font-black text-brand-dark flex items-center gap-2">
                  <Flame className="w-7 h-7 text-brand-accent" />
                  Promos du moment
                </h2>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {promotions.map((promo, i) => (
                <PromotionCard key={promo.id} promo={promo} index={i} onAction={handleCTA} />
              ))}
            </div>
          </section>
        )}

        {/* Products section */}
        <section ref={productsSectionRef} className="pb-16">

          {/* Section heading */}
          <div className="flex items-end justify-between mb-6">
            <div>
              {activeSubcategoryName ? (
                <>
                  <p className="text-xs font-semibold tracking-widest text-brand-primary uppercase mb-1">{activeCategoryName}</p>
                  <h2 className="text-2xl lg:text-3xl font-black text-brand-dark">{activeSubcategoryName}</h2>
                </>
              ) : activeCategoryName ? (
                <>
                  <p className="text-xs font-semibold tracking-widest text-brand-primary uppercase mb-1">Catégorie</p>
                  <h2 className="text-2xl lg:text-3xl font-black text-brand-dark">{activeCategoryName}</h2>
                </>
              ) : search ? (
                <>
                  <p className="text-xs font-semibold tracking-widest text-brand-muted uppercase mb-1">Résultats</p>
                  <h2 className="text-2xl lg:text-3xl font-black text-brand-dark">"{search}"</h2>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold tracking-widest text-brand-primary uppercase mb-1">Catalogue</p>
                  <h2 className="text-2xl lg:text-3xl font-black text-brand-dark">Tous les produits</h2>
                </>
              )}
            </div>
            {(activeCategoryName || search) && (
              <button
                onClick={() => { setActiveCategory(null); setActiveSubcategory(null); setSearch(''); }}
                className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-odoo-danger transition-colors">
                <X className="w-4 h-4" />Effacer
              </button>
            )}
          </div>

          {/* Subcategory chips */}
          {subcategories.length > 0 && !activeSubcategory && (
            <div className="flex flex-wrap gap-2 mb-5">
              {subcategories.map((sub) => {
                const count = products.filter((p) => p.category_id === sub.id).length;
                return (
                  <button key={sub.id} onClick={() => setActiveSubcategory(sub.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-brand-border hover:border-brand-primary hover:text-brand-primary transition">
                    {sub.name} <span className="text-brand-muted">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
          {activeSubcategory && (
            <button onClick={() => setActiveSubcategory(null)} className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-primary transition mb-5">
              <ArrowLeft className="w-4 h-4" />Toutes les sous-catégories
            </button>
          )}

          {/* Search + filter bar */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une boisson..."
                className="w-full pl-11 pr-4 py-3 border border-brand-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-odoo-primary/30 focus:border-odoo-primary transition bg-white shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition shadow-sm ${
                showFilters ? 'bg-brand-primary text-white border-odoo-primary' : 'bg-white border-brand-border hover:border-odoo-primary text-brand-dark'
              }`}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtres</span>
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mb-6 p-4 bg-brand-surface rounded-xl border border-brand-border animate-fade-in-up">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-brand-muted uppercase tracking-wide">Trier :</span>
                {(['recent', 'price-asc', 'price-desc', 'name'] as const).map((s) => (
                  <button key={s} onClick={() => setSortBy(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${sortBy === s ? 'bg-brand-primary text-white' : 'bg-white border border-brand-border hover:border-odoo-primary'}`}>
                    {{ recent: 'Récents', 'price-asc': 'Prix ↑', 'price-desc': 'Prix ↓', name: 'A-Z' }[s]}
                  </button>
                ))}
              </div>
              {/* Category filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-brand-muted uppercase tracking-wide">Rayon :</span>
                <button onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${!activeCategory ? 'bg-brand-primary text-white' : 'bg-white border border-brand-border hover:border-odoo-primary'}`}>
                  Tout
                </button>
                {categories.filter((c) => !c.parent_id).map((cat) => (
                  <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setActiveSubcategory(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeCategory === cat.id ? 'bg-brand-primary text-white' : 'bg-white border border-brand-border hover:border-odoo-primary'}`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result count — only when filtering */}
          {!loading && (activeCategory || search) && (
            <p className="text-sm text-brand-muted mb-4">
              <span className="font-bold text-brand-dark">{filtered.length}</span> produit{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* ── Unfiltered: products split by category ─────────────────────── */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : !activeCategory && !search ? (
            (() => {
              const rootCats = categories.filter((c) => !c.parent_id);
              const allChildIds = new Set(categories.filter((c) => c.parent_id).map((c) => c.id));
              const sectionsToShow = rootCats
                .map((cat) => {
                  const childIds = categories.filter((c) => c.parent_id === cat.id).map((c) => c.id);
                  const catProducts = filtered.filter(
                    (p) => p.category_id === cat.id || childIds.includes(p.category_id ?? ''),
                  );
                  return { cat, catProducts };
                })
                .filter(({ catProducts }) => catProducts.length > 0);
              // Products not assigned to any root category
              const uncategorised = filtered.filter(
                (p) => !p.category_id || allChildIds.has(p.category_id)
                  ? false
                  : !rootCats.some((rc) => {
                      const childIds = categories.filter((c) => c.parent_id === rc.id).map((c) => c.id);
                      return p.category_id === rc.id || childIds.includes(p.category_id ?? '');
                    }),
              );
              return (
                <>
                  {sectionsToShow.map(({ cat, catProducts }) => (
                    <CategoryProductsSection
                      key={cat.id}
                      category={cat}
                      products={catProducts}
                      onView={(id) => setView({ kind: 'product', id })}
                      onAdd={(product) => addToCart(product)}
                      onSeeAll={() => { setActiveCategory(cat.id); setActiveSubcategory(null); productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
                    />
                  ))}
                  {uncategorised.length > 0 && (
                    <section className="mb-14">
                      <div className="flex items-end justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-black text-brand-dark">Autres produits</h2>
                          <p className="text-xs text-brand-muted">{uncategorised.length} produit{uncategorised.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {uncategorised.map((product, i) => (
                          <StaggerItem key={product.id} index={i % 8}>
                            <ProductCard
                              product={product}
                              onView={() => setView({ kind: 'product', id: product.id })}
                              onAdd={() => addToCart(product)}
                            />
                          </StaggerItem>
                        ))}
                      </div>
                    </section>
                  )}
                  {sectionsToShow.length === 0 && uncategorised.length === 0 && (
                    <div className="text-center py-24">
                      <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-5">
                        <AlertCircle className="w-9 h-9 text-brand-muted" />
                      </div>
                      <p className="text-lg font-bold mb-2">Catalogue vide</p>
                      <p className="text-sm text-brand-muted">Aucune boisson disponible pour le moment</p>
                    </div>
                  )}
                </>
              );
            })()
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 animate-fade-in-scale">
              <div className="w-20 h-20 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircle className="w-9 h-9 text-brand-muted" />
              </div>
              <p className="text-lg font-bold mb-2">Aucun résultat</p>
              <p className="text-sm text-brand-muted">Essayez d'autres termes ou explorez toutes les catégories</p>
              <button onClick={() => { setActiveCategory(null); setSearch(''); }}
                className="mt-6 inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-full font-medium text-sm hover:bg-brand-primary-dark transition">
                Voir tout le catalogue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((product, i) => (
                <StaggerItem key={product.id} index={i % 8}>
                  <ProductCard
                    product={product}
                    onView={() => setView({ kind: 'product', id: product.id })}
                    onAdd={() => addToCart(product)}
                  />
                </StaggerItem>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
