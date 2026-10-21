import { defineStore } from 'pinia'
import { ref } from 'vue'

/* ------------------------------ 灵感画板对话消息 ------------------------------ */

export interface CanvasChatMessage {
  role: 'user' | 'assistant'
  text: string
  state?: 'thinking' | 'done' | 'error'
}

/* ------------------------------ 持久化 key（按用户隔离） ------------------------------ */

const CANVAS_KEY = 'jiguang_ai_canvas'
const CHAT_KEY = 'jiguang_ai_canvas_chat'

function currentUser(): string {
  try {
    return localStorage.getItem('jiguang_current_username') || 'admin'
  } catch {
    return 'admin'
  }
}

function canvasKey() {
  return `${CANVAS_KEY}_${currentUser()}`
}

function chatKey() {
  return `${CHAT_KEY}_${currentUser()}`
}

export const useAiCanvasStore = defineStore('ai-canvas', () => {
  /** 当前选中的节点 id（灵感画板「应用到节点」写回用） */
  const selectedNodeId = ref<string>('')

  /** 灵感画板对话模型（对话能力模型） */
  const inspirationModel = ref<string>('')

  /** 灵感画板对话消息 */
  const inspirationMessages = ref<CanvasChatMessage[]>([])
  const inspirationLoading = ref(false)
  const inspirationError = ref('')

  function setSelected(id: string) {
    selectedNodeId.value = id
  }

  function loadInspiration() {
    try {
      const raw = localStorage.getItem(chatKey())
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list)) inspirationMessages.value = list
      }
    } catch {
      /* ignore */
    }
  }

  function persistInspiration() {
    try {
      const done = inspirationMessages.value.slice(-100)
      localStorage.setItem(chatKey(), JSON.stringify(done))
    } catch {
      /* 存储满等异常忽略 */
    }
  }

  function resetInspiration() {
    inspirationMessages.value = []
    try {
      localStorage.removeItem(chatKey())
    } catch {
      /* ignore */
    }
  }

  return {
    selectedNodeId,
    setSelected,
    inspirationModel,
    inspirationMessages,
    inspirationLoading,
    inspirationError,
    loadInspiration,
    persistInspiration,
    resetInspiration,
  }
})
