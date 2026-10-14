import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { clearToken, getToken, loginApi, meApi, setToken, type AdminProfile } from '@/api/auth'

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

  function logout() {
    token.value = ''
    admin.value = null
    clearToken()
  }

  return { token, admin, bootstrapped, isLoggedIn, login, fetchProfile, logout }
})
