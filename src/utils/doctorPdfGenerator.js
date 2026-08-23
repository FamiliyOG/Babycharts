/**
 * src/utils/doctorPdfGenerator.js
 * Generates an acute 72-hour Pediatrician / Emergency PDF summary
 * (Fever course, administered medications with timestamps, symptoms, and child vitals)
 */

import jsPDF from 'jspdf';
import { calculateAge } from './percentileCalc.js';

export function generateDoctorFeverReport(child) {
  if (!child) return null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const age = calculateAge(child.birthdate);
  const healthLog = child.healthLog || [];

  // Filter logs from last 72 hours (or last 10 entries if sparse)
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

  let recentLogs = healthLog.filter((item) => new Date(item.dateTime) >= threeDaysAgo);
  if (recentLogs.length === 0) {
    recentLogs = [...healthLog].slice(0, 10);
  }
  recentLogs.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  // Colors
  const primaryColor = [15, 23, 42]; // Slate 900
  const accentRed = [225, 29, 72]; // Rose 600
  const borderGray = [226, 232, 240]; // Slate 200

  // ── Header Box ─────────────────────────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(10, 10, 190, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('KINDERARZT-AKUTBERICHT (Fieber & Verlauf)', 15, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Erstellt am: ${now.toLocaleDateString('de-DE')} um ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`,
    15,
    28
  );

  // ── Child Demographics Card ────────────────────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(10, 38, 190, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PATIENTENDATEN', 15, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${child.name}`, 15, 53);
  doc.text(
    `Geschlecht: ${child.gender === 'girl' ? 'Weiblich (Mädchen)' : 'Männlich (Junge)'}`,
    15,
    60
  );

  doc.text(`Geburtsdatum: ${child.birthdate || 'Unbekannt'}`, 105, 53);
  doc.text(`Aktuelles Alter: ${age.text}`, 105, 60);

  // ── Latest Status Summary ──────────────────────────────────────────────────
  const latestWithTemp = recentLogs.find((l) => l.temperature !== null);
  const latestMed = recentLogs.find((l) => l.medication);

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(...accentRed);
  doc.roundedRect(10, 70, 190, 24, 2, 2, 'FD');

  doc.setTextColor(...accentRed);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AKTUELLE VITALWERTE & LETZTE MEDIKATION', 15, 77);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const lastTempStr = latestWithTemp
    ? `${latestWithTemp.temperature} °C (${new Date(latestWithTemp.dateTime).toLocaleString('de-DE')})`
    : 'Keine Messung';
  doc.text(`Letzte gemessene Temperatur: ${lastTempStr}`, 15, 84);

  const lastMedStr = latestMed
    ? `${latestMed.medication} (${new Date(latestMed.dateTime).toLocaleString('de-DE')})`
    : 'Keines dokumentiert';
  doc.text(`Letztes Medikament: ${lastMedStr}`, 15, 90);

  // ── 72h Table Log ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('VERLAUFSPROTOKOLL (Letzte 72 Stunden)', 10, 103);

  // Table Headers
  let y = 110;
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, 190, 8, 'F');
  doc.setDrawColor(...borderGray);
  doc.rect(10, y, 190, 8, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Datum / Uhrzeit', 13, y + 5.5);
  doc.text('Temperatur', 55, y + 5.5);
  doc.text('Medikament / Dosis', 85, y + 5.5);
  doc.text('Symptome & Notizen', 135, y + 5.5);

  y += 8;

  if (recentLogs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('Keine Einträge im angegebenen Zeitraum vorhanden.', 15, y + 8);
  } else {
    recentLogs.forEach((entry, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const d = new Date(entry.dateTime);
      const dateFormatted = `${d.toLocaleDateString('de-DE')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

      // Alternate row background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, y, 190, 10, 'F');
      }
      doc.setDrawColor(...borderGray);
      doc.rect(10, y, 190, 10, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(dateFormatted, 13, y + 6.5);

      if (entry.temperature !== null) {
        if (entry.temperature >= 38.5) {
          doc.setTextColor(225, 29, 72);
          doc.setFont('helvetica', 'bold');
        } else if (entry.temperature >= 37.5) {
          doc.setTextColor(217, 119, 6);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(16, 185, 129);
        }
        doc.text(`${entry.temperature} °C`, 55, y + 6.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', 55, y + 6.5);
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(entry.medication ? entry.medication.substring(0, 28) : '—', 85, y + 6.5);

      const symptomStr = [...(entry.symptoms || []), entry.notes ? `Hinweis: ${entry.notes}` : '']
        .filter(Boolean)
        .join(', ');

      doc.text(symptomStr ? symptomStr.substring(0, 36) : '—', 135, y + 6.5);

      y += 10;
    });
  }

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Generiert mit BabyCharts – Alle Angaben ohne Gewähr. Dient als Vorlage für das ärztliche Anamnesegespräch.',
    10,
    285
  );

  const cleanName = child.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`BabyCharts_Kinderarzt_Bericht_${cleanName}.pdf`);
  return true;
}
