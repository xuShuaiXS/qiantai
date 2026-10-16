<script setup>
/**
 * 视频生成 · 深色两栏（参考设计稿）
 *
 *   左栏：模型卡（视频模型下拉）→ 提示词输入 → 基础设置（清晰度/宽高比/时长）→ 立即生成
 *   右侧：我的作品（视频卡片网格：<video> 播放 + hover 下载/删除）｜创意广场（占位）
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useMessage } from '@/composables/useMessage'
import {
  createVideoTask,
  deleteVideoTask,
  fetchVideoModels,
  listVideoTasks,
} from '@/api/videoGeneration'
import { downloadImage } from '@/utils/download'

const message = useMessage()

/* ---------------- 模型（后端 video 能力配置） ---------------- */
const models = ref([])
const modelValue = ref('')

async function loadModels() {
  try {
    models.value = await fetchVideoModels()
    if (!models.value.length) {
      message.warning('后端暂未配置视频模型，请先在控制台配置厂商与模型')
      return
    }
    if (!models.value.some((item) => item.value === modelValue.value)) {
      modelValue.value = models.value[0].value
    }
  } catch (err) {
    message.error(err?.message || '模型列表加载失败')
  }
}

const currentModel = computed(() => models.value.find((item) => item.value === modelValue.value) || null)
const modelMenuOpen = ref(false)
function pickModel(value) {
  modelValue.value = value
  modelMenuOpen.value = false
}

/* ---------------- 表单 ---------------- */
const form = reactive({
  prompt: '',
  resolution: '720p',
  ratio: '16:9',
  duration: 5,
})
const RESOLUTIONS = ['720p', '1080p']
const RATIOS = ['16:9', '9:16', '1:1']
const DURATIONS = [5, 10]

/* ---------------- 任务列表与轮询 ---------------- */
const tasks = ref([])
const loading = ref(false)
const submitting = ref(false)
const activeTab = ref('mine')
let pollTimer = null

async function loadTasks() {
  try {
    tasks.value = await listVideoTasks(30)
    schedulePoll()
  } catch (err) {
    message.error(err?.message || '任务列表加载失败')
  }
}

/** 有 running 任务时 8s 轮询；全部完成后停止 */
function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer)
  if (tasks.value.some((t) => t.status === 'running')) {
    pollTimer = setTimeout(loadTasks, 8000)
  }
}

async function generate() {
  const prompt = form.prompt.trim()
  if (!prompt) {
    message.warning('请先输入视频描述')
    return
  }
  if (!modelValue.value) {
    message.warning('暂无可用视频模型，请先在控制台配置')
    return
  }
  submitting.value = true
  try {
    await createVideoTask({
      model: modelValue.value,
      prompt,
      resolution: form.resolution,
      ratio: form.ratio,
      duration: form.duration,
    })
    form.prompt = ''
    message.success('任务已提交，生成约需 1~3 分钟')
    await loadTasks()
    activeTab.value = 'mine'
  } catch (err) {
    message.error(err instanceof Error ? err.message : '提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

async function removeTask(task) {
  if (!confirm('确定删除该作品？')) return
  try {
    await deleteVideoTask(task.id)
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
  } catch (err) {
    message.error(err?.message || '删除失败')
  }
}

/** 视频下载（同源 /uploads 直接 fetch blob） */
async function downloadVideo(task) {
  try {
    const res = await fetch(task.videoUrl, { signal: AbortSignal.timeout(300000) })
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `aurora-video-${task.id}.mp4`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  } catch {
    message.error('下载失败，请稍后重试')
  }
}

onMounted(() => {
  loadModels()
  loadTasks()
})
onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer)
})

const mineCount = computed(() => tasks.value.length)
watch(tasks, schedulePoll, { deep: true })
</script>

