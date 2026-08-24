/**
 * src/components/ReportPrintPage.jsx
 *
 * Standalone full-page report rendered when the app is opened by Puppeteer
 * with the query parameter ?puppeteerReport=<childId>.
 *
 * This component:
 *  1. Reads the childId from the URL search params
 *  2. Fetches the child profile from the backend API (/api/profiles/:id)
 *  3. Renders the report in a print-friendly white layout
 *  4. Adds a #puppeteer-report-ready sentinel element once data is loaded
 *     (server/pdfGenerator.js waits for this element before calling page.pdf())
 */

import { useEffect, useState } from 'react';
import { calculateAge, calculateBMI, estimatePercentile } from '../utils/percentileCalc.js';

export default function ReportPrintPage() {
  const [child, setChild] = useState(null);
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const rawChildId = params.get('puppeteerReport');
    if (!rawChildId) return 'No childId provided';
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validIdPattern.test(rawChildId)) return 'Ungültige Profil-ID im URL-Parameter.';
    return null;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawChildId = params.get('puppeteerReport');
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!rawChildId || !validIdPattern.test(rawChildId)) return;

    const safeChildId = rawChildId.trim();
    let isMounted = true;
    fetch(`/api/profiles/${encodeURIComponent(safeChildId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((profile) => {
        if (isMounted) setChild(profile);
      })
      .catch((err) => {
        if (isMounted) setError(err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) {
    return (
      <div
        id="puppeteer-report-ready"
        style={{ padding: 32, fontFamily: 'sans-serif', color: '#dc2626' }}
      >
        ❌ Report konnte nicht geladen werden: {error}
      </div>
    );
  }

  if (!child) {
    return (
      <div style={{ padding: 32, fontFamily: 'sans-serif', color: '#64748b' }}>Lade Bericht…</div>
    );
  }

  return <ReportContent child={child} />;
}

function ReportContent({ child }) {
  const isGirl = child.gender === 'girl';
  const measurements = child.measurements || [];
  const ageInfo = calculateAge(child.birthdate);

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latest = sorted[0] || null;

  const weightPct = latest?.weight
    ? estimatePercentile(latest.weight, child.gender, 'weight', ageInfo.monthsDecimal)
    : null;
  const lengthPct = latest?.length
    ? estimatePercentile(latest.length, child.gender, 'length', ageInfo.monthsDecimal)
    : null;
  const bmiVal = latest ? calculateBMI(latest.weight, latest.length) : null;
  const bmiPct = bmiVal
    ? estimatePercentile(bmiVal, child.gender, 'bmi', ageInfo.monthsDecimal)
    : null;

  const nowStr = new Date().toLocaleString('de-DE');
  const accentColor = isGirl ? '#e11d48' : '#0891b2';

  const formatWeight = (kg) => {
    if (!kg) return '—';
    return `${Math.round(kg * 1000).toLocaleString('de-DE')} g`;
  };

  return (
    <div
      id="puppeteer-report-ready"
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        padding: '32px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: 1.6,
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `3px solid ${accentColor}`,
          paddingBottom: 16,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: '-0.02em',
              margin: 0,
              color: '#0f172a',
            }}
          >
            BABYCHARTS WACHSTUMSBERICHT
          </h1>
          <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
            WHO-Wachstumskurven &amp; Perzentilen-Protokoll — Automatisch generiert
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#64748b' }}>
          <div>Exportdatum</div>
          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{nowStr}</div>
          <div
            style={{
              marginTop: 4,
              padding: '2px 8px',
              background: accentColor,
              color: '#fff',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            SERVER-EXPORT
          </div>
        </div>
      </div>

      {/* Child Info */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          background: '#f8fafc',
          padding: 16,
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          marginBottom: 24,
          fontSize: 13,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Kind-Profil
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: accentColor, margin: '4px 0 2px' }}>
            {child.name}
          </div>
          <div>
            Geschlecht: <strong>{isGirl ? 'Mädchen (♀)' : 'Junge (♂)'}</strong>
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Altersdaten
          </div>
          <div style={{ marginTop: 4 }}>
            Geburtsdatum: <strong>{child.birthdate}</strong>
          </div>
          <div>
            Aktuelles Alter: <strong>{ageInfo.text}</strong>
          </div>
          <div>
            Messungen gesamt: <strong>{measurements.length}</strong>
          </div>
        </div>
      </div>

      {/* Latest Measurement */}
      {latest && (
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#1e293b',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 4,
              marginBottom: 12,
            }}
          >
            Letzte Messung (
            {latest?.date
              ? new Date(latest.date).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '—'}
            )
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              textAlign: 'center',
              fontSize: 12,
            }}
          >
            <StatBox
              label="Gewicht"
              value={formatWeight(latest.weight)}
              percentile={weightPct?.percentile}
              bg="#ecfeff"
              border="#a5f3fc"
              color="#164e63"
              accent="#0891b2"
            />
            <StatBox
              label="Größe (cm)"
              value={latest.length ? `${latest.length} cm` : '—'}
              percentile={lengthPct?.percentile}
              bg="#ecfdf5"
              border="#a7f3d0"
              color="#064e3b"
              accent="#059669"
            />
            <StatBox
              label="Kopfumfang"
              value={latest.headCircumference ? `${latest.headCircumference} cm` : '—'}
              bg="#fffbeb"
              border="#fde68a"
              color="#78350f"
              accent="#d97706"
            />
            <StatBox
              label="BMI"
              value={bmiVal ?? '—'}
              percentile={bmiPct?.percentile}
              bg="#faf5ff"
              border="#e9d5ff"
              color="#581c87"
              accent="#9333ea"
            />
          </div>
        </div>
      )}

      {/* Measurement History */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#1e293b',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: 4,
            marginBottom: 12,
          }}
        >
          Messwert-Protokoll ({sorted.length} Einträge)
        </h2>
        <table
          style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', textAlign: 'left' }}
        >
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#334155', fontWeight: 700, fontSize: 11 }}>
              {['Datum', 'U-Heft', 'Gewicht', 'Größe', 'Kopfumfang', 'BMI', 'Bemerkungen'].map(
                (h) => (
                  <th key={h} style={{ padding: '8px 10px', borderBottom: '1px solid #cbd5e1' }}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const bmi = calculateBMI(m.weight, m.length);
              return (
                <tr
                  key={m.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#fff' : '#f8fafc',
                  }}
                >
                  <td style={{ padding: '7px 10px', fontWeight: 600 }}>
                    {m.date
                      ? new Date(m.date).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td style={{ padding: '7px 10px', color: accentColor, fontWeight: 700 }}>
                    {m.checkup || '—'}
                  </td>
                  <td style={{ padding: '7px 10px' }}>{m.weight ? formatWeight(m.weight) : '—'}</td>
                  <td style={{ padding: '7px 10px' }}>{m.length ? `${m.length} cm` : '—'}</td>
                  <td style={{ padding: '7px 10px' }}>
                    {m.headCircumference ? `${m.headCircumference} cm` : '—'}
                  </td>
                  <td style={{ padding: '7px 10px' }}>{bmi ?? '—'}</td>
                  <td
                    style={{
                      padding: '7px 10px',
                      color: '#475569',
                      maxWidth: 180,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.notes || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: 12,
          fontSize: 10,
          color: '#94a3b8',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Basierend auf den offiziellen WHO Child Growth Standards (0–5 Jahre)</span>
        <span>Automatisch generiert von BabyCharts Server</span>
      </div>
    </div>
  );
}

function StatBox({ label, value, percentile, bg, border, color, accent }) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        padding: '10px 8px',
        borderRadius: 10,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: accent,
          fontWeight: 700,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color }}>{value}</div>
      {percentile != null && (
        <div style={{ fontSize: 10, color: accent, fontWeight: 500, marginTop: 2 }}>
          ~ P{percentile}
        </div>
      )}
    </div>
  );
}
