/**
 * src/data/vaccinations.js
 * STIKO (Ständige Impfkommission) Standard-Impfempfehlungen für Säuglinge und Kleinkinder (0–5 Jahre)
 */

export const STIKO_VACCINATIONS = [
  {
    id: 'rsv-prophylaxe',
    name: 'RSV-Prophylaxe (Nirsevimab)',
    shortName: 'RSV',
    recommendedAgeMonths: 0,
    periodText: 'Vor 1. RSV-Saison / Ab Geburt',
    description:
      'Antikörper-Immunisierung zum Schutz vor schweren Atemwegsinfektionen durch das RS-Virus.',
  },
  {
    id: 'rotavirus-1',
    name: 'Rotaviren (1. Dosis)',
    shortName: 'Rotaviren 1',
    recommendedAgeMonths: 2,
    periodText: 'Ab 6. Lebenswoche',
    description: 'Schluckimpfung gegen schwere Magen-Darm-Infektionen.',
  },
  {
    id: 'rotavirus-2',
    name: 'Rotaviren (2. Dosis)',
    shortName: 'Rotaviren 2',
    recommendedAgeMonths: 3,
    periodText: 'Im Abstand von 4 Wochen',
    description: '2. Teil der Schluckimpfung.',
  },
  {
    id: 'meningokokken-b-1',
    name: 'Meningokokken B (1. Dosis)',
    shortName: 'Meningokokken B 1',
    recommendedAgeMonths: 2,
    periodText: 'Im 2. Lebensmonat (ab 2 Monate)',
    description:
      'Schutz vor invasiven Hirnhaut- und Blutvergiftungserkrankungen durch Meningokokken Typ B.',
  },
  {
    id: '6fach-1',
    name: '6-fach-Impfung (1. Dosis)',
    shortName: '6-fach 1 (G1)',
    recommendedAgeMonths: 2,
    periodText: 'Im 2. Lebensmonat',
    description:
      'Tetanus, Diphtherie, Pertussis (Keuchhusten), Hib, Polio (Kinderlähmung), Hepatitis B.',
  },
  {
    id: 'pneumokokken-1',
    name: 'Pneumokokken (1. Dosis)',
    shortName: 'Pneumokokken 1 (G1)',
    recommendedAgeMonths: 2,
    periodText: 'Im 2. Lebensmonat',
    description: 'Schutz vor schwerer Lungen-, Hirnhaut- und Mittelohrentzündung.',
  },
  {
    id: 'meningokokken-b-2',
    name: 'Meningokokken B (2. Dosis)',
    shortName: 'Meningokokken B 2',
    recommendedAgeMonths: 4,
    periodText: 'Im 4. Lebensmonat',
    description: '2. Dosis Meningokokken B.',
  },
  {
    id: '6fach-2',
    name: '6-fach-Impfung (2. Dosis)',
    shortName: '6-fach 2 (G2)',
    recommendedAgeMonths: 4,
    periodText: 'Im 4. Lebensmonat',
    description: '2. Grundimmunisierung (Tetanus, Diphtherie, Pertussis, Hib, Polio, Hep B).',
  },
  {
    id: 'pneumokokken-2',
    name: 'Pneumokokken (2. Dosis)',
    shortName: 'Pneumokokken 2 (G2)',
    recommendedAgeMonths: 4,
    periodText: 'Im 4. Lebensmonat',
    description: '2. Dosis Pneumokokken.',
  },
  {
    id: '6fach-3',
    name: '6-fach-Impfung (3. Dosis / Abschluss)',
    shortName: '6-fach 3 (G3)',
    recommendedAgeMonths: 11,
    periodText: 'Im 11.–14. Lebensmonat',
    description: 'Abschluss der Grundimmunisierung.',
  },
  {
    id: 'pneumokokken-3',
    name: 'Pneumokokken (3. Dosis / Abschluss)',
    shortName: 'Pneumokokken 3 (G3)',
    recommendedAgeMonths: 11,
    periodText: 'Im 11.–14. Lebensmonat',
    description: 'Abschluss der Pneumokokken-Grundimmunisierung.',
  },
  {
    id: 'meningokokken-b-3',
    name: 'Meningokokken B (3. Dosis / Abschluss)',
    shortName: 'Meningokokken B 3',
    recommendedAgeMonths: 12,
    periodText: 'Im 12.–15. Lebensmonat',
    description: 'Abschluss der Grundimmunisierung gegen Meningokokken B.',
  },
  {
    id: 'meningokokken-c',
    name: 'Meningokokken C',
    shortName: 'Meningokokken C',
    recommendedAgeMonths: 12,
    periodText: 'Im 12. Lebensmonat',
    description: 'Schutz vor Hirnhautentzündung durch Meningokokken Typ C.',
  },
  {
    id: 'mmrv-1',
    name: 'MMRV (1. Dosis)',
    shortName: 'MMRV 1 (G1)',
    recommendedAgeMonths: 11,
    periodText: 'Im 11.–14. Lebensmonat',
    description: 'Masern, Mumps, Röteln und Varizellen (Windpocken).',
  },
  {
    id: 'mmrv-2',
    name: 'MMRV (2. Dosis / Abschluss)',
    shortName: 'MMRV 2 (G2)',
    recommendedAgeMonths: 15,
    periodText: 'Im 15.–23. Lebensmonat',
    description: '2. Impfung für vollständigen Schutz gegen MMR & Windpocken.',
  },
  {
    id: 'hepatitis-a',
    name: 'Hepatitis A (Reise- / Indikationsimpfung)',
    shortName: 'Hepatitis A',
    recommendedAgeMonths: 12,
    periodText: 'Ab 12 Monaten (2 Dosen im Abstand von 6–12 Mon.)',
    description:
      'Schutz vor infektiöser Leberentzündung (Hepatitis A) bei Reisen oder erhöhtem Risiko.',
  },
  {
    id: 'influenza',
    name: 'Grippe / Influenza (Saisonal)',
    shortName: 'Grippe (Influenza)',
    recommendedAgeMonths: 6,
    periodText: 'Jährlich ab Herbst (ab 6 Monaten)',
    description:
      'Saisonaler Schutz vor echter Grippe für Kinder mit chronischen Erkrankungen oder erhöhtem Risiko.',
  },
];
