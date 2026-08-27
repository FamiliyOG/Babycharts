import { useTranslation } from 'react-i18next';
import { Scale, Ruler, Circle, Activity, TrendingUp } from 'lucide-react';
import { estimatePercentile, calculateBMI, calculateAge } from '../utils/percentileCalc.js';

function computeMetricStat(measurements, sameDayEntries, newestDate, key) {
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

  const fallbackEntry = measurements.find(
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

  return { value: null, isAverage: false, count: 0, date: null };
}

function getPercentileCategory(pct, t) {
  if (pct === null || pct === undefined) return null;
  if (pct < 3)
    return { text: `< 3 % (${t('percentiles.lowerEdge') || 'Unterer Rand'})`, color: 'red' };
  if (pct < 15)
    return {
      text: `3 %–15 % (${t('percentiles.lowerRange') || 'Erhöhte Aufmerksamkeit'})`,
      color: 'amber',
    };
  if (pct <= 85)
    return {
      text: `15 %–85 % (${t('percentiles.normalRange') || 'Idealer Durchschnittsbereich'})`,
      color: 'green',
    };
  if (pct <= 97)
    return {
      text: `85 %–97 % (${t('percentiles.upperRange') || 'Erhöhte Aufmerksamkeit'})`,
      color: 'amber',
    };
  return { text: `> 97 % (${t('percentiles.upperEdge') || 'Oberer Rand'})`, color: 'red' };
}

function formatWeight(kg) {
  if (!kg) return '—';
  const grams = Math.round(kg * 1000);
  return `${grams.toLocaleString()} g (${kg.toFixed(2)} kg)`;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function MetricCardItem({ card }) {
  const Icon = card.icon;
  const pct = card.pctData;

  let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (pct?.statusColor === 'amber' || pct?.color === 'amber')
    badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (pct?.statusColor === 'red' || pct?.color === 'red')
    badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
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
          <span className="text-[11px] text-slate-400">{pct.text || pct.statusText}</span>
        </div>
      ) : (
        <span className="text-[11px] text-slate-500">—</span>
      )}
    </div>
  );
}

function computeMetricPercentile(stat, gender, metric, birthdate, fallbackAge) {
  if (!stat.value) return null;
  const ageMonths = stat.date ? calculateAge(birthdate, stat.date).monthsDecimal : fallbackAge;
  return estimatePercentile(stat.value, gender, metric, ageMonths);
}

function buildPercentileCards({
  weightStat,
  lengthStat,
  headStat,
  bmiVal,
  bmiDate,
  newestDate,
  gender,
  birthdate,
  currentAgeMonths,
  t,
}) {
  const weightPct = computeMetricPercentile(
    weightStat,
    gender,
    'weight',
    birthdate,
    currentAgeMonths
  );
  const lengthPct = computeMetricPercentile(
    lengthStat,
    gender,
    'length',
    birthdate,
    currentAgeMonths
  );
  const headPct = computeMetricPercentile(
    headStat,
    gender,
    'headCircumference',
    birthdate,
    currentAgeMonths
  );

  const bmiAge = bmiDate ? calculateAge(birthdate, bmiDate).monthsDecimal : currentAgeMonths;
  const bmiPct = bmiVal ? estimatePercentile(bmiVal, gender, 'bmi', bmiAge) : null;

  return [
    {
      title: t('growth.weight'),
      value: formatWeight(weightStat.value),
      isAverage: weightStat.isAverage,
      count: weightStat.count,
      date: weightStat.date,
      isDifferentDay: Boolean(weightStat.date && weightStat.date !== newestDate),
      icon: Scale,
      pctData: weightPct
        ? { ...weightPct, ...getPercentileCategory(weightPct.percentile, t) }
        : null,
    },
    {
      title: t('growth.length'),
      value: lengthStat.value ? `${lengthStat.value} cm` : '—',
      isAverage: lengthStat.isAverage,
      count: lengthStat.count,
      date: lengthStat.date,
      isDifferentDay: Boolean(lengthStat.date && lengthStat.date !== newestDate),
      icon: Ruler,
      pctData: lengthPct
        ? { ...lengthPct, ...getPercentileCategory(lengthPct.percentile, t) }
        : null,
    },
    {
      title: t('growth.headCircumference'),
      value: headStat.value ? `${headStat.value} cm` : '—',
      isAverage: headStat.isAverage,
      count: headStat.count,
      date: headStat.date,
      isDifferentDay: Boolean(headStat.date && headStat.date !== newestDate),
      icon: Circle,
      pctData: headPct ? { ...headPct, ...getPercentileCategory(headPct.percentile, t) } : null,
    },
    {
      title: t('growth.bmi'),
      value: bmiVal ? `${bmiVal} kg/m²` : '—',
      isAverage: weightStat.isAverage || lengthStat.isAverage,
      count: 0,
      date: bmiDate,
      isDifferentDay: Boolean(bmiDate && bmiDate !== newestDate),
      icon: Activity,
      pctData: bmiPct ? { ...bmiPct, ...getPercentileCategory(bmiPct.percentile, t) } : null,
    },
  ];
}

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

  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const newestDate = sortedMeasurements[0]?.date || null;
  const sameDayEntries = sortedMeasurements.filter((m) => m.date === newestDate);

  const weightStat = computeMetricStat(sortedMeasurements, sameDayEntries, newestDate, 'weight');
  const lengthStat = computeMetricStat(sortedMeasurements, sameDayEntries, newestDate, 'length');
  const headStat = computeMetricStat(
    sortedMeasurements,
    sameDayEntries,
    newestDate,
    'headCircumference'
  );

  const bmiVal = calculateBMI(weightStat.value, lengthStat.value);
  const bmiDate = weightStat.date || lengthStat.date;

  const cards = buildPercentileCards({
    weightStat,
    lengthStat,
    headStat,
    bmiVal,
    bmiDate,
    newestDate,
    gender: activeChild.gender,
    birthdate: activeChild.birthdate,
    currentAgeMonths: ageInfo.monthsDecimal,
    t,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <MetricCardItem key={card.title} card={card} />
      ))}
    </div>
  );
}
