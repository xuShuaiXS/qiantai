<script setup>
/**
 * 智能生图 · 底部悬浮输入栏
 *
 * 定位方案：Teleport 到 body + position: fixed。
 * 原因：本页外层存在路由过渡（.route-fade-enter-from 带 transform），
 *   若直接留在页面内，fixed 的参照物会变成被 transform 的祖先节点，过渡期间会跳位；
 *   Teleport 到 body 后始终以视口为参照，滚动时位置稳定。
 */
import { computed, ref } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { IMAGE_MODELS, IMAGE_SIZES } from '@/stores/imageGeneration'
import { useMessage } from '@/composables/useMessage'

const props = defineProps({
  form: { type: Object, required: true },
  submitting: { type: Boolean, default: false },
  selectedEffect: { type: Object, default: null },
})
const emit = defineEmits(['generate', 'clear-effect'])
const message = useMessage()
const advancedVisible = ref(false)
const placeholder = computed(() => props.selectedEffect?.hint || '描述你的创意灵感，极光AI 会将文字变成画面…')
const canGenerate = computed(() => props.form.prompt.trim().length >= 4 && !props.submitting)
/**
 * 独立页面无侧边栏，不需要左侧宽度补偿。
 * 原实现位于带侧栏的 OA 布局中，这里改为常量以保持模板结构不变。
 */
const layerPadding = '0px'
const countOptions = [1, 2, 3, 4].map((value) => ({ value, label: `${value} 张` }))
const sizeOptions = computed(() => IMAGE_SIZES.map((item) => ({ value: item.value, label: item.label, desc: `${item.width}×${item.height}` })))

function showExample() {
  props.form.prompt = props.selectedEffect?.example || '一座漂浮在云海上的未来城市，清晨金色阳光，电影级构图'
  message.info('已填入示例提示词，可直接生成或继续编辑')
}
function uploadImage() {
  message.info('演示环境暂不支持上传图片，可直接输入提示词创作')
}
</script>

<template>
  <Teleport to="body">
    <div class="dock-layer" :style="{ paddingLeft: layerPadding }">
      <section class="prompt-dock" :class="{ 'has-effect': selectedEffect }">
        <!-- 选中效果后的提示信息条 -->
        <div v-if="selectedEffect" class="prompt-dock__effect-tip">
          <span class="prompt-dock__effect-thumb" :style="{ background: `linear-gradient(120deg, ${selectedEffect.before}, ${selectedEffect.after})` }"><i>{{ selectedEffect.emoji }}</i></span>
          <div class="prompt-dock__effect-info">
            <strong>已选效果：{{ selectedEffect.title }}</strong>
            <small>{{ selectedEffect.hint }}</small>
          </div>
          <button class="prompt-dock__effect-close" type="button" title="取消使用该效果" @click="emit('clear-effect')">×</button>
        </div>

        <textarea v-model="form.prompt" class="prompt-dock__input" maxlength="500" rows="2" :placeholder="placeholder" />
        <div class="prompt-dock__counter">{{ form.prompt.length }}/500</div>

        <div class="prompt-dock__toolbar">
          <div class="prompt-dock__options">
            <BaseSelect v-model="form.model" :options="IMAGE_MODELS" label="模型" icon="🏆" drop="up" />
            <BaseSelect v-model="form.count" :options="countOptions" label="数量" icon="🖼" drop="up" />
            <BaseSelect v-model="form.size" :options="sizeOptions" label="比例" icon="▢" drop="up" />
            <button class="dock-btn" :class="{ 'is-open': advancedVisible }" type="button" @click="advancedVisible = !advancedVisible">
              <SvgIcon name="settings" :size="14" />高级设置
            </button>
            <button class="dock-btn" type="button" @click="uploadImage"><SvgIcon name="upload" :size="14" />上传图片</button>
            <button class="dock-btn dock-btn--example" type="button" @click="showExample"><i>💡</i>查看示例</button>
          </div>
          <button class="btn btn--primary prompt-dock__submit" type="button" :disabled="!canGenerate" @click="emit('generate')">
            <SvgIcon name="sparkles" :size="15" />{{ submitting ? '正在创建…' : '立即生成' }}
          </button>
        </div>

        <div v-if="advancedVisible" class="prompt-dock__advanced">
          <label class="field__label" for="dock-negative">反向提示词（不希望出现的内容）</label>
          <input id="dock-negative" v-model="form.negativePrompt" class="input" maxlength="200" placeholder="如：低清晰度、文字、水印" />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
