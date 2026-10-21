<script setup lang="ts">
import { ref } from 'vue'

/**
 * 画布右键菜单（参考 ai1foo twitcanva）
 *   上传 / 添加素材 / 添加节点 ›
 *   撤销 / 重做
 *   粘贴
 * 若由节点触发，额外提供 复制 / 删除。
 */
defineProps<{
  x: number
  y: number
  nodeId?: string
  canUndo?: boolean
  canRedo?: boolean
  hasClipboard?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'upload'): void
  (e: 'materials'): void
  (e: 'add-node', type: string): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'paste'): void
  (e: 'copy'): void
  (e: 'delete'): void
}>()

const subOpen = ref(false)

function run(action: () => void) {
  action()
  emit('close')
}
</script>

<template>
  <div class="ctx" :style="{ left: `${x}px`, top: `${y}px` }" @click.stop @contextmenu.prevent>
    <template v-if="nodeId">
      <button class="ctx-item" type="button" @click="run(() => emit('copy'))">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h8" />
          </svg>
        </span>
        复制
        <span class="kbd">Ctrl C</span>
      </button>
      <button class="ctx-item danger" type="button" @click="run(() => emit('delete'))">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
          </svg>
        </span>
        删除
        <span class="kbd">Delete</span>
      </button>
      <div class="ctx-sep" />
    </template>

    <button class="ctx-item" type="button" @click="run(() => emit('upload'))">
      <span class="ic">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
      </span>
      上传
    </button>
    <button class="ctx-item" type="button" @click="run(() => emit('materials'))">
      <span class="ic">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 2 9 5-9 5-9-5z" />
          <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
        </svg>
      </span>
      添加素材
    </button>

    <div class="ctx-wrap" @mouseenter="subOpen = true" @mouseleave="subOpen = false">
      <button class="ctx-item" type="button" @click="subOpen = !subOpen">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        添加节点
        <span class="chev">›</span>
      </button>
      <div v-if="subOpen" class="ctx ctx--sub">
        <button class="ctx-item" type="button" @click="run(() => emit('add-node', 'text'))">
          <span class="ic">T</span>
          文本
        </button>
        <button class="ctx-item" type="button" @click="run(() => emit('add-node', 'imageGen'))">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="m5 18 4.5-5 3.5 4 3-3 3 4" />
            </svg>
          </span>
          <span class="mi">图像<small>宣传图、海报、封面</small></span>
        </button>
        <button class="ctx-item" type="button" @click="run(() => emit('add-node', 'videoGen'))">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m10 9.5 5 2.5-5 2.5z" />
            </svg>
          </span>
          视频
        </button>
        <button class="ctx-item" type="button" @click="run(() => emit('add-node', 'imageEditor'))">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </span>
          图像编辑器
        </button>
        <button class="ctx-item" type="button" @click="run(() => emit('add-node', 'videoEditor'))">
          <span class="ic">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
              <path d="M7 4v16M17 4v16M2.5 9.5h4.5M17 9.5h4.5M2.5 14.5h4.5M17 14.5h4.5" />
            </svg>
          </span>
          视频编辑器
        </button>
      </div>
    </div>

    <div class="ctx-sep" />

    <button class="ctx-item" type="button" :disabled="!canUndo" @click="run(() => emit('undo'))">
      <span class="ic">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 8h9a6 6 0 0 1 0 12h-3" />
          <path d="M7 4 3 8l4 4" />
        </svg>
      </span>
      撤销
      <span class="kbd">Ctrl Z</span>
    </button>
    <button class="ctx-item" type="button" :disabled="!canRedo" @click="run(() => emit('redo'))">
      <span class="ic">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 8h-9a6 6 0 0 0 0 12h3" />
          <path d="m17 4 4 4-4 4" />
        </svg>
      </span>
      重做
      <span class="kbd">Shift Ctrl Z</span>
    </button>

    <div class="ctx-sep" />

    <button class="ctx-item" type="button" :disabled="!hasClipboard" @click="run(() => emit('paste'))">
      <span class="ic">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </svg>
      </span>
      粘贴
      <span class="kbd">Ctrl V</span>
    </button>
  </div>
</template>

<style scoped>
.ctx {
  position: absolute;
  z-index: 50;
  width: 224px;
  padding: 8px;
  border-radius: 14px;
  background: #1f1f24;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 2px;
  animation: ctx-in 0.12s ease-out;
}
@keyframes ctx-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.ctx-wrap {
  position: relative;
}
.ctx--sub {
  left: calc(100% + 6px);
  top: -8px;
  width: 196px;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 8px;
  border-radius: 10px;
  background: transparent;
  border: 0;
  color: #e8e8ee;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s ease;
}
.ctx-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.07);
}
.ctx-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ctx-item.danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
}
.ic {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #2a2a31;
  color: #dcdce4;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 700;
}
.kbd {
  margin-left: auto;
  color: #6b6b75;
  font-size: 11px;
  white-space: nowrap;
}
.chev {
  margin-left: auto;
  color: #8a8a93;
  font-size: 16px;
  line-height: 1;
}
.ctx-sep {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 4px;
}
.mi {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}
.mi small {
  color: #8a8a93;
  font-size: 11px;
}
</style>
