import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, HeartPulse, Sparkles, Syringe, ClipboardList, Search } from 'lucide-react';
import { ToothIcon } from './ToothIcon.jsx';
import ModalContainer from './ModalContainer.jsx';
import { FormInput } from './common/FormField.jsx';

const USAGE_STORAGE_KEY = 'babycharts_quickadd_usage_v1';

function getUsageCounts() {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function incrementUsageCount(id) {
  try {
    const counts = getUsageCounts();
    counts[id] = (counts[id] || 0) + 1;
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(counts));
  } catch (err) {
    console.error('Error recording quickadd usage:', err);
  }
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quickActions = useMemo(
    () => [
      {
        id: 'measurement',
        title: t('measurements.addTitle', 'Messwert eintragen'),
        desc: `${t('growth.weight', 'Gewicht')}, ${t('growth.length', 'Länge')} & ${t('growth.headCircumference', 'Kopfumfang')}`,
        icon: Scale,
        gradient: 'from-cyan-500 to-blue-600',
        shadow: 'shadow-cyan-950',
        action: () => {
          if (onOpenMeasurement) onOpenMeasurement();
        },
      },
      {
        id: 'health',
        title: t('health.addEntry', 'Gesundheitseintrag'),
        desc: `${t('health.temperature', 'Temperatur')}, ${t('health.medication', 'Medikation')}`,
        icon: HeartPulse,
        gradient: 'from-rose-500 to-pink-600',
        shadow: 'shadow-rose-950',
        action: () => {
          if (onOpenHealth) onOpenHealth();
        },
      },
      {
        id: 'vaccine',
        title: t('vaccinations.recordVaccine', 'Impfung erfassen'),
        desc: t('vaccinations.title', 'Impfkalender'),
        icon: Syringe,
        gradient: 'from-emerald-500 to-teal-600',
        shadow: 'shadow-emerald-950',
        action: () => {
          if (onOpenVaccines) onOpenVaccines();
        },
      },
      {
        id: 'milestone',
        title: t('milestones.addCustom', 'Meilenstein festhalten'),
        desc: t('milestones.title', 'Momente & Fotos'),
        icon: Sparkles,
        gradient: 'from-amber-500 to-orange-600',
        shadow: 'shadow-amber-950',
        action: () => {
          if (onOpenMilestones) onOpenMilestones();
        },
      },
      {
        id: 'teeth',
        title: t('teeth.title', 'Zahndurchbruch'),
        desc: t('teeth.milestonesSubtitle', 'Milchzahn-Diagramm'),
        icon: ToothIcon,
        gradient: 'from-purple-500 to-indigo-600',
        shadow: 'shadow-purple-950',
        action: () => {
          if (onOpenTeeth) onOpenTeeth();
        },
      },
      {
        id: 'ucheckups',
        title: t('ucheckups.title', 'U-Untersuchung'),
        desc: t('ucheckups.subtitle', 'Gelbes Untersuchungsheft'),
        icon: ClipboardList,
        gradient: 'from-blue-500 to-indigo-600',
        shadow: 'shadow-blue-950',
        action: () => {
          if (onOpenUCheckups) onOpenUCheckups();
        },
      },
    ],
    [
      t,
      onOpenMeasurement,
      onOpenHealth,
      onOpenVaccines,
      onOpenMilestones,
      onOpenTeeth,
      onOpenUCheckups,
    ]
  );

  // Sort by usage frequency (Issue #279)
  const sortedActions = useMemo(() => {
    const usage = getUsageCounts();
    const sorted = [...quickActions].sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase().trim();
    return sorted.filter(
      (act) => act.title.toLowerCase().includes(q) || act.desc.toLowerCase().includes(q)
    );
  }, [quickActions, searchQuery]);

  if (!isOpen || !activeChild) return null;

  const handleTriggerAction = (act) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    incrementUsageCount(act.id);
    onClose();
    act.action();
    setTimeout(() => setIsSubmitting(false), 500); // Debounce double clicks
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      title={`${t('common.add', 'Eintrag hinzufügen')}: ${activeChild.name}`}
      subtitle={t('profileModal.subtitle', 'Wählen Sie eine Schnellaktion zur Dokumentation')}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        {/* Search / Filter Input */}
        <FormInput
          id="quickadd-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('common.search', 'Aktion suchen...')}
          icon={Search}
          className="text-xs py-2 bg-slate-950/80"
        />

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {sortedActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleTriggerAction(act)}
                aria-label={`${act.title}: ${act.desc}`}
                className="flex items-start gap-3 p-3 min-h-12 rounded-2xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none transition-all text-left group active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <div
                  className={`p-2.5 rounded-xl bg-linear-to-tr ${act.gradient} text-white shadow-md ${act.shadow} shrink-0 group-hover:scale-105 transition-transform`}
                >
                  {Icon && <Icon className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                    {act.title}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                    {act.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ModalContainer>
  );
}
