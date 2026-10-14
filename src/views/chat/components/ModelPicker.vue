<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { models as defaultModels, type ModelItem, type ModelTab } from '../data'

const props = defineProps<{
  model: ModelItem
  open: boolean
  models?: ModelItem[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [model: ModelItem]
  setting: []
}>()

const activeTab = ref('all')
const search = ref('')
const rootRef = ref<HTMLElement | null>(null)
const modelList = computed(() => (props.models?.length ? props.models : defaultModels))

/** 页签：全部 / 热门 / 后台各厂商 */
const tabs = computed<ModelTab[]>(() => {
  const base: ModelTab[] = [
    { key: 'all', label: '全部模型' },
    { key: 'hot', label: '热门模型' },
  ]
  const seen = new Map<string, string>()
  for (const m of modelList.value) {
    const key = m.series || 'custom'
    if (seen.has(key)) continue
    seen.set(key, m.providerName || m.desc || key)
  }
  for (const [key, label] of seen) {
    base.push({ key, label })
  }
  return base
})

function tabCount(key: string) {
  if (key === 'all') return modelList.value.length
  if (key === 'hot') return modelList.value.filter((m) => m.hot).length
  return modelList.value.filter((m) => m.series === key).length
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return modelList.value.filter((m) => {
    if (activeTab.value === 'hot' && !m.hot) return false
    if (activeTab.value !== 'all' && activeTab.value !== 'hot' && m.series !== activeTab.value) {
      return false
    }
    if (!q) return true
    const hay = `${m.label} ${m.desc} ${m.providerName || ''} ${m.key}`.toLowerCase()
    return hay.includes(q)
  })
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    // 打开时定位到当前模型所属厂商
    if (props.model?.series && tabs.value.some((t) => t.key === props.model.series)) {
      activeTab.value = props.model.series
    }
  },
)

watch(tabs, (list) => {
  if (!list.some((t) => t.key === activeTab.value)) {
    activeTab.value = 'all'
  }
})

function toggle(e: MouseEvent) {
  e.stopPropagation()
  emit('update:open', !props.open)
}

function onSelect(m: ModelItem, e: MouseEvent) {
  e.stopPropagation()
  emit('select', m)
  emit('update:open', false)
}

function onDocClick(e: MouseEvent) {
  if (!props.open) return
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    emit('update:open', false)
  }
}

function onKey(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    emit('update:open', true)
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="rootRef" class="model-picker" @click.stop>
    <button type="button" title="点击此处切换模型" @click="toggle">
      <img class="mi" :src="model.icon" alt="" />
      <span class="mmeta">
        <span class="mname">{{ model.label }}</span>
        <span class="mtip">{{ model.providerName || model.desc || '选择模型系列' }}</span>
      </span>
      <i class="ri-arrow-down-s-line chev"></i>
    </button>

    <div class="panel" :class="{ open }">
      <div class="panel-head">
        <div class="panel-head-row">
          <div class="panel-title">
            选择模型系列
            <button class="gear" type="button" title="模型设置" @click.stop="emit('setting')">
              <i class="ri-settings-3-line"></i>
            </button>
          </div>
          <div class="panel-search">
            <i class="ri-search-line" style="font-size: 15px"></i>
            <input v-model="search" type="search" placeholder="搜索系列 / 厂商" />
          </div>
        </div>
        <div class="panel-tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="panel-tab"
            :class="{ active: t.key === activeTab }"
            type="button"
            @click="activeTab = t.key"
          >
            {{ t.label }} ({{ tabCount(t.key) }})
          </button>
        </div>
      </div>
      <div class="panel-body">
        <div v-if="!filtered.length" class="model-empty">
          暂无可用系列。请到后台「厂商接入」点「同步模型」，或在「模型管理」中启用。
        </div>
        <div
          v-for="(m, i) in filtered"
          :key="m.key"
          class="model-item"
          :class="{ active: m.key === model.key }"
          @click="onSelect(m, $event)"
        >
          <span class="mi-rank">{{ i + 1 }}</span>
          <span class="mi-letter" :style="{ background: m.color }">{{ m.letter }}</span>
          <div class="mi-body">
            <div class="mi-title">
              {{ m.label }}
              <span v-if="m.capability === 'image'" class="chip chip-hot">生图</span>
              <span v-if="m.variants?.length" class="chip chip-free">{{ m.variants.length }} 个型号</span>
              <span v-if="m.cost != null" class="chip-cost">{{ m.cost }}</span>
              <span v-if="m.free" class="chip chip-free">限时免费</span>
              <span v-if="m.hot && activeTab !== 'hot'" class="chip chip-hot">热门</span>
            </div>
            <div class="mi-desc">
              {{ m.providerName || m.desc }}
              <span v-if="m.key" class="mi-id"> · {{ m.key }}</span>
            </div>
          </div>
          <i class="ri-check-line mi-check"></i>
        </div>
      </div>
    </div>
  </div>
</template>
