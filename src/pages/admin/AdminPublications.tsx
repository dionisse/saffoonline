import { useEffect, useState } from 'react';
import {
  Loader2, Plus, Edit2, Trash2, X, AlertTriangle,
  ToggleLeft, ToggleRight, ImageOff, Share2, Copy, Check,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/format';
import type { Publication } from '../../lib/database.types';

// ─── Social icon SVGs ─────────────────────────────────────────────────────────

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
function IconTiktok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.03a4.85 4.85 0 01-1-.34z"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildShareText(pub: Publication, withLink: boolean) {
  const lines = [`${pub.title}`, '', pub.content];
  if (withLink && pub.link_url) lines.push('', pub.link_url);
  else if (withLink) lines.push('', window.location.origin);
  return lines.join('\n');
}

function shareToFacebook(pub: Publication) {
  const url = encodeURIComponent(pub.link_url || window.location.origin);
  const quote = encodeURIComponent(buildShareText(pub, false));
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank', 'width=600,height=500');
}

function shareToWhatsApp(pub: Publication) {
  const text = encodeURIComponent(buildShareText(pub, true));
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

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

// ─── ShareModal ───────────────────────────────────────────────────────────────

function ShareModal({ pub, onClose }: { pub: Publication; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copyForTikTok() {
    const text = buildShareText(pub, true);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function openTikTok() {
    window.open('https://www.tiktok.com', '_blank');
  }

  return (
    <Modal title="Partager cette publication" onClose={onClose}>
      {/* Preview */}
      <div className="rounded-xl border border-brand-border overflow-hidden mb-5">
        {pub.image_url && (
          <img src={pub.image_url} alt={pub.title} className="w-full h-40 object-cover" />
        )}
        <div className="p-3">
          <p className="font-semibold text-sm">{pub.title}</p>
          <p className="text-xs text-brand-muted mt-1 line-clamp-2">{pub.content}</p>
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-3">Choisir la plateforme</p>

      <div className="space-y-3">
        {/* Facebook */}
        <button
          onClick={() => shareToFacebook(pub)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-brand-border hover:border-[#1877F2]/40 hover:bg-[#1877F2]/5 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center flex-shrink-0">
            <IconFacebook className="w-5 h-5 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-sm">Facebook</p>
            <p className="text-xs text-brand-muted">Partager sur votre page ou profil</p>
          </div>
          <ExternalLink className="w-4 h-4 text-brand-muted group-hover:text-[#1877F2] transition" />
        </button>

        {/* WhatsApp */}
        <button
          onClick={() => shareToWhatsApp(pub)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-brand-border hover:border-[#25D366]/40 hover:bg-[#25D366]/5 transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <IconWhatsapp className="w-5 h-5 text-white" />
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-sm">WhatsApp</p>
            <p className="text-xs text-brand-muted">Envoyer à vos contacts ou groupes</p>
          </div>
          <ExternalLink className="w-4 h-4 text-brand-muted group-hover:text-[#25D366] transition" />
        </button>

        {/* TikTok */}
        <div className="rounded-xl border border-brand-border overflow-hidden">
          <div className="flex items-center gap-3 p-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#010101] flex items-center justify-center flex-shrink-0">
              <IconTiktok className="w-5 h-5 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-sm">TikTok</p>
              <p className="text-xs text-brand-muted">Copiez le texte, puis créez votre vidéo</p>
            </div>
          </div>
          <div className="border-t border-brand-border bg-brand-surface px-4 pb-3 pt-3">
            <p className="text-xs text-brand-muted mb-2">
              TikTok ne permet pas le partage direct depuis le web. Copiez le texte ci-dessous et collez-le dans votre création TikTok.
            </p>
            <div className="bg-white border border-brand-border rounded-lg p-2.5 text-xs text-brand-dark font-mono whitespace-pre-wrap mb-2 max-h-28 overflow-auto">
              {buildShareText(pub, true)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyForTikTok}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  copied
                    ? 'bg-brand-success text-white'
                    : 'bg-brand-dark text-white hover:bg-brand-primary'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier le texte'}
              </button>
              <button
                onClick={openTikTok}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-brand-border hover:bg-brand-surface transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir TikTok
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── PublicationForm ──────────────────────────────────────────────────────────

const EMPTY_FORM = { title: '', content: '', image_url: '', link_url: '', active: true };

function PublicationForm({ initial, onSave, onClose }: {
  initial?: Publication | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? { title: initial.title, content: initial.content, image_url: initial.image_url ?? '', link_url: initial.link_url ?? '', active: initial.active }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError('Le titre et le contenu sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      image_url: form.image_url.trim() || null,
      link_url: form.link_url.trim() || null,
      active: form.active,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = initial
      ? await supabase.from('publications').update(payload).eq('id', initial.id)
      : await supabase.from('publications').insert(payload);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Titre <span className="text-brand-danger">*</span></label>
        <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex : Promo week-end bières pression" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Contenu <span className="text-brand-danger">*</span></label>
        <textarea className="input resize-none" rows={5} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Rédigez votre message publicitaire..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Image (URL)</label>
        <input className="input" value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." />
        {form.image_url && (
          <img src={form.image_url} alt="preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-brand-border" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Lien (optionnel)</label>
        <input className="input" value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://..." />
        <p className="text-xs text-brand-muted mt-1">Lien partagé avec la publication (produit, page, etc.)</p>
      </div>
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-brand-border">
        <div>
          <p className="text-sm font-medium">Publication active</p>
          <p className="text-xs text-brand-muted">Visible sur la boutique</p>
        </div>
        <button type="button" onClick={() => set('active', !form.active)}>
          {form.active
            ? <ToggleRight className="w-8 h-8 text-brand-success" />
            : <ToggleLeft className="w-8 h-8 text-brand-muted" />}
        </button>
      </div>
      {error && <p className="text-sm text-brand-danger bg-brand-danger/5 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : initial ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </form>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AdminPublications() {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [sharing, setSharing] = useState<Publication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from('publications').select('*').order('created_at', { ascending: false });
    setPubs((data as Publication[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(pub: Publication) {
    await supabase.from('publications').update({ active: !pub.active, updated_at: new Date().toISOString() }).eq('id', pub.id);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from('publications').delete().eq('id', id);
    setDeletingId(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Publications & Publicités</h1>
          <p className="text-sm text-brand-muted mt-0.5">
            Créez vos publications et partagez-les sur Facebook, WhatsApp et TikTok.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary gap-1.5 text-sm">
          <Plus className="w-4 h-4" />Nouvelle publication
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total', value: pubs.length, color: 'text-brand-dark' },
          { label: 'Actives', value: pubs.filter(p => p.active).length, color: 'text-brand-success' },
          { label: 'Inactives', value: pubs.filter(p => !p.active).length, color: 'text-brand-muted' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-brand-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {pubs.length === 0 && (
        <div className="card p-12 text-center">
          <Share2 className="w-10 h-10 text-brand-muted mx-auto mb-3" />
          <p className="font-semibold mb-1">Aucune publication</p>
          <p className="text-sm text-brand-muted mb-4">Créez votre première publication pour la partager sur les réseaux.</p>
          <button onClick={() => setCreating(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />Créer une publication
          </button>
        </div>
      )}

      {/* Publications list */}
      <div className="space-y-4">
        {pubs.map(pub => (
          <div key={pub.id} className="card overflow-hidden">
            <div className="flex gap-4 p-4">
              {/* Image */}
              <div className="w-20 h-20 rounded-xl bg-brand-surface border border-brand-border flex-shrink-0 overflow-hidden">
                {pub.image_url
                  ? <img src={pub.image_url} alt={pub.title} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  : <ImageOff className="w-6 h-6 text-brand-muted m-auto mt-[22px]" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{pub.title}</p>
                  <span className={`badge flex-shrink-0 ${pub.active ? 'bg-brand-success/10 text-brand-success' : 'bg-brand-muted/15 text-brand-muted'}`}>
                    {pub.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-brand-muted mt-1 line-clamp-2">{pub.content}</p>
                <p className="text-xs text-brand-muted/70 mt-1.5">{formatDate(pub.created_at)}</p>
              </div>
            </div>

            {/* Actions bar */}
            <div className="border-t border-brand-border bg-brand-surface px-4 py-2.5 flex items-center gap-2 flex-wrap">
              {/* Share buttons */}
              <button
                onClick={() => setSharing(pub)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-dark transition"
              >
                <Share2 className="w-3.5 h-3.5" />Partager
              </button>
              <button
                onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pub.link_url || window.location.origin)}&quote=${encodeURIComponent(pub.title + '\n\n' + pub.content)}`, '_blank', 'width=600,height=500'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1877F2] text-white text-xs font-semibold hover:bg-[#1557cc] transition"
              >
                <IconFacebook className="w-3.5 h-3.5" />Facebook
              </button>
              <button
                onClick={() => shareToWhatsApp(pub)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:bg-[#1ebe59] transition"
              >
                <IconWhatsapp className="w-3.5 h-3.5" />WhatsApp
              </button>
              <button
                onClick={() => setSharing(pub)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#010101] text-white text-xs font-semibold hover:bg-[#333] transition"
              >
                <IconTiktok className="w-3.5 h-3.5" />TikTok
              </button>

              <div className="flex-1" />

              {/* Toggle */}
              <button onClick={() => toggleActive(pub)} title={pub.active ? 'Désactiver' : 'Activer'}>
                {pub.active
                  ? <ToggleRight className="w-6 h-6 text-brand-success" />
                  : <ToggleLeft className="w-6 h-6 text-brand-muted" />}
              </button>
              <button onClick={() => setEditing(pub)} className="p-1.5 hover:bg-white rounded-lg transition text-brand-muted hover:text-brand-dark">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingId(pub.id)} className="p-1.5 hover:bg-white rounded-lg transition text-brand-muted hover:text-brand-danger">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {(creating || editing) && (
        <Modal title={editing ? 'Modifier la publication' : 'Nouvelle publication'} onClose={() => { setCreating(false); setEditing(null); }}>
          <PublicationForm
            initial={editing}
            onSave={() => { setCreating(false); setEditing(null); load(); }}
            onClose={() => { setCreating(false); setEditing(null); }}
          />
        </Modal>
      )}

      {sharing && <ShareModal pub={sharing} onClose={() => setSharing(null)} />}

      {deletingId && (
        <ConfirmDialog
          title="Supprimer la publication ?"
          message="Cette action est irréversible. La publication sera définitivement supprimée."
          onCancel={() => setDeletingId(null)}
          onConfirm={() => handleDelete(deletingId)}
        />
      )}
    </div>
  );
}
