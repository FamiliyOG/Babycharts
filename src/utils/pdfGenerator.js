import jsPDF from 'jspdf';
import i18n from '../i18n/index.js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { calculateAge, calculateBMI, estimatePercentile } from './percentileCalc.js';
import { WHO_DATA } from '../data/whoPercentiles.js';

// Register Chart.js components for off-screen rendering
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

/**
 * Generates a formatted timestamp string: YYYY-MM-DD_HH-mm-ss
 */
export function getFormattedTimestamp(dateObj = new Date()) {
  const pad = (num) => String(num).padStart(2, '0');
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Renders a single WHO growth chart to a canvas and returns a base64 PNG string.
 * Uses an off-screen canvas — no DOM side effects.
 */
async function renderChartImage(birthdate, measurements, metric, genderKey) {
  const isGirl = genderKey === 'girl';
  const childColor = isGirl ? '#ec4899' : '#06b6d4';
  const whoData = (WHO_DATA[genderKey]?.[metric] || []).filter((d) => d.month <= 60);

  // Map child measurements to exact decimal month positions
  const bDate = new Date(birthdate);
  const childPoints = [];
  for (const m of measurements) {
    const diffMs = new Date(m.date) - bDate;
    const monthsDecimal = +(diffMs / (1000 * 60 * 60 * 24 * 30.4375)).toFixed(2);
    let val = null;
    if (metric === 'weight') val = m.weight ? Math.round(m.weight * 1000) : null;
    else if (metric === 'length') val = m.length ?? null;
    else if (metric === 'headCircumference') val = m.headCircumference ?? null;
    else if (metric === 'bmi' && m.weight && m.length) {
      val = Number.parseFloat((m.weight / (m.length / 100) ** 2).toFixed(1));
    }
    if (val !== null && !Number.isNaN(val)) {
      childPoints.push({ x: monthsDecimal, y: val });
    }
  }
  childPoints.sort((a, b) => a.x - b.x);

  // Scale WHO reference lines to same unit as child data
  function scale(val) {
    return metric === 'weight' ? Math.round(val * 1000) : val;
  }

  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 250;
  // Must be appended to DOM briefly for Chart.js to render correctly
  canvas.style.position = 'fixed';
  canvas.style.top = '-9999px';
  canvas.style.left = '-9999px';
  document.body.appendChild(canvas);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      datasets: [
        {
          label: '85%',
          data: whoData.map((d) => ({ x: d.month, y: scale(d.p85) })),
          borderColor: 'rgba(99,102,241,0.25)',
          backgroundColor: 'rgba(99,102,241,0.07)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1',
          tension: 0.3,
          order: 3,
        },
        {
          label: '15%',
          data: whoData.map((d) => ({ x: d.month, y: scale(d.p15) })),
          borderColor: 'rgba(99,102,241,0.25)',
          backgroundColor: 'rgba(99,102,241,0.07)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          order: 3,
        },
        {
          label: '97%',
          data: whoData.map((d) => ({ x: d.month, y: scale(d.p97) })),
          borderColor: 'rgba(148,163,184,0.4)',
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          order: 4,
        },
        {
          label: '50% (Median)',
          data: whoData.map((d) => ({ x: d.month, y: scale(d.p50) })),
          borderColor: 'rgba(100,116,139,0.7)',
          borderWidth: 1.5,
          borderDash: [5, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          order: 4,
        },
        {
          label: '3%',
          data: whoData.map((d) => ({ x: d.month, y: scale(d.p3) })),
          borderColor: 'rgba(148,163,184,0.4)',
          borderWidth: 1,
          borderDash: [3, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          order: 4,
        },
        {
          label: 'Kind',
          data: childPoints,
          borderColor: childColor,
          backgroundColor: childColor,
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 6,
          pointBackgroundColor: childColor,
          fill: false,
          tension: 0.25,
          spanGaps: true,
          order: 1,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 60,
          grid: { color: 'rgba(200,210,220,0.4)' },
          ticks: {
            color: '#475569',
            font: { size: 9 },
            callback: (val) => `${val}M`,
            stepSize: 6,
          },
        },
        y: {
          grid: { color: 'rgba(200,210,220,0.4)' },
          ticks: { color: '#475569', font: { size: 9 } },
        },
      },
    },
  });

  // Allow Chart.js one animation frame to render
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const base64 = canvas.toDataURL('image/png');
  chart.destroy();
  canvas.remove();
  return base64;
}

