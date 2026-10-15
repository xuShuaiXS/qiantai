<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from '@/composables/useMessage'
import '@/assets/css/ai-draw.css'
import { createImageTask, fetchImageModels } from '@/api/imageGeneration'
import type { ImageModelOption, ImageTask } from '@/api/imageGeneration'
import { IMAGE_SIZES } from '@/stores/imageGeneration'
import BaseSelect from '@/components/BaseSelect.vue'

const router = useRouter()
const message = useMessage()

/* ------------------------------ 模型与选项 ------------------------------ */

const models = ref<ImageModelOption[]>([])
const modelsLoading = ref(false)
const modelsError = ref('')
const modelValue = ref('')
const sizeValue = ref('1024x1024')
const countValue = ref(1)
const prompt = ref('')

const sizeOptions = IMAGE_SIZES.map((s) => ({
  value: s.value,
  label: `${s.label}（${s.value}）`,
  desc: `${s.width}×${s.height}`,
}))
const countOptions = [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} 张` }))

const currentModelLabel = computed(
  () => models.value.find((m) => m.value === modelValue.value)?.label || '',
)

onMounted(loadModels)

async function loadModels() {
  if (modelsLoading.value) return
  modelsLoading.value = true
  modelsError.value = ''
  try {
    const options = await fetchImageModels()
    models.value = options
    if (!options.length) {
      modelsError.value = '后端未配置图片能力模型，请先在控制台配置厂商与模型'
      return
    }
    if (!options.some((m) => m.value === modelValue.value)) {
      const first = options[0]
      if (first) modelValue.value = first.value
    }
  } catch (err) {
    modelsError.value = err instanceof Error ? err.message : '模型列表加载失败'
  } finally {
    modelsLoading.value = false
  }
}

/* ------------------------------ 生成 ------------------------------ */

interface DrawTask {
  id: number
  status: 'generating' | 'done' | 'failed'
  prompt: string
  model: string
  size: string
  images: { index: number; url: string }[]
  errorMessage?: string
  createdAt: string
}

const results = ref<DrawTask[]>([])
const submitting = ref(false)
let seq = 1

const canGenerate = computed(() => prompt.value.trim().length >= 4 && !submitting.value)

async function generate() {
  const text = prompt.value.trim()
  if (text.length < 4) {
    message.warning('请先描述画面（至少 4 个字）')
    return
  }
  if (!modelValue.value) {
    message.warning(modelsError.value || '暂无可用图片模型，请先重新加载模型列表')
    return
  }
  submitting.value = true
  const task: DrawTask = {
    id: seq++,
    status: 'generating',
    prompt: text,
    model: modelValue.value,
    size: sizeValue.value,
    images: [],
    createdAt: new Date().toLocaleString(),
  }
  results.value.unshift(task)
  try {
    const res: ImageTask = await createImageTask({
      prompt: text,
      model: modelValue.value,
      size: sizeValue.value,
      count: countValue.value,
    })
    if (res.status === 'failed' || !res.images.length) {
      task.status = 'failed'
      task.errorMessage = res.errorMessage || '生成失败，请换一种描述后重试'
    } else {
      task.status = 'done'
      task.images = res.images
      task.createdAt = res.createdAt || task.createdAt
      prompt.value = ''
    }
  } catch (err) {
    task.status = 'failed'
    task.errorMessage = err instanceof Error ? err.message : '生成失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}

/* ------------------------------ 未开发/占位能力提示 ------------------------------ */

function tipVideo() {
  message.info('视频创作正在开发中，敬请期待')
}

function tipComingSoon(what: string) {
  message.info(`${what}即将上线，敬请期待`)
}

function goRemoveBg() {
  router.push('/smart-editing/remove-bg')
}

function goEditing() {
  router.push('/smart-editing')
}
</script>

<template>
  <div class="draw-page">
    <!-- Hero -->
    <header class="draw-hero">
      <h1 class="draw-hero__title">描述想法，AI 帮你生成</h1>
      <p class="draw-hero__sub">选择模型和比例，快速进入图片创作</p>
    </header>

    <!-- 创作输入卡 -->
    <section class="draw-composer">
      <div class="draw-composer__main">
        <button
          class="draw-upload"
          type="button"
          title="参考图能力即将上线"
          @click="tipComingSoon('参考图能力')"
        >
          <span class="draw-upload__icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>
          </span>
          <span class="draw-upload__label">上传</span>
        </button>
        <textarea
          v-model="prompt"
          class="draw-composer__input"
          rows="3"
          maxlength="500"
          placeholder="描述画面，将按文字生成图片…"
          @keydown.enter.exact.prevent="generate"
        />
      </div>

      <div class="draw-composer__bar">
        <div class="draw-composer__opts">
          <div class="draw-media-tabs">
            <button class="draw-media-tab is-active" type="button">照片</button>
            <button class="draw-media-tab" type="button" @click="tipVideo">视频</button>
          </div>
          <BaseSelect v-model="modelValue" :options="models" label="模型" icon="🎨" />
          <BaseSelect v-model="sizeValue" :options="sizeOptions" label="比例" icon="▢" />
          <BaseSelect v-model="countValue" :options="countOptions" label="数量" icon="🖼" />
        </div>
        <button class="draw-composer__go" type="button" :disabled="!canGenerate" @click="generate">
          {{ submitting ? '生成中…' : '立即生成' }}
        </button>
      </div>
    </section>

    <!-- 模型说明 + 模式胶囊 -->
    <div class="draw-note">
      <p class="draw-note__model">
        <template v-if="modelsLoading">模型列表加载中…</template>
        <template v-else-if="modelsError">
          {{ modelsError }}
          <button class="draw-note__retry" type="button" @click="loadModels">重新加载</button>
        </template>
        <template v-else>当前模型：{{ currentModelLabel }} · 纯文字生成图片（参考图能力即将上线）</template>
      </p>
      <div class="draw-modes">
        <button class="draw-mode is-active" type="button">文生图</button>
        <button class="draw-mode" type="button" @click="tipComingSoon('参考图编辑')">参考图编辑</button>
        <button class="draw-mode" type="button" @click="tipComingSoon('局部编辑')">局部编辑</button>
        <button class="draw-mode" type="button" @click="tipComingSoon('商品图替换')">商品图替换</button>
      </div>
    </div>

    <!-- 生成结果 -->
    <section v-if="results.length" class="draw-results">
      <article v-for="task in results" :key="task.id" class="draw-result">
        <div class="draw-result__body" :class="`is-${task.status}`">
          <div v-if="task.status === 'generating'" class="draw-result__state">
            <span class="draw-result__spinner" />正在生成，请稍候…
          </div>
          <div v-else-if="task.status === 'failed'" class="draw-result__state draw-result__state--error">
            <strong>生成失败</strong>
            <span>{{ task.errorMessage }}</span>
          </div>
          <div v-else class="draw-result__imgs">
            <a
              v-for="img in task.images"
              :key="img.index"
              class="draw-result__img"
              :href="img.url"
              target="_blank"
              rel="noopener"
            >
              <img :src="img.url" :alt="task.prompt" loading="lazy" />
            </a>
          </div>
        </div>
        <footer class="draw-result__meta">
          <span class="draw-result__prompt">{{ task.prompt }}</span>
          <small>{{ task.model }} · {{ task.size }} · {{ task.createdAt }}</small>
        </footer>
      </article>
    </section>

    <!-- 选择创作类型 -->
    <section class="draw-section">
      <h2 class="draw-section__title">选择创作类型</h2>
      <div class="draw-types">
        <article class="draw-type-card">
          <span class="draw-type-card__icon draw-type-card__icon--blue">🖌</span>
          <h3>AI绘图</h3>
          <p>从文字、参考图与商品插画快速生成</p>
          <div class="draw-type-card__tags">
            <span>文生图</span><span>图片绘制</span><span>参考图</span><span>批量探索</span>
          </div>
        </article>
        <article class="draw-type-card" @click="tipVideo">
          <span class="draw-type-card__icon draw-type-card__icon--green">🎬</span>
          <h3>AI视频 <em class="draw-type-card__soon">未开发</em></h3>
          <p>让图片动起来，生成产品视频和创意镜头</p>
          <div class="draw-type-card__tags">
            <span>图生视频</span><span>文生视频</span>
          </div>
        </article>
        <article class="draw-type-card" @click="goEditing">
          <span class="draw-type-card__icon draw-type-card__icon--orange">✂</span>
          <h3>图片编辑</h3>
          <p>抠图、扩图、增修、修复等常用处理</p>
          <div class="draw-type-card__tags">
            <span>图片放大</span><span>AI扩图</span><span>万物抠图</span><span>一键抠图</span>
          </div>
        </article>
      </div>
    </section>

    <!-- 电商与宣传 -->
    <section class="draw-section">
      <h2 class="draw-section__title">电商与宣传</h2>
      <p class="draw-section__sub">商品和商宣创作单独放在这里，适合商品素材快速进入商业生产流程。</p>
      <div class="draw-ecom">
        <article class="draw-ecom-card">
          <div class="draw-ecom-card__body">
            <span class="draw-ecom-card__icon">👗</span>
            <h3>AI商品套图</h3>
            <p>上传商品图，一键生成多张专业主图、详情页和使用素材</p>
            <button class="draw-ecom-card__btn" type="button" disabled>即将上线</button>
          </div>
          <div class="draw-ecom-card__thumb" aria-hidden="true">
            <span>🛍️</span>
          </div>
        </article>
        <article class="draw-ecom-card" @click="tipVideo">
          <div class="draw-ecom-card__body">
            <span class="draw-ecom-card__icon">📷</span>
            <h3>产品宣传视频</h3>
            <p>从商品图片生成动效视频，适合电商详情页、社媒投放场景</p>
            <button class="draw-ecom-card__btn draw-ecom-card__btn--primary" type="button">立即创建</button>
          </div>
          <div class="draw-ecom-card__thumb draw-ecom-card__thumb--video" aria-hidden="true">
            <span>▶</span>
          </div>
        </article>
      </div>
    </section>

    <!-- 图片创作 -->
    <section class="draw-section">
      <div class="draw-section__head">
        <h2 class="draw-section__title">图片创作</h2>
        <button class="draw-section__link" type="button" @click="goEditing">查看全部工具</button>
      </div>
      <p class="draw-section__sub">全部图片创作工具，按分类快速进入对应功能。</p>
      <span class="draw-core-tag">核心功能</span>
      <div class="draw-tools">
        <button class="draw-tool" type="button" @click="tipComingSoon('图片处理')">
          <span class="draw-tool__icon">🖼</span>
          <strong>图片处理</strong>
          <small>裁剪 · 压缩 · 调色</small>
        </button>
        <button class="draw-tool" type="button" @click="tipComingSoon('图片修复')">
          <span class="draw-tool__icon">🩹</span>
          <strong>图片修复</strong>
          <small>去噪 · 修复画质</small>
        </button>
        <button class="draw-tool" type="button" @click="goRemoveBg">
          <span class="draw-tool__icon">🚀</span>
          <strong>智能抠图</strong>
          <small>一键抠图</small>
        </button>
        <button class="draw-tool" type="button" @click="tipComingSoon('人像处理')">
          <span class="draw-tool__icon">🧑</span>
          <strong>人像处理</strong>
          <small>美颜 · 证件照</small>
        </button>
        <button class="draw-tool" type="button" @click="tipComingSoon('画质优化')">
          <span class="draw-tool__icon">🌄</span>
          <strong>画质优化</strong>
          <small>清晰 · 增强细节</small>
        </button>
      </div>
    </section>
  </div>
</template>
