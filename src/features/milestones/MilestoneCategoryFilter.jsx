import { Sparkles } from 'lucide-react';

export function MilestoneCategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
  allMilestones,
  milestonesData,
  canEdit,
  onOpenCustomModal,
  t,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {categories.map((cat) => {
          const count =
            cat.id === 'all'
              ? allMilestones.length
              : allMilestones.filter((m) => m.category === cat.id).length;

          const doneCount =
            cat.id === 'all'
              ? Object.keys(milestonesData).length
              : allMilestones.filter((m) => m.category === cat.id && Boolean(milestonesData[m.id]))
                  .length;

          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-amber-600/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {doneCount}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={onOpenCustomModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('milestones.createCustomTitle', 'Eigenen Meilenstein anlegen')}</span>
        </button>
      )}
    </div>
  );
}
