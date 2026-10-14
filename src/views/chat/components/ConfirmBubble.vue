<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

defineProps<{
  text: string
  confirmText?: string
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const root = ref<HTMLElement | null>(null)

function onDocPointer(e: MouseEvent | TouchEvent) {
  const el = root.value
  if (!el) return
  const t = e.target
  if (t instanceof Node && !el.contains(t)) {
    emit('cancel')
  }
}

onMounted(() => {
  nextTick(() => {
    document.addEventListener('mousedown', onDocPointer, true)
    document.addEventListener('touchstart', onDocPointer, true)
  })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocPointer, true)
  document.removeEventListener('touchstart', onDocPointer, true)
})
</script>

<template>
  <div ref="root" class="confirm-bubble" role="dialog" @click.stop>
    <p class="confirm-bubble-text">{{ text }}</p>
    <div class="confirm-bubble-actions">
      <button class="confirm-bubble-cancel" type="button" @click="emit('cancel')">
        {{ cancelText || '取消' }}
      </button>
      <button class="confirm-bubble-ok" type="button" @click="emit('confirm')">
        {{ confirmText || '删除' }}
      </button>
    </div>
  </div>
</template>
