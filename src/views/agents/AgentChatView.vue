<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@/assets/css/agents.css'
import { fetchModelFamilies, streamChat } from '@/api/chat'
import { getToken } from '@/api/auth'
import type { AgentItem } from '@/api/agents'
import { getAgent } from '@/api/agents'

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
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '智能体加载失败'
  } finally {
    loading.value = false
  }
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value || !agent.value) return

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
      model: agent.value.modelId,
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
</script>

<template>
  <div class="agent-chat">
    <header class="agent-chat__top">
      <button class="agent-chat__back" @click="goBack">← 返回市场</button>
      <template v-if="agent">
        <div class="agent-chat__avatar">{{ agent.avatar }}</div>
        <div style="min-width: 0">
          <h2 class="agent-chat__name">{{ agent.name }}</h2>
          <p class="agent-chat__desc">{{ agent.description || agent.systemPrompt }}</p>
        </div>
        <span class="agent-chat__model">{{ agent.modelId || '默认模型' }}</span>
      </template>
      <div v-else-if="loading" style="color: var(--agent-text-3); font-size: 13px">加载中…</div>
      <div v-else style="color: #e05a5a; font-size: 13px">{{ loadError }}</div>
    </header>

    <div ref="msgsEl" class="agent-chat__msgs">
      <div class="agent-chat__inner">
        <template v-if="messages.length">
          <div
            v-for="(m, i) in messages"
            :key="i"
            class="agent-msg"
            :class="m.role === 'user' ? 'agent-msg--user' : 'agent-msg--assistant'"
          >
            <div class="agent-msg__role">{{ m.role === 'user' ? '🧑' : agent?.avatar || '🤖' }}</div>
            <div class="agent-msg__bubble">
              <template v-if="m.content">{{ m.content }}</template>
              <span v-else class="agent-typing"><i /><i /><i /></span>
            </div>
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
      <p class="agent-chat__hint">内容由 AI 生成，请注意甄别准确性 · 对话记录暂存于当前页面，刷新后清除</p>
    </footer>
  </div>
</template>
