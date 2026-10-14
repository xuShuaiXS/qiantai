import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { getToken } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const title = (to.meta.title as string) || import.meta.env.VITE_APP_TITLE
  document.title = title

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
