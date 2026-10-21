import { defineStore } from 'pinia'
import { ref } from 'vue'

/* ------------------------------ 类型 ------------------------------ */

export interface CanvasAsset {
  id: string
  type: 'image' | 'video'
  url: string
  prompt?: string
  source: 'gen' | 'upload'
  createdAt: number
}

/* ------------------------------ 持久化 key（按用户隔离） ------------------------------ */

const ASSET_KEY = 'jiguang_ai_canvas_assets'
const MAX_ASSETS = 80
/** dataURL 超过该长度（字符）不自动入库，避免撑爆 localStorage；手动添加入库时忽略此限 */
const DATAURL_AUTO_LIMIT = 400_000

function currentUser(): string {
  try {
    return localStorage.getItem('jiguang_current_username') || 'admin'
  } catch {
    return 'admin'
  }
}
function assetKey(): string {
  return `${ASSET_KEY}_${currentUser()}`
}
function nowId(): string {
  return `as_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/* ------------------------------ Store ------------------------------ */

export const useCanvasAssetsStore = defineStore('canvas-assets', () => {
  const assets = ref<CanvasAsset[]>([])
  const loaded = ref(false)

  function persist() {
    try {
      localStorage.setItem(assetKey(), JSON.stringify(assets.value))
    } catch {
      /* 存储满等异常忽略 */
    }
  }

  function load() {
    if (loaded.value) return
    loaded.value = true
    try {
      const raw = localStorage.getItem(assetKey())
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          assets.value = parsed.filter((a) => a && typeof a.url === 'string' && typeof a.id === 'string')
        }
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * 自动入库（生成/上传结果调用）。
   * - 去重：同 url 不重复入库
   * - 保护：超长 dataURL 跳过自动入库
   * 返回是否真正入库。
   */
  function addAuto(asset: Omit<CanvasAsset, 'id' | 'createdAt'>): boolean {
    if (!asset.url) return false
    if (assets.value.some((a) => a.url === asset.url)) return false
    if (asset.url.startsWith('data:') && asset.url.length > DATAURL_AUTO_LIMIT) return false
    assets.value.unshift({ ...asset, id: nowId(), createdAt: Date.now() })
    if (assets.value.length > MAX_ASSETS) assets.value = assets.value.slice(0, MAX_ASSETS)
    persist()
    return true
  }

  /** 手动添加入库（忽略大小保护），用于「添加到素材」 */
  function addManual(asset: Omit<CanvasAsset, 'id' | 'createdAt'>): boolean {
    if (!asset.url) return false
    assets.value.unshift({ ...asset, id: nowId(), createdAt: Date.now() })
    if (assets.value.length > MAX_ASSETS) assets.value = assets.value.slice(0, MAX_ASSETS)
    persist()
    return true
  }

  function remove(id: string) {
    const i = assets.value.findIndex((a) => a.id === id)
    if (i >= 0) {
      assets.value.splice(i, 1)
      persist()
    }
  }

  function clear() {
    assets.value = []
    persist()
  }

  return { assets, loaded, load, addAuto, addManual, remove, clear }
})
