import { Stethoscope } from 'lucide-react';

export function ClinicalExportCard({ profiles, t }) {
  const handleClinicalExport = () => {
    if (!profiles || profiles.length === 0) {
      window.alert(t('common.noProfileSelected', 'Keine Profile verfügbar.'));
      return;
    }

    // Filter out private photos, avatars, and private diary notes for physician handoff (Issue #319)
    const clinicalExportData = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      birthdate: p.birthdate,
      gender: p.gender,
      measurements: (p.measurements || []).map((m) => ({
        date: m.date,
        weight: m.weight,
        length: m.length,
        headCircumference: m.headCircumference,
        checkup: m.checkup,
      })),
      vaccinations: p.vaccinations || {},
      uCheckups: p.uCheckups || {},
      teeth: (p.teeth || []).map((t) => ({
        id: t.id,
        name: t.name,
        erupted: t.erupted,
        eruptedDate: t.eruptedDate,
      })),
      exportType: 'clinical_handoff',
      exportedAt: new Date().toISOString(),
      privacyNote:
        'Medizinischer Datenauszug: Private Fotos, Audioaufnahmen und persönliche Notizen wurden zum Schutz der Privatsphäre entfernt.',
    }));

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(clinicalExportData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `BabyCharts_PraxisExport_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/40 flex items-center justify-between shadow-xs">
      <div>
        <div className="text-xs font-bold text-cyan-950 dark:text-cyan-200 flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{t('exportImport.clinicalExportTitle', 'Praxis- & Kinderarztübergabe')}</span>
        </div>
        <div className="text-[11px] text-cyan-800 dark:text-cyan-400 font-medium">
          {t(
            'exportImport.clinicalExportDesc',
            'Datensparsamer Export für den Kinderarzt (Messwerte, Impfungen, U-Vorsorgen). Schließt private Fotos und Notizen automatisch aus.'
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleClinicalExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors cursor-pointer shrink-0 ml-2"
      >
        <Stethoscope className="w-3.5 h-3.5" />
        <span>{t('exportImport.clinicalExportBtn', 'Praxis-Export')}</span>
      </button>
    </div>
  );
}
