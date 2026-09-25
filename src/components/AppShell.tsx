import { useState, ReactNode, useEffect, useRef } from 'react';
import {
  Store, ShoppingCart, Package, Menu, User, LogOut, LayoutDashboard,
  ScanBarcode, Boxes, ListOrdered, X, BarChart3, Settings, Warehouse,
  ShoppingBasket, CreditCard, ShieldCheck, Phone,
  Megaphone, TicketPercent, Radio, Search,
  Heart, MapPin, Mail, ChevronDown, CheckCircle2,
  Trash2, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart, getEffectivePrice } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useStoreSettings } from '../contexts/StoreSettingsContext';
import { formatPrice } from '../lib/format';
import { DEFAULT_CATEGORIES } from '../data/breweryCatalog';
import { SmartBreweryAssistant } from './SmartBreweryAssistant';
import type { View } from '../lib/views';

// ─── Social icon SVGs ────────────────────────────────────────────────────────

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function IconTiktok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z"/>
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

// ─── Component ───────────────────────────────────────────────────────────────

export function AppShell({ view, setView, children }: { view: View; setView: (v: View) => void; children: ReactNode }) {
  const { profile, user, signOut, canAccess } = useAuth();
  const { items, itemCount, subtotal, removeFromCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { settings } = useStoreSettings();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [headerCategory, setHeaderCategory] = useState('');

  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const categoriesMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cartDropdownRef.current && !cartDropdownRef.current.contains(event.target as Node)) {
        setCartPreviewOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (categoriesMenuRef.current && !categoriesMenuRef.current.contains(event.target as Node)) {
        setCategoriesMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isStaff = profile?.role === 'admin' || profile?.role === 'cashier' || profile?.role === 'employee';
  const isAdminView = view.kind.startsWith('admin-');

  const ALL_ADMIN_NAV = [
    { kind: 'admin-dashboard' as const,  icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
    { kind: 'admin-customers' as const,  icon: <Users className="w-4 h-4" />,           label: 'Suivi Clients' },
    { kind: 'admin-products' as const,   icon: <Boxes className="w-4 h-4" />,           label: 'Produits' },
    { kind: 'admin-stock' as const,      icon: <Warehouse className="w-4 h-4" />,        label: 'Stocks' },
    { kind: 'admin-purchases' as const,  icon: <ShoppingBasket className="w-4 h-4" />,   label: 'Appros' },
    { kind: 'admin-categories' as const, icon: <Package className="w-4 h-4" />,          label: 'Catégories' },
    { kind: 'admin-orders' as const,     icon: <ListOrdered className="w-4 h-4" />,      label: 'Commandes' },
    { kind: 'admin-payments' as const,   icon: <CreditCard className="w-4 h-4" />,       label: 'Paiements' },
    { kind: 'admin-reports' as const,    icon: <BarChart3 className="w-4 h-4" />,        label: 'Rapports' },
    { kind: 'admin-pos' as const,        icon: <ScanBarcode className="w-4 h-4" />,      label: 'POS' },
    { kind: 'admin-sections' as const,  icon: <ShieldCheck className="w-4 h-4" />,      label: 'Sections' },
    { kind: 'admin-banners' as const,   icon: <Megaphone className="w-4 h-4" />,         label: 'Bannières' },
    { kind: 'admin-promos' as const,        icon: <TicketPercent className="w-4 h-4" />,     label: 'Codes Promo' },
    { kind: 'admin-publications' as const,  icon: <Radio className="w-4 h-4" />,            label: 'Publications' },
    { kind: 'admin-settings' as const,      icon: <Settings className="w-4 h-4" />,          label: 'Paramètres' },
  ];

  const adminNav = ALL_ADMIN_NAV.filter((item) => canAccess(item.kind));
  const storeName = settings.store_name || 'SAFFO ONLINE';
  const phoneNumber = settings.phone_number || '+229 97 20 40 60';
  const whatsappNumber = settings.whatsapp_number || '+229 97 20 40 60';
  const cleanPhone = phoneNumber.replace(/\s+/g, '');
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');
  const year = new Date().getFullYear();

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setView({
      kind: 'shop',
      search: headerSearch.trim() || undefined,
      categoryId: headerCategory || undefined,
    });
  }

  function handleCategoryNav(catId: string) {
    setCategoriesMenuOpen(false);
    setMobileOpen(false);
    setView({ kind: 'shop', categoryId: catId });
  }

  const navCategories = [
    { id: 'cat-bieres', label: 'Bières & Casiers' },
    { id: 'cat-vins-champagnes', label: 'Vins & Champagnes' },
    { id: 'cat-spiritueux', label: 'Spiritueux' },
    { id: 'cat-softs-jus', label: 'Softs & Jus' },
    { id: 'cat-eaux-glace', label: 'Eaux & Glaçons' },
    { id: 'cat-packs-ceremonies', label: 'Packs Cérémonies' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#2B2D42] flex flex-col font-sans">

      {/* ── 1. ELECTRO TOP BAR (Dark #1E1F29) ──────────────────────────────── */}
      {!isAdminView && (
        <div className="bg-[#1E1F29] text-[#B9BABC] text-xs border-b border-white/5 py-2">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 flex flex-wrap items-center justify-between gap-y-2">
            
            {/* Left: Contact Info with red icons */}
            <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
              <a href={`tel:${cleanPhone}`} className="flex items-center gap-1.5 hover:text-white transition">
                <Phone className="w-3.5 h-3.5 text-[#D10024]" />
                <span className="font-medium">{phoneNumber}</span>
              </a>
              <a href="mailto:contact@saffoonline.bj" className="hidden md:flex items-center gap-1.5 hover:text-white transition">
                <Mail className="w-3.5 h-3.5 text-[#D10024]" />
                <span>contact@saffoonline.bj</span>
              </a>
              <div className="hidden sm:flex items-center gap-1.5 text-white/70">
                <MapPin className="w-3.5 h-3.5 text-[#D10024]" />
                <span>Akpakpa & Cotonou, Bénin</span>
              </div>
            </div>

            {/* Right: Currency & Account */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/90 bg-white/10 px-2 py-0.5 rounded text-[11px]">
                  FCFA (XOF)
                </span>
                <span className="text-white/80 text-[11px] font-medium hidden sm:inline">
                  Bénin 🇧🇯
                </span>
              </div>

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 text-white hover:text-[#D10024] transition font-medium"
                  >
                    <User className="w-3.5 h-3.5 text-[#D10024]" />
                    <span>{profile?.full_name?.split(' ')[0] || 'Mon Compte'}</span>
                    <ChevronDown className="w-3 h-3 text-white/60" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 py-1.5 z-50 animate-fade-in-scale">
                      <div className="px-3 py-1.5 border-b border-gray-100">
                        <p className="text-xs font-semibold text-gray-900 truncate">{profile?.full_name || 'Utilisateur'}</p>
                        <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => { setView({ kind: 'orders' }); setUserMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                      >
                        <Package className="w-3.5 h-3.5 text-gray-400" />
                        Mes commandes
                      </button>
                      {isStaff && (
                        <button
                          onClick={() => { setView({ kind: 'admin-dashboard' }); setUserMenuOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 text-[#D10024] font-medium"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Administration
                        </button>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setView({ kind: 'auth' })}
                  className="flex items-center gap-1.5 hover:text-white transition font-medium"
                >
                  <User className="w-3.5 h-3.5 text-[#D10024]" />
                  <span>Mon Compte</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. MAIN ELECTRO HEADER (Dark #15161D) ───────────────────────────── */}
      <header className="bg-[#15161D] text-white border-b border-[#2B2D42] sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="py-4 lg:py-5 flex items-center justify-between gap-4 sm:gap-6">
            
            {/* Logo: SAFFO.ONLINE */}
            <button
              onClick={() => setView({ kind: 'shop' })}
              className="flex flex-col items-start hover:opacity-95 transition flex-shrink-0 text-left"
            >
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                  SAFFO
                </span>
                <span className="text-[#D10024] text-3xl font-black leading-none">.</span>
                <span className="text-sm sm:text-base font-extrabold text-[#D10024] tracking-widest uppercase">
                  ONLINE
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#FFB300] -mt-0.5">
                Dépôt Brasserie & Boissons · Bénin
              </span>
            </button>

            {/* Admin navigation bar when in admin mode */}
            {isAdminView ? (
              <nav className="hidden md:flex items-center gap-1 text-xs overflow-x-auto">
                {adminNav.map((item) => (
                  <button
                    key={item.kind}
                    onClick={() => setView({ kind: item.kind })}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition ${
                      view.kind === item.kind ? 'bg-[#D10024] font-semibold text-white' : 'hover:bg-white/10 text-white/80'
                    }`}
                  >
                    {item.icon}{item.label}
                  </button>
                ))}
              </nav>
            ) : (
              /* Electro Centered Integrated Search Bar */
              <div className="hidden md:flex flex-1 max-w-xl mx-4">
                <form onSubmit={handleSearchSubmit} className="flex w-full">
                  <select
                    value={headerCategory}
                    onChange={(e) => setHeaderCategory(e.target.value)}
                    className="bg-white text-gray-800 text-xs font-semibold py-2.5 px-3 rounded-l-full border-r border-gray-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
                  >
                    <option value="">Tous les rayons</option>
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    placeholder="Rechercher une bière, vin, casier, Possotomé..."
                    className="flex-1 bg-white text-gray-900 placeholder-gray-400 text-xs px-4 py-2.5 focus:outline-none"
                  />

                  <button
                    type="submit"
                    className="bg-[#D10024] hover:bg-[#A8001D] text-white px-5 py-2.5 rounded-r-full font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Chercher</span>
                  </button>
                </form>
              </div>
            )}

            {/* Right Action Icons: Wishlist & Cart */}
            <div className="flex items-center gap-3 sm:gap-5">
              {!isAdminView && (
                <>
                  {/* WhatsApp Direct Order Button */}
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                      'Bonjour Saffo Online, je souhaite passer une commande de boissons au dépôt.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden xl:inline-flex items-center gap-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/40 px-3 py-1.5 rounded-full text-xs font-bold transition"
                  >
                    <IconWhatsapp className="w-4 h-4" />
                    <span>WhatsApp Express</span>
                  </a>

                  {/* Wishlist / Favoris Icon */}
                  <button
                    onClick={() => setView({ kind: 'shop' })}
                    title="Vos favoris"
                    className="flex flex-col items-center group relative text-center"
                  >
                    <div className="relative p-1">
                      <Heart className="w-5 h-5 text-white/90 group-hover:text-[#D10024] transition-colors" />
                      {wishlistCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 bg-[#D10024] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {wishlistCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-white/70 group-hover:text-white transition-colors hidden sm:block">
                      Favoris
                    </span>
                  </button>

                  {/* Cart Widget with Dropdown Preview */}
                  <div className="relative" ref={cartDropdownRef}>
                    <button
                      onClick={() => setCartPreviewOpen(!cartPreviewOpen)}
                      className="flex flex-col items-center group relative text-center"
                    >
                      <div className="relative p-1">
                        <ShoppingCart className="w-5 h-5 text-white/90 group-hover:text-[#D10024] transition-colors" />
                        {itemCount > 0 && (
                          <span className="absolute -top-1 -right-1.5 bg-[#D10024] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-badge-bounce">
                            {itemCount > 9 ? '9+' : itemCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-white/70 group-hover:text-white transition-colors hidden sm:block">
                        Mon Panier
                      </span>
                    </button>

                    {/* Cart preview popover */}
                    {cartPreviewOpen && (
                      <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-scale">
                        <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="w-4 h-4 text-[#D10024]" />
                            <span className="font-bold text-xs uppercase tracking-wider text-gray-900">
                              Votre Panier ({itemCount} {itemCount > 1 ? 'articles' : 'article'})
                            </span>
                          </div>
                          <button
                            onClick={() => setCartPreviewOpen(false)}
                            className="p-1 text-gray-400 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {items.length === 0 ? (
                          <div className="p-6 text-center">
                            <p className="text-sm font-medium text-gray-600 mb-1">Votre panier est vide</p>
                            <p className="text-xs text-gray-400 mb-4">Commandez vos bières, vins et softs au meilleur prix.</p>
                            <button
                              onClick={() => { setView({ kind: 'shop' }); setCartPreviewOpen(false); }}
                              className="btn-electro text-xs w-full"
                            >
                              Parcourir le catalogue
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-2">
                              {items.map((it) => {
                                const key = it.cartKey ?? it.product.id;
                                const itemPrice = getEffectivePrice(it.product, it.quantity, it.priceModifier ?? 0);
                                return (
                                  <div key={key} className="py-2.5 px-2 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition">
                                    <img
                                      src={it.product.image_url}
                                      alt={it.product.name}
                                      className="w-12 h-12 object-cover rounded border border-gray-100 flex-shrink-0"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/products/beninoise_65.jpg';
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-gray-900 truncate">
                                        {it.customTitle ?? it.product.name}
                                      </p>
                                      {it.packBreakdown && it.packBreakdown.length > 0 && (
                                        <p className="text-[10px] text-[#D10024] font-medium truncate mt-0.5">
                                          📦 Pack : {it.packBreakdown.map(b => `${b.quantity} ${b.name.split(' ')[0]}`).join(', ')}
                                        </p>
                                      )}
                                      {it.optionLabel && (
                                        <p className="text-[10px] text-gray-500 truncate">{it.optionLabel}</p>
                                      )}
                                      <div className="flex items-center justify-between text-xs mt-0.5">
                                        <span className="text-gray-500 font-medium">Qté: {it.quantity}</span>
                                        <span className="font-bold text-[#D10024]">
                                          {formatPrice(itemPrice * it.quantity)}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removeFromCart(key)}
                                      className="p-1 text-gray-400 hover:text-red-600 transition flex-shrink-0"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="p-3.5 bg-gray-50 border-t border-gray-200 space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-semibold text-gray-700">Sous-total :</span>
                                <span className="font-extrabold text-[#D10024] text-base">
                                  {formatPrice(subtotal)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => { setView({ kind: 'cart' }); setCartPreviewOpen(false); }}
                                  className="btn-electro-outline w-full text-[11px] py-2"
                                >
                                  Voir Panier
                                </button>
                                <button
                                  onClick={() => { setView({ kind: 'checkout' }); setCartPreviewOpen(false); }}
                                  className="btn-electro w-full text-[11px] py-2"
                                >
                                  Commander
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Mode Switch (Admin / Store) */}
              {isAdminView ? (
                <button
                  onClick={() => setView({ kind: 'shop' })}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#D10024] hover:bg-[#A8001D] text-white rounded-md transition"
                >
                  <Store className="w-3.5 h-3.5" />Boutique
                </button>
              ) : isStaff ? (
                <button
                  onClick={() => setView({ kind: 'admin-dashboard' })}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-md transition"
                >
                  <Settings className="w-3.5 h-3.5" />Espace Admin
                </button>
              ) : null}

              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 hover:bg-white/10 rounded-md transition"
                aria-label="Menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile search input */}
          {!isAdminView && (
            <div className="pb-3 md:hidden">
              <form onSubmit={handleSearchSubmit} className="flex w-full">
                <input
                  type="text"
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  placeholder="Rechercher une boisson..."
                  className="flex-1 bg-white text-gray-900 placeholder-gray-400 text-xs px-3.5 py-2 rounded-l-full focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-[#D10024] hover:bg-[#A8001D] text-white px-4 py-2 rounded-r-full font-bold text-xs uppercase"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── 3. ELECTRO NAVIGATION BAR (White #FFFFFF with Red Accent) ─────── */}
        {!isAdminView && (
          <div className="bg-white border-t border-[#E4E7ED] text-[#2B2D42] hidden md:block shadow-sm">
            <div className="max-w-7xl mx-auto px-4 lg:px-6">
              <div className="h-12 flex items-center justify-between">
                
                {/* Categories Dropdown Button */}
                <div className="relative" ref={categoriesMenuRef}>
                  <button
                    onClick={() => setCategoriesMenuOpen(!categoriesMenuOpen)}
                    className="bg-[#D10024] hover:bg-[#A8001D] text-white text-xs font-bold uppercase tracking-wider px-4 py-3 flex items-center gap-2 transition"
                  >
                    <Menu className="w-4 h-4" />
                    <span>Tous nos rayons</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </button>

                  {categoriesMenuOpen && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-50 animate-fade-in-scale">
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => handleCategoryNav(cat.id)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-gray-700 hover:text-[#D10024] hover:bg-gray-50 flex items-center justify-between transition"
                        >
                          <span>{cat.name}</span>
                          <span className="text-[10px] text-gray-400">→</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Main Nav Links (Electro style active underline) */}
                <nav className="flex items-center gap-1 lg:gap-3 text-xs font-bold uppercase tracking-wide">
                  <button
                    onClick={() => setView({ kind: 'shop' })}
                    className={`h-12 px-3 flex items-center border-b-2 transition ${
                      view.kind === 'shop' && !headerCategory
                        ? 'border-[#D10024] text-[#D10024]'
                        : 'border-transparent text-gray-700 hover:text-[#D10024] hover:border-[#D10024]'
                    }`}
                  >
                    Accueil
                  </button>

                  {navCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryNav(cat.id)}
                      className="h-12 px-2.5 lg:px-3 flex items-center border-b-2 border-transparent text-gray-700 hover:text-[#D10024] hover:border-[#D10024] transition whitespace-nowrap"
                    >
                      {cat.label}
                    </button>
                  ))}

                  <button
                    onClick={() => setView({ kind: 'shop' })}
                    className="h-12 px-3 flex items-center gap-1.5 border-b-2 border-transparent text-[#D10024] hover:border-[#D10024] transition font-black"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-[#D10024] animate-ping" />
                    Promos
                  </button>
                </nav>

                {/* Right Quick Info: Fast delivery */}
                <div className="hidden xl:flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#28A745]" />
                  <span>Livraison Cotonou & Calavi sous 2h</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── 4. MOBILE SLIDE-OVER DRAWER ───────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col animate-fade-in-scale">
            
            <div className="p-4 bg-[#15161D] text-white flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="font-black text-xl text-white">SAFFO</span>
                <span className="text-[#D10024] font-black text-xl">.ONLINE</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <nav className="flex-1 p-3 overflow-y-auto divide-y divide-gray-100">
              {isAdminView ? (
                <div className="space-y-1 py-2">
                  <p className="text-[11px] font-bold uppercase text-gray-400 px-3 pb-1">Modules Admin</p>
                  {adminNav.map((item) => (
                    <button
                      key={item.kind}
                      onClick={() => { setView({ kind: item.kind }); setMobileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <span className="text-[#D10024]">{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => { setView({ kind: 'shop' }); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#D10024] hover:bg-red-50 rounded-lg text-left mt-2"
                  >
                    <Store className="w-4 h-4" />Voir la boutique
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1 py-2">
                    <p className="text-[11px] font-bold uppercase text-gray-400 px-3 pb-1">Rayons Boissons</p>
                    <button
                      onClick={() => { setView({ kind: 'shop' }); setMobileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-900 hover:text-[#D10024] rounded-lg text-left"
                    >
                      <Store className="w-4 h-4 text-[#D10024]" />Toutes les Boissons
                    </button>
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryNav(cat.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 hover:text-[#D10024] hover:bg-gray-50 rounded-lg text-left"
                      >
                        <span>{cat.name}</span>
                        <span className="text-gray-400 text-[10px]">→</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1 py-3">
                    <p className="text-[11px] font-bold uppercase text-gray-400 px-3 pb-1">Espace Client</p>
                    <button
                      onClick={() => { setView({ kind: 'cart' }); setMobileOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <ShoppingCart className="w-4 h-4 text-gray-500" />
                        Mon Panier
                      </span>
                      <span className="bg-[#D10024] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {itemCount}
                      </span>
                    </button>

                    {user && (
                      <button
                        onClick={() => { setView({ kind: 'orders' }); setMobileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                      >
                        <Package className="w-4 h-4 text-gray-500" />Mes commandes
                      </button>
                    )}

                    {isStaff && (
                      <button
                        onClick={() => { setView({ kind: 'admin-dashboard' }); setMobileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#D10024] hover:bg-red-50 rounded-lg text-left"
                      >
                        <LayoutDashboard className="w-4 h-4" />Administration
                      </button>
                    )}
                  </div>

                  {/* Direct Contact */}
                  <div className="py-3 px-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase text-gray-400 pb-1">Assistance Dépôt</p>
                    <a
                      href={`tel:${cleanPhone}`}
                      className="flex items-center gap-2 text-xs font-semibold text-gray-800"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D10024]" />
                      {phoneNumber}
                    </a>
                    <a
                      href={`https://wa.me/${cleanWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-semibold text-[#25D366]"
                    >
                      <IconWhatsapp className="w-3.5 h-3.5 text-[#25D366]" />
                      Commander par WhatsApp
                    </a>
                  </div>
                </>
              )}
            </nav>

            {user && (
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. MAIN CONTENT ───────────────────────────────────────────────── */}
      <main className="flex-1 page-enter" key={view.kind}>
        {children}
      </main>

      {/* ── 6. ELECTRO FOOTER (Dark #15161D) ──────────────────────────────── */}
      <footer className="bg-[#15161D] text-white/70 border-t-4 border-[#D10024] mt-16">
        
        {/* Main 4-column footer */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-12 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-white/10">

            {/* Col 1: About SAFFO ONLINE */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white tracking-tight uppercase">SAFFO</span>
                <span className="text-[#D10024] text-2xl font-black">.</span>
                <span className="text-sm font-extrabold text-[#D10024] tracking-widest uppercase">ONLINE</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                Fournisseur & dépôt agréé de produits de brasserie au Bénin. Vente en gros, demi-gros et détail de bières, vins, spiritueux, sodas et eaux minérales pour bars, maquis et événements.
              </p>
              <div className="space-y-1.5 text-xs text-white/60 pt-1">
                <p className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#D10024] flex-shrink-0" />
                  <span>Akpakpa PK3, Boulevard Saint-Michel, Cotonou</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#D10024] flex-shrink-0" />
                  <span>{phoneNumber}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#D10024] flex-shrink-0" />
                  <span>contact@saffoonline.bj</span>
                </p>
              </div>
            </div>

            {/* Col 2: Nos Rayons */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-[#D10024]">
                Nos Rayons
              </p>
              <ul className="space-y-2 text-xs">
                {DEFAULT_CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => handleCategoryNav(cat.id)}
                      className="hover:text-[#D10024] hover:translate-x-1 transition-all inline-block"
                    >
                      {cat.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Services & Consignes au Bénin */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-[#D10024]">
                Services Dépôt
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <span className="text-white/80 font-medium">Échange de casiers vides</span>
                  <p className="text-[11px] text-white/40">Système officiel Sobebra</p>
                </li>
                <li>
                  <span className="text-white/80 font-medium">Tarifs Spécial Maquis & Bars</span>
                  <p className="text-[11px] text-white/40">Remises dégressives sur volume</p>
                </li>
                <li>
                  <span className="text-white/80 font-medium">Packs Cérémonies, Dots & Mariages</span>
                  <p className="text-[11px] text-white/40">Reprise des bouteilles non entamées</p>
                </li>
                <li>
                  <span className="text-white/80 font-medium">Livraison Glacée Express</span>
                  <p className="text-[11px] text-white/40">Cotonou, Calavi et environs en 2h</p>
                </li>
              </ul>
            </div>

            {/* Col 4: Espace Client & Réseaux */}
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white mb-4 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-8 after:h-0.5 after:bg-[#D10024]">
                Espace Client
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => setView({ kind: 'cart' })} className="hover:text-[#D10024] transition">
                    Mon Panier ({itemCount})
                  </button>
                </li>
                {user ? (
                  <li>
                    <button onClick={() => setView({ kind: 'orders' })} className="hover:text-[#D10024] transition">
                      Suivi de mes commandes
                    </button>
                  </li>
                ) : (
                  <li>
                    <button onClick={() => setView({ kind: 'auth' })} className="hover:text-[#D10024] transition">
                      Connexion / Créer un compte
                    </button>
                  </li>
                )}
                <li>
                  <button onClick={() => setView({ kind: 'legal' })} className="hover:text-[#D10024] transition">
                    Mentions Légales & IFU
                  </button>
                </li>
                <li>
                  <button onClick={() => setView({ kind: 'terms' })} className="hover:text-[#D10024] transition">
                    Conditions Générales de Vente
                  </button>
                </li>
              </ul>

              {/* Social networks */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2">
                  Suivez notre actualité
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${cleanWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#25D366] flex items-center justify-center transition-colors"
                    title="WhatsApp"
                  >
                    <IconWhatsapp className="w-4 h-4 text-white" />
                  </a>
                  <a
                    href="https://facebook.com/saffoonline"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-[#1877F2] flex items-center justify-center transition-colors"
                    title="Facebook"
                  >
                    <IconFacebook className="w-4 h-4 text-white" />
                  </a>
                  <a
                    href="https://tiktok.com/@saffoonline"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-black hover:ring-1 hover:ring-white/30 flex items-center justify-center transition-colors"
                    title="TikTok"
                  >
                    <IconTiktok className="w-4 h-4 text-white" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Payment methods accepted in Benin */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <div>
              © {year} <span className="text-white font-semibold">{storeName}</span>. Tous droits réservés · RCCM : RB/COT/21 B 29841 · IFU : 3202112489012.
            </div>

            {/* Payment methods badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-white/40 mr-1">Règlements sécurisés :</span>
              <span className="bg-[#FFCC00] text-black font-extrabold text-[10px] px-2 py-0.5 rounded shadow-sm">
                MTN MoMo
              </span>
              <span className="bg-[#005CA9] text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                Moov Money
              </span>
              <span className="bg-[#00838F] text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm">
                Celtiis Flooz
              </span>
              <span className="bg-white/10 text-white font-medium text-[10px] px-2 py-0.5 rounded">
                Espèces à la livraison
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Intelligent AI Brewery Assistant for Customer guidance, event calculations, bonus unlocks, and Admin co-piloting */}
      <SmartBreweryAssistant isAdmin={isAdminView} setView={setView} />
    </div>
  );
}
