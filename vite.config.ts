import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // iPhone/iPad から LAN 経由でアクセスする場合は npm run dev:host を使用
    host: false,
  },
});
