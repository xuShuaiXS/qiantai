<script setup>
/**
 * 新AI修图 · 深色编辑器（对话式修图）
 *
 * 布局（参考设计稿）：
 *   左侧画布区：顶部「我的创作（作品数）」→ 中央画布只展示当前对应图片 → 底部工具条
 *   右侧对话面板：顶部标题 + 生图模型选择 → 对话消息流
 *                （用户消息带原图缩略图 / AI 流式分析 + 生成结果缩略图 / 快捷指令）
 *                → 底部输入区（附件 / 分析模型选择 / 发送）
 *
 * 修图链路（中转站暂不支持图生图）：
 *   1. 用户上传图片 + 输入修改要求
 *   2. 对话模型（Chat-xs，识图）流式分析修改要点，并输出【生图提示词】
 *   3. 提取提示词 → 文生图模型（gpt-image 系列）重新绘制整张图
 *   4. 生成结果进入对话与画布，可撤销/恢复
 *   识图失败时自动降级为纯文本分析；未上传图片则指令直接作为生图提示词。
 */
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'
import { createImageTask, fetchImageModels, uploadImage } from '@/api/imageGeneration'
import { fetchModelFamilies, streamChat } from '@/api/chat'
import { getToken } from '@/api/auth'
import { resolveMediaUrl } from '@/utils/mediaUrl'
import { downloadImage } from '@/utils/download'

const message = useMessage()

/* ---------------- 生图模型（后端图片能力配置） ---------------- */
const models = ref([])
const modelValue = ref('')
const modelOpen = ref(false)
const currentModelLabel = computed(
  () => models.value.find((item) => item.value === modelValue.value)?.label || '选择生图模型',
)

async function loadModels() {
  try {
    models.value = await fetchImageModels()
    if (models.value.length && !models.value.some((item) => item.value === modelValue.value)) {
      modelValue.value = models.value[0].value
    }
  } catch (err) {
    message.error(err?.message || '模型列表加载失败')
  }
}
function pickModel(value) {
  modelValue.value = value
  modelOpen.value = false
}

/* ---------------- 分析模型（Chat-xs 对话模型，识图分析用；内部自动选定） ---------------- */
const chatModel = ref('glm-5.3-flash')

async function loadChatModel() {
  if (!getToken()) return
  try {
    const families = await fetchModelFamilies()
    const options = families
      .filter((f) => f.providerCode === 'gpt-xs' && f.capability === 'chat')
      .flatMap((f) => (f.variants || []).map((v) => v.modelId))
    // 优先 glm-5.3-flash，否则取第一个
    if (options.includes('glm-5.3-flash')) chatModel.value = 'glm-5.3-flash'
    else if (options.length) chatModel.value = options[0]
  } catch {
    /* 拉取失败时用默认 glm-5.3-flash */
  }
}

/* ---------------- 画布与历史 ---------------- */
const sourceImage = ref('')
const currentImage = ref('')
const history = ref([])
const historyIndex = ref(-1)
const zoom = ref(100)
const uploading = ref(false)
const sending = ref(false)
const fileInput = ref(null)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)
const workCount = computed(() => history.value.length)

function pushHistory(url) {
  history.value = history.value.slice(0, historyIndex.value + 1)
  history.value.push(url)
  historyIndex.value = history.value.length - 1
  currentImage.value = url
}

function showOnCanvas(url) {
  if (url) currentImage.value = url
}

/* ---------------- 图片选择与上传 ---------------- */
function pickFile() {
  fileInput.value?.click()
}
async function onFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('请选择图片文件')
    return
  }
  uploading.value = true
  try {
    const url = await uploadImage(file)
    sourceImage.value = url
    pushHistory(url)
    chat.value.push({
      role: 'user',
      text: '（上传了原图，请在下方输入修改要求）',
      imageUrl: url,
    })
    scrollBottom()
    message.success('图片已上传，输入修改要求开始修图')
  } catch (err) {
    message.error(err?.message || '图片上传失败')
  } finally {
    uploading.value = false
  }
}

