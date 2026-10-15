<script setup>
/**
 * 智能生图页
 *
 * 布局：Hero 区 → 效果分类筛选 → 效果卡片网格 → 底部固定输入栏（ImagePromptDock，Teleport 到 body）。
 * 说明：页面底部预留 padding-bottom，避免内容被固定输入栏遮挡。
 */
import { computed, onMounted, ref } from 'vue'
import { useImageGenerationStore, IMAGE_EFFECTS, IMAGE_EFFECT_CATEGORIES } from '@/stores/imageGeneration'
import { useMessage } from '@/composables/useMessage'
import SvgIcon from '@/components/SvgIcon.vue'
import ImagePromptDock from './ImagePromptDock.vue'

const store = useImageGenerationStore()
const message = useMessage()
const activeCategory = ref('all')
const filteredEffects = computed(() => (activeCategory.value === 'all' ? IMAGE_EFFECTS : IMAGE_EFFECTS.filter((item) => item.category === activeCategory.value)))
const selectedEffect = computed(() => IMAGE_EFFECTS.find((item) => item.value === store.form.effect) || null)
const featurePills = [
  { icon: '✓', label: '支持多种艺术风格' },
  { icon: '▣', label: '高清画质输出' },
  { icon: '⚡', label: '快速生成' },
]

// 模型列表来自后端配置（/chat/model-families 中 capability=image 的型号）
onMounted(() => store.fetchModels())

/** 效果单选：再次点击取消，选中其它效果时自动替换，并在输入栏同步提示 */
function toggleEffect(effect) {
  const next = store.form.effect === effect.value ? '' : effect.value
  store.form.effect = next
  if (next) message.success(`已选择「${effect.title}」效果，可在底部输入栏查看使用提示`)
  else message.info('已取消使用该效果')
}
function clearEffect() {
  store.form.effect = ''
}

/** 提交生成：真实调用后端生图接口，失败时展示后端返回的原因 */
async function generate() {
  if (!store.form.model) {
    message.warning('暂无可用图片模型，请先在控制台配置厂商与模型')
    return
  }
  const task = await store.createTask()
  if (!task) return
  if (task.status === 'failed') message.error(task.errorMessage || '生成失败，请稍后重试')
  else message.success(`已生成 ${task.images.length} 张图片`)
}
</script>

<template>
  <div class="page image-page">
    <!-- Hero 区 -->
    <section class="ig-hero">
      <div class="ig-hero__badge"><SvgIcon name="image-generation" :size="22" /></div>
      <h1 class="ig-hero__title">开始生成你的第一张图片吧</h1>
      <p class="ig-hero__desc">输入你的创意灵感，开始你的 AI 艺术作品之旅</p>
      <div class="ig-hero__pills">
        <span v-for="pill in featurePills" :key="pill.label" class="ig-hero__pill"><i>{{ pill.icon }}</i>{{ pill.label }}</span>
      </div>
    </section>

    <!-- 效果分类筛选（单选） -->
    <div class="effect-chips">
      <button v-for="cat in IMAGE_EFFECT_CATEGORIES" :key="cat.value" type="button" class="effect-chip" :class="{ 'is-active': activeCategory === cat.value }" @click="activeCategory = cat.value">
        <span v-if="cat.value !== 'all'" class="effect-chip__dot" />{{ cat.label }}
      </button>
    </div>

    <!-- 效果卡片 -->
    <section class="effect-grid">
      <article v-for="effect in filteredEffects" :key="effect.value" class="effect-card" :class="{ 'is-selected': store.form.effect === effect.value }">
        <div class="effect-card__preview" :style="{ background: `linear-gradient(115deg, ${effect.before} 0 50%, ${effect.after} 50% 100%)` }">
          <span class="effect-card__flag effect-card__flag--before">原图</span>
          <span class="effect-card__flag effect-card__flag--after">效果图</span>
          <span class="effect-card__emoji"><i>{{ effect.emoji }}</i></span>
          <span v-if="store.form.effect === effect.value" class="effect-card__chosen"><SvgIcon name="check" :size="12" />已选用</span>
        </div>
        <div class="effect-card__body">
          <header class="effect-card__head">
            <h3>{{ effect.title }}</h3>
            <div class="effect-card__tags"><span v-for="tag in effect.tags" :key="tag">{{ tag }}</span></div>
          </header>
          <p class="effect-card__desc">{{ effect.desc }}</p>
          <div class="effect-card__steps">
            <span class="effect-card__steps-label">操作步骤：</span>
            <p v-for="(step, index) in effect.steps" :key="step"><i>{{ index + 1 }}</i>{{ step }}</p>
          </div>
          <button class="effect-card__btn" type="button" :class="{ 'is-active': store.form.effect === effect.value }" @click="toggleEffect(effect)">
            {{ store.form.effect === effect.value ? '已选用该效果' : '使用该效果' }}
          </button>
        </div>
      </article>
    </section>

    <!-- 模型加载失败提示条：后端未启动/宕机时给出明确原因和重试入口 -->
    <div v-if="store.modelsError && !store.models.length" class="ig-model-alert">
      <span class="ig-model-alert__text">⚠️ {{ store.modelsError }}</span>
      <button
        class="ig-model-alert__retry"
        type="button"
        :disabled="store.modelsLoading"
        @click="store.fetchModels()"
      >
        {{ store.modelsLoading ? '加载中…' : '重新加载' }}
      </button>
    </div>

    <!-- 生成结果：真实接口返回的图片 / 生成状态 -->
    <section v-if="store.hasResults" class="ig-results">
      <header class="ig-results__head">
        <h2 class="ig-results__title"><SvgIcon name="image-generation" :size="16" />生成结果</h2>
        <button class="ig-results__clear" type="button" @click="store.clearResults()">清空记录</button>
      </header>

      <div class="ig-results__grid">
        <article v-for="task in store.results" :key="task.id" class="ig-result">
          <div class="ig-result__body" :class="`is-${task.status}`">
            <div v-if="task.status === 'generating'" class="ig-result__state">
              <span class="ig-result__spinner" />正在生成，请稍候…
            </div>
            <div v-else-if="task.status === 'failed'" class="ig-result__state ig-result__state--error">
              <strong>生成失败</strong>
              <p>{{ task.errorMessage }}</p>
            </div>
            <template v-else>
              <a
                v-for="img in task.images"
                :key="img.index"
                class="ig-result__img"
                :href="img.url"
                target="_blank"
                rel="noopener"
                :title="'点击查看原图'"
              >
                <img :src="img.url" :alt="task.prompt" loading="lazy" />
              </a>
            </template>
          </div>
          <footer class="ig-result__meta">
            <span class="ig-result__prompt" :title="task.prompt">{{ task.prompt }}</span>
            <small>{{ task.model }} · {{ task.size }}<template v-if="task.createdAt"> · {{ task.createdAt }}</template></small>
          </footer>
        </article>
      </div>
    </section>

    <!-- 底部固定输入栏（默认 teleport 到 body） -->
    <ImagePromptDock :form="store.form" :submitting="store.submitting" :selected-effect="selectedEffect" @generate="generate" @clear-effect="clearEffect" />
  </div>
