<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { LOGO, type NavSection } from '../data'
import type { SessionBadge } from '../composables/useGenerationJobs'
import ConfirmBubble from './ConfirmBubble.vue'

export interface HistoryItem {
  id: number
  title: string
}

const props = defineProps<{
  sections: NavSection[]
  collapsed: boolean
  open: boolean
  activeKey: string
  history: HistoryItem[]
  activeSessionId: number | null
  /** 会话 id → 侧栏状态 */
  sessionBadges?: Record<number, SessionBadge>
}>()

const emit = defineEmits<{
  toggleCollapse: []
  newChat: []
  select: [payload: { key: string; name: string; page?: boolean; route?: string }]
  selectSession: [id: number]
  deleteSession: [id: number]
  batchDeleteSessions: [ids: number[]]
  renameSession: [payload: { id: number; title: string }]
}>()

const selectMode = ref(false)
const selected = ref<Set<number>>(new Set())
const pendingDeleteId = ref<number | null>(null)
const batchConfirmOpen = ref(false)
/** 能力入口默认收起，把纵向空间留给历史对话 */
const featuresOpen = ref(false)
const searchQuery = ref('')
const renamingId = ref<number | null>(null)
const renameDraft = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

const selectedCount = computed(() => selected.value.size)
const allSelected = computed(
  () => props.history.length > 0 && selected.value.size === props.history.length,
)

const featureCount = computed(() =>
  props.sections.reduce((n, sec) => n + sec.items.length, 0),
)

const filteredHistory = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.history
  return props.history.filter((h) => (h.title || '新对话').toLowerCase().includes(q))
})

watch(
  () => props.collapsed,
  (v) => {
    if (v) exitSelectMode()
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
}

function openSingleConfirm(id: number) {
  batchConfirmOpen.value = false
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

function onNewChat() {
  exitSelectMode()
  renamingId.value = null
  emit('newChat')
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
</script>

<template>
  <!--
    侧栏结构（对话优先）：
    1. 品牌
    2. 新建对话
    3. 历史对话（主滚动区）
    4. 能力入口（底部可折叠「更多」）
  -->
  <aside class="sider" :class="{ collapsed, open, 'select-mode': selectMode }">
    <div class="sider-head">
      <img class="logo" :src="LOGO" alt="极光AI" />
      <span class="name">极光AI <em>4周年</em></span>
    </div>
    <button
      class="sider-collapse"
      type="button"
      title="收起侧栏"
      @click="emit('toggleCollapse')"
    >
      <i class="ri-arrow-left-s-line"></i>
    </button>

    <div class="sider-actions">
      <button
        class="sider-new-chat"
        type="button"
        title="新建对话"
        @click="onNewChat"
      >
        <span class="ico"><i class="ri-add-line"></i></span>
        <span class="txt">新建对话</span>
      </button>
    </div>

    <nav class="sider-scroll history-scroll">
      <div class="nav-group history-group history-primary">
        <div class="history-head">
          <div class="nav-group-title">历史对话</div>
          <button
            v-if="history.length"
            class="history-manage"
            type="button"
            :title="selectMode ? '完成' : '管理'"
            @click="toggleSelectMode"
          >
            {{ selectMode ? '完成' : '管理' }}
          </button>
        </div>

        <div v-if="history.length && !collapsed" class="history-search">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="搜索对话…"
            autocomplete="off"
            @click.stop
          />
        </div>

        <div v-if="selectMode && history.length" class="history-select-bar">
          <label class="history-check-all" @click.prevent="toggleAll">
            <input type="checkbox" :checked="allSelected" tabindex="-1" />
            <span>全选</span>
          </label>
          <span class="history-selected-count">已选 {{ selectedCount }}</span>
        </div>

        <div v-if="!history.length" class="history-empty">暂无记录</div>
        <div v-else-if="!filteredHistory.length" class="history-empty">无匹配对话</div>
        <a
          v-for="h in filteredHistory"
          :key="h.id"
          class="nav-item history-item"
          :class="{
            active: !selectMode && activeSessionId === h.id,
            checked: selectMode && selected.has(h.id),
          }"
          href="javascript:;"
          :title="h.title"
          @click="onHistoryClick(h, $event)"
        >
          <span v-if="selectMode" class="history-check" @click.stop="toggleOne(h.id)">
            <input type="checkbox" :checked="selected.has(h.id)" tabindex="-1" @click.prevent />
          </span>
          <span v-else class="ico"><i class="ri-chat-3-line"></i></span>
          <span v-if="renamingId === h.id" class="txt" @click.stop>
            <input
              :ref="setRenameInputEl"
              v-model="renameDraft"
              class="history-rename-input"
              maxlength="64"
              @keydown.enter.prevent="commitRename"
              @keydown.esc.prevent="cancelRename"
              @blur="commitRename"
            />
          </span>
          <span v-else class="txt">
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
          <span v-if="!selectMode && renamingId !== h.id" class="history-del-wrap">
            <button
              class="history-rename"
              type="button"
              title="重命名"
              @click.stop="startRename(h)"
            >
              <i class="ri-edit-line"></i>
            </button>
            <button
              class="history-del"
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
      </div>
    </nav>

    <div class="sider-features" :class="{ open: featuresOpen || collapsed }">
      <button
        v-if="!collapsed"
        class="features-toggle"
        type="button"
        :aria-expanded="featuresOpen"
        @click="featuresOpen = !featuresOpen"
      >
        <span class="txt">更多能力</span>
        <span class="features-meta">{{ featureCount }}</span>
        <i class="ri-arrow-up-s-line features-chevron" :class="{ open: featuresOpen }"></i>
      </button>
      <div v-show="featuresOpen || collapsed" class="features-body">
        <div v-for="(sec, si) in sections" :key="si" class="nav-group">
          <div v-if="sec.title && !collapsed" class="nav-group-title">{{ sec.title }}</div>
          <a
            v-for="it in sec.items"
            :key="it.key"
            class="nav-item"
            :class="{ active: it.key === activeKey && !activeSessionId }"
            href="javascript:;"
            :title="it.name"
            @click.prevent="emit('select', { key: it.key, name: it.name, page: it.page, route: it.route })"
          >
            <span class="ico"><img :src="it.icon" alt="" /></span>
            <span class="txt">
              {{ it.name }}
              <span v-if="it.dot" class="dot-new"></span>
            </span>
            <span v-if="it.tag" class="tag" :class="it.tagCls || 'tag-num'">{{ it.tag }}</span>
          </a>
        </div>
      </div>
    </div>

    <div v-if="selectMode && history.length" class="history-batch-bar">
      <button
        class="history-batch-del"
        type="button"
        :disabled="!selectedCount"
        @click="openBatchConfirm"
      >
        删除{{ selectedCount ? ` ${selectedCount} 项` : '' }}
      </button>
      <ConfirmBubble
        v-if="batchConfirmOpen"
        class="history-batch-bubble"
        :text="`确认删除选中的 ${selectedCount} 条对话？`"
        @confirm="confirmBatchDelete"
        @cancel="batchConfirmOpen = false"
      />
    </div>
  </aside>
</template>
