import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
  server: {
    // 같은 와이파이의 폰에서 http://<PC의 IP>:5173 으로 붙어 테스트할 수 있게
    host: true,
    port: 5173,
  },
});
