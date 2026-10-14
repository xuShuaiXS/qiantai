/**
 * 「图片生成」接口层 —— 本地演示实现
 *
 * 背景：这套页面原本运行在 oademo 项目里，请求经统一的 mock 引擎（@/mock）拦截。
 * 极光AI 暂无该 mock 基建，且真实生图 API Key 尚未接通（原项目 .env.local 里的
 * JIGUANG_API_KEY 属于敏感信息，未随代码迁移），因此这里用内存数据模拟一份等价行为：
 *
 *   - 内存任务列表 + 生成进度推进：任务创建后进入 generating，到点自动转为 success
 *   - 图片使用内联 SVG 占位，不依赖任何外网资源
 *
 * 后续接入真实后端时，只需把各函数体替换为 request(...) 调用，
 * 函数签名与返回结构保持不变即可，页面与 store 无需改动。
 */

/* ------------------------------ 类型 ------------------------------ */

export interface ImageResultImage {
  id: string
  url: string
  width: number
  height: number
}

export type ImageTaskStatus = 'pending' | 'generating' | 'success' | 'failed'

export interface ImageTask {
  id: string
  prompt: string
  negativePrompt: string
  style: string
  model: string
  width: number
  height: number
  count: number
  status: ImageTaskStatus
  images: ImageResultImage[]
  resultUrls: string[]
  errorMessage: string
  createdAt: string
  completedAt: string
  /** 生成完成的绝对时间戳；0 表示已完成或无需推进 */
  readyAt: number
}

