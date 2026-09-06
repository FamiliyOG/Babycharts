import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  TrendingUp,
  Sparkles,
  HeartPulse,
  Plus,
  Calendar,
  Syringe,
  ClipboardList,
  Stethoscope,
} from 'lucide-react';
import { ToothIcon } from './ToothIcon.jsx';
import { getAppSettings } from '../utils/storage.js';

const ALL_TAB_DEFS = {
  today: { icon: Home, labelKey: 'nav.today', shortKey: 'nav.shortToday', fallback: 'Heute' },
  timeline: {
    icon: Calendar,
    labelKey: 'timeline.title',
    shortKey: 'timeline.shortTitle',
    fallback: 'Timeline',
  },
  growth: {
    icon: TrendingUp,
    labelKey: 'nav.growth',
    shortKey: 'nav.shortGrowth',
    fallback: 'Wachstum',
  },
  ucheckups: {
    icon: ClipboardList,
    labelKey: 'nav.uCheckups',
    shortKey: 'nav.shortUCheckups',
    fallback: 'U-Heft',
  },
  vaccines: {
    icon: Syringe,
    labelKey: 'nav.vaccinations',
    shortKey: 'nav.shortVaccines',
    fallback: 'Impfen',
  },
  teeth: { icon: ToothIcon, labelKey: 'nav.teeth', shortKey: 'nav.shortTeeth', fallback: 'Zähne' },
  milestones: {
    icon: Sparkles,
    labelKey: 'nav.milestones',
    shortKey: 'nav.shortMilestones',
    fallback: 'Tagebuch',
  },
  health: {
    icon: HeartPulse,
    labelKey: 'nav.health',
    shortKey: 'nav.shortHealth',
    fallback: 'Gesundheit',
  },
  doctor: {
    icon: Stethoscope,
    labelKey: 'doctorView.title',
    shortKey: 'doctorView.shortTitle',
    fallback: 'Arzt',
  },
};

export default function MobileBottomNav({ activeTab, onTabChange, onQuickAdd }) {
  const { t } = useTranslation();

  // Read customizable tabs from settings or use standard defaults (Issue #280)
  const { leftTabs, rightTabs } = useMemo(() => {
    const settings = getAppSettings();
    const customTabs =
      Array.isArray(settings.customMobileTabs) && settings.customMobileTabs.length === 4
        ? settings.customMobileTabs
        : ['today', 'growth', 'milestones', 'health'];

    const resolveTab = (id) => {
      const def = ALL_TAB_DEFS[id] || ALL_TAB_DEFS.today;
      return {
        id,
        label: t(def.labelKey, def.fallback),
        shortLabel: t(def.shortKey, def.fallback),
        icon: def.icon,
      };
    };

    return {
      leftTabs: [resolveTab(customTabs[0]), resolveTab(customTabs[1])],
      rightTabs: [resolveTab(customTabs[2]), resolveTab(customTabs[3])],
    };
  }, [t]);

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
        className={`flex flex-col items-center justify-center flex-1 min-h-11 py-1.5 px-2 rounded-2xl transition-all active:scale-95 touch-manipulation min-w-0 cursor-pointer ${
          isActive
            ? 'text-cyan-400 dark:text-cyan-300 font-bold bg-slate-800/40 dark:bg-slate-900/60 shadow-xs'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Icon
          className={`w-5 h-5 mb-1 transition-transform shrink-0 ${isActive ? 'scale-110' : ''}`}
        />
        <span className="text-[11px] font-medium tracking-tight truncate max-w-full text-center">
          {tab.shortLabel || tab.label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-xl border-t border-slate-800 dark:border-slate-800/80 px-2 pt-2 pb-3 shadow-2xl safe-area-inset-bottom safe-area-inset-left safe-area-inset-right transform-gpu translate-z-0 pointer-events-auto select-none"
      style={{ WebkitTransform: 'translate3d(0, 0, 0)' }}
    >
      <div className="flex items-center justify-between w-full max-w-md mx-auto relative gap-1">
        {/* Left 2 Tabs */}
        <div className="flex items-center justify-around flex-1 gap-1">
          {leftTabs.map(renderTabButton)}
        </div>

        {/* Center Floating Action Button (Quick Add) */}
        <div className="flex flex-col items-center justify-center -mt-6 px-1.5 shrink-0 z-10">
          <button
            type="button"
            onClick={onQuickAdd}
            aria-label={t('growth.addMeasurement', 'Schnell eintragen')}
            className="w-12 h-12 rounded-full bg-linear-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-cyan-950/80 active:scale-90 transition-all border-2 border-slate-900 dark:border-slate-950 cursor-pointer"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
          <span className="text-[10px] font-bold text-slate-300 dark:text-slate-400 mt-1">
            {t('common.add', 'Neu')}
          </span>
        </div>

        {/* Right 2 Tabs */}
        <div className="flex items-center justify-around flex-1 gap-1">
          {rightTabs.map(renderTabButton)}
        </div>
      </div>
    </nav>
  );
}
