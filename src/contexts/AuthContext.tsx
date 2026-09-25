import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, AdminModule } from '../lib/database.types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  allowedModules: AdminModule[] | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  canAccess: (module: AdminModule) => boolean;
  reloadProfile: () => Promise<void>;
  clearRecoveryMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allowedModules, setAllowedModules] = useState<AdminModule[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Check if URL indicates password recovery
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('reset=password')) {
        setIsPasswordRecovery(true);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      if (session?.user) {
        (async () => { await loadProfile(session.user.id); })();
      } else {
        setProfile(null);
        setAllowedModules(null);
        setLoading(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  async function loadProfile(userId: string) {
    // Step 1: Always fetch the base profile first (simple query, no joins)
    const { data: baseProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    let prof = baseProfile as Profile | null;

    // Step 1.5: If user logged in via OAuth (e.g. Google), auto-create customer profile if missing
    if (!prof) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        const metadata = user.user_metadata ?? {};
        const fullName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Client Saffo';
        const phone = metadata.phone || '';
        const newProf: Profile = {
          id: userId,
          full_name: fullName,
          phone,
          role: 'customer',
          section_id: null,
          employee_number: '',
          created_at: new Date().toISOString(),
        };
        await supabase.from('profiles').upsert(newProf);
        prof = newProf;
      }
    }

    setProfile(prof);

    if (!prof) {
      setAllowedModules([]);
      setLoading(false);
      return;
    }

    // Admins always have full access — no need to load section permissions
    if (prof.role === 'admin') {
      setAllowedModules(null);
      setLoading(false);
      return;
    }

    // Step 2: For non-admins with a section, load permissions separately
    if (prof.section_id) {
      const { data: permsData } = await supabase
        .from('section_permissions')
        .select('module')
        .eq('section_id', prof.section_id);

      if (permsData && permsData.length > 0) {
        setAllowedModules(permsData.map((p) => p.module as AdminModule));
      } else {
        setAllowedModules([]);
      }
    } else {
      // Staff without a section: no module access by default
      setAllowedModules([]);
    }

    setLoading(false);
  }

  async function reloadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadProfile(session.user.id);
  }

  function canAccess(module: AdminModule): boolean {
    if (allowedModules === null) return true; // admin
    return allowedModules.includes(module);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signInWithGoogle() {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}`
      : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName: string, phone: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').insert({ id: data.user.id, full_name: fullName, phone, role: 'customer' });
    }
    return { error: null };
  }

  async function resetPassword(email: string) {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/?reset=password`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setIsPasswordRecovery(false);
    return { error: error?.message ?? null };
  }

  function clearRecoveryMode() {
    setIsPasswordRecovery(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setAllowedModules(null);
    setIsPasswordRecovery(false);
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      allowedModules,
      loading,
      isPasswordRecovery,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      signOut,
      canAccess,
      reloadProfile,
      clearRecoveryMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
