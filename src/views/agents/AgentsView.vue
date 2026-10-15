<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import '@/assets/css/agents.css'
import type { AgentItem } from '@/api/agents'
import { useAgentsStore } from '@/stores/agents'
import AgentCard from './AgentCard.vue'
import AgentCreateDialog from './AgentCreateDialog.vue'

const router = useRouter()
const store = useAgentsStore()

const searchInput = ref('')
const createVisible = ref(false)
const editTarget = ref<AgentItem | null>(null)

const TABS = [
  { key: 'official', label: '官方智能体' },
  { key: 'mine', label: '我创建的' },
  { key: 'favorites', label: '我收藏的' },
] as const

onMounted(() => {
  store.syncUsername()
  store.loadMeta()
  store.loadList()
})

function doSearch() {
  store.setSearch(searchInput.value.trim())
}

function openCreate() {
  editTarget.value = null
  createVisible.value = true
}

/** 创建/保存成功后自动切到「我创建的」，让结果立即可见 */
function onSaved() {
  store.setTab('mine')
}

function openAgent(agent: AgentItem) {
  router.push(`/agents/${agent.id}/chat`)
}

async function toggleFav(agent: AgentItem) {
  try {
    await store.toggleFavorite(agent)
  } catch (e) {
    console.error(e)
  }
}
</script>

<template>
  <div class="agent-page">
    <!-- Hero：居中标题 + 双入口卡（样式对齐目标 UI：白卡 + 插画块 + 绿色主按钮） -->
    <header class="agent-hero">
      <h1 class="agent-hero__title"><em>超级智能体</em>，创建你的 APP 或助手</h1>
      <p class="agent-hero__sub">释放AI潜能，通过自定义模型、提示词和界面，打造属于你的智能应用。</p>

      <div class="agent-hero__cards">
        <section class="agent-entry">
          <div class="agent-entry__art" aria-hidden="true">
            <span class="agent-entry__art-line" /><span class="agent-entry__art-line" /><span class="agent-entry__art-line" />
            <span class="agent-entry__art-chip">✨ AI 生成内容</span>
          </div>
          <div class="agent-entry__body">
            <h3 class="agent-entry__title">创建智能体</h3>
            <p class="agent-entry__desc">创建专属智能体，自然语言驱动的助手</p>
            <ul class="agent-entry__feats">
              <li>支持自定义知识库</li>
              <li>多模型选择</li>
            </ul>
            <button class="agent-entry__btn" type="button" @click="openCreate">＋ 立即创建</button>
          </div>
        </section>

        <section class="agent-entry">
          <div class="agent-entry__art agent-entry__art--group" aria-hidden="true">
            <span class="agent-entry__node" /><span class="agent-entry__node" /><span class="agent-entry__node" />
          </div>
          <div class="agent-entry__body">
            <h3 class="agent-entry__title">
              创建多智能体集群
              <span class="agent-entry__soon">● 即将上线</span>
            </h3>
            <p class="agent-entry__desc">创建多个智能体协作的智能体集群</p>
            <button class="agent-entry__btn" type="button" disabled>敬请期待</button>
          </div>
        </section>
      </div>
    </header>

    <!-- Tabs + 搜索 + 热门标签（两行布局，对齐目标 UI） -->
    <div class="agent-toolbar">
      <nav class="agent-tabs">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="agent-tab"
          :class="{ 'is-active': store.activeTab === t.key }"
          @click="store.setTab(t.key)"
        >
          {{ t.label }}
        </button>
      </nav>
      <div class="agent-toolbar__row">
        <div class="agent-search">
          <input
            v-model="searchInput"
            placeholder="搜索智能体..."
            @keydown.enter="doSearch"
          />
          <button class="agent-search__btn" aria-label="搜索" @click="doSearch">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>
          </button>
        </div>
        <div class="agent-hot">
          <span class="agent-hot__label">热门标签:</span>
          <button
            v-for="t in store.hotTags"
            :key="t"
            class="agent-hot__tag"
            :class="{ 'is-active': store.activeTag === t }"
            @click="store.setTag(t)"
          >
            {{ t }}
          </button>
        </div>
      </div>
    </div>

    <!-- 主体：分类栏 + 卡片网格 -->
    <div class="agent-body">
      <aside class="agent-cats">
        <button
          class="agent-cat"
          :class="{ 'is-active': store.activeCategoryId === null }"
          @click="store.setCategory(null)"
        >
          <span class="agent-cat__name">🌐 全部</span>
          <span class="agent-cat__count">{{ store.total }}</span>
        </button>
        <button
          v-for="c in store.categories"
          :key="c.id"
          class="agent-cat"
          :class="{ 'is-active': store.activeCategoryId === c.id }"
          @click="store.setCategory(c.id)"
        >
          <span class="agent-cat__name">{{ c.icon }} {{ c.name }}</span>
          <span class="agent-cat__count">{{ c.count }}</span>
        </button>
      </aside>

      <main class="agent-main">
        <div v-if="store.loading" class="agent-grid">
          <div class="agent-empty">加载中…</div>
        </div>
        <div v-else-if="store.error" class="agent-grid">
          <div class="agent-error">{{ store.error }}</div>
        </div>
        <div v-else-if="store.list.length" class="agent-grid">
          <AgentCard
            v-for="a in store.list"
            :key="a.id"
            :agent="a"
            @open="openAgent"
            @fav="toggleFav"
          />
        </div>
        <div v-else class="agent-grid">
          <div class="agent-empty">
            <template v-if="store.activeTab === 'mine'">还没有创建过智能体，点击右上角「立即创建」试试</template>
            <template v-else-if="store.activeTab === 'favorites'">暂无收藏，点击卡片右上角的 ★ 收藏喜欢的智能体</template>
            <template v-else>没有匹配的智能体，换个条件试试</template>
          </div>
        </div>

        <div v-if="store.total > store.pageSize" class="agent-pager">
          <el-pagination
            layout="prev, pager, next"
            :total="store.total"
            :page-size="store.pageSize"
            :current-page="store.page"
            @current-change="store.setPage"
          />
        </div>
      </main>
    </div>

    <AgentCreateDialog v-model:visible="createVisible" :edit-agent="editTarget" @saved="onSaved" />
  </div>
</template>
