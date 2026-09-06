import { describe, it, expect } from 'vitest';
import { calculateAge, getWHORefAtAge, estimatePercentile } from '../utils/percentileCalc.js';

describe('Property & Fuzz Testing for Medical Calculations & WHO Percentiles (BC-304)', () => {
  describe('calculateAge Fuzzing & Boundaries', () => {
    it('handles future birthdates gracefully without throwing', () => {
      const res = calculateAge('2099-01-01', '2025-01-01');
      expect(res.totalDays).toBe(0);
      expect(res.months).toBe(0);
    });

    it('handles null, undefined, empty string and malformed dates without throwing', () => {
      expect(() => calculateAge(null)).not.toThrow();
      expect(() => calculateAge(undefined)).not.toThrow();
      expect(() => calculateAge('')).not.toThrow();
      expect(() => calculateAge('not-a-date')).not.toThrow();
    });

    it('property test: totalDays is always non-negative and finite', () => {
      const testCases = [
        ['2020-01-01', '2020-01-02'],
        ['2000-02-29', '2004-02-29'], // Leap years
        ['1970-01-01', '2026-12-31'],
        ['2024-12-31', '2025-01-01'],
      ];

      for (const [birth, target] of testCases) {
        const res = calculateAge(birth, target);
        expect(Number.isFinite(res.totalDays)).toBe(true);
        expect(res.totalDays).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('estimatePercentile & WHO Z-Score Fuzzing', () => {
    it('handles extreme outlier values (negative, zero, massive numbers) safely', () => {
      const extremeValues = [-100, -0.01, 0, 0.0001, 500, 99999, Number.MAX_SAFE_INTEGER];
      const metrics = ['weight', 'height', 'head'];
      const genders = ['boy', 'girl'];
      const ages = [0, 1, 6, 12, 24, 36, 60];

      for (const val of extremeValues) {
        for (const metric of metrics) {
          for (const gender of genders) {
            for (const age of ages) {
              const res = estimatePercentile(val, gender, metric, age);
              expect(res).toBeDefined();
              expect(typeof res.statusColor).toBe('string');
              if (res.percentile !== null) {
                expect(Number.isFinite(res.percentile)).toBe(true);
                expect(res.percentile).toBeGreaterThanOrEqual(1);
                expect(res.percentile).toBeLessThanOrEqual(99);
              }
            }
          }
        }
      }
    });

    it('fuzz testing with 100 pseudo-random age and value combinations', () => {
      for (let i = 0; i < 100; i++) {
        const randomAge = Math.random() * 72; // 0 to 72 months
        const randomWeight = Math.random() * 50; // 0 to 50 kg
        const gender = i % 2 === 0 ? 'boy' : 'girl';

        const ref = getWHORefAtAge(gender, 'weight', randomAge);
        expect(ref).toBeDefined();
        if (ref) {
          expect(ref.p50).toBeGreaterThan(ref.p3);
          expect(ref.p97).toBeGreaterThan(ref.p50);
        }

        const pct = estimatePercentile(randomWeight, gender, 'weight', randomAge);
        expect(pct).toBeDefined();
      }
    });
  });
});
