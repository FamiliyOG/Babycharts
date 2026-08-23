import { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, AlertCircle, Copy, Check } from 'lucide-react';
import { setup2FA, verify2FA, disable2FA } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';

export default function TwoFactorModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [step, setStep] = useState('initial'); // 'initial' | 'setup' | 'disable'
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isEnabled = Boolean(user?.twoFactorEnabled);

  const handleStartSetup = async () => {
    setError(null);
    setLoading(true);
    const res = await setup2FA();
    if (res.ok && res.data) {
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setStep('setup');
    } else {
      setError(res.error || 'Fehler beim Starten der 2FA-Einrichtung.');
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await verify2FA(totpCode);
    if (res.ok) {
      setSuccess('Zwei-Faktor-Authentifizierung wurde erfolgreich aktiviert!');
      setStep('initial');
      if (refreshUser) refreshUser();
    } else {
      setError(res.error || 'Der eingegebene Code war nicht korrekt.');
    }
    setLoading(false);
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await disable2FA(disablePassword);
    if (res.ok) {
      setSuccess('Zwei-Faktor-Authentifizierung wurde deaktiviert.');
      setStep('initial');
      setDisablePassword('');
      if (refreshUser) refreshUser();
    } else {
      setError(res.error || 'Falsches Passwort.');
    }
    setLoading(false);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="inline-flex p-3 rounded-2xl bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 mb-3 shadow-lg shadow-cyan-950/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Zwei-Faktor-Authentifizierung (2FA)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Schützen Sie Ihre Kinder- und Familiendaten mit einer Authenticator-App (z. B. Google
            Authenticator, Aegis, Bitwarden).
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Initial View: Status & Action Button */}
        {step === 'initial' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl border ${
                    isEnabled
                      ? 'bg-emerald-950/80 border-emerald-800/50 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  {isEnabled ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-200">2FA Status</div>
                  <div
                    className={`text-[11px] font-semibold ${
                      isEnabled ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {isEnabled ? 'Aktiviert & Geschützt' : 'Nicht aktiviert'}
                  </div>
                </div>
              </div>

              {isEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('disable');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all"
                >
                  Deaktivieren
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950 transition-all"
                >
                  {loading ? 'Laden...' : 'Jetzt aktivieren'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step: Setup & QR Code Scan */}
        {step === 'setup' && (
          <form onSubmit={handleVerify} className="space-y-4 animate-fadeIn">
            <div className="text-center">
              <p className="text-xs text-slate-300 mb-3">
                1. Scannen Sie diesen QR-Code mit Ihrer Authenticator-App:
              </p>

              {qrCode && (
                <div className="inline-block p-3 bg-white rounded-2xl shadow-xl mb-3">
                  <img src={qrCode} alt="2FA QR-Code" className="w-44 h-44" />
                </div>
              )}

              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mb-4">
                <span>Manueller Schlüssel:</span>
                <code className="font-mono text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1 hover:text-white rounded"
                  title="Schlüssel kopieren"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-1.5 font-semibold">
                2. Geben Sie den 6-stelligen Bestätigungscode ein:
              </p>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-2 bg-slate-950 border border-cyan-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-2"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('initial')}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || totpCode.length !== 6}
                className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950 disabled:opacity-50"
              >
                {loading ? 'Prüfen...' : '2FA aktivieren'}
              </button>
            </div>
          </form>
        )}

        {/* Step: Disable 2FA with Password */}
        {step === 'disable' && (
          <form onSubmit={handleDisable} className="space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-300 leading-relaxed">
              Bitte bestätigen Sie Ihr Kontopasswort, um die Zwei-Faktor-Authentifizierung zu
              deaktivieren:
            </p>

            <div>
              <label
                htmlFor="disable-2fa-pw"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                Passwort *
              </label>
              <input
                id="disable-2fa-pw"
                type="password"
                required
                autoFocus
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep('initial')}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || !disablePassword}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950 disabled:opacity-50"
              >
                {loading ? 'Wird deaktiviert...' : 'Endgültig deaktivieren'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
