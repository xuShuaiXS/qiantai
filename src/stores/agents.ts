import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as agentsApi from '@/api/agents'
import type {
  AgentCategory,
  AgentItem,
  AgentTab,
  CreateAgentPayload,
} from '@/api/agents'
import { useAuthStore } from '@/stores/auth'

export const useAgentsStore = defineStore('agents', () => {
  /* ------------------------------ state ------------------------------ */
  const categories = ref<AgentCategory[]>([])
  const hotTags = ref<string[]>([])
  const list = ref<AgentItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(12)
  const loading = ref(false)
  const metaLoading = ref(false)
  const error = ref('')

  const activeTab = ref<AgentTab>('official')
  /** null = 全部分类 */
  const activeCategoryId = ref<number | null>(null)
  const search = ref('')
  const activeTag = ref('')

  /* ------------------------------ helpers ------------------------------ */

  /** 把当前登录用户名同步给 api 层（X-User 头 / mock 的"我创建的"过滤）。
   *  未登录或 8080 宕机取不到用户时，保留浏览器里上次的身份，避免漂移。 */
  function syncUsername() {
    const auth = useAuthStore()
    agentsApi.setCurrentUsername(auth.user?.username)
  }

  async function loadMeta() {
    metaLoading.value = true
    try {
      const [cats, tags] = await Promise.all([
        agentsApi.fetchAgentCategories(),
        agentsApi.fetchHotTags(),
      ])
      categories.value = cats
      hotTags.value = tags
    } catch {
      /* 分类/标签加载失败不阻断市场页，左侧栏留空 */
    } finally {
      metaLoading.value = false
    }
  }

  async function loadList() {
    loading.value = true
    error.value = ''
    try {
      const res = await agentsApi.fetchAgents({
        tab: activeTab.value,
        categoryId: activeCategoryId.value ?? undefined,
        search: search.value || undefined,
        tag: activeTag.value || undefined,
        page: page.value,
        pageSize: pageSize.value,
      })
      list.value = res.list
      total.value = res.total
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败'
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /* ------------------------------ actions ------------------------------ */

  function setTab(tab: AgentTab) {
    if (activeTab.value === tab) return
    activeTab.value = tab
    page.value = 1
    loadList()
  }

  function setCategory(id: number | null) {
    if (activeCategoryId.value === id) return
    activeCategoryId.value = id
    page.value = 1
    loadList()
  }

  function setSearch(text: string) {
    search.value = text
    page.value = 1
    loadList()
  }

  function setTag(tag: string) {
    activeTag.value = activeTag.value === tag ? '' : tag
    page.value = 1
    loadList()
  }

  function setPage(p: number) {
    if (page.value === p) return
    page.value = p
    loadList()
  }

  async function toggleFavorite(agent: AgentItem) {
    const res = await agentsApi.toggleAgentFavorite(agent.id, !agent.isFavorited)
    const idx = list.value.findIndex((a) => a.id === agent.id)
    const item = list.value[idx]
    if (idx !== -1 && item) {
      list.value[idx] = { ...item, isFavorited: res.isFavorited }
    }
    // 在"我收藏的"tab 里取消收藏后列表要刷新
    if (activeTab.value === 'favorites') await loadList()
  }

  async function createAgent(payload: CreateAgentPayload) {
    const created = await agentsApi.createAgent(payload)
    await refreshAfterChange()
    return created
  }

  async function updateAgent(id: number, payload: Partial<CreateAgentPayload>) {
    const updated = await agentsApi.updateAgent(id, payload)
    await refreshAfterChange()
    return updated
  }

  async function deleteAgent(id: number) {
    await agentsApi.deleteAgent(id)
    await refreshAfterChange()
  }

  function refreshAfterChange() {
    return Promise.all([loadMeta(), loadList()])
  }

  return {
    categories,
    hotTags,
    list,
    total,
    page,
    pageSize,
    loading,
    metaLoading,
    error,
    activeTab,
    activeCategoryId,
    search,
    activeTag,
    syncUsername,
    loadMeta,
    loadList,
    setTab,
    setCategory,
    setSearch,
    setTag,
    setPage,
    toggleFavorite,
    createAgent,
    updateAgent,
    deleteAgent,
  }
})