/* 固定悬浮层：始终贴合视口底部，内容区居中 */
.dock-layer { position: fixed; left: 0; right: 0; bottom: 16px; z-index: 900; display: flex; justify-content: center; padding: 0 20px; pointer-events: none; }
.prompt-dock { position: relative; width: 100%; max-width: 900px; padding: 12px 16px 12px; border: 1px solid var(--c-primary-border); border-radius: var(--radius-lg); background: #fff; box-shadow: 0 -2px 10px rgba(38, 64, 105, .05), var(--shadow-lg); pointer-events: auto; transition: border-color .2s ease, box-shadow .2s ease; }
.prompt-dock.has-effect { border-color: var(--c-primary); box-shadow: 0 -2px 10px rgba(38, 64, 105, .05), 0 0 0 3px rgba(22, 119, 255, .1), var(--shadow-lg); }
.prompt-dock__input { display: block; width: 100%; min-height: 52px; max-height: 132px; border: 0; background: transparent; resize: none; font-size: 14px; line-height: 1.6; color: var(--c-text); }
.prompt-dock__input:focus { outline: none; }
.prompt-dock__input::placeholder { color: var(--c-text-placeholder); }
.prompt-dock__counter { margin-top: -4px; text-align: right; color: var(--c-text-placeholder); font-size: 11px; pointer-events: none; }
.prompt-dock__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; }
.prompt-dock__options { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; }
.dock-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; border: 1px solid var(--c-border); border-radius: var(--radius); background: #fff; color: var(--c-text-regular); font-size: 12px; cursor: pointer; transition: var(--transition); }
.dock-btn:hover { border-color: var(--c-primary-border); background: var(--c-primary-light); }
.dock-btn.is-open, .dock-btn.is-open:hover { border-color: var(--c-primary); background: var(--c-primary-light); color: var(--c-primary); }
.dock-btn--example { border-color: var(--c-warning-light); background: var(--c-warning-light); color: var(--c-warning); }
.dock-btn--example:hover { border-color: var(--c-warning); background: var(--c-warning-light); }
.dock-btn--example i { font-style: normal; font-size: 12px; }
.prompt-dock__submit { flex: 0 0 auto; height: 34px; padding: 0 20px; font-size: 13px; font-weight: 600; }
.prompt-dock__advanced { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--c-border); }
.prompt-dock__advanced .field__label { font-size: 11px; }
.prompt-dock__advanced .input { height: 32px; font-size: 12px; }

/* 选中效果提示条（浮在输入栏上方，不占布局高度；除关闭按钮外不阻挡下方卡片点击） */
.prompt-dock__effect-tip { position: absolute; bottom: calc(100% + 10px); left: 0; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--c-primary-border); border-radius: var(--radius); background: #fff; box-shadow: var(--shadow); animation: tip-in .22s ease-out; pointer-events: none; }
@keyframes tip-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.prompt-dock__effect-thumb { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; overflow: hidden; }
.prompt-dock__effect-thumb i { font-style: normal; font-size: 18px; }
.prompt-dock__effect-info { display: flex; flex-direction: column; gap: 1px; }
.prompt-dock__effect-info strong { color: var(--c-primary); font-size: 12px; }
.prompt-dock__effect-info small { color: var(--c-text-secondary); font-size: 11px; max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prompt-dock__effect-close { border: 0; background: transparent; color: var(--c-text-placeholder); font-size: 16px; cursor: pointer; line-height: 1; pointer-events: auto; }
.prompt-dock__effect-close:hover { color: var(--c-danger); }

/* 响应式：窄屏缩短两侧留白、工具栏允许换行，保证固定栏始终完整可见 */
@media (max-width: 900px) { .dock-layer { padding-right: 14px; } .prompt-dock__options { gap: 6px; } .dock-btn { padding: 0 8px; } }
@media (max-width: 720px) {
  .dock-layer { bottom: 10px; padding-right: 10px; }
  .prompt-dock { padding: 10px 12px; }
  .prompt-dock__toolbar { flex-direction: column; align-items: stretch; }
  .prompt-dock__submit { width: 100%; height: 38px; }
  .prompt-dock__effect-tip { position: static; margin-bottom: 8px; }
  .prompt-dock__effect-info small { max-width: 100%; }
}
</style>
