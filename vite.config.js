import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Custom Vite plugin to strip -webkit-text-size-adjust from Tailwind v4 CSS reset to prevent Firefox console warnings
function stripWebkitTextSizeAdjustPlugin() {
  return {
    name: 'strip-webkit-text-size-adjust',
    transform(code, id) {
      if (id.includes('.css') || id.includes('tailwindcss') || id.includes('vite/deps')) {
        return {
          code: code.replace(/-webkit-text-size-adjust:\s*100%;?/g, ''),
          map: null,
        };
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [stripWebkitTextSizeAdjustPlugin(), react(), tailwindcss()],
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
