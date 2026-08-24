import { calculateAge, calculateBMI, estimatePercentile } from '../utils/percentileCalc.js';

export default function PdfReport({ activeChild, measurements = [] }) {
  if (!activeChild) return null;

  const isGirl = activeChild.gender === 'girl';
  const ageInfo = calculateAge(activeChild.birthdate);

  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latest = sortedMeasurements[0] || null;

  const weightPct = latest?.weight
    ? estimatePercentile(latest.weight, activeChild.gender, 'weight', ageInfo.monthsDecimal)
    : null;

  const lengthPct = latest?.length
    ? estimatePercentile(latest.length, activeChild.gender, 'length', ageInfo.monthsDecimal)
    : null;

  const bmiVal = latest ? calculateBMI(latest.weight, latest.length) : null;
  const bmiPct = bmiVal
    ? estimatePercentile(bmiVal, activeChild.gender, 'bmi', ageInfo.monthsDecimal)
    : null;

  const nowStr = new Date().toLocaleString('de-DE');

  const formatWeight = (kg) => {
    if (!kg) return '—';
    const grams = Math.round(kg * 1000);
    return `${grams.toLocaleString('de-DE')} g`;
  };

  return (
    <div
      id="pdf-report-template"
      style={{
        display: 'none',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        padding: '32px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'sans-serif',
        lineHeight: 1.5,
        border: '1px solid #cbd5e1',
      }}
      className="print:block"
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '2px solid #0f172a',
          paddingBottom: '16px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '-0.025em',
              color: '#0f172a',
              margin: 0,
            }}
          >
            BABYCHARTS WACHSTUMSBERICHT
          </h1>
          <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
            WHO-Wachstumskurven & Perzentilen-Protokoll
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>
          <div>Exportdatum: {nowStr}</div>
          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>Status: AUTOMATISCH EXP.</div>
        </div>
      </div>

      {/* Child Information */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          backgroundColor: '#f8fafc',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          fontSize: '12px',
        }}
      >
        <div>
          <div
            style={{
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            Kind-Profil
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
            {activeChild.name}
          </div>
          <div>
            Geschlecht:{' '}
            <span style={{ fontWeight: 600 }}>{isGirl ? 'Mädchen (♀)' : 'Junge (♂)'}</span>
          </div>
        </div>
        <div>
          <div
            style={{
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            Altersdaten
          </div>
          <div>
            Geburtsdatum: <span style={{ fontWeight: 600 }}>{activeChild.birthdate}</span>
          </div>
          <div>
            Aktuelles Alter: <span style={{ fontWeight: 600 }}>{ageInfo.text}</span>
          </div>
        </div>
      </div>

      {/* Latest Measurement Summary */}
      {latest && (
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#1e293b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '4px',
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
              gap: '12px',
              textAlign: 'center',
              fontSize: '12px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ecfeff',
                border: '1px solid #a5f3fc',
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#0891b2',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                Gewicht (g)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#164e63' }}>
                {latest.weight ? formatWeight(latest.weight) : '—'}
              </div>
              {weightPct && (
                <div style={{ fontSize: '10px', color: '#0e7490', fontWeight: 500 }}>
                  ~ P{weightPct.percentile}
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#059669',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                Größe (cm)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#064e3b' }}>
                {latest.length ? `${latest.length} cm` : '—'}
              </div>
              {lengthPct && (
                <div style={{ fontSize: '10px', color: '#047857', fontWeight: 500 }}>
                  ~ P{lengthPct.percentile}
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#d97706',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                Kopfumfang (cm)
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#78350f' }}>
                {latest.headCircumference ? `${latest.headCircumference} cm` : '—'}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#faf5ff',
                border: '1px solid #e9d5ff',
                padding: '10px',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  color: '#9333ea',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                }}
              >
                BMI
              </div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#581c87' }}>
                {bmiVal ?? '—'}
              </div>
              {bmiPct && (
                <div style={{ fontSize: '10px', color: '#7e22ce', fontWeight: 500 }}>
                  ~ P{bmiPct.percentile}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Measurement History Table */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#1e293b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '4px',
          }}
        >
          Messwert-Protokoll ({sortedMeasurements.length} Einträge)
        </h2>
        <table
          style={{ width: '100%', textAlign: 'left', fontSize: '12px', borderCollapse: 'collapse' }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: '#f1f5f9',
                color: '#334155',
                fontWeight: 'bold',
                borderBottom: '1px solid #cbd5e1',
                fontSize: '11px',
              }}
            >
              <th style={{ padding: '8px' }}>Datum</th>
              <th style={{ padding: '8px' }}>U-Heft</th>
              <th style={{ padding: '8px' }}>Gewicht (g)</th>
              <th style={{ padding: '8px' }}>Größe (cm)</th>
              <th style={{ padding: '8px' }}>Kopfumfang (cm)</th>
              <th style={{ padding: '8px' }}>BMI</th>
              <th style={{ padding: '8px' }}>Bemerkungen</th>
            </tr>
          </thead>
          <tbody>
            {sortedMeasurements.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 500 }}>
                  {m.date
                    ? new Date(m.date).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '—'}
                </td>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#0e7490' }}>
                  {m.checkup || '—'}
                </td>
                <td style={{ padding: '8px' }}>{m.weight ? formatWeight(m.weight) : '—'}</td>
                <td style={{ padding: '8px' }}>{m.length ? `${m.length} cm` : '—'}</td>
                <td style={{ padding: '8px' }}>
                  {m.headCircumference ? `${m.headCircumference} cm` : '—'}
                </td>
                <td style={{ padding: '8px' }}>{calculateBMI(m.weight, m.length) ?? '—'}</td>
                <td
                  style={{
                    padding: '8px',
                    color: '#475569',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #cbd5e1',
          paddingTop: '12px',
          fontSize: '10px',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Basierend auf den offiziellen WHO Child Growth Standards (0–5 Jahre)</span>
        <span>Generiert mit BabyCharts Web-App</span>
      </div>
    </div>
  );
}
