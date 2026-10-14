<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import FeatureToast from './components/FeatureToast.vue'
import SideNav from './components/SideNav.vue'
import ModelPicker from './components/ModelPicker.vue'
import SeriesCarousel from './components/SeriesCarousel.vue'
import ImageGenPlaceholder from './components/ImageGenPlaceholder.vue'
import { useTypewriter } from './composables/useTypewriter'
import { useGenerationJobs } from './composables/useGenerationJobs'
import { useRouter } from 'vue-router'
import { REQUIRE_LOGIN } from '@/config/runtime'
import {
  appendChatMessages,
  batchDeleteChatSessions,
  createChatSession,
  deleteChatSession,
  fetchModelFamilies,
  generateImage,
  getChatSession,
  listChatSessions,
  renameChatSession,
  streamChat,
  type ChatContentPart,
  type ChatMsg,
  type ChatSessionItem,
} from '@/api/chat'
import { useAuthStore } from '@/stores/auth'
import { renderMarkdown } from '@/utils/markdown'
import { resolveMediaUrl, resolveMediaUrls } from '@/utils/mediaUrl'
import ComposerBox, { type PendingImage } from './components/ComposerBox.vue'
import {
  DEFAULT_IMAGE_SIZE,
  LOGO,
  MODEL_DS,
  charts,
  models as fallbackModels,
  navSections,
  promptPool,
  quickActions,
  type ChatMessage,
  type ChatMode,
  type ModelItem,
  type ModelVariantItem,
} from './data'
import './new-chat.css'

const router = useRouter()
const auth = useAuthStore()
const {
  isRunning,
  startJob,
  stopJob,
  finishJob,
  clearUnread,
  clearFailed,
  badgeMap,
  stopAll,
  getJob,
} = useGenerationJobs()

const bannerHidden = ref(false)
const siderCollapsed = ref(false)
const siderOpen = ref(false)
const activeNavKey = ref('chat')
const modelPanelOpen = ref(false)
const quickMoreOpen = ref(false)

const models = ref<ModelItem[]>([...fallbackModels])
const currentModel = ref<ModelItem>(fallbackModels[0]!)
const selectedModelId = ref(
  fallbackModels[0]?.variants?.[0]?.modelId || fallbackModels[0]?.key || '',
)
const chatMode = ref<ChatMode>('default')
const deepThink = ref(true)
const internet = ref(false)
const imageSize = ref(DEFAULT_IMAGE_SIZE)

const currentVariants = computed<ModelVariantItem[]>(() => currentModel.value.variants || [])
const currentVariant = computed(() =>
  currentVariants.value.find((x) => x.modelId === selectedModelId.value),
)
const currentVariantLabel = computed(() => {
  return currentVariant.value?.name || selectedModelId.value || currentModel.value.label
})
const isImageModel = computed(() => {
  const cap = currentVariant.value?.capability || currentModel.value.capability || 'chat'
  return cap === 'image'
})

const inputTop = ref('')
const inputDock = ref('')
const pendingImages = ref<PendingImage[]>([])
const imageUploading = ref(false)
const currentSessionId = ref<number | null>(null)
const sessions = ref<ChatSessionItem[]>([])

/** 各会话消息缓存（后台任务继续写这里） */
const messageBags = reactive(new Map<number, ChatMessage[]>())
const draftMessages = ref<ChatMessage[]>([])

const messages = computed<ChatMessage[]>(() => {
  const id = currentSessionId.value
  if (id == null) return draftMessages.value
  if (!messageBags.has(id)) messageBags.set(id, [])
  return messageBags.get(id)!
})

const inChat = computed(() => messages.value.length > 0)
const streaming = computed(() => isRunning(currentSessionId.value))
const sessionBadges = computed(() => badgeMap())

let msgId = 0
const copyHint = ref('')
const lightboxUrl = ref<string | null>(null)
/** 贴底才跟随流式滚动 */
const stickToBottom = ref(true)
const editingUserId = ref<number | null>(null)
const editDraft = ref('')
const softToast = ref<{ text: string; sessionId: number } | null>(null)
let softToastTimer: ReturnType<typeof setTimeout> | null = null
const PAGE_TITLE = '极光AI'
let titleFlashTimer: ReturnType<typeof setInterval> | null = null

function bagOf(sessionId: number): ChatMessage[] {
  if (!messageBags.has(sessionId)) messageBags.set(sessionId, [])
  return messageBags.get(sessionId)!
}

function findInBag(sessionId: number, id: number) {
  return bagOf(sessionId).find((m) => m.id === id)
}

function parseStoredImages(raw?: string): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    const list = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : []
    return resolveMediaUrls(list)
  } catch {
    return []
  }
}

function toApiContent(m: ChatMessage): string | ChatContentPart[] {
  if (!m.images?.length) return m.content
  const parts: ChatContentPart[] = []
  if (m.content.trim()) parts.push({ type: 'text', text: m.content })
  for (const url of m.images) {
    parts.push({ type: 'image_url', image_url: { url: resolveMediaUrl(url) } })
  }
  return parts
}

const palette = ['#4D6BFE', '#00B3A5', '#F5A623', '#7C5CFF', '#E85D4C', '#2F6F4E']

async function loadSessions() {
  try {
    sessions.value = await listChatSessions(50)
  } catch {
    sessions.value = []
  }
}

function pickDefaultVariant(family: ModelItem): string {
  const variants = family.variants || []
  const def = variants.find((v) => v.isDefault) || variants[0]
  return def?.modelId || family.key
}

