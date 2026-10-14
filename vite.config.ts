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
      '/api': {
        target: 'http://192.168.50.30:8080',
        changeOrigin: true,
      },
      // 历史消息里可能是相对路径 /uploads/...；必须代理，否则只有本机直连后端时能看图
      '/uploads': {
        target: 'http://192.168.50.30:8080',
        changeOrigin: true,
      },
    },
  },
})

