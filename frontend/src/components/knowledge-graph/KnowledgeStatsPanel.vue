<script setup>
defineProps({
  stats: {
    type: Object,
    required: true,
  },
})

const items = [
  { key: 'groupCount', label: '知识群数', tone: 'violet' },
  { key: 'pointCount', label: '知识点数', tone: 'cyan' },
  { key: 'resourceCount', label: '多模态资源数', tone: 'amber' },
]
</script>

<template>
  <aside class="kg-stats-panel" aria-label="知识图谱统计">
    <p class="panel-kicker">C Knowledge Map</p>
    <h2>图谱概览</h2>
    <div class="stat-list">
      <div v-for="item in items" :key="item.key" class="stat-row" :class="`tone-${item.tone}`">
        <span class="stat-dot"></span>
        <span>{{ item.label }}</span>
        <strong>{{ stats[item.key] }}</strong>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.kg-stats-panel {
  width: 220px;
  border: 1px solid rgba(125, 211, 252, 0.2);
  border-radius: 8px;
  padding: 18px;
  color: #e6f7ff;
  background: linear-gradient(180deg, rgba(9, 20, 48, 0.78), rgba(8, 16, 36, 0.58));
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
}

.panel-kicker {
  margin: 0 0 6px;
  color: #67e8f9;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h2 {
  margin: 0 0 16px;
  color: #fff;
  font-size: 18px;
}

.stat-list {
  display: grid;
  gap: 12px;
}

.stat-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 42px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.46);
}

.stat-row span:nth-child(2) {
  color: rgba(226, 242, 255, 0.72);
  font-size: 13px;
}

.stat-row strong {
  color: #fff;
  font-size: 22px;
  font-family: Consolas, 'JetBrains Mono', monospace;
}

.stat-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tone-violet .stat-dot {
  background: #a78bfa;
  box-shadow: 0 0 14px rgba(167, 139, 250, 0.9);
}

.tone-cyan .stat-dot {
  background: #22d3ee;
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.9);
}

.tone-amber .stat-dot {
  background: #f59e0b;
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.9);
}

@media (max-width: 860px) {
  .kg-stats-panel {
    width: 100%;
  }
}
</style>
