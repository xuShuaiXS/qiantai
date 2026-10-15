<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchModelFamilies } from '@/api/chat'
import { getToken } from '@/api/auth'
import type { AgentItem, CreateAgentPayload } from '@/api/agents'
import { useAgentsStore } from '@/stores/agents'

const props = defineProps<{
  visible: boolean
  /** 传入则为编辑模式 */
  editAgent?: AgentItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'saved', agent: AgentItem): void
}>()

const store = useAgentsStore()

const AVATARS = ['🤖', '✍️', '💻', '📊', '🌍', '📑', '📝', '🎓', '⚖️', '🧭', '🎨', '🔎', '📕', '🛍️', '🎧', '🧮', '📅', '🍳', '✈️', '🗣️', '➗', '🔍', '📷', '📣']

const saving = ref(false)
const modelOptions = ref<{ value: string; label: string }[]>([])
const modelsLoading = ref(false)
const tagInput = ref('')

const form = reactive({
  name: '',
  avatar: '🤖',
  categoryId: null as number | null,
  description: '',
  tags: [] as string[],
  systemPrompt: '',
  modelId: '',
  knowledgeBase: false,
})

const categoryOptions = computed(() =>
  store.categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
)

watch(
  () => props.visible,
  async (v) => {
    if (!v) return
    // 编辑模式回填；新建模式重置
    const a = props.editAgent
    form.name = a?.name ?? ''
    form.avatar = a?.avatar ?? '🤖'
    form.categoryId = a?.categoryId ?? null
    form.description = a?.description ?? ''
    form.tags = a ? [...a.tags] : []
    form.systemPrompt = a?.systemPrompt ?? ''
    form.modelId = a?.modelId ?? ''
    form.knowledgeBase = false
    tagInput.value = ''
    loadModels(a?.modelId)
  },
)

async function loadModels(prefer?: string) {
  modelsLoading.value = true
  try {
    // 未登录时不调 /chat/model-families（其 401 处理会硬跳登录页），模型列表留空
    if (!getToken()) {
      modelOptions.value = []
      form.modelId = ''
      return
    }
    const families = await fetchModelFamilies()
    const options: { value: string; label: string }[] = []
    families.forEach((family) => {
      const variants = (family.variants || []).filter((item) => item.capability !== 'image')
      if (family.capability === 'image' && !variants.length) return
      variants.forEach((variant) => {
        options.push({ value: variant.modelId, label: `${variant.name}（${family.name}）` })
      })
    })
    modelOptions.value = options
    // 优先保留已选/编辑值，否则选第一个可用模型
    if (!prefer || !options.some((o) => o.value === prefer)) {
      form.modelId = options[0]?.value ?? ''
    } else {
      form.modelId = prefer
    }
  } catch {
    modelOptions.value = []
  } finally {
    modelsLoading.value = false
  }
}

function addTag() {
  const t = tagInput.value.trim()
  if (!t) return
  if (!form.tags.includes(t)) form.tags.push(t)
  if (form.tags.length > 6) form.tags.pop()
  tagInput.value = ''
}

function removeTag(t: string) {
  form.tags = form.tags.filter((x) => x !== t)
}

async function submit() {
  if (!form.name.trim()) {
    ElMessage.warning('请先给智能体起个名字')
    return
  }
  if (!form.systemPrompt.trim()) {
    ElMessage.warning('系统提示词不能为空——它决定智能体的角色与行为')
    return
  }
  saving.value = true
  try {
    const payload: CreateAgentPayload = {
      name: form.name.trim(),
      avatar: form.avatar,
      categoryId: form.categoryId,
      description: form.description.trim(),
      tags: [...form.tags],
      systemPrompt: form.systemPrompt.trim(),
      modelId: form.modelId,
    }
    const saved = props.editAgent
      ? await store.updateAgent(props.editAgent.id, payload)
      : await store.createAgent(payload)
    ElMessage.success(props.editAgent ? '保存成功' : '创建成功')
    emit('saved', saved)
    emit('update:visible', false)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="editAgent ? '编辑智能体' : '创建智能体'"
    width="640px"
    :close-on-click-modal="false"
    @update:model-value="(v: boolean) => emit('update:visible', v)"
  >
    <el-form label-width="92px" label-position="left">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" maxlength="30" show-word-limit placeholder="例如：周报助手" />
      </el-form-item>

      <el-form-item label="头像">
        <div class="agent-emoji-picker">
          <button
            v-for="e in AVATARS"
            :key="e"
            type="button"
            class="agent-emoji-item"
            :class="{ 'is-active': form.avatar === e }"
            @click="form.avatar = e"
          >
            {{ e }}
          </button>
        </div>
      </el-form-item>

      <el-form-item label="分类">
        <el-select v-model="form.categoryId" placeholder="选择分类（可留空）" clearable style="width: 100%">
          <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="简介">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="2"
          maxlength="120"
          show-word-limit
          placeholder="一句话介绍这个智能体能做什么"
        />
      </el-form-item>

      <el-form-item label="标签">
        <div class="agent-tag-input">
          <span v-for="t in form.tags" :key="t" class="agent-tag-chip">
            {{ t }}
            <button type="button" @click="removeTag(t)">×</button>
          </span>
          <input
            v-model="tagInput"
            placeholder="输入标签后回车（最多 6 个）"
            @keydown.enter.prevent="addTag"
          />
        </div>
      </el-form-item>

      <el-form-item label="系统提示词" required>
        <el-input
          v-model="form.systemPrompt"
          type="textarea"
          :rows="4"
          placeholder="描述智能体的角色、能力与行为约束，例如：你是一位周报整理助手，将零散工作内容整理为结构化周报……"
        />
      </el-form-item>

      <el-form-item label="对话模型">
        <el-select v-model="form.modelId" :loading="modelsLoading" placeholder="选择对话模型" style="width: 100%">
          <el-option v-for="m in modelOptions" :key="m.value" :label="m.label" :value="m.value" />
        </el-select>
      </el-form-item>

      <el-form-item label="知识库">
        <el-switch v-model="form.knowledgeBase" disabled />
        <div class="agent-kb-tip">支持自定义知识库 —— 即将上线，敬请期待</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:visible', false)">取消</el-button>
      <el-button type="primary" :loading="saving" @click="submit">
        {{ editAgent ? '保存' : '立即创建' }}
      </el-button>
    </template>
  </el-dialog>
</template>
