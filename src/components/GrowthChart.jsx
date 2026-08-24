import { useState, useRef } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import { WHO_DATA } from '../data/whoPercentiles.js';
import { calculateAge, calculateBMI } from '../utils/percentileCalc.js';
import { Scale, Ruler, Circle, Activity, Info, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const METRIC_UNITS = {
  weight: 'g',
  length: 'cm',
  headCircumference: 'cm',
  bmi: 'kg/m²',
};

const METRIC_TITLES = {
  weight: 'Gewicht nach Alter',
  length: 'Körpergröße / Länge nach Alter',
  headCircumference: 'Kopfumfang nach Alter',
  bmi: 'BMI nach Alter',
};

function formatMetricDisplayValue(val, metric) {
  if (val === null || val === undefined) return '';
  if (metric === 'weight') {
    return `${Math.round(val * 1000).toLocaleString('de-DE')} g`;
  }
  return `${val} ${METRIC_UNITS[metric]}`;
}

function computeChildDataPoints(measurements, birthdate, metric) {
  const childPoints = [];
  measurements.forEach((m) => {
    const age = calculateAge(birthdate, m.date);
    let val = null;
    if (metric === 'weight') val = m.weight;
    else if (metric === 'length') val = m.length;
    else if (metric === 'headCircumference') val = m.headCircumference;
    else if (metric === 'bmi') val = calculateBMI(m.weight, m.length);

    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      childPoints.push({
        x: age.monthsDecimal,
        y: +val,
        date: m.date,
        ageText: age.text,
        notes: m.notes,
        checkup: m.checkup,
      });
    }
  });

  return childPoints.sort((a, b) => a.x - b.x);
}

function getOpacity(itemKey, hiddenDatasets, hoveredLegendKey) {
  if (hiddenDatasets[itemKey]) return 0.2;
  if (hoveredLegendKey && hoveredLegendKey !== itemKey) return 0.35;
  return 1;
}

function getNormalRangeBgColor(isGirl, isHovered) {
  const alpha = isHovered ? 0.18 : 0.08;
  if (isGirl) {
    return `rgba(244, 63, 94, ${alpha})`;
  }
  return `rgba(6, 182, 212, ${alpha})`;
}

function createLegendItems(childName, childColor, isGirl) {
  return [
    {
      key: 'child',
      label: `${childName} (Messwerte)`,
      color: childColor,
      style: 'solid-dot',
      description: `Eingetragene tatsächliche Messwerte von ${childName} im zeitlichen Verlauf.`,
    },
    {
      key: 'p50',
      label: '50 % (Exakter Durchschnitt)',
      color: '#ffffff',
      style: 'dashed-line',
      description:
        'Durchschnittslinie: Genau 50 % aller gesunden Kinder wiegen/messen weniger und 50 % mehr.',
    },
    {
      key: 'p15_85',
      label: '15 % – 85 % (Normalbereich)',
      color: isGirl ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.4)',
      style: 'shaded-box',
      description:
        'Haupt-Wachstumsbereich: Rund 70 % aller gesunden Kinder liegen in diesem schattierten Feld.',
    },
    {
      key: 'p85',
      label: '85 % (Oberes Mittelfeld)',
      color: '#94a3b8',
      style: 'solid-line',
      description: 'Oberes Mittelfeld: 85 % aller gleichaltrigen Kinder wiegen/messen weniger.',
    },
    {
      key: 'p97',
      label: '97 % (Oberer Rand)',
      color: '#ef4444',
      style: 'dashed-line-red',
      description:
        'Oberer Grenzbereich: Nur 3 % aller gesunden Kinder liegen oberhalb dieser oberen Linie.',
    },
    {
      key: 'p3',
      label: '3 % (Unterer Rand)',
      color: '#ef4444',
      style: 'dashed-line-red',
      description:
        'Unterer Grenzbereich: Nur 3 % aller gesunden Kinder liegen unterhalb dieser unteren Linie.',
    },
  ];
}

