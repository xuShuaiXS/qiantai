<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { DEFAULT_IMAGE_SIZE } from '../data'

const props = withDefaults(
  defineProps<{
    size?: string
    label?: string
    /** 超时提示阈值（秒） */
    slowAfterSec?: number
  }>(),
  {
    size: DEFAULT_IMAGE_SIZE,
    label: '正在绘制…',
    slowAfterSec: 30,
  },
)

const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const aspectRatio = computed(() => {
  const m = /^(\d+)\s*x\s*(\d+)$/i.exec(props.size || '')
  if (!m) return '1 / 1'
  return `${Number(m[1])} / ${Number(m[2])}`
})

const slow = computed(() => elapsed.value >= (props.slowAfterSec || 30))

onMounted(() => {
  timer = setInterval(() => {
    elapsed.value += 1
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="img-gen-ph" :style="{ aspectRatio }" role="status" aria-live="polite">
    <div class="img-gen-ph-shimmer" aria-hidden="true"></div>
    <div class="img-gen-ph-label">
      <i class="ri-brush-line" aria-hidden="true"></i>
      <span>{{ label }}</span>
      <span v-if="slow" class="img-gen-ph-slow">
        仍在生成，可继续等待或停止
      </span>
    </div>
  </div>
</template>
