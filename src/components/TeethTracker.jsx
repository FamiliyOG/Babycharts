import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { MILK_TEETH } from '../data/teeth.js';

export default function TeethTracker({ activeChild, onUpdateChild, canEdit }) {
  const { t } = useTranslation();
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [hoveredTooth, setHoveredTooth] = useState(null);
  const [eruptedDate, setEruptedDate] = useState('');
  const [notes, setNotes] = useState('');

  if (!activeChild) return null;

  const teethData = activeChild.teeth || {};
  const upperTeeth = MILK_TEETH.filter((t) => t.jaw === 'upper');
  const lowerTeeth = MILK_TEETH.filter((t) => t.jaw === 'lower');

  const openToothModal = (tooth) => {
    const existing = teethData[tooth.id];
    setSelectedTooth(tooth);
    setEruptedDate(existing?.date || new Date().toISOString().split('T')[0]);
    setNotes(existing?.notes || '');
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedTooth || !canEdit) return;

    // Trigger celebration confetti
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#6366f1', '#a855f7', '#38bdf8'],
    });

    const updated = {
      ...teethData,
      [selectedTooth.id]: {
        erupted: true,
        date: eruptedDate,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
      },
    };

    onUpdateChild({
      ...activeChild,
      teeth: updated,
    });

    setSelectedTooth(null);
  };

  const handleRemove = (toothId) => {
    if (!canEdit) return;
    const updated = { ...teethData };
    delete updated[toothId];

    onUpdateChild({
      ...activeChild,
      teeth: updated,
    });

    setSelectedTooth(null);
  };

  const eruptedCount = Object.keys(teethData).filter((k) => teethData[k]?.erupted).length;

  /**
   * Renders a single realistic SVG tooth shape based on anatomical tooth type:
   * - Incisor: spade / curved rectangle
   * - Canine: diamond / pointed crown
   * - Molar: rounded multi-cusp square
   */
  const renderToothPath = (tooth, isErupted) => {
    const w = tooth.width;
    const h = tooth.height;
    const hw = w / 2;
    const hh = h / 2;

    if (tooth.type === 'incisor') {
      return (
        <path
          d={`M ${-hw + 3} ${-hh} Q 0 ${-hh - 2} ${hw - 3} ${-hh} Q ${hw} 0 ${hw - 2} ${hh - 3} Q 0 ${hh} ${-hw + 2} ${hh - 3} Q ${-hw} 0 ${-hw + 3} ${-hh} Z`}
          className={
            isErupted
              ? 'fill-cyan-100 stroke-cyan-400 stroke-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'
              : 'fill-slate-800/90 stroke-slate-600/80 stroke-1.5 hover:fill-slate-700 hover:stroke-cyan-400'
          }
        />
      );
    }

    if (tooth.type === 'canine') {
      return (
        <path
          d={`M 0 ${-hh - 3} Q ${hw} ${-hh + 4} ${hw - 1} ${hh - 4} Q 0 ${hh + 1} ${-hw + 1} ${hh - 4} Q ${-hw} ${-hh + 4} 0 ${-hh - 3} Z`}
          className={
            isErupted
              ? 'fill-cyan-100 stroke-cyan-400 stroke-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'
              : 'fill-slate-800/90 stroke-slate-600/80 stroke-1.5 hover:fill-slate-700 hover:stroke-cyan-400'
          }
        />
      );
    }

    // Molar
    return (
      <path
        d={`M ${-hw + 4} ${-hh} Q 0 ${-hh - 3} ${hw - 4} ${-hh} Q ${hw + 2} 0 ${hw - 3} ${hh} Q 0 ${hh + 3} ${-hw + 3} ${hh} Q ${-hw - 2} 0 ${-hw + 4} ${-hh} Z`}
        className={
          isErupted
            ? 'fill-cyan-100 stroke-cyan-400 stroke-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'
            : 'fill-slate-800/90 stroke-slate-600/80 stroke-1.5 hover:fill-slate-700 hover:stroke-cyan-400'
        }
      />
    );
  };

  const renderSvgArch = (teethList, jawLabel, isUpper) => {
    return (
      <div className="flex-1 flex flex-col items-center bg-slate-950/70 border border-slate-800/80 rounded-3xl p-4 shadow-inner">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
          <span>{jawLabel}</span>
          <span className="text-[10px] text-slate-500 font-normal">
            ({isUpper ? 'Zähne 55–65' : 'Zähne 85–75'})
          </span>
        </div>

        <svg
          viewBox="0 0 360 240"
          className="w-full max-w-85 h-auto overflow-visible select-none drop-shadow-md"
        >
          {/* Anatomical Gum Arch Background */}
          {isUpper ? (
            <path
              d="M 36 200 C 36 80, 120 25, 180 25 C 240 25, 324 80, 324 200 C 300 200, 280 120, 180 120 C 80 120, 60 200, 36 200 Z"
              className="fill-rose-950/20 stroke-rose-900/30 stroke-1 pointer-events-none select-none"
            />
          ) : (
            <path
              d="M 36 40 C 36 160, 120 215, 180 215 C 240 215, 324 160, 324 40 C 300 40, 280 120, 180 120 C 80 120, 60 40, 36 40 Z"
              className="fill-rose-950/20 stroke-rose-900/30 stroke-1 pointer-events-none select-none"
            />
          )}

          {/* Individual Interactive Teeth */}
          {teethList.map((tooth) => {
            const isErupted = Boolean(teethData[tooth.id]?.erupted);
            const isHovered = hoveredTooth?.id === tooth.id;

            let textFillClass = 'fill-slate-300';
            if (isErupted) {
              textFillClass = 'fill-cyan-950 font-bold';
            } else if (isHovered) {
              textFillClass = 'fill-cyan-300';
            }

            return (
              <g
                key={tooth.id}
                role="button"
                tabIndex={0}
                aria-label={`Zahn ${tooth.short} (${tooth.name})`}
                transform={`translate(${tooth.x}, ${tooth.y}) rotate(${tooth.rot})`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openToothModal(tooth);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openToothModal(tooth);
                  }
                }}
                onMouseEnter={() => setHoveredTooth(tooth)}
                onMouseLeave={() => setHoveredTooth(null)}
                className="cursor-pointer focus:outline-none select-none"
                style={{ touchAction: 'manipulation', pointerEvents: 'all' }}
              >
                {/* 100% Guaranteed Stationary Mouse & Touch Hit Target */}
                <rect
                  x="-18"
                  y="-18"
                  width="36"
                  height="36"
                  fill="#ffffff"
                  fillOpacity="0.001"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                />

                {/* Tooth Crown */}
                {renderToothPath(tooth, isErupted)}

                {/* Tooth Number */}
                <text
                  x="0"
                  y="3.5"
                  textAnchor="middle"
                  className={`text-[9px] font-extrabold pointer-events-none select-none ${textFillClass}`}
                >
                  {tooth.short}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend Hint */}
        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-200 border border-cyan-400 shadow-xs" />
            <span>Durchgebrochen</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-600" />
            <span>Noch nicht da</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
            <span className="text-xl">🦷</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{t('teeth.title')}</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 font-bold">
                {eruptedCount} / 20 {t('teeth.teethCount')}
              </span>
            </h3>
            <p className="text-xs text-slate-400">{t('teeth.subtitle')}</p>
          </div>
        </div>

        {hoveredTooth && (
          <div className="text-xs bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-1.5 text-cyan-200 animate-fadeIn">
            <span className="font-bold">Zahn {hoveredTooth.short}: </span>
            <span>{hoveredTooth.name} </span>
            <span className="text-slate-400 font-mono">(ca. {hoveredTooth.avgMonths} Monate)</span>
          </div>
        )}
      </div>

      {/* Realistic Dental Arch (Upper & Lower) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto py-2">
        {renderSvgArch(upperTeeth, 'Oberkiefer (Maxilla)', true)}
        {renderSvgArch(lowerTeeth, 'Unterkiefer (Mandibula)', false)}
      </div>

      {/* Tooth Details Modal */}
      {selectedTooth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <span>🦷 {selectedTooth.name}</span>
              <span className="text-xs text-slate-400 font-mono">({selectedTooth.short})</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Typischer Durchbruch: ca. {selectedTooth.avgMonths} Monate
            </p>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label
                  htmlFor="tooth-date-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Durchbruchsdatum *
                </label>
                <input
                  id="tooth-date-input"
                  type="date"
                  required
                  value={eruptedDate}
                  onChange={(e) => setEruptedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label
                  htmlFor="tooth-notes-input"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Notizen (optional)
                </label>
                <textarea
                  id="tooth-notes-input"
                  rows={2}
                  placeholder="z. B. Leichtes Zahnen, erster Schneidezahn..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                {teethData[selectedTooth.id] ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(selectedTooth.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-xs font-semibold"
                  >
                    Zahn zurücksetzen
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTooth(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950"
                  >
                    Als durchgebrochen speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
