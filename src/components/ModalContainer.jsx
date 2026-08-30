import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible Modal Container using HTML5 <dialog> element.
 * Standardizes modal layouts, focus trap, escape key handling, and mobile safe areas.
 */
export default function ModalContainer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  showCloseButton = true,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return;

    if (isOpen) {
      if (!dialogElement.open) {
        dialogElement.showModal?.() || dialogElement.setAttribute('open', '');
      }
    } else if (dialogElement.open) {
      dialogElement.close?.() || dialogElement.removeAttribute('open');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        onClose?.();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      className="fixed inset-0 z-50 m-auto flex items-center justify-center p-4 bg-transparent backdrop:bg-slate-950/80 backdrop:backdrop-blur-xs max-w-none max-h-none w-full h-full border-0 animate-in fade-in duration-200"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`w-full ${maxWidth} bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-bold text-white">
                  {title}
                </h2>
              )}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </dialog>
  );
}
