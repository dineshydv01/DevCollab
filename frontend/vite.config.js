import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // During dev, the React app runs on :5173 and the API on :5000.
    // This proxy lets us call fetch('/api/...') from React without
    // hardcoding http://localhost:5000 everywhere, and avoids extra
    // CORS complexity in local development.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