export interface ImageTaskListParams {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface ImageTaskListResult {
  list: ImageTask[]
  total: number
}

export interface CreateImageTaskPayload {
  prompt: string
  negativePrompt?: string
  style?: string
  model?: string
  width?: number
  height?: number
  count?: number
}

/* --------------------------- 内部工具 --------------------------- */

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function nowStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 生成一张内联 SVG 占位图，避免演示时依赖外网图片 */
function imageSvg(title: string, subtitle: string, colors: [string, string] = ['#1677ff', '#7c3aed']) {
  const escape = (value: string) =>
    String(value).replace(
      /[<&>"']/g,
      (char) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;', '&': '&amp;' })[char] as string,
    )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="790" cy="210" r="220" fill="#fff" opacity=".12"/><circle cx="230" cy="850" r="280" fill="#fff" opacity=".1"/><rect x="86" y="720" width="852" height="2" fill="#fff" opacity=".3"/><text x="86" y="790" fill="#fff" font-family="Arial,sans-serif" font-size="48" font-weight="700">${escape(title)}</text><text x="86" y="848" fill="#fff" opacity=".78" font-family="Arial,sans-serif" font-size="24">${escape(subtitle)}</text><text x="86" y="908" fill="#fff" opacity=".58" font-family="Arial,sans-serif" font-size="18">AURORA AI / CREATIVE PREVIEW</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const PALETTES: Array<[string, string]> = [
  ['#1677ff', '#42d3ff'],
  ['#7c3aed', '#ec4899'],
  ['#0f766e', '#22c55e'],
  ['#ea580c', '#facc15'],
]

function imageResult(id: string, prompt: string, index = 0): ImageResultImage {
  const palette = PALETTES[index % PALETTES.length] ?? ['#1677ff', '#7c3aed']
  return {
    id: `${id}-${index + 1}`,
    url: imageSvg(`极光视觉 ${index + 1}`, prompt.slice(0, 22), palette),
    width: 1024,
    height: 1024,
  }
}

/* --------------------------- 内存数据 --------------------------- */

/** 生成耗时（毫秒）：到点后由 advance 把任务推进为完成态 */
const GENERATE_COST_MS = 3600
const MOCK_DELAY_MS = 200

function createSeedTasks(): ImageTask[] {
  return [
    {
      id: 'IMG202610130001',
      prompt: '蓝色未来城市中的极光科技展厅，电影级光影，广角构图',
      negativePrompt: '低清晰度、文字、水印、变形',
      style: 'cinematic',
      model: 'aurora-v1',
      width: 1024,
      height: 1024,
      count: 2,
      status: 'success',
      images: [
        imageResult('IMG202610130001', '未来城市科技展厅', 0),
        imageResult('IMG202610130001', '未来城市科技展厅', 1),
      ],
      resultUrls: [
        imageResult('IMG202610130001', '未来城市科技展厅', 0).url,
        imageResult('IMG202610130001', '未来城市科技展厅', 1).url,
      ],
      errorMessage: '',
      createdAt: '2026-10-13 14:18:00',
      completedAt: '2026-10-13 14:18:08',
      readyAt: 0,
    },
    {
      id: 'IMG202610130003',
      prompt: '色彩丰富的极光创意海报，梦幻光晕与几何图形',
      negativePrompt: '模糊、重复图案',
      style: 'illustration',
      model: 'aurora-v1',
      width: 1024,
      height: 1024,
      count: 1,
      status: 'failed',
      images: [],
      resultUrls: [imageResult('IMG202610130003', '极光创意海报', 0).url],
      errorMessage: '本次生成未完成，请调整提示词后重试。',
      createdAt: '2026-10-12 18:20:00',
      completedAt: '2026-10-12 18:20:05',
      readyAt: 0,
    },
  ]
}

/** 模块级内存表；后续接真实后端时整体删除 */
const taskList: ImageTask[] = createSeedTasks()

function findTask(id: string): ImageTask | undefined {
  return taskList.find((item) => item.id === id)
}

/** 生成进度推进：到点后落成结果或标记失败 */
function advance(task: ImageTask): ImageTask {
  if (task.status !== 'generating' || !task.readyAt || Date.now() < task.readyAt) return task
  task.status = 'success'
  task.completedAt = nowStr()
  task.readyAt = 0
  task.images = Array.from({ length: Math.max(1, task.count || 1) }, (_, index) => ({
    id: `${task.id}-${index + 1}`,
    url: task.resultUrls[index] ?? imageResult(task.id, task.prompt, index).url,
    width: task.width,
    height: task.height,
  }))
  return task
}

/** 返回副本，对齐真实后端 JSON 序列化后的行为 */
function clone(task: ImageTask): ImageTask {
  return { ...task, images: task.images.map((image) => ({ ...image })) }
}

function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ---------------------------- 对外接口 ---------------------------- */

export async function fetchImageTaskList(params: ImageTaskListParams = {}): Promise<ImageTaskListResult> {
  await delay()
  taskList.forEach(advance)

  const keyword = String(params.keyword || '').trim().toLowerCase()
  const status = params.status || 'all'
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 12

  const filtered = taskList
    .filter((task) => {
      const matchKeyword =
        !keyword || task.prompt.toLowerCase().includes(keyword) || task.id.toLowerCase().includes(keyword)
      const matchStatus = status === 'all' || task.status === status
      return matchKeyword && matchStatus
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

  const start = (page - 1) * pageSize
  return { list: filtered.slice(start, start + pageSize).map(clone), total: filtered.length }
}

export async function createImageTask(data: CreateImageTaskPayload): Promise<ImageTask> {
  await delay()
  const prompt = String(data?.prompt || '').trim()
  if (prompt.length < 4) throw new Error('提示词至少需要 4 个字符')

  const id = `IMG${Date.now()}`
  const count = Math.min(4, Math.max(1, Number(data.count) || 1))
  const task: ImageTask = {
    id,
    prompt,
    negativePrompt: data.negativePrompt || '',
    style: data.style || 'cinematic',
    model: data.model || 'aurora-v1',
    width: Number(data.width) || 1024,
    height: Number(data.height) || 1024,
    count,
    status: 'generating',
    images: [],
    resultUrls: Array.from({ length: count }, (_, index) => imageResult(id, prompt, index).url),
    errorMessage: '',
    createdAt: nowStr(),
    completedAt: '',
    readyAt: Date.now() + GENERATE_COST_MS,
  }
  taskList.unshift(task)
  return clone(task)
}

export async function fetchImageTaskDetail(id: string): Promise<ImageTask> {
  await delay(120)
  const task = findTask(id)
  if (!task) throw new Error('图片生成任务不存在')
  return clone(advance(task))
}

export async function retryImageTask(id: string): Promise<ImageTask> {
  await delay()
  const task = findTask(id)
  if (!task) throw new Error('图片生成任务不存在')
  if (task.status !== 'failed') throw new Error('当前任务无需重试')

  task.status = 'generating'
  task.errorMessage = ''
  task.images = []
  task.completedAt = ''
  task.readyAt = Date.now() + GENERATE_COST_MS
  task.resultUrls = Array.from({ length: Math.max(1, task.count || 1) }, (_, index) =>
    imageResult(task.id, task.prompt, index).url,
  )
  return clone(task)
}

export async function removeImageTask(id: string): Promise<{ deleted: boolean }> {
  await delay()
  const task = findTask(id)
  if (!task) throw new Error('图片生成任务不存在')
  if (task.status === 'generating') throw new Error('生成中的任务暂不可删除')
  const index = taskList.findIndex((item) => item.id === id)
  if (index > -1) taskList.splice(index, 1)
  return { deleted: true }
}
