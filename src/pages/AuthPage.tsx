import { useState, useEffect } from 'react';
import {
  Loader2, ArrowLeft, Lock, Mail, Phone, User, KeyRound,
  AlertTriangle, CheckCircle2, Eye, EyeOff, ShieldAlert, Clock,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStoreSettings } from '../contexts/StoreSettingsContext';
import { checkLockoutStatus, recordFailedAttempt, recordSuccessfulLogin } from '../lib/authRateLimiter';
import type { View } from '../lib/views';

export function AuthPage({ setView }: { setView: (v: View) => void }) {
  const { signIn, signUp, resetPassword, updatePassword, isPasswordRecovery, clearRecoveryMode } = useAuth();
  const { settings } = useStoreSettings();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(
    isPasswordRecovery ? 'reset' : 'signin'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lockout / Rate limiting state
  const [isLocked, setIsLocked] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [lockoutMinutes, setLockoutMinutes] = useState(5);

  const whatsappNumber = settings.whatsapp_number || '+229 97 20 40 60';
  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');

  // If password recovery URL is detected, automatically switch to 'reset' mode
  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('reset');
      setError(null);
    }
  }, [isPasswordRecovery]);

  // Check lockout status whenever email changes or component mounts
  useEffect(() => {
    if (!email.trim() || mode !== 'signin') {
      setIsLocked(false);
      setRemainingSeconds(0);
      return;
    }

    const status = checkLockoutStatus(email);
    setIsLocked(status.isLocked);
    setRemainingSeconds(status.remainingSeconds);
    if (status.lockoutMinutes > 0) setLockoutMinutes(status.lockoutMinutes);
  }, [email, mode]);

  // Active live countdown timer when locked out
  useEffect(() => {
    if (!isLocked || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, remainingSeconds]);

  // Format MM:SS for the lockout countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')} min ${String(secs).padStart(2, '0')} sec`;
  };

  // Handle Form Submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // ── 1. SIGN IN (with rate limiting / lockout check) ──
    if (mode === 'signin') {
      const status = checkLockoutStatus(email);
      if (status.isLocked) {
        setIsLocked(true);
        setRemainingSeconds(status.remainingSeconds);
        setLockoutMinutes(status.lockoutMinutes);
        setError(
          `Compte temporairement bloqué (5 tentatives erronées). Veuillez patienter ${formatCountdown(status.remainingSeconds)} avant de réessayer.`
        );
        return;
      }

      setLoading(true);
      const res = await signIn(email, password);
      setLoading(false);

      if (res.error) {
        // Record failed attempt and evaluate if 5-attempt threshold is reached
        const lockResult = recordFailedAttempt(email);

        if (lockResult.isNowLocked) {
          setIsLocked(true);
          setRemainingSeconds(lockResult.remainingSeconds);
          setLockoutMinutes(lockResult.lockoutMinutes);
          setError(
            `5 tentatives de mot de passe erroné enregistrées ! Par mesure de sécurité, votre accès est suspendu pendant ${lockResult.lockoutMinutes} minutes. Vous pouvez réinitialiser votre mot de passe ci-dessous.`
          );
        } else {
          const remainingAttempts = lockResult.maxAttempts - lockResult.failedAttempts;
          setError(
            `Mot de passe ou email incorrect. Attention : il vous reste ${remainingAttempts} tentative(s) avant un blocage de sécurité de 5 à 15 minutes.`
          );
        }
        return;
      }

      // Successful login -> Clear lockout penalties
      recordSuccessfulLogin(email);
      setView({ kind: 'shop' });
      return;
    }

    // ── 2. SIGN UP ──
    if (mode === 'signup') {
      setLoading(true);
      const res = await signUp(email, password, fullName, phone);
      setLoading(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      setView({ kind: 'shop' });
      return;
    }

    // ── 3. FORGOT PASSWORD (Send reset link) ──
    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Veuillez renseigner votre adresse e-mail.');
        return;
      }

      setLoading(true);
      const res = await resetPassword(email);
      setLoading(false);

      if (res.error) {
        // Even if supabase returns an error or unconfigured email provider, give clear instruction
        setError(`Impossible d'envoyer l'e-mail : ${res.error}`);
        return;
      }

      setSuccessMsg(
        `Un lien de réinitialisation a été envoyé à ${email}. Veuillez vérifier votre boîte de réception ainsi que vos courriers indésirables (spams).`
      );
      return;
    }

    // ── 4. RESET PASSWORD (Set new password) ──
    if (mode === 'reset') {
      if (password.length < 6) {
        setError('Le mot de passe doit comporter au moins 6 caractères.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les deux mots de passe ne correspondent pas.');
        return;
      }

      setLoading(true);
      const res = await updatePassword(password);
      setLoading(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      // Reset lockout after successful password recovery
      recordSuccessfulLogin(email);
      clearRecoveryMode();
      setSuccessMsg('Votre mot de passe a été mis à jour avec succès ! Vous pouvez maintenant vous connecter.');
      setTimeout(() => {
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      }, 2500);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 lg:py-14 page-enter">
      {/* Back button */}
      <button
        onClick={() => setView({ kind: 'shop' })}
        className="btn-ghost mb-4 -ml-2 text-xs font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />Retour à la boutique
      </button>

      {/* Main Auth Card (Electro aesthetic) */}
      <div className="card p-6 sm:p-8 shadow-xl border border-[#E4E7ED] bg-white rounded-2xl">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-[#D10024] mb-3 shadow-inner">
            {mode === 'forgot' ? (
              <KeyRound className="w-7 h-7" />
            ) : mode === 'reset' ? (
              <Lock className="w-7 h-7" />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>

          <h1 className="text-2xl font-black text-[#2B2D42] uppercase tracking-tight">
            {mode === 'signin' && 'Connexion Client'}
            {mode === 'signup' && 'Créer un Compte'}
            {mode === 'forgot' && 'Mot de Passe Oublié'}
            {mode === 'reset' && 'Nouveau Mot de Passe'}
          </h1>

          <p className="text-xs text-[#8D99AE] mt-1.5 max-w-sm mx-auto">
            {mode === 'signin' && 'Accédez à vos commandes, vos tarifs de gros et vos favoris.'}
            {mode === 'signup' && 'Rejoignez SAFFO ONLINE pour commander vos boissons au prix dépôt au Bénin.'}
            {mode === 'forgot' && 'Saisissez votre e-mail pour recevoir un lien sécurisé de réinitialisation.'}
            {mode === 'reset' && 'Choisissez un mot de passe sécurisé pour votre compte.'}
          </p>
        </div>

        {/* ── SECURITY LOCKOUT BANNER (5 to 15 minutes patience) ───────────── */}
        {isLocked && mode === 'signin' && (
          <div className="mb-5 p-4 bg-red-50 border-2 border-[#D10024] rounded-xl text-left animate-fade-in-up">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-[#D10024] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-extrabold text-sm text-[#D10024] uppercase tracking-wide">
                  Compte temporairement bloqué
                </p>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                  5 tentatives consécutives de mot de passe erroné ont été détectées. Par mesure de sécurité contre les accès non autorisés, la connexion est bloquée pendant <strong>{lockoutMinutes} minutes</strong>.
                </p>
                
                {/* Live Countdown Clock */}
                <div className="mt-3 flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-red-200 w-fit shadow-sm">
                  <Clock className="w-4 h-4 text-[#D10024] animate-spin" />
                  <span className="text-xs font-bold text-gray-900 font-mono">
                    Temps restant : {formatCountdown(remainingSeconds)}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-red-100 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="font-bold text-[#D10024] hover:underline"
                  >
                    Mot de passe oublié ? Réinitialiser maintenant →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Error Alert */}
        {error && !isLocked && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#D10024] text-xs font-medium rounded-xl flex items-start gap-2 animate-fade-in-up">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl flex items-start gap-2.5 animate-fade-in-up">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{successMsg}</div>
          </div>
        )}

        {/* ── AUTH FORM ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Sign Up Fields: Full Name & Phone */}
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Nom complet *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Ex: Jean Dossou"
                    className="input pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                  Numéro de téléphone (Bénin) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    required
                    placeholder="+229 97 00 00 00"
                    className="input pl-9"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email field (all modes except reset) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Adresse E-mail *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  placeholder="votre-email@exemple.com"
                  className="input pl-9"
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          {/* Password field (signin, signup, reset) */}
          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase text-gray-700">
                  {mode === 'reset' ? 'Nouveau mot de passe *' : 'Mot de passe *'}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    className="text-xs font-bold text-[#D10024] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  placeholder="••••••••"
                  className="input pl-9 pr-10"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Password confirmation for reset mode */}
          {mode === 'reset' && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                Confirmer le nouveau mot de passe *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  placeholder="••••••••"
                  className="input pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (mode === 'signin' && isLocked)}
            className="btn-electro w-full py-3 text-xs tracking-wider font-extrabold uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Traitement en cours...
              </span>
            ) : mode === 'signin' ? (
              isLocked ? `Patienter (${formatCountdown(remainingSeconds)})` : 'Se connecter'
            ) : mode === 'signup' ? (
              'Créer mon compte'
            ) : mode === 'forgot' ? (
              'Envoyer le lien de réinitialisation'
            ) : (
              'Enregistrer mon nouveau mot de passe'
            )}
          </button>
        </form>

        {/* ── TOGGLE MODES & ALTERNATIVE LINKS ─────────────────────────────── */}
        <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs space-y-3">
          {mode === 'signin' && (
            <p className="text-gray-600">
              Pas encore de compte ?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
                className="font-bold text-[#D10024] hover:underline"
              >
                Créer un compte client
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p className="text-gray-600">
              Vous avez déjà un compte ?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                className="font-bold text-[#D10024] hover:underline"
              >
                Se connecter
              </button>
            </p>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <p className="text-gray-600">
              Vous vous souvenez de votre mot de passe ?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                className="font-bold text-[#D10024] hover:underline"
              >
                Retour à la connexion
              </button>
            </p>
          )}

          {/* WhatsApp Support Direct for Benin */}
          <div className="pt-2">
            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                "Bonjour Saffo Online, j'ai une difficulté pour me connecter à mon compte client."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#25D366] font-bold hover:underline"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Assistance client directe par WhatsApp ({whatsappNumber})</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
