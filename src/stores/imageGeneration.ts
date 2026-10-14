import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import * as imageApi from '@/api/imageGeneration'
import type { ImageTask } from '@/api/imageGeneration'

/* ------------------------------ 选项字典 ------------------------------ */

export interface ImageStyleOption {
  value: string
  label: string
  desc: string
}

export interface ImageEffect {
  value: string
  category: string
  title: string
  emoji: string
  tags: string[]
  /** 效果卡预览图左/右半区的渐变色 */
  before: string
  after: string
  desc: string
  steps: string[]
  hint: string
  example: string
}

export interface ImageModelOption {
  value: string
  label: string
  desc: string
}

export interface ImageSizeOption {
  value: string
  label: string
  width: number
  height: number
}

export interface ImageEffectCategory {
  value: string
  label: string
}

export const IMAGE_STYLES: ImageStyleOption[] = [
  { value: 'cinematic', label: '电影质感', desc: '光影层次丰富，适合主视觉' },
  { value: 'realistic', label: '写实摄影', desc: '自然真实，适合产品与场景' },
  { value: 'illustration', label: '插画创意', desc: '轻盈灵动，适合内容配图' },
  { value: 'minimal', label: '极简设计', desc: '留白清晰，适合品牌物料' },
]

export const IMAGE_EFFECT_CATEGORIES: ImageEffectCategory[] = [
  { value: 'all', label: '全部' },
  { value: 'portrait', label: '人像美化' },
  { value: 'scene', label: '场景优化' },
  { value: 'creative', label: '创意设计' },
  { value: 'style', label: '风格迁移' },
  { value: 'repair', label: '图片修复' },
  { value: 'paint', label: 'AI 绘画' },
]

