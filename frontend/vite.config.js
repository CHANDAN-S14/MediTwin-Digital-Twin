import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration
 */
export default defineConfig({
  plugins: [react()],

  /* ============================================================
     DEVELOPMENT SERVER
  ============================================================ */

  server: {
    host: '0.0.0.0',
    port: 5173,

    // Don't automatically switch to another port
    strictPort: true,

    proxy: {
      '/api': {
        target:
          process.env.VITE_PROXY_TARGET ||
          'http://127.0.0.1:5000',

        changeOrigin: true,
      },

      '/socket.io': {
        target:
          process.env.VITE_PROXY_TARGET ||
          'http://127.0.0.1:5000',

        ws: true,
        changeOrigin: true,
      },
    },
  },

  /* ============================================================
     PRODUCTION PREVIEW
  ============================================================ */

  preview: {
    host: '0.0.0.0',

    // Render provides the PORT environment variable
    port: Number(process.env.PORT) || 4173,

    strictPort: true,

    allowedHosts: [
      'meditwin-digital-twin-2.onrender.com',
    ],
  },

  /* ============================================================
     BUILD
  ============================================================ */

  build: {
    outDir: 'dist',

    sourcemap: true,

    chunkSizeWarningLimit: 1400,

    rollupOptions: {
      output: {
        manualChunks: {
          three: [
            'three',
            '@react-three/fiber',
            '@react-three/drei',
          ],

          charts: [
            'recharts',
          ],

          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
          ],
        },
      },
    },
  },

  /* ============================================================
     OPTIMIZATION
  ============================================================ */

  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
});