function applyFamily(family: ModelItem, preferredModelId?: string) {
  currentModel.value = family
  const variants = family.variants || []
  if (preferredModelId && variants.some((v) => v.modelId === preferredModelId)) {
    selectedModelId.value = preferredModelId
    return
  }
  selectedModelId.value = pickDefaultVariant(family)
}

function findFamilyByModelId(modelId: string): ModelItem | undefined {
  if (!modelId) return undefined
  return models.value.find((f) => f.variants?.some((v) => v.modelId === modelId) || f.key === modelId)
}

async function loadModels() {
  try {
    const list = await fetchModelFamilies()
    if (!list.length) {
      models.value = []
      selectedModelId.value = ''
      showToast('尚未配置模型')
      toastDesc.value = '请先在控制台「厂商接入」点「同步模型」，或到「模型管理」手动新增。'
      return
    }
    models.value = list.map((f, i) => ({
      key: f.key,
      label: f.name,
      desc: f.providerName || f.providerCode || '后台配置',
      letter: (f.name || 'M').slice(0, 1),
      color: palette[i % palette.length]!,
      series: f.providerCode || f.providerName || 'custom',
      providerName: f.providerName || f.providerCode || '未分组',
      capability: f.capability || 'chat',
      hot: !!f.isDefault || i === 0,
      cost: 0,
      free: true,
      icon: MODEL_DS,
      variants: (f.variants || []).map((v) => ({
        id: v.id,
        name: v.name,
        modelId: v.modelId,
        capability: v.capability || f.capability || 'chat',
        isDefault: v.isDefault,
        sort: v.sort,
      })),
    }))
    const def = models.value.find((m) => m.hot) || models.value[0]!
    applyFamily(def)
  } catch {
    models.value = []
    selectedModelId.value = ''
    showToast('模型加载失败')
    toastDesc.value = '请确认已登录，且后端服务正常。'
  }
}

const promptOffset = ref(0)
const chartsExpanded = ref(false)
const workspaceRef = ref<HTMLElement | null>(null)
const composerTopRef = ref<InstanceType<typeof ComposerBox> | null>(null)
const composerDockRef = ref<InstanceType<typeof ComposerBox> | null>(null)

const PRIMARY_QUICK = new Set(['create_report', 'create_ppt'])
const CHART_PREVIEW = 6

const toastShow = ref(false)
const toastTitle = ref('功能开发中')
const toastDesc = ref('该栏目暂未开放，当前仅支持「模型对话」。')

const { text: typeText } = useTypewriter()

const flatQuick = quickActions.slice(0, 5)
const restQuick = quickActions.slice(5)

const visiblePrompts = computed(() => {
  const list = []
  for (let i = 0; i < 4; i++) {
    list.push(promptPool[(promptOffset.value + i) % promptPool.length]!)
  }
  return list
})

const visibleCharts = computed(() =>
  chartsExpanded.value ? charts : charts.slice(0, CHART_PREVIEW),
)

function quickAccent(key: string) {
  return PRIMARY_QUICK.has(key) ? 'accent' : ''
}

const IMAGE_GUIDE =
  '当前是生图模型，不能直接回答这类问题。请描述想生成的画面（如「二次元风格的今日新闻海报」），或切换到对话模型。'
const IMAGE_FAIL_FALLBACK = '生图失败，请换一种画面描述后重试，或切换到对话模型问答'

