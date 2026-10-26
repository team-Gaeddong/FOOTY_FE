import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '')

  // FD-06: /api로 시작하는 요청을 접두사를 떼고 BE로 넘긴다(같은 origin이라 CORS 불필요).
  // BE 주소는 .env.local의 FOOTY_BE_ORIGIN으로 바꿀 수 있다.
  const proxy = {
    '/api': {
      target: env.FOOTY_BE_ORIGIN || 'http://localhost:8080',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],
    server: { proxy },
    preview: { proxy },
  }
})
