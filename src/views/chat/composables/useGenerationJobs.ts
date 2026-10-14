import { reactive } from 'vue'

export type JobStatus = 'running' | 'done' | 'error' | 'stopped'

export interface GenerationJob {
  sessionId: number
  assistantMsgId: number
  abortCtrl: AbortController
  kind: 'chat' | 'image'
  status: JobStatus
}

export type SessionBadge = 'generating' | 'failed' | 'unread'

/** 按会话管理生成任务，支持多会话并行、单会话只跑一路 */
export function useGenerationJobs() {
  const jobs = reactive(new Map<number, GenerationJob>())
  const unreadDone = reactive(new Set<number>())
  const failedIds = reactive(new Set<number>())

  function getJob(sessionId: number) {
    return jobs.get(sessionId)
  }

  function isRunning(sessionId: number | null | undefined) {
    if (sessionId == null) return false
    return jobs.get(sessionId)?.status === 'running'
  }

  function startJob(sessionId: number, assistantMsgId: number, kind: 'chat' | 'image') {
    const prev = jobs.get(sessionId)
    if (prev?.status === 'running') {
      prev.abortCtrl.abort()
    }
    const abortCtrl = new AbortController()
    const job: GenerationJob = {
      sessionId,
      assistantMsgId,
      abortCtrl,
      kind,
      status: 'running',
    }
    jobs.set(sessionId, job)
    failedIds.delete(sessionId)
    unreadDone.delete(sessionId)
    return job
  }

  /** @returns 是否确实中止了运行中的任务 */
  function stopJob(sessionId: number) {
    const job = jobs.get(sessionId)
    if (!job || job.status !== 'running') return false
    job.abortCtrl.abort()
    job.status = 'stopped'
    jobs.delete(sessionId)
    return true
  }

  function finishJob(
    sessionId: number,
    status: 'done' | 'error' | 'stopped',
    opts?: { markUnread?: boolean },
  ) {
    const job = jobs.get(sessionId)
    if (job) job.status = status
    jobs.delete(sessionId)
    if (status === 'error') failedIds.add(sessionId)
    else failedIds.delete(sessionId)
    if (status === 'done' && opts?.markUnread) unreadDone.add(sessionId)
  }

  function clearUnread(sessionId: number) {
    unreadDone.delete(sessionId)
  }

  function clearFailed(sessionId: number) {
    failedIds.delete(sessionId)
  }

  function sessionBadge(sessionId: number): SessionBadge | null {
    if (jobs.get(sessionId)?.status === 'running') return 'generating'
    if (failedIds.has(sessionId)) return 'failed'
    if (unreadDone.has(sessionId)) return 'unread'
    return null
  }

  /** 侧栏用：sessionId → badge */
  function badgeMap(): Record<number, SessionBadge> {
    const out: Record<number, SessionBadge> = {}
    for (const [id, job] of jobs) {
      if (job.status === 'running') out[id] = 'generating'
    }
    for (const id of failedIds) {
      if (!out[id]) out[id] = 'failed'
    }
    for (const id of unreadDone) {
      if (!out[id]) out[id] = 'unread'
    }
    return out
  }

  function stopAll() {
    for (const [, job] of jobs) {
      if (job.status === 'running') job.abortCtrl.abort()
    }
    jobs.clear()
  }

  return {
    jobs,
    getJob,
    isRunning,
    startJob,
    stopJob,
    finishJob,
    clearUnread,
    clearFailed,
    sessionBadge,
    badgeMap,
    stopAll,
  }
}
