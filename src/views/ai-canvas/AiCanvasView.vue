<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  VueFlow,
  useVueFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'

import { useAiCanvasStore } from '@/stores/aiCanvas'
import { useImageGenerationStore } from '@/stores/imageGeneration'
import { useMessage } from '@/composables/useMessage'
import TextNode from './nodes/TextNode.vue'
import ImageNode from './nodes/ImageNode.vue'
import ImageGenNode from './nodes/ImageGenNode.vue'
import VideoGenNode from './nodes/VideoGenNode.vue'
import InspirationPanel from './InspirationPanel.vue'
import CanvasContextMenu from './components/CanvasContextMenu.vue'
import CanvasManagerPanel from './components/CanvasManagerPanel.vue'
import AssetLibraryPanel from './components/AssetLibraryPanel.vue'
import CanvasQuickAdd from './components/CanvasQuickAdd.vue'
import { useCanvasLibraryStore } from '@/stores/canvasLibrary'
import { useCanvasAssetsStore } from '@/stores/canvasAssets'

const FLOW_ID = 'ai-canvas'
const store = useAiCanvasStore()
const imageStore = useImageGenerationStore()
const message = useMessage()
const lib = useCanvasLibraryStore()
const assetsStore = useCanvasAssetsStore()

const {
  nodes,
  edges,
  addNodes,
  addEdges,
  setNodes,
  setEdges,
  fitView,
  zoomTo,
  removeNodes,
  viewport,
} = useVueFlow(FLOW_ID)

