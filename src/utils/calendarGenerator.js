/**
 * src/utils/calendarGenerator.js
 * Erstellt standardkonforme .ics (iCalendar) Dateien für Apple Kalender, Google Kalender & Outlook
 */

import { U_CHECKUPS } from '../data/uCheckups.js';
import { STIKO_VACCINATIONS } from '../data/vaccinations.js';

function formatDateToICS(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

export function generateChildICalendar(child) {
  if (!child?.birthdate) return null;

  const bDate = new Date(child.birthdate);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const events = [];

  // 1. U-Untersuchungen (U1 bis U9)
  U_CHECKUPS.forEach((u) => {
    const startWindow = new Date(bDate);
    const endWindow = new Date(bDate);

    startWindow.setDate(startWindow.getDate() + Math.round(u.periodMonthsMin * 30.4375));
    endWindow.setDate(endWindow.getDate() + Math.round(u.periodMonthsMax * 30.4375));

    const isCompleted = child.measurements?.some((m) => m.checkup === u.id);
    const statusText = isCompleted ? ' [Bereits erledigt]' : ' [Anstehend]';

    events.push(
      [
        'BEGIN:VEVENT',
        `UID:ucheckup-${u.id}-${child.id || 'child'}@babycharts.local`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${formatDateToICS(startWindow)}`,
        `DTEND;VALUE=DATE:${formatDateToICS(endWindow)}`,
        `SUMMARY:${u.id} Vorsorgeuntersuchung für ${child.name}${statusText}`,
        String.raw`DESCRIPTION:Empfohlenes Zeitfenster für ${u.name} (${u.periodText}).\nSchwerpunkte: ${u.description || ''}`,
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Erinnerung: Zeitfenster für ${u.id} von ${child.name} beginnt bald!`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    );
  });

  // 2. STIKO-Impfungen
  STIKO_VACCINATIONS.forEach((v) => {
    const vDate = new Date(bDate);
    vDate.setDate(vDate.getDate() + Math.round(v.recommendedAgeMonths * 30.4375));
    const isCompleted = child.vaccinations?.[v.id]?.completed;
    const statusText = isCompleted ? ' [Bereits geimpft]' : ' [Empfohlen]';

    events.push(
      [
        'BEGIN:VEVENT',
        `UID:vaccine-${v.id}-${child.id || 'child'}@babycharts.local`,
        `DTSTAMP:${timestamp}`,
        `DTSTART;VALUE=DATE:${formatDateToICS(vDate)}`,
        `DTEND;VALUE=DATE:${formatDateToICS(new Date(vDate.getTime() + 86400000))}`,
        `SUMMARY:Impfung: ${v.name} für ${child.name}${statusText}`,
        String.raw`DESCRIPTION:STIKO-Empfehlung (${v.periodText}).\n${v.description || ''}`,
        'BEGIN:VALARM',
        'TRIGGER:-P7D',
        'ACTION:DISPLAY',
        `DESCRIPTION:Erinnerung: Impftermin für ${v.name} (${child.name}) vereinbaren!`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n')
    );
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BabyCharts//U-Heft & Impfkalender//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:BabyCharts: ${child.name}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    events.join('\r\n'),
    'END:VCALENDAR',
  ].join('\r\n');

  // Trigger browser download without attaching to DOM
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanName = (child.name || 'Kind').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.href = url;
  link.download = `BabyCharts_Kalender_${cleanName}.ics`;
  link.click();
  URL.revokeObjectURL(url);

  return true;
}
