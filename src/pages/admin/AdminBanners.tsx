import { useEffect, useState, ReactNode } from 'react';
import {
  Loader2, Plus, Edit2, Trash2, X, Check, ImageOff, Megaphone,
  Tag, Clock, ToggleLeft, ToggleRight, GripVertical, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Banner, Promotion } from '../../lib/database.types';

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex-shrink-0 bg-white border-b border-brand-border px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-brand-surface rounded-lg transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, onCancel, onConfirm }: {
  title: string; message: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-brand-warning mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-brand-muted mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm">Annuler</button>
          <button onClick={onConfirm} className="bg-brand-danger text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-danger/90 transition">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── BannersTab ────────────────────────────────────────────────────────────────

function BannersTab() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('banners').select('*').order('sort_order').order('created_at');
    setBanners((data as Banner[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(b: Banner) {
    await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id);
    load();
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-brand-muted">{banners.length} bannière{banners.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setCreating(true)} className="btn-primary text-sm gap-1.5"><Plus className="w-4 h-4" />Nouvelle bannière</button>
      </div>

      {banners.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-brand-border rounded-xl">
          <Megaphone className="w-10 h-10 text-brand-muted mx-auto mb-3" />
          <p className="font-medium text-brand-muted">Aucune bannière</p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4 text-sm"><Plus className="w-4 h-4" />Créer la première</button>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className={`card p-3 flex gap-3 items-start transition-opacity ${!b.is_active ? 'opacity-60' : ''}`}>
              <GripVertical className="w-4 h-4 text-brand-muted mt-1 flex-shrink-0" />
              <div className="w-24 h-16 rounded-lg overflow-hidden bg-brand-surface flex-shrink-0">
                {b.image_url
                  ? <img src={b.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>'; }} />
                  : <div className="w-full h-full flex items-center justify-center"><ImageOff className="w-5 h-5 text-brand-muted" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{b.title || <em className="text-brand-muted">Sans titre</em>}</p>
                {b.subtitle && <p className="text-xs text-brand-muted truncate mt-0.5">{b.subtitle}</p>}
                {b.cta_text && <span className="text-xs bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded mt-1 inline-block">{b.cta_text}</span>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(b)} title={b.is_active ? 'Désactiver' : 'Activer'}
                  className={`p-1.5 rounded transition ${b.is_active ? 'text-brand-success hover:bg-brand-success/10' : 'text-brand-muted hover:bg-brand-surface'}`}>
                  {b.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => setEditing(b)} className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded transition"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeletingId(b.id)} className="p-1.5 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <BannerForm
          banner={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
      {deletingId && (
        <ConfirmDialog
          title="Supprimer cette bannière ?"
          message="Cette action est irréversible."
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => { await supabase.from('banners').delete().eq('id', deletingId); setDeletingId(null); load(); }}
        />
      )}
    </div>
  );
}

function BannerForm({ banner, onClose, onSaved }: { banner: Banner | null; onClose: () => void; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? '');
  const [title, setTitle] = useState(banner?.title ?? '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '');
  const [ctaText, setCtaText] = useState(banner?.cta_text ?? '');
  const [ctaAction, setCtaAction] = useState(banner?.cta_action ?? '');
  const [sortOrder, setSortOrder] = useState(String(banner?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim()) { setError("L'URL de l'image est requise."); return; }
    setSaving(true); setError(null);
    const payload = {
      image_url: imageUrl.trim(),
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      cta_text: ctaText.trim() || null,
      cta_action: ctaAction.trim() || null,
      sort_order: Number(sortOrder),
      is_active: isActive,
    };
    if (banner) {
      const { error: err } = await supabase.from('banners').update(payload).eq('id', banner.id);
      if (err) { setSaving(false); setError(err.message); return; }
    } else {
      const { error: err } = await supabase.from('banners').insert(payload);
      if (err) { setSaving(false); setError(err.message); return; }
    }
    setSaving(false); onSaved();
  }

  return (
    <Modal onClose={onClose} title={banner ? 'Modifier la bannière' : 'Nouvelle bannière'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Image (URL) *</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="input" required />
          {imageUrl && <img src={imageUrl} alt="" className="mt-2 w-full h-32 object-cover rounded-lg border border-brand-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre principal" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sous-titre</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Texte secondaire" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texte du bouton CTA</label>
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Voir les offres" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action CTA (URL ou "shop")</label>
            <input value={ctaAction} onChange={(e) => setCtaAction(e.target.value)} placeholder="shop" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ordre d'affichage</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
              Bannière active
            </label>
          </div>
        </div>
        {error && <p className="text-brand-danger text-sm bg-brand-danger/10 p-3 rounded-lg">{error}</p>}
        <div className="flex gap-2 pt-2 border-t border-brand-border">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── PromotionsTab ─────────────────────────────────────────────────────────────

const BADGE_COLORS = [
  { value: 'red', label: 'Rouge' },
  { value: 'orange', label: 'Orange' },
  { value: 'green', label: 'Vert' },
  { value: 'blue', label: 'Bleu' },
  { value: 'yellow', label: 'Jaune' },
];

function PromotionsTab() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('promotions').select('*').order('sort_order').order('created_at');
    setPromos((data as Promotion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(p: Promotion) {
    await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id);
    load();
  }

  const badgeClass = (color: string) => ({
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-800',
  }[color] ?? 'bg-gray-100 text-gray-700');

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-brand-muted">{promos.length} promotion{promos.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setCreating(true)} className="btn-primary text-sm gap-1.5"><Plus className="w-4 h-4" />Nouvelle promotion</button>
      </div>

      {promos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-brand-border rounded-xl">
          <Tag className="w-10 h-10 text-brand-muted mx-auto mb-3" />
          <p className="font-medium text-brand-muted">Aucune promotion</p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4 text-sm"><Plus className="w-4 h-4" />Créer la première</button>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <div key={p.id} className={`card p-3 flex gap-3 items-start transition-opacity ${!p.is_active ? 'opacity-60' : ''}`}>
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-brand-surface flex-shrink-0">
                {p.image_url
                  ? <img src={p.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>'; }} />
                  : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-brand-muted">%</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  {p.badge_text && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeClass(p.badge_color)}`}>{p.badge_text}</span>}
                </div>
                {p.subtitle && <p className="text-xs text-brand-muted truncate mt-0.5">{p.subtitle}</p>}
                {p.ends_at && (
                  <p className="text-xs text-brand-warning flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />Expire le {new Date(p.ends_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(p)} title={p.is_active ? 'Désactiver' : 'Activer'}
                  className={`p-1.5 rounded transition ${p.is_active ? 'text-brand-success hover:bg-brand-success/10' : 'text-brand-muted hover:bg-brand-surface'}`}>
                  {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => setEditing(p)} className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded transition"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDeletingId(p.id)} className="p-1.5 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded transition"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <PromotionForm
          promotion={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
      {deletingId && (
        <ConfirmDialog
          title="Supprimer cette promotion ?"
          message="Cette action est irréversible."
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => { await supabase.from('promotions').delete().eq('id', deletingId); setDeletingId(null); load(); }}
        />
      )}
    </div>
  );
}

function PromotionForm({ promotion, onClose, onSaved }: { promotion: Promotion | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(promotion?.title ?? '');
  const [subtitle, setSubtitle] = useState(promotion?.subtitle ?? '');
  const [badgeText, setBadgeText] = useState(promotion?.badge_text ?? '');
  const [badgeColor, setBadgeColor] = useState(promotion?.badge_color ?? 'red');
  const [imageUrl, setImageUrl] = useState(promotion?.image_url ?? '');
  const [ctaText, setCtaText] = useState(promotion?.cta_text ?? '');
  const [ctaAction, setCtaAction] = useState(promotion?.cta_action ?? '');
  const [endsAt, setEndsAt] = useState(promotion?.ends_at ? promotion.ends_at.slice(0, 16) : '');
  const [sortOrder, setSortOrder] = useState(String(promotion?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Le titre est requis.'); return; }
    setSaving(true); setError(null);
    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      badge_text: badgeText.trim() || null,
      badge_color: badgeColor,
      image_url: imageUrl.trim() || null,
      cta_text: ctaText.trim() || null,
      cta_action: ctaAction.trim() || null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      sort_order: Number(sortOrder),
      is_active: isActive,
    };
    if (promotion) {
      const { error: err } = await supabase.from('promotions').update(payload).eq('id', promotion.id);
      if (err) { setSaving(false); setError(err.message); return; }
    } else {
      const { error: err } = await supabase.from('promotions').insert(payload);
      if (err) { setSaving(false); setError(err.message); return; }
    }
    setSaving(false); onSaved();
  }

  return (
    <Modal onClose={onClose} title={promotion ? 'Modifier la promotion' : 'Nouvelle promotion'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Titre *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Soldes d'été -30%" className="input" required />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Sous-titre</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Description courte" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Badge</label>
            <div className="flex gap-2">
              <input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder="-30%" className="input flex-1" />
              <select value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)} className="input w-28">
                {BADGE_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Image (URL)</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="input" />
            {imageUrl && <img src={imageUrl} alt="" className="mt-2 w-full h-24 object-cover rounded-lg border border-brand-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texte CTA</label>
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="En profiter" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action CTA (URL ou "shop")</label>
            <input value={ctaAction} onChange={(e) => setCtaAction(e.target.value)} placeholder="shop" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Date de fin</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ordre d'affichage</label>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="input" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
              Promotion active
            </label>
          </div>
        </div>
        {error && <p className="text-brand-danger text-sm bg-brand-danger/10 p-3 rounded-lg">{error}</p>}
        <div className="flex gap-2 pt-2 border-t border-brand-border">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminBanners() {
  const [tab, setTab] = useState<'banners' | 'promotions'>('banners');

  const tabs = [
    { id: 'banners' as const,    icon: <Megaphone className="w-4 h-4" />, label: 'Bannières' },
    { id: 'promotions' as const, icon: <Tag className="w-4 h-4" />,      label: 'Promotions' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="w-6 h-6 text-brand-primary" />
        <div>
          <h1 className="text-xl font-bold">Bannières & Promotions</h1>
          <p className="text-sm text-brand-muted">Gérez les bannières publicitaires et les offres promotionnelles de la boutique.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-border mb-6 gap-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-muted hover:text-brand-dark'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'banners' && <BannersTab />}
      {tab === 'promotions' && <PromotionsTab />}
    </div>
  );
}
