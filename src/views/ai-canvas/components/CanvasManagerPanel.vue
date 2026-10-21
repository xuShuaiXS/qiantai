<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasLibraryStore } from '@/stores/canvasLibrary'

const emit = defineEmits<{
  (e: 'switched', id: string): void
  (e: 'created', id: string): void
  (e: 'close'): void
}>()

const lib = useCanvasLibraryStore()

const editingId = ref('')
const editingName = ref('')

function fmt(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function startRename(id: string, name: string) {
  editingId.value = id
  editingName.value = name
}
function commitRename() {
  if (editingId.value) lib.rename(editingId.value, editingName.value)
  editingId.value = ''
}
function choose(id: string) {
  if (id === lib.activeId) {
    emit('close')
    return
  }
  lib.switchTo(id)
  emit('switched', id)
}
function onCreate() {
  const id = lib.create()
  emit('created', id)
}
function onDuplicate(id: string) {
  lib.duplicate(id)
  emit('switched', lib.activeId)
}
function onDelete(id: string, name: string) {
  if (!window.confirm(`删除画布「${name}」？此操作不可恢复`)) return
  lib.remove(id)
  emit('switched', lib.activeId)
}
</script>

<template>
  <div class="cvm nodrag" @click.stop @mousedown.stop @pointerdown.stop @contextmenu.prevent.stop>
    <div class="cvm__head">
      <span>我的画布</span>
      <span class="cvm__count">{{ lib.canvases.length }}/30</span>
    </div>

    <div class="cvm__list">
      <div
        v-for="c in lib.canvases"
        :key="c.id"
        class="cvm__item"
        :class="{ 'is-active': c.id === lib.activeId }"
      >
        <template v-if="editingId === c.id">
          <input
            v-model="editingName"
            class="cvm__rename"
            autofocus
            @keydown.enter.prevent="commitRename"
            @keydown.esc.prevent="editingId = ''"
            @blur="commitRename"
            @click.stop
          />
        </template>
        <template v-else>
          <button class="cvm__main" type="button" :title="c.name" @click="choose(c.id)">
            <span class="cvm__name">{{ c.name }}</span>
            <span class="cvm__time">{{ fmt(c.updatedAt) }}</span>
          </button>
          <div class="cvm__ops">
            <button class="cvm__op" type="button" title="重命名" @click.stop="startRename(c.id, c.name)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </button>
            <button class="cvm__op" type="button" title="创建副本" @click.stop="onDuplicate(c.id)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button class="cvm__op cvm__op--danger" type="button" title="删除" @click.stop="onDelete(c.id, c.name)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
        </template>
      </div>
    </div>

    <button class="cvm__new" type="button" @click="onCreate">+ 新建画布</button>
  </div>
</template>

<style scoped>
.cvm {
  position: absolute;
  top: 52px;
  left: 16px;
  z-index: 55;
  width: 268px;
  max-height: 68vh;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #141419;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
}
.cvm__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 6px 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: #e8eaf2;
}
.cvm__count {
  font-size: 10.5px;
  font-weight: 400;
  color: #6b7288;
}
.cvm__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cvm__item {
  display: flex;
  align-items: center;
  gap: 4px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: background 0.15s ease;
}
.cvm__item:hover {
  background: rgba(255, 255, 255, 0.05);
}
.cvm__item.is-active {
  background: rgba(47, 107, 255, 0.14);
  border-color: rgba(47, 107, 255, 0.4);
}
.cvm__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 8px;
  border: 0;
  background: transparent;
  color: #e8eaf2;
  cursor: pointer;
  text-align: left;
}
.cvm__name {
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cvm__item.is-active .cvm__name {
  color: #a9c4ff;
  font-weight: 600;
}
.cvm__time {
  font-size: 10px;
  color: #6b7288;
}
.cvm__ops {
  display: flex;
  gap: 1px;
  padding-right: 5px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.cvm__item:hover .cvm__ops,
.cvm__item.is-active .cvm__ops {
  opacity: 1;
}
.cvm__op {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #8a8a93;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cvm__op:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.cvm__op--danger:hover {
  background: rgba(248, 113, 113, 0.18);
  color: #f87171;
}
.cvm__rename {
  flex: 1;
  height: 34px;
  margin: 0 4px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid rgba(47, 107, 255, 0.6);
  background: #0f0f12;
  color: #e8eaf2;
  font-size: 12.5px;
  outline: none;
}
.cvm__new {
  margin-top: 8px;
  height: 34px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: transparent;
  color: #a9c4ff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.cvm__new:hover {
  border-color: rgba(47, 107, 255, 0.6);
  background: rgba(47, 107, 255, 0.1);
}
</style>
