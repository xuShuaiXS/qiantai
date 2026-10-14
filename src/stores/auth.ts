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

  function logout() {
    token.value = ''
    user.value = null
    clearToken()
  }

  return { token, user, bootstrapped, isLoggedIn, login, register, fetchProfile, logout }
})
