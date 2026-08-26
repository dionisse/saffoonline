import { useState } from 'react';
import { Loader2, Store, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { View } from '../lib/views';

export function AuthPage({ setView }: { setView: (v: View) => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, fullName, phone);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setView({ kind: 'shop' });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 lg:py-16">
      <button onClick={() => setView({ kind: 'shop' })} className="btn-ghost mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4" />Retour
      </button>
      <div className="card p-6 lg:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6 text-brand-primary" />
          </div>
          <h1 className="text-xl font-bold">{mode === 'signin' ? 'Bon retour !' : 'Créer un compte'}</h1>
          <p className="text-sm text-brand-muted mt-1">{mode === 'signin' ? 'Connectez-vous pour continuer' : 'Rejoignez BrasseriePro'}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <>
              <div><label className="block text-sm font-medium mb-1">Nom complet</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="input" /></div>
              <div><label className="block text-sm font-medium mb-1">Téléphone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="input" /></div>
            </>
          )}
          <div><label className="block text-sm font-medium mb-1">Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" className="input" autoComplete="email" /></div>
          <div><label className="block text-sm font-medium mb-1">Mot de passe</label><input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" className="input" minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></div>
          {error && <div className="bg-brand-danger/10 text-brand-danger text-sm p-2.5 rounded">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode === 'signin' ? 'Se connecter' : 'Créer le compte')}
          </button>
        </form>
        <div className="mt-5 pt-5 border-t border-brand-border text-center text-sm">
          {mode === 'signin' ? <>Pas de compte ?{' '}<button onClick={() => { setMode('signup'); setError(null); }} className="text-brand-primary font-medium hover:underline">S'inscrire</button></>
            : <>Déjà inscrit ?{' '}<button onClick={() => { setMode('signin'); setError(null); }} className="text-brand-primary font-medium hover:underline">Se connecter</button></>}
        </div>
      </div>
    </div>
  );
}
