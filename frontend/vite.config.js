import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration.
 *
 * The dev server proxies the API rather than having the frontend call
 * http://localhost:5000 directly. That keeps every request same-origin in
 * development, which means cookies and CORS behave the same way they will behind
 * a reverse proxy in production — so a class of "works locally, breaks deployed"
 * bugs never appears.
 */
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    // Fail loudly if 5173 is taken instead of quietly moving to 5174, which
    // would leave the backend's CORS allowlist pointing at the wrong origin.
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      // Socket.IO needs ws:true or the upgrade handshake is proxied as plain
      // HTTP and the client silently falls back to long-polling forever.
      '/socket.io': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    // three.js alone is well over 600 kB, so the default warning fires on every
    // build and stops meaning anything. Raised, with the heavy libraries split
    // into their own chunks below so the first paint does not wait on them.
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },

  // Pre-bundling three and drei is slow but happens once; without it the first
  // load of the digital-twin page stalls while Vite processes them on demand.
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
});
