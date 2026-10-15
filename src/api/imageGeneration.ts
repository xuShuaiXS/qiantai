/**
 * 「图片生成」接口层 —— 对接极光AI 真实后端
 *
 * 说明
 * ----
 * 早期版本这里是一份本地 mock（内存任务表 + 假进度 + SVG 占位图），仅用于本地预览。
 * 现已切换为正式实现：
 *   - 模型列表：来自后端 /chat/model-families（取 capability = image 的系列与型号）
 *   - 生图：调用后端 /chat/images/generations（与「模型对话」页面同一条链路）
 *   - 上传：调用后端 /chat/upload（multipart 字段 file）
 *
 * 因此这里不再有假数据、假进度与轮询；生图为同步等待上游返回。
 */
import {
  fetchModelFamilies,
  generateImage as requestGenerateImage,
  uploadChatImage,
} from '@/api/chat'

/* ------------------------------ 类型 ------------------------------ */

/** 供 UI 选择器使用的图片模型项 */
export interface ImageModelOption {
  value: string
  label: string
  desc: string
}

/** 单张生成结果 */
export interface ImageResultImage {
  index: number
  url: string
}

export type ImageTaskStatus = 'pending' | 'generating' | 'success' | 'failed'

/** 一次生成记录（前端内存态，用于结果展示） */
export interface ImageTask {
  id: string
  prompt: string
  negativePrompt: string
  model: string
  size: string
  width: number
  height: number
  count: number
  status: ImageTaskStatus
  images: ImageResultImage[]
  revisedPrompt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

export interface CreateImageTaskPayload {
  prompt: string
  negativePrompt?: string
  model: string
  size: string
  width?: number
  height?: number
  count?: number
}

/* ------------------------------ 模型列表 ------------------------------ */

/**
 * 取后端配置中「图片」能力的模型。
 * 数据源是模型系列（family），展开其 variants 后逐项作为可选型号。
 */
export async function fetchImageModels(): Promise<ImageModelOption[]> {
  const families = await fetchModelFamilies()
  const options: ImageModelOption[] = []

  families.forEach((family) => {
    const variants = (family.variants || []).filter((item) => item.capability === 'image')
    // family 本身标记为 image，或至少含一个 image 型号，都算图片系列
    if (family.capability !== 'image' && !variants.length) return

    variants.forEach((variant) => {
      options.push({
        value: variant.modelId,
        label: variant.name,
        desc: `${family.name} · ${family.providerName}`,
      })
    })
  })

  return options
}

/* ------------------------------ 生图 ------------------------------ */

function nowStr() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 生成图片（真实调用后端），失败时返回带错误信息的记录而不抛出 */
export async function createImageTask(data: CreateImageTaskPayload): Promise<ImageTask> {
  const stamp = nowStr()
  const base: ImageTask = {
    id: `ig_${Date.now()}`,
    prompt: data.prompt,
    negativePrompt: data.negativePrompt || '',
    model: data.model,
    size: data.size,
    width: data.width ?? 1024,
    height: data.height ?? 1024,
    count: data.count ?? 1,
    status: 'generating',
    images: [],
    createdAt: stamp,
    updatedAt: stamp,
  }

  try {
    const result = await requestGenerateImage({
      model: data.model,
      prompt: data.prompt,
      n: data.count ?? 1,
      size: data.size,
    })
    const images: ImageResultImage[] = (result.images || []).map((url, index) => ({ index, url }))
    return {
      ...base,
      images,
      revisedPrompt: result.revisedPrompt,
      status: images.length ? 'success' : 'failed',
      errorMessage: images.length ? undefined : '生图未返回图片，请检查厂商配置与额度后重试',
      updatedAt: nowStr(),
    }
  } catch (err) {
    return {
      ...base,
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : '生图失败',
      updatedAt: nowStr(),
    }
  }
}

/** 上传参考图（复用对话页的上传通道），返回可访问 URL */
export async function uploadImage(file: File): Promise<string> {
  return uploadChatImage(file)
}
