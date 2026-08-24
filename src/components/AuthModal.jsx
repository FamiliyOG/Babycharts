import { useState } from 'react';
import { X, Lock, Mail, User, Users, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
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
    } else {
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
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            {mode === 'login' ? 'Willkommen zurück' : 'Konto & Familie erstellen'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Melden Sie sich an, um Ihre Familiendaten zu synchronisieren'
              : 'Erstellen Sie Ihr Profil oder treten Sie einer bestehenden Familie bei'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Anmelden
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Registrieren
          </button>
        </div>

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

          {requires2FA && mode === 'login' ? (
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-800/60 animate-fadeIn">
              <label
                htmlFor="auth-totp-input"
                className="block text-xs font-bold text-cyan-300 mb-1.5"
              >
                🔐 6-stelliger Authenticator-Code
              </label>
              <input
                id="auth-totp-input"
                type="text"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 bg-slate-950 border border-cyan-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Öffnen Sie Ihre 2FA-App (Google Authenticator, Aegis etc.) und geben Sie den
                aktuellen Code ein.
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
                <label
                  htmlFor="auth-password-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Passwort *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="auth-password-input"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mindestens 6 Zeichen"
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
                  Geben Sie den 6-stelligen Code ein, falls Sie von einem Partner/Familienmitglied
                  eingeladen wurden.
                </p>
              </div>
            </>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-linear-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-950/60 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Wird geladen...</span>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Jetzt anmelden' : 'Konto erstellen'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
