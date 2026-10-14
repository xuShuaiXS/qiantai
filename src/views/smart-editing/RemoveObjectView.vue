<script setup>
/**
 * AI 消除 · 编辑页
 */
import { useRouter } from 'vue-router'
import { useMessage } from '@/composables/useMessage'
import SvgIcon from '@/components/SvgIcon.vue'

const router = useRouter()
const message = useMessage()

function upload() {
  message.info('演示环境：上传后会进入涂抹消除流程（后续接入算法接口）')
}
</script>

<template>
  <div class="page editing-page">
    <header class="editing-page__head">
      <button class="back-btn" type="button" @click="router.push('/smart-editing')"><SvgIcon name="arrow-left" :size="16" />返回</button>
      <h1 class="editing-page__title">AI 消除</h1>
      <p class="editing-page__desc">涂抹需要移除的区域，AI 智能补全背景</p>
    </header>
    <div class="editing-workspace" @click="upload">
      <div class="upload-zone">
        <SvgIcon name="upload" :size="40" />
        <strong>点击或拖拽上传图片</strong>
        <small>支持 JPG、PNG、WEBP，最大 10MB</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.editing-page { max-width: 1160px; margin: 0 auto; }
.editing-page__head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.editing-page__title { font-size: 20px; font-weight: 650; }
.editing-page__desc { margin-left: auto; color: var(--c-text-secondary); font-size: 12px; }
.back-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; color: var(--c-text-regular); font-size: 12px; cursor: pointer; transition: var(--transition); }
.back-btn:hover { border-color: var(--c-primary-border); color: var(--c-primary); background: var(--c-primary-light); }
.editing-workspace { display: flex; align-items: center; justify-content: center; min-height: 480px; border: 2px dashed var(--c-border); border-radius: var(--radius-lg); background: #fff; cursor: pointer; transition: var(--transition); }
.editing-workspace:hover { border-color: var(--c-primary-border); background: var(--c-primary-light); }
.upload-zone { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--c-text-secondary); }
.upload-zone strong { color: var(--c-text); font-size: 15px; font-weight: 600; }
.upload-zone small { font-size: 12px; }
@media (max-width: 860px) { .editing-page__head { flex-direction: column; align-items: flex-start; gap: 6px; } .editing-page__desc { margin-left: 0; } }
</style>
