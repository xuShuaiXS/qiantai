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

  /*
   * 「AI绘画」栏目：描述想法生成图片（复用 /chat/images/generations 文生图链路）。
   * 视频相关板块与未开发能力仅做前端占位，点击提示"未开发/即将上线"。
   */
  {
    path: '/ai-draw',
    component: () => import('@/views/tools/ToolsShell.vue'),
    meta: { public: true, shell: 'tools' },
    children: [
      {
        path: '',
        name: 'AiDraw',
        component: () => import('@/views/ai-draw/AiDrawView.vue'),
        meta: { title: 'AI绘画 - 极光AI', public: true },
      },
    ],
  },

  /*
   * 「视频生成」栏目：文生视频（网关 /videos 异步任务协议）。
   */
  {
    path: '/video-generation',
    component: () => import('@/views/tools/ToolsShell.vue'),
    meta: { public: true, shell: 'tools' },
    children: [
      {
        path: '',
        name: 'VideoGeneration',
        component: () => import('@/views/video-generation/VideoGenerationView.vue'),
        meta: { title: '视频生成 - 极光AI', public: true },
      },
    ],
  },

  /*
   * 「超级智能体」栏目：市场页 + 智能体对话页，同样挂在 ToolsShell 下。
   * 市场数据走 src/api/agents.ts 双模式：默认前端 Mock（内置种子数据 + localStorage），
   * 配置 VITE_AGENTS_API=/agent-api 后切换到本地 Nest 后端（vite 代理转发）。
   * 智能体对话不走新后端，直接复用 8080 的 /chat/completions 流式接口。
   */
  {
    path: '/agents',
    component: () => import('@/views/tools/ToolsShell.vue'),
    meta: { public: true, shell: 'tools' },
    children: [
      {
        path: '',
        name: 'Agents',
        component: () => import('@/views/agents/AgentsView.vue'),
        meta: { title: '超级智能体 - 极光AI', public: true },
      },
      {
        path: ':id/chat',
        name: 'AgentChat',
        component: () => import('@/views/agents/AgentChatView.vue'),
        meta: { title: '智能体对话 - 极光AI', public: true },
      },
    ],
  },
]

export default routes
