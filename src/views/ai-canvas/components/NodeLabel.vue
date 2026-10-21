<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * 节点标题：卡片上方的暗淡文字，双击可重命名（还原参考站的节点标签交互）
 */
const props = defineProps<{
  label?: string
  fallback: string
}>()

const emit = defineEmits<{ (e: 'change', v: string): void }>()

const editing = ref(false)
const draft = ref(props.label || props.fallback)

watch(
  () => props.label,
  (v) => {
    if (!editing.value) draft.value = v || props.fallback
  },
)

function start() {
  draft.value = props.label || props.fallback
  editing.value = true
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const v = draft.value.trim() || props.fallback
  if (v !== (props.label || props.fallback)) emit('change', v)
}

function cancel() {
  editing.value = false
  draft.value = props.label || props.fallback
}

const vFocus = { mounted: (el: HTMLInputElement) => el.focus() }
</script>

<template>
  <div class="nb-label" title="双击重命名" @dblclick.stop.prevent="start">
    <input
      v-if="editing"
      v-focus
      v-model="draft"
      class="nb-label__input"
      :style="{ width: Math.max(64, draft.length * 14 + 24) + 'px' }"
      @blur="commit"
      @keydown.enter.prevent="commit"
      @keydown.esc.prevent="cancel"
      @click.stop
    />
    <span v-else class="nb-label__text">{{ label || fallback }}</span>
  </div>
</template>

<style scoped>
.nb-label {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  user-select: none;
  line-height: 1.4;
}
.nb-label__text {
  color: rgba(238, 238, 244, 0.38);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.2px;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
}
.nb-label__input {
  border: 1px solid #2f6bff;
  border-radius: 6px;
  background: #17171c;
  color: #f2f2f6;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: 2px 8px;
  outline: none;
}
</style>
