<script setup>
const props = defineProps({
  goals: {
    type: Array,
    required: true,
  },
  requirements: {
    type: Array,
    required: true,
  },
  jobs: {
    type: Array,
    required: true,
  },
  activeGoal: {
    type: Object,
    default: null,
  },
  activeRequirement: {
    type: Object,
    default: null,
  },
  activeJobId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-goal', 'select-requirement', 'select-job', 'hover-requirement', 'hover-job'])

function handleKey(event, callback) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  callback()
}
</script>

<template>
  <aside class="goal-detail-panel" aria-label="课程目标拆解与教学应用支撑">
    <section class="active-goal-card">
      <p>当前目标</p>
      <h2>{{ activeGoal?.name }}</h2>
      <span :style="{ '--goal-color': activeGoal?.color || '#22d3ee' }">{{ activeGoal?.summary }}</span>
      <strong>{{ activeGoal?.outcome }}</strong>
    </section>

    <section class="detail-section requirement-section">
      <div class="section-heading">
        <h3>目标拆解</h3>
        <span>{{ requirements.length }} 项要求</span>
      </div>
      <div class="requirement-list">
        <button
          v-for="item in requirements"
          :key="item.id"
          type="button"
          class="requirement-card"
          :class="{ active: activeRequirement?.id === item.id }"
          :style="{ '--goal-color': item.color }"
          @click="emit('select-requirement', item.id)"
          @mouseenter="emit('hover-requirement', item.id)"
          @mouseleave="emit('hover-requirement', '')"
          @keydown="handleKey($event, () => emit('select-requirement', item.id))"
        >
          <span>{{ item.level }}</span>
          <strong>{{ item.title }}</strong>
          <small>{{ item.description }}</small>
          <em>{{ item.keywords.join(' / ') }}</em>
        </button>
      </div>
    </section>

    <section class="detail-section job-section">
      <div class="section-heading">
        <h3>应用支撑</h3>
        <span>教学闭环</span>
      </div>
      <div class="job-list">
        <button
          v-for="job in jobs"
          :key="job.id"
          type="button"
          class="job-card"
          :class="{ active: activeJobId === job.id }"
          :style="{ '--job-color': job.color }"
          @click="emit('select-job', job.id)"
          @mouseenter="emit('hover-job', job.id)"
          @mouseleave="emit('hover-job', '')"
          @keydown="handleKey($event, () => emit('select-job', job.id))"
        >
          <span>
            <strong>{{ job.title }}</strong>
            <small>{{ job.company }}</small>
          </span>
          <em>{{ job.fit }}</em>
        </button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.goal-detail-panel {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.25fr) minmax(320px, 1fr);
  gap: 14px;
  align-items: stretch;
}

.active-goal-card,
.detail-section {
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(9, 20, 48, 0.82), rgba(8, 16, 36, 0.62));
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
}

.active-goal-card {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  justify-content: center;
  padding: clamp(18px, 1.6vw, 24px);
}

.active-goal-card p {
  margin: 0 0 6px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 900;
}

.active-goal-card h2 {
  margin: 0;
  color: #fff;
  font-size: 24px;
}

.active-goal-card span,
.active-goal-card strong {
  display: block;
  margin-top: 12px;
  line-height: 1.65;
}

.active-goal-card span {
  color: rgba(226, 242, 255, 0.76);
}

.active-goal-card strong {
  border-left: 3px solid var(--goal-color);
  padding-left: 12px;
  color: #fff;
  font-size: 14px;
}

.detail-section {
  padding: 16px;
}

.requirement-section {
  display: flex;
  flex-direction: column;
}

.job-section {
  display: flex;
  flex-direction: column;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-heading h3 {
  margin: 0;
  color: #fff;
  font-size: 16px;
}

.section-heading span {
  color: rgba(226, 242, 255, 0.6);
  font-size: 12px;
}

.requirement-list,
.job-list {
  display: grid;
  gap: 10px;
  min-height: 0;
}

.requirement-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.requirement-card,
.job-card {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  color: inherit;
  background: rgba(15, 23, 42, 0.54);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.requirement-card {
  display: grid;
  gap: 7px;
  min-height: 118px;
  padding: 13px;
}

.requirement-card:hover,
.requirement-card:focus-visible,
.requirement-card.active,
.job-card:hover,
.job-card:focus-visible,
.job-card.active {
  border-color: var(--goal-color, var(--job-color, #22d3ee));
  background: rgba(14, 116, 144, 0.18);
  outline: none;
  transform: translateY(-1px);
}

.requirement-card > span {
  color: var(--goal-color);
  font-size: 12px;
  font-weight: 900;
}

.requirement-card strong {
  color: #fff;
  font-size: 15px;
}

.requirement-card small {
  color: rgba(226, 242, 255, 0.68);
  font-size: 12px;
  line-height: 1.55;
}

.requirement-card em {
  color: rgba(186, 230, 253, 0.82);
  font-size: 12px;
  font-style: normal;
}

.job-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 12px 13px;
}

.job-card strong,
.job-card small {
  display: block;
}

.job-card strong {
  color: #fff;
  font-size: 14px;
}

.job-card small {
  margin-top: 5px;
  color: rgba(226, 242, 255, 0.62);
  font-size: 12px;
}

.job-card em {
  border-radius: 999px;
  padding: 7px 9px;
  color: #061126;
  background: var(--job-color);
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

@media (max-width: 1440px) {
  .goal-detail-panel {
    grid-template-columns: minmax(260px, 0.8fr) minmax(360px, 1.2fr);
  }

  .job-section {
    grid-column: 1 / -1;
  }

  .job-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .job-card {
    grid-template-columns: 1fr;
    align-content: space-between;
  }

  .job-card em {
    width: fit-content;
  }
}

@media (max-width: 1080px) {
  .goal-detail-panel {
    grid-template-columns: 1fr;
  }

  .requirement-list {
    grid-template-columns: 1fr;
  }

  .job-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .job-list {
    grid-template-columns: 1fr;
  }
}
</style>
