<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { useImageGenerationStore, IMAGE_SIZES } from '@/stores/imageGeneration'
import { createImageTask } from '@/api/imageGeneration'
import { useMessage } from '@/composables/useMessage'
import { useAiCanvasStore } from '@/stores/aiCanvas'
import { useCanvasAssetsStore } from '@/stores/canvasAssets'
import NodeLabel from '../components/NodeLabel.vue'
import ImageActionsToolbar from '../components/ImageActionsToolbar.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  data: {
    model?: string
    size?: string
    status?: 'idle' | 'running' | 'done' | 'error'
    imageUrl?: string
    error?: string
    revisedPrompt?: string
    label?: string
  }
  selected?: boolean
}>()

const FLOW_ID = 'ai-canvas'
const { updateNodeData, findNode, getEdges, removeNodes } = useVueFlow(FLOW_ID)
const imageStore = useImageGenerationStore()
const canvasStore = useAiCanvasStore()
const assetsStore = useCanvasAssetsStore()
const message = useMessage()

const modelOptions = computed(() => imageStore.models)
const model = computed({
  get: () => props.data.model || modelOptions.value[0]?.value || '',
  set: (v: string) => updateNodeData(props.id, { model: v }),
})
const size = computed({
  get: () => props.data.size || '1024x1024',
  set: (v: string) => updateNodeData(props.id, { size: v }),
})

const running = computed(() => props.data.status === 'running')

/** 从所有上游「文本」节点收集文案 */
function collectPrompt(): string {
  const prompts: string[] = []
  for (const e of getEdges.value) {
    if (e.target !== props.id) continue
    const src = findNode(e.source)
    if (src && src.type === 'text') {
      const p = (src.data?.prompt || '').trim()
      if (p) prompts.push(p)
    }
  }
  return prompts.join('\n')
}

/** 把生成结果推给下游「图像」节点（连同提示词/模型/尺寸，便于结果图直接改词重生成） */
function propagate(url: string, promptText: string, modelName: string, sizeValue: string) {
  for (const e of getEdges.value) {
    if (e.source !== props.id) continue
    const tgt = findNode(e.target)
    if (tgt && tgt.type === 'image') {
      updateNodeData(tgt.id, {
        imageUrl: url,
        prompt: promptText,
        model: modelName,
        size: sizeValue,
      })
    }
  }
}

async function run(extra = '') {
  if (running.value) return
  const base = collectPrompt()
  const prompt = [base, extra].filter(Boolean).join('，')
  if (!prompt) {
    message.warning('请先连接「文本」节点并填写内容')
    return
  }
  if (!model.value) {
    message.warning('后端未配置图片模型，请先在控制台配置')
    return
  }
  updateNodeData(props.id, { status: 'running', error: '' })
  try {
    const task = await createImageTask({
      prompt,
      model: model.value,
      size: size.value,
      count: 1,
    })
    const first = task.images[0]
    if (task.status === 'failed' || !first) {
      updateNodeData(props.id, {
        status: 'error',
        error: task.errorMessage || '生成失败，请稍后重试',
      })
      return
    }
    updateNodeData(props.id, {
      status: 'done',
      imageUrl: first.url,
      revisedPrompt: task.revisedPrompt,
    })
    propagate(first.url, prompt, model.value, size.value)
    assetsStore.addAuto({ type: 'image', url: first.url, prompt, source: 'gen' })
  } catch (err) {
    updateNodeData(props.id, {
      status: 'error',
      error: err instanceof Error ? err.message : '生成失败，请稍后重试',
    })
  }
}

/* ------------------------------ 选中态操作条 ------------------------------ */

const fileEl = ref<HTMLInputElement | null>(null)

function pickUpload() {
  fileEl.value?.click()
}
function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f || !f.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    const u = String(reader.result || '')
    if (u) updateNodeData(props.id, { imageUrl: u, status: 'done', error: '' })
  }
  reader.readAsDataURL(f)
}
function removeSelf() {
  canvasStore.setSelected('')
  removeNodes([props.id])
}
</script>

