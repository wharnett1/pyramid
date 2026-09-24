import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Dev server proxies /api to the Express backend on :4000, so the frontend can
// call same-origin `/api/...` with no CORS concerns.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
