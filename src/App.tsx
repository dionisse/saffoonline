import { useState } from 'react';
import { AppShell } from './components/AppShell';
import { ShopPage } from './pages/ShopPage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage, OrderDetailPage } from './pages/OrdersPage';
import { AuthPage } from './pages/AuthPage';
import { LegalPage } from './pages/LegalPage';
import { AdminSetupPage } from './pages/AdminSetupPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminPOS } from './pages/admin/AdminPOS';
import { AdminStock } from './pages/admin/AdminStock';
import { AdminPurchases } from './pages/admin/AdminPurchases';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminSections } from './pages/admin/AdminSections';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminBanners } from './pages/admin/AdminBanners';
import { AdminPromos } from './pages/admin/AdminPromos';
import { AdminPublications } from './pages/admin/AdminPublications';
import { useAuth } from './contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import type { AdminModule, View } from './lib/views';

function App() {
  const [view, setView] = useState<View>({ kind: 'shop' });
  const { loading, profile, canAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-surface">
        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
      </div>
    );
  }

  const isStrictAdminView = view.kind.startsWith('admin-') && view.kind !== 'admin-setup';
  const isStaff = profile?.role === 'admin' || profile?.role === 'cashier' || profile?.role === 'employee';

  if (isStrictAdminView && !isStaff) {
    return (
      <AppShell view={view} setView={setView}>
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <ShieldAlert className="w-12 h-12 text-brand-warning mx-auto mb-3" />
          <h1 className="text-xl font-semibold mb-2">Accès restreint</h1>
          <p className="text-brand-muted mb-4">Vous n'avez pas les droits pour accéder à cette section.</p>
          <button onClick={() => setView({ kind: 'admin-setup' })} className="btn-primary">
            Activer l'accès admin
          </button>
        </div>
      </AppShell>
    );
  }

  if (isStrictAdminView && isStaff && view.kind !== 'admin-dashboard') {
    const module = view.kind as AdminModule;
    if (!canAccess(module)) {
      return (
        <AppShell view={view} setView={setView}>
          <div className="max-w-md mx-auto px-4 py-16 text-center">
            <ShieldAlert className="w-12 h-12 text-brand-danger mx-auto mb-3" />
            <h1 className="text-xl font-semibold mb-2">Module non autorisé</h1>
            <p className="text-brand-muted mb-4">Votre section ne vous donne pas accès à ce module.</p>
            <button onClick={() => setView({ kind: 'admin-dashboard' })} className="btn-primary">
              Retour au dashboard
            </button>
          </div>
        </AppShell>
      );
    }
  }

  return (
    <AppShell view={view} setView={setView}>
      {view.kind === 'shop' && <ShopPage setView={setView} initialCategoryId={view.categoryId} initialSearch={view.search} />}
      {view.kind === 'product' && <ProductPage id={view.id} setView={setView} />}
      {view.kind === 'cart' && <CartPage setView={setView} />}
      {view.kind === 'checkout' && <CheckoutPage setView={setView} />}
      {view.kind === 'orders' && <OrdersPage setView={setView} />}
      {view.kind === 'order' && <OrderDetailPage id={view.id} setView={setView} />}
      {view.kind === 'auth' && <AuthPage setView={setView} />}
      {view.kind === 'legal' && <LegalPage kind="legal" setView={setView} />}
      {view.kind === 'terms' && <LegalPage kind="terms" setView={setView} />}
      {view.kind === 'admin-setup' && <AdminSetupPage setView={setView} />}
      {view.kind === 'admin-dashboard' && <AdminDashboard setView={setView} />}
      {view.kind === 'admin-products' && <AdminProducts />}
      {view.kind === 'admin-categories' && <AdminCategories />}
      {view.kind === 'admin-orders' && <AdminOrders />}
      {view.kind === 'admin-reports' && <AdminReports />}
      {view.kind === 'admin-pos' && <AdminPOS />}
      {view.kind === 'admin-stock' && <AdminStock />}
      {view.kind === 'admin-purchases' && <AdminPurchases />}
      {view.kind === 'admin-payments' && <AdminPayments />}
      {view.kind === 'admin-sections' && <AdminSections />}
      {view.kind === 'admin-settings' && <AdminSettings />}
      {view.kind === 'admin-banners' && <AdminBanners />}
      {view.kind === 'admin-promos' && <AdminPromos />}
      {view.kind === 'admin-publications' && <AdminPublications />}
    </AppShell>
  );
}

export default App;
