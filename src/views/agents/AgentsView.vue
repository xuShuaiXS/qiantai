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
    <!-- Hero -->
    <header class="agent-hero">
      <div class="agent-hero__intro">
        <h1 class="agent-hero__title">超级<em>智能体</em></h1>
        <p class="agent-hero__sub">创建你的 APP 或助手 —— 通过自定义模型、提示词和界面，让 AI 完成你的专属任务</p>
      </div>
      <div class="agent-hero__cards">
        <section class="agent-entry agent-entry--create">
          <div class="agent-entry__head">
            <span>创建智能体</span>
            <span class="agent-entry__badge">人人可用</span>
          </div>
          <ul class="agent-entry__feats">
            <li>支持自定义知识库</li>
            <li>多模型选择</li>
          </ul>
          <button class="agent-entry__btn" @click="openCreate">立即创建</button>
        </section>
        <section class="agent-entry agent-entry--group">
          <div class="agent-entry__head">
            <span>创建多智能体群</span>
            <span class="agent-entry__badge">即将上线</span>
          </div>
          <ul class="agent-entry__feats">
            <li>多智能体协同作业</li>
            <li>任务自动编排</li>
          </ul>
          <button class="agent-entry__btn" disabled>敬请期待</button>
        </section>
      </div>
    </header>

    <!-- Tabs + 搜索 -->
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
      <div class="agent-search">
        <input
          v-model="searchInput"
          placeholder="搜索智能体名称、描述或标签"
          @keydown.enter="doSearch"
        />
        <button class="agent-search__btn" @click="doSearch">搜索</button>
      </div>
    </div>

    <!-- 热门标签 -->
    <div class="agent-hot">
      <span class="agent-hot__label">热门标签：</span>
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

    <AgentCreateDialog v-model:visible="createVisible" :edit-agent="editTarget" />
  </div>
</template>
