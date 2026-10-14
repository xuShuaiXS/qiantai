<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  desc: string
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="toast-mask" :class="{ show }" @click.self="emit('close')">
    <div class="toast-box">
      <div class="toast-ico"><i class="ri-tools-line"></i></div>
      <h3>{{ title }}</h3>
      <p>{{ desc }}</p>
      <button class="toast-ok" type="button" @click="emit('close')">知道了</button>
    </div>
  </div>
</template>
