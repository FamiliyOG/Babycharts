import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

async function generateIcons() {
  const browser = await chromium.launch({ headless: true });
  const svgPath = path.resolve('public/favicon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  async function renderIcon(size, isMaskable, outName) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: size, height: size });
    const padding = isMaskable ? Math.round(size * 0.12) : Math.round(size * 0.04);
    const innerSize = size - padding * 2;
    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${size}px;
      height: ${size}px;
      background: #020617;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .icon-container {
      width: ${innerSize}px;
      height: ${innerSize}px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div class="icon-container">
    ${svgContent}
  </div>
</body>
</html>`;
    await page.setContent(html);
    const outPath = path.resolve('public', outName);
    await page.screenshot({ path: outPath, type: 'png' });
    const stat = fs.statSync(outPath);
    console.log(`Generated ${outName}: ${stat.size} bytes`);
    await page.close();
  }

  await renderIcon(512, false, 'icon-512.png');
  await renderIcon(512, true, 'icon-512-maskable.png');
  await renderIcon(192, false, 'icon-192.png');
  await renderIcon(192, true, 'icon-192-maskable.png');
  await renderIcon(180, false, 'apple-touch-icon.png');
  await renderIcon(32, false, 'favicon-32x32.png');
  await renderIcon(16, false, 'favicon-16x16.png');

  // Overwrite default icon.png with optimized 512x512
  fs.copyFileSync(path.resolve('public/icon-512.png'), path.resolve('public/icon.png'));

  await browser.close();
  console.log('Icon generation finished successfully.');
}

try {
  await generateIcons();
} catch (err) {
  console.error(err);
  process.exit(1);
}
