import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/query': 'http://localhost:8000',
      '/memory': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
});
