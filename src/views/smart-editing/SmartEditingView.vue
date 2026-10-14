<script setup>
/**
 * 智能修图 · 模块首页（参考设计稿 UI）
 *
 * 结构：
 *   1. Hero 大标题：✨ AI一键修图，人人都是设计师 ✨
 *   2. 效果展示条：产品/人物/动物/物品 Tab + 原图/抠图/换背景/抠图2.0 四联演示
 *   3. AI图片工具：分类 chips（全部/智能抠图/AI消除/变清晰/无损改尺寸/其他）+ 工具卡片网格
 *
 * 交互约定：
 *   - 分类归属「智能抠图」的工具 → 跳转抠图编辑页
 *   - 分类归属「AI消除」的工具   → 跳转消除编辑页
 *   - 其余分类（变清晰/无损改尺寸/其他）→ 弹「开发中」提示
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from '@/composables/useMessage'

const router = useRouter()
const message = useMessage()

/* ---------------- 效果展示条 ---------------- */
const SHOWCASE_TABS = [
  { value: 'product', label: '产品', emoji: '🚗', scene: 'linear-gradient(160deg, #aebfd4 0%, #8fa5c0 55%, #6f88ab 100%)', replace: 'linear-gradient(160deg, #f6d5c3 0%, #eeb29a 60%, #e08e7a 100%)' },
  { value: 'person', label: '人物', emoji: '🧑‍🎤', scene: 'linear-gradient(160deg, #c7d4e8 0%, #9fb4d4 55%, #7d97bf 100%)', replace: 'linear-gradient(160deg, #d9e7fb 0%, #aecdf5 60%, #8ab2ec 100%)' },
  { value: 'animal', label: '动物', emoji: '🐱', scene: 'linear-gradient(160deg, #d8e3c8 0%, #b7cba0 55%, #94b078 100%)', replace: 'linear-gradient(160deg, #f9e3bb 0%, #f2c98b 60%, #eaa95e 100%)' },
  { value: 'item', label: '物品', emoji: '👟', scene: 'linear-gradient(160deg, #e3d9d0 0%, #c8b8a8 55%, #a89582 100%)', replace: 'linear-gradient(160deg, #d8ecf4 0%, #aedcea 60%, #84c8dd 100%)' },
]
const activeShowcase = ref('product')
const activeScene = computed(() => SHOWCASE_TABS.find((tab) => tab.value === activeShowcase.value) || SHOWCASE_TABS[0])

/* ---------------- AI 图片工具 ---------------- */
const TOOL_CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'remove-bg', label: '智能抠图' },
  { value: 'remove-object', label: 'AI消除' },
  { value: 'clarity', label: '变清晰' },
  { value: 'resize', label: '无损改尺寸' },
  { value: 'other', label: '其他' },
]

/** action: 'remove-bg' | 'remove-object' → 跳编辑页；其余 → 开发中提示 */
const TOOLS = [
  { value: 'ai-avatar', title: 'AI 头像', emoji: '🌄', tint: 'linear-gradient(140deg, #cfe3d8, #9ec9b4)', category: 'other' },
  { value: 'product-bg', title: '商品换背景', emoji: '🧴', tint: 'linear-gradient(140deg, #cfe4f6, #9cc6ec)', category: 'remove-bg', action: 'remove-bg' },
  { value: 'ai-expand', title: 'AI 扩图', emoji: '🏞️', tint: 'linear-gradient(140deg, #d6e6cf, #a8cba0)', category: 'resize' },
  { value: 'light-shadow', title: '光影图片制作', emoji: '🎀', tint: 'linear-gradient(140deg, #e8d9f2, #c7a9e4)', category: 'other' },
  { value: 'homework', title: 'AI 作业帮', emoji: '📕', tint: 'linear-gradient(140deg, #f6ddd3, #eab5a0)', category: 'other' },
  { value: 'online-cutout', title: 'AI 智能在线抠图', emoji: '✂️', tint: 'linear-gradient(140deg, #fbe3ec, #f3b8cd)', category: 'remove-bg', action: 'remove-bg' },
  { value: 'lossless-zoom', title: 'AI 智能图片无损放大', emoji: '🔍', tint: 'linear-gradient(140deg, #d4e6f2, #a3cbe4)', category: 'clarity' },
  { value: 'ai-erase', title: 'AI 图片消除', emoji: '🧽', tint: 'linear-gradient(140deg, #d5e9f0, #a5cfe0)', category: 'remove-object', action: 'remove-object' },
  { value: 'ai-text-remove', title: 'AI 去字迹', emoji: '🧹', tint: 'linear-gradient(140deg, #f9e0d9, #eeb0a2)', category: 'remove-object', action: 'remove-object' },
  { value: 'old-photo-color', title: '老照片上色', emoji: '🎴', tint: 'linear-gradient(140deg, #e3e0d2, #c2bda2)', category: 'other' },
  { value: 'anime-fix', title: '动漫模糊修复', emoji: '🌀', tint: 'linear-gradient(140deg, #d8dcf5, #a9b2e8)', category: 'clarity' },
  { value: 'old-photo-fix', title: '老照片修复', emoji: '🖼️', tint: 'linear-gradient(140deg, #e7e3d8, #c4bca8)', category: 'clarity' },
  { value: 'portrait-denoise', title: '人像噪点去除', emoji: '😊', tint: 'linear-gradient(140deg, #dfe5ea, #b4c2cf)', category: 'clarity' },
  { value: 'ai-dress', title: 'AI 换装', emoji: '👗', tint: 'linear-gradient(140deg, #fadbe8, #f0aecb)', category: 'other' },
]

