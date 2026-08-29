import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function GrowthControls({
  metric,
  setMetric,
  maxAgeMonths,
  setMaxAgeMonths,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  metricButtons,
  isGirl,
}) {
  const { t } = useTranslation();

  const getMetricButtonClass = (isSelected) => {
    if (!isSelected) {
      return 'text-slate-400 hover:text-slate-200 hover:bg-slate-900';
    }
    if (isGirl) {
      return 'bg-rose-600 text-white shadow-md shadow-rose-950/60';
    }
    return 'bg-cyan-600 text-white shadow-md shadow-cyan-950/60';
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Metric Selector Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
        {metricButtons.map((btn) => {
          const Icon = btn.icon;
          const isSelected = metric === btn.id;
          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => setMetric(btn.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${getMetricButtonClass(isSelected)}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{btn.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 justify-between sm:justify-end">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={handleZoomIn}
            title={t('growth.zoomIn')}
            aria-label={t('growth.zoomIn')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title={t('growth.zoomOut')}
            aria-label={t('growth.zoomOut')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            title={t('growth.zoomReset')}
            aria-label={t('growth.zoomReset')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">{t('growth.zoomReset')}</span>
          </button>
        </div>

        {/* Age Range Filter */}
        <div className="flex items-center justify-between sm:justify-start gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs shrink-0">
          <span className="px-2 text-slate-400 text-[11px] font-medium">
            {t('growth.timeRange')}
          </span>
          {[12, 24, 60].map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => {
                setMaxAgeMonths(months);
                handleResetZoom();
              }}
              className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-medium transition-all text-center cursor-pointer ${
                maxAgeMonths === months
                  ? 'bg-slate-800 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {months === 60 ? t('growth.allYears') : `0-${months} M.`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
