<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { SessionBadge } from '../composables/useGenerationJobs'
import ConfirmBubble from './ConfirmBubble.vue'

export interface HistoryItem {
  id: number
  title: string
}

const props = defineProps<{
  open: boolean
  history: HistoryItem[]
  activeSessionId: number | null
  sessionBadges?: Record<number, SessionBadge>
}>()

const emit = defineEmits<{
  close: []
  refresh: []
  selectSession: [id: number]
  deleteSession: [id: number]
  batchDeleteSessions: [ids: number[]]
  renameSession: [payload: { id: number; title: string }]
  clearAll: []
}>()

const selectMode = ref(false)
const selected = ref<Set<number>>(new Set())
const pendingDeleteId = ref<number | null>(null)
const batchConfirmOpen = ref(false)
const clearConfirmOpen = ref(false)
const searchQuery = ref('')
const renamingId = ref<number | null>(null)
const renameDraft = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

const selectedCount = computed(() => selected.value.size)
const allSelected = computed(
  () => props.history.length > 0 && selected.value.size === props.history.length,
)

const filteredHistory = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.history
  return props.history.filter((h) => (h.title || '新对话').toLowerCase().includes(q))
})

watch(
  () => props.open,
  (v) => {
    if (!v) {
      exitSelectMode()
      renamingId.value = null
      clearConfirmOpen.value = false
    }
  },
)

watch(
  () => props.history.map((h) => h.id).join(','),
  () => {
    const alive = new Set(props.history.map((h) => h.id))
    const next = new Set<number>()
    for (const id of selected.value) {
      if (alive.has(id)) next.add(id)
    }
    selected.value = next
    if (pendingDeleteId.value != null && !alive.has(pendingDeleteId.value)) {
      pendingDeleteId.value = null
    }
    if (renamingId.value != null && !alive.has(renamingId.value)) {
      renamingId.value = null
    }
  },
)

function badgeTitle(b?: SessionBadge) {
  if (b === 'generating') return '生成中'
  if (b === 'failed') return '生成失败'
  if (b === 'unread') return '有新回复'
  return ''
}

function exitSelectMode() {
  selectMode.value = false
  selected.value = new Set()
  batchConfirmOpen.value = false
  pendingDeleteId.value = null
}

function toggleSelectMode() {
  if (selectMode.value) {
    exitSelectMode()
    return
  }
  pendingDeleteId.value = null
  batchConfirmOpen.value = false
  clearConfirmOpen.value = false
  renamingId.value = null
  selectMode.value = true
}

function toggleOne(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set()
    return
  }
  selected.value = new Set(props.history.map((h) => h.id))
}

function onItemClick(id: number) {
  if (selectMode.value) {
    toggleOne(id)
    return
  }
  if (renamingId.value === id) return
  pendingDeleteId.value = null
  emit('selectSession', id)
  emit('close')
}

function openSingleConfirm(id: number) {
  batchConfirmOpen.value = false
  clearConfirmOpen.value = false
  renamingId.value = null
  pendingDeleteId.value = pendingDeleteId.value === id ? null : id
}

function confirmSingleDelete() {
  const id = pendingDeleteId.value
  pendingDeleteId.value = null
  if (id != null) emit('deleteSession', id)
}

function openBatchConfirm() {
  if (!selectedCount.value) return
  pendingDeleteId.value = null
  clearConfirmOpen.value = false
  batchConfirmOpen.value = true
}

function confirmBatchDelete() {
  const ids = [...selected.value]
  batchConfirmOpen.value = false
  if (!ids.length) return
  emit('batchDeleteSessions', ids)
  exitSelectMode()
}

function onHistoryClick(h: HistoryItem, e: MouseEvent) {
  e.preventDefault()
  onItemClick(h.id)
}

async function startRename(h: HistoryItem) {
  if (selectMode.value) return
  pendingDeleteId.value = null
  renamingId.value = h.id
  renameDraft.value = h.title || '新对话'
  await nextTick()
  renameInputRef.value?.focus()
  renameInputRef.value?.select()
}

function commitRename() {
  const id = renamingId.value
  if (id == null) return
  const title = renameDraft.value.trim() || '新对话'
  renamingId.value = null
  const cur = props.history.find((x) => x.id === id)
  if (cur && cur.title === title) return
  emit('renameSession', { id, title })
}

function cancelRename() {
  renamingId.value = null
}

function setRenameInputEl(el: unknown) {
  renameInputRef.value = el instanceof HTMLInputElement ? el : null
}

function onClearClick() {
  if (!props.history.length) return
  pendingDeleteId.value = null
  batchConfirmOpen.value = false
  clearConfirmOpen.value = !clearConfirmOpen.value
}

function confirmClearAll() {
  clearConfirmOpen.value = false
  emit('clearAll')
}
</script>

