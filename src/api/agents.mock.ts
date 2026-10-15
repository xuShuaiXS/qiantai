/**
 * 超级智能体 - 前端 Mock 实现（与 agent-server 后端同一份数据形状）。
 * 持久化：localStorage（我创建的 / 收藏 / 使用量），仅本浏览器可见。
 * 配置 VITE_AGENTS_API 后本文件不再被引用（见 api/agents.ts 双模式开关）。
 */
import type {
  AgentCategory,
  AgentItem,
  AgentListResult,
  AgentQuery,
  CreateAgentPayload,
} from './agents'

interface SeedAgent {
  id: number
  name: string
  categoryId: number
  avatar: string
  desc: string
  tags: string[]
  rating: number
  usage: number
  systemPrompt: string
}

export const SEED_CATEGORIES: { id: number; name: string; icon: string }[] = [
  { id: 1, name: 'AI教育', icon: '📚' },
  { id: 2, name: 'AI视觉创作', icon: '🎨' },
  { id: 3, name: '图形与图像处理', icon: '🖼️' },
  { id: 4, name: '办公文档生成', icon: '📄' },
  { id: 5, name: '数据计算与分析', icon: '📊' },
  { id: 6, name: '知识检索与信息获取', icon: '🔍' },
  { id: 7, name: '编程与软件开发', icon: '💻' },
  { id: 8, name: '创意写作与内容策划', icon: '✍️' },
  { id: 9, name: '学术与研究辅助', icon: '🔬' },
  { id: 10, name: '教育与培训', icon: '🎓' },
  { id: 11, name: '语言与文字处理', icon: '🗣️' },
  { id: 12, name: '商务与运营支持', icon: '💼' },
  { id: 13, name: '生活与娱乐', icon: '🎮' },
  { id: 14, name: '产品与设计', icon: '🛠️' },
  { id: 15, name: '媒体与传播', icon: '📣' },
  { id: 16, name: '效率工具', icon: '⚡' },
  { id: 17, name: 'AI电商', icon: '🛒' },
  { id: 18, name: 'AI摄影', icon: '📷' },
]

