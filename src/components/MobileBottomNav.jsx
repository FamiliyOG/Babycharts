import { TrendingUp, Syringe, Sparkles, HeartPulse, Plus } from 'lucide-react';

export default function MobileBottomNav({ activeTab, onTabChange, onQuickAdd }) {
  const tabs = [
    { id: 'growth', label: 'Wachstum', icon: TrendingUp },
    { id: 'vaccinations', label: 'Impfen', icon: Syringe },
    { id: 'teeth', label: 'Zähne', emoji: '🦷' },
    { id: 'milestones', label: 'Momente', icon: Sparkles },
    { id: 'health', label: 'Fieber', icon: HeartPulse },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 dark:border-slate-800/80 px-2 py-1 shadow-2xl safe-area-inset-bottom">
      <div className="flex items-center justify-around relative">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}
              />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* Center Floating Action Button (Quick Add) */}
        <div className="flex flex-col items-center justify-center -mt-5 px-1">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Schnell eintragen"
            className="w-12 h-12 rounded-full bg-linear-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-cyan-950/80 active:scale-90 transition-all border-2 border-slate-900 dark:border-slate-950"
          >
            <Plus className="w-6 h-6" />
          </button>
          <span className="text-[9px] font-bold text-slate-400 mt-0.5">Neu</span>
        </div>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {Icon ? (
                <Icon
                  className={`w-5 h-5 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
              ) : (
                <span
                  className={`text-base leading-none mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}
                >
                  {tab.emoji}
                </span>
              )}
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