<template>
  <div class="vgen">
    <!-- 左栏：创作 -->
    <aside class="vgen-side">
      <!-- 模型卡 -->
      <div class="vgen-model">
        <div class="vgen-model__head">
          <span class="vgen-model__logo">🎬</span>
          <div class="vgen-model__meta">
            <strong>{{ currentModel?.label || '选择视频模型' }}</strong>
            <small>{{ currentModel?.desc || '文生视频' }}</small>
          </div>
        </div>
        <span class="vgen-model__tag">文生视频</span>
      </div>

      <!-- 提示词 -->
      <div class="vgen-prompt">
        <p class="vgen-prompt__title">一个想快速生成视频吗？</p>
        <textarea
          v-model="form.prompt"
          class="vgen-prompt__field"
          rows="4"
          maxlength="500"
          placeholder="描述你想要的视频画面，如：一只橘猫在洒满阳光的草地上奔跑"
        />
      </div>

      <!-- 基础设置 -->
      <div class="vgen-settings">
        <div class="vgen-setting">
          <label>模型</label>
          <div class="vgen-setting__select">
            <select v-model="modelValue" :disabled="!models.length">
              <option v-for="item in models" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
        </div>
        <div class="vgen-setting">
          <label>清晰度</label>
          <div class="vgen-chips">
            <button
              v-for="r in RESOLUTIONS"
              :key="r"
              class="vgen-chip"
              :class="{ 'is-active': form.resolution === r }"
              type="button"
              @click="form.resolution = r"
            >{{ r }}</button>
          </div>
        </div>
        <div class="vgen-setting">
          <label>宽高比</label>
          <div class="vgen-chips">
            <button
              v-for="r in RATIOS"
              :key="r"
              class="vgen-chip"
              :class="{ 'is-active': form.ratio === r }"
              type="button"
              @click="form.ratio = r"
            >{{ r }}</button>
          </div>
        </div>
        <div class="vgen-setting">
          <label>时长</label>
          <div class="vgen-chips">
            <button
              v-for="d in DURATIONS"
              :key="d"
              class="vgen-chip"
              :class="{ 'is-active': form.duration === d }"
              type="button"
              @click="form.duration = d"
            >{{ d }}s</button>
          </div>
        </div>
      </div>

      <button class="vgen-go" type="button" :disabled="submitting" @click="generate">
        {{ submitting ? '正在提交…' : '立即生成' }}
      </button>
    </aside>

    <!-- 右侧：作品 -->
    <main class="vgen-main">
      <header class="vgen-tabs">
        <button
          class="vgen-tab"
          :class="{ 'is-active': activeTab === 'mine' }"
          type="button"
          @click="activeTab = 'mine'"
        >我的作品<span class="vgen-tab__count">{{ mineCount }}</span></button>
        <button
          class="vgen-tab"
          :class="{ 'is-active': activeTab === 'plaza' }"
          type="button"
          @click="activeTab = 'plaza'"
        >创意广场</button>
      </header>

      <!-- 创意广场（占位） -->
      <div v-if="activeTab === 'plaza'" class="vgen-plaza">
        <span class="vgen-plaza__icon">🏗️</span>
        <p>创意广场正在建设中，敬请期待</p>
      </div>

      <!-- 我的作品 -->
      <div v-else class="vgen-gallery">
        <article
          v-for="task in tasks"
          :key="task.id"
          class="vg-card"
          :class="{ 'is-running': task.status === 'running', 'is-failed': task.status === 'failed' }"
        >
          <div class="vg-card__media">
            <video
              v-if="task.status === 'done' && task.videoUrl"
              :src="task.videoUrl"
              controls
              preload="metadata"
              playsinline
            />
            <div v-else-if="task.status === 'running'" class="vg-card__state">
              <span class="vg-card__spinner" />生成中，约需 1~3 分钟…
            </div>
            <div v-else class="vg-card__state vg-card__state--error">
              <strong>生成失败</strong>
              <p>{{ task.errorMessage }}</p>
            </div>
            <span v-if="task.status === 'done' && task.duration" class="vg-card__badge">{{ task.duration }}s</span>
          </div>
          <footer class="vg-card__meta">
            <span class="vg-card__prompt" :title="task.prompt">{{ task.prompt }}</span>
            <div class="vg-card__ops">
              <small>{{ task.modelId }} · {{ task.resolution }} · {{ task.ratio }}</small>
              <button v-if="task.status === 'done'" type="button" title="下载视频" @click="downloadVideo(task)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
              </button>
              <button type="button" title="删除" @click="removeTask(task)">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
              </button>
            </div>
          </footer>
        </article>

        <div v-if="!tasks.length" class="vgen-empty">
          <span>🎬</span>
          <p>还没有作品，输入描述生成你的第一条视频吧</p>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.vgen {
  display: flex;
  height: 100%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: #10131f;
  color: #e8eaf2;
  font-size: 13px;
}

/* ---------------- 左栏 ---------------- */
.vgen-side {
  flex: 0 0 340px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 14px;
  border-right: 1px solid rgba(255, 255, 255, .08);
  background: #12162a;
  overflow-y: auto;
  box-sizing: border-box;
}