// ────────────────────────────────────────────────
// PDF Section Drawing Helpers
// ────────────────────────────────────────────────

function drawPdfHeader(doc, marginLeft, marginTop, contentWidth, pageWidth, nowStr, statusLabel) {
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(marginLeft, marginTop, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(
    String(i18n.t('pdfReports.growthTitle') || 'BABYCHARTS WACHSTUMSBERICHT'),
    marginLeft + 5,
    marginTop + 9
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    String(i18n.t('pdfReports.growthSubtitle') || 'WHO-Wachstumskurven & Protokoll'),
    marginLeft + 5,
    marginTop + 15
  );

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${String(i18n.t('pdfReports.exportDate'))}: ${String(nowStr)}`,
    pageWidth - marginLeft - 5,
    marginTop + 9,
    { align: 'right' }
  );
  doc.text(
    `${String(i18n.t('pdfReports.status'))}: ${String(statusLabel)}`,
    pageWidth - marginLeft - 5,
    marginTop + 15,
    {
      align: 'right',
    }
  );

  return marginTop + 28;
}

function drawChildInfoBox(doc, childMeta, layout) {
  const { activeChild, childName, isGirl, ageInfoText } = childMeta;
  const { marginLeft, y, contentWidth } = layout;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, y, contentWidth, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${String(i18n.t('pdfReports.child'))}: ${String(childName || 'Kind')}`,
    marginLeft + 5,
    y + 8
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const genderText = isGirl
    ? String(i18n.t('pdfReports.girl') || 'Maedchen')
    : String(i18n.t('pdfReports.boy') || 'Junge');
  doc.text(`${String(i18n.t('pdfReports.gender'))}: ${genderText}`, marginLeft + 5, y + 14);

  if (activeChild) {
    // Format birthdate from YYYY-MM-DD
    const formattedBirth = activeChild.birthdate
      ? new Date(activeChild.birthdate).toLocaleDateString()
      : '-';
    doc.text(
      `${String(i18n.t('pdfReports.birthdate'))}: ${String(formattedBirth)}`,
      marginLeft + 90,
      y + 8
    );
    doc.text(
      `${String(i18n.t('pdfReports.currentAge'))}: ${String(ageInfoText || '-')}`,
      marginLeft + 90,
      y + 14
    );
  }

  return y + 26;
}

function drawSingleMeasurementCard(doc, x, y, width, height, config) {
  const { title, titleColor, fill, stroke, valText, pctVal } = config;
  doc.setFillColor(...fill);
  doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');

  doc.setFontSize(7);
  doc.setTextColor(...titleColor);
  doc.text(title, x + 3, y + 5);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(valText, x + 3, y + 11);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...titleColor);
  const pctStr =
    pctVal !== null && pctVal !== undefined
      ? `~${pctVal}. ${String(i18n.t('pdfReports.percentile'))}`
      : '—';
  doc.text(pctStr, x + 3, y + 15.5);
}

