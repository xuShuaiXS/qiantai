<script setup lang="ts">
import { onMounted, reactive, ref, nextTick, computed } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { streamChat, fetchModelFamilies } from '@/api/chat'
import { useAiCanvasStore } from '@/stores/aiCanvas'
import { useMessage } from '@/composables/useMessage'

const FLOW_ID = 'ai-canvas'
const store = useAiCanvasStore()
const message = useMessage()
const { findNode, updateNodeData } = useVueFlow(FLOW_ID)

const input = ref('')
const chatEl = ref<HTMLElement | null>(null)

const emit = defineEmits<{ (e: 'close'): void }>()

const canApply = computed(() => {
  const id = store.selectedNodeId
  if (!id) return false
  const node = findNode(id)
  return !!node && node.type === 'text'
})

async function loadModel() {
  try {
    const families = await fetchModelFamilies()
    const opts = families
      .filter((f) => f.capability === 'chat')
      .flatMap((f) => (f.variants || []).map((v) => v.modelId))
    if (opts.includes('glm-5.3-flash')) store.inspirationModel = 'glm-5.3-flash'
    else if (opts.length) store.inspirationModel = opts[0] || ''
  } catch {
    /* 拉取失败时用空模型，发送时会提示 */
  }
}

function scrollBottom() {
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight
  })
}

function buildMessages(text: string) {
  const history = store.inspirationMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.text }))
  return [
    {
      role: 'system' as const,
      content:
        '你是极光AI的创意提示词助手。用户描述想法，你负责把它写成清晰、富含画面细节的中文生图提示词。只输出提示词本身，不要解释、不要前缀。',
    },
    ...history,
    { role: 'user' as const, content: text },
  ]
}

async function send() {
  const text = input.value.trim()
  if (!text || store.inspirationLoading) return
  if (!store.inspirationModel) {
    message.warning('未加载到对话模型，请稍后重试')
    return
  }
  store.inspirationMessages.push({ role: 'user', text })
  input.value = ''
  const ai = reactive<{ role: 'assistant'; text: string; state?: 'thinking' | 'done' | 'error' }>({
    role: 'assistant',
    text: '',
    state: 'thinking',
  })
  store.inspirationMessages.push(ai)
  store.inspirationLoading = true
  scrollBottom()
  try {
    await streamChat({
      model: store.inspirationModel,
      messages: buildMessages(text),
      onDelta: (t) => {
        ai.text += t
        scrollBottom()
      },
    })
    ai.state = 'done'
  } catch (err) {
    ai.state = 'error'
    ai.text = err instanceof Error ? err.message : '对话失败'
  } finally {
    store.inspirationLoading = false
    store.persistInspiration()
    scrollBottom()
  }
}

function applyToNode() {
  const id = store.selectedNodeId
  if (!id) {
    message.warning('请先在画布中选中一个「文本」节点')
    return
  }
  const node = findNode(id)
  if (!node || node.type !== 'text') {
    message.warning('选中的不是「文本」节点')
    return
  }
  const last = [...store.inspirationMessages].reverse().find((m) => m.role === 'assistant' && m.text)
  if (!last) {
    message.warning('还没有可应用的提示词，先聊一句吧')
    return
  }
  updateNodeData(id, { prompt: last.text.trim() })
  message.success('已写入选中的文本节点')
}

onMounted(() => {
  store.loadInspiration()
  loadModel()
})
</script>

