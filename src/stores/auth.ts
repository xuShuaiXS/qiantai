import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clearToken, getToken, loginApi, meApi, setToken, type AdminProfile } from '@/api/auth'
import { AUTO_LOGIN_PASSWORD, AUTO_LOGIN_USERNAME } from '@/config/runtime'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const admin = ref<AdminProfile | null>(null)
  const bootstrapped = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  async function login(username: string, password: string) {
    const res = await loginApi(username, password)
    token.value = res.token
    setToken(res.token)
    admin.value = res.admin
    return res
  }

  async function fetchProfile() {
    if (!token.value) {
      admin.value = null
      bootstrapped.value = true
      return null
    }
    try {
      admin.value = await meApi()
      return admin.value
    } catch {
      token.value = ''
      admin.value = null
      clearToken()
      return null
    } finally {
      bootstrapped.value = true
    }
  }

  /**
   * 免登录模式的静默会话：
   * 没有 token 时用默认账号自动登录一次，保证页面里的接口能正常取数。
   * 后端不可达时静默失败——不阻断进入页面，只是页面数据为空。
   */
  async function ensureSession() {
    if (!token.value) {
      try {
        await login(AUTO_LOGIN_USERNAME, AUTO_LOGIN_PASSWORD)
      } catch {
        /* 静默失败：后端未启动时依然允许进入页面 */
      }
    }
    if (token.value && !admin.value) {
      await fetchProfile()
    }
    bootstrapped.value = true
    return isLoggedIn.value
  }

  function logout() {
    token.value = ''
    admin.value = null
    clearToken()
  }

  return { token, admin, bootstrapped, isLoggedIn, login, fetchProfile, ensureSession, logout }
})
