/**
 * src/components/ChildTimeline.jsx
 * Unified Chronological Activity Feed and Life Timeline for the active child (Issue #247).
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Scale,
  Sparkles,
  Syringe,
  ClipboardList,
  HeartPulse,
  Filter,
} from 'lucide-react';
import { ToothIcon } from './ToothIcon.jsx';
import ResponsiveMedia from './media/ResponsiveMedia.jsx';
import { sanitizeMediaUrl } from '../utils/api.js';
import {
  toCanonicalMilestonesList,
  toCanonicalTeethList,
  toCanonicalVaccinationsList,
  toCanonicalUCheckupsList,
  toCanonicalHealthLogsList,
} from '../domain/index.js';

export default function ChildTimeline({ activeChild, activeChildMeasurements = [] }) {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState('all'); // 'all' | 'measurement' | 'milestone' | 'vaccine' | 'tooth' | 'ucheckup'

  const events = useMemo(() => {
    if (!activeChild) return [];

    const list = [];

    // 1. Measurements
    (activeChildMeasurements || []).forEach((m) => {
      if (!m.date) return;
      const parts = [];
      if (m.weight) parts.push(`${t('growth.weight')}: ${m.weight} kg`);
      if (m.length) parts.push(`${t('growth.length')}: ${m.length} cm`);
      if (m.headCircumference)
        parts.push(`${t('growth.headCircumference')}: ${m.headCircumference} cm`);

      list.push({
        id: `meas-${m.id || m.date}`,
        date: m.date,
        type: 'measurement',
        title: t('growth.addMeasurement') || 'Messwert',
        details: parts.join(' • ') || 'Messung gespeichert',
        notes: m.notes || m.note,
        icon: Scale,
        color: 'text-cyan-400',
        badgeClass: 'bg-cyan-950/80 border-cyan-800/80 text-cyan-300',
        dotGradient: 'from-cyan-500 to-blue-600',
      });
    });

    // 2. Milestones
    const milestones = [
      ...toCanonicalMilestonesList(activeChild.milestones),
      ...toCanonicalMilestonesList(activeChild.customMilestones),
    ];
    milestones.forEach((m) => {
      if (!m.date) return;

      list.push({
        id: `ms-${m.id}`,
        date: m.date,
        type: 'milestone',
        title: m.title || t('milestones.title'),
        details: m.category || 'Meilenstein gemeistert',
        photo: m.photo,
        notes: m.notes,
        icon: Sparkles,
        color: 'text-amber-400',
        badgeClass: 'bg-amber-950/80 border-amber-800/80 text-amber-300',
        dotGradient: 'from-amber-500 to-orange-600',
      });
    });

    // 3. Teeth
    toCanonicalTeethList(activeChild.teeth).forEach((tooth) => {
      if (!tooth.date) return;

      list.push({
        id: `tooth-${tooth.id}`,
        date: tooth.date,
        type: 'tooth',
        title: tooth.name ? `${t('teeth.title')}: ${tooth.name}` : t('teeth.title'),
        details: tooth.position ? `Position: ${tooth.position}` : 'Zahn durchgebrochen',
        notes: tooth.notes,
        icon: ToothIcon,
        color: 'text-pink-400',
        badgeClass: 'bg-pink-950/80 border-pink-800/80 text-pink-300',
        dotGradient: 'from-pink-500 to-rose-600',
      });
    });

    // 4. Vaccinations
    const vaccines = [
      ...toCanonicalVaccinationsList(activeChild.vaccinations),
      ...toCanonicalVaccinationsList(activeChild.vaccines),
    ];
    vaccines.forEach((v) => {
      if (!v.date) return;

      list.push({
        id: `vac-${v.id}`,
        date: v.date,
        type: 'vaccine',
        title: v.name || t('vaccinations.recordVaccine'),
        details: v.doctor ? `Arzt: ${v.doctor}` : 'Impfung verabreicht',
        notes: v.notes,
        icon: Syringe,
        color: 'text-emerald-400',
        badgeClass: 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300',
        dotGradient: 'from-emerald-500 to-teal-600',
      });
    });

    // 5. U-Checkups
    toCanonicalUCheckupsList(activeChild.uCheckups).forEach((u) => {
      if (!u.date) return;

      list.push({
        id: `ucheck-${u.id}`,
        date: u.date,
        type: 'ucheckup',
        title: u.name || t('ucheckups.title'),
        details: u.doctorNotes ? `Arzt: ${u.doctorNotes}` : 'Untersuchung durchgeführt',
        notes: u.doctorNotes,
        icon: ClipboardList,
        color: 'text-blue-400',
        badgeClass: 'bg-blue-950/80 border-blue-800/80 text-blue-300',
        dotGradient: 'from-blue-500 to-indigo-600',
      });
    });

    // 6. Health Log
    toCanonicalHealthLogsList(activeChild.healthLog || activeChild.healthLogs).forEach((h, idx) => {
      const date = h.dateTime;
      if (!date) return;

      const detailsParts = [];
      if (h.temperature) detailsParts.push(`${h.temperature}°C`);
      if (h.medication) detailsParts.push(h.medication);
      if (Array.isArray(h.symptoms) && h.symptoms.length > 0)
        detailsParts.push(h.symptoms.join(', '));

      list.push({
        id: `hl-${h.id || h.key || idx}`,
        date: typeof date === 'string' ? date.split('T')[0] : date,
        type: 'health',
        title: h.type || t('health.title'),
        details: detailsParts.join(' • ') || (h.value ? `Wert: ${h.value}` : 'Gesundheitseintrag'),
        notes: h.notes || (Array.isArray(h.symptoms) ? h.symptoms.join(', ') : h.symptoms),
        icon: HeartPulse,
        color: 'text-rose-400',
        badgeClass: 'bg-rose-950/80 border-rose-800/80 text-rose-300',
        dotGradient: 'from-rose-500 to-pink-600',
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [activeChild, activeChildMeasurements, t]);

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredEvents = useMemo(() => {
    let result = events;
    if (filterType !== 'all') {
      result = result.filter((e) => e.type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.details?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q)
      );
    }
    if (startDate) {
      result = result.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      result = result.filter((e) => e.date <= endDate);
    }
    return result;
  }, [events, filterType, searchQuery, startDate, endDate]);

  const filterChips = [
    { id: 'all', label: 'Alle' },
    { id: 'measurement', label: 'Wachstum' },
    { id: 'milestone', label: 'Meilensteine' },
    { id: 'tooth', label: 'Zähne' },
    { id: 'vaccine', label: 'Impfungen' },
    { id: 'ucheckup', label: 'U-Vorsorge' },
  ];

  const formatDate = (isoDate) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-slate-900/90 dark:bg-slate-950/90 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Aktivitäts-Timeline</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronologischer Gesamtverlauf aller Ereignisse und Meilensteine von{' '}
              {activeChild?.name}
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:block" />
            {filterChips.map((chip) => {
              const isActive = filterType === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterType(chip.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Date Range Bar (Issue #282) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
          <div className="flex-1 min-w-45">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Timeline durchsuchen..."
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <span>Von:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <span>Bis:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            {(searchQuery || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2 py-1 text-slate-400 hover:text-slate-200 text-xs cursor-pointer underline ml-1"
              >
                Zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 p-6 rounded-2xl bg-slate-900/40 border border-slate-800/60">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-300">Keine Timeline-Einträge gefunden</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Sobald Messwerte, Meilensteine, Zähne oder Impfungen erfasst werden, erscheinen sie hier
            automatisch im Zeitverlauf.
          </p>
        </div>
      ) : (
        /* Timeline Feed */
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {filteredEvents.map((evt) => {
            const Icon = evt.icon;
            return (
              <div key={evt.id} className="relative group animate-fadeIn">
                {/* Timeline Node Dot */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full bg-linear-to-tr ${evt.dotGradient} border-2 border-slate-950 shadow-md flex items-center justify-center text-white shrink-0 group-hover:scale-125 transition-transform`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Event Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 dark:bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${evt.badgeClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-100">{evt.title}</h4>
                        <div className="text-xs text-slate-400 mt-0.5">{evt.details}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 shrink-0 font-mono bg-slate-800/60 px-2 py-0.5 rounded-lg">
                      {formatDate(evt.date)}
                    </span>
                  </div>

                  {/* Notes / Findings */}
                  {evt.notes && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-xs text-slate-300 italic">
                      „{evt.notes}“
                    </div>
                  )}

                  {/* Milestone Photo Attachment */}
                  {(() => {
                    const sanitized = sanitizeMediaUrl(evt.photo);
                    if (
                      !sanitized ||
                      !/^(?:https?:\/\/|\/api\/(?:v1\/)?media\/|data:image\/(?:png|jpeg|jpg|webp|gif);base64,)/i.test(
                        sanitized
                      )
                    ) {
                      return null;
                    }
                    return (
                      <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 max-w-xs">
                        <ResponsiveMedia
                          src={sanitized}
                          size="md"
                          alt={evt.title || ''}
                          className="w-full h-40 object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