</template>

<style scoped>
/* 底部预留：固定输入栏高度 + 间距，避免最后一行卡片被遮挡 */
.image-page { max-width: 1160px; margin: 0 auto; padding-bottom: 210px; }

/* ---------------- 模型加载失败提示条 ---------------- */
.ig-model-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding: 12px 16px;
  border: 1px solid #ffd8a8;
  border-radius: var(--radius-lg, 12px);
  background: #fff7ec;
  color: #8a5a00;
  font-size: 13px;
}
.ig-model-alert__retry {
  flex: 0 0 auto;
  padding: 6px 16px;
  border: none;
  border-radius: 999px;
  background: #ff9800;
  color: #fff;
  font-size: 12.5px;
  cursor: pointer;
  transition: filter .2s ease;
}
.ig-model-alert__retry:hover:not(:disabled) { filter: brightness(1.08); }
.ig-model-alert__retry:disabled { opacity: .6; cursor: not-allowed; }

/* ---------------- 生成结果区 ---------------- */
.ig-results { margin-top: 26px; }
.ig-results__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.ig-results__title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: var(--c-text); }
.ig-results__clear { padding: 5px 12px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; color: var(--c-text-secondary); font-size: 12px; cursor: pointer; transition: var(--transition); }
.ig-results__clear:hover { border-color: var(--c-primary-border); color: var(--c-primary); background: var(--c-primary-light); }
.ig-results__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

.ig-result { display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--c-border); border-radius: var(--radius-lg); background: var(--c-bg-card); box-shadow: var(--shadow-sm); }
.ig-result__body { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; padding: 6px; min-height: 180px; }
.ig-result__img { display: block; overflow: hidden; border-radius: var(--radius); background: var(--c-bg-hover); }
.ig-result__img img { width: 100%; height: 100%; max-height: 360px; object-fit: cover; display: block; transition: transform .25s ease; }
.ig-result__img:hover img { transform: scale(1.03); }

.ig-result__state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 180px; padding: 20px; color: var(--c-text-secondary); font-size: 13px; text-align: center; }
.ig-result__state--error { color: var(--c-danger); background: var(--c-danger-light); border-radius: var(--radius); }
.ig-result__state--error p { margin-top: 4px; font-size: 12px; line-height: 1.6; word-break: break-all; }
.ig-result__spinner { width: 18px; height: 18px; border: 2px solid var(--c-primary-border); border-top-color: var(--c-primary); border-radius: 50%; animation: ig-spin .8s linear infinite; }
@keyframes ig-spin { to { transform: rotate(360deg); } }

