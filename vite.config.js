import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

// Custom Vite plugin to strip non-standard CSS properties from Tailwind v4 CSS reset to prevent Firefox console warnings
function stripNonStandardCssPlugin() {
  return {
    name: 'strip-non-standard-css',
    transform(code, id) {
      if (id.includes('.css') || id.includes('tailwindcss') || id.includes('vite/deps')) {
        return {
          code: code
            .replace(/-webkit-text-size-adjust:\s*100%;?/g, '')
            .replace(/-moz-osx-font-smoothing:\s*grayscale;?/g, ''),
          map: null,
        };
      }
    },
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (
          file.type === 'asset' &&
          file.fileName.endsWith('.css') &&
          typeof file.source === 'string'
        ) {
          file.source = file.source
            .replace(/-webkit-text-size-adjust:\s*100%;?/g, '')
            .replace(/-moz-osx-font-smoothing:\s*grayscale;?/g, '');
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    stripNonStandardCssPlugin(),
    react(),
    tailwindcss(),
    mode === 'analyze' &&
      visualizer({
        filename: './reports/bundle/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    fileParallelism: false,
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: ['e2e/**', 'src/test/**', '**/node_modules/**', '**/dist/**'],
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // html2canvas is only needed for jsPDF's doc.html() method which we never use.
      // Excluding it removes ~200 KB from the lazy PDF chunk.
      external: ['html2canvas'],
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/chart.js') ||
            id.includes('node_modules/react-chartjs-2') ||
            id.includes('node_modules/chartjs-plugin-zoom')
          ) {
            return 'vendor-chartjs';
          }
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-jspdf';
          }
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/@tanstack/react-query')
          ) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
  // Proxy /api requests to the Express server during local development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/server/data/**'],
    },
  },
}));
