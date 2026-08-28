import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ShieldCheck, ShieldAlert, AlertCircle, Copy, Check } from 'lucide-react';
import { setup2FA, verify2FA, disable2FA } from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useModalDismissal } from '../utils/useModalDismissal.js';

export default function TwoFactorModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { dialogRef } = useModalDismissal(isOpen, onClose);
  const [step, setStep] = useState('initial'); // 'initial' | 'setup' | 'recovery' | 'disable'
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [disablePassword, setDisablePassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const resetToInitial = () => {
    setStep('initial');
    setDisablePassword('');
    setTotpCode('');
    setError(null);
  };

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
      if (res.data?.recoveryCodes?.length > 0) {
        setRecoveryCodes(res.data.recoveryCodes);
        setStep('recovery');
      } else {
        setSuccess('Zwei-Faktor-Authentifizierung wurde erfolgreich aktiviert!');
        setStep('initial');
      }
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
      setSuccess('2FA wurde erfolgreich deaktiviert.');
      setDisablePassword('');
      setStep('initial');
      if (refreshUser) refreshUser();
    } else {
      setError(res.error || 'Passwort ist nicht korrekt.');
    }
    setLoading(false);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        ref={dialogRef}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative animate-scaleUp overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">{t('twoFactor.title')}</h2>
            <p className="text-xs text-slate-400">{t('twoFactor.subtitle')}</p>
          </div>
        </div>

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
                    {isEnabled ? t('twoFactor.statusActive') : t('twoFactor.statusInactive')}
                  </div>
                </div>
              </div>

              {isEnabled ? (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setError(null);
                    setStep('disable');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-all cursor-pointer"
                >
                  {t('twoFactor.disableBtn')}
                </button>
              ) : (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleStartSetup();
                  }}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950 transition-all cursor-pointer"
                >
                  {loading ? t('common.loading') : t('twoFactor.enableBtn')}
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isEnabled ? t('twoFactor.descriptionActive') : t('twoFactor.descriptionInactive')}
            </p>
          </div>
        )}

        {/* Step 1: QR Code & Key */}
        {step === 'setup' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {t('twoFactor.scanQrTitle')}
              </label>
              {qrCode && (
                <div className="p-3 bg-white rounded-2xl flex items-center justify-center max-w-45 mx-auto shadow-md">
                  <img src={qrCode} alt="2FA QR Code" className="w-full h-auto" />
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">{t('twoFactor.manualKeyTitle')}</div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 text-center tracking-widest break-all select-all">
                {secret}
              </div>
            </div>

            <div>
              <label
                htmlFor="verify-totp-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('twoFactor.enterCodeTitle')}
              </label>
              <input
                id="verify-totp-input"
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('twoFactor.codePlaceholder')}
                className="w-full text-center tracking-widest font-mono text-lg py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => resetToInitial()}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || totpCode.length < 6}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-cyan-950 transition-all cursor-pointer"
              >
                {loading ? t('common.loading') : t('twoFactor.verifyAndActivate')}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Recovery Codes */}
        {step === 'recovery' && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
              <div className="font-bold mb-1">{t('twoFactor.recoveryTitle')}</div>
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                {t('twoFactor.recoverySubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-center text-slate-200">
              {recoveryCodes.map((code) => (
                <div
                  key={code}
                  className="py-1 px-2 bg-slate-900 rounded-lg border border-slate-800/60"
                >
                  {code}
                </div>
              ))}
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyCodes();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">{t('twoFactor.copiedAll')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t('twoFactor.copyAll')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStep('initial');
                setSuccess('2FA wurde erfolgreich eingerichtet!');
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950 transition-all cursor-pointer"
            >
              {t('twoFactor.finishSetup')}
            </button>
          </div>
        )}

        {/* Step 3: Disable 2FA confirmation */}
        {step === 'disable' && (
          <form onSubmit={handleDisable} className="space-y-4">
            <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              <div className="font-bold mb-1">{t('twoFactor.confirmDisableTitle')}</div>
              <p className="text-[11px] text-rose-400/90 leading-relaxed">
                {t('twoFactor.confirmDisableSubtitle')}
              </p>
            </div>

            <div>
              <label
                htmlFor="disable-password-input"
                className="block text-xs font-semibold text-slate-300 mb-1"
              >
                {t('twoFactor.passwordPlaceholder')} *
              </label>
              <input
                id="disable-password-input"
                type="password"
                required
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder={t('twoFactor.passwordPlaceholder')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => resetToInitial()}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !disablePassword}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-950 transition-all cursor-pointer"
              >
                {loading ? t('common.loading') : t('twoFactor.confirmDisableBtn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
