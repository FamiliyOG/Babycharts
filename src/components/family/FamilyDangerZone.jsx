import { LogOut, Trash2 } from 'lucide-react';
import { deleteAccount } from '../../utils/api.js';

export function FamilyDangerZone({
  activeFamily,
  isAdmin,
  onLeaveFamily,
  onDeleteCurrentFamily,
  t,
}) {
  return (
    <div className="space-y-3">
      {/* Leave Family */}
      {!activeFamily?.isOwner && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('family.leaveFamily')}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {t('family.leaveConfirm')}
            </div>
          </div>
          <button
            type="button"
            onClick={onLeaveFamily}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('family.leaveFamily')}</span>
          </button>
        </div>
      )}

      {/* Delete Family */}
      {(isAdmin || activeFamily?.isOwner) && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{t('family.deleteFamily')}</span>
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-400/90 font-medium mt-0.5">
              {t('family.deleteConfirm')}
            </div>
          </div>
          <button
            type="button"
            onClick={onDeleteCurrentFamily}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('family.deleteFamily')}</span>
          </button>
        </div>
      )}

      {/* Delete Account (GDPR Art. 17 / BC-206) */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('auth.deleteAccount', 'Eigenes Benutzerkonto löschen')}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {t(
              'auth.deleteAccountNotice',
              'Löscht Ihr Konto und alle persönlichen Daten unwiderruflich (DSGVO Art. 17).'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            const password = window.prompt(
              'Möchten Sie Ihr Benutzerkonto wirklich unwiderruflich löschen?\n\nBitte geben Sie zur Bestätigung Ihr aktuelles Passwort ein:'
            );
            if (!password) return;
            try {
              const res = await deleteAccount(password);
              if (res.ok) {
                window.alert('Ihr Benutzerkonto wurde erfolgreich gelöscht.');
                window.location.reload();
              } else {
                window.alert(res.error || 'Fehler beim Löschen des Kontos.');
              }
            } catch (err) {
              window.alert('Fehler: ' + err.message);
            }
          }}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-700 transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t('auth.deleteAccountBtn', 'Konto löschen')}</span>
        </button>
      </div>
    </div>
  );
}
