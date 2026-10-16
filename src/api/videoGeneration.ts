/** 视频生成 API（网关 /videos 异步任务协议） */
import { getToken } from './auth'

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export interface VideoModelOption {
  value: string
  label: string
  desc: string
}

export interface VideoTask {
  id: number
  modelId: string
  prompt: string
  status: 'running' | 'done' | 'failed'
  videoUrl: string
  duration: number
  resolution: string
  ratio: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers || {}),
    },
  })
  const body = (await res.json().catch(() => null)) as
    | { code?: number; message?: string; data?: T }
    | null
  if (!body) throw new Error('服务器响应异常，请稍后重试')
  if (body.code !== 0) throw new Error(body.message || `请求失败 ${res.status}`)
  return body.data as T
}

/** 视频生成模型（capability=video） */
export async function fetchVideoModels(): Promise<VideoModelOption[]> {
  const list = await apiJSON<{ modelId: string; name: string; providerName: string; providerCode: string }[]>(
    '/chat/models?scene=video',
  )
  return list.map((m) => ({
    value: m.modelId,
    label: m.name,
    desc: `${m.providerName} · ${m.providerCode}`,
  }))
}

export function createVideoTask(data: {
  model: string
  prompt: string
  resolution?: string
  ratio?: string
  duration?: number
}) {
  return apiJSON<VideoTask>('/chat/media/generations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function listVideoTasks(limit = 30) {
  return apiJSON<VideoTask[]>(`/chat/media/tasks?limit=${limit}`)
}

export function getVideoTask(id: number) {
  return apiJSON<VideoTask>(`/chat/media/tasks/${id}`)
}

export function deleteVideoTask(id: number) {
  return apiJSON<{ ok: boolean }>(`/chat/media/tasks/${id}`, { method: 'DELETE' })
}
