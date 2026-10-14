<script setup>
import BaseTag from '@/components/BaseTag.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({ task: { type: Object, required: true } })
const emit = defineEmits(['detail', 'retry', 'remove', 'download'])
const STATUS = {
  pending: { label: '排队中', color: 'warning' }, generating: { label: '生成中', color: 'primary' }, success: { label: '已完成', color: 'success' }, failed: { label: '生成失败', color: 'danger' },
}
const status = () => STATUS[props.task.status] || STATUS.pending
function sizeText() { return `${props.task.width} × ${props.task.height}` }
function shortPrompt() { return props.task.prompt.length > 46 ? `${props.task.prompt.slice(0, 46)}…` : props.task.prompt }
</script>

<template>
  <article class="task-card card">
    <button class="task-card__preview" type="button" @click="emit('detail', task)">
      <template v-if="task.status === 'success' && task.images?.length">
        <img :src="task.images[0].url" :alt="task.prompt" />
        <span v-if="task.images.length > 1" class="task-card__count">{{ task.images.length }} 张</span>
      </template>
      <div v-else-if="['pending', 'generating'].includes(task.status)" class="task-card__processing"><span class="processing-ring" /><strong>{{ task.status === 'pending' ? '等待生成' : '正在创作' }}</strong><small>极光AI 正在处理你的灵感</small></div>
      <div v-else class="task-card__failed"><SvgIcon name="alert" :size="25" /><strong>生成未完成</strong><small>{{ task.errorMessage }}</small></div>
    </button>
    <div class="task-card__body">
      <div class="task-card__top"><BaseTag :color="status().color" dot>{{ status().label }}</BaseTag><span class="task-card__time">{{ task.createdAt.slice(5, 16) }}</span></div>
      <p class="task-card__prompt" :title="task.prompt">{{ shortPrompt() }}</p>
      <div class="task-card__meta"><span>{{ sizeText() }}</span><span>·</span><span>{{ task.count }} 张</span><span>·</span><span>{{ task.model }}</span></div>
      <div class="task-card__actions">
        <button type="button" @click="emit('detail', task)"><SvgIcon name="file" :size="14" />详情</button>
        <button v-if="task.status === 'success'" type="button" @click="emit('download', task)"><SvgIcon name="download" :size="14" />下载</button>
        <button v-if="task.status === 'failed'" type="button" @click="emit('retry', task)"><SvgIcon name="retry" :size="14" />重试</button>
        <button v-if="task.status !== 'generating'" class="task-card__delete" type="button" @click="emit('remove', task)"><SvgIcon name="trash" :size="14" />删除</button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.task-card { overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
.task-card:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
.task-card__preview { position: relative; display: block; width: 100%; aspect-ratio: 1.2; padding: 0; border: 0; background: var(--c-bg); overflow: hidden; cursor: pointer; }
.task-card__preview img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .3s ease; }
.task-card:hover .task-card__preview img { transform: scale(1.03); }
.task-card__count { position: absolute; right: 10px; bottom: 10px; padding: 3px 7px; border-radius: 12px; background: rgba(17,24,39,.62); color: #fff; font-size: 11px; }
.task-card__processing, .task-card__failed { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 18px; color: var(--c-text-regular); background: linear-gradient(135deg, #eef5ff, #f7f4ff); }
.task-card__processing small, .task-card__failed small { color: var(--c-text-secondary); font-size: 11px; text-align: center; line-height: 1.5; }
.task-card__failed { background: var(--c-danger-light); color: var(--c-danger); }
.task-card__failed small { color: var(--c-text-secondary); }
.processing-ring { width: 30px; height: 30px; border: 3px solid #cfe2ff; border-top-color: var(--c-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.task-card__body { padding: 12px 14px 13px; }
.task-card__top, .task-card__meta, .task-card__actions { display: flex; align-items: center; }
.task-card__top { justify-content: space-between; }
.task-card__time { color: var(--c-text-placeholder); font-size: 11px; }
.task-card__prompt { margin-top: 9px; font-size: 13px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.task-card__meta { gap: 6px; margin-top: 7px; color: var(--c-text-secondary); font-size: 11px; }
.task-card__actions { gap: 13px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--c-border-light); }
.task-card__actions button { display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: transparent; color: var(--c-text-secondary); font-size: 11px; cursor: pointer; }
.task-card__actions button:hover { color: var(--c-primary); }
.task-card__actions .task-card__delete { margin-left: auto; }
.task-card__actions .task-card__delete:hover { color: var(--c-danger); }
</style>
