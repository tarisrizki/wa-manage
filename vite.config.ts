import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Sangat penting untuk Electron agar relative path bekerja di dalam file system
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  test: {
    // [BUG FIX] Tanpa ini, setelah `npm run build` menghasilkan dist/main/*.test.js
    // (hasil kompilasi CommonJS dari tsconfig.main.json), Vitest ikut menemukan dan
    // menjalankan file tersebut lalu gagal: "Vitest cannot be imported in a CommonJS
    // module using require()". CI menjalankan build SEBELUM test di job yang sama,
    // jadi kegagalan ini nyata terjadi di CI, bukan cuma teori.
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
