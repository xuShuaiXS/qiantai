<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/assets/css/agents.css'
import { fetchModelFamilies, streamChat } from '@/api/chat'
import {
  appendChatMessages,
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  type ChatSessionItem,
} from '@/api/chat'
import { getToken } from '@/api/auth'
import { renderMarkdown } from '@/utils/markdown'
import type { AgentItem } from '@/api/agents'
import { getAgent } from '@/api/agents'
import BaseSelect from '@/components/BaseSelect.vue'

const route = useRoute()
const router = useRouter()

const agent = ref<AgentItem | null>(null)
const loadError = ref('')
const loading = ref(true)

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const messages = ref<ChatMessage[]>([])
const input = ref('')
const sending = ref(false)
let abort: AbortController | null = null

const msgsEl = ref<HTMLElement | null>(null)

/* ---------------- 会话管理（服务端存储，跨设备/刷新不丢） ---------------- */

const sessions = ref<ChatSessionItem[]>([])
const activeSessionId = ref<number | null>(null)

/** 可选模型：Chat-xs（providerCode=gpt-xs）旗下的对话模型；拉取失败时回退为当前模型一项 */
const modelOptions = ref<{ value: string; label: string; desc?: string }[]>([])
const activeModelId = ref('')

/** Chat-xs 是对话模型供应商（后端 providerCode: gpt-xs） */
async function loadModels() {
  const fallback = () => {
    if (activeModelId.value) {
      modelOptions.value = [{ value: activeModelId.value, label: activeModelId.value }]
    }
  }
  if (!getToken()) return fallback()
  try {
    const families = await fetchModelFamilies()
    const options = families
      .filter((f) => f.providerCode === 'gpt-xs' && f.capability === 'chat')
      .flatMap((f) =>
        (f.variants || []).map((v) => ({ value: v.modelId, label: v.name, desc: f.name })),
      )
    // 兜底：Chat-xs 通道暂无对话模型时展示全部对话模型
    const finalOptions = options.length
      ? options
      : families
          .filter((f) => f.capability === 'chat')
          .flatMap((f) =>
            (f.variants || []).map((v) => ({ value: v.modelId, label: v.name, desc: f.name })),
          )
    if (finalOptions.length) modelOptions.value = finalOptions
    // 当前模型不在可选列表时，自动切到第一个可选模型
    if (!finalOptions.some((o) => o.value === activeModelId.value) && finalOptions[0]) {
      activeModelId.value = finalOptions[0].value
    }
  } catch {
    fallback()
  }
}

function onModelChange(modelId: string) {
  activeModelId.value = modelId
  // 模型 id 随每条消息落库（appendMessages），会话的当前模型随之更新
  const s = sessions.value.find((x) => x.id === activeSessionId.value)
  if (s) s.modelId = modelId
}

async function refreshSessionList() {
  if (!agent.value) return
  try {
    sessions.value = await listChatSessions(50, agent.value.id)
  } catch {
    /* 会话列表拉取失败不打断对话，保留现状 */
  }
}

