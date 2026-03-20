import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore'],
          'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
          'piano': ['./src/components/PianoEditoriale'],
          'gsc': ['./src/components/GSCInsights'],
        }
      }
    }
  }
})
