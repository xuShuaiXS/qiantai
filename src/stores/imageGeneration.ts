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

/*
 * 模型列表不再写死在本地：改为运行时从后端拉取「图片」能力的型号，
 * 见 store 的 models / fetchModels()（数据源 /chat/model-families）。
 */

/**
 * 图片尺寸选项：对应后端 /chat/images/generations 的 size 参数。
 * 取值与「模型对话」页（views/chat/data.ts 的 IMAGE_SIZE_OPTIONS）保持一致，
 * 即已在对话生图链路上实测可用的那一组；具体可用范围仍由上游模型决定，后端会校验。
 */
export const IMAGE_SIZES: ImageSizeOption[] = [
  { value: '1024x1024', label: '1:1', width: 1024, height: 1024 },
  { value: '1792x1024', label: '16:9', width: 1792, height: 1024 },
  { value: '1024x1792', label: '9:16', width: 1024, height: 1792 },
  { value: '1536x1024', label: '3:2', width: 1536, height: 1024 },
  { value: '1024x1536', label: '2:3', width: 1024, height: 1536 },
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

function createForm(): ImageGenForm {
  return {
    prompt: '',
    negativePrompt: '低清晰度、文字、水印、变形、模糊',
    effect: '',
    style: 'cinematic',
    // 由 fetchModels() 拉取后端图片模型后自动填充
    model: '',
    size: '1024x1024',
    count: 1,
  }
}

/* ------------------------------ Store ------------------------------ */

export const useImageGenerationStore = defineStore('image-generation', () => {
  const form = reactive<ImageGenForm>(createForm())
  /** 结果记录：仅本次会话（后端未提供生图历史接口，前端内存态展示） */
  const results = ref<ImageTask[]>([])
  const submitting = ref(false)
  const error = ref<string>('')

  /* -------- 图片模型（来自后端配置，非本地写死） -------- */
  const models = ref<ImageModelOption[]>([])
  const modelsLoading = ref(false)
  const modelsError = ref<string>('')

  const hasResults = computed(() => results.value.length > 0)
  const currentModel = computed(() => models.value.find((item) => item.value === form.model) || null)

  /** 拉取后端配置的「图片」能力模型，并把默认型号写入表单 */
  async function fetchModels() {
    if (modelsLoading.value) return
    modelsLoading.value = true
    modelsError.value = ''
    try {
      const options = await imageApi.fetchImageModels()
      models.value = options
      if (!options.length) {
        modelsError.value = '后端未配置图片能力模型，请先在控制台配置厂商与模型'
        return
      }
      if (!options.some((item) => item.value === form.model)) {
        const first = options[0]
        if (first) form.model = first.value
      }
    } catch (err) {
      modelsError.value = err instanceof Error ? err.message : '模型列表加载失败'
    } finally {
      modelsLoading.value = false
    }
  }

  /**
   * 提交一次生成任务（真实调用后端生图接口）。
   * 返回结果记录；失败时记录内带有 errorMessage，页面据此提示。
   */
  async function createTask() {
    const prompt = form.prompt.trim()
    if (!prompt || submitting.value) return null

    const model = form.model || models.value[0]?.value || ''
    if (!model) {
      error.value = '请先选择模型'
      return null
    }

    const size = IMAGE_SIZES.find((item) => item.value === form.size)
    const effect = IMAGE_EFFECTS.find((item) => item.value === form.effect)
    // 效果预设作为提示词前置，保证「使用该效果」在正式环境下同样生效
    const finalPrompt = effect ? `${prompt}（${effect.title}：${effect.hint}）` : prompt

    error.value = ''
    submitting.value = true
    const pending: ImageTask = {
      id: `ig_${Date.now()}`,
      prompt: finalPrompt,
      negativePrompt: form.negativePrompt,
      model,
      size: form.size,
      width: size?.width ?? 1024,
      height: size?.height ?? 1024,
      count: form.count,
      status: 'generating',
      images: [],
      createdAt: '',
      updatedAt: '',
    }
    results.value = [pending, ...results.value]

    try {
      const task = await imageApi.createImageTask({
        prompt: finalPrompt,
        negativePrompt: form.negativePrompt,
        model,
        size: form.size,
        width: size?.width ?? 1024,
        height: size?.height ?? 1024,
        count: form.count,
      })
      const index = results.value.findIndex((item) => item.id === pending.id)
      if (index > -1) results.value[index] = task
      if (task.status === 'failed') error.value = task.errorMessage || '生图失败'
      return task
    } finally {
      submitting.value = false
    }
  }

  /** 清空本次会话的生成记录 */
  function clearResults() {
    results.value = []
    error.value = ''
  }

  function removeResult(id: string) {
    results.value = results.value.filter((item) => item.id !== id)
  }

  function resetForm() {
    const next = createForm()
    next.model = form.model // 保留已选模型
    Object.assign(form, next)
  }

  return {
    form, results, submitting, error,
    models, modelsLoading, modelsError, hasResults, currentModel,
    fetchModels, createTask, clearResults, removeResult, resetForm,
  }
})
