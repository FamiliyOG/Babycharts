import { useState } from 'react';
import { X, Calendar, ZoomIn, ZoomOut, RotateCw, RotateCcw } from 'lucide-react';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import { getAuthorizedMediaUrl } from '../utils/api.js';

export default function PhotoLightbox({ photo, title, date, notes, onClose }) {
  const { dialogRef } = useModalDismissal(Boolean(photo), onClose);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!photo) return null;

  const isVideo =
    photo.startsWith('data:video/') || photo.includes('.mp4') || photo.includes('.webm');

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.3, 0.7));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn">
      <div
        ref={dialogRef}
        className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-scaleUp"
      >
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
          {!isVideo && (
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 shadow-md">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Vergrößern"
                aria-label="Vergrößern"
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Verkleinern"
                aria-label="Verkleinern"
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="90° Drehen"
                aria-label="90° Drehen"
                className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              {(zoom !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Ansicht zurücksetzen"
                  aria-label="Ansicht zurücksetzen"
                  className="p-1.5 rounded-full text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="p-2 rounded-full bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-black/60 flex items-center justify-center min-h-75 max-h-[70vh] overflow-hidden relative select-none">
          {isVideo ? (
            <video
              src={getAuthorizedMediaUrl(photo)}
              controls
              autoPlay
              className="w-full h-auto max-h-[70vh] object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={getAuthorizedMediaUrl(photo)}
                alt={title}
                className="w-full h-auto max-h-[70vh] object-contain select-none pointer-events-none"
              />
            </div>
          )}
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
