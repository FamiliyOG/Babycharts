import { WHO_DATA } from '../data/whoPercentiles.js';

/**
 * Calculates exact age in months and days between birthdate and target date
 */
export function calculateAge(birthdateStr, targetDateStr = null, t = null) {
  if (!birthdateStr) {
    const zeroDays = t ? `0 ${t('common.days', 'Tage')}` : '0 Tage';
    return { months: 0, days: 0, totalDays: 0, text: zeroDays };
  }

  const birthDate = new Date(birthdateStr);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();

  const diffTime = targetDate.getTime() - birthDate.getTime();
  if (diffTime < 0) {
    const zeroDays = t ? `0 ${t('common.days', 'Tage')}` : '0 Tage';
    return { months: 0, days: 0, totalDays: 0, text: zeroDays };
  }

  const totalDays = Math.floor(diffTime / (1000 * 3600 * 24));
  const monthsDecimal = +(totalDays / 30.4375).toFixed(1);

  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let days = targetDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  const yearsUnit = t ? t('common.yearsShort', 'Jahre') : 'Jahre';
  const monthsUnit = t ? t('common.monthsShort', 'Mon.') : 'Mon.';
  const daysUnit = t ? t('common.days', 'Tage') : 'Tage';

  let text = '';
  if (years > 0) {
    text = `${years} ${yearsUnit} ${months} ${monthsUnit}`;
  } else if (totalMonths > 0) {
    text = `${totalMonths} ${monthsUnit} ${days} ${daysUnit}`;
  } else {
    text = `${days} ${daysUnit}`;
  }

  return {
    years,
    months: totalMonths,
    days,
    monthsDecimal,
    totalDays,
    text,
  };
}

/**
 * Linear interpolation helper
 */
function interpolate(x, x0, x1, y0, y1) {
  if (x0 === x1) return y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

/**
 * Interpolates WHO reference values at a specific age in months
 */
export function getWHORefAtAge(gender, metric, ageMonths) {
  const genderKey = gender === 'girl' ? 'girl' : 'boy';
  const data = WHO_DATA[genderKey]?.[metric] || [];

  if (data.length === 0) return null;

  if (ageMonths <= data[0].month) return data[0];
  if (ageMonths >= data[data.length - 1].month) return data[data.length - 1];

  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];

    if (ageMonths >= current.month && ageMonths <= next.month) {
      const factor = (ageMonths - current.month) / (next.month - current.month);
      return {
        month: ageMonths,
        p3: +(current.p3 + factor * (next.p3 - current.p3)).toFixed(2),
        p15: +(current.p15 + factor * (next.p15 - current.p15)).toFixed(2),
        p50: +(current.p50 + factor * (next.p50 - current.p50)).toFixed(2),
        p85: +(current.p85 + factor * (next.p85 - current.p85)).toFixed(2),
        p97: +(current.p97 + factor * (next.p97 - current.p97)).toFixed(2),
      };
    }
  }

  return data[0];
}

/**
 * Helper to get user-friendly growth status details
 */
function getPercentileStatus(estPct) {
  if (estPct < 3) return { statusText: 'Unter 3 % (Sehr zierlich/leicht)', statusColor: 'red' };
  if (estPct < 15) return { statusText: '3 %–15 % (Erhöhte Aufmerksamkeit)', statusColor: 'amber' };
  if (estPct <= 85)
    return { statusText: '15 %–85 % (Idealer Durchschnittsbereich)', statusColor: 'green' };
  if (estPct <= 97)
    return { statusText: '85 %–97 % (Erhöhte Aufmerksamkeit)', statusColor: 'amber' };
  return { statusText: 'Über 97 % (Sehr kräftig/groß)', statusColor: 'red' };
}

/**
 * Estimates growth percentile given a measurement value, gender, metric, and age
 */
export function estimatePercentile(value, gender, metric, ageMonths) {
  if (!value || Number.isNaN(value)) {
    return { percentile: null, zScore: null, text: 'Keine Daten', statusColor: 'neutral' };
  }

  const ref = getWHORefAtAge(gender, metric, ageMonths);
  if (!ref) {
    return {
      percentile: null,
      zScore: null,
      text: 'Außerhalb des Referenzbereichs',
      statusColor: 'neutral',
    };
  }

  let estPct;

  if (value === ref.p50) {
    estPct = 50;
  } else if (value < ref.p50) {
    if (value <= ref.p3) {
      estPct = Math.max(1, Math.round(interpolate(value, 0, ref.p3, 0.1, 3)));
    } else if (value <= ref.p15) {
      estPct = Math.round(interpolate(value, ref.p3, ref.p15, 3, 15));
    } else {
      estPct = Math.round(interpolate(value, ref.p15, ref.p50, 15, 50));
    }
  } else if (value >= ref.p97) {
    estPct = Math.min(99, Math.round(interpolate(value, ref.p97, ref.p97 * 1.3, 97, 99.9)));
  } else if (value >= ref.p85) {
    estPct = Math.round(interpolate(value, ref.p85, ref.p97, 85, 97));
  } else {
    estPct = Math.round(interpolate(value, ref.p50, ref.p85, 50, 85));
  }

  const { statusText, statusColor } = getPercentileStatus(estPct);

  return {
    percentile: estPct,
    text: `Vergleichsrang: ${estPct} % (${statusText})`,
    statusText,
    statusColor,
    p50Ref: ref.p50,
  };
}

/**
 * Calculates BMI from weight (kg) and height (cm)
 */
export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return +(weightKg / (heightM * heightM)).toFixed(1);
}
