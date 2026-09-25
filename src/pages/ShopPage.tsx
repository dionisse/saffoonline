import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronLeft, ChevronRight,
  Clock, ArrowRight, Truck, ShieldCheck, ShoppingCart,
  X, Heart, Eye, Share2, Star,
  Sparkles, Check, Layers, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/format';
import { useStoreSettings } from '../contexts/StoreSettingsContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useToast } from '../components/ui';
import type { Banner, Category, Product, Publication } from '../lib/database.types';
import type { View } from '../lib/views';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_PRODUCTS,
  DEFAULT_BANNERS,
  DEFAULT_PUBLICATIONS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_PACK_BREAKDOWNS,
} from '../data/breweryCatalog';

// ─── Social icon SVGs ────────────────────────────────────────────────────────

function IconWhatsapp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// ─── DYNAMIC BREWERY CAROUSEL BANNER (Electro Aesthetic + Benin Context) ─────

function DynamicBreweryCarousel({ banners, onAction, whatsappNumber }: { banners: Banner[]; onAction: (catId: string | null) => void; whatsappNumber: string }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');

  // Progress timer for ultra-smooth dynamic carousel
  useEffect(() => {
    if (paused || banners.length <= 1) return;

    const interval = 50; // ms
    const totalDuration = 6000; // ms
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrent((c) => (c + 1) % banners.length);
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [paused, banners.length]);

  // Reset progress when current slide changes manually
  const goToSlide = (idx: number) => {
    setCurrent(idx);
    setProgress(0);
  };

  const nextSlide = () => {
    setCurrent((c) => (c + 1) % banners.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setCurrent((c) => (c === 0 ? banners.length - 1 : c - 1));
    setProgress(0);
  };

  if (!banners || banners.length === 0) return null;

  const b = banners[current];

  // Benin brewery custom highlights according to current slide
  const slideBadges = [
    'FOURNISSEUR AGRÉÉ SOBEBRA · BÉNIN',
    'MARIAGES · DOTS · CÉRÉMONIES AU BÉNIN',
    'RAFRAÎCHISSEMENTS & SOFT DRINKS BÉNINOIS',
    'ESPACE GROSSISTE · MAQUIS & BARS',
  ];

  const slideHighlights = [
    ['Consignes échangeables', 'Glace offerte dès 5 casiers', 'Livraison express Cotonou & Calavi en 2h'],
    ['Grandes cuvées fraîches', 'Reprise des bouteilles non entamées', 'Verres & flûtes sur demande'],
    ['Packs d’eau Possotomé 1.5L & 0.5L', 'Youki Cocktail & Pamplemousse', 'Stock permanent garanti'],
    ['Tarifs dégressifs sur volume', 'Factures normalisées avec IFU', 'Paiement MTN MoMo & Moov sécurisé'],
  ];

  const slidePrices = [
    'À partir de 6 400 FCFA le casier',
    'Remises par carton complet',
    'Dès 4 500 FCFA le casier',
    'Jusqu’à -15% sur volume',
  ];

  const currentBadge = slideBadges[current % slideBadges.length];
  const currentHighlights = slideHighlights[current % slideHighlights.length];
  const currentPrice = slidePrices[current % slidePrices.length];

  return (
    <div
      className="relative w-full overflow-hidden bg-[#15161D] text-white shadow-2xl rounded-2xl border border-[#2B2D42]"
      style={{ minHeight: '440px', height: 'clamp(440px, 62vh, 620px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background slide images with crossfade & zoom */}
      {banners.map((banner, i) => (
        <div
          key={banner.id || i}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            i === current ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          <img
            src={banner.image_url}
            alt={banner.title ?? 'Bannière Brasserie'}
            className="w-full h-full object-cover transition-transform duration-[7000ms] ease-out"
            style={{
              transform: i === current ? 'scale(1.05)' : 'scale(1)',
            }}
          />
          {/* Gradients overlay for maximum text readability and Electro vibe */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#15161D]/95 via-[#15161D]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#15161D]/80 via-transparent to-black/30" />
        </div>
      ))}

      {/* Slide Content Box */}
      <div className="absolute inset-0 z-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-14">
          <div className="max-w-2xl space-y-4">
            
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 bg-[#D10024] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>{currentBadge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md animate-fade-in-up">
              {b.title}
            </h1>

            {/* Subtitle description */}
            <p className="text-white/85 text-sm sm:text-base leading-relaxed line-clamp-3 animate-fade-in-up max-w-xl">
              {b.subtitle}
            </p>

            {/* Feature bullets in Benin context */}
            <div className="hidden sm:flex flex-wrap items-center gap-3 pt-1 text-xs text-white/90">
              {currentHighlights.map((hl, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
                  <Check className="w-3.5 h-3.5 text-[#28A745] flex-shrink-0" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>

            {/* Price Pill Highlight */}
            <div className="pt-2">
              <span className="inline-block bg-[#FFB300] text-black font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-full shadow-md">
                {currentPrice}
              </span>
            </div>

            {/* CTA Action Buttons */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onAction(b.cta_action)}
                className="btn-electro text-xs py-3 px-6 shadow-xl flex items-center gap-2 group hover:scale-105"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{b.cta_text || 'Commander en Gros'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                  `Bonjour Saffo Online, je suis intéressé par l'offre : ${b.title}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366] text-white border border-[#25D366] text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-full transition-all duration-200 shadow-lg backdrop-blur-sm"
              >
                <IconWhatsapp className="w-4 h-4 text-[#25D366] group-hover:text-white" />
                <span>Devis WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      </div>

      {/* Prev / Next navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Diapositive précédente"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-[#D10024] backdrop-blur-sm text-white border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={nextSlide}
            aria-label="Diapositive suivante"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-[#D10024] backdrop-blur-sm text-white border border-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Slide counter indicator top-right (e.g. 01 / 04) */}
          <div className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-white/90 border border-white/10 hidden sm:block">
            <span className="text-[#D10024]">0{current + 1}</span> / 0{banners.length}
          </div>

          {/* Bottom Thumbnails / Indicator Pills */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Aller au slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  i === current
                    ? 'w-8 h-2.5 bg-[#D10024] shadow-md'
                    : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          {/* Dynamic Progress Bar at very bottom of carousel */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30">
            <div
              className="h-full bg-[#D10024] transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── 3 ELECTRO COLLECTION PROMO TILES ────────────────────────────────────────

function ElectroCollectionTiles({ onSelect }: { onSelect: (catId: string) => void }) {
  const collections = [
    {
      id: 'cat-bieres',
      title: 'Bières & Casiers',
      subtitle: 'La Béninoise, Castel, Beaufort en casiers consignés',
      image: '/banners/promo_beers.jpg',
      cta: 'Commander maintenant',
      badge: 'PROMO CASIERS',
    },
    {
      id: 'cat-vins-champagnes',
      title: 'Vins & Champagnes',
      subtitle: 'Moët & Chandon, Bordeaux pour dots & cérémonies',
      image: '/banners/promo_wine.jpg',
      cta: 'Découvrir la cave',
      badge: 'RÉCEPTIONS BÉNIN',
    },
    {
      id: 'cat-softs-jus',
      title: 'Softs & Eau Pure',
      subtitle: 'Youki, World Cola, Packs Possotomé au prix dépôt',
      image: '/banners/promo_softs.jpg',
      cta: 'Faire le plein',
      badge: 'PRIX DÉPÔT',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-8">
      {collections.map((col) => (
        <div
          key={col.id}
          onClick={() => onSelect(col.id)}
          className="group relative h-56 sm:h-60 rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200"
        >
          {/* Background image */}
          <img
            src={col.image}
            alt={col.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Electro diagonal / gradient dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#15161D]/90 via-[#15161D]/50 to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#FFB300] mb-1">
              {col.badge}
            </span>
            <h3 className="text-xl font-black leading-tight text-white group-hover:text-[#FFB300] transition-colors">
              {col.title}
            </h3>
            <p className="text-xs text-white/80 line-clamp-1 mt-1 mb-3">
              {col.subtitle}
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider group-hover:text-[#D10024] group-hover:translate-x-1 transition-all">
              <span>{col.cta}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TRUST & VALUE BAR (Electro 4 Value Props for Benin) ─────────────────────

function TrustBar() {
  const features = [
    {
      icon: Truck,
      title: 'Livraison Express Glacée',
      desc: 'Cotonou, Calavi & environs livrés sous 2h',
    },
    {
      icon: Layers,
      title: 'Tarifs Direct Dépôt',
      desc: 'Prix de gros & demi-gros négociés brasserie',
    },
    {
      icon: ShieldCheck,
      title: 'Paiements Sécurisés Bénin',
      desc: 'MTN MoMo, Moov Money et Cash à la livraison',
    },
    {
      icon: RotateCcw,
      title: 'Gestion des Consignes',
      desc: 'Échange immédiat de vos casiers et bouteilles',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
      {features.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="bg-white border border-[#E4E7ED] rounded-xl p-4 flex items-center gap-3.5 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-[#D10024]" />
          </div>
          <div>
            <p className="font-bold text-sm text-[#2B2D42]">{title}</p>
            <p className="text-xs text-[#8D99AE]">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ELECTRO PRODUCT CARD ───────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onQuickView: (product: Product) => void;
  onAdd: (product: Product) => void;
}

function ElectroProductCard({ product, onView, onQuickView, onAdd }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const inWishlist = isInWishlist(product.id);

  const hasDiscount = product.bulk_quantity > 0 && product.bulk_price > 0;
  const isCrate = product.name.toLowerCase().includes('casier');

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}?prod=${product.id}`;
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Découvrez ${product.name} sur SAFFO ONLINE - Dépôt de Brasserie au Bénin`,
        url: shareUrl,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast('Lien du produit copié !', 'info');
      }).catch(() => {});
    }
  }

  function handleWishlistClick(e: React.MouseEvent) {
    e.stopPropagation();
    toggleWishlist(product.id);
    toast(
      inWishlist ? 'Retiré de vos favoris' : `${product.name} ajouté aux favoris`,
      'info'
    );
  }

  return (
    <div className="group relative bg-white border border-[#E4E7ED] hover:border-[#D10024] rounded-lg p-3 sm:p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xl">
      
      {/* Top Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1 items-start">
        {hasDiscount && (
          <span className="bg-[#D10024] text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm">
            PROMO
          </span>
        )}
        {isCrate && (
          <span className="bg-[#FFB300] text-black text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm">
            CASIER
          </span>
        )}
      </div>

      {/* Quick Action Icons in top-right */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleWishlistClick}
          title="Ajouter aux favoris"
          className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md border border-gray-100 transition ${
            inWishlist
              ? 'bg-[#D10024] text-white'
              : 'bg-white hover:bg-[#D10024] text-gray-700 hover:text-white'
          }`}
        >
          <Heart className="w-3.5 h-3.5" fill={inWishlist ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onQuickView(product); }}
          title="Aperçu rapide"
          className="w-7 h-7 rounded-full bg-white hover:bg-[#D10024] text-gray-700 hover:text-white flex items-center justify-center shadow-md border border-gray-100 transition"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleShare}
          title="Partager"
          className="w-7 h-7 rounded-full bg-white hover:bg-[#25D366] text-gray-700 hover:text-white flex items-center justify-center shadow-md border border-gray-100 transition"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Product Image */}
      <div
        onClick={onView}
        className="w-full h-44 sm:h-48 overflow-hidden rounded-md cursor-pointer flex items-center justify-center p-2 mb-3 bg-[#FAF8F4]/50"
      >
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/products/beninoise_65.jpg';
          }}
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 flex flex-col">
        {/* Category uppercase */}
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8D99AE] mb-1">
          {product.category_id === 'cat-bieres'
            ? 'BIÈRES & CASIERS'
            : product.category_id === 'cat-vins-champagnes'
            ? 'VINS & CHAMPAGNES'
            : product.category_id === 'cat-spiritueux'
            ? 'SPIRITUEUX'
            : product.category_id === 'cat-softs-jus'
            ? 'SOFTS & JUS'
            : product.category_id === 'cat-eaux-glace'
            ? 'EAUX & GLACE'
            : 'PACK CÉRÉMONIE'}
        </p>

        {/* Product Title */}
        <h4
          onClick={onView}
          className="text-xs sm:text-sm font-bold text-[#2B2D42] hover:text-[#D10024] cursor-pointer transition-colors leading-snug line-clamp-2 mb-2"
        >
          {product.name}
        </h4>

        {/* Star Rating */}
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3 h-3 text-[#FFB300] fill-[#FFB300]" />
          ))}
          <span className="text-[10px] text-gray-400 ml-1">(5.0)</span>
        </div>

        {/* Price block */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-black text-[#D10024]">
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">
                {formatPrice(Math.round(product.price * 1.12))}
              </span>
            )}
          </div>

          {/* Wholesale notice */}
          {hasDiscount && (
            <p className="text-[10px] text-[#28A745] font-semibold mt-0.5">
              Gros: {formatPrice(product.bulk_price)} dès {product.bulk_quantity} casiers
            </p>
          )}
        </div>
      </div>

      {/* Add To Cart Button (Electro Pill Style) */}
      <button
        onClick={() => onAdd(product)}
        className="mt-3.5 w-full btn-electro text-[11px] py-2 flex items-center justify-center gap-1.5"
      >
        <ShoppingCart className="w-3.5 h-3.5" />
        <span>Ajouter au panier</span>
      </button>
    </div>
  );
}

// ─── ELECTRO HOT DEAL THIS WEEK (Countdown Banner) ───────────────────────────

function HotDealBanner({ onSelectPack }: { onSelectPack: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 28, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return { days: 3, hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="relative rounded-2xl overflow-hidden my-12 bg-[#15161D] text-white shadow-2xl border border-[#2B2D42]">
      {/* Background with overlay */}
      <img
        src="/banners/hot_deal_brewery.jpg"
        alt="Hot Deal Brasserie"
        className="absolute inset-0 w-full h-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#15161D] via-[#15161D]/90 to-transparent" />

      <div className="relative z-10 px-6 sm:px-12 py-10 lg:py-14 max-w-4xl">
        {/* Deal Badge */}
        <div className="inline-flex items-center gap-2 bg-[#D10024] text-white text-xs font-black uppercase tracking-widest px-3.5 py-1 rounded-full mb-4">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>VENTE FLASH DU WEEK-END · BÉNIN</span>
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight mb-2">
          PACK FESTIVAL BRASSERIE & MAQUIS
        </h2>
        <p className="text-white/80 text-xs sm:text-sm max-w-xl mb-6 leading-relaxed">
          10 Casiers Béninoise 65cl + 3 Casiers Youki Cocktail + 2 Packs Possotomé + 2 Sacs de Glaçons 5kg offerts !
          Idéal pour vos fêtes familiales, baptêmes ou réassort de bar à Cotonou et Calavi.
        </p>

        {/* Countdown timer circles (Signature Electro style) */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Jours', val: timeLeft.days },
            { label: 'Heures', val: pad(timeLeft.hours) },
            { label: 'Mins', val: pad(timeLeft.minutes) },
            { label: 'Secs', val: pad(timeLeft.seconds) },
          ].map((item, idx) => (
            <div
              key={idx}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1E1F29]/90 border border-white/15 flex flex-col items-center justify-center shadow-lg"
            >
              <span className="text-lg sm:text-2xl font-black text-[#D10024] font-mono leading-none">
                {item.val}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/60 mt-0.5">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing + Action */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#FFB300]">
              89 000 FCFA
            </span>
            <span className="text-sm sm:text-base text-white/50 line-through">
              105 000 FCFA
            </span>
          </div>

          <button
            onClick={onSelectPack}
            className="btn-electro text-xs py-3 px-6 shadow-xl hover:scale-105"
          >
            Commander ce Pack Promo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ELECTRO TOP SELLING 3-COLUMN SHOWCASE ───────────────────────────────────

function TopSellingColumns({
  products,
  onView,
  onAdd,
}: {
  products: Product[];
  onView: (id: string) => void;
  onAdd: (product: Product) => void;
}) {
  const bieres = products.filter((p) => p.category_id === 'cat-bieres').slice(0, 3);
  const vins = products.filter((p) => p.category_id === 'cat-vins-champagnes').slice(0, 3);
  const softs = products.filter((p) => p.category_id === 'cat-softs-jus' || p.category_id === 'cat-eaux-glace').slice(0, 3);

  const columns = [
    { title: 'Top Bières & Casiers', list: bieres },
    { title: 'Top Vins & Champagnes', list: vins },
    { title: 'Top Softs & Eaux Minérales', list: softs },
  ];

  return (
    <div className="my-12">
      <div className="border-b-2 border-gray-200 pb-3 mb-6 flex items-center justify-between">
        <h3 className="text-xl font-black uppercase text-[#2B2D42] relative after:content-[''] after:absolute after:-bottom-3.5 after:left-0 after:w-16 after:h-0.5 after:bg-[#D10024]">
          Meilleures Ventes du Dépôt
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((col, idx) => (
          <div key={idx} className="bg-white border border-[#E4E7ED] rounded-xl p-4 shadow-sm">
            <h4 className="font-extrabold text-sm text-[#2B2D42] uppercase tracking-wide border-b border-gray-100 pb-2 mb-3">
              {col.title}
            </h4>
            <div className="space-y-3.5">
              {col.list.map((p) => (
                <div key={p.id} className="flex items-center gap-3 group">
                  <div
                    onClick={() => onView(p.id)}
                    className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-100 p-1 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/products/beninoise_65.jpg';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => onView(p.id)}
                      className="text-xs font-bold text-gray-800 hover:text-[#D10024] cursor-pointer truncate"
                    >
                      {p.name}
                    </p>
                    <div className="flex items-center gap-0.5 my-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-2.5 h-2.5 text-[#FFB300] fill-[#FFB300]" />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#D10024]">
                        {formatPrice(p.price)}
                      </span>
                      <button
                        onClick={() => onAdd(p)}
                        className="p-1 text-gray-400 hover:text-[#D10024] transition"
                        title="Ajouter au panier"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GUIDE CONSIGNES CASIERS & VENTE EN GROS (Bénin Context) ──────────────────

function ConsignesGuideSection({ whatsappNumber }: { whatsappNumber: string }) {
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');

  return (
    <div className="bg-white border border-[#E4E7ED] rounded-2xl p-6 sm:p-8 my-12 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#D10024] mb-2 block">
            Guide Pratique Dépôt au Bénin
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-[#2B2D42] leading-tight mb-3">
            Comment fonctionne le système des consignes de casiers ?
          </h3>
          <p className="text-xs sm:text-sm text-[#8D99AE] leading-relaxed mb-6">
            Pour vos maquis, bars ou réceptions à Cotonou et Calavi, nous appliquons le barème officiel des emballages consignés Sobebra. Deux options s'offrent à vous :
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-red-100 text-[#D10024] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Vous avez déjà des casiers vides (Échange direct)</p>
                <p className="text-xs text-gray-500">
                  À la livraison, notre chauffeur reprend vos casiers vides (12 ou 24 bouteilles) et décharge vos casiers pleins. Vous ne payez que le prix de la boisson.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-red-100 text-[#D10024] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Premier achat ou sans emballages vides</p>
                <p className="text-xs text-gray-500">
                  Une consigne officielle est facturée pour le casier et les bouteilles en verre. Elle vous est intégralement remboursée dès retour des emballages au dépôt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp Quote Card */}
        <div className="bg-[#15161D] text-white rounded-xl p-6 border border-[#2B2D42] shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center mx-auto">
            <IconWhatsapp className="w-6 h-6" />
          </div>
          <h4 className="text-xl font-bold">Besoin d'un devis pour un événement ?</h4>
          <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
            Mariage, dot, baptême, funérailles ou soirée maquis ? Écrivez-nous pour un chiffrage personnalisé avec estimation exacte du cubage et reprise des invendus.
          </p>
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              'Bonjour Saffo Online, je souhaite un devis gratuit pour mon événement (nombre d\'invités, date, lieu).'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-full transition shadow-lg"
          >
            <IconWhatsapp className="w-4 h-4" />
            <span>Demander un devis WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── TESTIMONIALS SECTION (Social proof in Benin) ───────────────────────────

function TestimonialsSection() {
  return (
    <div className="my-12">
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-[#D10024]">
          Confiance & Partenariats
        </span>
        <h3 className="text-2xl font-black text-[#2B2D42]">
          Ce que disent nos clients et gérants de maquis au Bénin
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEFAULT_TESTIMONIALS.map((t) => (
          <div
            key={t.id}
            className="bg-white border border-[#E4E7ED] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-[#FFB300] fill-[#FFB300]" />
                ))}
              </div>
              <p className="text-xs text-gray-600 italic leading-relaxed mb-4">
                « {t.comment} »
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <img
                src={t.avatar}
                alt={t.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div>
                <p className="text-xs font-bold text-gray-900">{t.name}</p>
                <p className="text-[11px] text-gray-500">{t.role}</p>
                <p className="text-[10px] text-[#D10024] font-medium">{t.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NEWSLETTER / ALERTE PROMO SECTION ──────────────────────────────────────

function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  }

  return (
    <div className="bg-[#15161D] text-white rounded-2xl p-6 sm:p-10 my-12 border border-[#2B2D42] text-center shadow-xl">
      <div className="max-w-xl mx-auto space-y-3">
        <div className="w-10 h-10 rounded-full bg-red-600/20 text-[#D10024] flex items-center justify-center mx-auto">
          <Sparkles className="w-5 h-5" />
        </div>
        <h3 className="text-xl sm:text-2xl font-black uppercase">
          Recevez nos Tarifs & Promotions Brasserie
        </h3>
        <p className="text-xs text-white/70">
          Soyez averti des arrivages de casiers frais de Béninoise, des remises week-end et des offres spéciales maquis à Cotonou.
        </p>

        {subscribed ? (
          <div className="p-3 bg-green-900/40 border border-green-500 text-green-300 text-xs rounded-lg font-medium">
            Merci ! Vous êtes bien inscrit aux alertes promo de SAFFO ONLINE.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto pt-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre adresse email..."
              className="flex-1 bg-white text-gray-900 placeholder-gray-400 text-xs px-4 py-3 rounded-full focus:outline-none"
              required
            />
            <button type="submit" className="btn-electro text-xs py-3 px-6 rounded-full flex-shrink-0">
              S'inscrire
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── QUICK VIEW MODAL (Interactive Preview) ──────────────────────────────────

function QuickViewModal({
  product,
  onClose,
  onAdd,
  onViewProduct,
  whatsappNumber,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, quantity: number) => void;
  onViewProduct: (id: string) => void;
  whatsappNumber: string;
}) {
  const [qty, setQty] = useState(1);
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');

  const hasBulk = product.bulk_quantity > 0 && product.bulk_price > 0;
  const isBulkActive = hasBulk && qty >= product.bulk_quantity;
  const currentUnitPrice = isBulkActive ? product.bulk_price : product.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in-scale">
      <div className="relative bg-white text-gray-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center h-64 border border-gray-100">
            <img
              src={product.image_url}
              alt={product.name}
              className="max-h-56 max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/products/beninoise_65.jpg';
              }}
            />
          </div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D10024] bg-red-50 px-2.5 py-0.5 rounded">
              SKU: {product.sku || 'BRASSERIE-BJ'}
            </span>

            <h3 className="text-lg font-black text-gray-900 leading-tight">
              {product.name}
            </h3>

            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-[#FFB300] fill-[#FFB300]" />
              ))}
              <span className="text-xs text-gray-400 ml-1">(Avis certifiés)</span>
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-[#D10024]">
                {formatPrice(currentUnitPrice)}
              </span>
              {hasBulk && !isBulkActive && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(Math.round(product.price * 1.1))}
                </span>
              )}
            </div>

            {hasBulk && (
              <div className="p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                <span className="font-bold">Tarif de gros :</span> {formatPrice(product.bulk_price)} l'unité dès {product.bulk_quantity} casiers commandés !
              </div>
            )}

            <p className="text-xs text-gray-600 leading-relaxed">
              {product.description}
            </p>

            {/* Pack Breakdown Preview if applicable */}
            {DEFAULT_PACK_BREAKDOWNS[product.id] && (
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5">
                <p className="text-[11px] font-black uppercase text-[#D10024] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB300]" />
                  <span>Composition du Pack Cérémonie Dot & Mariage :</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  {DEFAULT_PACK_BREAKDOWNS[product.id].map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 rounded border border-red-100">
                      <span>{it.icon}</span>
                      <span className="font-bold text-gray-900">{it.quantity} ×</span>
                      <span className="truncate text-gray-700">{it.name.split(' ')[0]} {it.name.split(' ')[1] || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector + Add to Cart */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-700">Quantité :</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 text-xs font-bold">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onAdd(product, qty);
                    onClose();
                  }}
                  className="btn-electro flex-1 text-xs py-2.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Ajouter ({formatPrice(currentUnitPrice * qty)})</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onViewProduct(product.id);
                  }}
                  className="btn-electro-outline text-xs px-4 py-2.5"
                >
                  Détails
                </button>
              </div>

              {/* WhatsApp direct info */}
              <a
                href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                  `Bonjour, je souhaite commander ${qty}x ${product.name}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-[#25D366] font-bold hover:underline pt-1"
              >
                <IconWhatsapp className="w-3.5 h-3.5" />
                <span>Poser une question sur WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN SHOP PAGE ─────────────────────────────────────────────────────────

interface ShopPageProps {
  setView: (v: View) => void;
  initialCategoryId?: string;
  initialSearch?: string;
}

export function ShopPage({ setView, initialCategoryId, initialSearch }: ShopPageProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { settings } = useStoreSettings();

  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [banners, setBanners] = useState<Banner[]>(DEFAULT_BANNERS);
  const [publications, setPublications] = useState<Publication[]>(DEFAULT_PUBLICATIONS);

  // Filters & State
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategoryId ?? null);
  const [search, setSearch] = useState(initialSearch ?? '');
  const [sortBy, setSortBy] = useState<'recent' | 'price-asc' | 'price-desc' | 'name'>('recent');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Sync initial props
  useEffect(() => {
    if (initialCategoryId !== undefined) setActiveCategory(initialCategoryId);
  }, [initialCategoryId]);

  useEffect(() => {
    if (initialSearch !== undefined) setSearch(initialSearch);
  }, [initialSearch]);

  // Load Supabase or fallback data
  useEffect(() => {
    let mounted = true;
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').eq('is_active', true).order('name', { ascending: true }),
      supabase.from('banners').select('*').eq('is_active', true).order('sort_order').order('created_at'),
      supabase.from('publications').select('*').eq('active', true).order('created_at', { ascending: false }).limit(6),
    ])
      .then(([cats, prods, bnrs, pubs]) => {
        if (!mounted) return;
        if (cats.data && cats.data.length > 0) setCategories(cats.data as Category[]);
        if (prods.data && prods.data.length > 0) setProducts(prods.data as Product[]);
        if (bnrs.data && bnrs.data.length > 0) setBanners(bnrs.data as Banner[]);
        if (pubs.data && pubs.data.length > 0) setPublications(pubs.data as Publication[]);
      })
      .catch(() => {
        if (!mounted) return;
      });

    return () => {
      mounted = false;
    };
  }, []);

  const whatsappNumber = settings.whatsapp_number || '+229 97 20 40 60';

  function handleBannerAction(catId: string | null) {
    if (!catId || catId === 'shop') {
      productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setActiveCategory(catId);
    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleAddToCart(product: Product, quantity = 1) {
    addToCart(product, quantity);
    toast(`${product.name} × ${quantity} ajouté au panier !`, 'success');
  }

  // Filtered Products
  const filtered = useMemo(() => {
    let list = [...products];

    if (activeCategory) {
      const childIds = categories.filter((c) => c.parent_id === activeCategory).map((c) => c.id);
      list = list.filter((p) => p.category_id === activeCategory || (p.category_id ? childIds.includes(p.category_id) : false));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, categories, activeCategory, search, sortBy]);

  const activeCategoryName = activeCategory
    ? categories.find((c) => c.id === activeCategory)?.name
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">

      {/* ── 1. DYNAMIC HERO CAROUSEL BANNER ───────────────────────────────── */}
      <section className="mb-6">
        <DynamicBreweryCarousel
          banners={banners}
          onAction={handleBannerAction}
          whatsappNumber={whatsappNumber}
        />
      </section>

      {/* ── 2. ELECTRO 3-COLUMN COLLECTION TILES ──────────────────────────── */}
      <section>
        <ElectroCollectionTiles onSelect={handleBannerAction} />
      </section>

      {/* ── 3. TRUST & VALUE BAR ──────────────────────────────────────────── */}
      <section>
        <TrustBar />
      </section>

      {/* ── 4. ELECTRO TABBED PRODUCTS SECTION ("NOUVEAUX ARRIVAGES") ──────── */}
      <section ref={productsSectionRef} className="my-10 scroll-mt-24">
        
        {/* Section Header with Electro Category Tabs */}
        <div className="border-b-2 border-gray-200 pb-2 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-[#2B2D42] relative after:content-[''] after:absolute after:-bottom-2.5 after:left-0 after:w-20 after:h-0.5 after:bg-[#D10024]">
              {activeCategoryName ? activeCategoryName : search ? `Recherche : "${search}"` : 'Nouveaux Arrivages'}
            </h2>
            <p className="text-xs text-[#8D99AE] mt-2">
              Bière, vin, champagne, softs et glaçons prêts pour livraison à Cotonou & Calavi.
            </p>
          </div>

          {/* Electro Category Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
            <button
              onClick={() => { setActiveCategory(null); setSearch(''); }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition whitespace-nowrap ${
                !activeCategory && !search
                  ? 'bg-[#D10024] text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:text-[#D10024] border border-gray-200'
              }`}
            >
              Tous
            </button>
            {categories.filter((c) => !c.parent_id).map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-[#D10024] text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:text-[#D10024] border border-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter controls & Count bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3 rounded-xl border border-gray-200">
          <div className="text-xs text-gray-500 font-medium">
            Affichage de <span className="font-bold text-[#D10024]">{filtered.length}</span> produit{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase">Trier :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'price-asc' | 'price-desc' | 'name')}
                className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
              >
              <option value="recent">Plus récents</option>
              <option value="price-asc">Prix : Croissant</option>
              <option value="price-desc">Prix : Décroissant</option>
              <option value="name">Nom : A - Z</option>
            </select>

            {(activeCategory || search) && (
              <button
                onClick={() => { setActiveCategory(null); setSearch(''); }}
                className="flex items-center gap-1 text-xs text-[#D10024] font-bold hover:underline ml-2"
              >
                <X className="w-3.5 h-3.5" />
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 p-8">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Aucune boisson trouvée</h3>
            <p className="text-xs text-gray-500 mb-4">
              Essayez un autre mot-clé ou parcourez nos rayons ci-dessus.
            </p>
            <button
              onClick={() => { setActiveCategory(null); setSearch(''); }}
              className="btn-electro text-xs"
            >
              Voir tout le catalogue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filtered.map((prod) => (
              <ElectroProductCard
                key={prod.id}
                product={prod}
                onView={() => setView({ kind: 'product', id: prod.id })}
                onQuickView={(p) => setQuickViewProduct(p)}
                onAdd={(p) => handleAddToCart(p, 1)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 5. ELECTRO "HOT DEAL THIS WEEK" COUNTDOWN BANNER ──────────────── */}
      <section>
        <HotDealBanner
          onSelectPack={() => {
            const packProd = products.find((p) => p.id === 'prod-pack-dot-mariage') || products[0];
            if (packProd) handleAddToCart(packProd, 1);
          }}
        />
      </section>

      {/* ── 6. ELECTRO TOP SELLING MICRO-COLUMNS ───────────────────────────── */}
      <section>
        <TopSellingColumns
          products={products}
          onView={(id) => setView({ kind: 'product', id })}
          onAdd={(p) => handleAddToCart(p, 1)}
        />
      </section>

      {/* ── 7. GUIDE DES CONSIGNES DE CASIERS & DEVIS BÉNIN ─────────────────── */}
      <section>
        <ConsignesGuideSection whatsappNumber={whatsappNumber} />
      </section>

      {/* ── 8. PUBLICATIONS & ACTUALITÉS BRASSERIE ─────────────────────────── */}
      {publications.length > 0 && (
        <section className="my-12">
          <div className="border-b-2 border-gray-200 pb-2 mb-6">
            <h3 className="text-xl font-black uppercase text-[#2B2D42] relative after:content-[''] after:absolute after:-bottom-2.5 after:left-0 after:w-16 after:h-0.5 after:bg-[#D10024]">
              Conseils & Actualités Brasserie
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="bg-white border border-[#E4E7ED] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                {pub.image_url && (
                  <img
                    src={pub.image_url}
                    alt={pub.title}
                    className="w-full h-44 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <h4 className="font-bold text-sm text-gray-900 mb-1.5 leading-snug">
                    {pub.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 mb-3">
                    {pub.content}
                  </p>
                  {pub.link_url && (
                    <a
                      href={pub.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-[#D10024] hover:underline"
                    >
                      En savoir plus <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 9. TÉMOIGNAGES CLIENTS & GÉRANTS DE MAQUIS ──────────────────────── */}
      <section>
        <TestimonialsSection />
      </section>

      {/* ── 10. NEWSLETTER & ALERTES ARRIVAGES ─────────────────────────────── */}
      <section>
        <NewsletterSection />
      </section>

      {/* ── 11. QUICK VIEW MODAL ───────────────────────────────────────────── */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAdd={handleAddToCart}
          onViewProduct={(id) => {
            setQuickViewProduct(null);
            setView({ kind: 'product', id });
          }}
          whatsappNumber={whatsappNumber}
        />
      )}
    </div>
  );
}