function buildChartData({
  activeChild,
  filteredWhoData,
  childPoints,
  hiddenDatasets,
  hoveredLegendKey,
  isGirl,
  childColor,
  isDark = true,
}) {
  const p3Points = filteredWhoData.map((d) => ({ x: d.month, y: d.p3 }));
  const p15Points = filteredWhoData.map((d) => ({ x: d.month, y: d.p15 }));
  const p50Points = filteredWhoData.map((d) => ({ x: d.month, y: d.p50 }));
  const p85Points = filteredWhoData.map((d) => ({ x: d.month, y: d.p85 }));
  const p97Points = filteredWhoData.map((d) => ({ x: d.month, y: d.p97 }));

  const opacity = (key) => getOpacity(key, hiddenDatasets, hoveredLegendKey);
  const isHoveredNormalRange = hoveredLegendKey === 'p15_85';
  const p50LineColor = isDark
    ? `rgba(255, 255, 255, ${opacity('p50')})`
    : `rgba(15, 23, 42, ${opacity('p50') * 0.85})`;
  const boundaryLineColor = isDark ? 'rgba(148, 163, 184,' : 'rgba(100, 116, 139,';

  return {
    datasets: [
      {
        label: `${activeChild.name} (Messwerte)`,
        data: hiddenDatasets.child ? [] : childPoints,
        borderColor: childColor,
        backgroundColor: childColor,
        borderWidth: hoveredLegendKey === 'child' ? 5 : 3.5,
        pointRadius: hoveredLegendKey === 'child' ? 8 : 6,
        pointHoverRadius: 10,
        pointHitRadius: 18,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: childColor,
        pointBorderWidth: 3,
        tension: 0.25,
        spanGaps: true,
        order: 1,
      },
      {
        label: '50 % (Exakter Durchschnitt)',
        data: hiddenDatasets.p50 ? [] : p50Points,
        borderColor: p50LineColor,
        borderWidth: hoveredLegendKey === 'p50' ? 3.5 : 2,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.3,
        order: 2,
      },
      {
        label: '85 % (Oberes Mittelfeld)',
        data: hiddenDatasets.p85 ? [] : p85Points,
        borderColor: `${boundaryLineColor} ${opacity('p85') * 0.6})`,
        borderWidth: hoveredLegendKey === 'p85' ? 2.5 : 1,
        pointRadius: 0,
        tension: 0.3,
        order: 3,
      },
      {
        label: '15 % – 85 % (Normalbereich)',
        data: hiddenDatasets.p15_85 ? [] : p15Points,
        borderColor: `${boundaryLineColor} ${opacity('p15_85') * 0.5})`,
        borderWidth: 1,
        backgroundColor: getNormalRangeBgColor(isGirl, isHoveredNormalRange),
        fill: '-1',
        pointRadius: 0,
        tension: 0.3,
        order: 4,
      },
      {
        label: '97 % (Oberer Rand)',
        data: hiddenDatasets.p97 ? [] : p97Points,
        borderColor: `rgba(239, 68, 68, ${opacity('p97') * 0.6})`,
        borderWidth: hoveredLegendKey === 'p97' ? 2.5 : 1,
        borderDash: [2, 2],
        pointRadius: 0,
        tension: 0.3,
        order: 5,
      },
      {
        label: '3 % (Unterer Rand)',
        data: hiddenDatasets.p3 ? [] : p3Points,
        borderColor: `rgba(239, 68, 68, ${opacity('p3') * 0.6})`,
        borderWidth: hoveredLegendKey === 'p3' ? 2.5 : 1,
        borderDash: [2, 2],
        pointRadius: 0,
        tension: 0.3,
        order: 6,
      },
    ],
  };
}