.ig-result__meta { display: flex; flex-direction: column; gap: 3px; padding: 9px 12px; border-top: 1px solid var(--c-border-light); }
.ig-result__prompt { color: var(--c-text); font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ig-result__meta small { color: var(--c-text-placeholder); font-size: 11px; }

@media (max-width: 560px) {
  .ig-results__grid { grid-template-columns: 1fr; }
}

/* Hero */
.ig-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 18px 0 4px; }
.ig-hero__badge { display: flex; align-items: center; justify-content: center; width: 62px; height: 62px; margin-bottom: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--c-primary), #6ea8ff); color: #fff; box-shadow: 0 10px 24px rgba(22, 119, 255, .28); }
.ig-hero__title { font-size: 24px; font-weight: 700; letter-spacing: -.3px; }
.ig-hero__desc { margin-top: 6px; color: var(--c-text-secondary); font-size: 13px; }
.ig-hero__pills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 14px; }
.ig-hero__pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border: 1px solid var(--c-border); border-radius: 999px; background: #fff; color: var(--c-text-regular); font-size: 12px; }
.ig-hero__pill i { font-style: normal; color: var(--c-success); font-size: 12px; }

/* 效果分类 chips */
.effect-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 22px 0 18px; }
.effect-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; color: var(--c-text-regular); font-size: 13px; cursor: pointer; transition: var(--transition); }
.effect-chip:hover { border-color: var(--c-primary-border); color: var(--c-primary); }
.effect-chip.is-active { border-color: var(--c-primary); background: var(--c-primary); color: #fff; font-weight: 600; box-shadow: 0 4px 12px rgba(22, 119, 255, .25); }
.effect-chip__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .7; }

/* 效果卡片 */
.effect-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.effect-card { display: flex; flex-direction: column; border: 1px solid var(--c-border); border-radius: var(--radius-lg); background: #fff; overflow: hidden; box-shadow: var(--shadow-sm); transition: var(--transition); }
.effect-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.effect-card.is-selected { border-color: var(--c-primary); box-shadow: 0 0 0 2px rgba(22, 119, 255, .18), var(--shadow); }
.effect-card__preview { position: relative; height: 150px; }
.effect-card__flag { position: absolute; top: 8px; padding: 2px 8px; border-radius: 999px; font-size: 10px; color: #fff; background: rgba(31, 41, 55, .55); backdrop-filter: blur(2px); }
.effect-card__flag--before { left: 8px; }
.effect-card__flag--after { right: 8px; background: rgba(22, 119, 255, .8); }
.effect-card__emoji { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 34px; text-shadow: 0 2px 8px rgba(0, 0, 0, .12); }
.effect-card__emoji i { font-style: normal; }
.effect-card__chosen { position: absolute; bottom: 8px; right: 8px; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; background: var(--c-primary); color: #fff; font-size: 10px; font-weight: 600; }
.effect-card__body { display: flex; flex-direction: column; flex: 1; gap: 8px; padding: 12px 14px 14px; }
.effect-card__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.effect-card__head h3 { font-size: 15px; font-weight: 650; }
.effect-card__tags { display: flex; gap: 5px; }
.effect-card__tags span { padding: 2px 7px; border-radius: 999px; background: var(--c-primary-light); color: var(--c-primary); font-size: 10px; }
.effect-card__desc { color: var(--c-text-secondary); font-size: 12px; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.effect-card__steps { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--c-text-secondary); }
.effect-card__steps-label { font-weight: 600; color: var(--c-text-regular); }
.effect-card__steps p { display: flex; align-items: baseline; gap: 5px; line-height: 1.5; }
.effect-card__steps i { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%; background: var(--c-primary-light); color: var(--c-primary); font-style: normal; font-size: 10px; font-weight: 600; transform: translateY(2px); }
.effect-card__btn { margin-top: auto; height: 36px; border: 0; border-radius: var(--radius); background: linear-gradient(90deg, var(--c-primary), #6ea8ff); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: var(--transition); box-shadow: 0 4px 12px rgba(22, 119, 255, .22); }
.effect-card__btn:hover { filter: brightness(1.06); }
.effect-card__btn.is-active { background: var(--c-primary-active); box-shadow: none; }

@media (max-width: 1180px) { .effect-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 900px) { .image-page { padding-bottom: 230px; } }
@media (max-width: 860px) { .effect-grid { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .image-page { padding-bottom: 280px; } }
@media (max-width: 560px) { .page { padding: 14px 12px 24px; } .ig-hero__title { font-size: 20px; } }
</style>
