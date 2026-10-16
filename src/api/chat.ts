import { clearToken, getToken } from './auth'
import { resolveMediaUrl, resolveMediaUrls } from '@/utils/mediaUrl'
import { REQUIRE_LOGIN } from '@/config/runtime'

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMsg {
  role: 'user' | 'assistant' | 'system'
  content: string | ChatContentPart[]
}

export interface PublicModel {
  id: number
  name: string
  modelId: string
  family: string
  familyName: string
  providerName: string
  providerCode: string
  isDefault: boolean
}

export interface ModelVariant {
  id: number
  name: string
  modelId: string
  capability: string
  isDefault: boolean
  sort: number
}

/** 顶栏系列 + 输入框具体型号 */
export interface ModelFamily {
  key: string
  name: string
  providerName: string
  providerCode: string
  capability: string
  isDefault: boolean
  variants: ModelVariant[]
}

export interface ImageGenerationResult {
  images: string[]
  revisedPrompt?: string
}

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

function authHeaders(extra?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = { ...(extra || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** 公开工具页：401 时不踢去登录页（页面可匿名浏览，失败由页面自行提示） */
const PUBLIC_TOOL_PREFIXES = ['/image-generation', '/smart-editing', '/ai-draw', '/agents']

async function handleUnauthorized(body: { code?: number; message?: string }) {
  if (body?.code === 40100 || body?.code === 40102 || body?.code === 40103) {
    clearToken()
    // 免登录模式下不跳登录页：由路由守卫静默重建会话
    if (!REQUIRE_LOGIN) return
    // 公开工具页不跳登录：模型列表等加载失败由页面内提示，不打断浏览
    if (PUBLIC_TOOL_PREFIXES.some((p) => location.pathname.startsWith(p))) return
    if (!location.pathname.startsWith('/login')) {
      location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`
    }
  }
}

async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    ...init,
    headers: authHeaders({
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    }),
  })
  const body = await res.json()
  await handleUnauthorized(body)
  if (body.code !== 0) throw new Error(body.message || '请求失败')
  return body.data as T
}

export async function fetchPublicModels(): Promise<PublicModel[]> {
  return apiJSON<PublicModel[]>('/chat/models')
}

export async function fetchModelFamilies(): Promise<ModelFamily[]> {
  return apiJSON<ModelFamily[]>('/chat/model-families')
}

/** 文生图：代理上游 /images/generations，返回已落盘的图片 URL */
export async function generateImage(payload: {
  model: string
  prompt: string
  n?: number
  size?: string
  signal?: AbortSignal
}): Promise<ImageGenerationResult> {
  const data = await apiJSON<ImageGenerationResult>('/chat/images/generations', {
    method: 'POST',
    body: JSON.stringify({
      model: payload.model,
      prompt: payload.prompt,
      n: payload.n ?? 1,
      size: payload.size || '1024x1024',
    }),
    signal: payload.signal,
  })
  return {
    ...data,
    images: resolveMediaUrls(data.images),
  }
}

export interface ChatSessionItem {
  id: number
  title: string
  modelId: string
  /** 智能体会话关联的智能体 id；普通模型对话为空 */
  agentId?: number | null
  createdAt: string
  updatedAt: string
}

export interface ChatSessionMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant' | 'system'
  content: string
  /** 后端存 JSON 字符串数组 */
  images?: string
  modelId: string
  createdAt: string
}

export interface ChatSessionDetail extends ChatSessionItem {
  messages: ChatSessionMessage[]
}

export function listChatSessions(limit = 50, agentId?: number) {
  const qs = new URLSearchParams({ limit: String(limit) })
  if (agentId != null) qs.set('agentId', String(agentId))
  return apiJSON<ChatSessionItem[]>(`/chat/sessions?${qs.toString()}`)
}

export function createChatSession(payload?: {
  title?: string
  modelId?: string
  agentId?: number
}) {
  return apiJSON<ChatSessionItem>('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export function getChatSession(id: number) {
  return apiJSON<ChatSessionDetail>(`/chat/sessions/${id}`)
}

export function renameChatSession(id: number, title: string) {
  return apiJSON<ChatSessionItem>(`/chat/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  })
}

export function deleteChatSession(id: number) {
  return apiJSON<{ ok: boolean }>(`/chat/sessions/${id}`, { method: 'DELETE' })
}

export function batchDeleteChatSessions(ids: number[]) {
  return apiJSON<{ ok: boolean; deleted: number }>('/chat/sessions/batch-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export function appendChatMessages(
  id: number,
  messages: { role: string; content: string; images?: string[]; modelId?: string }[],
) {
  return apiJSON<ChatSessionDetail>(`/chat/sessions/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messages }),
  })
}

/** 对话页上传图片，返回可访问 URL */
export async function uploadChatImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${baseURL}/chat/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  })
  const body = await res.json()
  await handleUnauthorized(body)
  if (body.code !== 0) throw new Error(body.message || '上传失败')
  const url = body.data?.url as string
  if (!url) throw new Error('上传成功但未返回地址')
  return resolveMediaUrl(url)
}

/** 流式对话：解析 OpenAI 兼容 SSE，逐段回调 content */
export async function streamChat(opts: {
  model: string
  messages: ChatMsg[]
  signal?: AbortSignal
  onDelta: (text: string) => void
}) {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    }),
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true,
    }),
    signal: opts.signal,
  })

  if (res.status === 401) {
    clearToken()
    // 公开工具页不跳登录：与 handleUnauthorized 的豁免保持一致，避免打断浏览
    const onPublicTool = PUBLIC_TOOL_PREFIXES.some((p) => location.pathname.startsWith(p))
    if (REQUIRE_LOGIN && !onPublicTool) {
      location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`
      throw new Error('登录已失效，请重新登录')
    }
    throw new Error('请求未授权')
  }

  if (!res.ok) {
    const text = await res.text()
    try {
      const body = JSON.parse(text)
      await handleUnauthorized(body)
      throw new Error(body.message || text || `请求失败 ${res.status}`)
    } catch (e) {
      if (e instanceof Error && e.message !== text) throw e
      throw new Error(text || `请求失败 ${res.status}`)
    }
  }

  if (!res.body) throw new Error('浏览器不支持流式响应')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const json = JSON.parse(data)
        if (json.error) throw new Error(typeof json.error === 'string' ? json.error : '上游错误')
        const delta = json.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta) opts.onDelta(delta)
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}
