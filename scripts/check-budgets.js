import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * scripts/check-budgets.js
 *
 * Enforces JS and CSS bundle size budgets in CI (BC-294).
 * Measures raw, gzip and brotli sizes of production build assets in dist/.
 */

const DIST_DIR = path.resolve(process.cwd(), 'dist/assets');

// Budget definitions (in Kilobytes gzip)
const BUDGETS = {
  // Main application CSS
  mainCssGzipMaxKb: 35,
  // Main application JS entry
  mainJsGzipMaxKb: 180,
  // Vendor React chunk
  vendorReactGzipMaxKb: 160,
  // Vendor Chart.js chunk
  vendorChartJsGzipMaxKb: 100,
  // Total Initial JS payload (index + vendor-react)
  initialJsGzipMaxKb: 320,
};

function measureFile(filePath) {
  const content = fs.readFileSync(filePath);
  const rawSize = content.length;
  const gzipSize = zlib.gzipSync(content, { level: 9 }).length;
  const brotliSize = zlib.brotliCompressSync(content).length;

  return {
    rawKb: (rawSize / 1024).toFixed(2),
    gzipKb: (gzipSize / 1024).toFixed(2),
    brotliKb: (brotliSize / 1024).toFixed(2),
    gzipBytes: gzipSize,
  };
}

function checkCssBudgets(cssFiles, results) {
  let hasFailure = false;
  let mainCssGzip = 0;

  for (const file of cssFiles) {
    const filePath = path.join(DIST_DIR, file);
    const measured = measureFile(filePath);
    results.push({ name: file, ...measured });

    if (file.startsWith('index-')) {
      mainCssGzip = Number.parseFloat(measured.gzipKb);
      if (mainCssGzip > BUDGETS.mainCssGzipMaxKb) {
        console.error(
          `❌ Main CSS (${file}) exceeds budget: ${mainCssGzip} KB gzip > ${BUDGETS.mainCssGzipMaxKb} KB`
        );
        hasFailure = true;
      } else {
        console.log(
          `✅ Main CSS (${file}): ${mainCssGzip} KB gzip (Budget: ${BUDGETS.mainCssGzipMaxKb} KB)`
        );
      }
    }
  }

  return { hasFailure, mainCssGzip };
}

function validateJsFile(file, gzipKb) {
  if (file.startsWith('index-')) {
    const exceeds = gzipKb > BUDGETS.mainJsGzipMaxKb;
    if (exceeds) {
      console.error(
        `❌ Main JS (${file}) exceeds budget: ${gzipKb} KB gzip > ${BUDGETS.mainJsGzipMaxKb} KB`
      );
    } else {
      console.log(
        `✅ Main JS (${file}): ${gzipKb} KB gzip (Budget: ${BUDGETS.mainJsGzipMaxKb} KB)`
      );
    }
    return { type: 'main', hasFailure: exceeds, gzipKb };
  }

  if (file.startsWith('vendor-react-')) {
    const exceeds = gzipKb > BUDGETS.vendorReactGzipMaxKb;
    if (exceeds) {
      console.error(
        `❌ Vendor React (${file}) exceeds budget: ${gzipKb} KB gzip > ${BUDGETS.vendorReactGzipMaxKb} KB`
      );
    } else {
      console.log(
        `✅ Vendor React (${file}): ${gzipKb} KB gzip (Budget: ${BUDGETS.vendorReactGzipMaxKb} KB)`
      );
    }
    return { type: 'vendorReact', hasFailure: exceeds, gzipKb };
  }

  if (file.startsWith('vendor-chartjs-')) {
    const exceeds = gzipKb > BUDGETS.vendorChartJsGzipMaxKb;
    if (exceeds) {
      console.error(
        `❌ Vendor Chart.js (${file}) exceeds budget: ${gzipKb} KB gzip > ${BUDGETS.vendorChartJsGzipMaxKb} KB`
      );
    } else {
      console.log(
        `✅ Vendor Chart.js (${file}): ${gzipKb} KB gzip (Budget: ${BUDGETS.vendorChartJsGzipMaxKb} KB)`
      );
    }
    return { type: 'vendorChartjs', hasFailure: exceeds, gzipKb };
  }

  return { type: 'other', hasFailure: false, gzipKb: 0 };
}

function checkJsBudgets(jsFiles, results) {
  let hasFailure = false;
  let mainJsGzip = 0;
  let vendorReactGzip = 0;

  for (const file of jsFiles) {
    const filePath = path.join(DIST_DIR, file);
    const measured = measureFile(filePath);
    results.push({ name: file, ...measured });

    const gzipKb = Number.parseFloat(measured.gzipKb);
    const check = validateJsFile(file, gzipKb);

    if (check.hasFailure) {
      hasFailure = true;
    }
    if (check.type === 'main') {
      mainJsGzip = check.gzipKb;
    } else if (check.type === 'vendorReact') {
      vendorReactGzip = check.gzipKb;
    }
  }

  return { hasFailure, mainJsGzip, vendorReactGzip };
}

function checkBudgets() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ dist/assets directory not found! Run npm run build first.');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR);
  const results = [];

  const cssFiles = files.filter((f) => f.endsWith('.css'));
  const jsFiles = files.filter((f) => f.endsWith('.js'));

  console.log('\n📊 === BabyCharts Bundle Budget Check (BC-294) ===\n');

  const cssResult = checkCssBudgets(cssFiles, results);
  const jsResult = checkJsBudgets(jsFiles, results);

  let hasFailure = cssResult.hasFailure || jsResult.hasFailure;

  const initialJsGzip = (jsResult.mainJsGzip + jsResult.vendorReactGzip).toFixed(2);
  if (Number.parseFloat(initialJsGzip) > BUDGETS.initialJsGzipMaxKb) {
    console.error(
      `❌ Total Initial JS payload exceeds budget: ${initialJsGzip} KB gzip > ${BUDGETS.initialJsGzipMaxKb} KB`
    );
    hasFailure = true;
  } else {
    console.log(
      `✅ Total Initial JS (main + react): ${initialJsGzip} KB gzip (Budget: ${BUDGETS.initialJsGzipMaxKb} KB)`
    );
  }

  console.log('\nAsset Overview:');
  const sortedResults = results.toSorted(
    (a, b) => Number.parseFloat(b.gzipKb) - Number.parseFloat(a.gzipKb)
  );

  for (const r of sortedResults.slice(0, 8)) {
    console.log(
      ` - ${r.name.padEnd(35)} | raw: ${r.rawKb.padStart(7)} KB | gzip: ${r.gzipKb.padStart(7)} KB | brotli: ${r.brotliKb.padStart(7)} KB`
    );
  }

  if (hasFailure) {
    console.error(
      '\n❌ Bundle budget validation failed! Please check oversized dependencies or imports.\n'
    );
    process.exit(1);
  } else {
    console.log('\n🎉 All bundle budgets passed successfully!\n');
  }
}

checkBudgets();
