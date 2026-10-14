<script setup>
/**
 * 空状态
 */
defineProps({
  title: { type: String, default: '暂无数据' },
  desc: { type: String, default: '' },
  icon: { type: String, default: '📭' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div class="empty" :class="{ 'empty--compact': compact }">
    <div class="empty__icon">{{ icon }}</div>
    <p class="empty__title">{{ title }}</p>
    <p v-if="desc" class="empty__desc">{{ desc }}</p>
    <div v-if="$slots.default" class="empty__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56px 20px;
  text-align: center;
}

.empty--compact {
  padding: 28px 16px;
}

.empty__icon {
  font-size: 40px;
  line-height: 1;
  opacity: 0.75;
  margin-bottom: 12px;
}

.empty__title {
  font-size: 14px;
  color: var(--c-text-regular);
}

.empty__desc {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--c-text-secondary);
}

.empty__action {
  margin-top: 16px;
}
</style>