const activeCategory = ref('all')
const keyword = ref('')
const filteredTools = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return TOOLS.filter((tool) => {
    const matchCategory = activeCategory.value === 'all' || tool.category === activeCategory.value
    const matchKeyword = !kw || tool.title.toLowerCase().includes(kw)
    return matchCategory && matchKeyword
  })
})

function handleToolClick(tool) {
  if (tool.action) {
    router.push(`/smart-editing/${tool.action}`)
    return
  }
  message.info(`「${tool.title}」功能开发中，敬请期待`)
}
</script>

<template>
  <div class="page smart-editing-page">
    <!-- 顶部右上角：新AI修图入口（参考图 1） -->
    <div class="se-topbar">
      <button class="se-new-btn" type="button" @click="router.push('/smart-editing')">
        <span class="se-new-btn__star">⭐</span>新AI修图
      </button>
    </div>

    <!-- Hero -->
    <section class="se-hero">
      <h1 class="se-hero__title"><span class="se-hero__spark">✨</span>AI一键修图，人人都是设计师<span class="se-hero__spark">✨</span></h1>
      <p class="se-hero__desc">轻量修图 AI 工具，开启创意美好之旅</p>
    </section>

    <!-- 效果展示条 -->
    <section class="showcase">
      <div class="showcase__tabs">
        <button v-for="tab in SHOWCASE_TABS" :key="tab.value" type="button" class="showcase__tab" :class="{ 'is-active': activeShowcase === tab.value }" @click="activeShowcase = tab.value">
          {{ tab.label }}
        </button>
      </div>

      <div class="showcase__panels">
        <!-- 原图 -->
        <figure class="showcase__panel">
          <div class="showcase__img" :style="{ background: activeScene.scene }"><span>{{ activeScene.emoji }}</span></div>
          <figcaption>原图</figcaption>
        </figure>
        <!-- 抠图 -->
        <figure class="showcase__panel">
          <div class="showcase__img showcase__img--checker"><span class="showcase__subject">{{ activeScene.emoji }}</span></div>
          <figcaption>抠图</figcaption>
        </figure>
        <!-- 换背景 -->
        <figure class="showcase__panel">
          <div class="showcase__img" :style="{ background: activeScene.replace }"><span class="showcase__subject">{{ activeScene.emoji }}</span></div>
          <figcaption>换背景</figcaption>
        </figure>
        <!-- 抠图 2.0 -->
        <figure class="showcase__panel">
          <div class="showcase__img showcase__img--grid">
            <div v-for="i in 4" :key="i" class="showcase__cell showcase__img--checker"><span>{{ activeScene.emoji }}</span></div>
          </div>
          <figcaption>抠图2.0</figcaption>
        </figure>
      </div>
    </section>

    <!-- AI 图片工具 -->
    <section class="tools">
      <header class="tools__head">
        <h2 class="tools__title">AI图片工具<sup class="tools__new">✦</sup></h2>
        <div class="tools__search">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input v-model="keyword" placeholder="搜索修图工具" />
        </div>
      </header>

      <div class="tools__chips">
        <button v-for="cat in TOOL_CATEGORIES" :key="cat.value" type="button" class="tools__chip" :class="{ 'is-active': activeCategory === cat.value }" @click="activeCategory = cat.value">
          {{ cat.label }}
        </button>
      </div>

      <div v-if="filteredTools.length" class="tools__grid">
        <article v-for="tool in filteredTools" :key="tool.value" class="tool-card" @click="handleToolClick(tool)">
          <header class="tool-card__head">
            <span class="tool-card__emoji">{{ tool.emoji }}</span>
            <h3>{{ tool.title }}</h3>
          </header>
          <div class="tool-card__preview" :style="{ background: tool.tint }"><span>{{ tool.emoji }}</span></div>
        </article>
      </div>
      <div v-else class="tools__empty">没有匹配的工具，换个关键词试试</div>
    </section>
  </div>
</template>

<style scoped>
.smart-editing-page { max-width: 1280px; margin: 0 auto; }

