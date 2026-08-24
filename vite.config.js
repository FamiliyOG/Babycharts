import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
export default defineConfig({
  plugins: [stripNonStandardCssPlugin(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      // html2canvas is only needed for jsPDF's doc.html() method which we never use.
      // Excluding it removes ~200 KB from the lazy PDF chunk.
      external: ['html2canvas'],
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
});