<template>
  <div class="gen-node" :class="{ 'is-selected': selected }">
    <NodeLabel
      :label="data.label"
      fallback="图像"
      @change="(v) => updateNodeData(id, { label: v })"
    />

    <div v-if="selected && data.imageUrl" class="gen-tools">
      <ImageActionsToolbar
        :image-url="data.imageUrl"
        :file-base="data.label"
        @upload="pickUpload"
        @angle="run"
        @delete="removeSelf"
      />
    </div>

    <div class="gen-card">
      <img v-if="data.imageUrl" :src="data.imageUrl" class="gen-img" alt="生成结果" />
      <div v-else class="gen-empty">
        <span v-if="running" class="gen-spinner" />
        <template v-else>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
          <span>连接文本节点后运行生成</span>
        </template>
      </div>
      <div v-if="running" class="gen-mask"><span class="gen-spinner gen-spinner--light" />生成中…</div>
    </div>

    <div class="gen-bar">
      <select v-model="model" class="gen-select" :disabled="running" title="模型">
        <option v-for="opt in modelOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
        <option v-if="!modelOptions.length" value="">（无可用模型）</option>
      </select>
      <select v-model="size" class="gen-select gen-select--sm" :disabled="running" title="尺寸">
        <option v-for="s in IMAGE_SIZES" :key="s.value" :value="s.value">{{ s.value }}</option>
      </select>
      <button class="gen-run" type="button" :disabled="running" :title="running ? '生成中' : '运行生图'" @click="run()">
        <span v-if="running" class="gen-spinner gen-spinner--dark" />
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </button>
    </div>

    <p v-if="data.error" class="gen-error">{{ data.error }}</p>

    <input ref="fileEl" type="file" accept="image/*" hidden @change="onFile" />
    <Handle type="target" :position="Position.Left" id="in" />
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<style scoped>
.gen-node {
  width: 300px;
}
.gen-tools {
  display: flex;
  justify-content: center;
  margin: -2px 0 7px;
}
.gen-card {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #131316;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  min-height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.gen-node.is-selected .gen-card {
  border-color: rgba(47, 107, 255, 0.85);
  box-shadow: 0 0 0 2px rgba(47, 107, 255, 0.35), 0 14px 40px rgba(0, 0, 0, 0.45);
}
.gen-img {
  display: block;
  width: 100%;
  height: auto;
}
.gen-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #55555e;
  font-size: 12px;
}
.gen-mask {
  position: absolute;
  inset: 0;
  background: rgba(8, 8, 10, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #e8e8ee;
  font-size: 12px;
}
.gen-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(90, 140, 255, 0.25);
  border-top-color: #4d82ff;
  border-radius: 50%;
  animation: gen-spin 0.8s linear infinite;
  flex: 0 0 auto;
}
.gen-spinner--light {
  border-top-color: #fff;
}
.gen-spinner--dark {
  width: 14px;
  height: 14px;
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}
@keyframes gen-spin {
  to {
    transform: rotate(360deg);
  }
}

.gen-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  border-radius: 12px;
  background: #161619;
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.gen-select {
  flex: 1 1 auto;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: #0f0f12;
  color: #e6e6ec;
  font-size: 12px;
  outline: none;
  text-overflow: ellipsis;
}
.gen-select--sm {
  flex: 0 0 auto;
  max-width: 104px;
}
.gen-select:focus {
  border-color: #2f6bff;
}
.gen-run {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 9px;
  background: #2f6bff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.gen-run:hover:not(:disabled) {
  filter: brightness(1.15);
}
.gen-run:disabled {
  cursor: not-allowed;
  filter: saturate(0.6) brightness(0.85);
}
.gen-error {
  margin: 8px 2px 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #f87171;
  word-break: break-all;
}
</style>
