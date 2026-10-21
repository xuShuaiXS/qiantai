<script setup lang="ts">
import { ref } from 'vue'
import { downloadImage } from '@/utils/download'
import { resolveMediaUrl } from '@/utils/mediaUrl'

/**
 * 图片节点选中态的浮动操作条（参考 ai1foo twitcanva）：
 *   [调整视角] | [上传] [展开] [下载] [更多]
 *
 * - 展开 / 下载 / 更多弹层在本组件内自洽处理（Teleport 到 body，避免被画布缩放影响）
 * - 调整视角 / 上传 / 删除 交给父节点决定（父节点持有节点数据与生成逻辑）
 */
const props = defineProps<{
  imageUrl?: string
  /** 下载文件名（一般为节点标题 / 提示词） */
  fileBase?: string
}>()

const emit = defineEmits<{
  (e: 'upload'): void
  (e: 'angle', value: string): void
  (e: 'delete'): void
}>()

const angleOpen = ref(false)
const moreOpen = ref(false)
const previewOpen = ref(false)
const copied = ref(false)

/** 常见镜头视角预设：选中后由父节点追加到提示词并重新生成 */
const ANGLES = ['正面视角', '侧面视角', '俯视视角', '仰视视角', '特写镜头']

function closePops() {
  angleOpen.value = false
  moreOpen.value = false
}
function toggleAngle() {
  moreOpen.value = false
  angleOpen.value = !angleOpen.value
}
function toggleMore() {
  angleOpen.value = false
  moreOpen.value = !moreOpen.value
}
function pickAngle(v: string) {
  angleOpen.value = false
  emit('angle', v)
}
function doDownload() {
  if (!props.imageUrl) return
  void downloadImage(props.imageUrl, props.fileBase || undefined)
}
function openPreview() {
  if (!props.imageUrl) return
  previewOpen.value = true
}
async function copyLink() {
  if (!props.imageUrl) return
  const link = resolveMediaUrl(props.imageUrl)
  try {
    await navigator.clipboard.writeText(link)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    window.open(link, '_blank', 'noopener,noreferrer')
  }
  moreOpen.value = false
}
function askDelete() {
  moreOpen.value = false
  emit('delete')
}
</script>

<template>
  <!-- nodrag：避免在操作条上按下时触发节点拖拽 -->
  <div class="iat nodrag" @click.stop @mousedown.stop @pointerdown.stop>
    <button class="iat-btn iat-btn--text" type="button" title="按镜头视角重新生成" @click="toggleAngle">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      调整视角
    </button>

    <span class="iat-sep" />

    <button class="iat-btn" type="button" title="上传 / 替换图片" @click="emit('upload')">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
      </svg>
    </button>
    <button class="iat-btn" type="button" title="展开大图" @click="openPreview">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
      </svg>
    </button>
    <button class="iat-btn" type="button" title="下载图片" @click="doDownload">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
    </button>

    <div class="iat-wrap">
      <button class="iat-btn" type="button" title="更多" @click="toggleMore">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
          <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      <div v-if="moreOpen" class="iat-pop iat-pop--right">
        <button type="button" @click="copyLink">{{ copied ? '已复制' : '复制图片链接' }}</button>
        <button type="button" class="danger" @click="askDelete">删除节点</button>
      </div>
    </div>

    <!-- 调整视角弹层 -->
    <div v-if="angleOpen" class="iat-pop iat-pop--angle">
      <p class="iat-pop__head">选择镜头视角后重新生成</p>
      <button v-for="a in ANGLES" :key="a" type="button" @click="pickAngle(a)">{{ a }}</button>
    </div>
  </div>

  <!-- 大图预览（挂 body，脱离画布 transform） -->
  <Teleport to="body">
    <div v-if="previewOpen" class="iat-viewer" @click.self="previewOpen = false">
      <img :src="resolveMediaUrl(imageUrl || '')" alt="预览" />
      <div class="iat-viewer__bar">
        <button type="button" @click="doDownload">下载</button>
        <button type="button" @click="previewOpen = false">关闭</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.iat {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 36px;
  padding: 0 6px;
  border-radius: 12px;
  background: rgba(24, 24, 29, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  color: #d8d8e0;
}
.iat-btn {
  height: 28px;
  min-width: 28px;
  padding: 0 7px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}
.iat-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #fff;
}
.iat-btn--text {
  padding: 0 8px;
  white-space: nowrap;
}
.iat-sep {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 3px;
}
.iat-wrap {
  position: relative;
}
.iat-pop {
  position: absolute;
  z-index: 60;
  min-width: 138px;
  padding: 6px;
  border-radius: 10px;
  background: #1f1f24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.iat-pop--right {
  top: calc(100% + 8px);
  right: 0;
}
.iat-pop--angle {
  top: calc(100% + 8px);
  left: 0;
  min-width: 150px;
}
.iat-pop button {
  border: 0;
  background: transparent;
  color: #e6e6ec;
  font-size: 12.5px;
  text-align: left;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
}
.iat-pop button:hover {
  background: rgba(255, 255, 255, 0.08);
}
.iat-pop button.danger:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
}
.iat-pop__head {
  margin: 4px 8px 6px;
  font-size: 11px;
  color: #8a8a93;
}

.iat-viewer {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(5, 5, 8, 0.86);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px;
}
.iat-viewer img {
  max-width: min(92vw, 1200px);
  max-height: 78vh;
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.7);
  object-fit: contain;
}
.iat-viewer__bar {
  display: flex;
  gap: 10px;
}
.iat-viewer__bar button {
  height: 34px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #1d1d22;
  color: #ececf1;
  font-size: 13px;
  cursor: pointer;
}
.iat-viewer__bar button:hover {
  background: #26262c;
}
</style>