<template>
  <aside class="inspiration">
    <header class="insp-head">
      <span class="insp-head__avatar">✦</span>
      <div>
        <strong>灵感画板</strong>
        <small>对话生成提示词，一键写入节点</small>
      </div>
      <button class="insp-close" type="button" title="关闭" @click="emit('close')">✕</button>
    </header>

    <div ref="chatEl" class="insp-chat">
      <template v-if="store.inspirationMessages.length">
        <div
          v-for="(m, i) in store.inspirationMessages"
          :key="i"
          class="insp-msg"
          :class="m.role === 'user' ? 'insp-msg--user' : 'insp-msg--ai'"
        >
          <div class="insp-msg__bubble">
            <template v-if="m.role === 'assistant'">
              <span v-if="m.state === 'thinking' && !m.text" class="insp-typing"><i /><i /><i /></span>
              <template v-else>{{ m.text }}<span v-if="m.state === 'error'" class="insp-err">（{{ m.text }}）</span></template>
            </template>
            <template v-else>{{ m.text }}</template>
          </div>
        </div>
      </template>
      <div v-else class="insp-empty">
        <span class="insp-empty__icon">💡</span>
        <p>告诉我你想要什么画面，我来帮你写提示词。</p>
        <small>选中画布里的「文本」节点后，可一键把结果写回。</small>
      </div>
    </div>

    <div class="insp-actions">
      <button class="insp-apply" type="button" :disabled="!canApply" @click="applyToNode">
        应用到选中节点
      </button>
    </div>

    <div class="insp-input">
      <textarea
        v-model="input"
        class="insp-input__field"
        rows="2"
        maxlength="500"
        placeholder="例如：帮我写一段赛博朋克风格的城市夜景提示词"
        @keydown.enter.exact.prevent="send"
      />
      <button class="insp-send" type="button" :disabled="store.inspirationLoading" @click="send">
        发送
      </button>
    </div>
  </aside>
</template>

<style scoped>
.inspiration {
  position: absolute;
  top: 64px;
  right: 16px;
  bottom: 84px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  width: 344px;
  min-height: 0;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: #17171c;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  overflow: hidden;
}
.insp-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.insp-close {
  margin-left: auto;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8a8a93;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.insp-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.insp-head__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2f6bff, #5ea0ff);
  font-size: 16px;
  color: #fff;
}
.insp-head strong {
  display: block;
  font-size: 13px;
  color: #e8eaf2;
}
.insp-head small {
  display: block;
  color: #8b93a8;
  font-size: 10.5px;
}
.insp-chat {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}
.insp-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.insp-msg--user {
  flex-direction: row-reverse;
}
.insp-msg__bubble {
  max-width: 86%;
  padding: 9px 12px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}
.insp-msg--user .insp-msg__bubble {
  background: linear-gradient(135deg, #2f6bff, #5ea0ff);
  color: #fff;
  border-top-right-radius: 4px;
}
.insp-msg--ai .insp-msg__bubble {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top-left-radius: 4px;
  color: #e8eaf2;
}
.insp-err {
  color: #f87171;
}
.insp-typing {
  display: inline-flex;
  gap: 4px;
  padding: 4px 0;
}
.insp-typing i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4d82ff;
  animation: insp-blink 1.2s infinite;
}
.insp-typing i:nth-child(2) {
  animation-delay: 0.2s;
}
.insp-typing i:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes insp-blink {
  0%, 80%, 100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}
.insp-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8b93a8;
  text-align: center;
}
.insp-empty__icon {
  font-size: 32px;
}
.insp-empty p {
  margin: 0;
  font-size: 13px;
}
.insp-empty small {
  color: #6b7288;
  font-size: 11px;
  line-height: 1.6;
}
.insp-actions {
  padding: 0 14px 8px;
}
.insp-apply {
  width: 100%;
  height: 32px;
  border: 1px solid rgba(47, 107, 255, 0.55);
  border-radius: 9px;
  background: rgba(47, 107, 255, 0.14);
  color: #a9c4ff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.insp-apply:hover:not(:disabled) {
  background: rgba(47, 107, 255, 0.28);
  color: #fff;
}
.insp-apply:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.insp-input {
  margin: 0 14px 14px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}
.insp-input:focus-within {
  border-color: rgba(124, 92, 255, 0.7);
}
.insp-input__field {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  resize: none;
  color: #e8eaf2;
  font-size: 12.5px;
  line-height: 1.6;
  outline: none;
}
.insp-input__field::placeholder {
  color: #6b7288;
}
.insp-send {
  margin-top: 8px;
  width: 100%;
  height: 30px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(135deg, #2f6bff, #5ea0ff);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.insp-send:hover:not(:disabled) {
  filter: brightness(1.1);
}
.insp-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
