import { Info } from 'lucide-react';

export default function GrowthLegend({
  legendItems,
  hiddenDatasets,
  toggleDataset,
  setHoveredLegendKey,
  isGirl,
}) {
  return (
    <div className="mt-4 p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-slate-700 dark:text-slate-300">
        <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span>Perzentilen &amp; Kurven-Erklärung (Klick blendet Kurve ein/aus):</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {legendItems.map((item) => {
          const isHidden = hiddenDatasets[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleDataset(item.key)}
              onMouseEnter={() => setHoveredLegendKey(item.key)}
              onMouseLeave={() => setHoveredLegendKey(null)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
                isHidden
                  ? 'bg-slate-200/40 dark:bg-slate-950/40 border-slate-300 dark:border-slate-800/60 opacity-40 hover:opacity-70'
                  : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div className="mt-1 flex items-center justify-center shrink-0 w-4 h-4">
                {item.style === 'band' ? (
                  <div
                    className={`w-3.5 h-3.5 rounded-sm border ${
                      isGirl
                        ? 'bg-rose-500/20 border-rose-500/50'
                        : 'bg-cyan-500/20 border-cyan-500/50'
                    }`}
                  />
                ) : (
                  <div
                    className="w-3 h-0.5 rounded-full"
                    style={{
                      backgroundColor: item.color,
                      borderTop: item.style === 'dashed-line' ? '2px dashed' : 'none',
                    }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-bold leading-tight truncate ${
                    isHidden ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