const SEED_AGENTS: SeedAgent[] = [
  { id: 1, name: 'AI写作助手', categoryId: 8, avatar: '✍️', desc: '帮您快速撰写文章、营销文案、报告与社媒内容，支持多种文风切换', tags: ['AI写作', '智能对话', '多轮对话'], rating: 4.7, usage: 1136, systemPrompt: '你是一位资深内容创作者，擅长撰写文章、营销文案、报告与社媒内容。请根据用户需求生成结构清晰、语言流畅的文本，必要时给出大纲与可执行建议。' },
  { id: 2, name: '代码助手', categoryId: 7, avatar: '💻', desc: '多语言编程辅助：代码生成、Bug 修复、重构建议与代码审查', tags: ['代码生成', '编程助手', '多语言'], rating: 4.6, usage: 988, systemPrompt: '你是一位资深全栈工程师，精通 Java/Go/Python/JavaScript。为用户生成高质量代码并附简要说明，遇到 Bug 先定位根因再给修复方案，避免臆测不存在的 API。' },
  { id: 3, name: '数据分析专家', categoryId: 5, avatar: '📊', desc: '数据清洗、统计分析、可视化建议与业务洞察解读', tags: ['数据分析', '数据可视化', '统计'], rating: 4.5, usage: 788, systemPrompt: '你是一位数据分析专家，擅长数据清洗、统计分析与可视化建议。回答时给出可落地的分析方法、关键指标与结论，必要时给出 SQL 或 Python 示例。' },
  { id: 4, name: '翻译官', categoryId: 11, avatar: '🌍', desc: '多语种互译，保留语境与专业术语，支持中英日韩法德等', tags: ['翻译助手', '多语言', '本地化'], rating: 4.8, usage: 654, systemPrompt: '你是一位专业翻译，支持中、英、日、韩、法、德等语言互译。翻译时保留语境与专业术语，必要时给出多种译法并说明差异。' },
  { id: 5, name: 'PPT 大纲生成器', categoryId: 4, avatar: '📑', desc: '输入主题，一键生成结构化 PPT 大纲与分页内容建议', tags: ['PPT', '办公文档', '大纲'], rating: 4.4, usage: 512, systemPrompt: '你是一位 PPT 结构设计师。根据用户主题生成清晰的大纲（标题/章节/每页要点），保持逻辑连贯，每页 3-5 个要点。' },
  { id: 6, name: '周报助手', categoryId: 4, avatar: '📝', desc: '把零散工作内容整理成结构化周报，自动归类本周/下周/风险', tags: ['周报', '办公文档', '总结'], rating: 4.5, usage: 430, systemPrompt: '你是一位周报整理助手。将用户提供的零散工作内容整理为结构化周报，包含「本周完成/下周计划/风险与求助」三段，语言简洁专业。' },
  { id: 7, name: '学术论文润色', categoryId: 9, avatar: '🎓', desc: '学术语言润色、逻辑梳理、引用规范检查，适配中文期刊', tags: ['学术', '润色', '论文'], rating: 4.6, usage: 318, systemPrompt: '你是一位学术编辑，擅长中文学术论文润色。修改时保持原意，提升学术性与逻辑性，指出逻辑漏洞并给出参考文献规范建议。' },
  { id: 8, name: '法律咨询助手', categoryId: 12, avatar: '⚖️', desc: '常见法律问题解答、合同条款解读与风险提示（非执业意见）', tags: ['法律', '合同', '风险提示'], rating: 4.3, usage: 276, systemPrompt: '你是一位法律知识助手，可解答常见法律问题、解读合同条款。回答前务必声明「以下内容仅供参考，不构成正式法律意见」，必要时提示需咨询执业律师。' },
  { id: 9, name: '产品经理 Copilot', categoryId: 14, avatar: '🧭', desc: '需求拆解、PRD 撰写、用户故事拆分与优先级排序', tags: ['产品', 'PRD', '需求分析'], rating: 4.5, usage: 369, systemPrompt: '你是一位资深产品经理。帮用户拆解需求、撰写 PRD、拆分用户故事并按 MoSCoW 排优先级，输出结构化、可执行的内容。' },
  { id: 10, name: 'UI/UX 顾问', categoryId: 14, avatar: '🎨', desc: '界面布局建议、交互流程评审、可用性改进清单', tags: ['UI设计', 'UX', '交互'], rating: 4.4, usage: 261, systemPrompt: '你是一位 UI/UX 顾问。评审界面布局与交互流程，给出可落地的改进清单，关注可用性与一致性。' },
  { id: 11, name: 'SEO 优化师', categoryId: 15, avatar: '🔎', desc: '关键词策略、标题与描述撰写、内容结构优化建议', tags: ['SEO', '运营', '内容优化'], rating: 4.3, usage: 198, systemPrompt: '你是一位 SEO 优化师。给出关键词策略、标题与 meta 描述、内容结构建议，兼顾搜索意图与可读性。' },
  { id: 12, name: '小红书文案', categoryId: 15, avatar: '📕', desc: '种草文案、标题与 emoji 排版，适配小红书平台调性', tags: ['小红书', '种草', '文案'], rating: 4.5, usage: 423, systemPrompt: '你是一位小红书文案写手。生成符合平台调性的种草文案：吸睛标题、emoji 排版、口语化表达，必要时给出 3 版备选标题。' },
  { id: 13, name: '电商文案生成', categoryId: 17, avatar: '🛍️', desc: '商品标题、卖点提炼、详情页文案与评价话术生成', tags: ['电商', '商品文案', '卖点'], rating: 4.4, usage: 307, systemPrompt: '你是一位电商文案专家。根据商品信息生成标题、卖点、详情页文案与评价话术，突出核心卖点并符合平台规范。' },
  { id: 14, name: '客服话术助手', categoryId: 12, avatar: '🎧', desc: '常见问题应答模板、投诉处理话术与满意度提升建议', tags: ['客服', '话术', '满意度'], rating: 4.2, usage: 245, systemPrompt: '你是一位客服话术顾问。为常见问题生成专业、有温度的应答模板，处理投诉时先共情再给方案，必要时给出满意度提升建议。' },
  { id: 15, name: 'Excel 公式助手', categoryId: 16, avatar: '🧮', desc: '描述需求生成 Excel 公式，附参数说明与常见坑提示', tags: ['Excel', '公式', '办公'], rating: 4.6, usage: 372, systemPrompt: '你是一位 Excel 专家。根据用户需求生成公式并附参数说明与常见坑提示，必要时给出多种实现方案对比。' },
  { id: 16, name: '日程规划师', categoryId: 16, avatar: '📅', desc: '拆解任务、排定日程、平衡精力与优先级，输出可执行计划', tags: ['日程', '时间管理', '计划'], rating: 4.4, usage: 218, systemPrompt: '你是一位时间管理教练。帮用户拆解任务、排定日程、平衡精力与优先级，输出可执行的每日/每周计划。' },
  { id: 17, name: '菜谱生成器', categoryId: 13, avatar: '🍳', desc: '输入食材生成菜谱，附步骤、用量与营养小贴士', tags: ['菜谱', '烹饪', '生活'], rating: 4.7, usage: 501, systemPrompt: '你是一位家常菜厨师。根据用户提供的食材生成菜谱，包含步骤、用量与营养小贴士，必要时给出替代食材建议。' },
  { id: 18, name: '旅行规划师', categoryId: 13, avatar: '✈️', desc: '按预算与天数生成行程、交通与住宿建议', tags: ['旅行', '行程', '攻略'], rating: 4.5, usage: 388, systemPrompt: '你是一位旅行规划师。根据用户目的地、预算与天数生成行程，含交通、住宿与必玩景点，必要时给出备选方案。' },
  { id: 19, name: '英语口语陪练', categoryId: 10, avatar: '🗣️', desc: '场景化对话练习，纠错并给出更地道表达', tags: ['英语', '口语', '陪练'], rating: 4.6, usage: 461, systemPrompt: '你是一位英语口语陪练。进行场景化对话练习，发现错误时温柔纠正并给出更地道的表达，必要时附中文解释。' },
  { id: 20, name: '数学解题助手', categoryId: 10, avatar: '➗', desc: '分步解题、公式推导与易错点提示，覆盖中小学到大学', tags: ['数学', '解题', '推导'], rating: 4.5, usage: 339, systemPrompt: '你是一位数学老师。分步解题、给出公式推导与易错点提示，确保逻辑严谨，必要时用 LaTeX 表达公式。' },
  { id: 21, name: '知识检索助手', categoryId: 6, avatar: '🔍', desc: '概念解释、对比辨析与信息汇总，附可信来源建议', tags: ['知识检索', '概念解释', '信息'], rating: 4.4, usage: 290, systemPrompt: '你是一位知识检索助手。解释概念、对比辨析、汇总信息，并提示用户对关键结论交叉验证可信来源。' },
  { id: 22, name: '图像创意提示词', categoryId: 2, avatar: '🎨', desc: '生成文生图提示词、风格关键词与构图建议', tags: ['AI绘画', '提示词', '创意'], rating: 4.3, usage: 234, systemPrompt: '你是一位 AI 绘画提示词工程师。根据用户创意生成结构化提示词，含主体、风格、构图、光线与负面提示词。' },
  { id: 23, name: '摄影构图顾问', categoryId: 18, avatar: '📷', desc: '构图、光线、参数与后期建议，适配不同拍摄场景', tags: ['摄影', '构图', '后期'], rating: 4.4, usage: 176, systemPrompt: '你是一位摄影顾问。给出构图、光线、相机参数与后期建议，适配不同场景（人像/风光/街拍），必要时给出备选拍摄方案。' },
  { id: 24, name: '新媒体运营官', categoryId: 15, avatar: '📣', desc: '选题策划、排期建议、数据复盘与爆款拆解', tags: ['新媒体', '运营', '选题'], rating: 4.3, usage: 264, systemPrompt: '你是一位新媒体运营官。帮用户做选题策划、内容排期、数据复盘与爆款拆解，输出可执行的运营动作清单。' },
]