/** 智能生图效果卡片字典：同一时间仅允许选中一个（form.effect 单选） */
export const IMAGE_EFFECTS: ImageEffect[] = [
  {
    value: 'hair-transform', category: 'portrait', title: '发型变换', emoji: '💇‍♀️',
    tags: ['发型', '换发'], before: '#f3d3d8', after: '#e7b7c4',
    desc: 'AI 智能发型变换，支持多种流行发型一键试戴。',
    steps: ['上传参考图片', '发送描述文字，给图片中的人物换一个满意的发型'],
    hint: '给图片中的人物换一个满意的发型',
    example: '给图片中的人物换一个蓬松的羊毛卷短发，发色深棕，整体自然协调',
  },
  {
    value: 'outfit-swap', category: 'portrait', title: '服装换装', emoji: '👗',
    tags: ['换装', '穿搭'], before: '#f6e3d5', after: '#d9c1e8',
    desc: '为图片里的人物换上一条新裙子的样式，让整体画面焕然日新。',
    steps: ['上传参考图片', '发送描述文字，为图片里的人物换上一条新裙子的样式'],
    hint: '为图片里的人物换上一条新裙子的样式',
    example: '为图片里的人物换上一条白色碎花长裙，材质轻薄，光照与原图保持一致',
  },
  {
    value: 'sky-replace', category: 'scene', title: '天空替换', emoji: '🌤️',
    tags: ['天空', '替换'], before: '#b8c6d4', after: '#8ec9f2',
    desc: '智能识别天空区域，替换为更好的天空效果。',
    steps: ['上传参考图片', '发送描述文字，将图片中的天空替换成蓝天白云的效果'],
    hint: '将图片中的天空替换成蓝天白云的效果',
    example: '将图片中的天空替换成黄昏火烧云效果，云层有层次，与地面光影自然融合',
  },
  {
    value: 'scene-enhance', category: 'scene', title: '画质增强', emoji: '🏞️',
    tags: ['画质', '增强'], before: '#cdd6cf', after: '#a7d8b1',
    desc: '一键优化照片的光线、色彩与细节，让画面更通透。',
    steps: ['上传参考图片', '发送优化诉求，如提升清晰度、增强色彩'],
    hint: '优化这张照片的光线与色彩，让画面更通透清晰',
    example: '提升这张照片的清晰度与色彩饱和度，修正暗部细节，保持自然观感',
  },
  {
    value: 'photo-repair', category: 'repair', title: '老照片修复', emoji: '🖼️',
    tags: ['修复', '高清'], before: '#d8d2c4', after: '#f2e6cf',
    desc: '修复老照片的划痕、噪点与模糊，重现清晰面部细节。',
    steps: ['上传老照片', '发送修复诉求，如上色、去划痕、增强清晰度'],
    hint: '修复这张老照片的划痕与模糊，并为黑白照片自然上色',
    example: '修复这张老照片的划痕与噪点，增强清晰度并自然上色，保持人物原貌',
  },
  {
    value: 'style-transfer', category: 'style', title: '风格迁移', emoji: '🎨',
    tags: ['艺术', '画风'], before: '#c9d8e8', after: '#f0c8a8',
    desc: '将照片转换成油画、水彩、动漫等艺术画风格。',
    steps: ['上传参考图片', '发送目标风格，如油画、水彩、动漫'],
    hint: '把这张照片转换成宫崎骏风格的手绘插画',
    example: '把这张照片转换成水彩画风格，笔触轻盈，保留原图构图与主体特征',
  },
  {
    value: 'creative-expand', category: 'creative', title: '创意扩图', emoji: '✨',
    tags: ['扩图', '延展'], before: '#e3d9c8', after: '#c8e3d9',
    desc: '智能扩展画面边界，补全更广阔的场景与细节。',
    steps: ['上传参考图片', '发送扩图方向，如向两侧延展成全景'],
    hint: '向左右两侧扩展这张图片的边界，补全成完整的全景画面',
    example: '向左右两侧扩展这张图片的边界，风格与光影与原图保持一致，补全成全景',
  },
  {
    value: 'ai-paint', category: 'paint', title: 'AI 绘画', emoji: '🪄',
    tags: ['文生图', '绘画'], before: '#d6d1e8', after: '#f5c6d0',
    desc: '输入一句话描述，从零生成一幅属于你的艺术画作。',
    steps: ['直接输入画面描述', '选择比例与数量，点击立即生成'],
    hint: '描述你想画的画面，例如：月光下的灯塔与翻涌的海浪',
    example: '一座漂浮在云海上的未来城市，清晨金色阳光，电影级构图',
  },
]

export const IMAGE_MODELS: ImageModelOption[] = [
  { value: 'aurora-v1', label: 'Aurora 1.0', desc: '均衡创作模型' },
  { value: 'aurora-pro', label: 'Aurora Pro', desc: '细节增强模型' },
]

export const IMAGE_SIZES: ImageSizeOption[] = [
  { value: '1024x1024', label: '1:1', width: 1024, height: 1024 },
  { value: '1280x832', label: '3:2', width: 1280, height: 832 },
  { value: '832x1280', label: '2:3', width: 832, height: 1280 },
  { value: '1344x768', label: '16:9', width: 1344, height: 768 },
]

/* ------------------------------ 表单 / 查询 ------------------------------ */

export interface ImageGenForm {
  prompt: string
  negativePrompt: string
  effect: string
  style: string
  model: string
  size: string
  count: number
}

export interface ImageGenQuery {
  keyword: string
  status: string
  page: number
  pageSize: number
}

function createForm(): ImageGenForm {
  return {
    prompt: '',
    negativePrompt: '低清晰度、文字、水印、变形、模糊',
    effect: '',
    style: 'cinematic',
    model: 'aurora-v1',
    size: '1024x1024',
    count: 2,
  }
}

function createQuery(): ImageGenQuery {
  return { keyword: '', status: 'all', page: 1, pageSize: 12 }
}

/* ------------------------------ Store ------------------------------ */

