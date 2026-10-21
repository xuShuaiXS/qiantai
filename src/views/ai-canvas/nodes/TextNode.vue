<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import NodeLabel from '../components/NodeLabel.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  data: { prompt?: string; label?: string }
  selected?: boolean
}>()

const FLOW_ID = 'ai-canvas'
const { updateNodeData } = useVueFlow(FLOW_ID)

const text = computed({
  get: () => props.data.prompt ?? '',
  set: (v: string) => updateNodeData(props.id, { prompt: v }),
})

function onInput(e: Event) {
  text.value = (e.target as HTMLTextAreaElement).value
}
</script>

<template>
  <div class="text-node" :class="{ 'is-selected': selected }">
    <NodeLabel
      :label="data.label"
      fallback="文本"
      @change="(v) => updateNodeData(id, { label: v })"
    />
    <div class="text-card">
      <textarea
        class="text-area"
        :value="text"
        rows="5"
        placeholder="写下你的想法，或在右侧灵感画板中让 AI 帮你生成提示词"
        @input="onInput"
      />
    </div>
    <Handle type="source" :position="Position.Right" id="out" />
  </div>
</template>

<style scoped>
.text-node {
  width: 250px;
}
.text-card {
  border-radius: 14px;
  background: #161619;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.text-card:focus-within,
.text-node.is-selected .text-card {
  border-color: #2f6bff;
  box-shadow: 0 0 0 2px rgba(47, 107, 255, 0.18);
}
.text-area {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  background: transparent;
  resize: vertical;
  min-height: 92px;
  color: #ececf1;
  font-size: 12.5px;
  line-height: 1.65;
  outline: none;
}
.text-area::placeholder {
  color: #55555e;
}
</style>
