import { useTranslation } from 'react-i18next';
import { X, Scale, HeartPulse, Sparkles, Syringe, Plus, ClipboardList } from 'lucide-react';
import { useModalDismissal } from '../utils/useModalDismissal.js';
import { ToothIcon } from './ToothIcon.jsx';

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
  const { dialogRef } = useModalDismissal(isOpen, onClose);

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
      id: 'tooth',
      title: t('teeth.markErupted'),
      desc: t('teeth.title'),
      icon: ToothIcon,
      gradient: 'from-sky-500 to-indigo-600',
      shadow: 'shadow-sky-950',
      action: () => {
        onClose();
        if (onOpenTeeth) onOpenTeeth();
      },
    },
    {
      id: 'ucheckup',
      title: t('uCheckups.addCheckup'),
      desc: t('uCheckups.title'),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        ref={dialogRef}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-slate-100 animate-slideUp"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 mb-2 shadow-lg shadow-cyan-950/60">
            <Plus className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('common.add')}: {activeChild.name}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('profileModal.subtitle')}</p>
        </div>

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
      </div>
    </div>
  );
}
