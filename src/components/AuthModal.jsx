import { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Users,
  KeyRound,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import { forgotPassword, resetPassword } from '../utils/api.js';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const res = await login(email, password, totpCode);
      if (res.requires2FA) {
        setRequires2FA(true);
      } else if (!res.ok) {
        setError(res.error);
      } else {
        setRequires2FA(false);
        setTotpCode('');
        onClose();
      }
    } else if (mode === 'register') {
      const res = await register({
        name,
        email,
        password,
        familyName: familyName || undefined,
        inviteCode: inviteCode || undefined,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        onClose();
      }
    } else if (mode === 'forgot') {
      const res = await forgotPassword(email);
      if (res.ok) {
        if (res.data?.resetToken) {
          // Selfhosted mode: direct reset token provided
          setResetToken(res.data.resetToken);
          setSuccess('Reset-Token generiert! Sie können nun Ihr neues Passwort festlegen.');
          setMode('reset');
        } else {
          setSuccess(
            res.data?.message ||
              'Wenn ein Konto mit dieser E-Mail existiert, wurde eine Anleitung gesendet.'
          );
        }
      } else {
        setError(res.error || 'Fehler beim Anfordern des Passwort-Resets.');
      }
    } else if (mode === 'reset') {
      const res = await resetPassword(resetToken, newPassword);
      if (res.ok) {
        setSuccess('Passwort erfolgreich geändert! Bitte melden Sie sich an.');
        setMode('login');
        setPassword('');
      } else {
        setError(res.error || 'Fehler beim Zurücksetzen des Passworts.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-slate-900 dark:text-slate-100 max-h-[95vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-linear-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950/60 mb-3">
            {mode === 'forgot' || mode === 'reset' ? (
              <Key className="w-6 h-6" />
            ) : (
              <Users className="w-6 h-6" />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {mode === 'login' && 'Willkommen zurück'}
            {mode === 'register' && 'Konto & Familie erstellen'}
            {mode === 'forgot' && 'Passwort vergessen'}
            {mode === 'reset' && 'Neues Passwort vergeben'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Melden Sie sich an, um Ihre Familiendaten zu synchronisieren'}
            {mode === 'register' &&
              'Erstellen Sie Ihr Profil oder treten Sie einer bestehenden Familie bei'}
            {mode === 'forgot' && 'Geben Sie Ihre E-Mail ein, um Ihr Passwort zurückzusetzen'}
            {mode === 'reset' && 'Geben Sie das neue Passwort und Ihren Reset-Code ein'}
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== 'forgot' && mode !== 'reset' && (
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMode('login');
                setError(null);
                setSuccess(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMode('register');
                setError(null);
                setSuccess(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Registrieren
            </button>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-name-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Ihr Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  id="auth-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Stefanie Mayer"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {mode === 'forgot' && (
            <div>
              <label
                htmlFor="auth-forgot-email"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Ihre registrierte E-Mail-Adresse *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  id="auth-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label
                  htmlFor="auth-reset-token"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Reset-Token / Code *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="auth-reset-token"
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Reset-Token einfügen"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-new-password"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Neues Passwort * (min. 8 Zeichen, Groß-/Klein &amp; Zahl)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="auth-new-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Neues sicheres Passwort"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </>
          )}

          {(mode === 'login' || mode === 'register') && (
            <>
              {requires2FA && mode === 'login' ? (
                <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 animate-fadeIn">
                  <label
                    htmlFor="auth-totp-input"
                    className="block text-xs font-bold text-cyan-300 mb-1.5"
                  >
                    🔐 Authenticator-Code oder Recovery-Code
                  </label>
                  <input
                    id="auth-totp-input"
                    type="text"
                    required
                    autoFocus
                    placeholder="123456 oder ABCD-1234"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-lg py-2.5 bg-slate-950 border border-cyan-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 text-center">
                    Geben Sie den 6-stelligen Code aus Ihrer 2FA-App oder einen Ihrer
                    Notfall-Wiederherstellungscodes ein.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="auth-email-input"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      E-Mail-Adresse *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                      <input
                        id="auth-email-input"
                        type="email"
                        required
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@beispiel.de"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="auth-password-input"
                        className="block text-xs font-semibold text-slate-300"
                      >
                        Passwort *
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMode('forgot');
                            setError(null);
                            setSuccess(null);
                          }}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
                        >
                          Passwort vergessen?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                      <input
                        id="auth-password-input"
                        type="password"
                        required
                        minLength={mode === 'register' ? 8 : 1}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          mode === 'register'
                            ? 'Mindestens 8 Zeichen (A-Z, a-z, 0-9)'
                            : 'Ihr Passwort'
                        }
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode === 'register' && (
                <>
                  <div className="pt-2 border-t border-slate-800/80">
                    <label
                      htmlFor="auth-family-name-input"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      Name Ihrer Familie (optional)
                    </label>
                    <div className="relative">
                      <Users className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                      <input
                        id="auth-family-name-input"
                        type="text"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="z. B. Familie Mayer"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="auth-invite-code-input"
                      className="block text-xs font-semibold text-slate-300 mb-1"
                    >
                      Haben Sie einen Einladungscode? (optional)
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-cyan-400" />
                      <input
                        id="auth-invite-code-input"
                        type="text"
                        maxLength={10}
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="z. B. BABY88"
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-cyan-300 font-mono tracking-wider placeholder-slate-600 focus:outline-none focus:border-cyan-500 uppercase"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Geben Sie den 6-stelligen Code ein, falls Sie von einem
                      Partner/Familienmitglied eingeladen wurden.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          <div className="pt-3 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-950/60 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Wird verarbeitet...</span>
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Jetzt anmelden'}
                    {mode === 'register' && 'Konto erstellen'}
                    {mode === 'forgot' && 'Reset-Code anfordern'}
                    {mode === 'reset' && 'Passwort speichern'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMode('login');
                  setError(null);
                  setSuccess(null);
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors cursor-pointer"
              >
                Zurück zur Anmeldung
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
