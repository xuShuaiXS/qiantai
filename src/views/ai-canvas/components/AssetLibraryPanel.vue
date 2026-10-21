<script setup lang="ts">
import { onMounted } from 'vue'
import { useCanvasAssetsStore, type CanvasAsset } from '@/stores/canvasAssets'
import { downloadImage } from '@/utils/download'
import { resolveMediaUrl } from '@/utils/mediaUrl'
import { useMessage } from '@/composables/useMessage'

const emit = defineEmits<{
  (e: 'add-image', url: string): void
  (e: 'close'): void
}>()

const store = useCanvasAssetsStore()
const message = useMessage()

onMounted(() => store.load())

function src(a: CanvasAsset): string {
  return resolveMediaUrl(a.url)
}

function onPick(a: CanvasAsset) {
  if (a.type === 'image') emit('add-image', a.url)
}

async function onDownload(a: CanvasAsset) {
  const url = src(a)
  try {
    if (a.type === 'image') {
      await downloadImage(url, `素材_${a.id}.png`)
    } else {
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const el = document.createElement('a')
      el.href = href
      el.download = `素材_${a.id}.mp4`
      document.body.appendChild(el)
      el.click()
      el.remove()
      setTimeout(() => URL.revokeObjectURL(href), 4000)
    }
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function onDelete(a: CanvasAsset) {
  store.remove(a.id)
}

function onClear() {
  if (!store.assets.length) return
  if (!window.confirm('清空全部素材？此操作不可恢复')) return
  store.clear()
  message.success('已清空素材库')
}
</script>

<template>
  <aside class="assetlib nodrag" @click.stop @mousedown.stop @pointerdown.stop @contextmenu.prevent.stop>
    <header class="al-head">
      <div class="al-head__t">
        <span class="al-head__ic">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
          </svg>
        </span>
        <div>
          <strong>素材库</strong>
          <small>生成结果自动入库，点击图片可加入画布</small>
        </div>
      </div>
      <div class="al-head__ops">
        <button class="al-clear" type="button" title="清空" @click="onClear">清空</button>
        <button class="al-close" type="button" title="关闭" @click="emit('close')">✕</button>
      </div>
    </header>

    <div class="al-body">
      <div v-if="store.assets.length" class="al-grid">
        <div v-for="a in store.assets" :key="a.id" class="al-item" :class="'al-item--' + a.type">
          <img v-if="a.type === 'image'" :src="src(a)" class="al-img" alt="素材" loading="lazy" @click="onPick(a)" />
          <div v-else class="al-video" @click.stop>
            <video :src="src(a)" class="al-video__el" muted preload="metadata" />
            <span class="al-video__badge">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </div>
          <div class="al-item__ops">
            <button class="al-op" type="button" title="下载" @click.stop="onDownload(a)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
            </button>
            <button class="al-op al-op--danger" type="button" title="移除" @click.stop="onDelete(a)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
              </svg>
            </button>
          </div>
          <span v-if="a.type === 'image'" class="al-item__add">＋ 加入画布</span>
        </div>
      </div>
      <div v-else class="al-empty">
        <span class="al-empty__ic">🗂</span>
        <p>还没有素材</p>
        <small>在画布里生成图片 / 视频后，会自动出现在这里</small>
      </div>
    </div>

    <footer class="al-foot">共 {{ store.assets.length }} 项 · 存于本机浏览器</footer>
  </aside>
</template>

<style scoped>
.assetlib {
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
.al-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.al-head__t {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.al-head__ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2f6bff, #5ea0ff);
  color: #fff;
  flex: 0 0 auto;
}
.al-head strong {
  display: block;
  font-size: 13px;
  color: #e8eaf2;
}
.al-head small {
  display: block;
  color: #8b93a8;
  font-size: 10.5px;
}
.al-head__ops {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}
.al-clear {
  height: 26px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: transparent;
  color: #9aa0ae;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.al-clear:hover {
  border-color: rgba(248, 113, 113, 0.5);
  color: #f87171;
}
.al-close {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8a8a93;
  font-size: 13px;
  cursor: pointer;
}
.al-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}
.al-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}
.al-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.al-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  background: #0f0f12;
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.al-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: pointer;
  transition: transform 0.2s ease;
}
.al-item--image:hover .al-img {
  transform: scale(1.06);
}
.al-video {
  position: relative;
  width: 100%;
  height: 100%;
}
.al-video__el {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.al-video__badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.28);
}
.al-item__ops {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.al-item:hover .al-item__ops {
  opacity: 1;
}
.al-op {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.6);
  color: #e8eaf2;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.al-op:hover {
  background: rgba(0, 0, 0, 0.82);
}
.al-op--danger:hover {
  color: #f87171;
}
.al-item__add {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 3px 0;
  font-size: 10px;
  text-align: center;
  color: #fff;
  background: linear-gradient(transparent, rgba(47, 107, 255, 0.85));
  opacity: 0;
  transition: opacity 0.15s ease;
}
.al-item--image:hover .al-item__add {
  opacity: 1;
}
.al-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8b93a8;
  text-align: center;
}
.al-empty__ic {
  font-size: 34px;
}
.al-empty p {
  margin: 0;
  font-size: 13px;
}
.al-empty small {
  color: #6b7288;
  font-size: 11px;
  line-height: 1.6;
  max-width: 220px;
}
.al-foot {
  padding: 8px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 10.5px;
  color: #6b7288;
}
</style>
