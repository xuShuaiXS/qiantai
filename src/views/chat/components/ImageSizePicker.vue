<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { IMAGE_SIZE_OPTIONS, type ImageSizeOption } from '../data'

const props = defineProps<{
  modelValue: string
  open: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:open': [value: boolean]
}>()

const rootRef = ref<HTMLElement | null>(null)

const current = computed<ImageSizeOption>(() => {
  return (
    IMAGE_SIZE_OPTIONS.find((x) => x.value === props.modelValue) || IMAGE_SIZE_OPTIONS[0]!
  )
})

function toggle(e: MouseEvent) {
  e.stopPropagation()
  emit('update:open', !props.open)
}

function onSelect(opt: ImageSizeOption, e: MouseEvent) {
  e.stopPropagation()
  emit('update:modelValue', opt.value)
  emit('update:open', false)
}

function onDocClick(e: MouseEvent) {
  if (!props.open) return
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    emit('update:open', false)
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootRef" class="size-picker" :class="{ open }" @click.stop>
    <button
      class="tool-btn size-btn"
      type="button"
      title="选择图片比例"
      @click="toggle"
    >
      <span class="size-preview" :data-ratio="current.label" aria-hidden="true" />
      <span v-if="!compact" class="size-label">{{ current.label }} · {{ current.desc }}</span>
      <span v-else class="size-label">{{ current.label }}</span>
      <i class="ri-arrow-down-s-line size-chev"></i>
    </button>

    <div class="size-panel" :class="{ open }">
      <div class="size-panel-title">图片比例</div>
      <button
        v-for="opt in IMAGE_SIZE_OPTIONS"
        :key="opt.value"
        type="button"
        class="size-item"
        :class="{ active: opt.value === modelValue }"
        @click="onSelect(opt, $event)"
      >
        <span class="size-item-preview" :data-ratio="opt.label" aria-hidden="true" />
        <span class="size-item-meta">
          <span class="size-item-name">{{ opt.label }} · {{ opt.desc }}</span>
          <span class="size-item-id">{{ opt.value }}</span>
        </span>
        <i class="ri-check-line size-check"></i>
      </button>
    </div>
  </div>
</template>
