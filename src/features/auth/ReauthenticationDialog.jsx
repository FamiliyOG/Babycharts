import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, KeyRound, Lock, Loader2, X } from 'lucide-react';
import { reauthenticateUser } from '../../utils/api.js';
import { useBodyScrollLock } from '../../utils/useBodyScrollLock.js';

/**
 * src/features/auth/ReauthenticationDialog.jsx
 * Prompts user for current password & optional 2FA code before destructive/critical operations (Issue #332).
 * Resolves with reauthToken string upon success.
 */
export default function ReauthenticationDialog({ isOpen, title, description, onSuccess, onClose }) {
  useBodyScrollLock(isOpen);
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setErrorMsg(null);

    const res = await reauthenticateUser(password, code || null);
    setIsLoading(false);

    if (res.ok && res.data?.reauthToken) {
      if (onSuccess) onSuccess(res.data.reauthToken);
      if (onClose) onClose();
    } else if (res.data?.requires2FA) {
      setRequires2FA(true);
      setErrorMsg(t('reauth.enterTotp', 'Bitte geben Sie zusätzlich Ihren 2FA-Code ein.'));
    } else {
      setErrorMsg(res.error || t('reauth.failed', 'Re-Authentifizierung fehlgeschlagen.'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-950/60 border border-amber-800/60 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              {title || t('reauth.title', 'Identitätsbestätigung')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {description ||
                t(
                  'reauth.description',
                  'Für diese sicherheitskritische Aktion ist eine erneute Bestätigung Ihres Passworts erforderlich.'
                )}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('auth.passwordLabel', 'Passwort')}</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="••••••••"
              className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {requires2FA && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('auth.twoFactorCodeLabel', '2FA Authenticator-Code')}</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={8}
                placeholder="123456"
                className="w-full px-3.5 py-2 text-xs bg-slate-950 border border-emerald-700/60 rounded-xl text-emerald-200 focus:outline-hidden focus:border-emerald-500 font-mono tracking-widest text-center"
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('common.cancel', 'Abbrechen')}
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('reauth.confirmAction', 'Aktion bestätigen')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
