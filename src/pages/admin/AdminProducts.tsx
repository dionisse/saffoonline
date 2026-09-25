import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Loader2, Plus, Search, Edit2, Trash2, Package2, X, AlertTriangle,
  Tag, Layers, RefreshCw, TableProperties,
  List, Check, Download, Upload, GripVertical, Sparkles, CheckCircle2,
  Cloud, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/format';
import type { Brand, Category, Product, ProductOption, ProductOptionGroup } from '../../lib/database.types';

// ── Image optimization ────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

function isStorageUrl(url: string): boolean {
  return url.startsWith(SUPABASE_URL) && url.includes('/storage/v1/object/public/');
}

async function optimizeImages(
  urls: string[],
  accessToken: string,
): Promise<{ optimized: string[]; count: number }> {
  const external = urls.filter((u) => u.trim() && !isStorageUrl(u));
  if (external.length === 0) return { optimized: urls, count: 0 };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/process-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ urls: external }),
  });

  if (!res.ok) return { optimized: urls, count: 0 };

  const data = await res.json() as {
    results: Array<{ original: string; optimized: string; status: string }>;
  };

  const map = new Map(data.results.map((r) => [r.original, r.optimized]));
  const finalUrls = urls.map((u) => map.get(u.trim()) ?? u);
  const optimizedCount = data.results.filter((r) => r.status === 'optimized').length;
  return { optimized: finalUrls, count: optimizedCount };
}



function genSkuPreview(name: string): string {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PRD';
  const suffix = String(Math.floor(Math.random() * 90000 + 10000));
  return `${prefix}-${suffix}`;
}

// ── Local types ───────────────────────────────────────────────────────────────

interface LocalOption {
  _key: string;
  id?: string;
  label: string;
  price_modifier: number;
  stock: number;
  image_url: string;
}

interface LocalGroup {
  _key: string;
  id?: string;
  name: string;
  options: LocalOption[];
}

interface BulkRow {
  _key: string;
  id?: string;
  name: string;
  sku: string;
  brand_name: string;
  category_name: string;
  price: string;
  stock: string;
  bulk_quantity: string;
  bulk_price: string;
  is_active: boolean;
  track_stock: boolean;
  _dirty: boolean;
  _error?: string;
}

function emptyRow(): BulkRow {
  return {
    _key: crypto.randomUUID(),
    name: '', sku: '', brand_name: '', category_name: '',
    price: '0', stock: '0', bulk_quantity: '0', bulk_price: '0',
    is_active: true, track_stock: true, _dirty: true,
  };
}

