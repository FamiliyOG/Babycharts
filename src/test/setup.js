import '@testing-library/jest-dom';
import '../i18n/index.js';
import { vi } from 'vitest';
import * as jspdfModule from 'jspdf';

// Mock jsPDF save method during tests to prevent PDF files from polluting the repository root
const jsPDFClass = jspdfModule.jsPDF || jspdfModule.default;
if (jsPDFClass?.prototype) {
  jsPDFClass.prototype.save = vi.fn().mockImplementation(function mockSave() {
    return this;
  });
}
