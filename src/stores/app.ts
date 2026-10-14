import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 全局应用状态（后续对话页可扩展） */
export const useAppStore = defineStore('app', () => {
  const title = ref(import.meta.env.VITE_APP_TITLE || '极光AI')

  return { title }
})
