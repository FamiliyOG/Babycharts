/**
 * src/utils/dataSourceMetadata.js
 * Versioning, citation, and provenance metadata for medical and growth guidelines (Issue #252).
 */

export const DATA_SOURCES = {
  WHO_GROWTH_STANDARDS: {
    id: 'who-growth-2006-2007',
    name: 'WHO Child Growth Standards',
    version: '2006 (0–5 Jahre) & 2007 (5–19 Jahre)',
    publisher: 'World Health Organization (WHO)',
    description:
      'Globale Referenzkurven für Längen-/Körpergrößenwachstum, Gewichtsentwicklung, Kopfumfang und BMI.',
    lastVerified: '2025-01-01',
    officialUrl: 'https://www.who.int/tools/child-growth-standards',
    license: 'WHO Open Access / Creative Commons',
  },
  STIKO_VACCINATIONS: {
    id: 'stiko-rki-2024-2025',
    name: 'STIKO Impfempfehlungen',
    version: 'Epidemiologisches Bulletin 2024/2025',
    publisher: 'Ständige Impfkommission (STIKO) am Robert Koch-Institut (RKI)',
    description:
      'Standardimpfkalender für Säuglinge, Kinder und Jugendliche in Deutschland inkl. 6-fach-Impfung, Pneumokokken, Rotaviren und MMRV.',
    lastVerified: '2025-01-01',
    officialUrl: 'https://www.rki.de/stiko',
    license: 'Amtliches Werk (RKI)',
  },
  GBA_U_CHECKUPS: {
    id: 'gba-u-vorsorge-2024',
    name: 'G-BA / BVKJ Kinder-Richtlinie (U-Untersuchungen)',
    version: 'Gelbes Heft Richtlinie (Stand 2024)',
    publisher:
      'Gemeinsamer Bundesausschuss (G-BA) & Berufsverband der Kinder- und Jugendärzte (BVKJ)',
    description:
      'Gesetzliche Früherkennungsuntersuchungen U1 bis U9 sowie J1 zur Erfassung der somatischen und motorischen Entwicklung.',
    lastVerified: '2025-01-01',
    officialUrl: 'https://www.g-ba.de/richtlinien/19/',
    license: 'Amtliche Richtlinie',
  },
};

/**
 * Returns metadata for a specific data source.
 */
export function getDataSource(key) {
  return DATA_SOURCES[key] || null;
}
