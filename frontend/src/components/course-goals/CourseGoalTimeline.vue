<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  },
  activeId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select'])

function handleKey(event, id) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  emit('select', id)
}
</script>

<template>
  <section class="timeline-panel" aria-label="学习进阶路线">
    <div class="panel-heading">
      <div>
        <p>Learning Route</p>
        <h2>学习进阶路线</h2>
      </div>
      <span>从课程目标到学习分析</span>
    </div>

    <div class="timeline-track">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        type="button"
        class="timeline-node"
        :class="{ active: item.id === activeId }"
        :style="{ '--node-color': item.color, '--node-index': index }"
        @click="emit('select', item.id)"
        @keydown="handleKey($event, item.id)"
      >
        <span>{{ item.label }}</span>
        <strong>{{ item.title }}</strong>
      </button>
    </div>

    <article v-for="item in items" v-show="item.id === activeId" :key="`${item.id}-detail`" class="timeline-detail">
      <div>
        <p>{{ item.label }}</p>
        <h3>{{ item.title }}</h3>
        <strong>{{ item.goal }}</strong>
      </div>
      <ul>
        <li v-for="topic in item.topics" :key="topic">{{ topic }}</li>
      </ul>
      <footer>{{ item.evidence }}</footer>
    </article>
  </section>
</template>

<style scoped>
.timeline-panel {
  min-width: 0;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.panel-heading p {
  margin: 0 0 6px;
  color: #67e8f9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.panel-heading h2 {
  margin: 0;
  color: #fff;
  font-size: 22px;
}

.panel-heading > span {
  color: rgba(226, 242, 255, 0.7);
  font-size: 13px;
}

.timeline-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.timeline-track::before {
  content: '';
  position: absolute;
  top: 34px;
  left: 8%;
  right: 8%;
  height: 2px;
  background: linear-gradient(90deg, #22d3ee, #38bdf8, #a78bfa, #fb923c);
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.34);
}

.timeline-node {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  justify-items: center;
  min-height: 102px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  padding: 14px 10px;
  color: inherit;
  background: rgba(15, 23, 42, 0.62);
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
}

.timeline-node::before {
  content: '';
  width: 22px;
  height: 22px;
  border: 4px solid rgba(2, 6, 23, 0.92);
  border-radius: 50%;
  background: var(--node-color);
  box-shadow: 0 0 18px color-mix(in srgb, var(--node-color) 70%, transparent);
}

.timeline-node:hover,
.timeline-node:focus-visible,
.timeline-node.active {
  border-color: var(--node-color);
  background: color-mix(in srgb, var(--node-color) 14%, rgba(15, 23, 42, 0.72));
  outline: none;
  transform: translateY(-2px);
}

.timeline-node span {
  color: var(--node-color);
  font-size: 12px;
  font-weight: 900;
}

.timeline-node strong {
  color: #fff;
  font-size: 15px;
}

.timeline-detail {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(160px, 0.7fr);
  gap: 18px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  padding: 18px;
  background: rgba(15, 23, 42, 0.54);
}

.timeline-detail p {
  margin: 0 0 6px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 900;
}

.timeline-detail h3 {
  margin: 0 0 10px;
  color: #fff;
  font-size: 22px;
}

.timeline-detail strong,
.timeline-detail footer {
  color: rgba(226, 242, 255, 0.78);
  line-height: 1.65;
}

.timeline-detail ul {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.timeline-detail li {
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 999px;
  padding: 7px 10px;
  color: #b8efff;
  background: rgba(14, 116, 144, 0.12);
  font-size: 12px;
}

.timeline-detail footer {
  grid-column: 1 / -1;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  padding-top: 14px;
  font-size: 13px;
}

@media (max-width: 860px) {
  .panel-heading,
  .timeline-detail {
    grid-template-columns: 1fr;
  }

  .panel-heading {
    flex-direction: column;
  }

  .timeline-track {
    grid-template-columns: 1fr;
  }

  .timeline-track::before {
    top: 20px;
    bottom: 20px;
    left: 20px;
    right: auto;
    width: 2px;
    height: auto;
  }

  .timeline-node {
    grid-template-columns: 30px minmax(0, auto);
    justify-items: start;
    align-items: center;
    min-height: 76px;
    text-align: left;
  }

  .timeline-node::before {
    grid-row: 1 / span 2;
  }
}
</style>
