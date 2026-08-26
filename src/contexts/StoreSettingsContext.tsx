import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { StoreSettings } from '../lib/database.types';

interface StoreSettingsContextValue {
  settings: StoreSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const DEFAULTS: StoreSettings = {
  id: 1,
  store_name: 'BrasseriePro',
  logo_url: null,
  company_name: null,
  rccm: null,
  ifu: null,
  whatsapp_number: null,
  phone_number: null,
  facebook_url: null,
  tiktok_url: null,
  whatsapp_url: null,
  legal_mentions: null,
  terms_of_use: null,
  hero_style: 'auto',
  whatsapp_notify_number: null,
  callmebot_api_key: null,
  updated_at: '',
};

const StoreSettingsContext = createContext<StoreSettingsContextValue | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    setSettings(data ?? DEFAULTS);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <StoreSettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const ctx = useContext(StoreSettingsContext);
  if (!ctx) throw new Error('useStoreSettings must be used within StoreSettingsProvider');
  return ctx;
}
