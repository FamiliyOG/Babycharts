import { useTranslation } from 'react-i18next';
import { Scale, Ruler, Circle, Activity, TrendingUp } from 'lucide-react';
import { estimatePercentile, calculateBMI, calculateAge } from '../utils/percentileCalc.js';

export default function PercentileCard({ activeChild, ageInfo }) {
  const { t } = useTranslation();
  const measurements = activeChild?.measurements || [];

  if (measurements.length === 0 || !activeChild) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        {t('percentiles.noData')}
      </div>
    );
  }

  // Sort measurements descending by date (newest first)
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const newestDate = sortedMeasurements[0]?.date || null;
  const sameDayEntries = sortedMeasurements.filter((m) => m.date === newestDate);

  // Helper: compute average if entries exist on latest date, otherwise fallback to most recent recorded value
  const computeMetricValueAndDate = (key) => {
    // 1. Check if we have values on the newest date
    const dayValues = sameDayEntries
      .map((m) => m[key])
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(+v));

    if (dayValues.length > 0) {
      const sum = dayValues.reduce((acc, curr) => acc + +curr, 0);
      const avg = +(sum / dayValues.length).toFixed(2);
      return {
        value: avg,
        isAverage: dayValues.length > 1,
        count: dayValues.length,
        date: newestDate,
      };
    }

    // 2. Fallback: find the latest measurement that has this metric recorded
    const fallbackEntry = sortedMeasurements.find(
      (m) => m[key] !== null && m[key] !== undefined && !Number.isNaN(+m[key])
    );

    if (fallbackEntry) {
      return {
        value: +fallbackEntry[key],
        isAverage: false,
        count: 1,
        date: fallbackEntry.date,
      };
    }

    return {
      value: null,
      isAverage: false,
      count: 0,
      date: null,
    };
  };

  const weightStat = computeMetricValueAndDate('weight');
  const lengthStat = computeMetricValueAndDate('length');
  const headStat = computeMetricValueAndDate('headCircumference');

  const gender = activeChild.gender;
  const currentAgeMonths = ageInfo.monthsDecimal;

  // Calculate age for percentile calculation corresponding to the metric's date
  const getMetricAgeMonths = (statDate) => {
    if (!statDate) return currentAgeMonths;
    const age = calculateAge(activeChild.birthdate, statDate);
    return age.monthsDecimal;
  };

  const weightPct = weightStat.value
    ? estimatePercentile(weightStat.value, gender, 'weight', getMetricAgeMonths(weightStat.date))
    : null;

  const lengthPct = lengthStat.value
    ? estimatePercentile(lengthStat.value, gender, 'length', getMetricAgeMonths(lengthStat.date))
    : null;

  const headPct = headStat.value
    ? estimatePercentile(
        headStat.value,
        gender,
        'headCircumference',
        getMetricAgeMonths(headStat.date)
      )
    : null;

  const bmiVal = calculateBMI(weightStat.value, lengthStat.value);
  const bmiAgeMonths = getMetricAgeMonths(weightStat.date || lengthStat.date);
  const bmiPct = bmiVal ? estimatePercentile(bmiVal, gender, 'bmi', bmiAgeMonths) : null;

  // Format weight in grams (e.g., 3515 g)
  const formatWeight = (kg) => {
    if (!kg) return '—';
    const grams = Math.round(kg * 1000);
    return `${grams.toLocaleString()} g (${kg.toFixed(2)} kg)`;
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const cards = [
    {
      title: t('growth.weight'),
      value: formatWeight(weightStat.value),
      isAverage: weightStat.isAverage,
      count: weightStat.count,
      date: weightStat.date,
      isDifferentDay: Boolean(weightStat.date && weightStat.date !== newestDate),
      icon: Scale,
      pctData: weightPct,
      color: 'cyan',
    },
    {
      title: t('growth.length'),
      value: lengthStat.value ? `${lengthStat.value} cm` : '—',
      isAverage: lengthStat.isAverage,
      count: lengthStat.count,
      date: lengthStat.date,
      isDifferentDay: Boolean(lengthStat.date && lengthStat.date !== newestDate),
      icon: Ruler,
      pctData: lengthPct,
      color: 'emerald',
    },
    {
      title: t('growth.headCircumference'),
      value: headStat.value ? `${headStat.value} cm` : '—',
      isAverage: headStat.isAverage,
      count: headStat.count,
      date: headStat.date,
      isDifferentDay: Boolean(headStat.date && headStat.date !== newestDate),
      icon: Circle,
      pctData: headPct,
      color: 'amber',
    },
    {
      title: t('growth.bmi'),
      value: bmiVal ? `${bmiVal} kg/m²` : '—',
      isAverage: weightStat.isAverage || lengthStat.isAverage,
      count: 0,
      date: weightStat.date || lengthStat.date,
      isDifferentDay: Boolean(
        (weightStat.date && weightStat.date !== newestDate) ||
        (lengthStat.date && lengthStat.date !== newestDate)
      ),
      icon: Activity,
      pctData: bmiPct,
      color: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const pct = card.pctData;

        let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (pct?.statusColor === 'amber')
          badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (pct?.statusColor === 'red') badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

        return (
          <div
            key={card.title}
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
          >
            {/* Background subtle glow */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {card.value}
              </span>
              {card.isAverage && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/50 shadow-xs"
                  title={`Ø ${card.count}x`}
                >
                  Ø {card.count}x
                </span>
              )}
              {card.isDifferentDay && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/50 shadow-xs">
                  {formatDateLabel(card.date)}
                </span>
              )}
            </div>

            {pct && pct.percentile !== null ? (
              <div className="flex flex-col gap-1">
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold w-max ${badgeBg}`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>P{pct.percentile}</span>
                </div>
                <span className="text-[11px] text-slate-400">{pct.statusText}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
