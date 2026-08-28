import { useTranslation } from 'react-i18next';
import { TrendingUp, Syringe, Sparkles, HeartPulse, Plus, ClipboardList } from 'lucide-react';

function ToothIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 3C4.2 3 2 5.2 2 8c0 3.5 1.5 6 3 9.5C6.2 20.3 8 21 9.5 21c1.5 0 2.2-1.5 2.5-3 .3 1.5 1 3 2.5 3 1.5 0 3.3-.7 4.5-3.5C20.5 14 22 11.5 22 8c0-2.8-2.2-5-5-5-2 0-3.5 1-5 2.5C10.5 4 9 3 7 3Z" />
    </svg>
  );
}

export default function MobileBottomNav({ activeTab, onTabChange, onQuickAdd }) {
  const { t } = useTranslation();

  const leftTabs = [
    { id: 'growth', label: t('nav.growth'), shortLabel: t('nav.shortGrowth'), icon: TrendingUp },
    {
      id: 'vaccines',
      label: t('nav.vaccinations'),
      shortLabel: t('nav.shortVaccines'),
      icon: Syringe,
    },
    { id: 'teeth', label: t('nav.teeth'), shortLabel: t('nav.shortTeeth'), icon: ToothIcon },
  ];

  const rightTabs = [
    {
      id: 'milestones',
      label: t('nav.milestones'),
      shortLabel: t('nav.shortMilestones'),
      icon: Sparkles,
    },
    { id: 'health', label: t('nav.health'), shortLabel: t('nav.shortHealth'), icon: HeartPulse },
    {
      id: 'ucheckups',
      label: t('nav.uCheckups'),
      shortLabel: t('nav.shortUCheckups'),
      icon: ClipboardList,
    },
  ];

  const renderTabButton = (tab) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onTabChange(tab.id)}
        title={tab.label}
        aria-label={tab.label}
        className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all active:scale-95 touch-manipulation min-w-0 ${
          isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Icon
          className={`w-4 h-4 mb-0.5 transition-transform shrink-0 ${isActive ? 'scale-110' : ''}`}
        />
        <span className="text-[9px] sm:text-[10px] font-medium tracking-tight truncate max-w-full text-center">
          {tab.shortLabel || tab.label}
        </span>
      </button>
    );
  };

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-xl border-t border-slate-800 dark:border-slate-800/80 px-1 pt-1.5 pb-2 shadow-2xl safe-area-inset-bottom safe-area-inset-left safe-area-inset-right transform-gpu translate-z-0 pointer-events-auto select-none"
      style={{ WebkitTransform: 'translate3d(0, 0, 0)' }}
    >
      <div className="flex items-center justify-between w-full max-w-md mx-auto relative px-1">
        {/* Left 3 Tabs */}
        <div className="flex items-center justify-around flex-1">
          {leftTabs.map(renderTabButton)}
        </div>

        {/* Center Floating Action Button (Quick Add) */}
        <div className="flex flex-col items-center justify-center -mt-5 px-1 shrink-0 z-10">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={t('growth.addMeasurement') || 'Schnell eintragen'}
            className="w-11 h-11 rounded-full bg-linear-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-cyan-950/80 active:scale-90 transition-all border-2 border-slate-900 dark:border-slate-950 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-slate-400 mt-0.5">
            {t('common.add') || 'Neu'}
          </span>
        </div>

        {/* Right 3 Tabs */}
        <div className="flex items-center justify-around flex-1">
          {rightTabs.map(renderTabButton)}
        </div>
      </div>
    </div>
  );
}
