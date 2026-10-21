<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import {
  createVideoTask,
  fetchVideoModels,
  getVideoTask,
  type VideoModelOption,
} from '@/api/videoGeneration'
import { useMessage } from '@/composables/useMessage'
import { useCanvasAssetsStore } from '@/stores/canvasAssets'
import NodeLabel from '../components/NodeLabel.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  data: {
    model?: string
    prompt?: string
    ratio?: string
    resolution?: string
    duration?: number
    status?: 'idle' | 'running' | 'done' | 'error'
    videoUrl?: string
    error?: string
    /** 后端任务 id（刷新后用于续查进度） */
    taskId?: number
    label?: string
  }
  selected?: boolean
}>()

const FLOW_ID = 'ai-canvas'
const { updateNodeData, findNode, getEdges } = useVueFlow(FLOW_ID)
const message = useMessage()
const assetsStore = useCanvasAssetsStore()

const RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4']
const RESOLUTIONS = ['720p', '1080p']
const DURATIONS = [5, 10]

const DEFAULT_PROMPT = '让画面自然动起来，镜头缓慢推进，光影流动，主体细节保持稳定'

const modelOptions = ref<VideoModelOption[]>([])
const elapsed = ref(0)
let pollTimer: number | undefined
let tickTimer: number | undefined

/* ------------------------------ 上游首帧图 ------------------------------ */

const sourceImage = computed(() => {
  for (const e of getEdges.value) {
    if (e.target !== props.id) continue
    const src = findNode(e.source)
    if (!src) continue
    const url = (src.data?.imageUrl || src.data?.videoUrl || '') as string
    if (url) return url
  }
  return ''
})

/* ------------------------------ 表单 ------------------------------ */

const model = computed({
  get: () => props.data.model || modelOptions.value[0]?.value || '',
  set: (v: string) => updateNodeData(props.id, { model: v }),
})
const prompt = computed({
  get: () => props.data.prompt ?? DEFAULT_PROMPT,
  set: (v: string) => updateNodeData(props.id, { prompt: v }),
})
const ratio = computed({
  get: () => props.data.ratio || '16:9',
  set: (v: string) => updateNodeData(props.id, { ratio: v }),
})
const resolution = computed({
  get: () => props.data.resolution || '720p',
  set: (v: string) => updateNodeData(props.id, { resolution: v }),
})
const duration = computed({
  get: () => props.data.duration || 5,
  set: (v: number) => updateNodeData(props.id, { duration: v }),
})

function onPromptInput(e: Event) {
  prompt.value = (e.target as HTMLTextAreaElement).value
}

const running = computed(() => props.data.status === 'running')

const durationBadge = computed(() => {
  const s = Number(props.data.duration) || 5
  return `0:${String(s).padStart(2, '0')}`
})

/* ------------------------------ 轮询 ------------------------------ */

function clearTimers() {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = undefined
  }
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = undefined
  }
}

function startTicker() {
  if (tickTimer) clearInterval(tickTimer)
  elapsed.value = 0
  tickTimer = window.setInterval(() => {
    elapsed.value += 1
  }, 1000)
}

function schedulePoll(taskId: number, tries = 0) {
  if (pollTimer) clearTimeout(pollTimer)
  if (tries > 90) {
    clearTimers()
    updateNodeData(props.id, { status: 'error', error: '生成超时，请稍后到「视频生成」页面查看结果' })
    return
  }
  pollTimer = window.setTimeout(async () => {
    try {
      const task = await getVideoTask(taskId)
      if (task.status === 'done' && task.videoUrl) {
        clearTimers()
        updateNodeData(props.id, {
          status: 'done',
          videoUrl: task.videoUrl,
          error: '',
          duration: task.duration || props.data.duration || 5,
        })
        archiveVideo(task.videoUrl)
        return
      }
      if (task.status === 'failed') {
        clearTimers()
        updateNodeData(props.id, {
          status: 'error',
          error: task.errorMessage || '视频生成失败，请稍后重试',
        })
        return
      }
      schedulePoll(taskId, tries + 1)
    } catch {
      schedulePoll(taskId, tries + 1)
    }
  }, 5000)
}

/* ------------------------------ 运行 ------------------------------ */

async function run() {
  if (running.value) return
  const image = sourceImage.value
  if (!image) {
    message.warning('请先把「图像」节点的输出连到本节点左侧')
    return
  }
  if (!model.value) {
    message.warning('后端未配置视频模型，请先在控制台添加 video 能力模型')
    return
  }
  clearTimers()
  updateNodeData(props.id, {
    status: 'running',
    error: '',
    videoUrl: '',
    taskId: undefined,
  })
  startTicker()
  try {
    const task = await createVideoTask({
      model: model.value,
      prompt: prompt.value.trim() || DEFAULT_PROMPT,
      imageUrl: image,
      ratio: ratio.value,
      resolution: resolution.value,
      duration: duration.value,
    })
    updateNodeData(props.id, { taskId: task.id })
    if (task.status === 'done' && task.videoUrl) {
      clearTimers()
      updateNodeData(props.id, { status: 'done', videoUrl: task.videoUrl })
      archiveVideo(task.videoUrl)
      return
    }
    if (task.status === 'failed') {
      clearTimers()
      updateNodeData(props.id, { status: 'error', error: task.errorMessage || '视频生成失败' })
      return
    }
    schedulePoll(task.id)
  } catch (err) {
    clearTimers()
    updateNodeData(props.id, {
      status: 'error',
      error: err instanceof Error ? err.message : '视频任务提交失败',
    })
  }
}

/** 生成成功 → 自动入库素材 */
function archiveVideo(url: string) {
  assetsStore.addAuto({ type: 'video', url, prompt: prompt.value, source: 'gen' })
}

