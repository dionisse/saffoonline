import { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck, Plus, Trash2, Edit2, Loader2, X, Check,
  LayoutDashboard, Boxes, Warehouse, ShoppingBasket,
  Package, ListOrdered, CreditCard, BarChart3, ScanBarcode,
  UserCog, RefreshCw, AlertTriangle, Search, ChevronDown, ChevronUp,
  UserPlus, Eye, EyeOff, Copy, CheckCircle2, KeyRound, Mail,
  Megaphone, Settings, TicketPercent,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Section, AdminModule, Profile } from '../../lib/database.types';

// ─── Module definitions ───────────────────────────────────────────────────────

interface ModuleDef {
  key: AdminModule;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const ALL_MODULES: ModuleDef[] = [
  { key: 'admin-dashboard',  label: 'Tableau de bord',    icon: <LayoutDashboard className="w-4 h-4" />,  group: 'Vue générale' },
  { key: 'admin-pos',        label: 'Point de vente',      icon: <ScanBarcode className="w-4 h-4" />,      group: 'Ventes' },
  { key: 'admin-orders',     label: 'Commandes',           icon: <ListOrdered className="w-4 h-4" />,      group: 'Ventes' },
  { key: 'admin-payments',   label: 'Paiements',           icon: <CreditCard className="w-4 h-4" />,       group: 'Ventes' },
  { key: 'admin-products',   label: 'Produits',            icon: <Boxes className="w-4 h-4" />,            group: 'Catalogue' },
  { key: 'admin-categories', label: 'Catégories',          icon: <Package className="w-4 h-4" />,          group: 'Catalogue' },
  { key: 'admin-stock',      label: 'Gestion des stocks',  icon: <Warehouse className="w-4 h-4" />,        group: 'Stock' },
  { key: 'admin-purchases',  label: 'Approvisionnements',  icon: <ShoppingBasket className="w-4 h-4" />,   group: 'Stock' },
  { key: 'admin-reports',    label: 'Rapports & stats',    icon: <BarChart3 className="w-4 h-4" />,        group: 'Analyse' },
  { key: 'admin-sections',   label: 'Sections & accès',    icon: <ShieldCheck className="w-4 h-4" />,      group: 'Administration' },
  { key: 'admin-banners',    label: 'Bannières & promos',   icon: <Megaphone className="w-4 h-4" />,        group: 'Administration' },
  { key: 'admin-promos',     label: 'Codes promo partenaires', icon: <TicketPercent className="w-4 h-4" />,  group: 'Administration' },
  { key: 'admin-settings',   label: 'Paramètres',          icon: <Settings className="w-4 h-4" />,         group: 'Administration' },
];

const MODULE_GROUPS = [...new Set(ALL_MODULES.map((m) => m.group))];
const COLORS = ['#714B67','#017E84','#28A745','#FFC107','#DC3545','#17A2B8','#6C757D','#343a40','#e83e8c','#6610f2'];

function genPassword(len = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface SectionWithPerms extends Section {
  section_permissions: { module: string }[];
}

interface CreatedCredentials {
  email: string;
  password: string;
  full_name: string;
}

// ─── AdminSections ────────────────────────────────────────────────────────────

export function AdminSections() {
  const { user } = useAuth();
  const [sections, setSections] = useState<SectionWithPerms[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Section form
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionWithPerms | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formModules, setFormModules] = useState<Set<AdminModule>>(new Set());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Member panels
  const [assigningSection, setAssigningSection] = useState<SectionWithPerms | null>(null);
  const [creatingUserSection, setCreatingUserSection] = useState<SectionWithPerms | null>(null);

  // Credentials modal (shown after creating a user)
  const [createdCreds, setCreatedCreds] = useState<CreatedCredentials | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [secRes, profRes] = await Promise.all([
      supabase.from('sections').select('*, section_permissions(module)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').in('role', ['admin','cashier','employee']).order('full_name'),
    ]);
    setSections((secRes.data as SectionWithPerms[]) ?? []);
    setAllProfiles((profRes.data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Section form ──────────────────────────────────────────────────────────
  function openCreate() {
    setEditingSection(null); setFormName(''); setFormDesc('');
    setFormColor(COLORS[0]); setFormModules(new Set()); setFormError(null);
    setShowForm(true);
  }
  function openEdit(s: SectionWithPerms) {
    setEditingSection(s); setFormName(s.name); setFormDesc(s.description);
    setFormColor(s.color || COLORS[0]);
    setFormModules(new Set(s.section_permissions.map((p) => p.module as AdminModule)));
    setFormError(null); setShowForm(true);
  }
  function toggleModule(m: AdminModule) {
    setFormModules((prev) => { const n = new Set(prev); if (n.has(m)) n.delete(m); else n.add(m); return n; });
  }
  function toggleGroup(group: string) {
    const gm = ALL_MODULES.filter((m) => m.group === group).map((m) => m.key);
    const all = gm.every((m) => formModules.has(m));
    setFormModules((prev) => { const n = new Set(prev); if (all) { gm.forEach((m) => n.delete(m)); } else { gm.forEach((m) => n.add(m)); } return n; });
  }

  async function saveSection() {
    if (!formName.trim()) { setFormError('Le nom est requis.'); return; }
    setSaving(true); setFormError(null);
    let sectionId: string;
    if (editingSection) {
      const { error } = await supabase.from('sections').update({
        name: formName.trim(), description: formDesc.trim(), color: formColor,
        updated_at: new Date().toISOString(),
      }).eq('id', editingSection.id);
      if (error) { setSaving(false); setFormError(error.message); return; }
      sectionId = editingSection.id;
      await supabase.from('section_permissions').delete().eq('section_id', sectionId);
    } else {
      const { data, error } = await supabase.from('sections').insert({
        name: formName.trim(), description: formDesc.trim(), color: formColor, created_by: user?.id ?? null,
      }).select().maybeSingle();
      if (error || !data) { setSaving(false); setFormError(error?.message ?? 'Erreur'); return; }
      sectionId = (data as { id: string }).id;
    }
    if (formModules.size > 0) {
      const { error } = await supabase.from('section_permissions')
        .insert([...formModules].map((m) => ({ section_id: sectionId, module: m })));
      if (error) { setSaving(false); setFormError(error.message); return; }
    }
    setSaving(false); setShowForm(false); load();
  }

  async function deleteSection(id: string) {
    if (!confirm('Supprimer cette section ?')) return;
    await supabase.from('sections').delete().eq('id', id);
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  // ── Member management ─────────────────────────────────────────────────────
  async function assignMember(profileId: string, sectionId: string | null) {
    await supabase.from('profiles').update({ section_id: sectionId }).eq('id', profileId);
    setAllProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, section_id: sectionId } : p));
  }
  async function setMemberRole(profileId: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', profileId);
    setAllProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, role: role as Profile['role'] } : p));
  }
  async function removeMember(profileId: string) {
    await supabase.from('profiles').update({ section_id: null }).eq('id', profileId);
    setAllProfiles((prev) => prev.map((p) => p.id === profileId ? { ...p, section_id: null } : p));
  }

  const filtered = sections.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const membersOf = (sectionId: string) => allProfiles.filter((p) => p.section_id === sectionId);
  const unassigned = allProfiles.filter((p) => !p.section_id && p.role !== 'admin');

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 page-enter">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-primary" />Sections & Accès
          </h1>
          <p className="text-sm text-brand-muted mt-1">Gérez les profils d'accès et créez des comptes pour vos collaborateurs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary gap-1.5 text-sm"><RefreshCw className="w-3.5 h-3.5" />Actualiser</button>
          <button onClick={openCreate} className="btn-primary gap-1.5 text-sm"><Plus className="w-4 h-4" />Nouvelle section</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Sections', value: sections.length, color: 'text-brand-primary' },
          { label: 'Membres assignés', value: allProfiles.filter((p) => p.section_id).length, color: '' },
          { label: 'Non assignés', value: unassigned.length, color: 'text-brand-warning' },
          { label: 'Modules', value: ALL_MODULES.length, color: '' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-brand-muted mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Section form */}
      {showForm && (
        <div className="card mb-6 border-l-4 overflow-hidden" style={{ borderLeftColor: formColor }}>
          <div className="p-4 border-b border-brand-border bg-brand-surface flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-primary" />
              {editingSection ? 'Modifier la section' : 'Nouvelle section'}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-brand-muted hover:text-brand-dark"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-5">
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium mb-1">Nom de la section *</label>
                <input className="input text-sm" placeholder="Ex: Vendeur, Caissier…" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Description</label>
                <input className="input text-sm" placeholder="Rôle et responsabilités…" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium mb-2">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setFormColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${formColor === c ? 'border-brand-dark scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-medium">Modules autorisés</label>
                <span className="text-xs text-brand-muted">{formModules.size} sélectionné(s)</span>
              </div>
              <div className="space-y-3">
                {MODULE_GROUPS.map((group) => {
                  const gm = ALL_MODULES.filter((m) => m.group === group);
                  const allSel = gm.every((m) => formModules.has(m.key));
                  const someSel = gm.some((m) => formModules.has(m.key));
                  return (
                    <div key={group} className="border border-brand-border rounded-xl overflow-hidden">
                      <button type="button" onClick={() => toggleGroup(group)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition ${allSel ? 'bg-brand-primary/8 text-brand-primary' : someSel ? 'bg-brand-warning/5' : 'bg-brand-surface'}`}>
                        <span>{group}</span>
                        <div className="flex items-center gap-2">
                          {allSel && <span className="text-xs bg-brand-primary text-white px-2 py-0.5 rounded-full">Tout</span>}
                          {someSel && !allSel && <span className="text-xs bg-brand-warning/20 text-brand-warning px-2 py-0.5 rounded-full">Partiel</span>}
                        </div>
                      </button>
                      <div className="grid sm:grid-cols-2 border-t border-brand-border">
                        {gm.map((mod) => (
                          <button key={mod.key} type="button" onClick={() => toggleModule(mod.key)}
                            className={`flex items-center gap-3 px-4 py-3 text-sm text-left transition ${formModules.has(mod.key) ? 'bg-brand-primary/5' : 'hover:bg-brand-surface'}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${formModules.has(mod.key) ? 'bg-brand-primary border-brand-primary' : 'border-brand-border'}`}>
                              {formModules.has(mod.key) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-brand-muted">{mod.icon}</span>
                            <span className={`font-medium ${formModules.has(mod.key) ? 'text-brand-primary' : ''}`}>{mod.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {formError && (
              <div className="flex items-center gap-2 text-brand-danger text-sm bg-brand-danger/5 border border-brand-danger/20 rounded-lg px-3 py-2 mb-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{formError}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveSection} disabled={saving} className="btn-primary gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingSection ? 'Enregistrer' : 'Créer la section'}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted pointer-events-none" />
        <input className="input pl-9 text-sm" placeholder="Rechercher une section…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-brand-primary animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {filtered.map((section) => {
            const members = membersOf(section.id);
            const perms = section.section_permissions.map((p) => p.module);
            const isExpanded = expandedId === section.id;
            const isAssigning = assigningSection?.id === section.id;
            const isCreating = creatingUserSection?.id === section.id;

            return (
              <div key={section.id} className="card overflow-hidden transition-shadow duration-200 hover:shadow-md">
                {/* Header row */}
                <div className="flex items-start justify-between p-4 gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-sm"
                      style={{ backgroundColor: section.color || COLORS[0] }}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold flex items-center gap-2 flex-wrap">
                        {section.name}
                        <span className="text-xs text-brand-muted font-normal bg-brand-surface px-2 py-0.5 rounded-full border border-brand-border">
                          {members.length} membre{members.length !== 1 ? 's' : ''}
                        </span>
                      </h3>
                      {section.description && <p className="text-xs text-brand-muted mt-0.5">{section.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {perms.length === 0 ? (
                          <span className="badge bg-brand-danger/10 text-brand-danger text-xs">Aucun accès</span>
                        ) : (
                          ALL_MODULES.filter((m) => perms.includes(m.key)).map((m) => (
                            <span key={m.key} className="inline-flex items-center gap-1 badge bg-brand-surface text-brand-muted text-xs border border-brand-border">
                              {m.icon}<span>{m.label}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(section)} title="Modifier"
                      className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-md transition">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Create user in this section */}
                    <button
                      onClick={() => { setCreatingUserSection(isCreating ? null : section); setAssigningSection(null); }}
                      title="Créer un compte"
                      className={`p-1.5 rounded-md transition ${isCreating ? 'bg-brand-success/10 text-brand-success' : 'text-brand-muted hover:text-brand-success hover:bg-brand-success/10'}`}>
                      <UserPlus className="w-4 h-4" />
                    </button>
                    {/* Assign existing user */}
                    <button
                      onClick={() => { setAssigningSection(isAssigning ? null : section); setCreatingUserSection(null); }}
                      title="Assigner un membre existant"
                      className={`p-1.5 rounded-md transition ${isAssigning ? 'bg-brand-info/10 text-brand-info' : 'text-brand-muted hover:text-brand-info hover:bg-brand-info/10'}`}>
                      <UserCog className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteSection(section.id)} title="Supprimer"
                      className="p-1.5 text-brand-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-md transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedId(isExpanded ? null : section.id)}
                      className="p-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-surface rounded-md transition">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Member list */}
                {isExpanded && (
                  <div className="border-t border-brand-border bg-brand-surface/50 px-4 py-3">
                    <p className="text-xs font-semibold text-brand-muted uppercase mb-2 tracking-wide">Membres ({members.length})</p>
                    {members.length === 0 ? (
                      <p className="text-sm text-brand-muted italic">Aucun membre — créez ou assignez des comptes</p>
                    ) : (
                      <div className="space-y-1.5">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between bg-white border border-brand-border rounded-lg px-3 py-2 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ backgroundColor: section.color || COLORS[0] }}>
                                {m.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm">{m.full_name}</p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {m.employee_number && <span className="text-xs text-brand-muted">#{m.employee_number}</span>}
                                  <span className={`badge text-xs ${m.role === 'cashier' ? 'bg-brand-info/15 text-brand-info' : m.role === 'employee' ? 'bg-brand-success/15 text-brand-success' : 'bg-brand-muted/15 text-brand-muted'}`}>
                                    {m.role}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => removeMember(m.id)} className="text-xs text-brand-danger hover:underline flex-shrink-0">Retirer</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Create user panel */}
                {isCreating && (
                  <CreateUserPanel
                    section={section}
                    onCreated={(creds) => { setCreatedCreds(creds); setCreatingUserSection(null); load(); }}
                    onClose={() => setCreatingUserSection(null)}
                  />
                )}

                {/* Assign existing user panel */}
                {isAssigning && (
                  <MemberAssignPanel
                    section={section}
                    allProfiles={allProfiles}
                    onAssign={assignMember}
                    onRoleChange={setMemberRole}
                    onClose={() => setAssigningSection(null)}
                  />
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <ShieldCheck className="w-10 h-10 text-brand-muted mx-auto mb-3" />
              <p className="font-medium">Aucune section créée</p>
              <p className="text-sm text-brand-muted mt-1">Créez une section pour définir les accès d'un groupe d'utilisateurs</p>
              <button onClick={openCreate} className="btn-primary mt-4"><Plus className="w-4 h-4" />Créer une section</button>
            </div>
          )}
        </div>
      )}

      {/* Unassigned staff */}
      {unassigned.length > 0 && (
        <div className="mt-6 card overflow-hidden border-l-4 border-l-brand-warning">
          <div className="p-4 bg-brand-warning/5 border-b border-brand-border">
            <p className="font-semibold flex items-center gap-2 text-brand-warning">
              <AlertTriangle className="w-4 h-4" />Utilisateurs sans section ({unassigned.length})
            </p>
            <p className="text-xs text-brand-muted mt-0.5">Ces utilisateurs n'ont accès à aucun module admin.</p>
          </div>
          <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {unassigned.map((p) => (
              <UnassignedUserRow key={p.id} profile={p} sections={sections} onAssign={assignMember} onRoleChange={setMemberRole} />
            ))}
          </div>
        </div>
      )}

      {/* Credentials modal */}
      {createdCreds && (
        <CredentialsModal creds={createdCreds} onClose={() => setCreatedCreds(null)} />
      )}
    </div>
  );
}

// ─── CreateUserPanel ──────────────────────────────────────────────────────────

function CreateUserPanel({ section, onCreated, onClose }: {
  section: SectionWithPerms;
  onCreated: (creds: CreatedCredentials) => void;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(genPassword());
  const [empNum, setEmpNum] = useState('');
  const [role, setRole] = useState<'employee' | 'cashier'>('employee');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { session } = useAuth();

  async function handleCreate() {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Nom, email et mot de passe sont requis.'); return;
    }
    setSaving(true); setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const res = await fetch(`${supabaseUrl}/functions/v1/create-staff-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role,
        section_id: section.id,
        employee_number: empNum.trim(),
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok || json.error) {
      setError(json.error || 'Erreur lors de la création du compte.'); return;
    }

    onCreated({ email: email.trim().toLowerCase(), password, full_name: fullName.trim() });
  }

  return (
    <div className="border-t border-brand-border bg-brand-surface/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-brand-success" />
          Créer un compte — <span style={{ color: section.color }}>{section.name}</span>
        </p>
        <button onClick={onClose} className="text-brand-muted hover:text-brand-dark"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1">Nom complet *</label>
          <input className="input text-sm" placeholder="Jean Dupont" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Adresse e-mail *</label>
          <input className="input text-sm" type="email" placeholder="jean@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 flex items-center gap-1">
            Mot de passe *
            <button type="button" onClick={() => setPassword(genPassword())} className="ml-1 text-brand-primary text-xs hover:underline">Générer</button>
          </label>
          <div className="relative">
            <input className="input text-sm pr-9 font-mono" type={showPwd ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPwd((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-dark">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">N° employé (optionnel)</label>
          <input className="input text-sm" placeholder="EMP-001" value={empNum} onChange={(e) => setEmpNum(e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium mb-1">Rôle</label>
        <div className="flex gap-2">
          {(['employee', 'cashier'] as const).map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${role === r ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-brand-border hover:border-brand-primary'}`}>
              {r === 'employee' ? 'Employé' : 'Caissier'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-brand-danger text-sm bg-brand-danger/5 border border-brand-danger/20 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleCreate} disabled={saving} className="btn-primary gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Créer le compte
        </button>
        <button onClick={onClose} className="btn-secondary">Annuler</button>
      </div>
    </div>
  );
}

// ─── CredentialsModal ─────────────────────────────────────────────────────────

function CredentialsModal({ creds, onClose }: { creds: CreatedCredentials; onClose: () => void }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copy(val: string, field: string) {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-scale">
        {/* Header */}
        <div className="bg-brand-success p-5 text-white text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
          <h2 className="text-lg font-bold">Compte créé avec succès !</h2>
          <p className="text-white/80 text-sm mt-1">Transmettez ces identifiants à <span className="font-semibold">{creds.full_name}</span></p>
        </div>

        {/* Credentials */}
        <div className="p-5 space-y-3">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-4 space-y-3">
            <CredField label="Email" value={creds.email} field="email" copiedField={copiedField} onCopy={copy}
              icon={<Mail className="w-4 h-4 text-brand-muted" />} />
            <div className="border-t border-brand-border pt-3">
              <CredField label="Mot de passe" value={creds.password} field="password" copiedField={copiedField} onCopy={copy}
                icon={<KeyRound className="w-4 h-4 text-brand-muted" />} mono />
            </div>
          </div>

          <div className="bg-brand-warning/8 border border-brand-warning/25 rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-brand-warning mt-0.5 flex-shrink-0" />
            <p className="text-xs text-brand-dark">
              Notez et transmettez ce mot de passe maintenant. Il ne sera plus affiché après fermeture de cette fenêtre.
            </p>
          </div>

          <button
            onClick={() => {
              copy(`Email: ${creds.email}\nMot de passe: ${creds.password}`, 'all');
            }}
            className="btn-secondary w-full gap-2 text-sm">
            {copiedField === 'all' ? <CheckCircle2 className="w-4 h-4 text-brand-success" /> : <Copy className="w-4 h-4" />}
            {copiedField === 'all' ? 'Copié !' : 'Copier les deux identifiants'}
          </button>

          <button onClick={onClose} className="btn-primary w-full">Fermer</button>
        </div>
      </div>
    </div>
  );
}

function CredField({ label, value, field, copiedField, onCopy, icon, mono = false }: {
  label: string; value: string; field: string; copiedField: string | null;
  onCopy: (v: string, f: string) => void; icon: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <div className="min-w-0">
          <p className="text-xs text-brand-muted">{label}</p>
          <p className={`text-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
      </div>
      <button onClick={() => onCopy(value, field)}
        className={`p-1.5 rounded-md flex-shrink-0 transition ${copiedField === field ? 'text-brand-success' : 'text-brand-muted hover:text-brand-primary hover:bg-brand-surface'}`}>
        {copiedField === field ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ─── MemberAssignPanel ────────────────────────────────────────────────────────

function MemberAssignPanel({ section, allProfiles, onAssign, onRoleChange, onClose }: {
  section: SectionWithPerms;
  allProfiles: Profile[];
  onAssign: (profileId: string, sectionId: string | null) => void;
  onRoleChange: (profileId: string, role: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const available = allProfiles.filter((p) =>
    p.section_id !== section.id && p.role !== 'admin' &&
    (!search || p.full_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="border-t border-brand-border p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <UserCog className="w-4 h-4 text-brand-info" />Assigner un membre existant
        </p>
        <button onClick={onClose} className="text-brand-muted hover:text-brand-dark"><X className="w-4 h-4" /></button>
      </div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-muted pointer-events-none" />
        <input className="input pl-8 text-xs py-1.5" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {available.length === 0 ? (
        <p className="text-xs text-brand-muted italic text-center py-3">Aucun utilisateur disponible</p>
      ) : (
        <div className="space-y-1.5 max-h-52 overflow-auto">
          {available.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-brand-surface border border-brand-border rounded-lg px-3 py-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-brand-primary/15 text-brand-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {p.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{p.full_name}</p>
                  <span className={`badge text-xs ${p.role === 'cashier' ? 'bg-brand-info/15 text-brand-info' : 'bg-brand-success/15 text-brand-success'}`}>{p.role}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select className="text-xs border border-brand-border rounded px-1.5 py-1 bg-white"
                  value={p.role} onChange={(e) => onRoleChange(p.id, e.target.value)}>
                  <option value="employee">Employé</option>
                  <option value="cashier">Caissier</option>
                </select>
                <button onClick={() => onAssign(p.id, section.id)}
                  className="px-2 py-1 bg-brand-primary text-white text-xs rounded-md hover:bg-brand-primary-dark transition">
                  Assigner
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── UnassignedUserRow ────────────────────────────────────────────────────────

function UnassignedUserRow({ profile, sections, onAssign, onRoleChange }: {
  profile: Profile; sections: SectionWithPerms[];
  onAssign: (profileId: string, sectionId: string | null) => void;
  onRoleChange: (profileId: string, role: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 bg-white border border-brand-border rounded-lg px-3 py-2">
      <div className="w-7 h-7 rounded-full bg-brand-muted/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {profile.full_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{profile.full_name}</p>
      </div>
      <select className="text-xs border border-brand-border rounded px-1.5 py-1 bg-white"
        value={profile.role} onChange={(e) => onRoleChange(profile.id, e.target.value)}>
        <option value="employee">Employé</option>
        <option value="cashier">Caissier</option>
      </select>
      <select className="text-xs border border-brand-border rounded px-1.5 py-1 bg-white"
        value="" onChange={(e) => { if (e.target.value) onAssign(profile.id, e.target.value); }}>
        <option value="">Assigner…</option>
        {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );
}
