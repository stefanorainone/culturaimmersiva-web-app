import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Build optimizations and security enhancements
  build: {
    // Minify using terser for better security
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.* calls in production build
        drop_console: true,
        drop_debugger: true,
        // Remove dead code
        dead_code: true,
        // Additional compression
        passes: 2
      },
      mangle: {
        // Mangle variable names for obfuscation
        safari10: true
      },
      format: {
        // Remove comments
        comments: false
      }
    },

    // Disable source maps in production for security
    sourcemap: false,

    // Code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-ui': ['framer-motion', 'react-icons'],
          'vendor-utils': ['crypto-js', 'html2canvas', 'jspdf']
        }
      }
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 1000
  },

  // Development server security headers
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  }
})
