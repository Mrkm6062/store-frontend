import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inline-css',
      transformIndexHtml(html, ctx) {
        if (!ctx || !ctx.bundle) return html;
        let cssContent = '';
        for (const [fileName, file] of Object.entries(ctx.bundle)) {
          if (fileName.endsWith('.css') && file.type === 'asset') {
            cssContent += file.source;
            delete ctx.bundle[fileName];
          }
        }
        if (cssContent) {
          const cleanedHtml = html.replace(/<link rel="stylesheet"[^>]*href="[^"]+\.css"[^>]*>/g, '');
          return cleanedHtml.replace('</head>', `<style>${cssContent}</style></head>`);
        }
        return html;
      }
    }
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    },
    chunkSizeWarningLimit: 300,
    target: 'es2015'
  },
  server: {
    port: 3012,
    compress: true,
    hmr: process.env.NODE_ENV === 'production' ? false : true,
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    },
    proxy: {
      '/robots.txt': {
        target: 'http://localhost:3011',
        changeOrigin: true
      },
      '/sitemap.xml': {
        target: 'http://localhost:3011',
        changeOrigin: true
      },
      '/llms.txt': {
        target: 'http://localhost:3011',
        changeOrigin: true
      }
    }
  }
})