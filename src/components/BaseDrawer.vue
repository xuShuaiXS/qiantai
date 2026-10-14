<script setup>
/**
 * 右侧抽屉：用于员工详情等场景
 */
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '420px' },
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      document.addEventListener('keydown', onKeydown)
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="drawer__mask" @click.self="close">
        <Transition name="slide">
          <aside v-if="modelValue" class="drawer" :style="{ width }">
            <header class="drawer__head">
              <h3>{{ title }}</h3>
              <button type="button" aria-label="关闭" @click="close">×</button>
            </header>
            <div class="drawer__body">
              <slot />
            </div>
            <footer v-if="$slots.footer" class="drawer__foot">
              <slot name="footer" />
            </footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer__mask {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer);
  background: rgba(17, 24, 39, 0.45);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  height: 100%;
  max-width: 92vw;
  background: #fff;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--c-border-light);
}

.drawer__head h3 {
  font-size: 15px;
  font-weight: 600;
}

.drawer__head button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: var(--c-text-secondary);
  cursor: pointer;
}

.drawer__head button:hover {
  background: var(--c-bg-hover);
}

.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
}

.drawer__foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--c-border-light);
}
</style>
