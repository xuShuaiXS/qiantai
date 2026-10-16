import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { getToken } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { REQUIRE_LOGIN } from '@/config/runtime'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const title = (to.meta.title as string) || import.meta.env.VITE_APP_TITLE
  document.title = title

  /*
   * 免登录模式（REQUIRE_LOGIN=false）：
   * 不做任何跳转拦截，任何页面都直接放行；/login 也自动送回首页。
   * 首次进入时静默建立会话，让页面接口能正常取数。
   */
  if (!REQUIRE_LOGIN) {
    const auth = useAuthStore()
    if (!auth.bootstrapped) {
      await auth.ensureSession()
    }
    // /login 不再强制弹回首页：用户可主动来注册账号或切换身份
    return true
  }

  if (to.meta.public) {
    if (to.path === '/login' && getToken()) {
      return '/'
    }
    return true
  }

  if (!getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  const auth = useAuthStore()
  if (!auth.bootstrapped) {
    await auth.fetchProfile()
  }
  if (!auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
