import { fileURLToPath, URL } from 'node:url'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    vueDevTools(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 与 houtai 控制台（5173）错开
    port: 5174,
    // 同 WiFi 协作：代理到本机局域网 IP，其他人改前端也能打到同一后端
    host: true,
    proxy: {
      // 模型对话等前台接口 → 本地 agent-server（NestJS+PG，已从 go-admin 8080 平移）
      // 切回同事后端：把两处 target 改回 http://192.168.50.30:8080
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 历史消息/生图落盘可能是相对路径 /uploads/...；必须代理，否则看不了图
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 超级智能体走同一本地后端（全局前缀 /api），/agent-api 仅是别名
      // 前端 .env.development 配 VITE_AGENTS_API=/agent-api 即启用；为空则走前端 Mock
      '/agent-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/agent-api/, '/api'),
      },
    },
  },
})