function cleanDisplayText(raw: string, maxLen = 200): string {
  let s = String(raw || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\[\]/g, '')
    .replace(/\b(?:cite|turn\d+\w*|image_group)\b/gi, '')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…`
  return s
}

function looksLikeChatQuestion(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  const hasDrawIntent =
    /画|生成|绘制|创作|做一[张幅]|来一[张幅]|海报|插画|壁纸|封面|图标|logo|示意图|渲染|文生图|出图|图片|image|photo|illustration|poster/i.test(
      t,
    )
  if (hasDrawIntent) return false
  if (/[?？]/.test(t)) return true
  if (/[吗么呢呀]$/.test(t)) return true
  if (/^(什么|怎么|为什么|为何|多少|有没有|是否|能否|可以|帮我查|请问|今天|昨日|明天)/.test(t)) {
    return true
  }
  if (/(新闻|天气|几点|几号|是谁|怎么样|如何|聊聊|解释一下)/.test(t)) return true
  return false
}

function friendlyErrorMessage(err: unknown, forImage: boolean): string {
  const raw = err instanceof Error ? err.message : String(err || '')
  const msg = raw.trim()
  if (!msg) return forImage ? IMAGE_FAIL_FALLBACK : '调用失败，请稍后重试'
  const looksLeaked =
    msg.includes('{') ||
    msg.includes('upstream_') ||
    /invalid_request/i.test(msg) ||
    /生图厂商错误/i.test(msg) ||
    msg.length > 120
  if (looksLeaked) return forImage ? IMAGE_FAIL_FALLBACK : '调用失败，请稍后重试'
  if (forImage) return msg.startsWith('当前模型') || msg.includes('生图') ? msg : `生图失败：${msg}`
  return `调用失败：${msg}`
}

const placeholder = computed(() => {
  if (isImageModel.value) {
    return '描述你想生成的画面…'
  }
  if (chatMode.value === 'agent') {
    return '输入你的需求（如研究一个主题、制定旅行攻略、PPT等），生成图片、生成视频、生成可视化网页、APP、数据报告等。'
  }
  if (chatMode.value === 'groups') {
    return '你可以选择多个模型同时提问，每个模型都有不同的特点和能力，你可以根据你的需求选择最适合的模型。'
  }
  return `给 ${currentVariantLabel.value} 发消息`
})

const dockPlaceholder = computed(() =>
  isImageModel.value
    ? placeholder.value
    : chatMode.value === 'default'
      ? '有问题，尽管问'
      : placeholder.value,
)

function showToast(name: string) {
  toastTitle.value = name || '功能开发中'
  toastDesc.value = `「${name || '该功能'}」暂未开放，当前仅支持「模型对话」页面。`
  toastShow.value = true
}

function onNavSelect(payload: { key: string; name: string; page?: boolean; route?: string }) {
  if (payload.page) {
    activeNavKey.value = payload.key
    siderOpen.value = false
    // 已接入的独立页面：直接跳转路由
    if (payload.route) {
      router.push(payload.route)
      return
    }
    if (payload.key === 'chat') newChat()
    return
  }
  showToast(payload.name)
}

function bumpSession(brief: ChatSessionItem) {
  const idx = sessions.value.findIndex((s) => s.id === brief.id)
  if (idx >= 0) sessions.value.splice(idx, 1)
  sessions.value.unshift(brief)
}

async function persistRound(
  sessionId: number,
  userText: string,
  attachImgs: string[],
  assistant: ChatMessage,
  modelId: string,
) {
  try {
    const detail = await appendChatMessages(sessionId, [
      {
        role: 'user',
        content: userText,
        images: attachImgs.length ? attachImgs : undefined,
      },
      {
        role: 'assistant',
        content: assistant.content,
        images: assistant.images,
        modelId,
      },
    ])
    bumpSession({
      id: detail.id,
      title: detail.title,
      modelId: detail.modelId,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    })
  } catch {
    /* 持久化失败不影响当前展示 */
  }
}

async function openSession(id: number) {
  clearUnread(id)
  clearFailed(id)
  activeNavKey.value = 'chat'
  siderOpen.value = false
  currentSessionId.value = id

  // 生成中或内存已有该会话消息：直接展示缓存，避免打断/覆盖后台结果
  if (isRunning(id) || (messageBags.has(id) && bagOf(id).length > 0)) {
    stickToBottom.value = true
    scrollBottom(true)
    return
  }

  try {
    const detail = await getChatSession(id)
    messageBags.set(
      id,
      (detail.messages || [])
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          id: ++msgId,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          images: parseStoredImages(m.images),
          modelLabel: m.modelId || undefined,
          status: 'done' as const,
        })),
    )
    if (detail.modelId) {
      const fam = findFamilyByModelId(detail.modelId)
      if (fam) applyFamily(fam, detail.modelId)
    }
    stickToBottom.value = true
    scrollBottom(true)
  } catch (e) {
    showToast('加载失败')
    toastDesc.value = e instanceof Error ? e.message : '无法打开该对话'
  }
}

async function onRenameSession(payload: { id: number; title: string }) {
  try {
    const brief = await renameChatSession(payload.id, payload.title)
    const idx = sessions.value.findIndex((s) => s.id === brief.id)
    if (idx >= 0) sessions.value[idx] = { ...sessions.value[idx]!, ...brief }
  } catch (e) {
    showToast('重命名失败')
    toastDesc.value = e instanceof Error ? e.message : '请稍后重试'
  }
}

async function removeSession(id: number) {
  if (isRunning(id)) stopJob(id)
  try {
    await deleteChatSession(id)
    sessions.value = sessions.value.filter((s) => s.id !== id)
    messageBags.delete(id)
    if (currentSessionId.value === id) newChat()
  } catch (e) {
    showToast('删除失败')
    toastDesc.value = e instanceof Error ? e.message : '请稍后重试'
  }
}

async function removeSessions(ids: number[]) {
  const uniq = [...new Set(ids.filter((id) => id > 0))]
  if (!uniq.length) return
  for (const id of uniq) {
    if (isRunning(id)) stopJob(id)
  }
  try {
    await batchDeleteChatSessions(uniq)
    const drop = new Set(uniq)
    sessions.value = sessions.value.filter((s) => !drop.has(s.id))
    for (const id of uniq) messageBags.delete(id)
    if (currentSessionId.value != null && drop.has(currentSessionId.value)) newChat()
  } catch (e) {
    showToast('删除失败')
    toastDesc.value = e instanceof Error ? e.message : '请稍后重试'
  }
}

function selectModel(m: ModelItem) {
  applyFamily(m)
}

function selectVariant(v: ModelVariantItem) {
  selectedModelId.value = v.modelId
}

function shufflePrompts() {
  promptOffset.value = (promptOffset.value + 4) % promptPool.length
}

function fillInput(text: string) {
  if (inChat.value) {
    inputDock.value = text
    nextTick(() => {
      composerDockRef.value?.focus()
      composerDockRef.value?.setCursorEnd()
    })
  } else {
    inputTop.value = text
    nextTick(() => {
      composerTopRef.value?.focus()
      composerTopRef.value?.setCursorEnd()
    })
  }
}

function appendChart(name: string) {
  const suffix = `使用${name}图表`
  const elVal = inChat.value ? inputDock.value : inputTop.value
  const base = elVal
    .replace(/(?:\s*)使用.+?图表/g, '')
    .replace(/\s+$/, '')
    .replace(/^\s+/, '')
  const next = base ? `${base} ${suffix}` : suffix
  if (inChat.value) inputDock.value = next
  else inputTop.value = next
  nextTick(() => {
    const refBox = inChat.value ? composerDockRef.value : composerTopRef.value
    refBox?.focus()
    refBox?.setCursorEnd()
  })
}

function onWorkspaceScroll() {
  const el = workspaceRef.value
  if (!el) return
  const dist = el.scrollHeight - el.scrollTop - el.clientHeight
  stickToBottom.value = dist < 96
}

function scrollBottom(force = false) {
  if (!force && !stickToBottom.value) return
  nextTick(() => {
    const el = workspaceRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function showSoftToast(text: string, sessionId: number) {
  softToast.value = { text, sessionId }
  if (softToastTimer) clearTimeout(softToastTimer)
  softToastTimer = setTimeout(() => {
    softToast.value = null
  }, 4500)
}

function notifyBackgroundDone(sessionId: number) {
  const title = sessions.value.find((s) => s.id === sessionId)?.title || '对话'
  const text = `「${title}」已生成完毕`
  showSoftToast(text, sessionId)
  bumpDocTitle()
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const n = new Notification('极光AI', { body: text, silent: true })
      n.onclick = () => {
        window.focus()
        openSession(sessionId)
        n.close()
      }
    }
  } catch {
    /* 通知失败忽略 */
  }
}

function bumpDocTitle() {
  const unread = Object.values(badgeMap()).filter((b) => b === 'unread').length
  if (unread <= 0) {
    document.title = PAGE_TITLE
    if (titleFlashTimer) {
      clearInterval(titleFlashTimer)
      titleFlashTimer = null
    }
    return
  }
  document.title = `(${unread}) ${PAGE_TITLE}`
  if (titleFlashTimer) return
  let on = true
  titleFlashTimer = setInterval(() => {
    const n = Object.values(badgeMap()).filter((b) => b === 'unread').length
    if (n <= 0) {
      document.title = PAGE_TITLE
      if (titleFlashTimer) clearInterval(titleFlashTimer)
      titleFlashTimer = null
      return
    }
    document.title = on ? `(${n}) ${PAGE_TITLE}` : PAGE_TITLE
    on = !on
  }, 1200)
}

function maybeNotifyDone(sessionId: number, viewing: boolean) {
  if (!viewing) notifyBackgroundDone(sessionId)
}

watch(
  () => badgeMap(),
  () => bumpDocTitle(),
  { deep: true },
)

function stopCurrentStream() {
  const sid = currentSessionId.value
  if (sid == null) return
  const job = getJob(sid)
  if (!job || job.status !== 'running') return
  const aid = job.assistantMsgId
  stopJob(sid)
  const msg = findInBag(sid, aid)
  if (msg) {
    msg.streaming = false
    msg.waiting = false
    msg.stopped = true
    msg.status = 'stopped'
    if (job.kind === 'image' && !msg.images?.length) {
      msg.content = '已停止生成'
      msg.images = undefined
    } else if (!msg.content.trim() && !msg.images?.length) {
      msg.content = '已停止生成'
    } else if (!msg.content.includes('已停止')) {
      // 保留已流出文本，底部用标记展示
    }
  }
}

function onEscStop(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (lightboxUrl.value) {
      lightboxUrl.value = null
      return
    }
    if (streaming.value) stopCurrentStream()
  }
}

async function ensureSession(title: string): Promise<number | null> {
  if (currentSessionId.value) return currentSessionId.value
  try {
    const sess = await createChatSession({
      title: title.slice(0, 32),
      modelId: selectedModelId.value,
    })
    currentSessionId.value = sess.id
    messageBags.set(sess.id, [])
    bumpSession(sess)
    return sess.id
  } catch {
    return null
  }
}

async function send(fromDock = false, text?: string) {
  const raw = text ?? (fromDock ? inputDock.value : inputTop.value)
  const q = raw.trim()
  const imgs = pendingImages.value.map((x) => x.url)
  if (!q && !imgs.length) return
  if (imageUploading.value) return
  if (streaming.value) return
  if (!models.value.length || !selectedModelId.value) {
    showToast('尚未配置模型')
    toastDesc.value = '请先在控制台「厂商接入」点「同步模型」，再回来对话。'
    return
  }

  if (isImageModel.value && !q) {
    showToast('请输入描述')
    toastDesc.value = '生图模型需要文字描述，例如「一只坐在窗台的橘猫」。'
    return
  }

  const userText = q || (imgs.length ? '请分析这张图片' : '')
  if (!text) {
    if (fromDock) inputDock.value = ''
    else inputTop.value = ''
  } else {
    inputTop.value = ''
    inputDock.value = ''
  }
  const attachImgs = isImageModel.value ? [] : imgs
  const sizeForJob = imageSize.value || DEFAULT_IMAGE_SIZE
  pendingImages.value = []

  const titleSeed = userText || (isImageModel.value ? '图片生成' : '图片分析')
  const sessionId = await ensureSession(titleSeed)
  if (sessionId == null) {
    showToast('无法创建会话')
    toastDesc.value = '请检查网络后重试。'
    return
  }

  // 同会话未结束前禁止再发
  if (isRunning(sessionId)) {
    showToast('请稍候')
    toastDesc.value = '当前对话仍在生成中，可先停止或新建对话。'
    return
  }

  const bag = bagOf(sessionId)
  bag.push({
    id: ++msgId,
    role: 'user',
    content: userText,
    images: attachImgs.length ? [...attachImgs] : undefined,
  })

  const aid = ++msgId
  const forImage = isImageModel.value
  bag.push({
    id: aid,
    role: 'assistant',
    content: '',
    modelLabel: currentVariantLabel.value,
    streaming: true,
    waiting: !forImage,
    status: 'generating',
    imageSize: forImage ? sizeForJob : undefined,
  })
  stickToBottom.value = true
  scrollBottom(true)

  const modelId = selectedModelId.value
  const modelLabel = currentVariantLabel.value
  const job = startJob(sessionId, aid, forImage ? 'image' : 'chat')
  const viewingThis = () => currentSessionId.value === sessionId

  try {
    if (forImage) {
      if (looksLikeChatQuestion(userText)) {
        const msg = findInBag(sessionId, aid)
        if (msg) {
          msg.content = IMAGE_GUIDE
          msg.images = undefined
          msg.waiting = false
          msg.streaming = false
          msg.status = 'done'
        }
        if (msg) await persistRound(sessionId, userText, [], msg, modelId)
        finishJob(sessionId, 'done', { markUnread: !viewingThis() })
        maybeNotifyDone(sessionId, viewingThis())
        return
      }

      const result = await generateImage({
        model: modelId,
        prompt: userText,
        size: sizeForJob,
        signal: job.abortCtrl.signal,
      })
      const msg = findInBag(sessionId, aid)
      if (msg) {
        const revised = cleanDisplayText(result.revisedPrompt || '')
        msg.content = revised ? `已生成（提示词已优化）：${revised}` : '已生成图片'
        msg.images = resolveMediaUrls(result.images || [])
        msg.waiting = false
        if (!msg.images.length) {
          msg.content = '生图未返回图片，请检查厂商配置与额度，或换一种描述后重试'
          msg.status = 'error'
        } else {
          msg.status = 'done'
        }
      }
      if (msg) await persistRound(sessionId, userText, [], msg, modelId)
      const ok = msg?.status !== 'error'
      finishJob(sessionId, ok ? 'done' : 'error', {
        markUnread: !viewingThis(),
      })
      if (ok) maybeNotifyDone(sessionId, viewingThis())
      if (viewingThis()) scrollBottom()
    } else {
      const history: ChatMsg[] = bag
        .filter(
          (m) =>
            m.id !== aid &&
            (m.role === 'user' || m.role === 'assistant') &&
            (m.content || m.images?.length),
        )
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: toApiContent(m) }))

      const now = new Date()
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      const pad = (n: number) => String(n).padStart(2, '0')
      const nowText = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 星期${weekdays[now.getDay()]} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      const payload: ChatMsg[] = [
        {
          role: 'system',
          content: `你是极光AI助手。当前用户本地时间是：${nowText}（时区偏移 UTC${now.getTimezoneOffset() <= 0 ? '+' : '-'}${pad(Math.floor(Math.abs(now.getTimezoneOffset()) / 60))}:${pad(Math.abs(now.getTimezoneOffset()) % 60)}）。回答涉及「今天/现在」的问题时请以此时间为准。若用户附带图片，请结合图片内容进行分析与回答。`,
        },
        ...history,
      ]

      await streamChat({
        model: modelId,
        messages: payload,
        signal: job.abortCtrl.signal,
        onDelta: (delta) => {
          const msg = findInBag(sessionId, aid)
          if (!msg) return
          if (msg.waiting) msg.waiting = false
          msg.content += delta
          if (viewingThis()) scrollBottom()
        },
      })
      const msg = findInBag(sessionId, aid)
      if (msg && !msg.content) {
        msg.content = '（模型未返回内容，请检查后台厂商配置与 Key，并确认模型支持识图）'
      }
      if (msg) {
        msg.status = 'done'
        msg.waiting = false
        await persistRound(sessionId, userText, attachImgs, msg, modelId)
      }
      finishJob(sessionId, 'done', { markUnread: !viewingThis() })
      maybeNotifyDone(sessionId, viewingThis())
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      finishJob(sessionId, 'stopped')
      return
    }
    const msg = findInBag(sessionId, aid)
    if (msg) {
      msg.content = friendlyErrorMessage(e, forImage)
      msg.images = undefined
      msg.status = 'error'
      msg.waiting = false
    }
    finishJob(sessionId, 'error', { markUnread: !viewingThis() })
  } finally {
    const msg = findInBag(sessionId, aid)
    if (msg) {
      msg.streaming = false
      msg.waiting = false
      if (!msg.status || msg.status === 'generating') {
        msg.status = msg.stopped ? 'stopped' : 'done'
      }
    }
    // 修正 modelLabel（切走期间可能变型号，仍记发送时的）
    if (msg && !msg.modelLabel) msg.modelLabel = modelLabel
  }
}

function newChat() {
  // 不中断其他会话的后台任务
  currentSessionId.value = null
  draftMessages.value = []
  inputTop.value = ''
  inputDock.value = ''
  pendingImages.value = []
  chartsExpanded.value = false
  activeNavKey.value = 'chat'
  nextTick(() => {
    if (workspaceRef.value) workspaceRef.value.scrollTop = 0
  })
}

function logout() {
  stopAll()
  auth.logout()
  // 免登录模式下没有登录页可回，直接回首页（守卫会静默重建会话）
  router.replace(REQUIRE_LOGIN ? '/login' : '/')
}

function onDocClick() {
  quickMoreOpen.value = false
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    copyHint.value = '已复制'
    setTimeout(() => {
      copyHint.value = ''
    }, 1500)
    return true
  } catch {
    showToast('复制失败')
    toastDesc.value = '请检查浏览器剪贴板权限'
    return false
  }
}

function copyMessage(m: ChatMessage) {
  copyText(m.content || '')
}

async function regenerate(assistantId: number) {
  const sid = currentSessionId.value
  if (sid == null) return
  if (isRunning(sid)) stopJob(sid)
  const bag = bagOf(sid)
  const idx = bag.findIndex((m) => m.id === assistantId)
  if (idx < 0) return
  const assistant = bag[idx]!
  if (assistant.role !== 'assistant') return
  let userMsg: ChatMessage | undefined
  for (let i = idx - 1; i >= 0; i--) {
    if (bag[i]!.role === 'user') {
      userMsg = bag[i]
      break
    }
  }
  if (!userMsg) return
  // 去掉本条及之后（避免分叉）
  bag.splice(idx)
  editingUserId.value = null
  const prompt = userMsg.content
  const imgs = userMsg.images || []
  if (imgs.length) {
    pendingImages.value = imgs.map((url, i) => ({ url, name: `ref-${i}.png` }))
  }
  await send(true, prompt)
}

/** 失败气泡「重试」：等同对该助手消息重新生成 */
async function retryMessage(assistantId: number) {
  await regenerate(assistantId)
}

function startEditUser(m: ChatMessage) {
  if (m.role !== 'user') return
  editingUserId.value = m.id
  editDraft.value = m.content || ''
}

function cancelEditUser() {
  editingUserId.value = null
  editDraft.value = ''
}

async function commitEditUser() {
  const sid = currentSessionId.value
  const uid = editingUserId.value
  if (sid == null || uid == null) return
  const text = editDraft.value.trim()
  if (!text) return

  // 与后台 job 冲突：先停该会话
  if (isRunning(sid)) stopJob(sid)

  const bag = bagOf(sid)
  const idx = bag.findIndex((m) => m.id === uid)
  if (idx < 0) return
  const userMsg = bag[idx]!
  if (userMsg.role !== 'user') return

  const imgs = userMsg.images || []
  // 产品定死：截断该条之后的消息再重发
  bag.splice(idx)
  editingUserId.value = null
  editDraft.value = ''

  // 首条用户消息编辑时同步标题
  if (idx === 0) {
    const title = text.slice(0, 32)
    try {
      const brief = await renameChatSession(sid, title)
      bumpSession(brief)
    } catch {
      /* 标题失败不影响重发 */
    }
  }

  if (imgs.length) {
    pendingImages.value = imgs.map((url, i) => ({ url, name: `ref-${i}.png` }))
  }
  await send(true, text)
}

function onMdClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement | null)?.closest?.('.md-code-copy') as HTMLElement | null
  if (!btn) return
  e.preventDefault()
  const block = btn.closest('.md-code-block')
  const code = block?.querySelector('code')?.textContent || ''
  if (!code) return
  void copyText(code).then((ok) => {
    if (!ok) return
    btn.classList.add('copied')
    btn.textContent = '已复制'
    setTimeout(() => {
      btn.classList.remove('copied')
      btn.textContent = '复制'
    }, 1500)
  })
}

function openLightbox(url: string) {
  lightboxUrl.value = url
}

async function downloadImage(url: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    const obj = URL.createObjectURL(blob)
    a.href = obj
    const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg'
    a.download = `aurora-${Date.now()}.${ext}`
    a.click()
    URL.revokeObjectURL(obj)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  const map = badgeMap()
  if (Object.values(map).some((b) => b === 'generating')) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  loadModels()
  loadSessions()
  window.addEventListener('keydown', onEscStop)
  window.addEventListener('beforeunload', onBeforeUnload)
  // 后台完成通知：已授权则用；未决定时轻量请求一次
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  } catch {
    /* ignore */
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEscStop)
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (softToastTimer) clearTimeout(softToastTimer)
  if (titleFlashTimer) clearInterval(titleFlashTimer)
  document.title = PAGE_TITLE
  stopAll()
})
</script>

<template>
  <div class="chat-page" @click="onDocClick">
    <div class="mask" :class="{ show: siderOpen }" @click="siderOpen = false"></div>

    <FeatureToast
      :show="toastShow"
      :title="toastTitle"
      :desc="toastDesc"
      @close="toastShow = false"
    />

    <div v-if="copyHint" class="copy-toast">{{ copyHint }}</div>

    <div v-if="softToast" class="soft-toast" role="status">
      <span>{{ softToast.text }}</span>
      <button type="button" @click="openSession(softToast.sessionId); softToast = null">查看</button>
    </div>

    <div
      v-if="lightboxUrl"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      @click.self="lightboxUrl = null"
    >
      <button class="lightbox-close" type="button" aria-label="关闭" @click="lightboxUrl = null">
        <i class="ri-close-line"></i>
      </button>
      <img :src="lightboxUrl" alt="预览" />
    </div>

    <div class="app" :class="{ 'banner-hidden': bannerHidden }">
      <div class="top-banner">
        <div class="banner-placeholder">
          <span>极光AI 四周年庆 · 会员低至 <strong>8 折</strong>，畅享全场模型与工具</span>
        </div>
        <button
          class="banner-close"
          type="button"
          aria-label="关闭"
          @click="bannerHidden = true"
        >
          <i class="ri-close-line"></i>
        </button>
      </div>

      <div class="shell">
        <SideNav
          :sections="navSections"
          :collapsed="siderCollapsed"
          :open="siderOpen"
          :active-key="activeNavKey"
          :history="sessions"
          :active-session-id="currentSessionId"
          :session-badges="sessionBadges"
          @toggle-collapse="siderCollapsed = !siderCollapsed"
          @new-chat="siderOpen = false; newChat()"
          @select="onNavSelect"
          @select-session="openSession"
          @delete-session="removeSession"
          @batch-delete-sessions="removeSessions"
          @rename-session="onRenameSession"
        />

        <section class="main">
          <div class="mobile-bar">
            <button class="icon-btn" type="button" aria-label="菜单" @click="siderOpen = true">
              <i class="ri-menu-line"></i>
            </button>
            <div class="brand">
              <img :src="LOGO" alt="" />
              极光AI
            </div>
          </div>

          <header class="topbar">
            <button class="btn-new" type="button" @click="newChat">
              <i class="ri-add-line"></i>新建对话
            </button>
            <button class="btn-new" type="button" title="退出登录" @click="logout">
              <i class="ri-logout-box-r-line"></i>退出
            </button>

            <ModelPicker
              v-model:open="modelPanelOpen"
              :model="currentModel"
              :models="models"
              @select="selectModel"
              @setting="showToast('模型设置')"
            />

            <div class="switch-mode">
              <button
                type="button"
                :class="{ active: chatMode === 'default' }"
                @click="chatMode = 'default'"
              >
                模型对话
              </button>
              <button
                type="button"
                :class="{ active: chatMode === 'agent' }"
                @click="chatMode = 'agent'"
              >
                Agent模式
              </button>
              <button
                type="button"
                :class="{ active: chatMode === 'groups' }"
                @click="chatMode = 'groups'"
              >
                超级对话
              </button>
            </div>

            <div class="top-right">
              <span class="vip-pill"><i class="ri-vip-crown-line"></i>升级会员</span>
              <button class="icon-btn" type="button" title="通知">
                <i class="ri-notification-3-line"></i><span class="dot"></span>
              </button>
              <button class="icon-btn" type="button" title="帮助">
                <i class="ri-question-line"></i>
              </button>
              <button class="icon-btn" type="button" title="设置">
                <i class="ri-settings-3-line"></i>
              </button>
              <button class="user-entry" type="button">
                <span class="av">游</span>
                <span class="uname">游客</span>
              </button>
            </div>
          </header>

          <div ref="workspaceRef" class="workspace" @scroll="onWorkspaceScroll" @click="onMdClick">
            <div class="ws-inner">
              <div v-show="!inChat" class="welcome">
                <div class="hero">
                  <div class="hero-greet">
                    <span class="greet">您好，</span>
                    <div class="type-line">
                      <span class="type-text">{{ typeText }}</span>
                      <span class="type-caret" aria-hidden="true"></span>
                    </div>
                  </div>
                  <SeriesCarousel />
                </div>

                <ComposerBox
                  ref="composerTopRef"
                  v-model="inputTop"
                  v-model:images="pendingImages"
                  v-model:deep-think="deepThink"
                  v-model:internet="internet"
                  v-model:uploading="imageUploading"
                  v-model:image-size="imageSize"
                  :image-mode="isImageModel"
                  :placeholder="placeholder"
                  :streaming="streaming"
                  :variants="currentVariants"
                  :selected-model-id="selectedModelId"
                  @select-variant="selectVariant"
                  @send="send(false)"
                  @stop="stopCurrentStream"
                />

                <div class="quick-row" @click.stop>
                  <div class="quick-group">
                    <button
                      v-for="q in flatQuick.slice(0, 2)"
                      :key="q.key"
                      class="quick-chip"
                      :class="quickAccent(q.key)"
                      type="button"
                      @click="fillInput(q.q)"
                    >
                      <i :class="q.icon" aria-hidden="true"></i>{{ q.name }}
                    </button>
                  </div>
                  <span class="quick-sep" aria-hidden="true"></span>
                  <div class="quick-group">
                    <button
                      v-for="q in flatQuick.slice(2)"
                      :key="q.key"
                      class="quick-chip"
                      type="button"
                      @click="fillInput(q.q)"
                    >
                      <i :class="q.icon" aria-hidden="true"></i>{{ q.name }}
                    </button>
                  </div>
                  <template v-if="restQuick.length">
                    <button
                      class="quick-more"
                      type="button"
                      @click="quickMoreOpen = !quickMoreOpen"
                    >
                      更多 <i class="ri-arrow-down-s-line"></i>
                    </button>
                    <div class="quick-pop" :class="{ open: quickMoreOpen }">
                      <button
                        v-for="q in restQuick"
                        :key="q.key"
                        class="quick-chip"
                        type="button"
                        @click="quickMoreOpen = false; fillInput(q.q)"
                      >
                        <i :class="q.icon" aria-hidden="true"></i>{{ q.name }}
                      </button>
                    </div>
                  </template>
                </div>

                <div class="discover">
                  <div class="section-block">
                    <div class="section-hd">
                      <div class="section-title">
                        <span class="section-bar" aria-hidden="true"></span>
                        示例提示词
                      </div>
                      <button class="more-pill" type="button" @click="shufflePrompts">
                        换一批 <i class="ri-refresh-line"></i>
                      </button>
                    </div>
                    <div class="prompt-grid">
                      <button
                        v-for="(p, idx) in visiblePrompts"
                        :key="`${promptOffset}-${idx}`"
                        class="prompt-card"
                        type="button"
                        @click="fillInput(p.message)"
                      >
                        <div class="pt">{{ p.title }}</div>
                        <i class="corner ri-arrow-right-up-line" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>

                  <div class="section-block">
                    <div class="section-hd">
                      <div class="section-title">
                        <span class="section-bar" aria-hidden="true"></span>
                        支持图表类型
                      </div>
                      <button
                        v-if="charts.length > CHART_PREVIEW"
                        class="more-pill"
                        type="button"
                        @click="chartsExpanded = !chartsExpanded"
                      >
                        {{ chartsExpanded ? '收起' : `展开全部 · ${charts.length}` }}
                        <i :class="chartsExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'"></i>
                      </button>
                    </div>
                    <div class="chart-grid">
                      <div
                        v-for="c in visibleCharts"
                        :key="c.name"
                        class="chart-item"
                        role="button"
                        tabindex="0"
                        @click="appendChart(c.name)"
                        @keydown.enter="appendChart(c.name)"
                      >
                        <div class="chart-thumb">
                          <img :src="c.image" :alt="c.name" loading="lazy" />
                        </div>
                        <span>{{ c.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-show="inChat" class="msgs show">
                <div v-for="m in messages" :key="m.id" class="msg" :class="m.role">
                  <div class="m-avatar">
                    <i v-if="m.role === 'user'" class="ri-user-3-line"></i>
                    <img v-else :src="LOGO" alt="" />
                  </div>
                  <div class="m-body">
                    <div class="m-role">
                      {{ m.role === 'user' ? '你' : `极光AI · ${m.modelLabel || currentVariantLabel}` }}
                    </div>

                    <!-- 生图占位 -->
                    <ImageGenPlaceholder
                      v-if="
                        m.role === 'assistant' &&
                        m.status === 'generating' &&
                        m.imageSize &&
                        !m.images?.length
                      "
                      :size="m.imageSize"
                    />

                    <div v-if="m.images?.length" class="m-images">
                      <div
                        v-for="(src, i) in m.images"
                        :key="src + i"
                        class="m-image-wrap"
                      >
                        <button
                          class="m-image"
                          type="button"
                          @click="openLightbox(src)"
                        >
                          <img :src="src" alt="图片" loading="lazy" />
                        </button>
                        <div
                          v-if="m.role === 'assistant' && !m.streaming"
                          class="m-image-actions"
                        >
                          <button type="button" title="放大" @click="openLightbox(src)">
                            <i class="ri-fullscreen-line"></i>
                          </button>
                          <button type="button" title="下载" @click="downloadImage(src)">
                            <i class="ri-download-line"></i>
                          </button>
                          <button type="button" title="再生成" @click="regenerate(m.id)">
                            <i class="ri-refresh-line"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="m.role === 'assistant' && m.waiting"
                      class="m-waiting"
                      aria-live="polite"
                    >
                      <span class="dot-pulse"></span>
                      <span class="dot-pulse"></span>
                      <span class="dot-pulse"></span>
                    </div>
                    <div
                      v-else-if="m.role === 'assistant' && m.content"
                      class="m-content m-md"
                      v-html="renderMarkdown(m.content)"
                    ></div>
                    <div
                      v-else-if="m.role === 'user' && editingUserId === m.id"
                      class="m-edit-box"
                    >
                      <textarea
                        v-model="editDraft"
                        rows="3"
                        @keydown.ctrl.enter.prevent="commitEditUser"
                        @keydown.meta.enter.prevent="commitEditUser"
                        @keydown.esc.prevent="cancelEditUser"
                      />
                      <div class="m-edit-actions">
                        <button type="button" @click="cancelEditUser">取消</button>
                        <button class="m-edit-ok" type="button" @click="commitEditUser">发送</button>
                      </div>
                    </div>
                    <div v-else-if="m.role === 'user' && m.content" class="m-content">
                      {{ m.content }}
                    </div>
                    <span v-if="m.streaming && !m.waiting" class="cursor"></span>
                    <div v-if="m.stopped && !m.streaming" class="m-stopped">已停止生成</div>

                    <button
                      v-if="m.role === 'assistant' && m.status === 'error' && !m.streaming"
                      class="m-retry"
                      type="button"
                      @click="retryMessage(m.id)"
                    >
                      <i class="ri-refresh-line"></i> 重试
                    </button>

                    <div
                      v-if="m.role === 'assistant' && !m.streaming && (m.content || m.images?.length)"
                      class="m-actions"
                    >
                      <button type="button" title="复制" @click="copyMessage(m)">
                        <i class="ri-file-copy-line"></i>
                      </button>
                      <button type="button" title="重新生成" @click="regenerate(m.id)">
                        <i class="ri-refresh-line"></i>
                      </button>
                    </div>
                    <div
                      v-else-if="m.role === 'user' && m.content && editingUserId !== m.id"
                      class="m-actions"
                    >
                      <button type="button" title="复制" @click="copyMessage(m)">
                        <i class="ri-file-copy-line"></i>
                      </button>
                      <button type="button" title="编辑" @click="startEditUser(m)">
                        <i class="ri-edit-line"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="composer-dock" :class="{ show: inChat }">
            <ComposerBox
              ref="composerDockRef"
              v-model="inputDock"
              v-model:images="pendingImages"
              v-model:deep-think="deepThink"
              v-model:internet="internet"
              v-model:uploading="imageUploading"
              v-model:image-size="imageSize"
              :image-mode="isImageModel"
              :placeholder="dockPlaceholder"
              :streaming="streaming"
              :variants="currentVariants"
              :selected-model-id="selectedModelId"
              compact-attach
              @select-variant="selectVariant"
              @send="send(true)"
              @stop="stopCurrentStream"
            />
            <div class="dock-tip">内容由 AI 生成，请仔细甄别</div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  height: 100%;
  font-family: var(--font);
}
</style>
