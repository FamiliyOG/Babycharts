import { Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Line } from 'react-chartjs-2';

export default function TemperatureCurve({ chartData, chartOptions, tempLogsCount }) {
  const { t } = useTranslation();

  if (tempLogsCount <= 1) return null;

  return (
    <div className="mb-6 p-4 rounded-3xl bg-slate-950/70 border border-slate-800/80">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Thermometer className="w-4 h-4 text-rose-400" />
          <span>{t('health.tempCurve')}</span>
        </h4>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Normal (&lt;37.5)
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Erhöht (37.5–38)
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Fieber (≥38.0)
          </span>
        </div>
      </div>
      <div className="h-48 w-full">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
