/**
 * src/components/DoctorView.jsx
 * Privacy-compliant clinical summary and physician dashboard for the active child (Issue #251).
 * Focuses on WHO percentiles, STIKO vaccinations, teeth, and U-examination findings while stripping private photos/notes.
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope,
  Activity,
  Syringe,
  ClipboardCheck,
  Printer,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  LogOut,
} from 'lucide-react';
import { DATA_SOURCES } from '../utils/dataSourceMetadata.js';
import {
  toCanonicalTeethList,
  toCanonicalUCheckupsList,
  toCanonicalVaccinationsList,
} from '../domain/index.js';

function getGenderLabel(gender) {
  if (gender === 'girl') return 'Weiblich';
  if (gender === 'boy') return 'Männlich';
  return 'Divers';
}

export default function DoctorView({ activeChild, activeChildMeasurements = [], onExit }) {
  const { t } = useTranslation();

  // Category visibility toggles (Issue #283)
  const [showBiometrics, setShowBiometrics] = useState(true);
  const [showVaccines, setShowVaccines] = useState(true);
  const [showUCheckups, setShowUCheckups] = useState(true);

  // Privacy timeout: 15 minutes of inactivity before automatically exiting doctor mode (Issue #283)
  const [timeLeftMinutes, setTimeLeftMinutes] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftMinutes((prev) => {
        if (prev <= 1) {
          if (onExit) onExit();
          return 0;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [onExit]);

  // Sort measurements by date descending to find latest
  const sortedMeasurements = useMemo(() => {
    return [...(activeChildMeasurements || [])].sort(
      (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
    );
  }, [activeChildMeasurements]);

  const latestMeasurement = sortedMeasurements[0] || null;

  // Calculate age in months directly
  const birthdateStr = activeChild?.birthdate;
  const ageMonths = useMemo(() => {
    if (!birthdateStr) return null;
    const birth = new Date(birthdateStr);
    const now = new Date();
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return Math.max(0, months);
  }, [birthdateStr]);

  // Erupted teeth count via canonical domain adapter
  const teethCount = useMemo(() => {
    return toCanonicalTeethList(activeChild?.teeth).filter((t) => t.erupted).length;
  }, [activeChild]);

  // U-Checkups completed vs planned via canonical domain adapter
  const uCheckups = useMemo(() => {
    return toCanonicalUCheckupsList(activeChild?.uCheckups);
  }, [activeChild]);

  // Vaccinations list via canonical domain adapter
  const vaccinations = useMemo(() => {
    return toCanonicalVaccinationsList(activeChild?.vaccinations);
  }, [activeChild]);

  if (!activeChild) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t('common.noProfileSelected', 'Kein Profil ausgewählt.')}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Clinical Header & Privacy Notice */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {t('doctorView.title', 'Kinderarzt-Übersicht')}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                Klinische Ansicht
              </span>
              <span className="text-[10px] text-amber-400/90 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {timeLeftMinutes} min
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                Patient: <strong className="text-slate-200">{activeChild.name}</strong>
              </span>
              <span>•</span>
              <span>
                Geb.: <strong className="text-slate-200">{activeChild.birthdate || '–'}</strong>
              </span>
              {ageMonths !== null && (
                <>
                  <span>•</span>
                  <span>
                    Alter: <strong className="text-slate-200">{ageMonths} Monate</strong>
                  </span>
                </>
              )}
              <span>•</span>
              <span>
                Geschlecht:{' '}
                <strong className="text-slate-200">{getGenderLabel(activeChild.gender)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('doctorView.printSummary', 'Übersicht drucken')}</span>
          </button>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Beenden</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Toggles (Issue #283) */}
      <div className="flex items-center gap-3 px-1 text-xs text-slate-400 flex-wrap">
        <span className="font-semibold text-slate-300">Kategorien anzeigen:</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showBiometrics}
            onChange={(e) => setShowBiometrics(e.target.checked)}
            className="rounded border-slate-700 text-cyan-600 focus:ring-0"
          />
          <span>Biometrie & Zähne</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showVaccines}
            onChange={(e) => setShowVaccines(e.target.checked)}
            className="rounded border-slate-700 text-cyan-600 focus:ring-0"
          />
          <span>STIKO-Impfungen</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showUCheckups}
            onChange={(e) => setShowUCheckups(e.target.checked)}
            className="rounded border-slate-700 text-cyan-600 focus:ring-0"
          />
          <span>U-Untersuchungen</span>
        </label>
      </div>

      {/* Medical Alert Banner (Allergies & Conditions) */}
      {(activeChild.allergies || activeChild.conditions) && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-amber-200">Medizinische Hinweise & Allergien:</div>
            {activeChild.allergies && (
              <div className="text-amber-300/90">
                <strong>Allergien:</strong> {activeChild.allergies}
              </div>
            )}
            {activeChild.conditions && (
              <div className="text-amber-300/90">
                <strong>Vorerkrankungen / Besonderheiten:</strong> {activeChild.conditions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid: Biometric Status, STIKO Vaccines & U-Checkups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Biometrics & Latest Measurement */}
        {showBiometrics && (
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Activity className="w-4 h-4" />
                <span>{t('doctorView.growthStatus', 'Wachstumsstatus')}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">WHO Standards</span>
            </div>

            {latestMeasurement ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Letzte Messung:</span>
                    <span className="font-bold text-slate-200">{latestMeasurement.date}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Gewicht</span>
                      <strong className="text-white text-sm">
                        {latestMeasurement.weight ? `${latestMeasurement.weight} kg` : '–'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Körperlänge</span>
                      <strong className="text-white text-sm">
                        {latestMeasurement.length ? `${latestMeasurement.length} cm` : '–'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Kopfumfang</span>
                      <strong className="text-white text-sm">
                        {latestMeasurement.headCircumference
                          ? `${latestMeasurement.headCircumference} cm`
                          : '–'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Zahnstatus</span>
                      <strong className="text-white text-sm">{teethCount} / 20 Milchzähne</strong>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Referenzdaten basieren auf WHO Child Growth Standards.</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">
                Keine Messungen erfasst.
              </div>
            )}
          </div>
        )}

        {/* 2. STIKO Vaccinations */}
        {showVaccines && (
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Syringe className="w-4 h-4" />
                <span>{t('doctorView.vaccinations', 'STIKO-Impfstatus')}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">RKI 2024/25</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {vaccinations.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  Keine Impfungen dokumentiert.
                </div>
              ) : (
                vaccinations.map((vac, idx) => (
                  <div
                    key={`${vac.name || vac.vaccineId || 'vac'}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-medium text-slate-200">
                        {vac.name || vac.vaccineId}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {vac.date || 'Erhalten'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. U-Examinations (Vorsorge) */}
        {showUCheckups && (
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ClipboardCheck className="w-4 h-4" />
                <span>{t('doctorView.uCheckups', 'U-Vorsorgeuntersuchungen')}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">G-BA / BVKJ</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {uCheckups.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">
                  Keine U-Untersuchungen dokumentiert.
                </div>
              ) : (
                uCheckups.map((u, idx) => (
                  <div
                    key={`${u.id || u.name || 'u'}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {u.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="font-medium text-slate-200">{u.name || u.id}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {u.date || (u.completed ? 'Abgeschlossen' : 'Ausstehend')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Data Provenance Info Box & Medical Disclaimer (Issue #252, #315) */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col gap-2 text-xs text-slate-400">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Datengrundlage: {DATA_SOURCES.WHO_GROWTH_STANDARDS.name} (
              {DATA_SOURCES.WHO_GROWTH_STANDARDS.version}) & {DATA_SOURCES.STIKO_VACCINATIONS.name}{' '}
              ({DATA_SOURCES.STIKO_VACCINATIONS.version})
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            BabyCharts Clinical Privacy Engine • Keine privaten Fotos/Tagebucheinträge exportiert
          </div>
        </div>
        <p className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-2 text-center">
          {t(
            'app.medicalDisclaimer',
            'Hinweis: BabyCharts dient ausschließlich der persönlichen Dokumentation und Orientierung anhand der WHO-Standards und ersetzt keine ärztliche Beratung, Diagnose oder Behandlung.'
          )}
        </p>
      </div>
    </div>
  );
}
