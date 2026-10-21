<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import NodeLabel from '../components/NodeLabel.vue'
import ImageActionsToolbar from '../components/ImageActionsToolbar.vue'
import { useAiCanvasStore } from '@/stores/aiCanvas'
import { useImageGenerationStore } from '@/stores/imageGeneration'
import { createImageTask } from '@/api/imageGeneration'
import { useMessage } from '@/composables/useMessage'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  data: {
    imageUrl?: string
    label?: string
    /** 生成该图所用的提示词（选中后可直接改词重新生成） */
    prompt?: string
    model?: string
    /** 基础尺寸，如 1024x1024；清晰度在 resolution 中单独保存 */
    size?: string
    resolution?: string
  }
  selected?: boolean
}>()

const FLOW_ID = 'ai-canvas'
const { updateNodeData, removeNodes } = useVueFlow(FLOW_ID)
const imageStore = useImageGenerationStore()
const canvasStore = useAiCanvasStore()
const message = useMessage()

const url = computed(() => props.data.imageUrl || '')
const modelOptions = computed(() => imageStore.models)

/** 画幅：值即基础像素尺寸（与后端 size 参数一致） */
const RATIOS = [
  { value: '1024x1024', label: '1:1' },
  { value: '1792x1024', label: '16:9' },
  { value: '1024x1792', label: '9:16' },
  { value: '1536x1024', label: '3:2' },
  { value: '1024x1536', label: '2:3' },
]
/** 清晰度：在基础尺寸上按整数倍放大（上游不支持时会回传错误） */
const RESOLUTIONS = [
  { value: '1K', factor: 1 },
  { value: '2K', factor: 2 },
  { value: '4K', factor: 4 },
]

function parseSize(size?: string) {
  const m = /^(\d+)\s*x\s*(\d+)$/.exec(size || '')
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 1024, h: 1024 }
}

const model = computed({
  get: () => props.data.model || modelOptions.value[0]?.value || '',
  set: (v: string) => updateNodeData(props.id, { model: v }),
})
const ratio = computed({
  get: () => {
    const { w, h } = parseSize(props.data.size)
    const hit = RATIOS.find((r) => r.value === `${w}x${h}`)
    return hit?.value || '1024x1024'
  },
  set: (v: string) => updateNodeData(props.id, { size: v }),
})
const resolution = computed({
  get: () => props.data.resolution || '1K',
  set: (v: string) => updateNodeData(props.id, { resolution: v }),
})
const prompt = computed({
  get: () => props.data.prompt || '',
  set: (v: string) => updateNodeData(props.id, { prompt: v }),
})

/** 按「基础尺寸 × 清晰度倍数」算出真正发给上游的 size */
function currentSize(): string {
  const { w, h } = parseSize(props.data.size || ratio.value)
  const factor = RESOLUTIONS.find((r) => r.value === resolution.value)?.factor || 1
  return `${w * factor}x${h * factor}`
}

const running = ref(false)
const expanded = ref(false)

/** 重新生成：extra 为追加的镜头视角等修饰词 */
async function regenerate(extra = '') {
  if (running.value) return
  const text = [prompt.value.trim(), extra].filter(Boolean).join('，')
  if (!text) {
    message.warning('请先填写提示词')
    return
  }
  const m = model.value || modelOptions.value[0]?.value || ''
  if (!m) {
    message.warning('后端未配置图片模型，请先在控制台配置')
    return
  }
  running.value = true
  try {
    const task = await createImageTask({ prompt: text, model: m, size: currentSize(), count: 1 })
    const first = task.images[0]
    if (task.status === 'failed' || !first) {
      message.error(task.errorMessage || '生成失败，请稍后重试')
      return
    }
    updateNodeData(props.id, { prompt: text, model: m, imageUrl: first.url })
  } catch (err) {
    message.error(err instanceof Error ? err.message : '生成失败，请稍后重试')
  } finally {
    running.value = false
  }
}

/* ------------------------------ 上传替换 ------------------------------ */

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
    if (u) updateNodeData(props.id, { imageUrl: u })
  }
  reader.readAsDataURL(f)
}

function removeSelf() {
  canvasStore.setSelected('')
  removeNodes([props.id])
}

function onPromptInput(e: Event) {
  prompt.value = (e.target as HTMLTextAreaElement).value
}
</script>

