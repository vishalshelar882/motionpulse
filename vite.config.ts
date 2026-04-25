import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

    base: '/motionpulse/', // ✅ FIXED (note trailing slash)

    define: {
      // keep empty or use for actual env replacements
    },
  };
});