/* 顶部右上角：新AI修图入口 */
.se-topbar { display: flex; justify-content: flex-end; margin-bottom: 4px; }
.se-new-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border: 1px solid var(--c-border); border-radius: 999px; background: #fff; color: var(--c-text); font-size: 12.5px; font-weight: 600; cursor: pointer; transition: var(--transition); box-shadow: var(--shadow-sm); }
.se-new-btn:hover { border-color: #f5c836; background: #fffbeb; box-shadow: 0 4px 12px rgba(245, 200, 54, .3); }
.se-new-btn__star { font-size: 13px; }

/* Hero */
.se-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 14px 0 6px; }
.se-hero__title { display: flex; align-items: center; gap: 10px; font-size: 26px; font-weight: 750; letter-spacing: -.3px; }
.se-hero__spark { font-size: 20px; }
.se-hero__desc { margin-top: 8px; color: var(--c-text-secondary); font-size: 13px; }

/* 效果展示条 */
.showcase { margin-top: 18px; }
.showcase__tabs { display: flex; justify-content: center; gap: 8px; margin-bottom: 14px; }
.showcase__tab { padding: 6px 18px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: var(--c-text-regular); font-size: 13px; cursor: pointer; transition: var(--transition); }
.showcase__tab:hover { color: var(--c-primary); }
.showcase__tab.is-active { background: var(--c-primary-light); border-color: var(--c-primary-border); color: var(--c-primary); font-weight: 600; }
.showcase__panels { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.showcase__panel { margin: 0; text-align: center; }
.showcase__img { position: relative; display: flex; align-items: center; justify-content: center; height: 168px; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); }
.showcase__img > span { font-size: 58px; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .18)); }
.showcase__subject { filter: drop-shadow(0 0 6px rgba(80, 150, 255, .9)) drop-shadow(0 6px 10px rgba(0, 0, 0, .15)) !important; }
.showcase__panel figcaption { margin-top: 8px; color: var(--c-primary); font-size: 13px; font-weight: 600; }

/* 透明棋盘格背景 */
.showcase__img--checker { background-color: #fff; background-image: linear-gradient(45deg, #eef1f6 25%, transparent 25%), linear-gradient(-45deg, #eef1f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eef1f6 75%), linear-gradient(-45deg, transparent 75%, #eef1f6 75%); background-size: 18px 18px; background-position: 0 0, 0 9px, 9px -9px, -9px 0; }
.showcase__img--grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; padding: 4px; background: #fff; }
.showcase__cell { display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); overflow: hidden; }
.showcase__cell span { font-size: 24px; }

/* AI 图片工具 */
.tools { margin-top: 30px; }
.tools__head { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.tools__title { position: relative; font-size: 18px; font-weight: 700; }
.tools__new { color: var(--c-danger); font-size: 11px; }
.tools__search { display: flex; align-items: center; gap: 6px; width: 220px; padding: 7px 10px; border: 1px solid var(--c-border); border-radius: 999px; background: #fff; color: var(--c-text-placeholder); }
.tools__search:focus-within { border-color: var(--c-primary); box-shadow: 0 0 0 3px rgba(22, 119, 255, .1); }
.tools__search input { width: 100%; border: 0; background: transparent; font-size: 12px; color: var(--c-text); }
.tools__chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.tools__chip { padding: 6px 14px; border: 1px solid var(--c-border); border-radius: 999px; background: #fff; color: var(--c-text-regular); font-size: 12px; cursor: pointer; transition: var(--transition); }
.tools__chip:hover { border-color: var(--c-primary-border); color: var(--c-primary); }
.tools__chip.is-active { border-color: var(--c-primary); background: var(--c-primary); color: #fff; font-weight: 600; }
.tools__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
.tools__empty { padding: 48px 0; text-align: center; color: var(--c-text-placeholder); font-size: 13px; }

.tool-card { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--c-border); border-radius: var(--radius-lg); background: #fff; cursor: pointer; transition: var(--transition); }
.tool-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); border-color: var(--c-primary-border); }
.tool-card__head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.tool-card__emoji { font-size: 15px; flex-shrink: 0; }
.tool-card__head h3 { font-size: 12px; font-weight: 600; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tool-card__preview { display: flex; align-items: center; justify-content: center; height: 86px; border-radius: var(--radius); overflow: hidden; }
.tool-card__preview span { font-size: 30px; opacity: .9; filter: drop-shadow(0 3px 6px rgba(0, 0, 0, .12)); transition: var(--transition); }
.tool-card:hover .tool-card__preview span { transform: scale(1.12); }

@media (max-width: 1280px) { .tools__grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
@media (max-width: 1180px) { .showcase__panels { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tools__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 900px) { .tools__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px) { .tools__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .tools__head { flex-direction: column; align-items: flex-start; } .tools__search { width: 100%; } .se-hero__title { font-size: 21px; } }
@media (max-width: 480px) { .tools__grid { grid-template-columns: 1fr; } .showcase__panels { grid-template-columns: 1fr; } }
</style>