/* ------------------------------ 工具函数 ------------------------------ */

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq}`
}

/** 新节点落在当前视口中心附近（带随机抖动，避免完全重叠） */
function centerPos(w = 320, h = 220) {
  const vp = viewport.value || { x: 0, y: 0, zoom: 1 }
  const el = document.querySelector<HTMLElement>('.canvas-flow')
  const rect = el?.getBoundingClientRect()
  const vw = rect?.width || 1200
  const vh = rect?.height || 700
  const jitter = () => (Math.random() - 0.5) * 90
  return {
    x: (vw / 2 - vp.x) / vp.zoom - w / 2 + jitter(),
    y: (vh / 2 - vp.y) / vp.zoom - h / 2 + jitter(),
  }
}

/* ------------------------------ 撤销 / 重做 ------------------------------ */

const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])

function cleanSnapshot(): string {
  return JSON.stringify({
    nodes: nodes.value.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data,
    })),
    edges: edges.value.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  })
}

function pushHistory() {
  undoStack.value.push(cleanSnapshot())
  if (undoStack.value.length > 50) undoStack.value.shift()
  redoStack.value = []
}

function applySnapshot(json: string) {
  try {
    const parsed = JSON.parse(json)
    setNodes((parsed.nodes || []) as Node[])
    setEdges((parsed.edges || []) as Edge[])
  } catch {
    /* ignore */
  }
}

function undo() {
  if (!undoStack.value.length) return
  redoStack.value.push(cleanSnapshot())
  applySnapshot(undoStack.value.pop() as string)
}

function redo() {
  if (!redoStack.value.length) return
  undoStack.value.push(cleanSnapshot())
  applySnapshot(redoStack.value.pop() as string)
}

const canUndo = computed(() => undoStack.value.length > 0)
const canRedo = computed(() => redoStack.value.length > 0)

/* ------------------------------ 添加节点 ------------------------------ */

function addTextNode(pos?: { x: number; y: number }) {
  pushHistory()
  addNodes({ id: nextId('text'), type: 'text', position: pos || centerPos(250, 200), data: { prompt: '' } })
}

function addImageGenNode(pos?: { x: number; y: number }) {
  pushHistory()
  addNodes({
    id: nextId('imageGen'),
    type: 'imageGen',
    position: pos || centerPos(),
    data: {
      model: imageStore.models[0]?.value || '',
      size: '1024x1024',
      status: 'idle',
      imageUrl: '',
      error: '',
    },
  })
}

function addVideoGenNode(pos?: { x: number; y: number }) {
  pushHistory()
  addNodes({
    id: nextId('videoGen'),
    type: 'videoGen',
    position: pos || centerPos(),
    data: {
      model: '',
      prompt: '',
      ratio: '16:9',
      resolution: '720p',
      duration: 5,
      status: 'idle',
      videoUrl: '',
      error: '',
    },
  })
}

function addImageNode(imageUrl = '', pos?: { x: number; y: number }) {
  pushHistory()
  addNodes({ id: nextId('image'), type: 'image', position: pos || centerPos(), data: { imageUrl } })
}

/* ------------------------------ 上传 / 粘贴图片 ------------------------------ */

const fileEl = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileEl.value?.click()
}

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  for (const f of Array.from(input.files || [])) readImageFile(f)
  input.value = ''
}

function readImageFile(f: File) {
  if (!f.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const url = String(reader.result || '')
    if (url) {
      addImageNode(url)
      assetsStore.addAuto({ type: 'image', url, source: 'upload' })
    }
  }
  reader.readAsDataURL(f)
}

/* ------------------------------ 复制 / 粘贴节点 ------------------------------ */

/** 剪贴板节点（支持多选批量复制） */
let clipNodes: { type: string; position: { x: number; y: number }; data: Record<string, unknown> }[] = []
/** 剪贴板是否已有节点（右键菜单「粘贴」可用性） */
const hasClip = ref(false)

function copySelected() {
  const ids = selectedIds()
  if (!ids.length) return
  clipNodes = []
  for (const id of ids) {
    const n = nodes.value.find((x) => x.id === id)
    if (n && n.type) {
      clipNodes.push({
        type: n.type as string,
        position: { ...n.position },
        data: JSON.parse(JSON.stringify(n.data || {})),
      })
    }
  }
  if (clipNodes.length) hasClip.value = true
}

function pasteNode() {
  if (!clipNodes.length) {
    message.info('剪贴板是空的，先 Ctrl+C 复制节点')
    return
  }
  pushHistory()
  const newIds: string[] = []
  clipNodes.forEach((c, i) => {
    const id = nextId(c.type)
    addNodes({
      id,
      type: c.type,
      position: { x: c.position.x + 56 + i * 24, y: c.position.y + 56 + i * 24 },
      data: JSON.parse(JSON.stringify(c.data)),
    })
    newIds.push(id)
  })
  store.setSelected(newIds[newIds.length - 1] || '')
}

/* ------------------------------ 删除选中节点 ------------------------------ */

function deleteSelected() {
  const ids = selectedIds()
  if (!ids.length) return
  pushHistory()
  removeNodes(ids)
  store.setSelected('')
}

/* ------------------------------ 快捷键 ------------------------------ */

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

function onKeydown(e: KeyboardEvent) {
  if (isTyping(e.target)) return
  if (e.key === 'Escape') {
    closeMenus()
    closeCtx()
    return
  }
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  } else if (mod && e.key.toLowerCase() === 'c') {
    copySelected()
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedNodeId) {
      e.preventDefault()
      deleteSelected()
    }
  }
}

function onWindowPaste(e: ClipboardEvent) {
  if (isTyping(e.target)) return
  const items = e.clipboardData?.items
  if (items) {
    for (const it of Array.from(items)) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) {
          readImageFile(f)
          e.preventDefault()
          return
        }
      }
    }
  }
  if (clipNodes.length) {
    pasteNode()
    e.preventDefault()
  }
}

/* ------------------------------ 连线 / 选中 ------------------------------ */

function onConnect(conn: Connection) {
  addEdges({ ...conn })
  pushHistory()
}

function onNodeClick(e: NodeMouseEvent) {
  store.setSelected(e.node.id)
}

/* ------------------------------ 左侧工具栏菜单 ------------------------------ */

const menuOpen = ref(false)
const subOpen = ref(false)
const panelOpen = ref(false)

function closeMenus() {
  menuOpen.value = false
  subOpen.value = false
}

function openSoon() {
  closeMenus()
  message.info('该功能正在开发中，敬请期待')
}

function clearCanvas() {
  if (!window.confirm('确定清空画布？此操作不可撤销')) return
  pushHistory()
  setNodes([])
  setEdges([])
  closeMenus()
  persist()
}

function newCanvas() {
  lib.create()
  loadCanvas(lib.activeId)
}

/** 切换到指定画布：重置历史，从库快照恢复（空快照则清空为空白画布） */
function loadCanvas(id: string) {
  lib.switchTo(id)
  undoStack.value = []
  redoStack.value = []
  titleDraft.value = lib.activeCanvas?.name || '未命名画布'
  restore()
}

/* ------------------------------ 画布右键菜单 ------------------------------ */

const rootEl = ref<HTMLElement | null>(null)
const ctxMenu = ref<{ x: number; y: number; nodeId: string } | null>(null)

const MENU_W = 224
const MENU_H_PANE = 330
const MENU_H_NODE = 418

function closeCtx() {
  ctxMenu.value = null
  managerOpen.value = false
  assetOpen.value = false
  quickAdd.value = null
}

function onRootClick() {
  closeMenus()
  closeCtx()
}

/** 画布区域右键：空白处为通用菜单，节点上额外给复制/删除 */
function onCanvasContextMenu(e: MouseEvent) {
  e.preventDefault()
  const root = rootEl.value
  if (!root) return
  const rect = root.getBoundingClientRect()
  const nodeEl = (e.target as HTMLElement | null)?.closest('.vue-flow__node') as HTMLElement | null
  const nodeId = nodeEl?.getAttribute('data-id') || ''
  store.setSelected(nodeId)
  const maxH = nodeId ? MENU_H_NODE : MENU_H_PANE
  ctxMenu.value = {
    x: Math.max(8, Math.min(e.clientX - rect.left, rect.width - MENU_W - 10)),
    y: Math.max(8, Math.min(e.clientY - rect.top, rect.height - maxH - 10)),
    nodeId,
  }
  managerOpen.value = false
  assetOpen.value = false
  quickAdd.value = null
  closeMenus()
}

function ctxAddNode(type: string) {
  if (type === 'text') addTextNode()
  else if (type === 'imageGen') addImageGenNode()
  else if (type === 'videoGen') addVideoGenNode()
  else openSoon()
}

/* ------------------------------ 多选 / 画布管理 / 素材库 / 双击添加 ------------------------------ */

/** 当前多选集合：Vue Flow 原生 Ctrl/⌘+点击 多选；无多选则回退到单选 */
function selectedIds(): string[] {
  const ids = nodes.value.filter((n) => n.selected).map((n) => n.id)
  if (ids.length) return ids
  return store.selectedNodeId ? [store.selectedNodeId] : []
}

const managerOpen = ref(false)
const assetOpen = ref(false)
const quickAdd = ref<{ x: number; y: number; fx: number; fy: number } | null>(null)

function miniNodeColor(n: Node): string {
  if (n.type === 'text') return '#7c5cff'
  if (n.type === 'imageGen') return '#2f6bff'
  if (n.type === 'videoGen') return '#ec4899'
  return '#3a3a44'
}

function openAssets() {
  closeMenus()
  closeCtx()
  quickAdd.value = null
  panelOpen.value = false
  assetOpen.value = true
}

function onManagerSwitch(id: string) {
  loadCanvas(id)
}
function onManagerCreate(id: string) {
  loadCanvas(id)
}
function onAssetAddImage(url: string) {
  addImageNode(url)
  assetOpen.value = false
}

/** 双击空白处：在鼠标位置弹出「添加节点」 */
function onCanvasDblClick(e: MouseEvent) {
  const t = e.target as HTMLElement | null
  if (t?.closest('.vue-flow__node') || t?.closest('.vue-flow__edge')) return
  const el = document.querySelector<HTMLElement>('.canvas-flow')
  const rect = el?.getBoundingClientRect()
  if (!rect) return
  const vp = viewport.value || { x: 0, y: 0, zoom: 1 }
  const rx = e.clientX - rect.left
  const ry = e.clientY - rect.top
  quickAdd.value = {
    x: rx,
    y: ry,
    fx: (rx - vp.x) / vp.zoom,
    fy: (ry - vp.y) / vp.zoom,
  }
  managerOpen.value = false
  assetOpen.value = false
  closeMenus()
}

function quickAddNode(type: string) {
  const q = quickAdd.value
  quickAdd.value = null
  if (type === 'text') addTextNode(q ? { x: q.fx - 125, y: q.fy - 100 } : undefined)
  else if (type === 'imageGen') addImageGenNode(q ? { x: q.fx - 150, y: q.fy - 105 } : undefined)
  else if (type === 'videoGen') addVideoGenNode(q ? { x: q.fx - 150, y: q.fy - 105 } : undefined)
}

/* ------------------------------ 缩放 ------------------------------ */

const zoomPct = ref(100)

function onMove(e: { flowTransform?: { zoom?: number } }) {
  const z = e?.flowTransform?.zoom
  if (typeof z === 'number') zoomPct.value = Math.round(z * 100)
}

function onZoomSlider(e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 100
  if (v > 0) zoomTo(v, { duration: 120 })
}

/* ------------------------------ 标题 / 持久化 ------------------------------ */

const titleDraft = ref('未命名画布')
const savedAt = ref('')

let titleTimer: number | undefined
watch(titleDraft, () => {
  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = window.setTimeout(() => {
    lib.rename(lib.activeId, titleDraft.value)
  }, 400)
})

let saveTimer: number | undefined
watch(
  [nodes, edges],
  () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = window.setTimeout(persist, 400)
  },
  { deep: true },
)

function persist() {
  lib.saveSnapshot(lib.activeId, cleanSnapshot())
  const d = new Date()
  savedAt.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function saveNow() {
  persist()
  message.success('已保存到本地')
}

/* ------------------------------ 旧数据迁移 ------------------------------ */

function migrateType(t?: string): string {
  if (t === 'prompt') return 'text'
  if (t === 'result') return 'image'
  return t || 'image'
}

function fallbackLabel(type: string): string {
  if (type === 'text') return '文本'
  if (type === 'videoGen') return '视频'
  return '图像'
}

function restore(): boolean {
  const raw = lib.activeCanvas?.snapshot || ''
  if (!raw) return false
  try {
    const parsed = JSON.parse(raw)
    const arr = Array.isArray(parsed?.nodes) ? (parsed.nodes as Node[]) : null
    if (!arr) return false
    const list = arr.map((n) => {
      const type = migrateType(n.type)
      return {
        ...n,
        type,
        data: { ...(n.data || {}), label: (n.data as Record<string, unknown>)?.label || fallbackLabel(type) },
      }
    })
    setNodes(list as Node[])
    setEdges(((parsed.edges || []) as Edge[]).map((e) => ({ ...e, sourceHandle: undefined, targetHandle: undefined })))
    nextTick(() => fitView({ padding: 0.25 }))
    return list.length > 0
  } catch {
    /* 解析失败返回 false，由调用方决定是否给默认示例 */
    return false
  }
}

/* ------------------------------ 默认示例 ------------------------------ */

function seedDefault() {
  const t: Node = {
    id: nextId('text'),
    type: 'text',
    position: { x: 40, y: 150 },
    data: {
      prompt: '一只戴着圣诞帽的橘猫趴在飘雪的窗台上，暖色灯光，高清摄影质感',
      label: '圣诞夜文案',
    },
  }
  const g: Node = {
    id: nextId('imageGen'),
    type: 'imageGen',
    position: { x: 400, y: 120 },
    data: {
      model: imageStore.models[0]?.value || '',
      size: '1024x1024',
      status: 'idle',
      imageUrl: '',
      error: '',
      label: '图生图·戴圣诞帽',
    },
  }
  const r: Node = {
    id: nextId('image'),
    type: 'image',
    position: { x: 800, y: 130 },
    data: { imageUrl: '', label: '结果图' },
  }
  const v: Node = {
    id: nextId('videoGen'),
    type: 'videoGen',
    position: { x: 800, y: 430 },
    data: {
      model: '',
      prompt: '',
      ratio: '16:9',
      resolution: '720p',
      duration: 5,
      status: 'idle',
      videoUrl: '',
      error: '',
      label: '图生视频',
    },
  }
  setNodes([t, g, r, v])
  setEdges([
    { id: nextId('e'), source: t.id, target: g.id },
    { id: nextId('e'), source: g.id, target: r.id },
    { id: nextId('e'), source: g.id, target: v.id },
  ])
  nextTick(() => fitView({ padding: 0.25 }))
}

/* ------------------------------ 生命周期 ------------------------------ */

onMounted(() => {
  imageStore.fetchModels()
  lib.load()
  assetsStore.load()
  titleDraft.value = lib.activeCanvas?.name || '未命名画布'
  if (!restore()) seedDefault()
  const vp = viewport.value
  if (vp) zoomPct.value = Math.round(vp.zoom * 100)
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('paste', onWindowPaste)
  window.addEventListener('click', closeCtx)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('paste', onWindowPaste)
  window.removeEventListener('click', closeCtx)
})
</script>

<template>
  <div ref="rootEl" class="acv" @click="onRootClick" @dblclick="onCanvasDblClick">
    <input ref="fileEl" type="file" accept="image/*" multiple hidden @change="onFiles" />

    <!-- 顶栏 -->
    <header class="acv-top" @click.stop>
      <div class="acv-brand">
        <span class="acv-logo">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2.5 13.9 9 20.5 11 13.9 13 12 19.5 10.1 13 3.5 11 10.1 9z" />
            <path d="M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8z" />
          </svg>
        </span>
        <input
          v-model="titleDraft"
          class="acv-title"
          placeholder="未命名画布"
          :style="{ width: Math.max(80, (titleDraft || '未命名画布').length * 15 + 22) + 'px' }"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
      </div>
      <div class="acv-actions">
        <span class="acv-saved">已自动保存{{ savedAt ? ` ${savedAt}` : '' }}</span>
        <button class="acv-pill" type="button" :class="{ 'is-active': managerOpen }" title="切换 / 管理画布" @click.stop="managerOpen = !managerOpen; assetOpen = false">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          </svg>
          画布
        </button>
        <button class="acv-pill" type="button" :class="{ 'is-active': assetOpen }" title="素材库" @click.stop="assetOpen = !assetOpen; managerOpen = false">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="m5 18 4.5-5 3.5 4 3-3 3 4" />
          </svg>
          素材
        </button>
        <button class="acv-pill" type="button" @click.stop="saveNow">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
          保存
        </button>
        <button class="acv-pill acv-pill--hi" type="button" @click.stop="newCanvas">+ 新建</button>
        <button class="acv-theme" type="button" title="主题" @click.stop="message.info('浅色主题即将上线')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 左侧悬浮工具栏 -->
    <aside class="acv-bar" @click.stop>
      <button class="acv-plus" type="button" :class="{ 'is-open': menuOpen }" title="添加" @click.stop="menuOpen = !menuOpen; subOpen = false">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button class="acv-tb" type="button" title="灵感画板" @click.stop="panelOpen = !panelOpen">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
        </svg>
      </button>
      <button class="acv-tb" type="button" title="上传图片" @click.stop="triggerUpload">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m5 18 4.5-5 3.5 4 3-3 3 4" />
        </svg>
      </button>
      <button class="acv-tb" type="button" title="素材库" :class="{ 'is-on': assetOpen }" @click.stop="assetOpen = !assetOpen; managerOpen = false">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
        </svg>
      </button>
      <button class="acv-tb" type="button" title="撤销" :disabled="!canUndo" @click.stop="undo">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 8h9a6 6 0 0 1 0 12h-3" />
          <path d="M7 4 3 8l4 4" />
        </svg>
      </button>
      <button class="acv-tb" type="button" title="适应视图" @click.stop="fitView({ padding: 0.3, duration: 220 })">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a4.5 4.5 0 0 0-6 5.6L3 17.6V21h3.4l5.7-5.7a4.5 4.5 0 0 0 5.6-6l-3 3-2.8-.7-.7-2.8z" />
        </svg>
      </button>
      <span class="acv-bar__sep" />
      <button class="acv-tb acv-tb--danger" type="button" title="清空画布" @click.stop="clearCanvas">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
        </svg>
      </button>
    </aside>

    <!-- “+”菜单 -->
    <div v-if="menuOpen" class="acv-menu" @click.stop>
      <button class="acv-menu__item" type="button" @click="triggerUpload">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
        </span>
        上传
      </button>
      <button class="acv-menu__item" type="button" @click="openAssets">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 2 9 5-9 5-9-5z" />
            <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
          </svg>
        </span>
        添加素材
      </button>
      <button
        class="acv-menu__item"
        type="button"
        @click="subOpen = !subOpen"
        @mouseenter="subOpen = true"
      >
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        添加节点
        <span class="chev">›</span>
      </button>
      <div class="acv-menu__sep" />
      <button class="acv-menu__item" type="button" :disabled="!canUndo" @click="undo(); closeMenus()">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8h9a6 6 0 0 1 0 12h-3" />
            <path d="M7 4 3 8l4 4" />
          </svg>
        </span>
        撤销
        <span class="kbd">Ctrl Z</span>
      </button>
      <button class="acv-menu__item" type="button" :disabled="!canRedo" @click="redo(); closeMenus()">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 8h-9a6 6 0 0 0 0 12h3" />
            <path d="m17 4 4 4-4 4" />
          </svg>
        </span>
        重做
        <span class="kbd">⇧ Ctrl Z</span>
      </button>
      <button class="acv-menu__item" type="button" @click="pasteNode(); closeMenus()">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="2" width="8" height="4" rx="1" />
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          </svg>
        </span>
        粘贴
        <span class="kbd">Ctrl V</span>
      </button>

      <!-- 添加节点 子菜单 -->
      <div v-if="subOpen" class="acv-menu acv-menu--sub">
        <p class="acv-menu__head">添加节点</p>
        <button class="acv-menu__item" type="button" @click="addTextNode(); closeMenus()">
          <span class="ic">T</span>
          文本
        </button>
        <button class="acv-menu__item" type="button" @click="addImageGenNode(); closeMenus()">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m5 18 4.5-5 3.5 4 3-3 3 4" />
            </svg>
          </span>
          <span class="mi-title">图像<small>宣传图、海报、封面</small></span>
        </button>
        <button class="acv-menu__item" type="button" @click="addVideoGenNode(); closeMenus()">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m10 9.5 5 2.5-5 2.5z" />
            </svg>
          </span>
          视频
        </button>
        <button class="acv-menu__item" type="button" @click="openSoon">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </span>
          图像编辑器
        </button>
        <button class="acv-menu__item" type="button" @click="openSoon">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
              <path d="M7 4v16M17 4v16M2.5 9.5h4.5M17 9.5h4.5M2.5 14.5h4.5M17 14.5h4.5" />
            </svg>
          </span>
          视频编辑器
        </button>
        <div class="acv-menu__sep" />
        <p class="acv-menu__head">本地模型（开发）</p>
        <button class="acv-menu__item" type="button" disabled>
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="m8 7 2-3h4l2 3M8 13h8" />
            </svg>
          </span>
          <span class="mi-title">本地图像模型<small>使用下载的开源模型</small></span>
          <svg class="lock" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 画布 -->
    <VueFlow
      :id="FLOW_ID"
      class="canvas-flow"
      :min-zoom="0.2"
      :max-zoom="3"
      :delete-key-code="null"
      @contextmenu.prevent="onCanvasContextMenu"
      @connect="onConnect"
      @node-click="onNodeClick"
      @pane-click="store.setSelected('')"
      @move="onMove"
      @move-end="onMove"
    >
      <Background :gap="22" :size="1.6" pattern-color="rgba(255,255,255,0.10)" />
      <MiniMap
        :node-color="miniNodeColor"
        :node-stroke-color="'rgba(255,255,255,0.16)'"
        :node-stroke-width="1.5"
        :node-border-radius="6"
        mask-color="rgba(8,8,10,0.72)"
        pannable
        zoomable
        style="position:absolute; right:16px; bottom:78px; z-index:15; border-radius:10px; overflow:hidden;"
      />

      <template #node-text="props">
        <TextNode v-bind="props" />
      </template>
      <template #node-image="props">
        <ImageNode v-bind="props" />
      </template>
      <template #node-imageGen="props">
        <ImageGenNode v-bind="props" />
      </template>
      <template #node-videoGen="props">
        <VideoGenNode v-bind="props" />
      </template>
    </VueFlow>

    <!-- 缩放 -->
    <div class="acv-zoom" @click.stop>
      <span>Zoom</span>
      <input
        type="range"
        min="25"
        max="250"
        :value="zoomPct"
        @input="onZoomSlider"
      />
      <b>{{ zoomPct }}%</b>
    </div>

    <!-- AI 灵感按钮 -->
    <button
      class="acv-fab"
      type="button"
      title="灵感画板"
      :class="{ 'is-active': panelOpen }"
      @click.stop="panelOpen = !panelOpen"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 2.5 13.9 9 20.5 11 13.9 13 12 19.5 10.1 13 3.5 11 10.1 9z" />
        <path d="M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8z" />
      </svg>
    </button>

    <InspirationPanel v-if="panelOpen" @close="panelOpen = false" />

    <!-- 画布右键菜单 -->
    <CanvasContextMenu
      v-if="ctxMenu"
      :x="ctxMenu.x"
      :y="ctxMenu.y"
      :node-id="ctxMenu.nodeId"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :has-clipboard="hasClip"
      @close="closeCtx"
      @upload="triggerUpload"
      @materials="openAssets"
      @add-node="ctxAddNode"
      @undo="undo"
      @redo="redo"
      @paste="pasteNode"
      @copy="copySelected"
      @delete="deleteSelected"
    />

    <CanvasManagerPanel
      v-if="managerOpen"
      @switched="onManagerSwitch"
      @created="onManagerCreate"
      @close="managerOpen = false"
    />
    <AssetLibraryPanel v-if="assetOpen" @add-image="onAssetAddImage" @close="assetOpen = false" />
    <CanvasQuickAdd
      v-if="quickAdd"
      :x="quickAdd.x"
      :y="quickAdd.y"
      @add="quickAddNode"
      @close="quickAdd = null"
    />
  </div>
</template>

<style scoped>
.acv {
  position: relative;
  height: 100%;
  width: 100%;
  min-height: 0;
  background: #0a0a0d;
  color: #ececf1;
  overflow: hidden;
  font-size: 13px;
}

/* ------------------------------ 顶栏 ------------------------------ */
.acv-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  pointer-events: none;
}
.acv-top > * {
  pointer-events: auto;
}
.acv-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.acv-logo {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c5cff, #a855f7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(124, 92, 255, 0.35);
  flex: 0 0 auto;
}
.acv-title {
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #f2f2f6;
  font-size: 14px;
  font-weight: 700;
  padding: 4px 8px;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.acv-title:hover {
  border-color: rgba(255, 255, 255, 0.12);
}
.acv-title:focus {
  border-color: #2f6bff;
  background: #141418;
}
.acv-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.acv-saved {
  color: #7c7c86;
  font-size: 12px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}
.acv-pill {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1d1d22;
  color: #ececf1;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}
.acv-pill:hover {
  background: #26262c;
}
.acv-pill.is-active {
  background: rgba(47, 107, 255, 0.18);
  border-color: rgba(47, 107, 255, 0.5);
  color: #a9c4ff;
}
.acv-tb.is-on {
  background: rgba(47, 107, 255, 0.16);
  color: #a9c4ff;
}
.acv-pill--hi {
  background: #2b2b32;
}
.acv-pill--hi:hover {
  background: #34343c;
}
.acv-theme {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #1d1d22;
  color: #f5d90a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}
.acv-theme:hover {
  background: #26262c;
}

/* ------------------------------ 左侧工具栏（垂直居中） ------------------------------ */
.acv-bar {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  width: 52px;
  padding: 8px 6px;
  border-radius: 16px;
  background: #1a1a1f;
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
.acv-plus {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fff;
  color: #0a0a0d;
  border: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-bottom: 4px;
  transition: transform 0.18s ease;
}
.acv-plus.is-open {
  transform: rotate(45deg);
}
.acv-tb {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  border: 0;
  color: #b9b9c2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.acv-tb:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.acv-tb:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.acv-tb--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}
.acv-bar__sep {
  width: 26px;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

/* ------------------------------ “+”菜单 ------------------------------ */
.acv-menu {
  position: absolute;
  left: 76px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 40;
  width: 224px;
  padding: 8px;
  border-radius: 14px;
  background: #1f1f24;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.acv-menu--sub {
  left: calc(100% + 8px);
  top: 88px;
  transform: none;
  width: 236px;
}
.acv-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 8px;
  border-radius: 10px;
  background: transparent;
  border: 0;
  color: #e8e8ee;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s ease;
}
.acv-menu__item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.07);
}
.acv-menu__item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ic {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #2a2a31;
  color: #dcdce4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 700;
}
.kbd {
  margin-left: auto;
  color: #6b6b75;
  font-size: 11px;
  white-space: nowrap;
}
.chev {
  margin-left: auto;
  color: #8a8a93;
  font-size: 16px;
  line-height: 1;
}
.lock {
  margin-left: auto;
  color: #8a8a93;
  flex: 0 0 auto;
}
.mi-title {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}
.mi-title small {
  color: #8a8a93;
  font-size: 11px;
}
.acv-menu__sep {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 4px;
}
.acv-menu__head {
  margin: 2px 8px 6px;
  font-size: 11.5px;
  color: #8a8a93;
}

/* ------------------------------ 画布 ------------------------------ */
.canvas-flow {
  position: absolute;
  inset: 0;
  background: #0a0a0d;
}
.canvas-flow :deep(.vue-flow__node) {
  background: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
  width: auto;
}
.canvas-flow :deep(.vue-flow__edge-path) {
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 1.5;
}
.canvas-flow :deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: #2f6bff;
}
.canvas-flow :deep(.vue-flow__connection-path) {
  stroke: rgba(255, 255, 255, 0.4);
  stroke-width: 1.5;
}
/* 连接点默认隐形（贴近参考站），悬停时淡淡提示 */
.canvas-flow :deep(.vue-flow__handle) {
  width: 13px;
  height: 13px;
  background: transparent;
  border: 0;
  opacity: 0;
  transition: opacity 0.12s ease;
}
.canvas-flow :deep(.vue-flow__handle:hover) {
  opacity: 0.6;
  background: #2f6bff;
  border-radius: 50%;
}

/* ------------------------------ 缩放 ------------------------------ */
.acv-zoom {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 999px;
  background: #1a1a1f;
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #cfcfd6;
  font-size: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}
.acv-zoom input[type='range'] {
  width: 110px;
  accent-color: #2f6bff;
}
.acv-zoom b {
  font-weight: 600;
  color: #ececf1;
  min-width: 42px;
  text-align: right;
}

/* ------------------------------ AI 按钮 ------------------------------ */
.acv-fab {
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 30;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  border: 0;
  background: linear-gradient(135deg, #2f6bff, #2456d8);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 12px 30px rgba(47, 107, 255, 0.4);
  transition: filter 0.15s ease;
}
.acv-fab:hover {
  filter: brightness(1.12);
}
.acv-fab.is-active {
  background: linear-gradient(135deg, #2456d8, #1d47b8);
}
</style>
