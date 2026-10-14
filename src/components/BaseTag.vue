<script setup>
/**
 * 通用标签
 */
defineProps({
  /** primary | success | warning | danger | info | default */
  color: { type: String, default: 'default' },
  dot: { type: Boolean, default: false },
})
</script>

<template>
  <span class="tag" :class="color !== 'default' ? `tag--${color}` : ''">
    <i v-if="dot" class="tag__dot" />
    <slot />
  </span>
</template>

<style scoped>
.tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.85;
}
</style>
