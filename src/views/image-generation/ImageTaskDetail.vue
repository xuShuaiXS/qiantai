<script setup>
import BaseDrawer from '@/components/BaseDrawer.vue'
import BaseTag from '@/components/BaseTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({ modelValue: Boolean, task: Object, loading: Boolean })
const emit = defineEmits(['update:modelValue', 'retry', 'remove', 'download'])
const STATUS = { pending: ['排队中', 'warning'], generating: ['生成中', 'primary'], success: ['已完成', 'success'], failed: ['生成失败', 'danger'] }
const status = () => STATUS[props.task?.status] || STATUS.pending
</script>

<template>
  <BaseDrawer :model-value="modelValue" title="生成详情" width="500px" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="loading" class="detail-loading"><span class="processing-ring" />正在加载详情…</div>
    <template v-else-if="task">
      <div class="detail-status"><BaseTag :color="status()[1]" dot>{{ status()[0] }}</BaseTag><span>{{ task.id }}</span></div>
      <div v-if="task.status === 'success'" class="detail-gallery"><button v-for="image in task.images" :key="image.id" class="detail-image" type="button" @click="emit('download', task)"><img :src="image.url" :alt="task.prompt" /><span><SvgIcon name="download" :size="14" />下载</span></button></div>
      <div v-else-if="['pending', 'generating'].includes(task.status)" class="detail-processing"><span class="processing-ring" /><strong>{{ status()[0] }}</strong><p>任务正在处理中，页面会自动更新结果</p></div>
      <div v-else class="detail-error"><SvgIcon name="alert" :size="22" /><strong>{{ task.errorMessage }}</strong><p>你可以调整提示词后重新尝试生成。</p></div>
      <dl class="detail-list"><div><dt>提示词</dt><dd>{{ task.prompt }}</dd></div><div><dt>反向提示词</dt><dd>{{ task.negativePrompt || '未设置' }}</dd></div><div><dt>模型</dt><dd>{{ task.model }}</dd></div><div><dt>画布尺寸</dt><dd>{{ task.width }} × {{ task.height }}</dd></div><div><dt>创建时间</dt><dd>{{ task.createdAt }}</dd></div><div v-if="task.completedAt"><dt>完成时间</dt><dd>{{ task.completedAt }}</dd></div></dl>
    </template>
    <EmptyState v-else title="暂无任务详情" compact />
    <template #footer><button v-if="task?.status === 'failed'" class="btn btn--primary" type="button" @click="emit('retry', task)"><SvgIcon name="retry" :size="14" />重新生成</button><button v-if="task && task.status !== 'generating'" class="btn btn--danger" type="button" @click="emit('remove', task)"><SvgIcon name="trash" :size="14" />删除任务</button></template>
  </BaseDrawer>
</template>

<style scoped>
.detail-status { display: flex; align-items: center; justify-content: space-between; color: var(--c-text-placeholder); font-family: var(--font-mono); font-size: 11px; }
.detail-gallery { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 16px; }
.detail-image { position: relative; overflow: hidden; padding: 0; border: 0; border-radius: var(--radius); background: var(--c-bg); cursor: pointer; }
.detail-image img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
.detail-image span { position: absolute; right: 8px; bottom: 8px; display: flex; align-items: center; gap: 4px; padding: 4px 7px; border-radius: 12px; background: rgba(17,24,39,.65); color: #fff; font-size: 11px; }
.detail-processing, .detail-error, .detail-loading { display: flex; flex-direction: column; align-items: center; gap: 9px; padding: 46px 15px; margin-top: 16px; border-radius: var(--radius-lg); background: var(--c-primary-light); color: var(--c-primary); text-align: center; }
.detail-processing p, .detail-error p { color: var(--c-text-secondary); font-size: 12px; }
.detail-error { background: var(--c-danger-light); color: var(--c-danger); }
.detail-loading { flex-direction: row; justify-content: center; background: var(--c-bg); color: var(--c-text-secondary); }
.processing-ring { width: 30px; height: 30px; border: 3px solid #cfe2ff; border-top-color: var(--c-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.detail-list { margin-top: 20px; border-top: 1px solid var(--c-border-light); }
.detail-list > div { display: grid; grid-template-columns: 78px 1fr; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--c-border-light); font-size: 12px; }
.detail-list dt { color: var(--c-text-secondary); }
.detail-list dd { color: var(--c-text); line-height: 1.6; word-break: break-word; }
</style>
