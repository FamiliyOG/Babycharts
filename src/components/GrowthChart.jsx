import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Scale, Ruler, Circle, Activity, Info } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import GrowthLegend from './growth/GrowthLegend.jsx';
import GrowthControls from './growth/GrowthControls.jsx';
import EmptyState from './EmptyState.jsx';

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

function formatMetricDisplayValue(val, metric) {
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

function createLegendItems(childName, childColor, isGirl, t) {
  return [
    {
      key: 'child',
      label: t('growth.legendChild', { name: childName }),
      color: childColor,
      style: 'solid-dot',
      description: t('growth.legendChildDesc'),
    },
    {
      key: 'p50',
      label: t('growth.legendP50'),
      color: '#ffffff',
      style: 'dashed-line',
      description: t('growth.legendP50Desc'),
    },
    {
      key: 'p15_85',
      label: t('growth.legendNormal'),
      color: isGirl ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.4)',
      style: 'shaded-box',
      description: t('growth.legendNormalDesc'),
    },
    {
      key: 'p85',
      label: t('growth.legendP85'),
      color: '#94a3b8',
      style: 'solid-line',
      description: t('growth.legendP85Desc'),
    },
    {
      key: 'p97',
      label: t('growth.legendP97'),
      color: '#ef4444',
      style: 'dashed-line-red',
      description: t('growth.legendP97Desc'),
    },
    {
      key: 'p3',
      label: t('growth.legendP3'),
      color: '#ef4444',
      style: 'dashed-line-red',
      description: t('growth.legendP3Desc'),
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

const DEFAULT_Y_BOUNDS = { min: 0, max: null };

function buildChartOptions(
  metric,
  maxAgeMonths,
  isDark = true,
  yBounds = DEFAULT_Y_BOUNDS,
  metricTitles = {},
  t = (k) => k,
  weightUnit = 'g'
) {
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(203, 213, 225, 0.6)';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const titleColor = isDark ? '#cbd5e1' : '#475569';
  const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const tooltipTitle = isDark ? '#f8fafc' : '#0f172a';
  const tooltipBody = isDark ? '#cbd5e1' : '#334155';
  const tooltipBorder = isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(203, 213, 225, 0.8)';

  let stepSize = 6;
  if (maxAgeMonths <= 12) {
    stepSize = 1;
  } else if (maxAgeMonths <= 24) {
    stepSize = 3;
  }

  const currentUnit = metric === 'weight' ? weightUnit : METRIC_UNITS[metric];

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const monthVal = items[0].parsed.x;
            const years = Math.floor(monthVal / 12);
            const months = Math.round(monthVal % 12);
            let ageStr = `${monthVal.toFixed(1)} ${t('growth.monthsUnit') || 'Monate'}`;
            if (years > 0) {
              ageStr = `${years} ${t('growth.yearsUnit') || 'Jahre'}${months > 0 ? ` ${months} ${t('growth.monthsUnit') || 'Monate'}` : ''} (${monthVal.toFixed(1)} M.)`;
            }
            return `${t('growth.age') || 'Alter'}: ${ageStr}`;
          },
          label: (item) => {
            const val = item.parsed.y;
            if (val === null || val === undefined) return null;
            let displayVal = `${val} ${METRIC_UNITS[metric]}`;
            if (metric === 'weight') {
              if (weightUnit === 'kg') {
                displayVal = `${Number(val).toFixed(2)} kg`;
              } else {
                displayVal = `${Math.round(val * 1000).toLocaleString('de-DE')} g (${Number(val).toFixed(2)} kg)`;
              }
            }
            return ` ${item.dataset.label}: ${displayVal}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          threshold: 5,
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1,
          },
          pinch: {
            enabled: true,
          },
          mode: 'xy',
        },
        limits: {
          x: { min: 0, max: 60 },
          y: { min: yBounds.min, max: yBounds.max },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        title: {
          display: true,
          text: t('growth.xAxisTitle') || 'Alter (Monate / Jahre)',
          color: titleColor,
          font: { size: 12, weight: 'bold' },
        },
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          stepSize,
          callback: (value) => {
            if (value === 0) return t('growth.birth') || 'Geburt';
            const years = Math.floor(value / 12);
            const rem = value % 12;
            if (value % 12 === 0) return `${years} ${t('growth.yearsUnit') || 'J.'}`;
            if (maxAgeMonths <= 24) return `${value} ${t('growth.monthsUnit') || 'M.'}`;
            return rem === 6
              ? `${years}½ ${t('growth.yearsUnit') || 'J.'}`
              : `${value} ${t('growth.monthsUnit') || 'M.'}`;
          },
        },
        min: 0,
        max: maxAgeMonths,
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: `${metricTitles[metric]} (${currentUnit})`,
          color: titleColor,
          font: { size: 12, weight: 'bold' },
        },
        grid: { color: gridColor },
        ticks: {
          color: tickColor,
          callback: (value) => {
            if (metric === 'weight') {
              if (weightUnit === 'kg') {
                return `${Number(value).toFixed(1)} kg`;
              }
              return `${Math.round(value * 1000).toLocaleString('de-DE')} g`;
            }
            return value;
          },
        },
        min: yBounds.min,
        max: yBounds.max,
      },
    },
  };
}

export default function GrowthChart({ activeChild, onOpenAddMeasurement }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const chartRef = useRef(null);
  const [metric, setMetric] = useState('weight');
  const [weightUnit, setWeightUnit] = useState('g');
  const [maxAgeMonths, setMaxAgeMonths] = useState(60);
  const [hiddenDatasets, setHiddenDatasets] = useState({});
  const [hoveredLegendKey, setHoveredLegendKey] = useState(null);

  if (!activeChild) return null;

  const measurements = activeChild.measurements || [];

  if (measurements.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        title={t('growth.emptyTitle', 'Noch keine Wachstumskurve verfügbar')}
        description={t(
          'growth.emptyDescription',
          'Tragen Sie den ersten Messwert ein, um die WHO-Perzentilenkurven für Ihr Kind zu visualisieren.'
        )}
        actionText={onOpenAddMeasurement ? `+ ${t('measurements.addTitle')}` : undefined}
        onAction={onOpenAddMeasurement}
        className="mb-6"
      />
    );
  }

  const isGirl = activeChild.gender === 'girl';
  const childColor = isGirl ? '#f43f5e' : '#06b6d4';

  const rawWhoData = WHO_DATA[activeChild.gender]?.[metric] || [];
  const filteredWhoData = rawWhoData.filter((d) => d.month <= maxAgeMonths);
  const childPoints = computeChildDataPoints(measurements, activeChild.birthdate, metric);

  const METRIC_TITLES = {
    weight: t('growth.weightTitle'),
    length: t('growth.lengthTitle'),
    headCircumference: t('growth.headCircumferenceTitle'),
    bmi: t('growth.bmiTitle'),
  };

  const metricButtons = [
    { id: 'weight', label: t('growth.weight'), icon: Scale },
    { id: 'length', label: t('growth.length'), icon: Ruler },
    { id: 'headCircumference', label: t('growth.headCircumference'), icon: Circle },
    { id: 'bmi', label: t('growth.bmi'), icon: Activity },
  ];

  const toggleDataset = (key) => {
    setHiddenDatasets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleZoomIn = () => chartRef.current?.zoom(1.2);
  const handleZoomOut = () => chartRef.current?.zoom(0.8);
  const handleResetZoom = () => chartRef.current?.resetZoom();

  const legendItems = createLegendItems(activeChild.name, childColor, isGirl, t);

  const yBoundsMap = {
    weight: { min: 1.5, max: 26 },
    length: { min: 40, max: 125 },
    headCircumference: { min: 30, max: 55 },
    bmi: { min: 10, max: 22 },
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

  const options = buildChartOptions(
    metric,
    maxAgeMonths,
    isDark,
    yBoundsMap[metric],
    METRIC_TITLES,
    t,
    weightUnit
  );

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl mb-6 transition-colors duration-300">
      {/* Header & Controls Subcomponent */}
      <div className="mb-4 sm:mb-6">
        <GrowthControls
          metric={metric}
          setMetric={setMetric}
          maxAgeMonths={maxAgeMonths}
          setMaxAgeMonths={setMaxAgeMonths}
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          handleResetZoom={handleResetZoom}
          metricButtons={metricButtons}
          isGirl={isGirl}
          weightUnit={weightUnit}
          setWeightUnit={setWeightUnit}
        />
      </div>

      {/* Interactive Legend with Mouseover Tooltips Subcomponent */}
      <GrowthLegend
        legendItems={legendItems}
        hiddenDatasets={hiddenDatasets}
        toggleDataset={toggleDataset}
        setHoveredLegendKey={setHoveredLegendKey}
        isGirl={isGirl}
      />

      {/* Chart Canvas Container */}
      <div className="h-96 w-full relative">
        <Line
          ref={chartRef}
          data={data}
          options={options}
          aria-label={`Wachstumskurve: ${METRIC_TITLES[metric]} für ${activeChild.name} (${isGirl ? 'Mädchen' : 'Junge'})`}
          role="img"
        />
        {/* Screen Reader Accessible Data Alternative (BC-154, BC-153) */}
        <div className="sr-only">
          <h4>{`Tabelle der Messwerte: ${METRIC_TITLES[metric]}`}</h4>
          <table>
            <thead>
              <tr>
                <th>Alter (Monate)</th>
                <th>Messwert</th>
              </tr>
            </thead>
            <tbody>
              {childPoints.map((pt) => (
                <tr key={`child-point-${pt.x.toFixed(2)}-${pt.y}`}>
                  <td>{pt.x.toFixed(1)}</td>
                  <td>{formatMetricDisplayValue(pt.y, metric)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/60 pt-3">
        <span>
          {t('growth.sourceLabel', {
            gender: isGirl
              ? t('growth.girlGender', 'Mädchen ♀')
              : t('growth.boyGender', 'Jungen ♂'),
            defaultValue: `Quelle: WHO Child Growth Standards (${isGirl ? 'Mädchen ♀' : 'Jungen ♂'})`,
          })}
        </span>
        <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-300">
          <Info className="w-3 h-3 text-cyan-500" />
          <span>
            {t(
              'growth.zoomPanTip',
              'Tipp: Mit Mausrad/Pinch zoomen & ziehen (Pan) oder die Zoom-Buttons nutzen'
            )}
          </span>
        </span>
      </div>
    </div>
  );
}
