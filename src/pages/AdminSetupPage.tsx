import { useState } from 'react';
import { Shield, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { View } from '../lib/views';

const ADMIN_SETUP_CODE = 'G@dwinadmin123@@';

export function AdminSetupPage({ setView }: { setView: (v: View) => void }) {
  const { user, profile } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isStaff = profile?.role === 'admin' || profile?.role === 'cashier' || profile?.role === 'employee';

  if (isStaff) {
    setView({ kind: 'admin-dashboard' });
    return null;
  }

  async function grantAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setError('Vous devez être connecté.'); return; }
    if (code !== ADMIN_SETUP_CODE) { setError('Code incorrect. Vérifiez le code administrateur.'); return; }
    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);

    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <button onClick={() => setView({ kind: 'shop' })} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />Retour
      </button>

      <div className="card overflow-hidden">
        <div className="bg-brand-primary p-6 text-white text-center">
          <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold">Espace Administrateur</h1>
          <p className="text-white/75 text-sm mt-1">Accès réservé aux gestionnaires du magasin</p>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-brand-success mx-auto mb-3" />
              <p className="font-semibold text-lg">Accès administrateur activé !</p>
              <p className="text-sm text-brand-muted mt-1">Redirection en cours...</p>
            </div>
          ) : !user ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-10 h-10 text-brand-warning mx-auto mb-3" />
              <p className="font-medium mb-3">Connexion requise</p>
              <button onClick={() => setView({ kind: 'auth' })} className="btn-primary">Se connecter</button>
            </div>
          ) : (
            <>
              <div className="bg-brand-surface rounded-lg p-4 mb-5 text-sm">
                <p className="font-medium mb-2 flex items-center gap-2"><KeyRound className="w-4 h-4 text-brand-primary" />Code d'activation requis</p>
                <p className="text-brand-muted">Entrez le code d'activation fourni par l'administrateur système pour débloquer l'accès.</p>
                <div className="mt-3 p-2 bg-brand-primary/10 rounded text-xs text-brand-primary font-medium">
                  Contactez l'administrateur système pour obtenir le code d'accès.
                </div>
              </div>

              <form onSubmit={grantAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Code d'accès administrateur</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Entrez le code..."
                    className="input font-mono text-base"
                    maxLength={30}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-2 bg-brand-danger/10 text-brand-danger text-sm p-3 rounded">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading || !code} className="btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activer l\'accès administrateur'}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-brand-border">
                <p className="text-xs text-brand-muted text-center font-medium mb-3">Rôles disponibles</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { role: 'Admin', desc: 'Accès complet', color: 'bg-brand-primary/10 text-brand-primary' },
                    { role: 'Caissier', desc: 'POS + commandes', color: 'bg-brand-info/10 text-brand-info' },
                    { role: 'Client', desc: 'Achat en ligne', color: 'bg-brand-success/10 text-brand-success' },
                  ].map((r) => (
                    <div key={r.role} className={`text-center p-2 rounded-lg text-xs ${r.color}`}>
                      <p className="font-semibold">{r.role}</p>
                      <p className="opacity-80 mt-0.5">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
