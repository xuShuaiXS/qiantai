import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/* ------------------------------ 类型 ------------------------------ */

/** 画布快照节点（与 AiCanvasView 的 cleanSnapshot 输出对齐，避免 store 强依赖 @vue-flow） */
export interface CanvasSnapshotNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface CanvasSnapshotEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface CanvasSnapshot {
  nodes: CanvasSnapshotNode[]
  edges: CanvasSnapshotEdge[]
}

export interface CanvasMeta {
  id: string
  name: string
  updatedAt: number
  /** JSON 序列化的 CanvasSnapshot */
  snapshot: string
}

/* ------------------------------ 持久化 key（按用户隔离） ------------------------------ */

const LIB_KEY = 'jiguang_ai_canvas_lib'
const LEGACY_CANVAS_KEY = 'jiguang_ai_canvas'
const MAX_CANVASES = 30

function currentUser(): string {
  try {
    return localStorage.getItem('jiguang_current_username') || 'admin'
  } catch {
    return 'admin'
  }
}
function libKey(): string {
  return `${LIB_KEY}_${currentUser()}`
}
function legacyCanvasKey(): string {
  return `${LEGACY_CANVAS_KEY}_${currentUser()}`
}
function legacyTitleKey(): string {
  return `${LEGACY_CANVAS_KEY}_${currentUser()}_title`
}

function emptySnapshot(): string {
  return JSON.stringify({ nodes: [], edges: [] } as CanvasSnapshot)
}

function nowId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/* ------------------------------ Store ------------------------------ */

export const useCanvasLibraryStore = defineStore('canvas-library', () => {
  const canvases = ref<CanvasMeta[]>([])
  const activeId = ref<string>('')
  const loaded = ref(false)

  const activeCanvas = computed(() => canvases.value.find((c) => c.id === activeId.value) || null)

  function persist() {
    try {
      localStorage.setItem(libKey(), JSON.stringify(canvases.value))
    } catch {
      /* 存储满等异常忽略 */
    }
  }

  /** 读取画布库；首次进入时把旧的「单画布」数据迁移为一个默认画布 */
  function load() {
    if (loaded.value) return
    loaded.value = true
    let list: CanvasMeta[] = []
    try {
      const raw = localStorage.getItem(libKey())
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) list = parsed.filter((c) => c && typeof c.id === 'string')
      }
    } catch {
      /* ignore */
    }
    if (!list.length) {
      let legacyRaw = ''
      let legacyTitle = '未命名画布'
      try {
        legacyRaw = localStorage.getItem(legacyCanvasKey()) || ''
        legacyTitle = localStorage.getItem(legacyTitleKey()) || legacyTitle
      } catch {
        /* ignore */
      }
      list = [
        {
          id: nowId('cv'),
          name: legacyTitle || '未命名画布',
          updatedAt: Date.now(),
          snapshot: legacyRaw || emptySnapshot(),
        },
      ]
      persist()
    }
    canvases.value = list
    activeId.value = list[0]?.id || ''
  }

  function create(name?: string): string {
    const meta: CanvasMeta = {
      id: nowId('cv'),
      name: (name && name.trim()) || `画布 ${canvases.value.length + 1}`,
      updatedAt: Date.now(),
      snapshot: emptySnapshot(),
    }
    canvases.value.unshift(meta)
    if (canvases.value.length > MAX_CANVASES) canvases.value = canvases.value.slice(0, MAX_CANVASES)
    activeId.value = meta.id
    persist()
    return meta.id
  }

  function switchTo(id: string) {
    if (canvases.value.some((c) => c.id === id)) activeId.value = id
  }

  function rename(id: string, name: string) {
    const c = canvases.value.find((x) => x.id === id)
    if (!c) return
    const next = name.trim()
    if (next) c.name = next
    c.updatedAt = Date.now()
    persist()
  }

  function remove(id: string) {
    const idx = canvases.value.findIndex((c) => c.id === id)
    if (idx < 0) return
    canvases.value.splice(idx, 1)
    if (!canvases.value.length) create()
    else if (activeId.value === id) activeId.value = canvases.value[0]?.id || ''
    persist()
  }

  function duplicate(id: string) {
    const c = canvases.value.find((x) => x.id === id)
    if (!c) return
    const copy: CanvasMeta = {
      id: nowId('cv'),
      name: `${c.name} 副本`,
      updatedAt: Date.now(),
      snapshot: c.snapshot,
    }
    canvases.value.unshift(copy)
    activeId.value = copy.id
    persist()
  }

  /** 覆盖某画布的内容快照（AiCanvasView 自动保存时调用） */
  function saveSnapshot(id: string, snapshot: string) {
    const c = canvases.value.find((x) => x.id === id)
    if (!c) return
    c.snapshot = snapshot
    c.updatedAt = Date.now()
    persist()
  }

  return {
    canvases,
    activeId,
    activeCanvas,
    loaded,
    load,
    persist,
    create,
    switchTo,
    rename,
    remove,
    duplicate,
    saveSnapshot,
  }
})
