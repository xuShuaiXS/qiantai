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
   * 结构：外层 ToolsShell 提供左侧导航栏（与对话页一致，进入栏目不再整页遮挡导航），
   *      栏目页面作为其子路由渲染在右侧内容区，访问路径保持不变。
   *
   * 注意：meta.public 为 true 是为了让本地无后端时也能直接预览页面
   * （宿主原有路由都要求登录态，而这两个栏目目前跑的是本地演示数据）。
   * 接入真实后端后，请去掉 public 并改为走统一鉴权。
   */
  {
    path: '/image-generation',
    component: () => import('@/views/tools/ToolsShell.vue'),
    meta: { public: true, shell: 'tools' },
    children: [
      {
        path: '',
        name: 'ImageGeneration',
        component: () => import('@/views/image-generation/ImageGenerationView.vue'),
        meta: { title: '图片生成 - 极光AI', public: true },
      },
    ],
  },
  {
    path: '/smart-editing',
    component: () => import('@/views/tools/ToolsShell.vue'),
    meta: { public: true, shell: 'tools' },
    children: [
      {
        path: '',
        name: 'SmartEditing',
        component: () => import('@/views/smart-editing/SmartEditEditorView.vue'),
        meta: { title: '智能修图 - 极光AI', public: true },
      },
      {
        path: 'classic',
        name: 'SmartEditingClassic',
        component: () => import('@/views/smart-editing/SmartEditingView.vue'),
        meta: { title: '智能修图 - 极光AI', public: true },
      },
      {
        path: 'remove-bg',
        name: 'SmartEditingRemoveBg',
        component: () => import('@/views/smart-editing/RemoveBgView.vue'),
        meta: { title: '智能抠图 - 极光AI', public: true },
      },
      {
        path: 'remove-object',
        name: 'SmartEditingRemoveObject',
        component: () => import('@/views/smart-editing/RemoveObjectView.vue'),
        meta: { title: 'AI 消除 - 极光AI', public: true },
      },
    ],
  },
]

export default routes
