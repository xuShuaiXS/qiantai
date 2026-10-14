const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const TOKEN_KEY = 'boundary_chat_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export interface AdminProfile {
  id: number
  username: string
  nickname: string
  isSuper: boolean
}

export interface LoginResult {
  token: string
  expiresAt: string
  admin: AdminProfile
}

export async function loginApi(username: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${baseURL}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await res.json()
  if (body.code !== 0) throw new Error(body.message || '登录失败')
  return body.data
}

export async function meApi(): Promise<AdminProfile> {
  const res = await fetch(`${baseURL}/admin/auth/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  const body = await res.json()
  if (body.code !== 0) throw new Error(body.message || '未登录')
  return body.data
}
