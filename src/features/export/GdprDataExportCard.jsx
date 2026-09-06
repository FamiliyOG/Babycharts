import { Download } from 'lucide-react';
import { exportMyData } from '../../utils/api.js';

export function GdprDataExportCard({ t }) {
  const handleExportMyData = async () => {
    try {
      const res = await exportMyData();
      if (res.ok && res.data) {
        const dataStr =
          'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `BabyCharts_AccountExport_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        window.alert(res.error || 'Fehler beim Exportieren Ihrer Daten.');
      }
    } catch (err) {
      window.alert('Fehler: ' + err.message);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-between shadow-xs">
      <div>
        <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
          {t('auth.exportMyDataTitle', 'Vollständiger DSGVO-Datenexport')}
        </div>
        <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">
          {t(
            'auth.exportMyDataDesc',
            'Exportiert alle Ihre Daten, Familien und Messungen als maschinenlesbares JSON-Archiv (Art. 20 DSGVO).'
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleExportMyData}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t('auth.exportMyDataBtn', 'Daten exportieren')}</span>
      </button>
    </div>
  );
}
