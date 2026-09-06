import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Manifest & Asset Integrity Tests (BC-293, BC-298)', () => {
  const publicDir = path.resolve(process.cwd(), 'public');

  it('verifies manifest.webmanifest exists and has valid json', () => {
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(content.name).toContain('BabyCharts');
    expect(content.display).toBe('standalone');
    expect(Array.isArray(content.icons)).toBe(true);
    expect(content.icons.length).toBeGreaterThanOrEqual(4);
  });

  it('verifies all specified icons in manifest exist on disk and have non-zero size', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8')
    );

    for (const icon of manifest.icons) {
      const cleanPath = icon.src.replace(/^\//, '');
      const fullPath = path.join(publicDir, cleanPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(100);
    }
  });

  it('verifies maskable icons are defined in manifest for Android adaptive icons', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8')
    );
    const maskable = manifest.icons.filter((i) => i.purpose && i.purpose.includes('maskable'));
    expect(maskable.length).toBeGreaterThanOrEqual(2);
  });

  it('verifies dedicated offline.html fallback exists and contains offline notice', () => {
    const offlinePath = path.join(publicDir, 'offline.html');
    expect(fs.existsSync(offlinePath)).toBe(true);
    const content = fs.readFileSync(offlinePath, 'utf8');
    expect(content).toContain('Keine Internetverbindung');
  });

  it('verifies sw.js contains security boundary preventing API caching', () => {
    const swPath = path.join(publicDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);
    const content = fs.readFileSync(swPath, 'utf8');
    expect(content).toContain("url.pathname.startsWith('/api/')");
    expect(content).toContain('CLEAR_USER_DATA');
  });
});
