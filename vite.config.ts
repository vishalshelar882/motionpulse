import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss()],

<<<<<<< HEAD
    base: '/', // ✅ FIXED (note trailing slash)
=======
    base: '/motionpulse', // ✅ FIXED (note trailing slash)
>>>>>>> a116456f0901713109ed5254b4d424e5ee1cafd5

    define: {
      // keep empty or use for actual env replacements
    },
  };
});
