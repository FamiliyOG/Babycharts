import { describe, it, expect } from 'vitest';
import i18n from '../i18n/index.js';
import { generateDoctorFeverReport } from '../utils/doctorPdfGenerator.js';
import { generateUHeftA5Pdf } from '../utils/pdfGenerator.js';

describe('Multi-Language & Thai PDF Export Test Suite (BC-068, BC-069)', () => {
  const sampleChild = {
    id: 'child-pdf-test',
    name: 'น้องมิน',
    gender: 'girl',
    birthdate: '2025-01-15',
    healthLog: [
      {
        dateTime: new Date().toISOString(),
        temperature: 38.8,
        medication: 'Paracetamol 125mg',
        symptoms: ['ไข้', 'มีน้ำมูก'],
        notes: 'กินน้ำเยอะ',
      },
    ],
    vaccinations: {
      'rotavirus-1': { completed: true, date: '2025-03-01' },
    },
    teeth: {
      51: { erupted: true, date: '2025-07-01' },
    },
  };

  const sampleMeasurements = [
    {
      id: 'm-1',
      date: '2025-01-15',
      checkup: 'U1',
      weight: 3.4,
      length: 50,
      headCircumference: 35,
      notes: 'คลอดปกติ',
    },
    {
      id: 'm-2',
      date: '2025-02-15',
      checkup: 'U2',
      weight: 4.2,
      length: 53,
      headCircumference: 36.5,
      notes: 'แข็งแรงดี',
    },
  ];

  it('generates multi-language Doctor PDF in German without throwing', async () => {
    await i18n.changeLanguage('de');
    const result = generateDoctorFeverReport(sampleChild);
    expect(result).toBe(true);
  });

  it('generates multi-language Doctor PDF in English without throwing', async () => {
    await i18n.changeLanguage('en');
    const result = generateDoctorFeverReport(sampleChild);
    expect(result).toBe(true);
  });

  it('generates multi-language Doctor PDF in Thai with Unicode support without throwing', async () => {
    await i18n.changeLanguage('th');
    const result = generateDoctorFeverReport(sampleChild);
    expect(result).toBe(true);
  });

  it('generates multi-language U-Heft A5 PDF booklet in DE, EN, and TH', async () => {
    for (const lang of ['de', 'en', 'th']) {
      await i18n.changeLanguage(lang);
      const fileName = generateUHeftA5Pdf(sampleChild, sampleMeasurements);
      expect(fileName).toBeDefined();
      expect(typeof fileName).toBe('string');
      expect(fileName).toContain('.pdf');
    }
  });

  it('generates full DIN A4 growth PDF report in DE, EN, and TH', async () => {
    const { exportReportToPdf } = await import('../utils/pdfGenerator.js');
    for (const lang of ['de', 'en', 'th']) {
      await i18n.changeLanguage(lang);
      const fileName = await exportReportToPdf(
        'pdf-report-template',
        sampleChild.name,
        sampleChild.gender,
        sampleChild,
        sampleMeasurements,
        false
      );
      expect(fileName).toBeDefined();
      expect(typeof fileName).toBe('string');
      expect(fileName).toContain('.pdf');
    }
  });
});
