import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures relative assets work anywhere (GitHub Pages subpaths, custom domains, Vercel, Netlify)
  plugins: [
    react(),
    tailwindcss(),
  ],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
