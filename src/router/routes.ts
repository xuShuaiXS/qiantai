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

  /*
   * 以下为从 oademo 移植过来的「图片生成 / 智能修图」栏目。
   *
   * 注意：meta.public 为 true 是为了让本地无后端时也能直接预览页面
   * （宿主原有路由都要求登录态，而这两个栏目目前跑的是本地演示数据）。
   * 接入真实后端后，请去掉 public 并改为走统一鉴权。
   */
  {
    path: '/image-generation',
    name: 'ImageGeneration',
    component: () => import('@/views/image-generation/ImageGenerationView.vue'),
    meta: { title: '图片生成 - 极光AI', public: true },
  },
  {
    path: '/smart-editing',
    name: 'SmartEditing',
    component: () => import('@/views/smart-editing/SmartEditEditorView.vue'),
    meta: { title: '智能修图 - 极光AI', public: true },
  },
  {
    path: '/smart-editing/classic',
    name: 'SmartEditingClassic',
    component: () => import('@/views/smart-editing/SmartEditingView.vue'),
    meta: { title: '智能修图 - 极光AI', public: true },
  },
  {
    path: '/smart-editing/remove-bg',
    name: 'SmartEditingRemoveBg',
    component: () => import('@/views/smart-editing/RemoveBgView.vue'),
    meta: { title: '智能抠图 - 极光AI', public: true },
  },
  {
    path: '/smart-editing/remove-object',
    name: 'SmartEditingRemoveObject',
    component: () => import('@/views/smart-editing/RemoveObjectView.vue'),
    meta: { title: 'AI 消除 - 极光AI', public: true },
  },
]

export default routes
