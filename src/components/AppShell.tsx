import { useState, ReactNode, useEffect, useRef } from 'react';
import {
  Store, ShoppingCart, Package, Menu, User, LogOut, LayoutDashboard,
  ScanBarcode, Boxes, ListOrdered, X, BarChart3, Settings, Warehouse,
  ShoppingBasket, CreditCard, ShieldCheck, Phone, MessageCircle, ExternalLink,
  Scale, FileText, Megaphone, TicketPercent, Radio,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStoreSettings } from '../contexts/StoreSettingsContext';
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
  const { itemCount } = useCart();
  const { settings } = useStoreSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const prevCount = useRef(itemCount);
  const [badgeAnim, setBadgeAnim] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBadgeAnim(true);
      setTimeout(() => setBadgeAnim(false), 500);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  const isStaff = profile?.role === 'admin' || profile?.role === 'cashier' || profile?.role === 'employee';
  const isAdminView = view.kind.startsWith('admin-');

  const ALL_ADMIN_NAV = [
    { kind: 'admin-dashboard' as const,  icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
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
  const storeName = settings.store_name || 'BrasseriePro';
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Announcement bar (shop only) ──────────────────────────────────── */}
      {!isAdminView && (
        <div className="bg-brand-dark text-white text-xs py-2 text-center font-medium tracking-wide">
          {settings.phone_number
            ? `Commandez par téléphone : ${settings.phone_number} · Livraison dans tout le Bénin`
            : 'Livraison rapide à Cotonou & partout au Bénin · Paiement Mobile Money accepté'}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className={`bg-brand-primary text-white sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'shadow-lg shadow-odoo-dark/20' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            <button onClick={() => setView({ kind: 'shop' })} className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition flex-shrink-0">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt={storeName} className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Store className="w-6 h-6" />
              )}
              <span className="hidden sm:inline">{storeName}</span>
            </button>

            {isAdminView ? (
              <nav className="hidden md:flex items-center gap-1 text-sm overflow-x-auto">
                {adminNav.map((item) => (
                  <button key={item.kind} onClick={() => setView({ kind: item.kind })}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 whitespace-nowrap transition ${view.kind === item.kind ? 'bg-white/20 font-medium' : 'hover:bg-white/10'}`}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </nav>
            ) : (
              <nav className="hidden md:flex items-center gap-1 text-sm">
                <button onClick={() => setView({ kind: 'shop' })} className={`px-3 py-1.5 rounded-md transition ${view.kind === 'shop' ? 'bg-white/20 font-medium' : 'hover:bg-white/10'}`}>Boutique</button>
                {user && <button onClick={() => setView({ kind: 'orders' })} className={`px-3 py-1.5 rounded-md transition ${view.kind === 'orders' ? 'bg-white/20 font-medium' : 'hover:bg-white/10'}`}>Mes commandes</button>}
              </nav>
            )}

            <div className="flex items-center gap-2">
              {!isAdminView && (
                <button onClick={() => setView({ kind: 'cart' })} className="relative p-2 hover:bg-white/10 active:scale-90 rounded-md transition-all duration-150">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 bg-odoo-warning text-brand-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center transition-transform ${badgeAnim ? 'animate-badge-bounce' : ''}`}>
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </button>
              )}

              {isAdminView ? (
                <button onClick={() => setView({ kind: 'shop' })}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md transition">
                  <Store className="w-3.5 h-3.5" />Boutique
                </button>
              ) : isStaff ? (
                <button onClick={() => setView({ kind: 'admin-dashboard' })}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded-md transition">
                  <Settings className="w-3.5 h-3.5" />Admin
                </button>
              ) : null}

              {user ? (
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-md transition">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                      {(profile?.full_name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden lg:block text-sm max-w-24 truncate">{profile?.full_name || user.email?.split('@')[0]}</span>
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-brand-border z-40 text-brand-dark overflow-hidden">
                        <div className="p-3 border-b border-brand-border">
                          <p className="font-medium text-sm truncate">{profile?.full_name || 'Utilisateur'}</p>
                          <p className="text-xs text-brand-muted truncate">{user.email}</p>
                          <span className={`inline-block mt-1.5 badge capitalize ${profile?.role === 'admin' ? 'bg-brand-primary/15 text-odoo-primary' : profile?.role === 'cashier' ? 'bg-odoo-info/15 text-odoo-info' : profile?.role === 'employee' ? 'bg-odoo-success/15 text-odoo-success' : 'bg-odoo-muted/15 text-brand-muted'}`}>
                            {profile?.role || 'customer'}
                          </span>
                        </div>
                        <button onClick={() => { setView({ kind: 'orders' }); setUserMenuOpen(false); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-surface flex items-center gap-2">
                          <Package className="w-4 h-4 text-brand-muted" />Mes commandes
                        </button>
                        {isStaff && (
                          <button onClick={() => { setView({ kind: 'admin-dashboard' }); setUserMenuOpen(false); }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-surface flex items-center gap-2">
                            <Settings className="w-4 h-4 text-brand-muted" />Espace administrateur
                          </button>
                        )}
                        <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-brand-surface flex items-center gap-2 text-odoo-danger border-t border-brand-border">
                          <LogOut className="w-4 h-4" />Déconnexion
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setView({ kind: 'auth' })} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 rounded-md transition">
                  <User className="w-4 h-4" /><span className="hidden sm:inline">Connexion</span>
                </button>
              )}

              <button className="md:hidden p-2 hover:bg-white/10 rounded-md transition" onClick={() => setMobileOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="p-4 border-b border-brand-border flex items-center justify-between">
              <span className="font-semibold text-brand-dark">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-brand-surface rounded"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 p-2 overflow-auto">
              {isAdminView ? (
                <>
                  {adminNav.map((item) => (
                    <button key={item.kind} onClick={() => { setView({ kind: item.kind }); setMobileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-surface rounded-md text-left">
                      <span className="text-brand-muted">{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div className="my-2 border-t border-brand-border" />
                  <button onClick={() => { setView({ kind: 'shop' }); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-brand-dark hover:bg-brand-surface rounded-md text-left">
                    <span className="text-brand-muted"><Store className="w-4 h-4" /></span>Voir la boutique
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setView({ kind: 'shop' }); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-brand-dark hover:bg-brand-surface rounded-md text-left">
                    <span className="text-brand-muted"><Store className="w-4 h-4" /></span>Boutique
                  </button>
                  <button onClick={() => { setView({ kind: 'cart' }); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-brand-dark hover:bg-brand-surface rounded-md text-left">
                    <span className="text-brand-muted"><ShoppingCart className="w-4 h-4" /></span>Panier ({itemCount})
                  </button>
                  {user && (
                    <button onClick={() => { setView({ kind: 'orders' }); setMobileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-brand-dark hover:bg-brand-surface rounded-md text-left">
                      <span className="text-brand-muted"><Package className="w-4 h-4" /></span>Mes commandes
                    </button>
                  )}
                  <div className="my-2 border-t border-brand-border" />
                  {isStaff && (
                    <button onClick={() => { setView({ kind: 'admin-dashboard' }); setMobileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-brand-dark hover:bg-brand-surface rounded-md text-left">
                      <span className="text-brand-muted"><LayoutDashboard className="w-4 h-4" /></span>Espace Admin
                    </button>
                  )}
                </>
              )}
            </nav>
            {user && (
              <div className="p-3 border-t border-brand-border">
                <button onClick={() => { signOut(); setMobileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-odoo-danger hover:bg-brand-surface rounded-md">
                  <LogOut className="w-4 h-4" />Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 page-enter" key={view.kind}>{children}</main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-dark text-white/70 mt-12">
        {/* Main footer grid */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-10 pb-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-8 border-b border-white/10">

            {/* Col 1: Brand + legal info */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt={storeName} className="h-8 w-auto object-contain brightness-0 invert" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <Store className="w-5 h-5 text-white" />
                )}
                <span className="font-semibold text-white text-base">{storeName}</span>
              </div>
              {settings.company_name && (
                <p className="text-sm text-white/60 mb-1">{settings.company_name}</p>
              )}
              {settings.rccm && (
                <p className="text-xs text-white/50">RCCM : {settings.rccm}</p>
              )}
              {settings.ifu && (
                <p className="text-xs text-white/50">IFU : {settings.ifu}</p>
              )}
              {!settings.company_name && !settings.rccm && !settings.ifu && (
                <p className="text-xs text-white/40 italic">Informations légales à compléter</p>
              )}
            </div>

            {/* Col 2: Contact */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Contact</p>
              <div className="space-y-2">
                {settings.phone_number && (
                  <a href={`tel:${settings.phone_number}`}
                    className="flex items-center gap-2 text-sm hover:text-white transition">
                    <Phone className="w-4 h-4 flex-shrink-0 text-white/40" />
                    {settings.phone_number}
                  </a>
                )}
                {settings.whatsapp_number && (
                  <a href={`https://wa.me/${settings.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover:text-white transition">
                    <MessageCircle className="w-4 h-4 flex-shrink-0 text-white/40" />
                    WhatsApp : {settings.whatsapp_number}
                  </a>
                )}
                {!settings.phone_number && !settings.whatsapp_number && (
                  <p className="text-xs text-white/40 italic">Contact à compléter</p>
                )}
              </div>
            </div>

            {/* Col 3: Social media */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">Suivez-nous</p>
              <div className="flex items-center gap-2 flex-wrap">
                {settings.whatsapp_url && (
                  <a href={settings.whatsapp_url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#25D366] flex items-center justify-center transition-colors"
                    title="WhatsApp">
                    <IconWhatsapp className="w-4 h-4 text-white" />
                  </a>
                )}
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#1877F2] flex items-center justify-center transition-colors"
                    title="Facebook">
                    <IconFacebook className="w-4 h-4 text-white" />
                  </a>
                )}
                {settings.tiktok_url && (
                  <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#010101] hover:ring-1 hover:ring-white/20 flex items-center justify-center transition-colors"
                    title="TikTok">
                    <IconTiktok className="w-4 h-4 text-white" />
                  </a>
                )}
                {!settings.whatsapp_url && !settings.facebook_url && !settings.tiktok_url && (
                  <p className="text-xs text-white/40 italic">Réseaux sociaux à configurer</p>
                )}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <span>© {year} {settings.company_name || storeName}. Tous droits réservés.</span>
            <div className="flex items-center gap-4">
              <button onClick={() => setView({ kind: 'legal' })}
                className="hover:text-white transition flex items-center gap-1">
                <Scale className="w-3 h-3" />Mentions légales
              </button>
              <span className="text-white/20">·</span>
              <button onClick={() => setView({ kind: 'terms' })}
                className="hover:text-white transition flex items-center gap-1">
                <FileText className="w-3 h-3" />CGU
              </button>
              {isStaff && (
                <>
                  <span className="text-white/20">·</span>
                  <button onClick={() => setView({ kind: 'admin-dashboard' })}
                    className="hover:text-white transition flex items-center gap-1">
                    <Settings className="w-3 h-3" />Administration
                  </button>
                </>
              )}
              <span className="text-white/20">·</span>
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />PWA
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