/* ---------------- 工具条 ---------------- */
function adjustZoom(delta) {
  zoom.value = Math.min(200, Math.max(50, zoom.value + delta))
}
function resetZoom() {
  zoom.value = 100
}
function undo() {
  if (!canUndo.value) return
  historyIndex.value -= 1
  currentImage.value = history.value[historyIndex.value] || ''
}
function redo() {
  if (!canRedo.value) return
  historyIndex.value += 1
  currentImage.value = history.value[historyIndex.value] || ''
}

/* ---------------- 对话式修图 ---------------- */
const CHAT_SYSTEM = [
  '你是AI修图助手。用户上传了一张图片并提出修改要求。',
  '请先用一两句话分析修改要点，然后必须另起一行输出：',
  '【生图提示词】+ 一段完整的中文画面描述。',
  '提示词要求：保留原图的主体、构图与风格特征，把用户的修改要求融合进去，',
  '形成可供文生图模型重新绘制整张图的完整描述（不要只写修改点）。',
  '除这两部分外不要输出其他内容。',
].join('\n')

const QUICK_ACTIONS = [
  '换成粉色裙子',
  '背景换成海边',
  '调整为夜景氛围',
  '改成动漫风格',
  '增加柔和光线',
  '换一套白色西装',
]

/* ---------------- 对话记录持久化（localStorage，按用户隔离） ---------------- */
const CHAT_STORE_KEY = 'jiguang_smart_edit_chat'
const CHAT_MAX = 100

function chatStoreKey() {
  let user = 'admin'
  try {
    user = localStorage.getItem('jiguang_current_username') || 'admin'
  } catch {
    /* ignore */
  }
  return `${CHAT_STORE_KEY}_${user}`
}

function loadStoredChat() {
  try {
    const raw = localStorage.getItem(chatStoreKey())
    if (!raw) return []
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    // 只恢复有效消息（忽略生成中未完成的）
    return list
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          (typeof m.text === 'string' || typeof m.imageUrl === 'string'),
      )
      .filter((m) => m.role !== 'assistant' || m.state === 'done' || m.state === 'error')
      .slice(-CHAT_MAX)
  } catch {
    return []
  }
}

function persistChat() {
  try {
    const done = chat.value
      .filter((m) => m.role === 'user' || m.state === 'done' || m.state === 'error')
      .slice(-CHAT_MAX)
    localStorage.setItem(chatStoreKey(), JSON.stringify(done))
  } catch {
    /* 存储满等异常忽略 */
  }
}

const chat = ref(loadStoredChat())
const chatEl = ref(null)
const instruction = ref('')

watch(chat, persistChat, { deep: true })

