import { U_CHECKUPS } from '../data/uCheckups.js';
import { STIKO_VACCINATIONS } from '../data/vaccinations.js';

/**
 * Calculates upcoming, due, and overdue reminders for U-Checkups and STIKO Vaccinations.
 *
 * @param {object} child - Child profile with birthdate (YYYY-MM-DD) and checkups/vaccinations arrays
 * @returns {{ checkups: Array, vaccinations: Array, totalDueCount: number }}
 */
export function calculateReminders(child) {
  if (!child || !child.birthdate) {
    return { checkups: [], vaccinations: [], totalDueCount: 0 };
  }

  const birthTime = new Date(child.birthdate).getTime();
  const now = Date.now();
  const ageMonths = (now - birthTime) / (1000 * 60 * 60 * 24 * 30.4375);

  // Completed U-Checkups from measurements array or child.checkups
  const completedCheckupIds = new Set([
    ...(Array.isArray(child.measurements)
      ? child.measurements.filter((m) => m.checkup).map((m) => m.checkup)
      : []),
    ...(Array.isArray(child.checkups)
      ? child.checkups.filter((c) => c.completed).map((c) => c.id)
      : []),
  ]);

  // Completed vaccinations from object map (child.vaccinations[id] = { completed: true }) or array
  const completedVaccineIds = new Set();
  if (child.vaccinations && typeof child.vaccinations === 'object') {
    if (Array.isArray(child.vaccinations)) {
      child.vaccinations.forEach((v) => {
        if (v?.completed && v.id) completedVaccineIds.add(v.id);
      });
    } else {
      Object.entries(child.vaccinations).forEach(([vaxId, vaxData]) => {
        if (vaxData?.completed) {
          completedVaccineIds.add(vaxId);
        }
      });
    }
  }

  const upcomingCheckups = U_CHECKUPS.map((u) => {
    const isCompleted = completedCheckupIds.has(u.id);
    const isDue = ageMonths >= u.periodMonthsMin && ageMonths <= u.periodMonthsMax && !isCompleted;
    const isOverdue = ageMonths > u.periodMonthsMax && !isCompleted;
    const isUpcoming =
      ageMonths < u.periodMonthsMin && ageMonths >= u.periodMonthsMin - 1.5 && !isCompleted;

    let status = 'future';
    if (isCompleted) status = 'completed';
    else if (isOverdue) status = 'overdue';
    else if (isDue) status = 'due';
    else if (isUpcoming) status = 'upcoming';

    return {
      ...u,
      status,
      isCompleted,
    };
  }).filter((u) => !u.isCompleted && u.status !== 'future');

  const upcomingVaccines = STIKO_VACCINATIONS.map((v) => {
    const isCompleted = completedVaccineIds.has(v.id);
    const isDue =
      ageMonths >= v.recommendedAgeMonths &&
      ageMonths <= v.recommendedAgeMonths + 2 &&
      !isCompleted;
    const isOverdue = ageMonths > v.recommendedAgeMonths + 2 && !isCompleted;
    const isUpcoming =
      ageMonths < v.recommendedAgeMonths && ageMonths >= v.recommendedAgeMonths - 1 && !isCompleted;

    let status = 'future';
    if (isCompleted) status = 'completed';
    else if (isOverdue) status = 'overdue';
    else if (isDue) status = 'due';
    else if (isUpcoming) status = 'upcoming';

    return {
      ...v,
      status,
      isCompleted,
    };
  }).filter((v) => !v.isCompleted && v.status !== 'future');

  const totalDueCount =
    upcomingCheckups.filter((c) => c.status === 'due' || c.status === 'overdue').length +
    upcomingVaccines.filter((v) => v.status === 'due' || v.status === 'overdue').length;

  return {
    checkups: upcomingCheckups,
    vaccinations: upcomingVaccines,
    totalDueCount,
  };
}

/**
 * Request Web Notification permission and trigger a local reminder notification if granted.
 *
 * @param {string} title
 * @param {string} body
 */
export async function sendLocalNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
    });
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon.png',
        badge: '/icon.png',
      });
      return true;
    }
  }

  return false;
}
