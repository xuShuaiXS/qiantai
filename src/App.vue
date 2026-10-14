<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

/**
 * 从 oademo 移植过来的栏目页（图片生成 / 智能修图）是独立路由，
 * 不套在对话页的侧边栏布局内，这里给它们补一个回到对话页的入口。
 */
const showBackHome = computed(() => route.meta.public === true && route.path !== '/login')
</script>

<template>
  <router-view />
  <button v-if="showBackHome" class="gt-back-home" type="button" @click="router.push('/')">
    <span aria-hidden="true">←</span> 返回对话
  </button>
</template>
