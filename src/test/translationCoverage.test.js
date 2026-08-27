import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getNestedKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getNestedKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n Translation Coverage & Consistency (BC-072)', () => {
  const localesDir = path.resolve(__dirname, '../i18n/locales');
  const deJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'de/common.json'), 'utf8'));
  const enJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'en/common.json'), 'utf8'));
  const thJson = JSON.parse(fs.readFileSync(path.join(localesDir, 'th/common.json'), 'utf8'));

  const deKeys = getNestedKeys(deJson).sort();
  const enKeys = getNestedKeys(enJson).sort();
  const thKeys = getNestedKeys(thJson).sort();

  it('verifies that German and English have 100% matching translation keys', () => {
    const missingInEn = deKeys.filter((k) => !enKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !deKeys.includes(k));

    expect(missingInEn, `Keys present in DE but missing in EN: ${missingInEn.join(', ')}`).toEqual(
      []
    );
    expect(extraInEn, `Keys present in EN but missing in DE: ${extraInEn.join(', ')}`).toEqual([]);
  });

  it('verifies that German and Thai have 100% matching translation keys', () => {
    const missingInTh = deKeys.filter((k) => !thKeys.includes(k));
    const extraInTh = thKeys.filter((k) => !deKeys.includes(k));

    expect(missingInTh, `Keys present in DE but missing in TH: ${missingInTh.join(', ')}`).toEqual(
      []
    );
    expect(extraInTh, `Keys present in TH but missing in DE: ${extraInTh.join(', ')}`).toEqual([]);
  });

  it('verifies that no translation value is empty or undefined', () => {
    const checkEmptyValues = (obj, lang, pathStr = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const currPath = pathStr ? `${pathStr}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          checkEmptyValues(v, lang, currPath);
        } else {
          expect(
            typeof v === 'string' && v.trim().length > 0,
            `Empty translation at [${lang}] ${currPath}`
          ).toBe(true);
        }
      }
    };

    checkEmptyValues(deJson, 'de');
    checkEmptyValues(enJson, 'en');
    checkEmptyValues(thJson, 'th');
  });
});