function scrollBottom() {
  nextTick(() => {
    const el = chatEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/** 组装发给分析模型的消息（带原图供识图；失败时降级纯文本重试） */
function buildAnalyzeMessages(text, withImage) {
  const historyMsgs = []
  // 仅带最近一轮生成提示词，控制上下文长度
  const lastPrompt = [...chat.value].reverse().find((m) => m.role === 'assistant' && m.prompt)
  if (lastPrompt) historyMsgs.push({ role: 'assistant', content: lastPrompt.prompt })
  const userContent = withImage && sourceImage.value
    ? [
        { type: 'text', text: `修改要求：${text}\n请按系统要求输出分析与【生图提示词】。` },
        { type: 'image_url', image_url: { url: resolveMediaUrl(sourceImage.value) } },
      ]
    : `修改要求：${text}\n（未能读取图片）请按系统要求输出分析与【生图提示词】，画面细节按常见情况合理假设。`
  historyMsgs.push({ role: 'user', content: userContent })
  return [{ role: 'system', content: CHAT_SYSTEM }, ...historyMsgs]
}

async function send() {
  const text = instruction.value.trim()
  if (!text) {
    message.warning('请先输入您想要的修改效果')
    return
  }
  if (!modelValue.value) {
    message.warning('暂无可用生图模型，请先在控制台配置')
    return
  }
  sending.value = true
  const userImageUrl = currentImage.value || sourceImage.value
  chat.value.push({ role: 'user', text, imageUrl: userImageUrl })
  instruction.value = ''
  scrollBottom()

  const ai = reactive({ role: 'assistant', text: '', imageUrl: '', state: 'analyzing', prompt: '', error: '' })
  chat.value.push(ai)

  try {
    const hasImage = !!sourceImage.value
    // 1) 对话模型流式分析（识图失败自动降级为纯文本）
    try {
      await streamChat({
        model: chatModel.value,
        messages: buildAnalyzeMessages(text, hasImage),
        onDelta(t) {
          ai.text += t
          scrollBottom()
        },
      })
    } catch (err) {
      if (hasImage) {
        ai.text = ''
        await streamChat({
          model: chatModel.value,
          messages: buildAnalyzeMessages(text, false),
          onDelta(t) {
            ai.text += t
            scrollBottom()
          },
        })
      } else {
        throw err
      }
    }
    if (!ai.text.trim()) ai.text = '（模型没有返回分析内容，将直接按您的描述生成）'

    // 2) 提取【生图提示词】（无标记则将全文作为提示词）
    const matched = ai.text.match(/【生图提示词】\s*([\s\S]+)/)
    const prompt = (matched?.[1] ?? ai.text).trim().slice(0, 900)
    ai.prompt = prompt || text
    ai.state = 'generating'
    scrollBottom()

    // 3) 文生图（中转站暂不支持图生图，整体重新绘制）
    const task = await createImageTask({
      prompt: ai.prompt,
      model: modelValue.value,
      size: '1024x1024',
      count: 1,
    })
    if (task.status === 'failed' || !task.images.length) {
      ai.state = 'error'
      ai.error = task.errorMessage || '生成失败，请稍后重试'
    } else {
      ai.state = 'done'
      const first = task.images[0]
      if (first) {
        ai.imageUrl = first.url
        pushHistory(first.url)
      }
    }
  } catch (err) {
    ai.state = 'error'
    ai.error = err instanceof Error ? err.message : '生成失败，请稍后重试'
  } finally {
    sending.value = false
    scrollBottom()
  }
}

function applyQuick(text) {
  instruction.value = instruction.value.trim() ? `${instruction.value.trim()}，${text}` : text
}

/* ---------------- 新建项目 ---------------- */
function newProject() {
  sourceImage.value = ''
  currentImage.value = ''
  history.value = []
  historyIndex.value = -1
  instruction.value = ''
  chat.value = []
  zoom.value = 100
  message.info('已开始新的修图项目')
}

onMounted(() => {
  loadModels()
  loadChatModel()
})
</script>

<template>
  <div class="editor">
    <!-- 左侧画布区 -->
    <main class="editor-canvas">
      <!-- 顶部操作 -->
      <header class="canvas-top">
        <span class="canvas-top__creation"><i>👤</i>我的创作<span class="canvas-top__count">（{{ workCount }} 张图片）</span></span>
      </header>

      <!-- 中央画布：只展示当前对应的图片 -->
      <div class="canvas-stage">
        <div class="canvas-stage__inner" :style="{ transform: `scale(${zoom / 100})` }">
          <template v-if="currentImage">
            <figure class="stage-figure">
              <img :src="currentImage" alt="当前修图画面" />
            </figure>
          </template>
          <template v-else>
            <h1 class="stage-title">上传一张图片开始修图</h1>
            <p class="stage-subtitle">动动嘴，一键PS</p>
            <button class="stage-upload" type="button" :disabled="uploading" @click="pickFile">
              <span class="stage-upload__icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>
              </span>
              <strong>{{ uploading ? '正在上传…' : '选择图片' }}</strong>
              <small>支持 JPG / PNG / WEBP，上传后在右侧对话中输入修改要求</small>
              <small style="display:block; margin-top:6px; color:#8b93a8;">当前中转站暂不支持基于原图修改，生成将按文字描述重新绘制画面</small>
            </button>
          </template>
        </div>
      </div>

      <!-- 底部工具条 -->
      <footer class="canvas-toolbar">
        <button class="tool-btn tool-btn--add" type="button" :disabled="uploading" @click="pickFile">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          添加
        </button>
        <span class="tool-divider" />
        <button class="tool-btn" type="button" @click="adjustZoom(-10)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" /></svg>
        </button>
        <button class="tool-btn tool-btn--zoom" type="button" @click="resetZoom">{{ zoom }}%</button>
        <button class="tool-btn" type="button" @click="adjustZoom(10)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6" /></svg>
        </button>
        <span class="tool-divider" />
        <button class="tool-btn" type="button" :disabled="!canUndo" @click="undo">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></svg>
          撤销
        </button>
        <button class="tool-btn" type="button" :disabled="!canRedo" @click="redo">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" /></svg>
          恢复
        </button>
      </footer>
    </main>

    <!-- 右侧：对话面板 -->
    <aside class="editor-side">
      <!-- 面板头：标题 -->
      <header class="side-head">
        <div class="side-head__title">
          <span class="side-head__avatar">🎨</span>
          <div>
            <strong>智能修图助手</strong>
            <small>上传图片，描述修改要求</small>
          </div>
        </div>
      </header>

      <!-- 对话消息流 -->
      <div ref="chatEl" class="side-chat">
        <template v-if="chat.length">
          <div
            v-for="(m, i) in chat"
            :key="i"
            class="chat-msg"
            :class="m.role === 'user' ? 'chat-msg--user' : 'chat-msg--ai'"
          >
            <div class="chat-msg__avatar">{{ m.role === 'user' ? '🧑' : '🎨' }}</div>
            <div class="chat-msg__col">
              <!-- 消息附图（用户原图 / AI 生成结果）：点击同步画布，可下载 -->
              <div v-if="m.imageUrl" class="chat-msg__imgwrap">
                <button
                  class="chat-msg__img"
                  type="button"
                  :title="'在左侧画布中查看'"
                  @click="showOnCanvas(m.imageUrl)"
                >
                  <img :src="m.imageUrl" alt="消息图片" loading="lazy" />
                </button>
                <button
                  class="chat-msg__dl"
                  type="button"
                  title="下载到本地"
                  @click.stop="downloadImage(m.imageUrl)"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                  下载
                </button>
              </div>
              <!-- 文本：AI 分析（流式）/ 用户指令 / 错误信息 -->
              <div
                v-if="m.role === 'assistant' ? (m.text || m.state === 'analyzing' || m.error) : m.text"
                class="chat-msg__bubble"
                :class="{ 'chat-msg__bubble--error': m.state === 'error' }"
              >
                <template v-if="m.role === 'assistant'">
                  <span v-if="m.state === 'analyzing' && !m.text" class="chat-typing"><i /><i /><i /></span>
                  <template v-else>{{ m.text }}<span v-if="m.state === 'error' && m.error" class="chat-err">（{{ m.error }}）</span></template>
                </template>
                <template v-else>{{ m.text }}</template>
              </div>
              <!-- 状态行 -->
              <div v-if="m.role === 'assistant'" class="chat-msg__state">
                <template v-if="m.state === 'generating'">
                  <span class="chat-typing chat-typing--inline"><i /><i /><i /></span> 正在按提示词重新绘制…
                </template>
                <template v-else-if="m.state === 'done'">✅ 已生成，点击图片可在左侧画布查看</template>
              </div>
            </div>
          </div>
        </template>

        <!-- 空态引导 -->
        <div v-else class="side-empty">
          <span class="side-empty__icon">💬</span>
          <p>{{ sourceImage ? '图片已就绪，输入修改要求开始修图' : '上传一张图片开始您的AI修图之旅~' }}</p>
          <button class="side-empty__demo" type="button" :disabled="uploading" @click="pickFile">
            {{ uploading ? '正在上传…' : '选择图片' }} <i>⬆</i>
          </button>
          <small class="side-empty__tip">中转站暂不支持图生图，将按对话分析出的提示词重新绘制整张图</small>
        </div>

        <!-- 快捷指令（有消息时显示在流底部） -->
        <div v-if="chat.length" class="side-quick">
          <button
            v-for="q in QUICK_ACTIONS"
            :key="q"
            class="side-quick__chip"
            type="button"
            :disabled="sending"
            @click="applyQuick(q)"
          >{{ q }}</button>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="side-input">
        <textarea
          v-model="instruction"
          class="side-input__field"
          rows="2"
          maxlength="500"
          placeholder="描述想要的修改效果，如：把裙子换成粉色"
          @keydown.enter.exact.prevent="send"
        />
        <div class="side-input__bar">
          <button class="bar-btn" type="button" title="选择图片" :disabled="uploading" @click="pickFile">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          </button>
          <!-- 生图模型选择（Pic-xs 等图片能力模型） -->
          <div class="bar-model-wrap">
            <button class="bar-model" type="button" :disabled="!models.length" @click="modelOpen = !modelOpen">
              <span class="bar-model__avatar">🖼</span>
              {{ currentModelLabel }}
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <ul v-if="modelOpen" class="bar-model__menu">
              <li v-for="item in models" :key="item.value">
                <button
                  class="bar-model__item"
                  :class="{ 'is-active': item.value === modelValue }"
                  type="button"
                  @click="pickModel(item.value)"
                >
                  <strong>{{ item.label }}</strong>
                  <small>生图模型 · {{ item.desc }}</small>
                </button>
              </li>
            </ul>
          </div>
          <span class="bar-spacer" />
          <button class="bar-send" type="button" :disabled="sending" title="发送" @click="send">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- 真实文件选择 -->
    <input ref="fileInput" class="file-input" type="file" accept="image/*" @change="onFileChange" />
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  /* 位于 ToolsShell 的内容区内：撑满剩余高度（外壳已定高 100dvh） */
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: #10131f;
  color: #e8eaf2;
  font-size: 13px;
}

/* ---------------- 左侧画布 ---------------- */
.editor-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-image: linear-gradient(rgba(255, 255, 255, .03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .03) 1px, transparent 1px);
  background-size: 44px 44px;
}

.canvas-top { position: absolute; top: 14px; left: 16px; z-index: 5; display: flex; align-items: center; gap: 10px; }
.canvas-top__creation { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .1); font-size: 12px; }
.canvas-top__creation i { font-style: normal; font-size: 13px; }
.canvas-top__count { color: #8b93a8; }

.canvas-stage { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 70px 24px 24px; }
.canvas-stage__inner { text-align: center; transition: transform .25s ease; transform-origin: center center; }

.stage-title { margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 2px; background: linear-gradient(92deg, #a855f7 10%, #ec4899 90%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 30px rgba(168, 85, 247, .35); }
.stage-subtitle { margin-top: 10px; color: #cfd4e4; font-size: 14px; letter-spacing: 1px; }

/* 画布中的当前图片（上传原图 / 生成结果） */
.stage-figure { margin: 0; display: flex; align-items: center; justify-content: center; }
.stage-figure img { max-width: min(62vw, 720px); max-height: 62vh; border-radius: 10px; background: #0b0e18; box-shadow: 0 18px 48px rgba(0, 0, 0, .5); }

/* 未上传时的上传引导 */
.stage-upload { display: inline-flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 20px; padding: 26px 44px; border: 1px dashed rgba(255, 255, 255, .22); border-radius: 16px; background: rgba(255, 255, 255, .03); color: #cfd4e4; cursor: pointer; transition: all .2s ease; }
.stage-upload:hover:not(:disabled) { border-color: #7c5cff; background: rgba(124, 92, 255, .1); color: #fff; }
.stage-upload:disabled { opacity: .6; cursor: not-allowed; }
.stage-upload__icon { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, #7c5cff, #a855f7); color: #fff; }
.stage-upload strong { font-size: 14px; }
.stage-upload small { color: #8b93a8; font-size: 11.5px; }

/* 隐藏的原生文件选择控件 */
.file-input { display: none; }

.canvas-toolbar { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); z-index: 5; display: flex; align-items: center; gap: 6px; padding: 6px; border: 1px solid rgba(255, 255, 255, .1); border-radius: 12px; background: rgba(23, 27, 42, .92); backdrop-filter: blur(6px); box-shadow: 0 10px 30px rgba(0, 0, 0, .4); }
.tool-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: transparent; color: #aeb5c9; font-size: 12px; cursor: pointer; transition: all .2s ease; }
.tool-btn:hover { background: rgba(255, 255, 255, .08); color: #fff; }
.tool-btn--add { background: #16a34a; color: #fff; font-weight: 600; }
.tool-btn--add:hover { background: #15803d; color: #fff; }
.tool-btn--zoom { min-width: 52px; justify-content: center; background: rgba(255, 255, 255, .08); color: #e8eaf2; }
.tool-divider { width: 1px; height: 18px; background: rgba(255, 255, 255, .12); }

/* ---------------- 右侧对话面板 ---------------- */
.editor-side { display: flex; flex-direction: column; gap: 0; width: 380px; flex: 0 0 380px; border-left: 1px solid rgba(255, 255, 255, .08); background: #12162a; min-height: 0; }

.side-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; border-bottom: 1px solid rgba(255, 255, 255, .08); }
.side-head__title { display: flex; align-items: center; gap: 9px; min-width: 0; }
.side-head__avatar { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: 0 0 auto; border-radius: 10px; background: linear-gradient(135deg, #7c5cff, #a855f7); font-size: 16px; }
.side-head__title strong { display: block; font-size: 13px; }
.side-head__title small { display: block; color: #8b93a8; font-size: 10.5px; }

/* 对话消息流 */
.side-chat { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 14px; }
.side-chat:empty { display: none; }

.chat-msg { display: flex; gap: 8px; align-items: flex-start; }
.chat-msg--user { flex-direction: row-reverse; }
.chat-msg__avatar { width: 26px; height: 26px; flex: 0 0 auto; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; background: rgba(255, 255, 255, .07); }
.chat-msg--user .chat-msg__avatar { background: rgba(124, 92, 255, .3); }
.chat-msg__col { display: flex; flex-direction: column; gap: 6px; max-width: 86%; min-width: 0; }
.chat-msg--user .chat-msg__col { align-items: flex-end; }

.chat-msg__imgwrap { position: relative; display: inline-block; }
.chat-msg__img { display: block; width: 132px; padding: 0; border: 1px solid rgba(255, 255, 255, .14); border-radius: 10px; overflow: hidden; cursor: pointer; transition: border-color .2s ease, transform .2s ease; background: #0b0e18; }
.chat-msg__img:hover { border-color: rgba(124, 92, 255, .8); transform: translateY(-1px); }
.chat-msg__img img { display: block; width: 100%; height: auto; }
.chat-msg__dl {
  position: absolute; right: 6px; bottom: 6px; display: inline-flex; align-items: center; gap: 4px;
  height: 26px; padding: 0 10px; border: none; border-radius: 999px;
  background: rgba(23, 36, 44, 0.75); color: #fff; font-size: 11px; cursor: pointer;
  opacity: 0; transform: translateY(5px); transition: all .2s ease; backdrop-filter: blur(4px);
}
.chat-msg__imgwrap:hover .chat-msg__dl { opacity: 1; transform: translateY(0); }
.chat-msg__dl:hover { background: linear-gradient(135deg, #7c5cff, #a855f7); }
@media (hover: none) { .chat-msg__dl { opacity: 1; transform: none; } } /* 触屏设备常显 */

.chat-msg__bubble { padding: 9px 12px; border-radius: 12px; font-size: 12.5px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
.chat-msg--user .chat-msg__bubble { background: linear-gradient(135deg, #7c5cff, #a855f7); color: #fff; border-top-right-radius: 4px; }
.chat-msg--ai .chat-msg__bubble { background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .1); border-top-left-radius: 4px; }
.chat-msg__bubble--error { border-color: rgba(239, 68, 68, .5) !important; }
.chat-err { color: #f87171; }

.chat-msg__state { font-size: 11px; color: #8b93a8; display: inline-flex; align-items: center; gap: 6px; }

/* 输入中动画 */
.chat-typing { display: inline-flex; gap: 4px; padding: 4px 0; }
.chat-typing--inline { padding: 0; }
.chat-typing i { width: 5px; height: 5px; border-radius: 50%; background: #a855f7; animation: chat-blink 1.2s infinite; }
.chat-typing i:nth-child(2) { animation-delay: .2s; }
.chat-typing i:nth-child(3) { animation-delay: .4s; }
@keyframes chat-blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }

/* 快捷指令 chips */
.side-quick { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 0 4px; }
.side-quick__chip { padding: 5px 11px; border: 1px solid rgba(255, 255, 255, .16); border-radius: 999px; background: rgba(255, 255, 255, .04); color: #cfd4e4; font-size: 11.5px; cursor: pointer; transition: all .18s ease; }
.side-quick__chip:hover:not(:disabled) { border-color: rgba(124, 92, 255, .7); background: rgba(124, 92, 255, .14); color: #fff; }
.side-quick__chip:disabled { opacity: .5; cursor: not-allowed; }

/* 空态引导 */
.side-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #8b93a8; padding: 20px; }
.side-empty__icon { font-size: 34px; opacity: .8; }
.side-empty p { margin: 0; font-size: 13px; }
.side-empty__tip { color: #6b7288; font-size: 11px; text-align: center; line-height: 1.6; }
.side-empty__demo { display: inline-flex; align-items: center; gap: 5px; padding: 8px 16px; border: 0; border-radius: 999px; background: linear-gradient(92deg, #7c5cff, #a855f7); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .2s ease; box-shadow: 0 6px 18px rgba(124, 92, 255, .35); }
.side-empty__demo:hover { filter: brightness(1.1); }
.side-empty__demo i { font-style: normal; }

/* 输入区 */
.side-input { margin: 0 14px 14px; padding: 12px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 14px; background: rgba(255, 255, 255, .04); transition: border-color .2s ease; }
.side-input:focus-within { border-color: rgba(124, 92, 255, .7); }
.side-input__field { display: block; width: 100%; border: 0; background: transparent; resize: none; color: #e8eaf2; font-size: 12.5px; line-height: 1.6; }
.side-input__field:focus { outline: none; }
.side-input__field::placeholder { color: #6b7288; }
.side-input__bar { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.bar-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 0; border-radius: 8px; background: transparent; color: #aeb5c9; cursor: pointer; transition: all .2s ease; }
.bar-btn:hover { background: rgba(255, 255, 255, .08); color: #fff; }
.bar-model { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 999px; background: transparent; color: #cfd4e4; font-size: 11.5px; cursor: pointer; transition: all .2s ease; }
.bar-model:hover { border-color: rgba(124, 92, 255, .6); color: #fff; }
.bar-model:disabled { opacity: .55; cursor: not-allowed; }
.bar-model__avatar { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #ec4899); font-size: 10px; }

/* 模型下拉菜单 */
.bar-model-wrap { position: relative; }
.bar-model__menu { position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 30; width: 250px; max-height: 240px; overflow-y: auto; padding: 6px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 12px; background: #191e33; box-shadow: 0 18px 40px rgba(0, 0, 0, .5); }
.side-head .bar-model__menu { left: auto; right: 0; bottom: calc(100% + 8px); }
.bar-model__menu li { list-style: none; }
.bar-model__item { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; color: #cfd4e4; text-align: left; cursor: pointer; transition: background .18s ease; }
.bar-model__item:hover { background: rgba(255, 255, 255, .07); color: #fff; }
.bar-model__item.is-active { background: rgba(124, 92, 255, .22); color: #fff; }
.bar-model__item strong { font-size: 12px; font-weight: 600; }
.bar-model__item small { color: #8b93a8; font-size: 10.5px; }

.bar-spacer { flex: 1; }
.bar-send { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 0; border-radius: 9px; background: linear-gradient(135deg, #7c5cff, #a855f7); color: #fff; cursor: pointer; transition: all .2s ease; }
.bar-send:hover { filter: brightness(1.12); }
.bar-send:disabled { opacity: .6; cursor: not-allowed; }

/* 工具条禁用态 */
.tool-btn:disabled { opacity: .36; cursor: not-allowed; }
.tool-btn:disabled:hover { background: transparent; color: #aeb5c9; }

/* ---------------- 响应式 ---------------- */
@media (max-width: 960px) {
  .editor { flex-direction: column; height: auto; min-height: 100%; overflow: auto; }
  .editor-canvas { min-height: 72vh; }
  .editor-side { width: auto; flex: none; border-left: 0; border-top: 1px solid rgba(255, 255, 255, .08); }
  .side-chat { min-height: 40vh; }
  .stage-title { font-size: 30px; }
}
</style>
