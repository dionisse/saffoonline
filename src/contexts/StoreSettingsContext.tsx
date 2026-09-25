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
  store_name: 'SAFFO ONLINE',
  logo_url: null,
  company_name: 'SAFFO & FILS SARL — Dépôt Agréé de Brasserie Bénin',
  rccm: 'RB/COT/21 B 29841',
  ifu: '3202112489012',
  whatsapp_number: '+229 97 20 40 60',
  phone_number: '+229 97 20 40 60',
  facebook_url: 'https://facebook.com/saffoonline',
  tiktok_url: 'https://tiktok.com/@saffoonline',
  whatsapp_url: 'https://wa.me/22997204060',
  legal_mentions: 'SAFFO & FILS SARL — Dépôt grossiste & demi-gros de boissons et produits de brasserie au capital de 10 000 000 FCFA. Siège social : Boulevard Saint-Michel / Akpakpa, Cotonou, République du Bénin. IFU : 3202112489012. RCCM : RB/COT/21 B 29841.',
  terms_of_use: 'Conditions Générales : Consignes de casiers et emballages verre échangeables ou remboursables selon le barème officiel Sobebra. Livraison express à Cotonou, Akpakpa, Cadjèhoun, Abomey-Calavi et Porto-Novo. Règlements acceptés par MTN MoMo, Moov Money et espèces à la livraison.',
  hero_style: 'auto',
  whatsapp_notify_number: '+22997204060',
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
