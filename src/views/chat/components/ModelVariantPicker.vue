<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ModelVariantItem } from '../data'

const props = defineProps<{
  modelId: string
  variants: ModelVariantItem[]
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [variant: ModelVariantItem]
}>()

const rootRef = ref<HTMLElement | null>(null)

const current = computed(() => {
  return (
    props.variants.find((v) => v.modelId === props.modelId) ||
    props.variants.find((v) => v.isDefault) ||
    props.variants[0]
  )
})

const label = computed(() => current.value?.name || current.value?.modelId || '选择型号')

function toggle(e: MouseEvent) {
  e.stopPropagation()
  if (props.variants.length <= 1) return
  emit('update:open', !props.open)
}

function onSelect(v: ModelVariantItem, e: MouseEvent) {
  e.stopPropagation()
  emit('select', v)
  emit('update:open', false)
}

function onDocClick(e: MouseEvent) {
  if (!props.open) return
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    emit('update:open', false)
  }
}

watch(
  () => props.variants,
  () => emit('update:open', false),
)

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div
    ref="rootRef"
    class="variant-picker"
    :class="{ single: variants.length <= 1, open }"
    @click.stop
  >
    <button
      class="tool-btn variant-btn"
      type="button"
      :title="variants.length > 1 ? '选择具体型号' : label"
      :disabled="variants.length === 0"
      @click="toggle"
    >
      <i class="ri-cpu-line"></i>
      <span class="variant-label">{{ label }}</span>
      <i v-if="variants.length > 1" class="ri-arrow-down-s-line variant-chev"></i>
    </button>

    <div v-if="variants.length > 1" class="variant-panel" :class="{ open }">
      <div class="variant-panel-title">选择型号</div>
      <button
        v-for="v in variants"
        :key="v.modelId"
        type="button"
        class="variant-item"
        :class="{ active: v.modelId === modelId }"
        @click="onSelect(v, $event)"
      >
        <span class="variant-item-name">
          {{ v.name || v.modelId }}
          <span v-if="v.capability === 'image'" class="variant-cap">生图</span>
        </span>
        <span class="variant-item-id">{{ v.modelId }}</span>
        <i class="ri-check-line variant-check"></i>
      </button>
    </div>
  </div>
</template>