<template>
  <div class="image-node" :class="{ 'is-selected': selected }">
    <NodeLabel :label="data.label" fallback="图像" @change="(v) => updateNodeData(id, { label: v })" />

    <div v-if="selected && url" class="image-tools">
      <ImageActionsToolbar
        :image-url="url"
        :file-base="data.label || data.prompt"
        @upload="pickUpload"
        @angle="regenerate"
        @delete="removeSelf"
      />
    </div>

    <div class="image-card">
      <img v-if="url" :src="url" class="image-img" alt="图像" />
      <div v-else class="image-empty">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m5 18 4.5-5 3.5 4 3-3 3 4" />
        </svg>
        <span>上传图片或连接生成结果</span>
      </div>
      <div v-if="running" class="image-mask"><span class="image-spinner" />生成中…</div>
    </div>

    <!-- 选中态：提示词编辑 + 重新生成（参考 ai1foo 选中图片后的底部输入条） -->
    <div v-if="selected && url" class="ipb nodrag" @click.stop @mousedown.stop @pointerdown.stop>
      <textarea
        class="ipb-text nowheel"
        :class="{ 'is-expanded': expanded }"
        :value="prompt"
        rows="3"
        placeholder="描述画面，改好后点右侧按钮重新生成"
        @input="onPromptInput"
      />
      <button v-if="(prompt || '').length > 60" class="ipb-expand" type="button" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
      </button>
      <div class="ipb-row">
        <select v-model="model" class="ipb-select ipb-select--model" title="模型">
          <option v-for="opt in modelOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          <option v-if="!modelOptions.length" value="">（无可用模型）</option>
        </select>
        <select v-model="ratio" class="ipb-select" title="画幅比例">
          <option v-for="r in RATIOS" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
        <select v-model="resolution" class="ipb-select" title="清晰度">
          <option v-for="r in RESOLUTIONS" :key="r.value" :value="r.value">{{ r.value }}</option>
        </select>
        <button class="ipb-run" type="button" :disabled="running" :title="running ? '生成中' : '重新生成'" @click="regenerate()">
          <span v-if="running" class="image-spinner image-spinner--dark" />
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </button>
      </div>
    </div>

    <input ref="fileEl" type="file" accept="image/*" hidden @change="onFile" />
    <Handle type="target" :position="Position.Left" id="in" />
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<style scoped>
.image-node {
  width: 300px;
}
.image-tools {
  display: flex;
  justify-content: center;
  margin: -2px 0 7px;
}
.image-card {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #131316;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.image-node.is-selected .image-card {
  border-color: rgba(47, 107, 255, 0.85);
  box-shadow: 0 0 0 2px rgba(47, 107, 255, 0.35), 0 14px 40px rgba(0, 0, 0, 0.45);
}
.image-img {
  display: block;
  width: 100%;
  height: auto;
}
.image-empty {
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #55555e;
  font-size: 12px;
}
.image-mask {
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
.image-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(90, 140, 255, 0.25);
  border-top-color: #4d82ff;
  border-radius: 50%;
  animation: image-spin 0.8s linear infinite;
  flex: 0 0 auto;
}
.image-spinner--dark {
  width: 14px;
  height: 14px;
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}
@keyframes image-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ------------------------------ 提示词编辑条 ------------------------------ */
.ipb {
  position: relative;
  margin-top: 8px;
  padding: 10px;
  border-radius: 14px;
  background: #161619;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.ipb-text {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  color: #e9e9ef;
  font-size: 12.5px;
  line-height: 1.6;
  resize: vertical;
  min-height: 58px;
  max-height: 58px;
  outline: none;
  padding-right: 2px;
}
.ipb-text.is-expanded {
  max-height: 220px;
}
.ipb-text::placeholder {
  color: #55555e;
}
.ipb-expand {
  position: absolute;
  right: 10px;
  bottom: 46px;
  border: 0;
  background: transparent;
  color: #7d7d88;
  font-size: 11px;
  cursor: pointer;
}
.ipb-expand:hover {
  color: #b9b9c2;
}
.ipb-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.ipb-select {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: #0f0f12;
  color: #d8d8e0;
  font-size: 11.5px;
  outline: none;
  cursor: pointer;
}
.ipb-select--model {
  flex: 1 1 auto;
  min-width: 0;
  text-overflow: ellipsis;
}
.ipb-select:focus {
  border-color: #2f6bff;
}
.ipb-run {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  margin-left: auto;
  border: 0;
  border-radius: 50%;
  background: #2f6bff;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.ipb-run:hover:not(:disabled) {
  filter: brightness(1.15);
}
.ipb-run:disabled {
  cursor: not-allowed;
  filter: saturate(0.6) brightness(0.85);
}
</style>
