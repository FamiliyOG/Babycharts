/**
 * src/test/domainContracts.test.js
 * Comprehensive Domain Model & Boundary Adapter Test Suite (Issue #287).
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeGender,
  normalizeDate,
  createCanonicalMeasurement,
  createCanonicalMilestone,
  createCanonicalTooth,
  createCanonicalVaccination,
  createCanonicalUCheckup,
  createCanonicalHealthLog,
  toCanonicalMilestonesList,
  toCanonicalTeethList,
  toCanonicalVaccinationsList,
  toCanonicalUCheckupsList,
  toCanonicalMeasurementsList,
  toDictionaryFormat,
} from '../domain/index.js';

describe('Domain Model & Boundary Adapter Test Suite (#287)', () => {
  // ── 1. Basic Field Normalizers ─────────────────────────────────────────────
  describe('Field Normalizers', () => {
    it('normalizes gender to canonical values safely', () => {
      expect(normalizeGender('boy')).toBe('boy');
      expect(normalizeGender('girl')).toBe('girl');
      expect(normalizeGender('male')).toBe('boy');
      expect(normalizeGender('Mädchen')).toBe('girl');
      expect(normalizeGender(null)).toBe('boy');
      expect(normalizeGender('')).toBe('boy');
    });

    it('normalizes dates reliably from strings or Date objects', () => {
      expect(normalizeDate('2024-03-15')).toBe('2024-03-15');
      expect(normalizeDate('2024-03-15T12:00:00Z')).toBe('2024-03-15');
      expect(normalizeDate(new Date('2024-05-20T00:00:00Z'))).toBe('2024-05-20');
      expect(normalizeDate('invalid-date')).toBeNull();
      expect(normalizeDate(null)).toBeNull();
    });
  });

  // ── 2. Canonical Model Creators ────────────────────────────────────────────
  describe('Canonical Model Creators', () => {
    it('creates a validated canonical measurement with rounded values', () => {
      const meas = createCanonicalMeasurement({
        date: '2024-02-10',
        weight: 4.5678,
        length: 54.32,
        headCircumference: 36.89,
        notes: '  Routine Check  ',
      });

      expect(meas.date).toBe('2024-02-10');
      expect(meas.weight).toBe(4.568);
      expect(meas.length).toBe(54.3);
      expect(meas.headCircumference).toBe(36.9);
      expect(meas.notes).toBe('Routine Check');
    });

    it('creates canonical milestone with completed flag derived from date', () => {
      const ms = createCanonicalMilestone('first-steps', {
        date: '2025-01-01',
        title: 'Erste Schritte',
      });

      expect(ms.key).toBe('first-steps');
      expect(ms.completed).toBe(true);
      expect(ms.date).toBe('2025-01-01');
      expect(ms.title).toBe('Erste Schritte');
    });

    it('creates canonical tooth with eruption flag', () => {
      const tooth = createCanonicalTooth('upper-central-left', {
        eruptedDate: '2024-08-15',
        name: 'Schneidezahn',
      });

      expect(tooth.key).toBe('upper-central-left');
      expect(tooth.erupted).toBe(true);
      expect(tooth.date).toBe('2024-08-15');
      expect(tooth.name).toBe('Schneidezahn');
    });

    it('creates canonical vaccination entity with doctor and batch', () => {
      const vac = createCanonicalVaccination('rotavirus-1', {
        date: '2024-03-01',
        doctor: 'Dr. Weber',
        batch: 'RV-123',
      });
      expect(vac.key).toBe('rotavirus-1');
      expect(vac.completed).toBe(true);
      expect(vac.doctor).toBe('Dr. Weber');
      expect(vac.batch).toBe('RV-123');
    });

    it('creates canonical U-Checkup and HealthLog entities', () => {
      const u = createCanonicalUCheckup('U2', {
        date: '2024-01-10',
        doctorNotes: 'Vitalwerte stabil',
      });
      expect(u.key).toBe('U2');
      expect(u.completed).toBe(true);
      expect(u.doctorNotes).toBe('Vitalwerte stabil');

      const hl = createCanonicalHealthLog({
        temperature: 38.45,
        symptoms: 'Fieber',
      });
      expect(hl.temperature).toBe(38.5);
      expect(hl.symptoms).toBe('Fieber');
    });

    it('creates canonical measurement lists sorted chronologically', () => {
      const measurements = toCanonicalMeasurementsList([
        { date: '2024-05-01', weight: 6.0 },
        { date: '2024-02-01', weight: 4.5 },
      ]);
      expect(measurements).toHaveLength(2);
      expect(measurements[0].date).toBe('2024-02-01');
      expect(measurements[1].date).toBe('2024-05-01');
    });
  });

  // ── 3. Boundary Adapters (Object Dict vs Array) ─────────────────────────────
  describe('Boundary Adapters (Object Dictionary vs Array)', () => {
    const legacyMilestoneDict = {
      'first-smile': {
        completed: true,
        date: '2024-02-01',
        title: 'Erstes Lächeln',
      },
      rolling: {
        completed: true,
        date: '2024-04-15',
        title: 'Drehen',
      },
      sitting: {
        completed: false,
        title: 'Freies Sitzen',
      },
    };

    it('converts object dictionary of milestones into a sorted canonical list', () => {
      const list = toCanonicalMilestonesList(legacyMilestoneDict);
      expect(list).toHaveLength(3);
      expect(list[0].key).toBe('first-smile');
      expect(list[1].key).toBe('rolling');
      expect(list[2].key).toBe('sitting');
      expect(list[2].completed).toBe(false);
    });

    it('converts legacy array format of milestones into identical canonical list', () => {
      const legacyArray = [
        { key: 'rolling', date: '2024-04-15', title: 'Drehen' },
        { key: 'first-smile', date: '2024-02-01', title: 'Erstes Lächeln' },
      ];

      const list = toCanonicalMilestonesList(legacyArray);
      expect(list).toHaveLength(2);
      expect(list[0].key).toBe('first-smile');
      expect(list[1].key).toBe('rolling');
    });

    it('supports roundtrip conversion: Dict -> Canonical List -> Dict preserving attributes', () => {
      const list = toCanonicalMilestonesList(legacyMilestoneDict);
      const dict = toDictionaryFormat(list);

      expect(dict).toHaveProperty('first-smile');
      expect(dict['first-smile'].date).toBe('2024-02-01');
      expect(dict).toHaveProperty('rolling');
      expect(dict.rolling.title).toBe('Drehen');
      expect(dict).toHaveProperty('sitting');
      expect(dict.sitting.completed).toBe(false);
    });

    it('adapts teeth from both dict and array formats safely', () => {
      const teethDict = {
        'tooth-1': { date: '2024-06-01', name: 'Zahn 1' },
      };
      const canonicalTeeth = toCanonicalTeethList(teethDict);
      expect(canonicalTeeth).toHaveLength(1);
      expect(canonicalTeeth[0].erupted).toBe(true);

      const restoredDict = toDictionaryFormat(canonicalTeeth);
      expect(restoredDict['tooth-1'].name).toBe('Zahn 1');
    });

    it('adapts vaccinations and U-Checkups without dropping custom properties', () => {
      const vacDict = {
        'rotavirus-1': { date: '2024-03-01', doctor: 'Dr. Weber', batch: 'RV-123' },
      };
      const canonicalVac = toCanonicalVaccinationsList(vacDict);
      expect(canonicalVac[0].doctor).toBe('Dr. Weber');
      expect(canonicalVac[0].batch).toBe('RV-123');

      const uDict = {
        U3: { completed: true, date: '2024-03-10', doctorNotes: 'Alles altersgerecht' },
      };
      const canonicalU = toCanonicalUCheckupsList(uDict);
      expect(canonicalU[0].completed).toBe(true);
      expect(canonicalU[0].doctorNotes).toBe('Alles altersgerecht');
    });
  });
});
