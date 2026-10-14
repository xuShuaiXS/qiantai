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

export interface UserProfile {
  id: number
  username: string
  nickname: string
}

export interface AuthResult {
  token: string
  expiresAt: string
  user: UserProfile
}

async function parseAuthBody(res: Response, fallback: string): Promise<AuthResult> {
  const body = await res.json()
  if (body.code !== 0) throw new Error(body.message || fallback)
  return body.data
}

export async function loginApi(username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return parseAuthBody(res, '登录失败')
}

export async function registerApi(
  username: string,
  password: string,
  nickname?: string,
): Promise<AuthResult> {
  const res = await fetch(`${baseURL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, nickname: nickname || '' }),
  })
  return parseAuthBody(res, '注册失败')
}

export async function meApi(): Promise<UserProfile> {
  const res = await fetch(`${baseURL}/auth/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  const body = await res.json()
  if (body.code !== 0) throw new Error(body.message || '未登录')
  return body.data
}