// ── AdminProducts ─────────────────────────────────────────────────────────────

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'bulk'>('list');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [p, c, b] = await Promise.all([
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('brands').select('*').order('name'),
    ]);
    setProducts((p.data as Product[]) ?? []);
    setCategories((c.data as Category[]) ?? []);
    setBrands((b.data as Brand[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter((p) => {
    if (filterBrand && p.brand_id !== filterBrand) return false;
    if (filterCat) {
      const childIds = categories.filter((c) => c.parent_id === filterCat).map((c) => c.id);
      if (p.category_id !== filterCat && !(p.category_id && childIds.includes(p.category_id))) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-sm text-brand-muted">{products.length} produit{products.length !== 1 ? 's' : ''} · {brands.length} marque{brands.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="btn-secondary gap-1.5 text-sm"><RefreshCw className="w-3.5 h-3.5" />Actualiser</button>
          {/* Mode toggle */}
          <div className="flex border border-brand-border rounded-lg overflow-hidden text-sm">
            <button onClick={() => setMode('list')}
              className={`px-3 py-2 flex items-center gap-1.5 transition ${mode === 'list' ? 'bg-brand-primary text-white' : 'hover:bg-brand-surface'}`}>
              <List className="w-3.5 h-3.5" />Liste
            </button>
            <button onClick={() => setMode('bulk')}
              className={`px-3 py-2 flex items-center gap-1.5 transition border-l border-brand-border ${mode === 'bulk' ? 'bg-brand-primary text-white' : 'hover:bg-brand-surface'}`}>
              <TableProperties className="w-3.5 h-3.5" />Saisie groupée
            </button>
          </div>
          {mode === 'list' && (
            <button onClick={() => setCreating(true)} className="btn-primary gap-1.5 text-sm"><Plus className="w-4 h-4" />Nouveau produit</button>
          )}
        </div>
      </div>

      {mode === 'list' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par nom ou SKU…" className="input pl-9" />
            </div>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="input sm:w-44">
              <option value="">Toutes les marques</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="input sm:w-52">
              <option value="">Toutes les catégories</option>
              {categories.filter((c) => !c.parent_id).map((parent) => (
                <optgroup key={parent.id} label={parent.name}>
                  <option value={parent.id}>{parent.name} (toutes)</option>
                  {categories.filter((c) => c.parent_id === parent.id).map((sub) => (
                    <option key={sub.id} value={sub.id}>  └ {sub.name}</option>
                  ))}
                </optgroup>
              ))}
              {categories.filter((c) => !c.parent_id && !categories.some((sub) => sub.parent_id === c.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-brand-surface text-left text-xs font-medium text-brand-muted uppercase tracking-wide">
                  <tr>
                    <th className="p-3">Produit / SKU</th>
                    <th className="p-3 hidden md:table-cell">Marque</th>
                    <th className="p-3 hidden md:table-cell">Catégorie</th>
                    <th className="p-3 text-right">Prix</th>
                    <th className="p-3 text-center">Stock</th>
                    <th className="p-3 hidden lg:table-cell text-center">Suivi stock</th>
                    <th className="p-3 hidden lg:table-cell text-center">Options</th>
                    <th className="p-3 text-center hidden sm:table-cell">Actif</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filtered.map((p) => {
                    const cat = categories.find((c) => c.id === p.category_id);
                    const brand = brands.find((b) => b.id === p.brand_id);
                    const isLow = p.stock > 0 && p.stock <= p.low_stock_threshold;
                    return (
                      <tr key={p.id} className="hover:bg-brand-surface/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-brand-surface rounded-lg flex-shrink-0 overflow-hidden border border-brand-border">
                              {p.image_url
                                ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><Package2 className="w-4 h-4 text-brand-muted" /></div>}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{p.name}</p>
                              <p className="text-xs text-brand-muted font-mono">{p.sku || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {brand ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-brand-primary/8 text-brand-primary px-2 py-0.5 rounded-full border border-brand-primary/20">
                              <Tag className="w-3 h-3" />{brand.name}
                            </span>
                          ) : <span className="text-brand-muted text-xs">—</span>}
                        </td>
                        <td className="p-3 hidden md:table-cell text-brand-muted text-xs">{cat?.name || '—'}</td>
                        <td className="p-3 text-right font-semibold">{formatPrice(p.price)}</td>
                        <td className="p-3 text-center">
                          {p.track_stock ? (
                            <span className={`badge text-xs font-semibold ${p.stock === 0 ? 'bg-brand-danger/15 text-brand-danger' : isLow ? 'bg-brand-warning/15 text-brand-warning' : 'bg-brand-success/15 text-brand-success'}`}>
                              {p.stock}
                            </span>
                          ) : (
                            <span className="text-xs text-brand-muted" title="Suivi de stock désactivé">—</span>
                          )}
                        </td>
                        <td className="p-3 hidden lg:table-cell text-center">
                          <span className={`w-2 h-2 rounded-full inline-block ${p.track_stock ? 'bg-brand-success' : 'bg-brand-border'}`} title={p.track_stock ? 'Suivi activé' : 'Suivi désactivé'} />
                        </td>
                        <td className="p-3 hidden lg:table-cell text-center">
                          <OptionsBadge productId={p.id} />
                        </td>
                        <td className="p-3 text-center hidden sm:table-cell">
                          <span className={`w-2 h-2 rounded-full inline-block ${p.is_active ? 'bg-brand-success' : 'bg-brand-border'}`} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEditing(p)} className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded transition"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setDeletingId(p.id)} className="p-1.5 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <Package2 className="w-10 h-10 text-brand-muted mx-auto mb-3" />
                  <p className="font-medium text-brand-muted">Aucun produit trouvé</p>
                  <button onClick={() => setCreating(true)} className="btn-primary mt-4 text-sm"><Plus className="w-4 h-4" />Créer un produit</button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <BulkEditor products={products} categories={categories} brands={brands} onSaved={load} />
      )}

      {(editing || creating) && (
        <ProductForm
          product={editing}
          categories={categories}
          brands={brands}
          onBrandCreated={(b) => setBrands((prev) => [...prev, b].sort((a, z) => a.name.localeCompare(z.name)))}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title="Supprimer ce produit ?"
          message="Cette action est irréversible. Les mouvements de stock liés seront conservés."
          onCancel={() => setDeletingId(null)}
          onConfirm={async () => {
            await supabase.from('products').delete().eq('id', deletingId);
            setDeletingId(null); load();
          }}
        />
      )}
    </div>
  );
}

// ── OptionsBadge (lazy-loads count) ──────────────────────────────────────────

function OptionsBadge({ productId }: { productId: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from('product_option_groups').select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [productId]);
  if (count === null) return <span className="text-brand-muted text-xs">…</span>;
  if (count === 0) return <span className="text-brand-muted text-xs">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-brand-info/10 text-brand-info px-2 py-0.5 rounded-full">
      <Layers className="w-3 h-3" />{count}
    </span>
  );
}

// ── ProductForm ───────────────────────────────────────────────────────────────

function ProductForm({ product, categories, brands, onBrandCreated, onClose, onSaved }: {
  product: Product | null;
  categories: Category[];
  brands: Brand[];
  onBrandCreated: (b: Brand) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]               = useState(product?.name ?? '');
  const [sku, setSku]                 = useState(product?.sku ?? '');
  const [skuAuto, setSkuAuto]         = useState(!product?.sku);
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId]   = useState(product?.category_id ?? '');
  const [brandId, setBrandId]         = useState(product?.brand_id ?? '');
  const [price, setPrice]             = useState(String(product?.price ?? 0));
  const [bulkQty, setBulkQty]         = useState(String(product?.bulk_quantity ?? 0));
  const [bulkPrice, setBulkPrice]     = useState(String(product?.bulk_price ?? 0));
  const [stock, setStock]             = useState(String(product?.stock ?? 0));
  const [threshold, setThreshold]     = useState(String(product?.low_stock_threshold ?? 5));
  const [imageUrl, setImageUrl]       = useState(product?.image_url ?? '');
  const [isActive, setIsActive]       = useState(product?.is_active ?? true);
  const [trackStock, setTrackStock]   = useState(product?.track_stock ?? true);
  const [groups, setGroups]           = useState<LocalGroup[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(!!product);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<'base' | 'options'>('base');
  const [optimizing, setOptimizing]   = useState(false);
  const [optimizeInfo, setOptimizeInfo] = useState<string | null>(null);

  // Brand creation inline
  const [newBrandName, setNewBrandName] = useState('');
  const [savingBrand, setSavingBrand]   = useState(false);

  // Load existing option groups when editing
  useEffect(() => {
    if (!product) { setLoadingOptions(false); return; }
    supabase.from('product_option_groups')
      .select('*, product_options(*)')
      .eq('product_id', product.id)
      .order('sort_order')
      .then(({ data }) => {
        if (data) {
          setGroups(data.map((g) => ({
            _key: g.id,
            id: g.id,
            name: g.name,
            options: ((g.product_options as ProductOption[]) || []).map((o) => ({
              _key: o.id,
              id: o.id,
              label: o.label,
              price_modifier: o.price_modifier,
              stock: o.stock ?? 0,
              image_url: o.image_url ?? '',
            })),
          })));
        }
        setLoadingOptions(false);
      });
  }, [product]);

  // Auto-preview SKU when name changes
  useEffect(() => {
    if (skuAuto && name) setSku(genSkuPreview(name));
  }, [name, skuAuto]);

  async function createBrand() {
    if (!newBrandName.trim()) return;
    setSavingBrand(true);
    const { data, error: err } = await supabase.from('brands').insert({ name: newBrandName.trim() }).select().maybeSingle();
    setSavingBrand(false);
    if (err || !data) return;
    const brand = data as Brand;
    onBrandCreated(brand);
    setBrandId(brand.id);
    setNewBrandName('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true); setError(null); setOptimizeInfo(null);

    // Auto-optimize external image URLs before saving
    let finalImageUrl = imageUrl.trim();
    const rawUrls = finalImageUrl.split(',').map((u) => u.trim()).filter(Boolean);
    const hasExternal = rawUrls.some((u) => u && !isStorageUrl(u));

    if (hasExternal && rawUrls.length > 0) {
      setOptimizing(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token ?? '';
        const { optimized, count } = await optimizeImages(rawUrls, token);
        finalImageUrl = optimized.join(', ');
        setImageUrl(finalImageUrl);
        if (count > 0) setOptimizeInfo(`${count} image${count > 1 ? 's' : ''} optimisée${count > 1 ? 's' : ''} et hébergées sur CDN`);
      } catch {
        // Non-blocking: proceed with original URLs if optimization fails
      } finally {
        setOptimizing(false);
      }
    }

    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      description: description.trim(),
      category_id: categoryId || null,
      brand_id: brandId || null,
      price: Number(price),
      bulk_quantity: Number(bulkQty),
      bulk_price: Number(bulkPrice),
      stock: Number(stock),
      low_stock_threshold: Number(threshold),
      image_url: finalImageUrl,
      is_active: isActive,
      track_stock: trackStock,
    };

    let productId = product?.id;

    if (product) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', product.id);
      if (err) { setSaving(false); setError(err.message); return; }
    } else {
      const { data, error: err } = await supabase.from('products').insert(payload).select().maybeSingle();
      if (err || !data) { setSaving(false); setError(err?.message ?? 'Erreur'); return; }
      productId = (data as Product).id;
    }

    // Save option groups: replace all (delete then insert)
    if (productId) {
      await supabase.from('product_option_groups').delete().eq('product_id', productId);
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        if (!g.name.trim() || g.options.length === 0) continue;
        const { data: gData } = await supabase.from('product_option_groups')
          .insert({ product_id: productId, name: g.name.trim(), sort_order: gi })
          .select().maybeSingle();
        if (gData) {
          const optPayload = g.options.map((o, oi) => ({
            group_id: (gData as ProductOptionGroup).id,
            label: o.label.trim(),
            price_modifier: o.price_modifier,
            stock: Number(o.stock),
            image_url: o.image_url.trim() || null,
            sort_order: oi,
          })).filter((o) => o.label);
          if (optPayload.length > 0) {
            await supabase.from('product_options').insert(optPayload);
          }
        }
      }
    }

    setSaving(false);
    onSaved();
  }

  const tabs = [
    { id: 'base', label: 'Informations' },
    { id: 'options', label: `Options${groups.length > 0 ? ` (${groups.length})` : ''}` },
  ] as const;

  return (
    <Modal onClose={onClose} title={product ? 'Modifier le produit' : 'Nouveau produit'}>
      {/* Tabs */}
      <div className="flex gap-4 border-b border-brand-border pb-2 mb-4">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 text-sm font-medium border-b-2 transition ${activeTab === t.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-brand-muted hover:text-brand-dark'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <div>
        {activeTab === 'base' && (
          <div className="space-y-4">
            {/* Name + SKU */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Nom du produit *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                  <span>SKU</span>
                  <label className="flex items-center gap-1.5 text-xs font-normal text-brand-muted cursor-pointer">
                    <input type="checkbox" checked={skuAuto} onChange={(e) => setSkuAuto(e.target.checked)} className="w-3.5 h-3.5" />
                    Auto
                  </label>
                </label>
                <input value={sku} onChange={(e) => { setSkuAuto(false); setSku(e.target.value); }}
                  placeholder={skuAuto ? 'Généré automatiquement' : ''}
                  className={`input font-mono text-sm ${skuAuto ? 'bg-brand-surface text-brand-muted' : ''}`}
                  readOnly={skuAuto} />
                {skuAuto && <p className="text-xs text-brand-muted mt-1">Aperçu : <span className="font-mono">{sku || '—'}</span></p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
                  <option value="">— Aucune —</option>
                  {categories.filter((c) => !c.parent_id).map((parent) => (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name}</option>
                      {categories.filter((c) => c.parent_id === parent.id).map((sub) => (
                        <option key={sub.id} value={sub.id}>  └ {sub.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  {categories.filter((c) => !c.parent_id && !categories.some((sub) => sub.parent_id === c.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-sm font-medium mb-1">Marque</label>
              <div className="flex gap-2">
                <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input flex-1">
                  <option value="">— Aucune marque —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <input value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Créer une nouvelle marque…" className="input text-sm flex-1" />
                <button type="button" onClick={createBrand} disabled={!newBrandName.trim() || savingBrand}
                  className="btn-secondary text-sm gap-1.5 flex-shrink-0">
                  {savingBrand ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Créer
                </button>
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Photos du produit
                <span className="text-xs text-brand-muted font-normal ml-1">— séparez plusieurs URLs par <code className="bg-brand-surface px-1 rounded">, </code></span>
              </label>
              <textarea
                value={imageUrl}
                onChange={(e) => { setImageUrl(e.target.value); setOptimizeInfo(null); }}
                placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
                rows={2}
                className="input resize-none text-sm"
              />

              {/* Optimization status banner */}
              {optimizing && (
                <div className="mt-2 flex items-center gap-2 text-xs text-brand-primary bg-brand-primary/8 border border-brand-primary/20 rounded-lg px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  Optimisation en cours — conversion WebP, compression, hébergement CDN…
                </div>
              )}
              {optimizeInfo && !optimizing && (
                <div className="mt-2 flex items-center gap-2 text-xs text-brand-success bg-brand-success/8 border border-brand-success/20 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  {optimizeInfo}
                </div>
              )}

              {/* Thumbnail previews with status badges */}
              {imageUrl.trim() && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {imageUrl.split(',').map((u) => u.trim()).filter(Boolean).map((src, i) => {
                    const stored = isStorageUrl(src);
                    return (
                      <div key={i} className="relative group flex-shrink-0">
                        <img
                          src={src}
                          alt={`Photo ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-brand-border"
                          onError={(e) => {
                            const el = e.target as HTMLImageElement;
                            el.style.display = 'none';
                            const placeholder = el.nextElementSibling as HTMLElement | null;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        {/* Error placeholder */}
                        <div className="w-16 h-16 rounded-lg border border-brand-border bg-brand-surface items-center justify-center hidden">
                          <AlertCircle className="w-5 h-5 text-brand-muted" />
                        </div>
                        {/* Status badge */}
                        <span className={`absolute -top-1.5 -right-1.5 flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full leading-none shadow-sm ${
                          stored
                            ? 'bg-brand-success text-white'
                            : 'bg-brand-warning text-brand-dark'
                        }`}>
                          {stored
                            ? <><Cloud className="w-2.5 h-2.5" />CDN</>
                            : <><Sparkles className="w-2.5 h-2.5" />Externe</>
                          }
                        </span>
                        {i === 0 && (
                          <span className="absolute -bottom-1.5 -left-1.5 bg-brand-primary text-white text-[9px] font-bold px-1 py-0.5 rounded-full leading-none">1re</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Hint for external images */}
              {imageUrl.split(',').some((u) => u.trim() && !isStorageUrl(u.trim())) && (
                <p className="mt-2 text-xs text-brand-muted flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-warning" />
                  Les images externes seront automatiquement optimisées (WebP, CDN) lors de l'enregistrement.
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input resize-none" />
            </div>

            {/* Pricing */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Prix *</label><input type="number" min={0} step={50} value={price} onChange={(e) => setPrice(e.target.value)} required className="input" /></div>
              <div><label className="block text-sm font-medium mb-1">Stock *</label><input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} required className="input" /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Qté min. lot</label>
                <input type="number" min={0} value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} className="input" />
              </div>
              <div><label className="block text-sm font-medium mb-1">Prix de lot</label><input type="number" min={0} step={50} value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} className="input" /></div>
              <div><label className="block text-sm font-medium mb-1">Seuil alerte stock</label><input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} className="input" /></div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded" />
                  Visible dans la boutique
                </label>
              </div>
            </div>

            {/* Stock tracking toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer mt-2">
              <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="w-4 h-4 rounded" />
              Suivre le stock pour ce produit
              <span className="text-xs text-brand-muted ml-1">— désactivez pour les produits illimités ou sur commande</span>
            </label>
          </div>
        )}

        {activeTab === 'options' && (
          <OptionGroupEditor groups={groups} onChange={setGroups} basePrice={Number(price)} loading={loadingOptions} />
        )}

        {error && <div className="bg-brand-danger/10 text-brand-danger text-sm p-3 rounded-lg mt-4">{error}</div>}
        </div>

        <div className="pt-4 mt-4 border-t border-brand-border flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
            {saving
              ? optimizing
                ? <><Loader2 className="w-4 h-4 animate-spin" />Optimisation…</>
                : <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</>
              : <><Check className="w-4 h-4" />Enregistrer</>
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── OptionGroupEditor ─────────────────────────────────────────────────────────

function OptionGroupEditor({ groups, onChange, basePrice, loading }: {
  groups: LocalGroup[];
  onChange: (g: LocalGroup[]) => void;
  basePrice: number;
  loading: boolean;
}) {
  function addGroup() {
    onChange([...groups, { _key: crypto.randomUUID(), name: '', options: [] }]);
  }
  function removeGroup(key: string) {
    onChange(groups.filter((g) => g._key !== key));
  }
  function updateGroup(key: string, name: string) {
    onChange(groups.map((g) => g._key === key ? { ...g, name } : g));
  }
  function addOption(groupKey: string) {
    onChange(groups.map((g) =>
      g._key === groupKey
        ? { ...g, options: [...g.options, { _key: crypto.randomUUID(), label: '', price_modifier: 0, stock: 0, image_url: '' }] }
        : g
    ));
  }
  function removeOption(groupKey: string, optKey: string) {
    onChange(groups.map((g) =>
      g._key === groupKey ? { ...g, options: g.options.filter((o) => o._key !== optKey) } : g
    ));
  }
  function updateOption(groupKey: string, optKey: string, field: keyof Omit<LocalOption, '_key' | 'id'>, value: string | number) {
    onChange(groups.map((g) =>
      g._key === groupKey
        ? { ...g, options: g.options.map((o) => o._key === optKey ? { ...o, [field]: value } : o) }
        : g
    ));
  }

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-brand-primary animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-muted">
          Variantes (taille, couleur…) avec prix, stock et image par option.
        </p>
        <button type="button" onClick={addGroup} className="btn-secondary text-sm gap-1.5"><Plus className="w-3.5 h-3.5" />Groupe</button>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-brand-border rounded-xl">
          <Layers className="w-8 h-8 text-brand-muted mx-auto mb-2" />
          <p className="text-sm text-brand-muted">Aucun groupe d'options</p>
          <button type="button" onClick={addGroup} className="btn-secondary mt-3 text-sm"><Plus className="w-3.5 h-3.5" />Ajouter un groupe</button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g._key} className="border border-brand-border rounded-xl overflow-hidden">
          {/* Group header */}
          <div className="flex items-center gap-2 bg-brand-surface px-3 py-2.5 border-b border-brand-border">
            <GripVertical className="w-4 h-4 text-brand-muted flex-shrink-0" />
            <input
              value={g.name}
              onChange={(e) => updateGroup(g._key, e.target.value)}
              placeholder="Nom du groupe (ex: Taille, Couleur…)"
              className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-brand-muted/60"
            />
            <button type="button" onClick={() => removeGroup(g._key)} className="p-1 text-brand-muted hover:text-brand-danger rounded transition flex-shrink-0"><X className="w-4 h-4" /></button>
          </div>

          {/* Options */}
          <div className="p-3 space-y-3">
            {g.options.length === 0 && (
              <p className="text-xs text-brand-muted italic">Aucune option — ajoutez-en ci-dessous</p>
            )}
            {g.options.map((o) => {
              const finalPrice = basePrice + o.price_modifier;
              return (
                <div key={o._key} className="border border-brand-border rounded-lg overflow-hidden">
                  {/* Row 1: label + price + delete */}
                  <div className="flex items-center gap-2 p-2 bg-brand-surface/50">
                    <input
                      value={o.label}
                      onChange={(e) => updateOption(g._key, o._key, 'label', e.target.value)}
                      placeholder="Label (ex: L, Rouge, 500g…)"
                      className="input text-sm flex-1 h-8 py-1"
                    />
                    <div className="relative flex-shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-brand-muted">±</span>
                      <input
                        type="number" step={50}
                        value={o.price_modifier}
                        onChange={(e) => updateOption(g._key, o._key, 'price_modifier', Number(e.target.value))}
                        className="input text-sm w-24 pl-6 h-8 py-1"
                        title="Modificateur de prix"
                      />
                    </div>
                    <span className="text-xs text-brand-muted whitespace-nowrap w-24 text-right flex-shrink-0">
                      = {formatPrice(Math.max(0, finalPrice))}
                    </span>
                    <button type="button" onClick={() => removeOption(g._key, o._key)} className="p-1 text-brand-muted hover:text-brand-danger rounded transition flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>

                  {/* Row 2: stock + image */}
                  <div className="flex items-start gap-2 p-2 pt-1.5">
                    {/* Stock */}
                    <div className="flex-shrink-0">
                      <label className="text-[10px] font-medium text-brand-muted uppercase tracking-wide block mb-1">Stock</label>
                      <input
                        type="number" min={0}
                        value={o.stock}
                        onChange={(e) => updateOption(g._key, o._key, 'stock', Number(e.target.value))}
                        className="input text-sm w-20 h-8 py-1"
                      />
                    </div>

                    {/* Image URL */}
                    <div className="flex-1">
                      <label className="text-[10px] font-medium text-brand-muted uppercase tracking-wide block mb-1">Photo de l'option (URL)</label>
                      <input
                        value={o.image_url}
                        onChange={(e) => updateOption(g._key, o._key, 'image_url', e.target.value)}
                        placeholder="https://…"
                        className="input text-sm h-8 py-1 w-full"
                        type="url"
                      />
                    </div>

                    {/* Image thumbnail */}
                    {o.image_url && (
                      <div className="flex-shrink-0 mt-4">
                        <img
                          src={o.image_url}
                          alt={o.label}
                          className="w-10 h-10 rounded-lg object-cover border border-brand-border"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => addOption(g._key)}
              className="w-full text-xs text-brand-primary hover:bg-brand-primary/5 border border-dashed border-brand-primary/30 rounded-lg py-1.5 transition flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" />Ajouter une option
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── BulkEditor ────────────────────────────────────────────────────────────────

const BULK_COLUMNS = ['Nom *', 'SKU', 'Marque', 'Catégorie', 'Prix *', 'Stock *', 'Qté lot', 'Prix lot'];

function BulkEditor({ products, categories, brands, onSaved }: {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  onSaved: () => void;
}) {
  const initRows = useCallback((): BulkRow[] =>
    products.map((p) => ({
      _key: p.id,
      id: p.id,
      name: p.name,
      sku: p.sku,
      brand_name: brands.find((b) => b.id === p.brand_id)?.name ?? '',
      category_name: categories.find((c) => c.id === p.category_id)?.name ?? '',
      price: String(p.price),
      stock: String(p.stock),
      bulk_quantity: String(p.bulk_quantity),
      bulk_price: String(p.bulk_price),
      is_active: p.is_active,
      track_stock: p.track_stock,
      _dirty: false,
    })),
  [products, brands, categories]);

  const [rows, setRows] = useState<BulkRow[]>(initRows);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  function updateCell(key: string, field: keyof BulkRow, value: string | boolean) {
    setRows((prev) => prev.map((r) =>
      r._key === key ? { ...r, [field]: value, _dirty: true, _error: undefined } : r
    ));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }

  function parseImport() {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n').filter((l) => l.trim());
    const parsed: BulkRow[] = lines.map((line) => {
      const sep = line.includes('\t') ? '\t' : ';';
      const cols = line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
      return {
        _key: crypto.randomUUID(),
        name: cols[0] ?? '',
        sku: cols[1] ?? '',
        brand_name: cols[2] ?? '',
        category_name: cols[3] ?? '',
        price: cols[4] ?? '0',
        stock: cols[5] ?? '0',
        bulk_quantity: cols[6] ?? '0',
        bulk_price: cols[7] ?? '0',
        is_active: true,
        track_stock: true,
        _dirty: true,
      };
    });
    setRows((prev) => [...prev, ...parsed]);
    setImportText('');
    setShowImport(false);
  }

  async function saveAll() {
    const dirty = rows.filter((r) => r._dirty && r.name.trim() && Number(r.price) >= 0);
    if (dirty.length === 0) return;
    setSaving(true); setSavedCount(null);

    let count = 0;
    for (const row of dirty) {
      const brandId = brands.find((b) => b.name.toLowerCase() === row.brand_name.toLowerCase())?.id ?? null;
      const categoryId = categories.find((c) => c.name.toLowerCase() === row.category_name.toLowerCase())?.id ?? null;
      const payload = {
        name: row.name.trim(),
        sku: row.sku.trim() || null,
        brand_id: brandId,
        category_id: categoryId,
        price: Number(row.price) || 0,
        stock: Number(row.stock) || 0,
        bulk_quantity: Number(row.bulk_quantity) || 0,
        bulk_price: Number(row.bulk_price) || 0,
        is_active: row.is_active,
        track_stock: row.track_stock,
        description: '',
        image_url: '',
        low_stock_threshold: 5,
      };

      if (row.id) {
        const { error } = await supabase.from('products').update(payload).eq('id', row.id);
        if (!error) { count++; setRows((prev) => prev.map((r) => r._key === row._key ? { ...r, _dirty: false, _error: undefined } : r)); }
        else setRows((prev) => prev.map((r) => r._key === row._key ? { ...r, _error: error.message } : r));
      } else {
        const { data, error } = await supabase.from('products').insert(payload).select().maybeSingle();
        if (!error && data) {
          count++;
          setRows((prev) => prev.map((r) => r._key === row._key ? { ...r, id: (data as Product).id, sku: (data as Product).sku, _dirty: false, _error: undefined } : r));
        } else if (error) {
          setRows((prev) => prev.map((r) => r._key === row._key ? { ...r, _error: error.message } : r));
        }
      }
    }

    setSaving(false); setSavedCount(count);
    onSaved();
  }

  const dirtyCount = rows.filter((r) => r._dirty && r.name.trim()).length;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport((v) => !v)} className="btn-secondary text-sm gap-1.5">
            <Upload className="w-3.5 h-3.5" />Importer CSV
          </button>
          <button onClick={addRow} className="btn-secondary text-sm gap-1.5"><Plus className="w-3.5 h-3.5" />Ligne</button>
        </div>
        <div className="flex items-center gap-2">
          {savedCount !== null && (
            <span className="text-sm text-brand-success flex items-center gap-1"><Check className="w-4 h-4" />{savedCount} enregistré(s)</span>
          )}
          <button onClick={saveAll} disabled={saving || dirtyCount === 0} className="btn-primary gap-2 text-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Enregistrer{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
          </button>
        </div>
      </div>

      {/* CSV import panel */}
      {showImport && (
        <div className="card p-4 mb-4 border-l-4 border-l-brand-info">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-sm">Importer depuis CSV ou tableur</p>
              <p className="text-xs text-brand-muted mt-0.5">Collez vos données (séparées par tabulation ou point-virgule). Colonnes : <span className="font-mono">Nom ; SKU ; Marque ; Catégorie ; Prix ; Stock ; Qté lot ; Prix lot</span></p>
            </div>
            <button onClick={() => setShowImport(false)} className="text-brand-muted hover:text-brand-dark"><X className="w-4 h-4" /></button>
          </div>
          <textarea
            value={importText} onChange={(e) => setImportText(e.target.value)}
            rows={5} className="input text-xs font-mono resize-none mb-2"
            placeholder={"Coca-Cola 33cl;COCA-001;Coca-Cola;Boissons;500;100;0;0\nFanta Orange;;Fanta;Boissons;450;80;0;0"} />
          <button onClick={parseImport} disabled={!importText.trim()} className="btn-primary text-sm">Ajouter ces lignes</button>
        </div>
      )}

      {/* Spreadsheet */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-brand-surface text-xs font-medium text-brand-muted uppercase tracking-wide">
              <tr>
                <th className="px-2 py-2 w-6"></th>
                {BULK_COLUMNS.map((c) => <th key={c} className="px-2 py-2 text-left whitespace-nowrap">{c}</th>)}
                <th className="px-2 py-2 text-center" title="Suivi de stock">Stock suivi</th>
                <th className="px-2 py-2 text-center">Actif</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {rows.map((row) => (
                <BulkRow key={row._key} row={row} onChange={(f, v) => updateCell(row._key, f, v)} onRemove={() => removeRow(row._key)} />
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-brand-muted text-sm">Aucune ligne — ajoutez-en ou importez un CSV</p>
              <button onClick={addRow} className="btn-primary mt-3 text-sm"><Plus className="w-4 h-4" />Ajouter une ligne</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BulkRow({ row, onChange, onRemove }: {
  row: BulkRow;
  onChange: (field: keyof BulkRow, value: string | boolean) => void;
  onRemove: () => void;
}) {
  const cellCls = 'input text-xs py-1.5 px-2 h-8 min-w-0';
  return (
    <tr className={`group ${row._error ? 'bg-brand-danger/5' : row._dirty ? 'bg-brand-warning/3' : ''}`}>
      <td className="px-2 py-1 text-center">
        {row._dirty && !row._error && <span className="w-1.5 h-1.5 bg-brand-warning rounded-full inline-block" title="Non enregistré" />}
        {row._error && <span className="w-1.5 h-1.5 bg-brand-danger rounded-full inline-block" title={row._error} />}
      </td>
      <td className="px-1 py-1"><input value={row.name} onChange={(e) => onChange('name', e.target.value)} className={`${cellCls} w-36`} placeholder="Nom…" /></td>
      <td className="px-1 py-1"><input value={row.sku} onChange={(e) => onChange('sku', e.target.value)} className={`${cellCls} w-24 font-mono`} placeholder="Auto" /></td>
      <td className="px-1 py-1"><input value={row.brand_name} onChange={(e) => onChange('brand_name', e.target.value)} className={`${cellCls} w-24`} placeholder="Marque" /></td>
      <td className="px-1 py-1"><input value={row.category_name} onChange={(e) => onChange('category_name', e.target.value)} className={`${cellCls} w-28`} placeholder="Catégorie" /></td>
      <td className="px-1 py-1"><input type="number" min={0} value={row.price} onChange={(e) => onChange('price', e.target.value)} className={`${cellCls} w-24`} /></td>
      <td className="px-1 py-1"><input type="number" min={0} value={row.stock} onChange={(e) => onChange('stock', e.target.value)} className={`${cellCls} w-20`} /></td>
      <td className="px-1 py-1"><input type="number" min={0} value={row.bulk_quantity} onChange={(e) => onChange('bulk_quantity', e.target.value)} className={`${cellCls} w-20`} /></td>
      <td className="px-1 py-1"><input type="number" min={0} value={row.bulk_price} onChange={(e) => onChange('bulk_price', e.target.value)} className={`${cellCls} w-24`} /></td>
      <td className="px-1 py-1 text-center">
        <input type="checkbox" checked={row.track_stock} onChange={(e) => onChange('track_stock', e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="px-1 py-1 text-center">
        <input type="checkbox" checked={row.is_active} onChange={(e) => onChange('is_active', e.target.checked)} className="w-4 h-4" />
      </td>
      <td className="px-1 py-1">
        <button onClick={onRemove} className="p-1 text-brand-muted hover:text-brand-danger rounded opacity-0 group-hover:opacity-100 transition"><X className="w-3.5 h-3.5" /></button>
      </td>
    </tr>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-6">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white border-b border-brand-border px-5 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-brand-surface rounded-lg transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 max-h-[75vh]">{children}</div>
      </div>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

export function ConfirmDialog({ title, message, onCancel, onConfirm }: {
  title: string; message: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-danger/10 rounded-full flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-5 h-5 text-brand-danger" /></div>
          <div><h3 className="font-semibold">{title}</h3><p className="text-sm text-brand-muted mt-1">{message}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-brand-danger hover:bg-brand-danger/90 text-white font-medium rounded-md transition">Confirmer</button>
        </div>
      </div>
    </div>
  );
}
