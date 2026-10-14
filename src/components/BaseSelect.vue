<script setup>
/**
 * 轻量下拉选择组件
 *
 * 为什么不用原生 <select>：
 *   原生下拉展开层由操作系统渲染，无法统一配色 / 圆角 / 字体 / 间距，
 *   在底部悬浮输入栏等场景下还会出现位置跳变。这里用按钮 + 浮层实现，
 *   样式完全走项目 CSS 变量，保证与整体视觉一致。
 *
 * 用法：<BaseSelect v-model="form.model" label="模型" icon="🏆" :options="IMAGE_MODELS" drop="up" />
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  icon: { type: String, default: '' },
  /** 浮层展开方向：底部固定的输入栏建议用 up */
  drop: { type: String, default: 'down' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const rootRef = ref(null)
const cursor = ref(-1)
const current = computed(() => props.options.find((item) => item.value === props.modelValue) || props.options[0] || null)
const menuStyle = computed(() => (props.drop === 'up' ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }))

function toggle() {
  if (props.disabled) return
  open.value ? close() : openMenu()
}
function openMenu() {
  open.value = true
  cursor.value = props.options.findIndex((item) => item.value === props.modelValue)
  document.addEventListener('mousedown', onDocMouseDown)
  document.addEventListener('keydown', onDocKeydown)
}
function close() {
  open.value = false
  document.removeEventListener('mousedown', onDocMouseDown)
  document.removeEventListener('keydown', onDocKeydown)
}
function onDocMouseDown(event) {
  if (!rootRef.value?.contains(event.target)) close()
}
function onDocKeydown(event) {
  if (event.key === 'Escape') return close()
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    const total = props.options.length
    cursor.value = (cursor.value + step + total) % total
    nextTick(() => rootRef.value?.querySelector('.base-select__option.is-cursor')?.scrollIntoView({ block: 'nearest' }))
    return
  }
  if (event.key === 'Enter' && cursor.value > -1) {
    event.preventDefault()
    pick(props.options[cursor.value])
  }
}
function pick(option) {
  if (!option) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}
watch(() => props.disabled, (value) => { if (value) close() })
onBeforeUnmount(close)

defineExpose({ open, close })
</script>

<template>
  <div ref="rootRef" class="base-select" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <button class="base-select__trigger" type="button" role="combobox" :aria-expanded="open" :disabled="disabled" @click.stop="toggle">
      <span v-if="label" class="base-select__label"><i v-if="icon">{{ icon }}</i>{{ label }}</span>
      <span class="base-select__value">{{ current?.label ?? '请选择' }}</span>
      <SvgIcon name="chevron-down" :size="13" class="base-select__arrow" />
    </button>

    <Transition name="select-pop">
      <div v-if="open" class="base-select__menu" :class="{ 'is-up': drop === 'up' }" role="listbox" :style="menuStyle">
        <button
          v-for="(option, index) in options"
          :key="option.value"
          class="base-select__option"
          :class="{ 'is-selected': option.value === modelValue, 'is-cursor': index === cursor }"
          type="button"
          role="option"
          :aria-selected="option.value === modelValue"
          @mouseenter="cursor = index"
          @click.stop="pick(option)"
        >
          <span class="base-select__option-main">
            <span class="base-select__option-label">{{ option.label }}</span>
            <small v-if="option.desc">{{ option.desc }}</small>
          </span>
          <SvgIcon v-if="option.value === modelValue" name="check" :size="13" class="base-select__check" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.base-select { position: relative; }
.base-select__trigger { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; color: var(--c-text); font-size: 12px; cursor: pointer; transition: var(--transition); }
.base-select__trigger:hover { border-color: var(--c-primary-border); background: var(--c-bg-hover); }
.base-select.is-open .base-select__trigger { border-color: var(--c-primary); background: var(--c-primary-light); box-shadow: 0 0 0 3px rgba(22, 119, 255, .1); }
.base-select__label { display: inline-flex; align-items: center; gap: 4px; color: var(--c-text-secondary); }
.base-select__label i { font-style: normal; font-size: 12px; }
.base-select__value { font-weight: 500; }
.base-select__arrow { color: var(--c-text-placeholder); transition: transform .2s cubic-bezier(.4, 0, .2, 1); }
.base-select.is-open .base-select__arrow { transform: rotate(180deg); color: var(--c-primary); }
.base-select.is-disabled .base-select__trigger { cursor: not-allowed; opacity: .6; }

.base-select__menu { position: absolute; left: 0; z-index: var(--z-dropdown); min-width: 100%; width: max-content; max-width: 260px; max-height: 232px; overflow-y: auto; padding: 5px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; box-shadow: var(--shadow-lg); }
.base-select__option { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 7px 9px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--c-text-regular); font-size: 12px; text-align: left; cursor: pointer; transition: background .15s ease, color .15s ease; }
.base-select__option-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.base-select__option-label { color: inherit; font-weight: 500; white-space: nowrap; }
.base-select__option small { color: var(--c-text-placeholder); font-size: 11px; white-space: nowrap; }
.base-select__option:hover, .base-select__option.is-cursor { background: var(--c-bg-hover); color: var(--c-primary); }
.base-select__option.is-selected { background: var(--c-primary-light); color: var(--c-primary); font-weight: 600; }
.base-select__option.is-selected small { color: var(--c-primary); opacity: .75; }
.base-select__check { flex: 0 0 auto; color: var(--c-primary); }

.select-pop-enter-active, .select-pop-leave-active { transition: opacity .16s ease, transform .16s cubic-bezier(.4, 0, .2, 1); }
.select-pop-enter-from, .select-pop-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
/* 向上展开时动画方向取反，避免视觉上「穿过」输入栏 */
.base-select__menu.is-up.select-pop-enter-from, .base-select__menu.is-up.select-pop-leave-to { transform: translateY(4px) scale(.98); }
</style>
