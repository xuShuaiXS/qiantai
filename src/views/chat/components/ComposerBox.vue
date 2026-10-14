<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { uploadChatImage } from '@/api/chat'
import { DEFAULT_IMAGE_SIZE, type ModelVariantItem } from '../data'
import ImageSizePicker from './ImageSizePicker.vue'
import ModelVariantPicker from './ModelVariantPicker.vue'

export interface PendingImage {
  url: string
  name: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    images?: PendingImage[]
    placeholder?: string
    deepThink?: boolean
    internet?: boolean
    streaming?: boolean
    showAttachLink?: boolean
    compactAttach?: boolean
    uploading?: boolean
    /** 当前系列下的具体型号 */
    variants?: ModelVariantItem[]
    /** 当前选中的 modelId */
    selectedModelId?: string
    /** 是否为生图模型（展示比例选择等） */
    imageMode?: boolean
    /** 生图尺寸，如 1024x1024 */
    imageSize?: string
  }>(),
  {
    images: () => [],
    placeholder: '有问题，尽管问',
    deepThink: true,
    internet: false,
    streaming: false,
    showAttachLink: true,
    compactAttach: false,
    uploading: false,
    variants: () => [],
    selectedModelId: '',
    imageMode: false,
    imageSize: DEFAULT_IMAGE_SIZE,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:images': [value: PendingImage[]]
  'update:deepThink': [value: boolean]
  'update:internet': [value: boolean]
  'update:uploading': [value: boolean]
  'update:imageSize': [value: string]
  'select-variant': [variant: ModelVariantItem]
  send: []
  stop: []
}>()

const variantOpen = ref(false)
const sizeOpen = ref(false)

watch(
  () => props.imageMode,
  (on) => {
    if (!on) sizeOpen.value = false
  },
)

watch(variantOpen, (open) => {
  if (open) sizeOpen.value = false
})
watch(sizeOpen, (open) => {
  if (open) variantOpen.value = false
})

const ta = ref<HTMLTextAreaElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const localUploading = ref(false)

function autoGrow() {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 180)}px`
}

watch(
  () => props.modelValue,
  async () => {
    await nextTick()
    autoGrow()
  },
)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (canSend()) emit('send')
  }
}

function canSend() {
  if (props.streaming) return false
  if (localUploading.value || props.uploading) return false
  return !!props.modelValue.trim() || props.images.length > 0
}

function pickFiles() {
  if (props.streaming || localUploading.value) return
  fileInput.value?.click()
}

async function uploadImages(files: File[]) {
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (!images.length) return

  const remain = Math.max(0, 6 - props.images.length)
  if (!remain) {
    alert('最多上传 6 张图片')
    return
  }
  const picked = images.slice(0, remain)

  localUploading.value = true
  emit('update:uploading', true)
  const next = [...props.images]
  try {
    for (const file of picked) {
      const url = await uploadChatImage(file)
      next.push({ url, name: file.name || 'paste.png' })
    }
    emit('update:images', next)
  } catch (err) {
    console.error(err)
    alert(err instanceof Error ? err.message : '图片上传失败')
  } finally {
    localUploading.value = false
    emit('update:uploading', false)
  }
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  await uploadImages(files)
}

/** Ctrl+V / 右键粘贴截图或复制的图片 */
async function onPaste(e: ClipboardEvent) {
  if (props.streaming || localUploading.value) return
  const items = e.clipboardData?.items
  if (!items?.length) return

  const files: File[] = []
  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue
    const file = item.getAsFile()
    if (!file) continue
    const ext = file.type.split('/')[1] || 'png'
    const named =
      file.name && file.name !== 'image.png'
        ? file
        : new File([file], `paste-${Date.now()}.${ext}`, { type: file.type })
    files.push(named)
  }
  if (!files.length) return

  e.preventDefault()
  await uploadImages(files)
}

function removeImage(idx: number) {
  const next = props.images.filter((_, i) => i !== idx)
  emit('update:images', next)
}

defineExpose({
  focus() {
    ta.value?.focus()
  },
  setCursorEnd() {
    const el = ta.value
    if (!el) return
    try {
      const len = el.value.length
      el.setSelectionRange(len, len)
    } catch {
      /* ignore */
    }
  },
})
</script>

<template>
  <div class="composer">
    <div v-if="images.length" class="composer-imgs">
      <div v-for="(img, i) in images" :key="img.url + i" class="composer-img">
        <img :src="img.url" :alt="img.name" />
        <button class="composer-img-del" type="button" title="移除" @click="removeImage(i)">
          <i class="ri-close-line"></i>
        </button>
      </div>
    </div>
    <textarea
      ref="ta"
      :value="modelValue"
      rows="2"
      :placeholder="placeholder"
      @input="onInput"
      @keydown="onKeydown"
      @paste="onPaste"
    />
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      hidden
      @change="onFiles"
    />
    <div class="composer-bar">
      <div class="bar-left">
        <ModelVariantPicker
          v-if="variants.length"
          v-model:open="variantOpen"
          :model-id="selectedModelId"
          :variants="variants"
          @select="emit('select-variant', $event)"
        />
        <ImageSizePicker
          v-if="imageMode"
          :model-value="imageSize"
          :open="sizeOpen"
          :compact="compactAttach"
          @update:model-value="emit('update:imageSize', $event)"
          @update:open="sizeOpen = $event"
        />
        <template v-if="!imageMode">
          <button
            class="tool-btn"
            :class="{ on: deepThink }"
            type="button"
            title="深度思考"
            @click="emit('update:deepThink', !deepThink)"
          >
            <i class="ri-brain-line"></i>
            <span v-if="!compactAttach">深度思考</span>
          </button>
          <button
            class="tool-btn"
            :class="{ on: internet }"
            type="button"
            title="联网搜索"
            @click="emit('update:internet', !internet)"
          >
            <i class="ri-global-line"></i>
            <span v-if="!compactAttach">联网搜索</span>
          </button>
          <button
            class="tool-btn"
            type="button"
            title="上传图片（用于识图分析）"
            :disabled="streaming || localUploading || images.length >= 6"
            @click="pickFiles"
          >
            <i class="ri-image-add-line"></i>
            <span v-if="!compactAttach">{{ localUploading ? '上传中…' : '上传图片' }}</span>
          </button>
        </template>
      </div>
      <div class="bar-right">
        <button
          v-if="streaming"
          class="stop-btn"
          type="button"
          aria-label="停止生成"
          title="停止生成"
          @click="emit('stop')"
        >
          <i class="ri-stop-fill"></i>
        </button>
        <button
          v-else
          class="send-btn"
          :class="{ ready: canSend() }"
          type="button"
          :disabled="!canSend()"
          aria-label="发送"
          @click="emit('send')"
        >
          <i class="ri-arrow-up-line"></i>
        </button>
      </div>
    </div>
  </div>
</template>
