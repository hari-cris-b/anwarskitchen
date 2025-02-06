import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({

    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', 'lucide-react'],
          'utils-vendor': ['date-fns', 'uuid', 'zustand']
        }
      }
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    // Enable source maps for production
    sourcemap: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    // Asset optimization
    assetsInlineLimit: 4096, // 4kb
    // Enable module preload polyfill
    modulePreload: {
      polyfill: true
    }
  },
  server: {
    // Enable HMR
    hmr: {
      protocol: 'ws',
      timeout: 30000
    },
    port: 5173,
    host: true,
    open: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@headlessui/react',
      'lucide-react',
      'date-fns',
      'uuid',
      'zustand'
    ],
    // Force include dynamic imports
    entries: [
      './src/**/*.{ts,tsx}',
    ],
    // Enable esbuild optimization
    esbuildOptions: {
      target: 'esnext',
      treeShaking: true,
      minify: true
    }
  },
  preview: {
    port: 5173,
    host: true
  }
});
