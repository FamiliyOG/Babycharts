/**
 * src/utils/csvExporter.js
 * Erstellt eine saubere, Excel-kompatible CSV-Datei aller Messungen und Gesundheitsdaten
 */

export function exportChildToCSV(child) {
  if (!child) return null;

  const lines = [
    '"BabyCharts Entwicklungs- und Messdatenbericht"',
    `"Kind:";"${child.name}"`,
    `"Geschlecht:";"${child.gender === 'girl' ? 'Mädchen' : 'Junge'}"`,
    `"Geburtsdatum:";"${child.birthdate || '-'}"`,
    `"Exportiert am:";"${new Date().toLocaleString('de-DE')}"`,
    '',
    '"--- WACHSTUMSMESSUNGEN ---"',
    '"Datum";"Untersuchung";"Gewicht (kg)";"Körperlänge (cm)";"Kopfumfang (cm)";"Notizen"',
  ];

  const measurements = child.measurements || [];
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  sorted.forEach((m) => {
    const dStr = m.date || '';
    const checkup = m.checkup || '-';
    const weight =
      m.weight !== undefined && m.weight !== null ? String(m.weight).replace('.', ',') : '';
    const length =
      m.length !== undefined && m.length !== null ? String(m.length).replace('.', ',') : '';
    const hc =
      m.headCircumference !== undefined && m.headCircumference !== null
        ? String(m.headCircumference).replace('.', ',')
        : '';
    const notes = (m.notes || '').replaceAll('"', '""');

    lines.push(`"${dStr}";"${checkup}";"${weight}";"${length}";"${hc}";"${notes}"`);
  });

  lines.push(
    '',
    '"--- DOKUMENTIERTE IMPFUNGEN ---"',
    '"Impfung ID";"Datum";"Arzt / Praxis";"Charge";"Notizen"'
  );

  const vaccines = child.vaccinations || {};
  Object.keys(vaccines).forEach((vId) => {
    const v = vaccines[vId];
    if (v?.completed) {
      const vDate = v.date || '';
      const doctor = (v.doctor || '').replaceAll('"', '""');
      const batch = (v.batch || '').replaceAll('"', '""');
      const vNotes = (v.notes || '').replaceAll('"', '""');
      lines.push(`"${vId}";"${vDate}";"${doctor}";"${batch}";"${vNotes}"`);
    }
  });

  lines.push('', '"--- ERREICHTE MEILENSTEINE ---"', '"Meilenstein";"Datum";"Notizen"');

  const milestones = child.milestones || {};
  Object.keys(milestones).forEach((mId) => {
    const m = milestones[mId];
    if (m?.completed) {
      const mDate = m.date || '';
      const mNotes = (m.notes || '').replaceAll('"', '""');
      lines.push(`"${mId}";"${mDate}";"${mNotes}"`);
    }
  });

  const csvContent = '\uFEFF' + lines.join('\r\n'); // Add UTF-8 BOM for Excel compatibility

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const cleanName = (child.name || 'Kind').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.href = url;
  link.download = `BabyCharts_Daten_${cleanName}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return true;
}
