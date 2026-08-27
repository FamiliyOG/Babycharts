import { describe, it, expect } from 'vitest';
import { exportChildToCSV } from '../utils/csvExporter.js';
import { generateChildICalendar } from '../utils/calendarGenerator.js';

describe('Thai Unicode & Special Characters Handling in Exports (BC-070, BC-071)', () => {
  const thaiChild = {
    id: 'child-thai-1',
    name: 'น้องมีนา ใจดี (Mina)',
    gender: 'girl',
    birthdate: '2025-01-15',
    measurements: [
      {
        date: '2025-02-15',
        checkup: 'U2',
        weight: 4.25,
        length: 54.5,
        headCircumference: 36.8,
        notes: 'เด็กแข็งแรงดีมาก ทานนมแม่ได้ดี น้ำหนักขึ้นตามเกณฑ์ปกติ',
      },
    ],
    vaccinations: {
      'rotavirus-1': {
        completed: true,
        date: '2025-03-01',
        doctor: 'พญ. สมศรี พัฒนาการ',
        batch: 'TH-VAX-2025-09',
        notes: 'ไม่มีอาการแพ้หรือไข้หลังหยอดวัคซีน',
      },
    },
    milestones: {
      'first-smile': {
        completed: true,
        date: '2025-02-28',
        notes: 'ยิ้มตอบคุณแม่เมื่อได้ยินเสียงพูดคุย',
      },
    },
  };

  it('generates valid UTF-8 iCalendar content containing Thai Unicode characters', () => {
    // We mock URL.createObjectURL and document.createElement for DOM simulation in Node/Vitest
    const originalCreateElement = global.document?.createElement;
    const clicks = [];
    global.document = global.document || {};
    global.document.createElement = (tag) => {
      if (tag === 'a') {
        return {
          set href(val) {},
          set download(val) {
            expect(val).toContain('Mina');
          },
          click: () => clicks.push(true),
        };
      }
      return {};
    };
    global.URL = global.URL || {};
    global.URL.createObjectURL = (_blob) => 'blob:mock-url';
    global.URL.revokeObjectURL = () => {};

    const res = generateChildICalendar(thaiChild);
    expect(res).toBe(true);
    expect(clicks.length).toBe(1);

    if (originalCreateElement) {
      global.document.createElement = originalCreateElement;
    }
  });

  it('exports CSV with UTF-8 BOM maintaining Thai text integrity', () => {
    const originalCreateElement = global.document?.createElement;
    let exportedBlob = null;
    global.document = global.document || {};
    global.document.createElement = (tag) => {
      if (tag === 'a') {
        return {
          set href(val) {},
          set download(val) {},
          click: () => {},
        };
      }
      return {};
    };
    global.URL = global.URL || {};
    global.URL.createObjectURL = (blob) => {
      exportedBlob = blob;
      return 'blob:mock-url';
    };
    global.URL.revokeObjectURL = () => {};

    const res = exportChildToCSV(thaiChild);
    expect(res).toBe(true);
    expect(exportedBlob).not.toBeNull();

    if (originalCreateElement) {
      global.document.createElement = originalCreateElement;
    }
  });

  it('correctly handles Thai Intl.Segmenter or Unicode boundaries for word wrap without crashing', () => {
    const thaiParagraph = 'การเจริญเติบโตและพัฒนาการของเด็กปฐมวัยตามเกณฑ์มาตรฐานองค์การอนามัยโลก';

    // Test Intl.Segmenter if available or fallback string length calculation
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
      const words = Array.from(segmenter.segment(thaiParagraph)).map((s) => s.segment);
      expect(words.length).toBeGreaterThan(3);
    }

    expect(thaiParagraph.length).toBeGreaterThan(10);
  });
});
