import { X, Calendar } from 'lucide-react';
import { useModalDismissal } from '../utils/useModalDismissal.js';

export default function PhotoLightbox({ photo, title, date, notes, onClose }) {
  const { dialogRef } = useModalDismissal(Boolean(photo), onClose);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
      <div
        ref={dialogRef}
        className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="bg-black/40 flex items-center justify-center max-h-[70vh] overflow-hidden">
          <img
            src={photo}
            alt={title}
            className="w-full h-auto max-h-[70vh] object-contain select-none"
          />
        </div>

        <div className="p-5 sm:p-6 bg-slate-900 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-100">{title}</h3>
            {date && (
              <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/40">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(date).toLocaleDateString('de-DE')}</span>
              </span>
            )}
          </div>
          {notes && <p className="text-xs text-slate-400 leading-relaxed">{notes}</p>}
        </div>
      </div>
    </div>
  );
}
