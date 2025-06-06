import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Development server runs on port 3000
    proxy: {
      // Proxy API requests to the backend during development
      '/auth': {
        target: 'http://localhost:5000', // Your backend URL
        changeOrigin: true, // Changes the origin of the host header to the target URL
        secure: false, // Disable SSL verification (for localhost)
      },
      // Add more proxies if needed (e.g., '/api' for other endpoints)
      '/teams': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      '/tasks': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist', // Output directory for production build
    sourcemap: false, // Disable sourcemaps in production for smaller builds
  },
  base: '/', // Ensure correct asset paths for deployment (adjust if needed)
});