/** 打开会话：拉详情渲染消息并同步到地址栏 */
async function openSession(s: ChatSessionItem, syncUrl = true) {
  activeSessionId.value = s.id
  activeModelId.value = s.modelId || activeModelId.value
  messages.value = []
  if (syncUrl) {
    router.replace({ query: { ...route.query, s: String(s.id) } }).catch(() => {})
  }
  try {
    const detail = await getChatSession(s.id)
    messages.value = (detail.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    activeModelId.value = detail.modelId || activeModelId.value
  } catch {
    /* 详情拉取失败显示空会话，不影响发新消息 */
  }
  nextTick(scrollToBottom)
}

async function newSession() {
  if (!agent.value) return
  // 当前已是空会话时不重复新建
  if (activeSessionId.value != null && messages.value.length === 0) return
  try {
    const s = await createChatSession({
      agentId: agent.value.id,
      modelId: activeModelId.value || agent.value.modelId,
    })
    sessions.value.unshift(s)
    openSession(s)
  } catch {
    /* 建会话失败时下次发消息会再试 */
  }
}

async function onSelectSession(id: number) {
  if (activeSessionId.value === id) return
  abort?.abort()
  const s = sessions.value.find((x) => x.id === id)
  if (s) await openSession(s)
}

async function onRemoveSession(id: number) {
  if (!confirm('确定删除该会话？删除后不可恢复。')) return
  try {
    await deleteChatSession(id)
  } catch {
    /* 删除失败保留条目 */
  }
  await refreshSessionList()
  if (activeSessionId.value === id) {
    abort?.abort()
    activeSessionId.value = null
    messages.value = []
    if (sessions.value[0]) await openSession(sessions.value[0])
    else router.replace({ query: { ...route.query, s: undefined } }).catch(() => {})
  }
}

function relativeTime(ts: string | number): string {
  const t = typeof ts === 'string' ? new Date(ts).getTime() : ts
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  const d = new Date(t)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* ---------------- 页面加载 ---------------- */

onMounted(load)

onBeforeUnmount(() => {
  abort?.abort()
})

async function load() {
  const id = Number(route.params.id)
  if (!Number.isFinite(id)) {
    loadError.value = '无效的智能体 ID'
    loading.value = false
    return
  }
  try {
    agent.value = await getAgent(id)
    // 模型兜底：seed/历史数据的 modelId 可能为空，取第一个对话模型（未登录时跳过，避免触发 401 跳登录）
    if (!agent.value.modelId && getToken()) {
      const families = await fetchModelFamilies()
      const first = families
        .flatMap((f) => (f.variants || []).filter((v) => v.capability !== 'image').map((v) => v.modelId))
        .filter(Boolean)[0]
      if (first) agent.value.modelId = first
    }
    activeModelId.value = agent.value.modelId || ''
    await refreshSessionList()

    // 恢复会话：优先地址栏指定的，其次最近一个，都没有则不建（首条消息发出时才创建）
    const wantedId = typeof route.query.s === 'string' ? Number(route.query.s) : NaN
    const wanted = Number.isFinite(wantedId) ? sessions.value.find((x) => x.id === wantedId) : null
    if (wanted) {
      await openSession(wanted, false)
    } else if (sessions.value[0]) {
      await openSession(sessions.value[0], false)
    }

    loadModels()
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '智能体加载失败'
  } finally {
    loading.value = false
  }
}

/* ---------------- 发送 ---------------- */

async function ensureSession(): Promise<ChatSessionItem | null> {
  if (activeSessionId.value != null) {
    return sessions.value.find((x) => x.id === activeSessionId.value) || null
  }
  if (!agent.value) return null
  try {
    const s = await createChatSession({
      agentId: agent.value.id,
      modelId: activeModelId.value || agent.value.modelId,
    })
    sessions.value.unshift(s)
    activeSessionId.value = s.id
    router.replace({ query: { ...route.query, s: String(s.id) } }).catch(() => {})
    return s
  } catch {
    return null
  }
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value || !agent.value) return

  const session = await ensureSession()

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  await nextTick()
  scrollToBottom()

  const placeholder = reactive<ChatMessage>({ role: 'assistant', content: '' })
  messages.value.push(placeholder)
  sending.value = true
  abort = new AbortController()

  try {
    await streamChat({
      model: activeModelId.value || agent.value.modelId,
      messages: [
        { role: 'system', content: agent.value.systemPrompt },
        ...messages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      ],
      signal: abort.signal,
      onDelta(t) {
        placeholder.content += t
      },
    })
    if (!placeholder.content) placeholder.content = '（模型没有返回内容，请稍后重试或换个模型）'
  } catch (e) {
    if (abort.signal.aborted) {
      placeholder.content = placeholder.content || '（已停止生成）'
    } else {
      placeholder.content = `生成失败：${e instanceof Error ? e.message : '未知错误'}`
    }
  } finally {
    sending.value = false
    // 回合结束统一落库（用户消息 + 助手回复），标题由后端按首条用户消息生成
    if (session) {
      appendChatMessages(session.id, [
        { role: 'user', content: text },
        { role: 'assistant', content: placeholder.content, modelId: activeModelId.value },
      ])
        .then(() => refreshSessionList())
        .catch(() => {})
    }
    await nextTick()
    scrollToBottom()
  }
}

function stop() {
  abort?.abort()
}

/** 消息增长时滚到底部 */
watch(
  () => messages.value.map((m) => m.content.length).join(','),
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

function scrollToBottom() {
  const el = msgsEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}

function goBack() {
  router.push('/agents')
}

/** 代码块复制按钮（markdown 渲染产物内的事件委托） */
async function onMdClick(e: MouseEvent) {
  const btn = (e.target as HTMLElement | null)?.closest?.('.md-code-copy') as HTMLElement | null
  if (!btn) return
  e.preventDefault()
  const block = btn.closest('.md-code-block')
  const code = block?.querySelector('code')?.textContent || ''
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    btn.classList.add('copied')
    btn.textContent = '已复制'
    setTimeout(() => {
      btn.classList.remove('copied')
      btn.textContent = '复制'
    }, 1500)
  } catch {
    btn.textContent = '复制失败'
    setTimeout(() => {
      btn.textContent = '复制'
    }, 1500)
  }
}
</script>

<template>
  <div class="agent-chat">
    <!-- 左侧：会话栏 -->
    <aside v-if="agent" class="agent-side">
      <div class="agent-side__agent">
        <div class="agent-side__avatar">{{ agent.avatar }}</div>
        <div class="agent-side__meta">
          <strong>{{ agent.name }}</strong>
          <span>{{ sessions.length }} 个会话</span>
        </div>
      </div>
      <button class="agent-side__new" @click="newSession">＋ 新建会话</button>
      <div class="agent-side__list">
        <button
          v-for="s in sessions"
          :key="s.id"
          class="agent-side__item"
          :class="{ 'is-active': activeSessionId === s.id }"
          @click="onSelectSession(s.id)"
        >
          <span class="agent-side__title">{{ s.title }}</span>
          <span class="agent-side__time">{{ relativeTime(s.updatedAt) }}</span>
          <span
            class="agent-side__del"
            title="删除会话"
            @click.stop="onRemoveSession(s.id)"
          >×</span>
        </button>
        <p v-if="!sessions.length" class="agent-side__empty">暂无历史会话</p>
      </div>
    </aside>

    <!-- 右侧：对话主区 -->
    <div class="agent-chat__main">
      <header class="agent-chat__top">
        <button class="agent-chat__back" @click="goBack">← 返回市场</button>
        <template v-if="agent">
          <div class="agent-chat__avatar">{{ agent.avatar }}</div>
          <div style="min-width: 0">
            <h2 class="agent-chat__name">{{ agent.name }}</h2>
            <p class="agent-chat__desc">{{ agent.description || agent.systemPrompt }}</p>
          </div>
          <div class="agent-chat__modelpick">
            <BaseSelect
              :model-value="activeModelId"
              :options="modelOptions"
              label="模型"
              icon="⚡"
              @change="onModelChange"
            />
          </div>
        </template>
        <div v-else-if="loading" style="color: var(--agent-text-3); font-size: 13px">加载中…</div>
        <div v-else style="color: #e05a5a; font-size: 13px">{{ loadError }}</div>
      </header>

      <div ref="msgsEl" class="agent-chat__msgs">
        <div class="agent-chat__inner" @click="onMdClick">
          <template v-if="messages.length">
            <div
              v-for="(m, i) in messages"
              :key="i"
              class="agent-msg"
              :class="m.role === 'user' ? 'agent-msg--user' : 'agent-msg--assistant'"
            >
              <div class="agent-msg__role">{{ m.role === 'user' ? '🧑' : agent?.avatar || '🤖' }}</div>
              <!-- 助手消息渲染 Markdown（标题/列表/表格/代码块），用户消息保持纯文本 -->
              <div
                v-if="m.role === 'assistant' && m.content"
                class="agent-msg__bubble agent-md"
                v-html="renderMarkdown(m.content)"
              />
              <div v-else-if="m.role === 'assistant'" class="agent-msg__bubble">
                <span class="agent-typing"><i /><i /><i /></span>
              </div>
              <div v-else class="agent-msg__bubble">{{ m.content }}</div>
            </div>
          </template>
          <div v-else class="agent-empty" style="padding-top: 120px">
            <template v-if="agent">
              <div style="font-size: 44px; margin-bottom: 12px">{{ agent.avatar }}</div>
              <div>你好，我是{{ agent.name }}，{{ agent.description || '有什么可以帮你？' }}</div>
            </template>
          </div>
        </div>
      </div>

      <footer class="agent-chat__input">
        <div class="agent-chat__box">
          <textarea
            v-model="input"
            rows="1"
            placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
            @keydown="onKeydown"
          />
          <button v-if="sending" class="agent-chat__send" @click="stop">停止</button>
          <button v-else class="agent-chat__send" :disabled="!input.trim()" @click="send">发送</button>
        </div>
        <p class="agent-chat__hint">内容由 AI 生成，请注意甄别准确性 · 对话记录已云端保存，下次进入可继续</p>
      </footer>
    </div>
  </div>
</template>
