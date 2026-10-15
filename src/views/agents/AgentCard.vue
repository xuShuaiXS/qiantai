<script setup lang="ts">
import type { AgentItem } from '@/api/agents'

defineProps<{ agent: AgentItem }>()

const emit = defineEmits<{
  (e: 'open', agent: AgentItem): void
  (e: 'fav', agent: AgentItem): void
}>()
</script>

<template>
  <article class="agent-card" @click="emit('open', agent)">
    <div class="agent-card__head">
      <div class="agent-card__avatar">{{ agent.avatar }}</div>
      <div class="agent-card__meta">
        <div class="agent-card__name-row">
          <h3 class="agent-card__name" :title="agent.name">{{ agent.name }}</h3>
          <button
            class="agent-card__fav"
            :class="{ 'is-on': agent.isFavorited }"
            :title="agent.isFavorited ? '取消收藏' : '收藏'"
            @click.stop="emit('fav', agent)"
          >
            ★
          </button>
        </div>
        <div class="agent-card__stats">
          <span class="agent-card__rating">{{ agent.rating.toFixed(1) }}</span>
          <span>{{ agent.usageCount }} 次使用</span>
        </div>
      </div>
    </div>
    <p class="agent-card__desc">{{ agent.description || '暂无简介' }}</p>
    <div class="agent-card__tags">
      <span v-for="t in agent.tags.slice(0, 3)" :key="t" class="agent-card__tag">{{ t }}</span>
      <span v-if="!agent.isOfficial" class="agent-card__owner">我创建的</span>
    </div>
  </article>
</template>
