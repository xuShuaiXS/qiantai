<script setup lang="ts">
defineProps<{ x: number; y: number }>()

const emit = defineEmits<{
  (e: 'add', type: 'text' | 'imageGen' | 'videoGen'): void
  (e: 'close'): void
}>()

interface Item {
  type: 'text' | 'imageGen' | 'videoGen'
  label: string
  hint: string
}
const ITEMS: Item[] = [
  { type: 'text', label: '文本', hint: '写下想法 / 提示词' },
  { type: 'imageGen', label: '图像', hint: '文生图 / 图生图' },
  { type: 'videoGen', label: '视频', hint: '图生视频' },
]
</script>

<template>
  <div
    class="qadd nodrag"
    :style="{ left: x + 'px', top: y + 'px' }"
    @click.stop
    @mousedown.stop
    @pointerdown.stop
    @contextmenu.prevent.stop
  >
    <p class="qadd__head">添加节点</p>
    <button v-for="it in ITEMS" :key="it.type" class="qadd__item" type="button" @click="emit('add', it.type)">
      <span class="qadd__ic" :class="'qadd__ic--' + it.type">
        <svg v-if="it.type === 'text'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M5 6h14M12 6v12M9 18h6" />
        </svg>
        <svg v-else-if="it.type === 'imageGen'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m5 18 4.5-5 3.5 4 3-3 3 4" />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <path d="m10 9.5 5 2.5-5 2.5z" />
        </svg>
      </span>
      <span class="qadd__txt">
        <b>{{ it.label }}</b>
        <small>{{ it.hint }}</small>
      </span>
    </button>
  </div>
</template>

<style scoped>
.qadd {
  position: absolute;
  z-index: 60;
  width: 188px;
  padding: 8px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #17171c;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
}
.qadd__head {
  margin: 2px 6px 6px;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: #7b7b86;
}
.qadd__item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #e8eaf2;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}
.qadd__item:hover {
  background: rgba(255, 255, 255, 0.07);
}
.qadd__ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex: 0 0 auto;
}
.qadd__ic--text {
  background: rgba(124, 92, 255, 0.18);
  color: #b9a6ff;
}
.qadd__ic--imageGen {
  background: rgba(47, 107, 255, 0.18);
  color: #8fb4ff;
}
.qadd__ic--videoGen {
  background: rgba(236, 72, 153, 0.18);
  color: #f9a8d4;
}
.qadd__txt {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.qadd__txt b {
  font-size: 12.5px;
  font-weight: 600;
}
.qadd__txt small {
  font-size: 10px;
  color: #7b7b86;
}
</style>
