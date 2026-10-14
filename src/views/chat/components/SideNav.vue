<script setup lang="ts">
import { computed, ref } from 'vue'
import { LOGO, type NavSection } from '../data'

const props = defineProps<{
  sections: NavSection[]
  collapsed: boolean
  open: boolean
  activeKey: string
  activeSessionId: number | null
}>()

const emit = defineEmits<{
  toggleCollapse: []
  newChat: []
  select: [payload: { key: string; name: string; page?: boolean }]
}>()

/** 历史已迁至右侧抽屉，侧栏以能力入口为主 */
const featuresOpen = ref(true)

const featureCount = computed(() =>
  props.sections.reduce((n, sec) => n + sec.items.length, 0),
)

function onNewChat() {
  emit('newChat')
}
</script>

<template>
  <!--
    侧栏结构：
    1. 品牌
    2. 新建对话
    3. 能力入口
  -->
  <aside class="sider" :class="{ collapsed, open }">
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

    <div class="sider-features sider-features-main" :class="{ open: featuresOpen || collapsed }">
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
      <nav v-show="featuresOpen || collapsed" class="features-body sider-scroll">
        <div v-for="(sec, si) in sections" :key="si" class="nav-group">
          <div v-if="sec.title && !collapsed" class="nav-group-title">{{ sec.title }}</div>
          <a
            v-for="it in sec.items"
            :key="it.key"
            class="nav-item"
            :class="{ active: it.key === activeKey && !activeSessionId }"
            href="javascript:;"
            :title="it.name"
            @click.prevent="emit('select', { key: it.key, name: it.name, page: it.page })"
          >
            <span class="ico"><img :src="it.icon" alt="" /></span>
            <span class="txt">
              {{ it.name }}
              <span v-if="it.dot" class="dot-new"></span>
            </span>
            <span v-if="it.tag" class="tag" :class="it.tagCls || 'tag-num'">{{ it.tag }}</span>
          </a>
        </div>
      </nav>
    </div>
  </aside>
</template>