function drawLatestMeasurementCards(
  doc,
  latest,
  gender,
  ageMonthsDecimal,
  marginLeft,
  y,
  contentWidth
) {
  if (!latest) return y;

  const formattedLatestDate = latest.date
    ? new Date(latest.date).toLocaleDateString([], {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';
  doc.text(`${i18n.t('pdfReports.latestMeasurement')} (${formattedLatestDate})`, marginLeft, y);
  y += 4;

  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 18;
  const weightGrams = latest.weight ? Math.round(latest.weight * 1000) : null;
  const weightPct = latest.weight
    ? estimatePercentile(latest.weight, gender, 'weight', ageMonthsDecimal)?.percentile
    : null;
  const lengthPct = latest.length
    ? estimatePercentile(latest.length, gender, 'length', ageMonthsDecimal)?.percentile
    : null;
  const headPct = latest.headCircumference
    ? estimatePercentile(latest.headCircumference, gender, 'headCircumference', ageMonthsDecimal)
        ?.percentile
    : null;
  const bmiVal = calculateBMI(latest.weight, latest.length);
  const bmiPct = bmiVal
    ? estimatePercentile(bmiVal, gender, 'bmi', ageMonthsDecimal)?.percentile
    : null;

  // Card 1: Weight
  drawSingleMeasurementCard(doc, marginLeft, y, cardWidth, cardHeight, {
    title: String(i18n.t('pdfReports.weight')).toUpperCase(),
    titleColor: [8, 145, 178],
    fill: [236, 254, 255],
    stroke: [165, 243, 252],
    valText: weightGrams ? `${weightGrams.toLocaleString()} g` : '—',
    pctVal: weightPct,
  });

  // Card 2: Length
  const card2X = marginLeft + cardWidth + 3;
  drawSingleMeasurementCard(doc, card2X, y, cardWidth, cardHeight, {
    title: String(i18n.t('pdfReports.length')).toUpperCase(),
    titleColor: [22, 163, 74],
    fill: [240, 253, 244],
    stroke: [187, 247, 208],
    valText: latest.length ? `${latest.length} cm` : '—',
    pctVal: lengthPct,
  });

  // Card 3: Head
  const card3X = card2X + cardWidth + 3;
  drawSingleMeasurementCard(doc, card3X, y, cardWidth, cardHeight, {
    title: String(i18n.t('pdfReports.head')).toUpperCase(),
    titleColor: [217, 119, 6],
    fill: [254, 243, 199],
    stroke: [253, 230, 138],
    valText: latest.headCircumference ? `${latest.headCircumference} cm` : '—',
    pctVal: headPct,
  });

  // Card 4: BMI
  const card4X = card3X + cardWidth + 3;
  drawSingleMeasurementCard(doc, card4X, y, cardWidth, cardHeight, {
    title: String(i18n.t('pdfReports.bmi')).toUpperCase(),
    titleColor: [192, 38, 211],
    fill: [253, 244, 255],
    stroke: [245, 208, 254],
    valText: bmiVal ? `${bmiVal}` : '—',
    pctVal: bmiPct,
  });

  return y + cardHeight + 8;
}

function drawChartSection(doc, base64, title, chartLayout) {
  const { marginLeft, y, contentWidth, pageHeight, marginTop } = chartLayout;
  const chartH = 48;
  let currentY = y;
  if (currentY + chartH + 15 > pageHeight - 15) {
    doc.addPage();
    currentY = marginTop;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(String(title), marginLeft, currentY);
  currentY += 3;
  doc.addImage(base64, 'PNG', marginLeft, currentY, contentWidth, chartH);
  return currentY + chartH + 6;
}

function drawMeasurementTable(
  doc,
  sortedMeasurements,
  marginLeft,
  y,
  contentWidth,
  pageHeight,
  marginTop
) {
  let currentY = y;
  if (currentY + 20 > pageHeight - 15) {
    doc.addPage();
    currentY = marginTop;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${String(i18n.t('growth.history'))} (${sortedMeasurements.length})`,
    marginLeft,
    currentY
  );
  currentY += 4;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginLeft, currentY, contentWidth, 7, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(String(i18n.t('common.date')), marginLeft + 3, currentY + 5);
  doc.text(String(i18n.t('pdfReports.checkup')), marginLeft + 28, currentY + 5);
  doc.text(`${String(i18n.t('pdfReports.weight'))} (g)`, marginLeft + 50, currentY + 5);
  doc.text(`${String(i18n.t('pdfReports.length'))} (cm)`, marginLeft + 80, currentY + 5);
  doc.text(`${String(i18n.t('pdfReports.head'))} (cm)`, marginLeft + 108, currentY + 5);
  doc.text(String(i18n.t('pdfReports.bmi')), marginLeft + 133, currentY + 5);
  doc.text(String(i18n.t('common.notes')), marginLeft + 150, currentY + 5);
  currentY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  sortedMeasurements.forEach((m, idx) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = marginTop;
    }
    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.setDrawColor(241, 245, 249);
    doc.rect(marginLeft, currentY, contentWidth, 6, 'FD');

    doc.setTextColor(15, 23, 42);
    const formattedRowDate = m.date
      ? new Date(m.date).toLocaleDateString([], {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '-';
    doc.text(String(formattedRowDate), marginLeft + 3, currentY + 4);
    doc.setTextColor(8, 145, 178);
    doc.text(String(m.checkup || '-'), marginLeft + 28, currentY + 4);
    doc.setTextColor(15, 23, 42);
    doc.text(
      m.weight ? `${Math.round(m.weight * 1000).toLocaleString()} g` : '-',
      marginLeft + 50,
      currentY + 4
    );
    doc.text(m.length ? `${m.length} cm` : '-', marginLeft + 80, currentY + 4);
    doc.text(
      m.headCircumference ? `${m.headCircumference} cm` : '-',
      marginLeft + 108,
      currentY + 4
    );
    doc.text(calculateBMI(m.weight, m.length)?.toString() || '-', marginLeft + 133, currentY + 4);
    doc.setTextColor(100, 116, 139);
    doc.text(m.notes ? String(m.notes).substring(0, 20) : '-', marginLeft + 150, currentY + 4);
    currentY += 6;
  });

  return currentY + 8;
}

function drawPdfFooter(doc, marginLeft, y, pageWidth, pageHeight, _marginTop) {
  if (y > pageHeight - 15) {
    doc.addPage();
  }
  // Stamp page numbers on all pages (jsPDF internal API)
  const totalPages = doc.internal.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    const footerY = pageHeight - 8;
    doc.setDrawColor(203, 213, 225);
    doc.line(marginLeft, footerY - 3, pageWidth - marginLeft, footerY - 3);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      String('Basierend auf den offiziellen WHO Child Growth Standards (0-5 Jahre)'),
      marginLeft,
      footerY
    );
    doc.text(String(`Seite ${pageNum} / ${totalPages}`), pageWidth / 2, footerY, {
      align: 'center',
    });
    doc.text(String('BabyCharts Web-Anwendung'), pageWidth - marginLeft, footerY, {
      align: 'right',
    });
  }
}

/**
 * Renders all 4 metric charts in parallel and returns them as base64 PNGs.
 */
async function renderAllChartImages(measurements, birthdate, genderKey) {
  const hasWeight = measurements.some((m) => m.weight);
  const hasLength = measurements.some((m) => m.length);
  const hasHead = measurements.some((m) => m.headCircumference);
  const hasBmi = measurements.some((m) => m.weight && m.length);

  const [weightImg, lengthImg, headImg, bmiImg] = await Promise.all([
    hasWeight && birthdate
      ? renderChartImage(birthdate, measurements, 'weight', genderKey)
      : Promise.resolve(null),
    hasLength && birthdate
      ? renderChartImage(birthdate, measurements, 'length', genderKey)
      : Promise.resolve(null),
    hasHead && birthdate
      ? renderChartImage(birthdate, measurements, 'headCircumference', genderKey)
      : Promise.resolve(null),
    hasBmi && birthdate
      ? renderChartImage(birthdate, measurements, 'bmi', genderKey)
      : Promise.resolve(null),
  ]);
  return { weightImg, lengthImg, headImg, bmiImg };
}

const CHART_TITLES = {
  weight: 'Wachstumskurve: Gewicht (g) nach Alter',
  length: 'Wachstumskurve: Groesse / Laenge (cm) nach Alter',
  headCircumference: 'Wachstumskurve: Kopfumfang (cm) nach Alter',
  bmi: 'Wachstumskurve: BMI (kg/m2) nach Alter',
};

/**
 * Embeds all non-null chart images into the PDF document.
 */
function embedChartImages(doc, charts, chartLayout) {
  let y = chartLayout.y;
  const entries = [
    ['weight', charts.weightImg],
    ['length', charts.lengthImg],
    ['headCircumference', charts.headImg],
    ['bmi', charts.bmiImg],
  ];
  for (const [metric, img] of entries) {
    if (img) {
      y = drawChartSection(doc, img, CHART_TITLES[metric], { ...chartLayout, y });
    }
  }
  return y;
}

/**
 * Generates a complete PDF report including WHO growth charts and measurement table.
 */
export async function exportReportToPdf(
  elementId,
  childName = 'Kind',
  gender = 'boy',
  activeChild = null,
  measurements = [],
  isAutoExport = false
) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const isGirl = gender === 'girl';
    const genderKey = isGirl ? 'girl' : 'boy';
    const nowStr = new Date().toLocaleString('de-DE');
    const ageInfo = activeChild
      ? calculateAge(activeChild.birthdate)
      : { text: '-', monthsDecimal: 0 };
    const statusLabel = isAutoExport ? 'AUTOMATISCHER EXPORT' : 'MANUELLER EXPORT';

    const sortedMeasurements = [...measurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latest = sortedMeasurements[0] || null;

    const marginLeft = 15;
    const marginTop = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginLeft * 2;

    const charts = await renderAllChartImages(measurements, activeChild?.birthdate, genderKey);

    // Build PDF document
    let y = drawPdfHeader(doc, marginLeft, marginTop, contentWidth, pageWidth, nowStr, statusLabel);
    y = drawChildInfoBox(
      doc,
      { activeChild, childName, isGirl, ageInfoText: ageInfo.text },
      { marginLeft, y, contentWidth }
    );
    y = drawLatestMeasurementCards(
      doc,
      latest,
      gender,
      ageInfo.monthsDecimal,
      marginLeft,
      y,
      contentWidth
    );
    y = embedChartImages(doc, charts, { marginLeft, y, contentWidth, pageHeight, marginTop });
    y = drawMeasurementTable(
      doc,
      sortedMeasurements,
      marginLeft,
      y,
      contentWidth,
      pageHeight,
      marginTop
    );
    drawPdfFooter(doc, marginLeft, y, pageWidth, pageHeight, marginTop);

    const timestampStr = getFormattedTimestamp();
    const cleanName = childName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Wachstumskurve_${cleanName}_${timestampStr}.pdf`;
    doc.save(fileName);
    return fileName;
  } catch (err) {
    console.error('PDF Generation failed:', err);
    return false;
  }
}

function drawA5Header(doc, marginLeft, marginTop, contentWidth, isGirl) {
  doc.setFillColor(isGirl ? 225 : 8, isGirl ? 29 : 145, isGirl ? 72 : 178);
  doc.roundedRect(marginLeft, marginTop, contentWidth, 16, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    i18n.t('pdfReports.uHeftTitle') || 'U-HEFT EINLEGER & VORSORGE-PASS',
    marginLeft + 5,
    marginTop + 7
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    i18n.t('pdfReports.uHeftSubtitle') || 'Kompakte Entwicklungsübersicht für die U-Untersuchungen',
    marginLeft + 5,
    marginTop + 12
  );
  return marginTop + 21;
}

function drawA5ChildBox(doc, marginLeft, y, contentWidth, info) {
  const { childName, isGirl, bDateStr, ageText } = info;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginLeft, y, contentWidth, 18, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const genderLabel = isGirl ? i18n.t('pdfReports.girl') : i18n.t('pdfReports.boy');
  doc.text(`${i18n.t('pdfReports.child')}: ${childName} (${genderLabel})`, marginLeft + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${i18n.t('pdfReports.birthdate')}: ${bDateStr}   |   ${i18n.t('pdfReports.currentAge')}: ${ageText}`,
    marginLeft + 4,
    y + 12
  );
  return y + 23;
}

function drawA5LatestCard(doc, marginLeft, y, contentWidth, latest, isGirl) {
  if (!latest) return y;

  doc.setFillColor(isGirl ? 253 : 240, isGirl ? 242 : 253, isGirl ? 248 : 250);
  doc.setDrawColor(isGirl ? 244 : 165, isGirl ? 114 : 243, isGirl ? 182 : 252);
  doc.roundedRect(marginLeft, y, contentWidth, 16, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isGirl ? 159 : 8, isGirl ? 18 : 145, isGirl ? 57 : 178);
  const mDateStr = new Date(latest.date).toLocaleDateString();
  doc.text(`${i18n.t('pdfReports.latestMeasurement')} (${mDateStr}):`, marginLeft + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const wStr = latest.weight ? `${Math.round(latest.weight * 1000)} g` : '-';
  const lStr = latest.length ? `${latest.length} cm` : '-';
  const hStr = latest.headCircumference ? `${latest.headCircumference} cm` : '-';
  doc.text(
    `${i18n.t('pdfReports.weight')}: ${wStr}   |   ${i18n.t('pdfReports.length')}: ${lStr}   |   ${i18n.t('pdfReports.head')}: ${hStr}`,
    marginLeft + 4,
    y + 11.5
  );
  return y + 21;
}

function drawA5UTable(doc, marginLeft, y, contentWidth, sorted) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${i18n.t('uCheckups.title')} (U1 – U9):`, marginLeft, y);
  y += 4;

  doc.setFillColor(226, 232, 240);
  doc.rect(marginLeft, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(i18n.t('pdfReports.checkup'), marginLeft + 2, y + 4.2);
  doc.text(i18n.t('common.date'), marginLeft + 20, y + 4.2);
  doc.text(i18n.t('pdfReports.weight'), marginLeft + 42, y + 4.2);
  doc.text(i18n.t('pdfReports.length'), marginLeft + 62, y + 4.2);
  doc.text(i18n.t('pdfReports.head'), marginLeft + 82, y + 4.2);
  doc.text(i18n.t('common.notes'), marginLeft + 98, y + 4.2);
  y += 6;

  const uList = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U7a', 'U8', 'U9'];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  for (let idx = 0; idx < uList.length; idx++) {
    const uName = uList[idx];
    const match = sorted.find((m) => m.checkup === uName);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginLeft, y, contentWidth, 5.5, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, y + 5.5, marginLeft + contentWidth, y + 5.5);

    doc.setTextColor(15, 23, 42);
    doc.text(uName, marginLeft + 2, y + 4);
    doc.text(match ? new Date(match.date).toLocaleDateString() : '-', marginLeft + 20, y + 4);
    doc.text(match?.weight ? `${Math.round(match.weight * 1000)} g` : '-', marginLeft + 42, y + 4);
    doc.text(match?.length ? `${match.length} cm` : '-', marginLeft + 62, y + 4);
    doc.text(
      match?.headCircumference ? `${match.headCircumference} cm` : '-',
      marginLeft + 82,
      y + 4
    );
    doc.text(match?.notes ? String(match.notes).slice(0, 22) : '-', marginLeft + 98, y + 4);
    y += 5.5;
  }
  return y + 4;
}

function drawA5FooterBox(doc, marginLeft, y, contentWidth, activeChild) {
  const vaxCount = Object.keys(activeChild?.vaccinations || {}).filter(
    (k) => activeChild.vaccinations[k]?.completed
  ).length;
  const teethCount = Object.keys(activeChild?.teeth || {}).filter(
    (k) => activeChild.teeth[k]?.erupted
  ).length;

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginLeft, y, contentWidth, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(i18n.t('pdfReports.vaxCount', { count: vaxCount }), marginLeft + 4, y + 5);
  doc.text(i18n.t('pdfReports.teethCount', { count: teethCount }), marginLeft + 4, y + 9.5);
}

/**
 * Generates a compact DIN A5 PDF booklet insert for the German U-Heft.
 */
export function generateUHeftA5Pdf(activeChild, measurements = []) {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    const isGirl = activeChild?.gender === 'girl';
    const childName = activeChild?.name || 'Kind';
    const bDateStr = activeChild?.birthdate
      ? new Date(activeChild.birthdate).toLocaleDateString('de-DE')
      : '-';
    const ageInfo = activeChild
      ? calculateAge(activeChild.birthdate)
      : { text: '-', monthsDecimal: 0 };

    const sorted = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const latest = sorted.at(-1) || null;

    const marginLeft = 10;
    const marginTop = 10;
    const pageWidth = doc.internal.pageSize.getWidth(); // 148 mm
    const contentWidth = pageWidth - marginLeft * 2; // 128 mm

    let y = drawA5Header(doc, marginLeft, marginTop, contentWidth, isGirl);
    y = drawA5ChildBox(doc, marginLeft, y, contentWidth, {
      childName,
      isGirl,
      bDateStr,
      ageText: ageInfo.text,
    });
    y = drawA5LatestCard(doc, marginLeft, y, contentWidth, latest, isGirl);
    y = drawA5UTable(doc, marginLeft, y, contentWidth, sorted);
    drawA5FooterBox(doc, marginLeft, y, contentWidth, activeChild);

    const timestampStr = getFormattedTimestamp();
    const cleanName = childName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `U-Heft_Einleger_A5_${cleanName}_${timestampStr}.pdf`;
    doc.save(fileName);
    return fileName;
  } catch (err) {
    console.error('A5 PDF Generation failed:', err);
    return null;
  }
}
