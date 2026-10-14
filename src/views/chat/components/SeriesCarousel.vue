<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { rollSeries } from '../data'

const ITEM_H = 42
const PAD = 3
const FOCUS_SLOT = 2

const loop = computed(() => {
  const list = rollSeries
  return list.slice(-PAD).concat(list).concat(list.slice(0, PAD))
})

const idx = ref(PAD)
const jumping = ref(false)
const noTransition = ref(false)

const transform = computed(() => `translateY(${-(idx.value - FOCUS_SLOT) * ITEM_H}px)`)

function distClass(i: number) {
  const dist = Math.abs(i - idx.value)
  if (dist === 0) return 'pos-active'
  if (dist <= 2) return 'pos-near'
  return ''
}

let timer: ReturnType<typeof setInterval> | null = null
let jumpTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  timer = setInterval(() => {
    if (jumping.value) return
    idx.value++
    noTransition.value = false
    if (idx.value >= rollSeries.length + PAD) {
      jumping.value = true
      jumpTimer = setTimeout(() => {
        noTransition.value = true
        idx.value = PAD
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            noTransition.value = false
            jumping.value = false
          })
        })
      }, 680)
    }
  }, 2000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (jumpTimer) clearTimeout(jumpTimer)
})
</script>

<template>
  <div class="series-carousel" aria-hidden="true">
    <div
      class="series-track"
      :style="{
        transform,
        transition: noTransition ? 'none' : 'transform .65s cubic-bezier(.25, .8, .25, 1)',
      }"
    >
      <div v-for="(s, i) in loop" :key="`${s.name}-${i}`" class="series-item" :class="distClass(i)">
        <div class="si-pill">
          <span class="si-badge" :style="{ background: s.color }">{{ s.letter }}</span>
          <span class="si-name">{{ s.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
