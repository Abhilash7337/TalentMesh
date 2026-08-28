import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves this as a project site at /TalentMesh/, not the domain
// root, so every built asset URL needs that prefix.
// https://vite.dev/config/
export default defineConfig({
  base: '/TalentMesh/',
  plugins: [react()],
})