function buildChartOptions(metric, maxAgeMonths, isDark = true) {
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(203, 213, 225, 0.6)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const titleColor = isDark ? '#64748b' : '#475569';
  const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const tooltipTitleColor = isDark ? '#f8fafc' : '#0f172a';
  const tooltipBodyColor = isDark ? '#cbd5e1' : '#334155';
  const tooltipBorder = isDark ? 'rgba(51, 65, 85, 0.8)' : '#cbd5e1';
  // Calculate sensible tick step size for X axis depending on range
  const getXStepSize = (months) => {
    if (months <= 12) return 1; // every month
    if (months <= 24) return 2; // every 2 months
    return 6; // every 6 months for 5 years
  };

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          modifierKey: null,
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.08,
          },
          pinch: {
            enabled: true,
          },
          mode: 'xy',
        },
        limits: {
          x: { min: 0, max: 60, minRange: 1 },
          y: { min: 0 },
        },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitleColor,
        bodyColor: tooltipBodyColor,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: (items) => {
            const rawItem = items[0]?.raw;
            if (rawItem?.date) {
              const ageStr = rawItem.ageText || `${rawItem.x} Monate`;
              let formattedDate = rawItem.date;
              try {
                formattedDate = new Date(rawItem.date).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                });
              } catch {
                formattedDate = rawItem.date;
              }
              return `Datum: ${formattedDate} (${ageStr})`;
            }
            return `Alter: ${items[0]?.parsed?.x} Monate`;
          },
          label: (ctx) => {
            const label = ctx.dataset.label || '';
            const val = ctx.parsed.y;
            const displayVal = formatMetricDisplayValue(val, metric);
            return `${label}: ${displayVal}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: 0,
        max: maxAgeMonths,
        grid: {
          color: gridColor,
          drawBorder: true,
        },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          stepSize: getXStepSize(maxAgeMonths),
          callback: (val) => `${val}M`,
        },
        title: {
          display: true,
          text: 'Alter in Monaten (0 - 5 Jahre)',
          color: titleColor,
          font: { size: 11, weight: '600' },
        },
      },
      y: {
        grid: {
          color: gridColor,
          drawBorder: true,
        },
        ticks: {
          color: tickColor,
          font: { size: 11 },
          callback: (val) => formatMetricDisplayValue(val, metric),
        },
        title: {
          display: true,
          text: `${METRIC_TITLES[metric]} (${METRIC_UNITS[metric]})`,
          color: titleColor,
          font: { size: 11, weight: '600' },
        },
      },
    },
  };
}

export default function GrowthChart({ activeChild, measurements = [] }) {
  const { isDark } = useTheme();
  const chartRef = useRef(null);
  const [metric, setMetric] = useState('weight');
  const [maxAgeMonths, setMaxAgeMonths] = useState(24);
  const [hoveredLegendKey, setHoveredLegendKey] = useState(null);
  const [hiddenDatasets, setHiddenDatasets] = useState({});

  if (!activeChild) return null;

  const isGirl = activeChild.gender === 'girl';
  const genderKey = isGirl ? 'girl' : 'boy';

  // Fetch WHO reference percentile datasets for selected metric
  const rawWhoData = WHO_DATA[genderKey]?.[metric] || [];
  const filteredWhoData = rawWhoData.filter((d) => d.month <= maxAgeMonths);

  // Map recorded measurements to exact x-axis decimal month positions
  const childPoints = computeChildDataPoints(measurements, activeChild.birthdate, metric);

  const childColor = isGirl ? '#ec4899' : '#06b6d4';
  const legendItems = createLegendItems(activeChild.name, childColor, isGirl);

  const toggleDatasetHidden = (itemKey) => {
    setHiddenDatasets((prev) => ({ ...prev, [itemKey]: !prev[itemKey] }));
  };

  const handleZoomIn = () => {
    if (chartRef.current) {
      chartRef.current.zoom(1.25);
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      chartRef.current.zoom(0.8);
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const data = buildChartData({
    activeChild,
    filteredWhoData,
    childPoints,
    hiddenDatasets,
    hoveredLegendKey,
    isGirl,
    childColor,
    isDark,
  });
  const options = buildChartOptions(metric, maxAgeMonths, isDark);

  const getMetricButtonClass = (targetMetric) => {
    const isSelected = metric === targetMetric;
    if (isSelected) {
      return isGirl ? 'bg-rose-700 text-white shadow-md' : 'bg-cyan-700 text-white shadow-md';
    }
    return 'text-slate-400 hover:text-slate-200';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl mb-6">
      {/* Controls & Metric Selectors */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-4 border-b border-slate-800/80 pb-4">
        {/* Metric Tabs - Horizontal Scroll on Mobile */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setMetric('weight')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${getMetricButtonClass('weight')}`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Gewicht</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('length')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${getMetricButtonClass('length')}`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Größe</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('headCircumference')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${getMetricButtonClass('headCircumference')}`}
          >
            <Circle className="w-3.5 h-3.5" />
            <span>Kopf</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('bmi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${getMetricButtonClass('bmi')}`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>BMI</span>
          </button>
        </div>

        {/* Right side: Age Range Filter & Zoom Controls */}
        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap sm:flex-nowrap">
          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Reinzoomen (oder Mausrad / Pinch)"
              aria-label="Reinzoomen"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Rauszoomen"
              aria-label="Rauszoomen"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              title="Zoom zurücksetzen"
              aria-label="Zoom zurücksetzen"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Age Range Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs shrink-0">
            <span className="px-2 text-slate-400 text-[11px] font-medium">Zeitraum:</span>
            {[12, 24, 60].map((months) => (
              <button
                key={months}
                type="button"
                onClick={() => {
                  setMaxAgeMonths(months);
                  handleResetZoom();
                }}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg font-medium transition-all text-center ${
                  maxAgeMonths === months
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {months === 60 ? '0-5 J.' : `0-${months} M.`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Legend with Mouseover Tooltips & Native Buttons for Accessibility */}
      <div className="mb-3 sm:mb-4">
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-3 py-1.5 sm:py-2 px-2 sm:px-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] sm:text-xs">
          {legendItems.map((item) => {
            // Short mobile friendly label map
            const shortLabelMap = {
              child: activeChild.name,
              p50: '50% (Ø)',
              p15_85: '15% – 85%',
              p85: '85%',
              p97: '97%',
              p3: '3%',
            };
            const mobileShortLabel = shortLabelMap[item.key] || item.label;

            return (
              <button
                key={item.key}
                type="button"
                onMouseEnter={() => setHoveredLegendKey(item.key)}
                onMouseLeave={() => setHoveredLegendKey(null)}
                onClick={() => toggleDatasetHidden(item.key)}
                aria-label={`Legende: ${item.label}`}
                className={`group relative flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer transition-all border-0 bg-transparent text-left focus:outline-none focus:ring-1 focus:ring-slate-700 ${
                  hiddenDatasets[item.key]
                    ? 'opacity-40 line-through bg-slate-900/40'
                    : 'hover:bg-slate-800/80'
                }`}
              >
                {/* Visual Dot / Symbol */}
                {item.style === 'solid-dot' && (
                  <span
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white shadow-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                {item.style === 'dashed-line' && (
                  <span className="w-3.5 sm:w-4 h-0 border-t-2 border-dashed border-white opacity-80 shrink-0" />
                )}
                {item.style === 'shaded-box' && (
                  <span
                    className="w-3 sm:w-3.5 h-3 sm:h-3.5 rounded border border-slate-600 shadow-inner shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                {item.style === 'solid-line' && (
                  <span className="w-3.5 sm:w-4 h-0 border-t-2 border-slate-400 shrink-0" />
                )}
                {item.style === 'dashed-line-red' && (
                  <span className="w-3.5 sm:w-4 h-0 border-t-2 border-dashed border-rose-500 shrink-0" />
                )}

                <span className="font-semibold text-slate-200">
                  <span className="inline sm:hidden">{mobileShortLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>

                {/* Mouseover Tooltip Badge */}
                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 sm:w-64 p-2.5 bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 leading-snug">
                  <div className="font-bold text-white mb-0.5 flex items-center gap-1 text-xs">
                    <Info className="w-3 h-3 text-cyan-400" />
                    <span>{item.label}</span>
                  </div>
                  <div>{item.description}</div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="h-96 w-full relative">
        <Line
          ref={chartRef}
          data={data}
          options={options}
          aria-label={`Wachstumskurve: ${METRIC_TITLES[metric]} für ${activeChild.name} (${isGirl ? 'Mädchen' : 'Junge'})`}
          role="img"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-3">
        <span>Quelle: WHO Child Growth Standards ({isGirl ? 'Mädchen ♀' : 'Jungen ♂'})</span>
        <span className="flex items-center gap-1 text-cyan-300">
          <Info className="w-3 h-3 text-cyan-400" />
          <span>
            Tipp: Mit Mausrad/Pinch zoomen &amp; ziehen (Pan) oder die Zoom-Buttons nutzen
          </span>
        </span>
      </div>
    </div>
  );
}
