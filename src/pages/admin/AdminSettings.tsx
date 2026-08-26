import { useState, useEffect } from 'react';
import {
  Save, Loader2, Store, Building2, Phone, Globe,
  Image, FileText, CheckCircle2, AlertCircle, Palette, Bell, ExternalLink, Eye, EyeOff,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStoreSettings } from '../../contexts/StoreSettingsContext';
import type { StoreSettings } from '../../lib/database.types';

type FormData = Omit<StoreSettings, 'id' | 'updated_at'>;

const EMPTY: FormData = {
  store_name: '',
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
};

function val(v: string | null | undefined): string {
  return v ?? '';
}

export function AdminSettings() {
  const { settings, refresh } = useStoreSettings();
  const [form, setForm] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setForm({
      store_name: settings.store_name,
      logo_url: settings.logo_url,
      company_name: settings.company_name,
      rccm: settings.rccm,
      ifu: settings.ifu,
      whatsapp_number: settings.whatsapp_number,
      phone_number: settings.phone_number,
      facebook_url: settings.facebook_url,
      tiktok_url: settings.tiktok_url,
      whatsapp_url: settings.whatsapp_url,
      legal_mentions: settings.legal_mentions,
      terms_of_use: settings.terms_of_use,
      whatsapp_notify_number: settings.whatsapp_notify_number,
      callmebot_api_key: settings.callmebot_api_key,
      hero_style: settings.hero_style ?? 'auto',
    });
  }, [settings]);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value || null }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus('idle');

    const payload = {
      ...form,
      store_name: form.store_name || 'BrasseriePro',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('store_settings')
      .update(payload)
      .eq('id', 1);

    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      await refresh();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-dark">Paramètres de la boutique</h1>
          <p className="text-sm text-brand-muted mt-0.5">Personnalisez l'identité et les informations de votre boutique</p>
        </div>
        {status === 'success' && (
          <div className="flex items-center gap-1.5 text-sm text-brand-success font-medium">
            <CheckCircle2 className="w-4 h-4" />Enregistré
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-1.5 text-sm text-brand-danger">
            <AlertCircle className="w-4 h-4" />{errorMsg}
          </div>
        )}
      </div>

      <form onSubmit={save} className="space-y-5">

        {/* Identity */}
        <section className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <Store className="w-4 h-4 text-brand-primary" />Identité de la boutique
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de la boutique <span className="text-brand-danger">*</span></label>
              <input
                value={val(form.store_name)}
                onChange={(e) => set('store_name', e.target.value)}
                required
                className="input"
                placeholder="BrasseriePro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                URL du logo
                <span className="text-xs text-brand-muted font-normal ml-1">(lien image)</span>
              </label>
              <input
                value={val(form.logo_url)}
                onChange={(e) => set('logo_url', e.target.value)}
                className="input"
                placeholder="https://example.com/logo.png"
                type="url"
              />
            </div>
          </div>
          {form.logo_url && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-brand-surface rounded-lg border border-brand-border">
              <Image className="w-4 h-4 text-brand-muted flex-shrink-0" />
              <span className="text-xs text-brand-muted">Aperçu :</span>
              <img
                src={form.logo_url}
                alt="Logo aperçu"
                className="h-10 w-auto object-contain rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </section>

        {/* Hero style */}
        <section className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <Palette className="w-4 h-4 text-brand-primary" />Style de la bannière
          </h2>
          <p className="text-xs text-brand-muted mb-4">
            Définit l'apparence de la boutique lorsqu'aucune bannière active n'est configurée.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="button" onClick={() => set('hero_style', 'auto')}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${form.hero_style === 'auto' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border hover:border-brand-primary/50'}`}>
              <p className="font-semibold text-sm mb-1">Fond sombre avec titre</p>
              <p className="text-xs text-brand-muted">Affiche un hero élégant "Boissons fraîches en gros" si aucune bannière n'est active.</p>
            </button>
            <button type="button" onClick={() => set('hero_style', 'none')}
              className={`flex-1 p-4 rounded-xl border-2 text-left transition-all ${form.hero_style === 'none' ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border hover:border-brand-primary/50'}`}>
              <p className="font-semibold text-sm mb-1">Aucun hero (minimal)</p>
              <p className="text-xs text-brand-muted">Cache complètement la zone banner si aucune bannière active.</p>
            </button>
          </div>
        </section>

        {/* Company */}
        <section className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <Building2 className="w-4 h-4 text-brand-primary" />Informations légales de la société
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Raison sociale / Nom de la société</label>
              <input
                value={val(form.company_name)}
                onChange={(e) => set('company_name', e.target.value)}
                className="input"
                placeholder="ACME SARL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numéro RCCM</label>
              <input
                value={val(form.rccm)}
                onChange={(e) => set('rccm', e.target.value)}
                className="input"
                placeholder="RB/COT/12A/345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numéro IFU</label>
              <input
                value={val(form.ifu)}
                onChange={(e) => set('ifu', e.target.value)}
                className="input"
                placeholder="3201234567890"
              />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <Phone className="w-4 h-4 text-brand-primary" />Contact
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Numéro de téléphone (appels)</label>
              <input
                value={val(form.phone_number)}
                onChange={(e) => set('phone_number', e.target.value)}
                className="input"
                placeholder="+229 97 00 00 00"
                type="tel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numéro WhatsApp</label>
              <input
                value={val(form.whatsapp_number)}
                onChange={(e) => set('whatsapp_number', e.target.value)}
                className="input"
                placeholder="+22997000000"
                type="tel"
              />
              <p className="text-xs text-brand-muted mt-1">Format international sans espaces pour le lien cliquable</p>
            </div>
          </div>
        </section>

        {/* WhatsApp Notifications */}
        <section className="card p-5">
          <h2 className="font-semibold mb-1 flex items-center gap-2 text-brand-dark">
            <Bell className="w-4 h-4 text-brand-primary" />Notifications WhatsApp
          </h2>
          <p className="text-xs text-brand-muted mb-4">
            Recevez un message WhatsApp automatique à chaque nouvelle commande via le service gratuit CallMeBot.
          </p>

          {/* Setup guide */}
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4 mb-4 text-sm space-y-2">
            <p className="font-medium text-brand-dark">Comment activer les notifications :</p>
            <ol className="list-decimal list-inside space-y-1.5 text-brand-muted text-xs">
              <li>
                Envoyez le message{' '}
                <code className="bg-white border border-brand-border px-1.5 py-0.5 rounded text-brand-dark font-mono">I allow callmebot to send me messages</code>{' '}
                au numéro WhatsApp{' '}
                <strong className="text-brand-dark">+34 644 56 55 18</strong> (CallMeBot).
              </li>
              <li>Vous recevrez en retour votre <strong className="text-brand-dark">clé API personnelle</strong>.</li>
              <li>Renseignez ci-dessous votre numéro (format international) et la clé reçue, puis sauvegardez.</li>
            </ol>
            <a
              href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-primary text-xs hover:underline"
            >
              Documentation CallMeBot <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Numéro de notification WhatsApp
              </label>
              <input
                value={val(form.whatsapp_notify_number)}
                onChange={(e) => set('whatsapp_notify_number', e.target.value)}
                className="input"
                placeholder="+22997000000"
                type="tel"
              />
              <p className="text-xs text-brand-muted mt-1">Format international, sans espaces (ex : +22997000000)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Clé API CallMeBot</label>
              <div className="relative">
                <input
                  value={val(form.callmebot_api_key)}
                  onChange={(e) => set('callmebot_api_key', e.target.value)}
                  className="input pr-10"
                  placeholder="123456"
                  type={showApiKey ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-dark transition"
                  tabIndex={-1}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-brand-muted mt-1">Clé reçue par WhatsApp depuis CallMeBot</p>
            </div>
          </div>

          {form.whatsapp_notify_number && form.callmebot_api_key && (
            <div className="mt-3 flex items-center gap-2 text-xs text-brand-success bg-brand-success/5 border border-brand-success/20 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              Notifications actives — un message WhatsApp sera envoyé à chaque nouvelle commande.
            </div>
          )}
        </section>

        {/* Social media */}
        <section className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <Globe className="w-4 h-4 text-brand-primary" />Réseaux sociaux
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Lien WhatsApp</label>
              <input
                value={val(form.whatsapp_url)}
                onChange={(e) => set('whatsapp_url', e.target.value)}
                className="input"
                placeholder="https://wa.me/22997000000"
                type="url"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Page Facebook</label>
              <input
                value={val(form.facebook_url)}
                onChange={(e) => set('facebook_url', e.target.value)}
                className="input"
                placeholder="https://facebook.com/votrepage"
                type="url"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Profil TikTok</label>
              <input
                value={val(form.tiktok_url)}
                onChange={(e) => set('tiktok_url', e.target.value)}
                className="input"
                placeholder="https://tiktok.com/@votrepage"
                type="url"
              />
            </div>
          </div>
        </section>

        {/* Legal pages */}
        <section className="card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-brand-dark">
            <FileText className="w-4 h-4 text-brand-primary" />Pages légales
          </h2>
          <p className="text-xs text-brand-muted mb-4">
            Ces textes seront affichés sur des pages dédiées accessibles depuis le pied de page.
            Vous pouvez utiliser des sauts de ligne pour structurer le contenu.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mentions légales</label>
              <textarea
                value={val(form.legal_mentions)}
                onChange={(e) => set('legal_mentions', e.target.value)}
                className="input resize-y min-h-40"
                rows={8}
                placeholder="Conformément aux dispositions des articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004...&#10;&#10;Éditeur du site : ...&#10;Hébergeur : ..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Conditions d'utilisation (CGU)</label>
              <textarea
                value={val(form.terms_of_use)}
                onChange={(e) => set('terms_of_use', e.target.value)}
                className="input resize-y min-h-40"
                rows={8}
                placeholder="Article 1 – Objet&#10;Les présentes conditions générales d'utilisation ont pour objet de définir les modalités et conditions d'utilisation des services proposés sur le site...&#10;&#10;Article 2 – Accès au service&#10;..."
              />
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end pb-4">
          <button type="submit" disabled={saving} className="btn-primary gap-2">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</>
              : <><Save className="w-4 h-4" />Enregistrer les paramètres</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