/** 下载视频（站内 /uploads 同源，直接取 blob） */
async function download() {
  const url = props.data.videoUrl
  if (!url) return
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) })
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ai-canvas-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/* ------------------------------ 生命周期 ------------------------------ */

onMounted(async () => {
  try {
    modelOptions.value = await fetchVideoModels()
  } catch {
    modelOptions.value = []
  }
  // 刷新后恢复：任务仍在跑则续查
  if (props.data.status === 'running' && props.data.taskId) {
    startTicker()
    schedulePoll(props.data.taskId)
  }
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <div class="vg-node" :class="{ 'is-selected': selected }">
    <NodeLabel
      :label="data.label"
      fallback="视频"
      @change="(v) => updateNodeData(id, { label: v })"
    />

    <div class="vg-card">
      <video
        v-if="data.videoUrl"
        :src="data.videoUrl"
        class="vg-video"
        controls
        playsinline
        preload="metadata"
      />
      <template v-else>
        <img v-if="sourceImage" :src="sourceImage" class="vg-poster" alt="首帧图" />
        <div v-else class="vg-empty">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="m10 9.5 5 2.5-5 2.5z" />
          </svg>
          <span>连接图像节点作为首帧</span>
        </div>
        <div v-if="running" class="vg-mask">
          <span class="vg-spinner" />生成中{{ elapsed ? ` ${elapsed}s` : '' }}…
        </div>
        <span v-if="sourceImage && !running" class="vg-badge">图生视频</span>
      </template>
      <span v-if="data.videoUrl" class="vg-badge">{{ durationBadge }}</span>
    </div>

    <div class="vg-bar">
      <select v-model="model" class="vg-select" :disabled="running" title="模型">
        <option v-for="opt in modelOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
        <option v-if="!modelOptions.length" value="">（无可用视频模型）</option>
      </select>
      <button class="vg-run" type="button" :disabled="running" :title="running ? '生成中' : '生成视频'" @click="run">
        <span v-if="running" class="vg-spinner vg-spinner--dark" />
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </button>
    </div>

    <div class="vg-row">
      <select v-model="ratio" class="vg-select vg-select--sm" :disabled="running">
        <option v-for="r in RATIOS" :key="r" :value="r">{{ r }}</option>
      </select>
      <select v-model="resolution" class="vg-select vg-select--sm" :disabled="running">
        <option v-for="r in RESOLUTIONS" :key="r" :value="r">{{ r }}</option>
      </select>
      <select v-model.number="duration" class="vg-select vg-select--sm" :disabled="running">
        <option v-for="d in DURATIONS" :key="d" :value="d">{{ d }}s</option>
      </select>
    </div>

    <textarea
      class="vg-prompt"
      :value="prompt"
      rows="2"
      :disabled="running"
      placeholder="补充动作/镜头描述（可选）"
      @input="onPromptInput"
    />

    <p v-if="data.error" class="vg-error">{{ data.error }}</p>

    <button v-if="data.videoUrl" class="vg-dl" type="button" @click="download">下载视频</button>

    <Handle type="target" :position="Position.Left" id="in" />
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<style scoped>
.vg-node {
  width: 300px;
}
.vg-card {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: #131316;
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
  min-height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}
.vg-node.is-selected .vg-card {
  border-color: rgba(47, 107, 255, 0.85);
  box-shadow: 0 0 0 2px rgba(47, 107, 255, 0.35), 0 14px 40px rgba(0, 0, 0, 0.45);
}
.vg-video {
  display: block;
  width: 100%;
  height: auto;
  background: #000;
}
.vg-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: brightness(0.82);
}
.vg-empty {
  min-height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #55555e;
  font-size: 12px;
}
.vg-mask {
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
.vg-badge {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.62);
  color: #ececf1;
  backdrop-filter: blur(4px);
}
.vg-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(90, 140, 255, 0.25);
  border-top-color: #4d82ff;
  border-radius: 50%;
  animation: vg-spin 0.8s linear infinite;
  flex: 0 0 auto;
}
.vg-spinner--dark {
  width: 14px;
  height: 14px;
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}
@keyframes vg-spin {
  to {
    transform: rotate(360deg);
  }
}

.vg-bar,
.vg-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.vg-bar {
  margin-top: 8px;
  padding: 8px;
  border-radius: 12px;
  background: #161619;
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.vg-row {
  margin-top: 6px;
}
.vg-select {
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
.vg-select--sm {
  flex: 1 1 0;
  font-size: 11.5px;
}
.vg-select:focus {
  border-color: #2f6bff;
}
.vg-run {
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
.vg-run:hover:not(:disabled) {
  filter: brightness(1.15);
}
.vg-run:disabled {
  cursor: not-allowed;
  filter: saturate(0.6) brightness(0.85);
}
.vg-prompt {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 6px;
  padding: 7px 10px;
  resize: none;
  min-height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: #161619;
  color: #e6e6ec;
  font-size: 12px;
  line-height: 1.55;
  outline: none;
}
.vg-prompt:focus {
  border-color: #2f6bff;
}
.vg-prompt::placeholder {
  color: #55555e;
}
.vg-error {
  margin: 8px 2px 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #f87171;
  word-break: break-all;
}
.vg-dl {
  width: 100%;
  height: 30px;
  margin-top: 8px;
  border: 1px solid rgba(47, 107, 255, 0.55);
  border-radius: 10px;
  background: rgba(47, 107, 255, 0.14);
  color: #a9c4ff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.vg-dl:hover {
  background: rgba(47, 107, 255, 0.28);
  color: #fff;
}
</style>
