<script setup>
import { Aim, FullScreen, Minus, Plus } from '@element-plus/icons-vue'

defineEmits(['zoom-in', 'zoom-out', 'fit-view', 'reset-view'])

const controls = [
  { key: 'zoom-in', label: '放大', icon: Plus },
  { key: 'zoom-out', label: '缩小', icon: Minus },
  { key: 'fit-view', label: '适应视图', icon: FullScreen },
  { key: 'reset-view', label: '重置视图', icon: Aim },
]
</script>

<template>
  <div class="kg-controls" aria-label="图谱控制按钮">
    <button
      v-for="item in controls"
      :key="item.key"
      type="button"
      :aria-label="item.label"
      :title="item.label"
      @click="$emit(item.key)"
    >
      <el-icon><component :is="item.icon" /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.kg-controls {
  display: flex;
  gap: 8px;
  border: 1px solid rgba(125, 211, 252, 0.2);
  border-radius: 8px;
  padding: 8px;
  background: rgba(8, 16, 36, 0.72);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(14px);
}

button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  color: #c8f7ff;
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

button:hover,
button:focus-visible {
  border-color: rgba(34, 211, 238, 0.68);
  color: #fff;
  background: rgba(14, 116, 144, 0.34);
  outline: none;
  transform: translateY(-1px);
}
</style>
