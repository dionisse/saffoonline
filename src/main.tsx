import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { StoreSettingsProvider } from './contexts/StoreSettingsContext';
import { ToastProvider } from './components/ui';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <StoreSettingsProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </StoreSettingsProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </StrictMode>
);