/* ------------------------------ localStorage 工具 ------------------------------ */

const K_CREATED = 'jiguang_agents_created'
const K_FAVS = 'jiguang_agents_favs'
const K_USAGE = 'jiguang_agents_usage'
const K_NEXTID = 'jiguang_agents_nextid'

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function loadCreated(): AgentItem[] {
  return lsGet<AgentItem[]>(K_CREATED, [])
}

function loadFavs(): number[] {
  return lsGet<number[]>(K_FAVS, [])
}

function usageOf(id: number, base: number): number {
  const usage = lsGet<Record<string, number>>(K_USAGE, {})
  return base + (usage[String(id)] || 0)
}

function catName(categoryId: number | null): string {
  if (!categoryId) return ''
  return SEED_CATEGORIES.find((c) => c.id === categoryId)?.name ?? ''
}

function seedToItem(a: SeedAgent, favs: Set<number>): AgentItem {
  return {
    id: a.id,
    name: a.name,
    avatar: a.avatar,
    description: a.desc,
    tags: [...a.tags],
    rating: a.rating,
    usageCount: usageOf(a.id, a.usage),
    systemPrompt: a.systemPrompt,
    modelId: 'claude-fable-5',
    categoryId: a.categoryId,
    categoryName: catName(a.categoryId),
    isOfficial: true,
    creatorName: 'official',
    isFavorited: favs.has(a.id),
  }
}

/** 全量智能体 = 官方种子 + 本地创建 */
function allAgents(): AgentItem[] {
  const favs = new Set(loadFavs())
  const created = loadCreated().map((a) => ({
    ...a,
    isFavorited: favs.has(a.id),
    isOfficial: false,
  }))
  return [...SEED_AGENTS.map((a) => seedToItem(a, favs)), ...created]
}

