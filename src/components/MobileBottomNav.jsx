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
  const leftTabs = [
    { id: 'growth', label: 'Wachstum', icon: TrendingUp },
    { id: 'vaccines', label: 'Impfen', icon: Syringe },
    { id: 'teeth', label: 'Zähne', icon: ToothIcon },
  ];

  const rightTabs = [
    { id: 'milestones', label: 'Momente', icon: Sparkles },
    { id: 'health', label: 'Fieber', icon: HeartPulse },
    { id: 'ucheckups', label: 'U-Heft', icon: ClipboardList },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 dark:border-slate-800/80 px-2 py-1 shadow-2xl safe-area-inset-bottom safe-area-inset-left safe-area-inset-right">
      <div className="flex items-center justify-between max-w-90 mx-auto relative">
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
                className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
                <span className="text-[9px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Floating Action Button (Quick Add) */}
        <div className="flex flex-col items-center justify-center -mt-5 px-1 shrink-0">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label="Schnell eintragen"
            className="w-11 h-11 rounded-full bg-linear-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-cyan-950/80 active:scale-90 transition-all border-2 border-slate-900 dark:border-slate-950"
          >
            <Plus className="w-5 h-5" />
          </button>
          <span className="text-[8px] font-bold text-slate-400 mt-0.5">Neu</span>
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
                className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-xl transition-all ${
                  isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mb-0.5 transition-transform ${isActive ? 'scale-110' : ''}`}
                />
                <span className="text-[9px] tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
