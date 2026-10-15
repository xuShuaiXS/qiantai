/**
 * 超级智能体 - 会话本地持久化
 *
 * 为什么存 localStorage 而不是后端：
 *   8080 目前没有会话存储接口；先用本地存储满足"退出再进不丢记录"，
 *   键按 智能体ID + 用户名 隔离，后续接后端时只需把这几个函数换成请求。
 */

export interface SessionMessage {
  role: 'user' | 'assistant'
  content: string
  time: number
}

export interface AgentSession {
  id: string
  agentId: number
  /** 标题取首条用户消息截断，自动生成 */
  title: string
  /** 本会话使用的模型 */
  modelId: string
  messages: SessionMessage[]
  createdAt: number
  updatedAt: number
}

const STORE_KEY = 'jiguang_agent_sessions_v1'
const MAX_SESSIONS_PER_AGENT = 50

function currentUser(): string {
  try {
    return localStorage.getItem('jiguang_current_username') || 'admin'
  } catch {
    return 'admin'
  }
}

interface StoreShape {
  [username: string]: AgentSession[]
}

function readStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoreShape
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: StoreShape) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    /* 存储满等异常忽略：会话是增强能力，不能因写入失败打断对话 */
  }
}

/** 某个智能体下的会话列表（按更新时间倒序） */
export function listSessions(agentId: number): AgentSession[] {
  const store = readStore()
  return (store[currentUser()] || [])
    .filter((s) => s.agentId === agentId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getSession(sessionId: string): AgentSession | null {
  const store = readStore()
  return (store[currentUser()] || []).find((s) => s.id === sessionId) || null
}

function genId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** 新建一个空会话（首条消息发出时标题自动补齐） */
export function createSession(agentId: number, modelId: string): AgentSession {
  const now = Date.now()
  const session: AgentSession = {
    id: genId(),
    agentId,
    title: '新会话',
    modelId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
  const user = currentUser()
  const store = readStore()
  const list = store[user] || (store[user] = [])
  list.unshift(session)
  // 超量清理：只保留每个智能体最近 N 个会话
  const byAgent = list.filter((s) => s.agentId === agentId)
  if (byAgent.length > MAX_SESSIONS_PER_AGENT) {
    const dead = new Set(
      byAgent
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(MAX_SESSIONS_PER_AGENT)
        .map((s) => s.id),
    )
    store[user] = list.filter((s) => !dead.has(s.id))
  }
  writeStore(store)
  return session
}

/** 保存/更新会话（整体覆盖式写回，逻辑最简单） */
export function saveSession(session: AgentSession) {
  const user = currentUser()
  const store = readStore()
  const list = store[user] || (store[user] = [])
  const idx = list.findIndex((s) => s.id === session.id)
  session.updatedAt = Date.now()
  if (idx >= 0) list[idx] = session
  else list.unshift(session)
  writeStore(store)
}

export function deleteSession(sessionId: string) {
  const user = currentUser()
  const store = readStore()
  if (!store[user]) return
  store[user] = store[user].filter((s) => s.id !== sessionId)
  writeStore(store)
}

/** 相对时间显示：刚刚 / n分钟前 / n小时前 / 昨天 / MM-DD */
export function formatSessionTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  const d = new Date(ts)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
