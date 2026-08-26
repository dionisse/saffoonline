import { useEffect, useState } from 'react';
import { Loader2, Plus, Edit2, Trash2, Package2, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal, ConfirmDialog } from './AdminProducts';
import type { Category } from '../../lib/database.types';

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedParent, setSelectedParent] = useState<Category | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('sort_order');
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }

  const parentCategories = categories.filter((c) => !c.parent_id);
  const subCategories = selectedParent
    ? categories.filter((c) => c.parent_id === selectedParent.id)
    : [];

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          {selectedParent ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedParent(null)} className="text-brand-muted hover:text-brand-dark transition">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{selectedParent.name}</h1>
                <p className="text-sm text-brand-muted">{subCategories.length} sous-catégorie{subCategories.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold">Catégories</h1>
              <p className="text-sm text-brand-muted">{parentCategories.length} catégorie{parentCategories.length !== 1 ? 's' : ''} parente{parentCategories.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {selectedParent ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie'}
        </button>
      </div>

      {selectedParent && subCategories.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-brand-border rounded-xl">
          <Package2 className="w-10 h-10 text-brand-muted mx-auto mb-3" />
          <p className="font-medium text-brand-muted">Aucune sous-catégorie</p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4 text-sm">
            <Plus className="w-4 h-4" />Créer une sous-catégorie
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(selectedParent ? subCategories : parentCategories).map((c) => {
          const childCount = categories.filter((sub) => sub.parent_id === c.id).length;
          return (
            <div key={c.id} className="card overflow-hidden">
              <div className="aspect-video bg-brand-surface">
                {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package2 className="w-10 h-10 text-brand-muted" /></div>}
              </div>
              <div className="p-3">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-brand-muted line-clamp-2 mt-0.5 min-h-8">{c.description || '—'}</p>
                {!selectedParent && childCount > 0 && (
                  <button onClick={() => setSelectedParent(c)} className="mt-2 flex items-center gap-1 text-xs text-brand-primary hover:underline">
                    {childCount} sous-catégorie{childCount !== 1 ? 's' : ''} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <div className="flex justify-end gap-1 mt-2">
                  <button onClick={() => setEditing(c)} className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded transition"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeletingId(c.id)} className="p-1.5 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded transition"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <CategoryForm
          category={editing}
          categories={categories}
          presetParentId={selectedParent?.id ?? null}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
      {deletingId && (
        <ConfirmDialog title="Supprimer cette catégorie ?" message="Les produits seront détachés mais conservés."
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => { await supabase.from('categories').delete().eq('id', deletingId); setDeletingId(null); load(); }} />
      )}
    </div>
  );
}

function CategoryForm({ category, categories, presetParentId, onClose, onSaved }: {
  category: Category | null;
  categories: Category[];
  presetParentId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [imageUrl, setImageUrl] = useState(category?.image_url ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [parentId, setParentId] = useState<string>(category?.parent_id ?? presetParentId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = categories.filter((c) => !c.parent_id && c.id !== category?.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { name, description, image_url: imageUrl, sort_order: sortOrder, parent_id: parentId || null };
    const result = category ? await supabase.from('categories').update(payload).eq('id', category.id) : await supabase.from('categories').insert(payload);
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved();
  }

  return (
    <Modal onClose={onClose} title={category ? 'Modifier la catégorie' : (presetParentId ? 'Nouvelle sous-catégorie' : 'Nouvelle catégorie')}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Catégorie parente</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
            <option value="">— Aucune (catégorie principale) —</option>
            {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium mb-1">Nom *</label><input value={name} onChange={(e) => setName(e.target.value)} required className="input" /></div>
        <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input resize-none" /></div>
        <div><label className="block text-sm font-medium mb-1">URL image</label><input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="input" /></div>
        <div><label className="block text-sm font-medium mb-1">Ordre d'affichage</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="input" /></div>
        {error && <div className="bg-brand-danger/10 text-brand-danger text-sm p-2.5 rounded">{error}</div>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}
