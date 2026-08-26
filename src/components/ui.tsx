import { useState, useRef, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

// ─── LazyImage ────────────────────────────────────────────────────────────────
// Intersection-observer lazy loading with shimmer skeleton + fade-in

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}

export function LazyImage({ src, alt, className = '', fallback }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} className="relative block w-full h-full">
      {!loaded && !error && (
        <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-brand-border via-white to-brand-border bg-[length:200%_100%]" />
      )}
      {inView && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${className} transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {error && (fallback ?? <span className="absolute inset-0 flex items-center justify-center bg-brand-surface text-brand-muted text-xs">Image</span>)}
    </span>
  );
}

// ─── Ripple ───────────────────────────────────────────────────────────────────

export function useRipple() {
  const triggerRipple = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none;
      width:${size}px; height:${size}px; left:${x}px; top:${y}px;
      background:rgba(255,255,255,0.35);
      animation: ripple 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
    `;
    const prev = el.style.position;
    if (!prev || prev === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }, []);

  return triggerRipple;
}

// ─── PageWrapper ──────────────────────────────────────────────────────────────

export function PageWrapper({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`page-enter ${className}`}>
      {children}
    </div>
  );
}

// ─── StaggerItem ─────────────────────────────────────────────────────────────

export function StaggerItem({ children, index = 0, className = '' }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <div
      className={`animate-fade-in-up ${className}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {children}
    </div>
  );
}

// ─── AnimatedCounter ─────────────────────────────────────────────────────────

export function AnimatedCounter({ value, className = '' }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (value === display) return;
    setDisplay(value);
    setKey((k) => k + 1);
  }, [value]);

  return (
    <span key={key} className={`inline-block animate-count-up ${className}`}>
      {display}
    </span>
  );
}

// ─── Toast system ─────────────────────────────────────────────────────────────

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  leaving?: boolean;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem['type']) => void;
}

const ToastCtx = createContext<ToastContextValue>({ toast: () => {} });

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => x.id === id ? { ...x, leaving: true } : x));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 300);
    }, 2800);
  }, []);

  const icons = { success: <CheckCircle2 className="w-4 h-4" />, error: <AlertCircle className="w-4 h-4" />, info: <Info className="w-4 h-4" /> };
  const colors = { success: 'bg-brand-success', error: 'bg-brand-danger', info: 'bg-brand-primary' };

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-white text-sm font-medium select-none ${colors[t.type]} ${t.leaving ? 'animate-toast-out' : ''}`}
            style={!t.leaving ? { animation: 'toastIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both' } : {}}>
            {icons[t.type]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="aspect-square w-full skeleton" />
      <div className="p-2.5 space-y-1.5">
        <div className="skeleton h-3 w-4/5 rounded" />
        <div className="skeleton h-2.5 w-3/5 rounded" />
        <div className="skeleton h-6 w-full rounded mt-1" />
      </div>
    </div>
  );
}

// ─── SuccessCheck ─────────────────────────────────────────────────────────────

export function SuccessCheck({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 52 52" className={`animate-success-pop ${className}`} fill="none">
      <circle cx="26" cy="26" r="25" stroke="currentColor" strokeWidth="2" className="opacity-20" />
      <polyline points="14,27 22,35 38,18" stroke="currentColor" strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 50, strokeDashoffset: 0, animation: 'checkDraw 0.4s 0.15s ease both' }} />
    </svg>
  );
}
