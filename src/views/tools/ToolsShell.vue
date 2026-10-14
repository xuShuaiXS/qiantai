<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SideNav from '@/views/chat/components/SideNav.vue'
import { navSections } from '@/views/chat/data'
// 侧栏 .sider/.shell 等样式定义在聊天页的 new-chat.css 里（全局类），
// 直接访问栏目路由时聊天页未加载，需要在这里引入一次
import '@/views/chat/new-chat.css'

/**
 * 「智能修图 / 图片生成」栏目的外壳布局。
 *
 * 左侧复用对话页的导航栏（保持全局导航可见、可切换），
 * 右侧渲染当前栏目页面（router-view）。
 * 路由仍保持 /image-generation、/smart-editing 等原路径不变，
 * 仅在本组件下嵌套为子路由。
 */
const route = useRoute()
const router = useRouter()

const siderCollapsed = ref(false)
const siderOpen = ref(false)

/** 当前高亮的能力入口（按路由反推，子路由共用同一入口高亮） */
const activeKey = computed(() => {
  if (route.path.startsWith('/smart-editing')) return 'retouch'
  if (route.path.startsWith('/image-generation')) return 'imggen'
  return ''
})

/**
 * 生图输入栏（ImagePromptDock）Teleport 到 body 且 fixed 定位，
 * 这里把侧栏宽度同步为全局 CSS 变量，供其让位。
 */
watchEffect(() => {
  document.documentElement.style.setProperty(
    '--tools-sider-w',
    siderCollapsed.value ? '64px' : '220px',
  )
})

function onNavSelect(payload: { key: string; name: string; page?: boolean; route?: string }) {
  siderOpen.value = false
  if (payload.route) {
    router.push(payload.route)
    return
  }
  // 首页 / 模型对话：回到对话页
  if (payload.key === 'home' || payload.key === 'chat') {
    router.push('/')
  }
}
</script>

<template>
  <div class="tools-shell">
    <SideNav
      :sections="navSections"
      :collapsed="siderCollapsed"
      :open="siderOpen"
      :active-key="activeKey"
      :active-session-id="null"
      @toggle-collapse="siderCollapsed = !siderCollapsed"
      @new-chat="router.push('/')"
      @select="onNavSelect"
    />

    <main class="tools-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.tools-shell {
  display: flex;
  height: 100vh;
  height: 100dvh;
  background: var(--c-bg);
}

.tools-main {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow-y: auto;
}
</style>
