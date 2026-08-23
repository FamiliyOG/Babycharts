import { Scale, Ruler, Circle, Activity, TrendingUp } from 'lucide-react';
import { estimatePercentile, calculateBMI } from '../utils/percentileCalc.js';

export default function PercentileCard({ activeChild, latestMeasurement, ageInfo }) {
  if (!latestMeasurement || !activeChild) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        Noch keine Messwerte vorhanden. Klicken Sie oben auf "+ Messwert eintragen".
      </div>
    );
  }

  const gender = activeChild.gender;
  const ageMonths = ageInfo.monthsDecimal;

  const weightPct = latestMeasurement.weight
    ? estimatePercentile(latestMeasurement.weight, gender, 'weight', ageMonths)
    : null;

  const lengthPct = latestMeasurement.length
    ? estimatePercentile(latestMeasurement.length, gender, 'length', ageMonths)
    : null;

  const headPct = latestMeasurement.headCircumference
    ? estimatePercentile(
        latestMeasurement.headCircumference,
        gender,
        'headCircumference',
        ageMonths
      )
    : null;

  const bmiVal = calculateBMI(latestMeasurement.weight, latestMeasurement.length);
  const bmiPct = bmiVal ? estimatePercentile(bmiVal, gender, 'bmi', ageMonths) : null;

  // Format weight in grams (e.g., 3515 g)
  const formatWeight = (kg) => {
    if (!kg) return '—';
    const grams = Math.round(kg * 1000);
    return `${grams.toLocaleString('de-DE')} g (${kg.toFixed(2).replace('.', ',')} kg)`;
  };

  const cards = [
    {
      title: 'Gewicht',
      value: formatWeight(latestMeasurement.weight),
      icon: Scale,
      pctData: weightPct,
      color: 'cyan',
    },
    {
      title: 'Körpergröße / Länge',
      value: latestMeasurement.length ? `${latestMeasurement.length} cm` : '—',
      icon: Ruler,
      pctData: lengthPct,
      color: 'emerald',
    },
    {
      title: 'Kopfumfang',
      value: latestMeasurement.headCircumference
        ? `${latestMeasurement.headCircumference} cm`
        : '—',
      icon: Circle,
      pctData: headPct,
      color: 'amber',
    },
    {
      title: 'BMI (Körpermasse)',
      value: bmiVal ? `${bmiVal} kg/m²` : '—',
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

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {card.value}
              </span>
            </div>

            {pct && pct.percentile !== null ? (
              <div className="flex flex-col gap-1">
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold w-max ${badgeBg}`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Vergleich: {pct.percentile} % aller Kinder</span>
                </div>
                <span className="text-[11px] text-slate-400">{pct.statusText}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">Keine Daten</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