function applyFilters(list: AgentItem[], q: AgentQuery): AgentItem[] {
  let out = list
  if (q.categoryId) out = out.filter((a) => a.categoryId === q.categoryId)
  if (q.search) {
    const s = q.search.toLowerCase()
    out = out.filter(
      (a) =>
        a.name.toLowerCase().includes(s) ||
        a.description.toLowerCase().includes(s) ||
        a.tags.some((t) => t.toLowerCase().includes(s)),
    )
  }
  if (q.tag) out = out.filter((a) => a.tags.includes(q.tag as string))
  return out
}

/* ------------------------------ 对外 Mock 函数 ------------------------------ */

export function mockCategories(): AgentCategory[] {
  const agents = allAgents()
  return [
    ...SEED_CATEGORIES.map((c) => ({
      ...c,
      count: agents.filter((a) => a.categoryId === c.id).length,
    })),
  ]
}

export function mockHotTags(): string[] {
  const freq: Record<string, number> = {}
  for (const a of SEED_AGENTS) for (const t of a.tags) freq[t] = (freq[t] || 0) + 1
  return Object.entries(freq)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 8)
    .map(([t]) => t)
}

export function mockList(q: AgentQuery): AgentListResult {
  let pool: AgentItem[]
  const username = localStorage.getItem('jiguang_current_username') || 'admin'
  if (q.tab === 'mine') {
    pool = allAgents().filter((a) => !a.isOfficial && a.creatorName === username)
  } else if (q.tab === 'favorites') {
    const favs = new Set(loadFavs())
    pool = allAgents().filter((a) => favs.has(a.id))
  } else {
    pool = allAgents().filter((a) => a.isOfficial)
  }
  pool = applyFilters(pool, q)
  const page = q.page ?? 1
  const pageSize = q.pageSize ?? 12
  return {
    list: pool.slice((page - 1) * pageSize, page * pageSize),
    total: pool.length,
  }
}

export function mockDetail(id: number): AgentItem {
  const found = allAgents().find((a) => a.id === id)
  if (!found) throw new Error('智能体不存在')
  const usage = lsGet<Record<string, number>>(K_USAGE, {})
  usage[String(id)] = (usage[String(id)] || 0) + 1
  lsSet(K_USAGE, usage)
  return { ...found, usageCount: found.usageCount + 1 }
}

export function mockCreate(payload: CreateAgentPayload): AgentItem {
  const created = loadCreated()
  const nextId = lsGet<number>(K_NEXTID, 10000)
  const username = localStorage.getItem('jiguang_current_username') || 'admin'
  const item: AgentItem = {
    id: nextId,
    name: payload.name,
    avatar: payload.avatar || '🤖',
    description: payload.description || '',
    tags: [...(payload.tags || [])],
    rating: 5,
    usageCount: 0,
    systemPrompt: payload.systemPrompt || '你是一个乐于助人的AI助手',
    modelId: payload.modelId || '',
    categoryId: payload.categoryId ?? null,
    categoryName: catName(payload.categoryId ?? null),
    isOfficial: false,
    creatorName: username,
    isFavorited: false,
  }
  created.push(item)
  lsSet(K_CREATED, created)
  lsSet(K_NEXTID, nextId + 1)
  return { ...item }
}

export function mockUpdate(id: number, payload: Partial<CreateAgentPayload>): AgentItem {
  const created = loadCreated()
  const idx = created.findIndex((a) => a.id === id)
  const prev = created[idx]
  if (idx === -1 || !prev) throw new Error('智能体不存在或无权修改')
  const next: AgentItem = {
    ...prev,
    name: payload.name ?? prev.name,
    avatar: payload.avatar ?? prev.avatar,
    description: payload.description ?? prev.description,
    tags: payload.tags ? [...payload.tags] : prev.tags,
    systemPrompt: payload.systemPrompt ?? prev.systemPrompt,
    modelId: payload.modelId ?? prev.modelId,
    categoryId: payload.categoryId !== undefined ? payload.categoryId : prev.categoryId,
    categoryName: catName(payload.categoryId !== undefined ? payload.categoryId : prev.categoryId),
  }
  created[idx] = next
  lsSet(K_CREATED, created)
  return { ...next }
}

export function mockRemove(id: number): { ok: boolean } {
  const created = loadCreated().filter((a) => a.id !== id)
  lsSet(K_CREATED, created)
  lsSet(
    K_FAVS,
    loadFavs().filter((f) => f !== id),
  )
  return { ok: true }
}

export function mockToggleFavorite(id: number, on: boolean): { ok: boolean; isFavorited: boolean } {
  let favs = loadFavs()
  if (on) {
    if (!favs.includes(id)) favs.push(id)
  } else {
    favs = favs.filter((f) => f !== id)
  }
  lsSet(K_FAVS, favs)
  return { ok: true, isFavorited: on }
}