<template>
  <div class="history-mask" :class="{ show: open }" @click="emit('close')"></div>
  <aside class="history-drawer" :class="{ open, 'select-mode': selectMode }" aria-label="历史记录">
    <div class="hd-head">
      <button class="hd-icon-btn" type="button" title="关闭" @click="emit('close')">
        <i class="ri-close-line"></i>
      </button>
      <div class="hd-title">历史记录</div>
      <button class="hd-icon-btn" type="button" title="刷新" @click="emit('refresh')">
        <i class="ri-refresh-line"></i>
      </button>
      <div class="hd-clear-wrap">
        <button
          class="hd-clear"
          type="button"
          title="清空"
          :disabled="!history.length"
          @click="onClearClick"
        >
          <i class="ri-delete-bin-line"></i>
          清空
        </button>
        <ConfirmBubble
          v-if="clearConfirmOpen"
          class="hd-clear-bubble"
          text="确认清空全部历史对话？"
          @confirm="confirmClearAll"
          @cancel="clearConfirmOpen = false"
        />
      </div>
    </div>

    <div class="hd-toolbar">
      <div v-if="history.length" class="hd-search">
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜索对话…"
          autocomplete="off"
          @click.stop
        />
      </div>
      <button
        v-if="history.length"
        class="hd-manage"
        type="button"
        :title="selectMode ? '完成' : '管理'"
        @click="toggleSelectMode"
      >
        {{ selectMode ? '完成' : '管理' }}
      </button>
    </div>

    <div v-if="selectMode && history.length" class="hd-select-bar">
      <label class="hd-check-all" @click.prevent="toggleAll">
        <input type="checkbox" :checked="allSelected" tabindex="-1" />
        <span>全选</span>
      </label>
      <span class="hd-selected-count">已选 {{ selectedCount }}</span>
    </div>

    <nav class="hd-scroll">
      <div v-if="!history.length" class="hd-empty">暂无历史记录</div>
      <div v-else-if="!filteredHistory.length" class="hd-empty">无匹配对话</div>
      <a
        v-for="h in filteredHistory"
        :key="h.id"
        class="hd-item"
        :class="{
          active: !selectMode && activeSessionId === h.id,
          checked: selectMode && selected.has(h.id),
        }"
        href="javascript:;"
        :title="h.title"
        @click="onHistoryClick(h, $event)"
      >
        <span v-if="selectMode" class="hd-check" @click.stop="toggleOne(h.id)">
          <input type="checkbox" :checked="selected.has(h.id)" tabindex="-1" @click.prevent />
        </span>
        <span v-else class="hd-ico"><i class="ri-chat-3-line"></i></span>
        <span v-if="renamingId === h.id" class="hd-txt" @click.stop>
          <input
            :ref="setRenameInputEl"
            v-model="renameDraft"
            class="hd-rename-input"
            maxlength="64"
            @keydown.enter.prevent="commitRename"
            @keydown.esc.prevent="cancelRename"
            @blur="commitRename"
          />
        </span>
        <span v-else class="hd-txt">
          {{ h.title || '新对话' }}
          <span
            v-if="sessionBadges?.[h.id]"
            class="hist-badge"
            :class="sessionBadges[h.id]"
            :title="badgeTitle(sessionBadges[h.id])"
          >
            <i
              v-if="sessionBadges[h.id] === 'generating'"
              class="ri-loader-4-line hist-spin"
            ></i>
          </span>
        </span>
        <span v-if="!selectMode && renamingId !== h.id" class="hd-del-wrap">
          <button
            class="hd-rename"
            type="button"
            title="重命名"
            @click.stop="startRename(h)"
          >
            <i class="ri-edit-line"></i>
          </button>
          <button
            class="hd-del"
            type="button"
            title="删除"
            @click.stop="openSingleConfirm(h.id)"
          >
            <i class="ri-close-line"></i>
          </button>
          <ConfirmBubble
            v-if="pendingDeleteId === h.id"
            text="删除此对话？"
            @confirm="confirmSingleDelete"
            @cancel="pendingDeleteId = null"
          />
        </span>
      </a>
    </nav>

    <div v-if="selectMode && history.length" class="hd-batch-bar">
      <button
        class="hd-batch-del"
        type="button"
        :disabled="!selectedCount"
        @click="openBatchConfirm"
      >
        删除{{ selectedCount ? ` ${selectedCount} 项` : '' }}
      </button>
      <ConfirmBubble
        v-if="batchConfirmOpen"
        class="hd-batch-bubble"
        :text="`确认删除选中的 ${selectedCount} 条对话？`"
        @confirm="confirmBatchDelete"
        @cancel="batchConfirmOpen = false"
      />
    </div>

    <div class="hd-foot">历史记录最多保留六个月，请及时导出记录。</div>
  </aside>
</template>
