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

/** 认证请求统一 15s 超时：后端不可达时快速失败，避免按钮无限转圈 */
const AUTH_TIMEOUT = 15000

async function parseAuthBody(res: Response, fallback: string): Promise<AuthResult> {
  // 后端/代理偶发返回空响应体（502/504/断流）时 res.json() 会抛
  // "Unexpected end of JSON input"，这里转成可读提示
  let body: { code?: number; message?: string; data?: AuthResult }
  try {
    body = await res.json()
  } catch {
    throw new Error(res.ok ? '服务器响应异常，请稍后重试' : `服务器错误（${res.status}），请稍后重试`)
  }
  if (body.code !== 0) throw new Error(body.message || fallback)
  return body.data as AuthResult
}

export async function loginApi(username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${baseURL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(AUTH_TIMEOUT),
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
    signal: AbortSignal.timeout(AUTH_TIMEOUT),
  })
  return parseAuthBody(res, '注册失败')
}

export async function meApi(): Promise<UserProfile> {
  const res = await fetch(`${baseURL}/auth/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    signal: AbortSignal.timeout(AUTH_TIMEOUT),
  })
  let body: { code?: number; message?: string; data?: UserProfile }
  try {
    body = await res.json()
  } catch {
    throw new Error('服务器响应异常，请稍后重试')
  }
  if (body.code !== 0) throw new Error(body.message || '未登录')
  return body.data as UserProfile
}
