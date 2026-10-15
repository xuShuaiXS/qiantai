import { getToken } from './auth'

/** 与后端 agent-server 约定一致的数据结构 */
export interface AgentCategory {
  id: number
  name: string
  icon: string
  count: number
}

export interface AgentItem {
  id: number
  name: string
  avatar: string
  description: string
  tags: string[]
  rating: number
  usageCount: number
  systemPrompt: string
  modelId: string
  categoryId: number | null
  categoryName: string
  isOfficial: boolean
  creatorName: string
  isFavorited: boolean
}

export interface AgentListResult {
  list: AgentItem[]
  total: number
}

export type AgentTab = 'official' | 'mine' | 'favorites'

export interface AgentQuery {
  tab?: AgentTab
  categoryId?: number | null
  search?: string
  tag?: string
  page?: number
  pageSize?: number
}

export interface CreateAgentPayload {
  name: string
  avatar?: string
  description?: string
  tags?: string[]
  systemPrompt?: string
  modelId?: string
  categoryId?: number | null
}

export interface AgentCategoryOption {
  id: number
  name: string
  icon: string
}

/**
 * 双模式开关：VITE_AGENTS_API 为空 → 纯前端 Mock（内置种子数据 + localStorage 持久化）；
 * 配置为如 '/agent-api/v1' → 走本地 Nest 后端（vite 代理转发到 localhost:3000）。
 */
const BASE = (import.meta.env.VITE_AGENTS_API || '').replace(/\/$/, '')
export const AGENTS_REAL_MODE = !!BASE

function currentUsername(): string {
  try {
    const raw = localStorage.getItem('jiguang_current_username')
    return raw || 'admin'
  } catch {
    return 'admin'
  }
}

/** 记录当前用户名（由 store 在登录态变化时调用），供 X-User 头与 mock 的"我创建的"使用。
 *  传入空值时保留原值——8080 宕机导致取不到用户信息时，身份不漂移，
 *  否则"我创建的"会因创建时与查询时的用户名不一致而查不到。 */
export function setCurrentUsername(name?: string) {
  if (!name) return
  try {
    localStorage.setItem('jiguang_current_username', name)
  } catch {
    /* ignore */
  }
}

async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      'X-User': currentUsername(),
      ...(init?.headers || {}),
    },
    // 后端不可达时 15s 快速失败，避免界面无响应
    signal: AbortSignal.timeout(15000),
  })
  const body = (await res.json().catch(() => null)) as
    | { code?: number; message?: string; data?: T }
    | null
  if (!body) throw new Error('服务器响应异常，请稍后重试')
  if (body.code !== 0) throw new Error(body.message || `请求失败 ${res.status}`)
  return body.data as T
}

export function fetchAgentCategories(): Promise<AgentCategory[]> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockCategories())
  return apiJSON<AgentCategory[]>('/agents/categories')
}

export function fetchHotTags(): Promise<string[]> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockHotTags())
  return apiJSON<string[]>('/agents/hot-tags')
}

export function fetchAgents(query: AgentQuery): Promise<AgentListResult> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockList(query))
  const qs = new URLSearchParams()
  if (query.tab) qs.set('tab', query.tab)
  if (query.categoryId) qs.set('categoryId', String(query.categoryId))
  if (query.search) qs.set('search', query.search)
  if (query.tag) qs.set('tag', query.tag)
  qs.set('page', String(query.page ?? 1))
  qs.set('pageSize', String(query.pageSize ?? 12))
  return apiJSON<AgentListResult>(`/agents?${qs.toString()}`)
}

export function getAgent(id: number): Promise<AgentItem> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockDetail(id))
  return apiJSON<AgentItem>(`/agents/${id}`)
}

export function createAgent(payload: CreateAgentPayload): Promise<AgentItem> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockCreate(payload))
  return apiJSON<AgentItem>('/agents', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateAgent(id: number, payload: Partial<CreateAgentPayload>): Promise<AgentItem> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockUpdate(id, payload))
  return apiJSON<AgentItem>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export function deleteAgent(id: number): Promise<{ ok: boolean }> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockRemove(id))
  return apiJSON<{ ok: boolean }>(`/agents/${id}`, { method: 'DELETE' })
}

export function toggleAgentFavorite(id: number, on: boolean): Promise<{ ok: boolean; isFavorited: boolean }> {
  if (!AGENTS_REAL_MODE) return import('./agents.mock').then((m) => m.mockToggleFavorite(id, on))
  return apiJSON<{ ok: boolean; isFavorited: boolean }>(`/agents/${id}/favorite`, {
    method: on ? 'POST' : 'DELETE',
  })
}
