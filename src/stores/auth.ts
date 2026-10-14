import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  clearToken,
  getToken,
  loginApi,
  meApi,
  registerApi,
  setToken,
  type UserProfile,
} from '@/api/auth'
import { AUTO_LOGIN_PASSWORD, AUTO_LOGIN_USERNAME } from '@/config/runtime'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const user = ref<UserProfile | null>(null)
  const bootstrapped = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  function applyAuth(res: { token: string; user: UserProfile }) {
    token.value = res.token
    setToken(res.token)
    user.value = res.user
    bootstrapped.value = true
  }

  async function login(username: string, password: string) {
    const res = await loginApi(username, password)
    applyAuth(res)
    return res
  }

  async function register(username: string, password: string, nickname?: string) {
    const res = await registerApi(username, password, nickname)
    applyAuth(res)
    return res
  }

  async function fetchProfile() {
    if (!token.value) {
      user.value = null
      bootstrapped.value = true
      return null
    }
    try {
      user.value = await meApi()
      return user.value
    } catch {
      token.value = ''
      user.value = null
      clearToken()
      return null
    } finally {
      bootstrapped.value = true
    }
  }

  /**
   * 免登录模式的静默会话：
   * 没有 token 时用默认账号自动登录一次（走 /auth/login，拿用户态 token），
   * 保证 /chat/* 等接口能正常取数。
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
    if (token.value && !user.value) {
      await fetchProfile()
    }
    bootstrapped.value = true
    return isLoggedIn.value
  }

  function logout() {
    token.value = ''
    user.value = null
    clearToken()
  }

  return { token, user, bootstrapped, isLoggedIn, login, register, fetchProfile, ensureSession, logout }
})
