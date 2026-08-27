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
    { id: 'growth', label: t('nav.growth'), icon: TrendingUp },
    { id: 'vaccines', label: t('nav.vaccinations'), icon: Syringe },
    { id: 'teeth', label: t('nav.teeth'), icon: ToothIcon },
  ];

  const rightTabs = [
    { id: 'milestones', label: t('nav.milestones'), icon: Sparkles },
    { id: 'health', label: t('nav.health'), icon: HeartPulse },
    { id: 'ucheckups', label: t('nav.uCheckups'), icon: ClipboardList },
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 dark:border-slate-800/80 px-2 pt-2 pb-2.5 shadow-2xl safe-area-inset-bottom safe-area-inset-left safe-area-inset-right transform-gpu translate-z-0 pointer-events-auto"
      style={{ WebkitTransform: 'translate3d(0, 0, 0)' }}
    >
      <div className="flex items-center justify-between max-w-96 mx-auto relative">
        {/* Left 3 Tabs */}
        <div className="flex items-center justify-between flex-1 gap-1">
          {leftTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all active:scale-95 touch-manipulation min-h-12 ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Floating Action Button (Quick Add) */}
        <div className="flex flex-col items-center justify-center -mt-6 px-1.5 shrink-0">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Schnell eintragen"
            className="w-12 h-12 rounded-full bg-linear-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-cyan-950/80 active:scale-90 transition-all border-2 border-slate-900 dark:border-slate-950"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[9px] font-bold text-slate-400 mt-0.5">Neu</span>
        </div>

        {/* Right 3 Tabs */}
        <div className="flex items-center justify-between flex-1 gap-1">
          {rightTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all active:scale-95 touch-manipulation min-h-12 ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-5 h-5 mb-1 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
