import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import ModalContainer from './ModalContainer.jsx';

/**
 * Accessible confirmation dialog for deletion and destructive actions (BC-208).
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={title || t('common.confirm')}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-200">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {message ||
              t('common.confirmMessage', 'Möchten Sie diese Aktion wirklich durchführen?')}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-all cursor-pointer ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/50'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/50'
            }`}
          >
            {confirmLabel || (isDestructive ? t('common.delete') : t('common.confirm'))}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
