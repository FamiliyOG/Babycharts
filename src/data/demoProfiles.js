/**
 * Realistic Demo Profiles for Instant Testing with Measurements, Vaccinations & Teeth
 */

function createVac(completed, date, doctor, batch, notes) {
  return {
    completed,
    date,
    doctor,
    batch,
    notes,
    updatedAt: `${date}T10:00:00.000Z`,
  };
}

function createTooth(erupted, date, notes) {
  return {
    erupted,
    date,
    notes,
    updatedAt: `${date}T18:00:00.000Z`,
  };
}

function createMilestone(completed, date, notes) {
  return {
    completed,
    date,
    notes,
    photo: null,
  };
}

export const DEMO_PROFILES = [
  {
    id: 'demo-boy-noah',
    name: 'Noah',
    gender: 'boy', // 'boy' or 'girl'
    birthdate: '2025-08-15',
    notes: 'Fröhlicher kleiner Entdecker. U1 bis U6 erfolgreich abgeschlossen.',
    vaccinations: {
      'rotavirus-1': createVac(
        true,
        '2025-10-02',
        'Dr. med. Weber, Kinderarztpraxis',
        'RV-9041',
        'Sehr gut vertragen.'
      ),
      'rotavirus-2': createVac(
        true,
        '2025-11-20',
        'Dr. med. Weber, Kinderarztpraxis',
        'RV-9182',
        'Keine Auffälligkeiten.'
      ),
      '6fach-1': createVac(
        true,
        '2025-10-02',
        'Dr. med. Weber, Kinderarztpraxis',
        'HEX-4820',
        'Leichte Rötung an der Einstichstelle, am nächsten Tag wieder gut.'
      ),
      'pneumokokken-1': createVac(
        true,
        '2025-10-02',
        'Dr. med. Weber, Kinderarztpraxis',
        'PN-3310',
        'Zusammen mit 6-fach 1 verabreicht.'
      ),
      '6fach-2': createVac(
        true,
        '2025-12-18',
        'Dr. med. Weber, Kinderarztpraxis',
        'HEX-5012',
        'Gut vertragen, minimal erhöhte Temperatur (37.8°C).'
      ),
      'pneumokokken-2': createVac(
        true,
        '2025-12-18',
        'Dr. med. Weber, Kinderarztpraxis',
        'PN-3490',
        'Alles bestens.'
      ),
      '6fach-3': createVac(
        true,
        '2026-07-20',
        'Dr. med. Weber, Kinderarztpraxis',
        'HEX-5390',
        'Abschluss Grundimmunisierung.'
      ),
      'pneumokokken-3': createVac(
        true,
        '2026-07-20',
        'Dr. med. Weber, Kinderarztpraxis',
        'PN-3801',
        'Abschluss Grundimmunisierung.'
      ),
    },
    teeth: {
      'lr-1': createTooth(true, '2026-03-10', 'Erster Zahn! Mittlerer Schneidezahn unten rechts.'),
      'll-1': createTooth(
        true,
        '2026-03-24',
        'Zweiter Schneidezahn unten links folgt zwei Wochen später.'
      ),
      'ur-1': createTooth(true, '2026-05-18', 'Oberer mittlerer Schneidezahn rechts.'),
      'ul-1': createTooth(true, '2026-05-30', 'Oberer mittlerer Schneidezahn links.'),
      'ur-2': createTooth(true, '2026-07-15', 'Seitlicher Schneidezahn oben rechts.'),
      'ul-2': createTooth(
        true,
        '2026-08-02',
        'Seitlicher Schneidezahn oben links kurz vor dem 1. Geburtstag!'
      ),
    },
    milestones: {
      'first-smile': createMilestone(
        true,
        '2025-09-25',
        'Hat Mama und Papa beim Wickeln so süß angelächelt!'
      ),
      'hold-head': createMilestone(
        true,
        '2025-11-10',
        'Hält das Köpfchen in Bauchlage schon ganz stabil hoch.'
      ),
      'roll-over': createMilestone(
        true,
        '2026-01-14',
        'Auf der Krabbeldecke schwungvoll vom Bauch auf den Rücken gerollt.'
      ),
      'first-solid-food': createMilestone(
        true,
        '2026-02-18',
        'Erster Pastinakenbrei – fand er anfangs skeptisch, dann super!'
      ),
      'sit-alone': createMilestone(
        true,
        '2026-04-02',
        'Sitzt frei und spielt mit seinen Holzbausteinen.'
      ),
      crawl: createMilestone(true, '2026-04-28', 'Krabbelt blitzschnell durchs Wohnzimmer.'),
      'stand-up': createMilestone(true, '2026-06-10', 'Zieht sich an der Couch hoch in den Stand!'),
      'first-birthday': createMilestone(
        true,
        '2026-08-15',
        'Große Party mit der Familie und Bananenkuchen.'
      ),
    },
    healthLog: [
      {
        id: 'h-noah-1',
        dateTime: '2026-05-20T14:30',
        temperature: 38.8,
        medication: 'Paracetamol 125mg Zäpfchen',
        symptoms: ['Schnupfen', 'Unruhe / Weinen', 'Müdigkeit'],
        notes: 'Nachmittags fiebrig und weinerlich nach Zahnen.',
      },
      {
        id: 'h-noah-2',
        dateTime: '2026-05-20T19:45',
        temperature: 38.1,
        medication: null,
        symptoms: ['Müdigkeit'],
        notes: 'Temperatur sinkt nach Zäpfchen, schläft ruhig ein.',
      },
      {
        id: 'h-noah-3',
        dateTime: '2026-05-21T08:15',
        temperature: 37.2,
        medication: null,
        symptoms: [],
        notes: 'Wieder munter und fit!',
      },
    ],
    measurements: [
      {
        id: 'm1',
        date: '2025-08-15',
        weight: 3.5,
        length: 50.5,
        headCircumference: 35.0,
        checkup: 'U1',
        notes: 'Geburt im Marienhospital, kerngesund!',
      },
      {
        id: 'm2',
        date: '2025-08-20',
        weight: 3.4,
        length: 51.0,
        headCircumference: 35.2,
        checkup: 'U2',
        notes: 'Gewichtsstabilisierung nach der Geburt.',
      },
      {
        id: 'm3',
        date: '2025-09-18',
        weight: 4.6,
        length: 55.0,
        headCircumference: 37.5,
        checkup: 'U3',
        notes: 'Hüftsonographie unauffällig.',
      },
      {
        id: 'm4',
        date: '2025-11-20',
        weight: 6.6,
        length: 62.0,
        headCircumference: 41.0,
        checkup: 'U4',
        notes: 'Reagiert toll auf Stimmen und lächelt.',
      },
      {
        id: 'm5',
        date: '2026-02-17',
        weight: 8.1,
        length: 68.0,
        headCircumference: 43.5,
        checkup: 'U5',
        notes: 'Dreht sich fleißig vom Rücken auf den Bauch.',
      },
      {
        id: 'm6',
        date: '2026-05-15',
        weight: 9.2,
        length: 73.5,
        headCircumference: 45.2,
        checkup: 'U6',
        notes: 'Zieht sich an Möbeln in den Stand!',
      },
      {
        id: 'm7',
        date: '2026-08-15',
        weight: 10.1,
        length: 77.0,
        headCircumference: 46.5,
        checkup: '',
        notes: 'Erster Geburtstag! Läuft erste Schritte an der Hand.',
      },
    ],
  },
  {
    id: 'demo-girl-mia',
    name: 'Mia',
    gender: 'girl',
    birthdate: '2024-08-20',
    notes: 'Neugierig und bewegungsfreudig. 2 Jahre alt.',
    vaccinations: {
      'rotavirus-1': createVac(
        true,
        '2024-10-05',
        'Gemeinschaftspraxis Kinderheilkunde',
        'RV-8102',
        'Schluckimpfung gut vertragen.'
      ),
      'rotavirus-2': createVac(
        true,
        '2024-11-15',
        'Gemeinschaftspraxis Kinderheilkunde',
        'RV-8240',
        'Keine Beschwerden.'
      ),
      '6fach-1': createVac(
        true,
        '2024-10-05',
        'Gemeinschaftspraxis Kinderheilkunde',
        'HEX-3910',
        'Keine Nebenwirkungen.'
      ),
      'pneumokokken-1': createVac(
        true,
        '2024-10-05',
        'Gemeinschaftspraxis Kinderheilkunde',
        'PN-2910',
        'Einwandfrei.'
      ),
      '6fach-2': createVac(
        true,
        '2024-12-15',
        'Gemeinschaftspraxis Kinderheilkunde',
        'HEX-4102',
        'Ruhiger Nachmittag.'
      ),
      'pneumokokken-2': createVac(
        true,
        '2024-12-15',
        'Gemeinschaftspraxis Kinderheilkunde',
        'PN-3012',
        'Alles gut.'
      ),
      '6fach-3': createVac(
        true,
        '2025-07-22',
        'Gemeinschaftspraxis Kinderheilkunde',
        'HEX-4510',
        'Abschluss Grundimmunisierung.'
      ),
      'pneumokokken-3': createVac(
        true,
        '2025-07-22',
        'Gemeinschaftspraxis Kinderheilkunde',
        'PN-3410',
        'Abschluss Pneumokokken.'
      ),
      'meningokokken-c': createVac(
        true,
        '2025-09-02',
        'Gemeinschaftspraxis Kinderheilkunde',
        'MEN-1289',
        'Schutz gegen Meningokokken C.'
      ),
      'mmrv-1': createVac(
        true,
        '2025-07-22',
        'Gemeinschaftspraxis Kinderheilkunde',
        'MMRV-7712',
        'Leichtes Impffieber nach 7 Tagen, rasch abgeklungen.'
      ),
      'mmrv-2': createVac(
        true,
        '2025-12-10',
        'Gemeinschaftspraxis Kinderheilkunde',
        'MMRV-7901',
        '2. Dosis MMRV – Vollständiger Schutz.'
      ),
    },
    teeth: {
      'lr-1': createTooth(true, '2025-03-01', 'Zahn 81 durchgebrochen'),
      'll-1': createTooth(true, '2025-03-12', 'Zahn 71 durchgebrochen'),
      'ur-1': createTooth(true, '2025-04-18', 'Zahn 51 durchgebrochen'),
      'ul-1': createTooth(true, '2025-04-26', 'Zahn 61 durchgebrochen'),
      'ur-2': createTooth(true, '2025-06-15', 'Zahn 52 durchgebrochen'),
      'ul-2': createTooth(true, '2025-06-28', 'Zahn 62 durchgebrochen'),
      'lr-2': createTooth(true, '2025-08-05', 'Zahn 82 durchgebrochen'),
      'll-2': createTooth(true, '2025-08-14', 'Zahn 72 durchgebrochen'),
      'ur-4': createTooth(true, '2025-10-10', 'Erster Backenzahn oben rechts (54)'),
      'ul-4': createTooth(true, '2025-10-22', 'Erster Backenzahn oben links (64)'),
      'lr-4': createTooth(true, '2025-11-05', 'Erster Backenzahn unten rechts (84)'),
      'll-4': createTooth(true, '2025-11-18', 'Erster Backenzahn unten links (74)'),
      'ur-3': createTooth(true, '2026-01-12', 'Eckzahn oben rechts (53)'),
      'ul-3': createTooth(true, '2026-01-25', 'Eckzahn oben links (63)'),
      'lr-3': createTooth(true, '2026-03-08', 'Eckzahn unten rechts (83)'),
      'll-3': createTooth(true, '2026-03-20', 'Eckzahn unten links (73)'),
    },
    milestones: {
      'first-smile': createMilestone(true, '2024-09-28', 'Wunderschönes Lächeln beim Stillen.'),
      'hold-head': createMilestone(true, '2024-11-15', 'Kopf super stabil.'),
      'roll-over': createMilestone(
        true,
        '2025-01-10',
        'Dreht sich blitzschnell in beide Richtungen.'
      ),
      'first-solid-food': createMilestone(true, '2025-02-25', 'Liebt Karottenbrei und Banane.'),
      'sit-alone': createMilestone(true, '2025-04-10', 'Freies Sitzen ohne Umkippen.'),
      crawl: createMilestone(true, '2025-05-02', 'Krabbelt durch das ganze Haus.'),
      'pincer-grasp': createMilestone(
        true,
        '2025-05-20',
        'Pflückt Heidelbeeren mit den Fingerchen.'
      ),
      'stand-up': createMilestone(true, '2025-06-15', 'Steht frei am Couchtisch.'),
      'first-word': createMilestone(
        true,
        '2025-07-10',
        'Erstes Wort: „Papa“ und kurz darauf „Wauwau“!'
      ),
      'first-steps': createMilestone(
        true,
        '2025-08-10',
        'Erste 4 freie Schritte mitten ins Wohnzimmer!'
      ),
      'first-birthday': createMilestone(
        true,
        '2025-08-20',
        '1. Geburtstag mit allen Freunden gefeiert.'
      ),
      'drink-cup': createMilestone(true, '2025-10-15', 'Trinkt alleine aus der Tasse.'),
      'two-words': createMilestone(
        true,
        '2026-04-12',
        '„Auto fahren“, „Mehr Buch“ und „Gute Nacht“'
      ),
      'run-jump': createMilestone(true, '2026-08-01', 'Rennt und hüpft begeistert durch Pfützen.'),
    },
    healthLog: [
      {
        id: 'h-mia-1',
        dateTime: '2025-07-29T16:00',
        temperature: 39.1,
        medication: 'Ibuprofen Saft 4% (2.5 ml)',
        symptoms: ['Fieber', 'Müdigkeit', 'Hautausschlag'],
        notes: 'Impfreaktion nach MMRV Impfung, gut überwacht.',
      },
      {
        id: 'h-mia-2',
        dateTime: '2025-07-29T21:30',
        temperature: 38.2,
        medication: null,
        symptoms: ['Müdigkeit'],
        notes: 'Fieber gesunken, ruhige Nacht.',
      },
      {
        id: 'h-mia-3',
        dateTime: '2025-07-30T09:00',
        temperature: 37.4,
        medication: null,
        symptoms: [],
        notes: 'Ausschlag verblasst, wieder ganz die Alte.',
      },
    ],
    measurements: [
      {
        id: 'g1',
        date: '2024-08-20',
        weight: 3.3,
        length: 49.5,
        headCircumference: 34.5,
        checkup: 'U1',
        notes: 'Geburt super verlaufen!',
      },
      {
        id: 'g2',
        date: '2024-09-24',
        weight: 4.3,
        length: 54.0,
        headCircumference: 37.0,
        checkup: 'U3',
        notes: 'Trinkt sehr gut.',
      },
      {
        id: 'g3',
        date: '2024-11-25',
        weight: 6.0,
        length: 61.0,
        headCircumference: 40.2,
        checkup: 'U4',
        notes: 'Brabbelt fröhlich vor sich hin.',
      },
      {
        id: 'g4',
        date: '2025-02-21',
        weight: 7.2,
        length: 66.5,
        headCircumference: 42.5,
        checkup: 'U5',
        notes: 'Greift zielgerichtet nach Spielzeug.',
      },
      {
        id: 'g5',
        date: '2025-08-20',
        weight: 9.3,
        length: 75.0,
        headCircumference: 45.5,
        checkup: 'U6',
        notes: '1. Geburtstag – Läuft bereits frei!',
      },
      {
        id: 'g6',
        date: '2026-02-20',
        weight: 10.8,
        length: 82.5,
        headCircumference: 46.8,
        checkup: '',
        notes: 'Liebt Bücher und Bausteine.',
      },
      {
        id: 'g7',
        date: '2026-08-20',
        weight: 11.9,
        length: 87.0,
        headCircumference: 47.6,
        checkup: 'U7',
        notes: '2. Geburtstag! Spricht schon 2-Wort-Sätze.',
      },
    ],
  },
];
