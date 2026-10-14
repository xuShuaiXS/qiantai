import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录 - 极光AI', public: true },
  },
  {
    path: '/',
    name: 'NewChat',
    component: () => import('@/views/chat/index.vue'),
    meta: { title: '极光AI - 新对话' },
  },
]

export default routes