.vgen-model { display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgba(255, 255, 255, .1); border-radius: 14px; background: linear-gradient(135deg, rgba(124, 92, 255, .16), rgba(168, 85, 247, .08)); }
.vgen-model__head { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.vgen-model__logo { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; flex: 0 0 auto; border-radius: 12px; background: linear-gradient(135deg, #7c5cff, #a855f7); font-size: 19px; }
.vgen-model__meta { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.vgen-model__meta strong { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vgen-model__meta small { color: #8b93a8; font-size: 11px; }
.vgen-model__tag { padding: 3px 9px; border-radius: 999px; background: rgba(168, 85, 247, .22); color: #c4b5fd; font-size: 10.5px; }

.vgen-prompt { padding: 12px; border: 1px solid rgba(255, 255, 255, .1); border-radius: 14px; background: rgba(255, 255, 255, .04); }
.vgen-prompt__title { margin: 0 0 8px; font-size: 12.5px; color: #cfd4e4; }
.vgen-prompt__field { display: block; width: 100%; min-height: 84px; border: 0; background: transparent; resize: vertical; color: #e8eaf2; font-size: 12.5px; line-height: 1.6; }
.vgen-prompt__field:focus { outline: none; }
.vgen-prompt__field::placeholder { color: #6b7288; }

.vgen-settings { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid rgba(255, 255, 255, .1); border-radius: 14px; background: rgba(255, 255, 255, .03); }
.vgen-setting { display: flex; align-items: center; gap: 10px; }
.vgen-setting label { flex: 0 0 46px; color: #8b93a8; font-size: 11.5px; }
.vgen-setting__select select { width: 100%; height: 28px; border: 1px solid rgba(255, 255, 255, .14); border-radius: 8px; background: rgba(255, 255, 255, .05); color: #e8eaf2; font-size: 12px; padding: 0 8px; }
.vgen-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.vgen-chip { padding: 4px 12px; border: 1px solid rgba(255, 255, 255, .16); border-radius: 999px; background: transparent; color: #cfd4e4; font-size: 11.5px; cursor: pointer; transition: all .18s ease; }
.vgen-chip:hover { border-color: rgba(124, 92, 255, .7); color: #fff; }
.vgen-chip.is-active { border-color: #7c5cff; background: rgba(124, 92, 255, .24); color: #fff; font-weight: 600; }

.vgen-go { height: 42px; border: 0; border-radius: 12px; background: linear-gradient(92deg, #7c5cff, #a855f7); color: #fff; font-size: 13.5px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all .2s ease; box-shadow: 0 8px 22px rgba(124, 92, 255, .35); }
.vgen-go:hover:not(:disabled) { filter: brightness(1.1); }
.vgen-go:disabled { opacity: .6; cursor: not-allowed; }

/* ---------------- 右侧 ---------------- */
.vgen-main { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }

.vgen-tabs { display: flex; gap: 6px; padding: 14px 18px 0; }
.vgen-tab { padding: 7px 16px; border: 0; border-radius: 10px 10px 0 0; background: transparent; color: #8b93a8; font-size: 13px; cursor: pointer; transition: all .18s ease; }
.vgen-tab:hover { color: #e8eaf2; }
.vgen-tab.is-active { background: rgba(124, 92, 255, .18); color: #fff; font-weight: 600; }
.vgen-tab__count { margin-left: 5px; padding: 1px 7px; border-radius: 999px; background: rgba(124, 92, 255, .35); font-size: 11px; }

.vgen-gallery { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 18px 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; align-content: start; }

.vg-card { border: 1px solid rgba(255, 255, 255, .1); border-radius: 14px; background: #161a2e; overflow: hidden; transition: border-color .2s ease; }
.vg-card:hover { border-color: rgba(124, 92, 255, .55); }
.vg-card__media { position: relative; aspect-ratio: 16 / 9; background: #0b0e18; }
.vg-card__media video { display: block; width: 100%; height: 100%; object-fit: contain; background: #000; }
.vg-card__badge { position: absolute; top: 8px; left: 8px; padding: 2px 8px; border-radius: 6px; background: rgba(0, 0, 0, .6); color: #fff; font-size: 10.5px; }
.vg-card__state { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #8b93a8; font-size: 12px; padding: 12px; text-align: center; }
.vg-card__state--error strong { color: #f87171; }
.vg-card__state--error p { margin: 0; font-size: 11.5px; word-break: break-all; }
.vg-card__spinner { width: 18px; height: 18px; border: 2px solid rgba(124, 92, 255, .4); border-top-color: #a855f7; border-radius: 50%; animation: vg-spin .8s linear infinite; }
@keyframes vg-spin { to { transform: rotate(360deg); } }

.vg-card__meta { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; }
.vg-card__prompt { font-size: 12px; color: #cfd4e4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vg-card__ops { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.vg-card__ops small { color: #6b7288; font-size: 10.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vg-card__ops button { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border: 0; border-radius: 7px; background: transparent; color: #aeb5c9; cursor: pointer; transition: all .18s ease; }
.vg-card__ops button:hover { background: rgba(124, 92, 255, .2); color: #fff; }

.vgen-empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 0; color: #8b93a8; }
.vgen-empty span { font-size: 40px; }
.vgen-empty p { margin: 0; font-size: 13px; }

.vgen-plaza { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #8b93a8; }
.vgen-plaza__icon { font-size: 40px; }
.vgen-plaza p { margin: 0; font-size: 13px; }

/* ---------------- 响应式 ---------------- */
@media (max-width: 960px) {
  .vgen { flex-direction: column; height: auto; min-height: 100%; overflow: auto; }
  .vgen-side { flex: none; border-right: 0; border-bottom: 1px solid rgba(255, 255, 255, .08); }
  .vgen-gallery { min-height: 50vh; }
}
</style>