export const useImageGenerationStore = defineStore('image-generation', () => {
  const form = reactive<ImageGenForm>(createForm())
  const query = reactive<ImageGenQuery>(createQuery())
  const list = ref<ImageTask[]>([])
  const total = ref(0)
  const loading = ref(false)
  const submitting = ref(false)
  const error = ref<unknown>(null)
  const detail = ref<ImageTask | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<unknown>(null)
  const pollingIds = new Set<string>()
  const pollTimers = new Map<string, number>()

  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / query.pageSize)))
  const generatingCount = computed(() =>
    list.value.filter((item) => ['pending', 'generating'].includes(item.status)).length,
  )

  async function fetchList() {
    loading.value = true
    error.value = null
    try {
      const result = await imageApi.fetchImageTaskList({ ...query })
      list.value = result.list
      total.value = result.total
      result.list.filter((item) => ['pending', 'generating'].includes(item.status)).forEach(startPolling)
    } catch (err) {
      error.value = err
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(id: string) {
    detailLoading.value = true
    detailError.value = null
    try {
      detail.value = await imageApi.fetchImageTaskDetail(id)
      return detail.value
    } catch (err) {
      detailError.value = err
      throw err
    } finally {
      detailLoading.value = false
    }
  }

  async function createTask() {
    if (!form.prompt.trim() || submitting.value) return null
    const size = IMAGE_SIZES.find((item) => item.value === form.size)
    submitting.value = true
    try {
      const task = await imageApi.createImageTask({
        ...form,
        prompt: form.prompt.trim(),
        width: size?.width ?? 1024,
        height: size?.height ?? 1024,
      })
      query.status = 'all'
      query.page = 1
      list.value = [task, ...list.value]
      total.value += 1
      startPolling(task)
      return task
    } finally {
      submitting.value = false
    }
  }

  async function retryTask(id: string) {
    const task = await imageApi.retryImageTask(id)
    const index = list.value.findIndex((item) => item.id === id)
    if (index > -1) list.value[index] = task
    if (detail.value?.id === id) detail.value = task
    startPolling(task)
    return task
  }

  async function removeTask(id: string) {
    await imageApi.removeImageTask(id)
    stopPolling(id)
    list.value = list.value.filter((item) => item.id !== id)
    total.value = Math.max(0, total.value - 1)
    if (detail.value?.id === id) detail.value = null
  }

  function updateTask(task: ImageTask) {
    const index = list.value.findIndex((item) => item.id === task.id)
    if (index > -1) list.value[index] = task
    if (detail.value?.id === task.id) detail.value = task
  }

  function startPolling(task: ImageTask) {
    if (!task.id || pollingIds.has(task.id)) return
    pollingIds.add(task.id)
    const poll = async () => {
      try {
        const latest = await imageApi.fetchImageTaskDetail(task.id)
        updateTask(latest)
        if (['pending', 'generating'].includes(latest.status)) {
          pollTimers.set(task.id, window.setTimeout(poll, 900))
        } else {
          stopPolling(task.id)
        }
      } catch {
        stopPolling(task.id)
      }
    }
    pollTimers.set(task.id, window.setTimeout(poll, 900))
  }

  /** 不传 id 时停止全部轮询（供页面卸载时调用） */
  function stopPolling(id?: string) {
    if (id === undefined) {
      Array.from(pollingIds).forEach((item) => stopPolling(item))
      return
    }
    const timer = pollTimers.get(id)
    if (timer) window.clearTimeout(timer)
    pollTimers.delete(id)
    pollingIds.delete(id)
  }

  function resetForm() {
    Object.assign(form, createForm())
  }

  function setStatus(status: string) {
    query.status = status
    query.page = 1
    fetchList()
  }

  function setKeyword(keyword: string) {
    query.keyword = keyword
    query.page = 1
    fetchList()
  }

  return {
    form, query, list, total, loading, submitting, error, detail, detailLoading, detailError,
    pageCount, generatingCount, fetchList, fetchDetail, createTask, retryTask, removeTask,
    startPolling, stopPolling, resetForm, setStatus, setKeyword,
  }
})
