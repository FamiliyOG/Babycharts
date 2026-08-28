/**
 * server/pdfGenerator.js
 * Generates a PDF report for a child profile using Puppeteer (Headless Chrome).
 * The server opens the built frontend at ?puppeteerReport=<childId>, waits for
 * the report to render, then saves the result as a PDF file.
 */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { getSettings } from './utils/db.js';

/**
 * Generate a PDF report for the given child profile.
 * @param {object} profile - The child profile object (with measurements)
 * @param {string} appUrl - The URL where the app is served (e.g. http://localhost:3001)
 * @returns {Promise<string|null>} - Absolute path to the generated PDF, or null on failure
 */
export async function generatePdfForChild(profile, appUrl) {
  const settings = getSettings();
  const rawDir = settings.pdfOutputDir || './pdf_exports';
  const exportDir = path.resolve(process.cwd(), rawDir);

  // Create child-specific subdirectory
  const childDir = path.join(exportDir, sanitizeName(profile.name));
  fs.mkdirSync(childDir, { recursive: true });

  const timestamp = getTimestamp();
  const filename = `Wachstumsbericht_${sanitizeName(profile.name)}_${timestamp}.pdf`;
  const outputPath = path.join(childDir, filename);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // helps in Docker environments
      ],
      // If PUPPETEER_EXECUTABLE_PATH is set (e.g. in Docker), use that
      ...(process.env.PUPPETEER_EXECUTABLE_PATH
        ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH }
        : {}),
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });

    // Navigate to the special report-print URL
    const reportUrl = `${appUrl}/?puppeteerReport=${encodeURIComponent(profile.id)}`;
    console.log(`[PDF] Navigating to: ${reportUrl}`);

    await page.goto(reportUrl, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the report element to appear in the DOM
    await page.waitForSelector('#puppeteer-report-ready', { timeout: 20000 });

    // Brief additional wait for fonts / final render pass
    await new Promise((r) => setTimeout(r, 800));

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    console.log('[PDF] Generated: %s', outputPath);
    return outputPath;
  } catch (err) {
    console.error('[PDF] Failed for profile:', profile?.name, err?.message || err);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\-_äöüÄÖÜß]/g, '_');
}

function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}
