import { useTranslation } from 'react-i18next';
import { Home, TrendingUp, ClipboardList, Syringe, HeartPulse, Sparkles } from 'lucide-react';
import { ToothIcon } from './ToothIcon.jsx';

export default function ModuleNavigationTabs({ activeTab, onSelectTab }) {
  const { t } = useTranslation();

  const tabs = [
    {
      id: 'today',
      label: t('dashboard.today') || 'Heute',
      icon: Home,
      activeClass:
        'bg-indigo-700 hover:bg-indigo-600 text-white shadow-md shadow-indigo-950/80 ring-2 ring-indigo-400',
      iconColor: 'text-indigo-200',
    },
    {
      id: 'growth',
      label: t('nav.growth'),
      icon: TrendingUp,
      activeClass:
        'bg-cyan-700 hover:bg-cyan-600 text-white shadow-md shadow-cyan-950/80 ring-2 ring-cyan-400',
      iconColor: 'text-cyan-200',
    },
    {
      id: 'ucheckups',
      label: t('nav.uCheckups'),
      icon: ClipboardList,
      activeClass:
        'bg-blue-700 hover:bg-blue-600 text-white shadow-md shadow-blue-950/80 ring-2 ring-blue-400',
      iconColor: 'text-blue-200',
    },
    {
      id: 'vaccines',
      label: t('nav.vaccinations'),
      icon: Syringe,
      activeClass:
        'bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-950/80 ring-2 ring-emerald-400',
      iconColor: 'text-emerald-200',
    },
    {
      id: 'teeth',
      label: t('nav.teeth'),
      icon: ToothIcon,
      activeClass:
        'bg-pink-700 hover:bg-pink-600 text-white shadow-md shadow-pink-950/80 ring-2 ring-pink-400',
      iconColor: 'text-pink-200',
    },
    {
      id: 'milestones',
      label: t('nav.milestones'),
      icon: Sparkles,
      activeClass:
        'bg-amber-700 hover:bg-amber-600 text-white shadow-md shadow-amber-950/80 ring-2 ring-amber-400',
      iconColor: 'text-amber-200',
    },
    {
      id: 'health',
      label: t('nav.health'),
      icon: HeartPulse,
      activeClass:
        'bg-rose-700 hover:bg-rose-600 text-white shadow-md shadow-rose-950/80 ring-2 ring-rose-400',
      iconColor: 'text-rose-200',
    },
  ];

  return (
    <div className="hidden md:flex items-center justify-center gap-2.5 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer ${
              isActive
                ? tab.activeClass
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? tab.iconColor : 'text-slate-400'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
