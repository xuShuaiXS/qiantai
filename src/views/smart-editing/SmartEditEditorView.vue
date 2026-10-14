<script setup>
/**
 * 新AI修图 · 系统内容区内的深色编辑器（保留侧边栏与顶部导航）
 *
 * 布局：
 *   左侧画布区：顶部「我的创作 / 返回旧版」→ 中央「修图示例」四联演示 → 底部工具条（添加/缩放/撤销/恢复）
 *   右侧面板：新建项目卡片 → 空状态引导（查看示例演示）→ 底部修图指令输入区（模型选择 / 发送）
 *
 * 说明：演示页用渐变 + emoji 模拟示例图，接入真实算法后替换为实际图片。
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from '@/composables/useMessage'

const router = useRouter()
const message = useMessage()

const instruction = ref('')
const zoom = ref(100)
const sending = ref(false)

const EXAMPLES = [
  { label: '换个头发', emoji: '👩🏻', bg: 'linear-gradient(180deg, #cfe3f5 0%, #e9e0d4 100%)' },
  { label: '换个穿搭', emoji: '👩🏼', bg: 'linear-gradient(180deg, #d9e8f0 0%, #cfe0d8 100%)' },
  { label: '换个背景', emoji: '👩🏽', bg: 'linear-gradient(180deg, #c99f74 0%, #7c5c3c 100%)' },
  { label: '一键抠图', emoji: '👩🏻', checker: true },
]
const ARROW_COLORS = ['#38bdf8', '#34d399', '#fb923c']

function backToClassic() {
  router.push('/smart-editing/classic')
}
function showDemo() {
  instruction.value = '把头发换成粉色长卷发，穿搭换成牛仔外套，整体保持自然'
  message.info('已填入示例修图指令，可直接发送')
}
function adjustZoom(delta) {
  zoom.value = Math.min(200, Math.max(50, zoom.value + delta))
}
function resetZoom() {
  zoom.value = 100
}
function toolbarDemo(name) {
  message.info(`「${name}」为演示按钮，接入真实算法后开放`)
}
async function send() {
  const text = instruction.value.trim()
  if (!text) return message.warning('请先输入您想要的修改效果')
  sending.value = true
  setTimeout(() => {
    sending.value = false
    message.success(`已收到修图指令：「${text}」（演示环境，稍后接入生成算法）`)
    instruction.value = ''
  }, 600)
}
</script>

<template>
  <div class="editor">
    <!-- 左侧画布区 -->
    <main class="editor-canvas">
      <!-- 顶部操作 -->
      <header class="canvas-top">
        <span class="canvas-top__creation"><i>👤</i>我的创作<span class="canvas-top__count">（0 张图片）</span></span>
        <button class="canvas-top__back" type="button" @click="backToClassic">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          返回旧版
        </button>
      </header>

      <!-- 中央示例 -->
      <div class="canvas-stage">
        <div class="canvas-stage__inner" :style="{ transform: `scale(${zoom / 100})` }">
          <h1 class="stage-title">修图示例</h1>
          <p class="stage-subtitle">动动嘴，一键PS</p>

          <div class="stage-examples">
            <template v-for="(item, index) in EXAMPLES" :key="item.label">
              <figure class="example">
                <span class="example__label">{{ item.label }}</span>
                <div class="example__img" :class="{ 'example__img--checker': item.checker }" :style="item.checker ? {} : { background: item.bg }">
                  <span>{{ item.emoji }}</span>
                </div>
              </figure>
              <svg v-if="index < EXAMPLES.length - 1" class="example-arrow" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" :style="{ color: ARROW_COLORS[index], transform: `rotate(${index % 2 ? -12 : 10}deg)` }">
                <path d="M4 12h14" /><path d="M13 6l6 6-6 6" />
              </svg>
            </template>
          </div>
        </div>
      </div>

      <!-- 底部工具条 -->
      <footer class="canvas-toolbar">
        <button class="tool-btn tool-btn--add" type="button" @click="toolbarDemo('添加')">
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
        <button class="tool-btn" type="button" @click="toolbarDemo('撤销')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></svg>
          撤销
        </button>
        <button class="tool-btn" type="button" @click="toolbarDemo('恢复')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" /></svg>
          恢复
        </button>
      </footer>
    </main>

    <!-- 右侧面板 -->
    <aside class="editor-side">
      <!-- 新建项目 -->
      <button class="side-project" type="button" @click="toolbarDemo('新建项目')">
        <span class="side-project__icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        </span>
        <span class="side-project__text">
          <strong>新建项目</strong>
          <small>开始新的修图对话</small>
        </span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      <!-- 空状态引导 -->
      <div class="side-empty">
        <span class="side-empty__icon">💬</span>
        <p>开始您的AI修图之旅吧~</p>
        <button class="side-empty__demo" type="button" @click="showDemo">查看示例演示 <i>✨</i></button>
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
          <button class="bar-btn" type="button" title="修图参数" @click="toolbarDemo('修图参数')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" /></svg>
          </button>
          <button class="bar-btn" type="button" title="选择图片" @click="toolbarDemo('选择图片')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
          </button>
          <button class="bar-model" type="button" @click="toolbarDemo('切换模型')">
            <span class="bar-model__avatar">👤</span>
            Seedream 5.0-Lite
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <span class="bar-spacer" />
          <button class="bar-send" type="button" :disabled="sending" title="发送" @click="send">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </aside>
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
.canvas-top__back { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border: 1px solid rgba(255, 255, 255, .14); border-radius: 999px; background: rgba(255, 255, 255, .06); color: #cfd4e4; font-size: 12px; cursor: pointer; transition: all .2s ease; }
.canvas-top__back:hover { border-color: #7c5cff; color: #fff; background: rgba(124, 92, 255, .18); }

.canvas-stage { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; padding: 70px 24px 24px; }
.canvas-stage__inner { text-align: center; transition: transform .25s ease; transform-origin: center center; }

.stage-title { margin: 0; font-size: 40px; font-weight: 800; letter-spacing: 2px; background: linear-gradient(92deg, #a855f7 10%, #ec4899 90%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 0 30px rgba(168, 85, 247, .35); }
.stage-subtitle { margin-top: 10px; color: #cfd4e4; font-size: 14px; letter-spacing: 1px; }

.stage-examples { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 26px; }
.example { margin: 0; }
.example__label { display: inline-block; margin-bottom: 10px; padding: 2px 10px; font-size: 15px; font-weight: 700; color: #fff; text-shadow: 0 2px 0 #d9a514; background: linear-gradient(transparent 62%, rgba(245, 200, 60, .85) 62%); }
.example__img { display: flex; align-items: center; justify-content: center; width: 168px; height: 236px; border-radius: 6px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, .45); }
.example__img > span { font-size: 84px; }
.example__img--checker { background-color: #fff; background-image: linear-gradient(45deg, #e7e9ee 25%, transparent 25%), linear-gradient(-45deg, #e7e9ee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e7e9ee 75%), linear-gradient(-45deg, transparent 75%, #e7e9ee 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0; }
.example-arrow { flex: 0 0 auto; }

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
.bar-model__avatar { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #ec4899); font-size: 10px; }
.bar-spacer { flex: 1; }
.bar-send { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 0; border-radius: 9px; background: linear-gradient(135deg, #7c5cff, #a855f7); color: #fff; cursor: pointer; transition: all .2s ease; }
.bar-send:hover { filter: brightness(1.12); }
.bar-send:disabled { opacity: .6; cursor: not-allowed; }

/* ---------------- 响应式 ---------------- */
@media (max-width: 960px) {
  .editor { flex-direction: column; height: auto; min-height: 100%; overflow: auto; }
  .editor-canvas { min-height: 72vh; }
  .editor-side { width: auto; flex: none; border-left: 0; border-top: 1px solid rgba(255, 255, 255, .08); }
  .side-empty { padding: 40px 0; }
  .stage-examples { flex-wrap: wrap; }
  .example-arrow { display: none; }
  .stage-title { font-size: 30px; }
}
</style>
