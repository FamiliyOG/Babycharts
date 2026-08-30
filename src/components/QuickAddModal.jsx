import { useTranslation } from 'react-i18next';
import { Scale, HeartPulse, Sparkles, Syringe, ClipboardList } from 'lucide-react';
import { ToothIcon } from './ToothIcon.jsx';
import ModalContainer from './ModalContainer.jsx';

export default function QuickAddModal({
  isOpen,
  onClose,
  activeChild,
  onOpenMeasurement,
  onOpenHealth,
  onOpenVaccines,
  onOpenMilestones,
  onOpenTeeth,
  onOpenUCheckups,
}) {
  const { t } = useTranslation();

  if (!isOpen || !activeChild) return null;

  const quickActions = [
    {
      id: 'measurement',
      title: t('measurements.addTitle'),
      desc: `${t('growth.weight')}, ${t('growth.length')} & ${t('growth.headCircumference')}`,
      icon: Scale,
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-950',
      action: () => {
        onClose();
        if (onOpenMeasurement) onOpenMeasurement();
      },
    },
    {
      id: 'health',
      title: t('health.addEntry'),
      desc: `${t('health.temperature')}, ${t('health.medication')}`,
      icon: HeartPulse,
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-950',
      action: () => {
        onClose();
        if (onOpenHealth) onOpenHealth();
      },
    },
    {
      id: 'vaccine',
      title: t('vaccinations.recordVaccine'),
      desc: t('vaccinations.title'),
      icon: Syringe,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-950',
      action: () => {
        onClose();
        if (onOpenVaccines) onOpenVaccines();
      },
    },
    {
      id: 'milestone',
      title: t('milestones.addCustom'),
      desc: t('milestones.title'),
      icon: Sparkles,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-950',
      action: () => {
        onClose();
        if (onOpenMilestones) onOpenMilestones();
      },
    },
    {
      id: 'teeth',
      title: t('teeth.title'),
      desc: t('teeth.milestonesSubtitle'),
      icon: ToothIcon,
      gradient: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-950',
      action: () => {
        onClose();
        if (onOpenTeeth) onOpenTeeth();
      },
    },
    {
      id: 'ucheckups',
      title: t('ucheckups.title'),
      desc: t('ucheckups.subtitle'),
      icon: ClipboardList,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-950',
      action: () => {
        onClose();
        if (onOpenUCheckups) onOpenUCheckups();
      },
    },
  ];

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('common.add')}: ${activeChild.name}`}
      subtitle={t('profileModal.subtitle')}
      maxWidth="max-w-md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickActions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={act.action}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all text-left group active:scale-95"
            >
              <div
                className={`p-2.5 rounded-xl bg-linear-to-tr ${act.gradient} text-white shadow-md ${act.shadow} shrink-0 group-hover:scale-105 transition-transform`}
              >
                {Icon ? (
                  <Icon className="w-5 h-5" />
                ) : (
                  <span className="text-lg leading-none">{act.emoji}</span>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {act.title}
                </div>
                <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{act.desc}</div>
              </div>
            </button>
          );
        })}
      </div>
    </ModalContainer>
  );
}
