<script setup>
/**
 * 新AI修图 · 深色编辑器（正式环境实现）
 *
 * 布局：
 *   左侧画布区：顶部「我的创作（作品数）」→ 中央画布（上传原图 / 生成结果）→ 底部工具条（添加/缩放/撤销/恢复）
 *   右侧面板：新建项目 → 上传引导 → 底部修图指令输入区（模型选择 / 选择图片 / 发送）
 *
 * 真实能力说明：
 *   - 上传：调用后端 /chat/upload（multipart file）
 *   - 生成：调用后端 /chat/images/generations，模型来自后端图片能力配置
 *   - 撤销/恢复：基于本地图片历史栈
 *   - 注意：后端目前没有 /chat/images/edits（图生图/局部重绘）接口，
 *     因此修图指令是按「文本指令驱动生成」执行的；待后端提供编辑接口后，
 *     只需在 send() 中改为调用该接口并把原图一并上传即可。
 */
import { computed, onMounted, ref } from 'vue'
import { useMessage } from '@/composables/useMessage'
import { createImageTask, fetchImageModels, uploadImage } from '@/api/imageGeneration'

const message = useMessage()

/* ---------------- 模型（来自后端配置） ---------------- */
const models = ref([])
const modelValue = ref('')
const modelOpen = ref(false)
const currentModelLabel = computed(
  () => models.value.find((item) => item.value === modelValue.value)?.label || '选择模型',
)

async function loadModels() {
  try {
    models.value = await fetchImageModels()
    if (!models.value.length) {
      message.warning('后端暂未配置图片模型，请先在控制台配置厂商与模型')
      return
    }
    if (!models.value.some((item) => item.value === modelValue.value)) {
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
    message.success('图片已上传，可在右侧输入修图指令')
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

/* ---------------- 提交修图指令 ---------------- */
const instruction = ref('')

async function send() {
  const text = instruction.value.trim()
  if (!text) {
    message.warning('请先输入您想要的修改效果')
    return
  }
  if (!modelValue.value) {
    message.warning('暂无可用图片模型，请先在控制台配置')
    return
  }
  sending.value = true
  try {
    const task = await createImageTask({
      prompt: text,
      model: modelValue.value,
      size: '1024x1024',
      count: 1,
    })
    if (task.status === 'failed' || !task.images.length) {
      message.error(task.errorMessage || '生成失败，请稍后重试')
      return
    }
    pushHistory(task.images[0].url)
    instruction.value = ''
    message.success('已生成修图结果')
  } finally {
    sending.value = false
  }
}

/* ---------------- 新建项目 ---------------- */
function newProject() {
  sourceImage.value = ''
  currentImage.value = ''
  history.value = []
  historyIndex.value = -1
  instruction.value = ''
  zoom.value = 100
  message.info('已开始新的修图项目')
}

onMounted(loadModels)
</script>

<template>
  <div class="editor">
    <!-- 左侧画布区 -->
    <main class="editor-canvas">
      <!-- 顶部操作 -->
      <header class="canvas-top">
        <span class="canvas-top__creation"><i>👤</i>我的创作<span class="canvas-top__count">（{{ workCount }} 张图片）</span></span>
      </header>

      <!-- 中央画布：未上传时引导上传，已有图片则展示当前（原图/生成结果） -->
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
              <small>支持 JPG / PNG / WEBP，上传后在右侧输入修图指令</small>
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
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M8 11h6" /><path d="M11 8v6" /></svg>
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

    <!-- 右侧面板 -->
    <aside class="editor-side">
      <!-- 新建项目 -->
      <button class="side-project" type="button" @click="newProject">
        <span class="side-project__icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        </span>
        <span class="side-project__text">
          <strong>新建项目</strong>
          <small>开始新的修图对话</small>
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      <!-- 引导区 -->
      <div class="side-empty">
        <span class="side-empty__icon">💬</span>
        <p>{{ currentImage ? '输入指令，开始您的AI修图' : '上传一张图片开始您的AI修图之旅~' }}</p>
        <button class="side-empty__demo" type="button" :disabled="uploading" @click="pickFile">
          {{ uploading ? '正在上传…' : '选择图片' }} <i>⬆</i>
        </button>
      </div>

      <!-- 输入区 -->
      <div class="side-input">
        <textarea
          v-model="instruction"
          class="side-input__field"
          rows="2"
          maxlength="500"
          placeholder="输入您想要的修改效果（⬆ 选择图片 / 修图指令）"
          @keydown.enter.exact.prevent="send"
        />
        <div class="side-input__bar">
          <button class="bar-btn" type="button" title="选择图片" :disabled="uploading" @click="pickFile">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          </button>
          <!-- 模型选择：型号来自后端图片能力配置 -->
          <div class="bar-model-wrap">
            <button class="bar-model" type="button" :disabled="!models.length" @click="modelOpen = !modelOpen">
              <span class="bar-model__avatar">🏆</span>
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
                  <small>{{ item.desc }}</small>
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

/* ---------------- 右侧面板 ---------------- */
.editor-side { display: flex; flex-direction: column; gap: 14px; width: 340px; flex: 0 0 340px; padding: 14px; border-left: 1px solid rgba(255, 255, 255, .08); background: #12162a; }

.side-project { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border: 1px solid rgba(255, 255, 255, .1); border-radius: 12px; background: rgba(255, 255, 255, .04); color: inherit; cursor: pointer; text-align: left; transition: all .2s ease; }
.side-project:hover { border-color: rgba(124, 92, 255, .6); background: rgba(124, 92, 255, .1); }
.side-project__icon { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: 0 0 auto; border-radius: 10px; background: linear-gradient(135deg, #7c5cff, #a855f7); color: #fff; }
.side-project__text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.side-project__text strong { font-size: 13px; }
.side-project__text small { color: #8b93a8; font-size: 11px; }
.side-project > svg { color: #8b93a8; }

.side-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: #8b93a8; }
.side-empty__icon { font-size: 34px; opacity: .8; }
.side-empty p { margin: 0; font-size: 13px; }
.side-empty__demo { display: inline-flex; align-items: center; gap: 5px; padding: 8px 16px; border: 0; border-radius: 999px; background: linear-gradient(92deg, #7c5cff, #a855f7); color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all .2s ease; box-shadow: 0 6px 18px rgba(124, 92, 255, .35); }
.side-empty__demo:hover { filter: brightness(1.1); }
.side-empty__demo i { font-style: normal; }

.side-input { padding: 12px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 14px; background: rgba(255, 255, 255, .04); transition: border-color .2s ease; }
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
.bar-model__menu { position: absolute; left: 0; bottom: calc(100% + 8px); z-index: 30; width: 240px; max-height: 240px; overflow-y: auto; padding: 6px; border: 1px solid rgba(255, 255, 255, .12); border-radius: 12px; background: #191e33; box-shadow: 0 18px 40px rgba(0, 0, 0, .5); }
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
  .side-empty { padding: 40px 0; }
  .stage-title { font-size: 30px; }
}
</style>
