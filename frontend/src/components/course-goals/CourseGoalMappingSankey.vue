<script setup>
import { computed } from 'vue'

const props = defineProps({
  goals: {
    type: Array,
    required: true,
  },
  jobs: {
    type: Array,
    required: true,
  },
  activeGoalId: {
    type: String,
    default: '',
  },
  activeRequirementId: {
    type: String,
    default: '',
  },
  activeJobId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-goal', 'select-requirement', 'select-job', 'hover-goal', 'hover-requirement', 'hover-job'])

const abilityLabels = {
  syntax: '语法建模能力',
  memory: '内存与指针能力',
  modular: '模块设计能力',
  debug: '调试验证能力',
  algorithmic: '算法抽象能力',
  standard: '规范表达能力',
  linux: '课程评价覆盖',
  portfolio: '测评达成证据',
}

const requirements = computed(() =>
  props.goals.flatMap((goal) =>
    goal.requirements.map((requirement) => ({
      ...requirement,
      goalId: goal.id,
      goalName: goal.name,
      color: goal.color,
    })),
  ),
)

function distribute(items, top, bottom) {
  if (items.length <= 1) return items.map((item) => ({ ...item, y: (top + bottom) / 2 }))
  const step = (bottom - top) / (items.length - 1)
  return items.map((item, index) => ({ ...item, y: top + index * step }))
}

const goalNodes = computed(() =>
  distribute(props.goals, 110, 430).map((goal) => ({
    ...goal,
    x: 54,
    w: 150,
    h: 46,
    column: 'goal',
  })),
)

const requirementNodes = computed(() =>
  distribute(requirements.value, 82, 470).map((requirement) => ({
    ...requirement,
    x: 318,
    w: 158,
    h: 38,
    column: 'requirement',
  })),
)

const abilityNodes = computed(() =>
  distribute(requirements.value, 82, 470).map((requirement) => ({
    id: `ability-${requirement.id}`,
    requirementId: requirement.id,
    goalId: requirement.goalId,
    title: abilityLabels[requirement.id] || requirement.title,
    color: requirement.color,
    y: requirement.y,
    x: 604,
    w: 156,
    h: 38,
    column: 'ability',
  })),
)

const jobNodes = computed(() =>
  distribute(props.jobs, 96, 456).map((job) => ({
    ...job,
    x: 910,
    w: 154,
    h: 54,
    column: 'job',
  })),
)

function getNode(map, id) {
  return map.get(id)
}

function ribbonPath(source, target) {
  const startX = source.x + source.w
  const endX = target.x
  const delta = Math.max(80, (endX - startX) * 0.5)
  return `M ${startX} ${source.y} C ${startX + delta} ${source.y}, ${endX - delta} ${target.y}, ${endX} ${target.y}`
}

const links = computed(() => {
  const goalMap = new Map(goalNodes.value.map((node) => [node.id, node]))
  const reqMap = new Map(requirementNodes.value.map((node) => [node.id, node]))
  const abilityMap = new Map(abilityNodes.value.map((node) => [node.requirementId, node]))
  const jobMap = new Map(jobNodes.value.map((node) => [node.id, node]))
  const result = []

  requirements.value.forEach((requirement) => {
    const goal = getNode(goalMap, requirement.goalId)
    const req = getNode(reqMap, requirement.id)
    const ability = getNode(abilityMap, requirement.id)
    if (goal && req) {
      result.push({
        id: `goal-${goal.id}-${requirement.id}`,
        type: 'goal-requirement',
        goalId: goal.id,
        requirementId: requirement.id,
        color: goal.color,
        width: 18,
        path: ribbonPath(goal, req),
      })
    }
    if (req && ability) {
      result.push({
        id: `requirement-${requirement.id}`,
        type: 'requirement-ability',
        goalId: requirement.goalId,
        requirementId: requirement.id,
        color: requirement.color,
        width: 14,
        path: ribbonPath(req, ability),
      })
    }
  })

  props.jobs.forEach((job) => {
    job.requirementIds.forEach((requirementId, index) => {
      const ability = getNode(abilityMap, requirementId)
      const target = getNode(jobMap, job.id)
      const requirement = requirements.value.find((item) => item.id === requirementId)
      if (!ability || !target || !requirement) return
      result.push({
        id: `ability-${requirementId}-${job.id}`,
        type: 'ability-job',
        goalId: requirement.goalId,
        requirementId,
        jobId: job.id,
        color: index === 0 ? job.color : requirement.color,
        width: index === 0 ? 15 : 9,
        path: ribbonPath(ability, target),
      })
    })
  })

  return result
})

const movingParticles = computed(() =>
  links.value.flatMap((link, index) =>
    [0, 1].map((_, particleIndex) => ({
      id: `${link.id}-particle-${particleIndex}`,
      linkId: link.id,
      color: link.color,
      radius: particleIndex === 0 ? 3.2 : 2.1,
      duration: `${4.8 + ((index + particleIndex) % 5) * 0.45}s`,
      begin: `${-((index * 0.34 + particleIndex * 1.7) % 5.8)}s`,
    })),
  ),
)

function isLinkActive(link) {
  if (props.activeJobId) return link.jobId === props.activeJobId || (!link.jobId && link.goalId === activeJobGoalId.value)
  if (props.activeRequirementId) return link.requirementId === props.activeRequirementId
  if (props.activeGoalId) return link.goalId === props.activeGoalId
  return true
}

const activeJobGoalId = computed(() => {
  const job = props.jobs.find((item) => item.id === props.activeJobId)
  const primaryRequirement = requirements.value.find((item) => item.id === job?.requirementIds?.[0])
  return primaryRequirement?.goalId || job?.goalIds?.[0] || ''
})

function isGoalActive(goalId) {
  if (props.activeJobId) return goalId === activeJobGoalId.value
  if (props.activeRequirementId) return requirements.value.find((item) => item.id === props.activeRequirementId)?.goalId === goalId
  if (props.activeGoalId) return props.activeGoalId === goalId
  return true
}

function isRequirementActive(requirementId) {
  if (props.activeJobId) {
    const job = props.jobs.find((item) => item.id === props.activeJobId)
    return job?.requirementIds.includes(requirementId)
  }
  if (props.activeRequirementId) return props.activeRequirementId === requirementId
  if (props.activeGoalId) return requirements.value.find((item) => item.id === requirementId)?.goalId === props.activeGoalId
  return true
}

function isJobActive(job) {
  if (props.activeJobId) return props.activeJobId === job.id
  if (props.activeRequirementId) return job.requirementIds.includes(props.activeRequirementId)
  if (props.activeGoalId) return job.goalIds.includes(props.activeGoalId)
  return true
}

function handleKey(event, callback) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  callback()
}
</script>

<template>
  <section class="sankey-panel" aria-label="课程目标与教学应用支撑">
    <div class="panel-heading">
      <div>
        <p>Goal To Teaching Flow</p>
        <h2>目标与教学支撑链路</h2>
      </div>
      <span>课程目标、教学要求、题库资源和教学应用形成一条可追踪的学习分析链路。</span>
    </div>

    <div class="sankey-shell">
      <svg class="sankey-svg" viewBox="0 0 1120 560" role="img" aria-label="课程目标到教学应用的多层桑基映射图">
        <defs>
          <filter id="sankeyGlow" x="-30%" y="-70%" width="160%" height="240%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="sankeyPanelGlow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="rgba(125, 211, 252, 0.18)" />
            <stop offset="100%" stop-color="rgba(15, 23, 42, 0.18)" />
          </linearGradient>
        </defs>

        <rect x="18" y="28" width="1084" height="504" rx="14" class="sankey-frame" />
        <text x="54" y="62" class="column-title tone-cyan">课程目标层</text>
        <text x="318" y="62" class="column-title tone-violet">教学要求层</text>
        <text x="604" y="62" class="column-title tone-emerald">题库资源层</text>
        <text x="910" y="62" class="column-title tone-amber">教学应用层</text>

        <g class="sankey-links">
          <path
            v-for="link in links"
            :key="`${link.id}-path`"
            class="sankey-particle-path"
            :id="`sankey-particle-path-${link.id}`"
            :d="link.path"
          />
          <path
            v-for="link in links"
            :key="`${link.id}-ribbon`"
            class="sankey-link sankey-ribbon"
            :class="{ muted: !isLinkActive(link) }"
            :d="link.path"
            :stroke="link.color"
            :stroke-width="link.width"
          />
          <path
            v-for="link in links"
            :key="`${link.id}-flow`"
            class="sankey-link sankey-flow-line"
            :class="{ muted: !isLinkActive(link) }"
            :d="link.path"
            :stroke="link.color"
          />
        </g>

        <g class="sankey-path-particles" aria-hidden="true">
          <circle
            v-for="particle in movingParticles"
            :key="particle.id"
            :r="particle.radius"
            :fill="particle.color"
          >
            <animateMotion :dur="particle.duration" :begin="particle.begin" repeatCount="indefinite">
              <mpath :href="`#sankey-particle-path-${particle.linkId}`" />
            </animateMotion>
          </circle>
        </g>

        <g
          v-for="goal in goalNodes"
          :key="goal.id"
          class="sankey-node goal-node"
          :class="{ muted: !isGoalActive(goal.id) }"
          tabindex="0"
          role="button"
          :aria-label="goal.name"
          @click="emit('select-goal', goal.id)"
          @mouseenter="emit('hover-goal', goal.id)"
          @mouseleave="emit('hover-goal', '')"
          @keydown="handleKey($event, () => emit('select-goal', goal.id))"
        >
          <rect :x="goal.x" :y="goal.y - goal.h / 2" :width="goal.w" :height="goal.h" rx="8" :fill="goal.color" />
          <text :x="goal.x + 16" :y="goal.y + 5">{{ goal.name }}</text>
        </g>

        <g
          v-for="requirement in requirementNodes"
          :key="requirement.id"
          class="sankey-node requirement-node"
          :class="{ muted: !isRequirementActive(requirement.id) }"
          tabindex="0"
          role="button"
          :aria-label="requirement.title"
          @click="emit('select-requirement', requirement.id)"
          @mouseenter="emit('hover-requirement', requirement.id)"
          @mouseleave="emit('hover-requirement', '')"
          @keydown="handleKey($event, () => emit('select-requirement', requirement.id))"
        >
          <rect :x="requirement.x" :y="requirement.y - requirement.h / 2" :width="requirement.w" :height="requirement.h" rx="8" :fill="requirement.color" />
          <text :x="requirement.x + requirement.w - 12" :y="requirement.y + 5">{{ requirement.title }}</text>
        </g>

        <g
          v-for="ability in abilityNodes"
          :key="ability.id"
          class="sankey-node ability-node"
          :class="{ muted: !isRequirementActive(ability.requirementId) }"
          tabindex="0"
          role="button"
          :aria-label="ability.title"
          @click="emit('select-requirement', ability.requirementId)"
          @mouseenter="emit('hover-requirement', ability.requirementId)"
          @mouseleave="emit('hover-requirement', '')"
          @keydown="handleKey($event, () => emit('select-requirement', ability.requirementId))"
        >
          <rect :x="ability.x" :y="ability.y - ability.h / 2" :width="ability.w" :height="ability.h" rx="8" :fill="ability.color" />
          <text :x="ability.x + ability.w - 12" :y="ability.y + 5">{{ ability.title }}</text>
        </g>

        <g
          v-for="job in jobNodes"
          :key="job.id"
          class="sankey-node job-node"
          :class="{ muted: !isJobActive(job) }"
          tabindex="0"
          role="button"
          :aria-label="job.title"
          @click="emit('select-job', job.id)"
          @mouseenter="emit('hover-job', job.id)"
          @mouseleave="emit('hover-job', '')"
          @keydown="handleKey($event, () => emit('select-job', job.id))"
        >
          <rect :x="job.x" :y="job.y - job.h / 2" :width="job.w" :height="job.h" rx="8" :fill="job.color" />
          <text :x="job.x + 14" :y="job.y - 4">{{ job.title }}</text>
          <text :x="job.x + 14" :y="job.y + 16" class="job-fit">{{ job.fit }} 覆盖</text>
        </g>

        <g class="sankey-particles" aria-hidden="true">
          <circle cx="264" cy="138" r="4" />
          <circle cx="542" cy="226" r="4" />
          <circle cx="810" cy="302" r="4" />
          <circle cx="708" cy="438" r="4" />
          <circle cx="244" cy="388" r="3" />
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped>
.sankey-panel {
  min-width: 0;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
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
  max-width: 420px;
  color: rgba(226, 242, 255, 0.7);
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
}

.sankey-shell {
  min-width: 0;
  overflow: hidden;
}

.sankey-svg {
  width: 100%;
  min-height: 480px;
  display: block;
  overflow: visible;
}

.sankey-frame {
  fill: rgba(8, 16, 36, 0.48);
  stroke: rgba(125, 211, 252, 0.16);
  stroke-width: 1;
}

.column-title {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.tone-cyan {
  fill: #60a5fa;
}

.tone-violet {
  fill: #c4b5fd;
}

.tone-emerald {
  fill: #34d399;
}

.tone-amber {
  fill: #f59e0b;
}

.sankey-particle-path {
  fill: none;
  stroke: none;
  pointer-events: none;
}

.sankey-link {
  fill: none;
  stroke-linecap: round;
  mix-blend-mode: screen;
  filter: url(#sankeyGlow);
  transition: opacity 0.22s ease, stroke-width 0.22s ease;
}

.sankey-ribbon {
  opacity: 0.36;
}

.sankey-flow-line {
  opacity: 0.82;
  stroke-width: 2.2;
  stroke-dasharray: 1 20;
  stroke-dashoffset: 0;
  animation: sankeyParticleFlow 5.4s linear infinite;
}

.sankey-link.muted {
  opacity: 0.06;
}

.sankey-flow-line.muted {
  opacity: 0.12;
}

.sankey-path-particles circle {
  filter: url(#sankeyGlow);
  opacity: 0.88;
  mix-blend-mode: screen;
}

.sankey-node {
  cursor: pointer;
  outline: none;
  transition: opacity 0.2s ease, filter 0.2s ease, transform 0.2s ease;
}

.sankey-node:hover,
.sankey-node:focus-visible {
  filter: url(#sankeyGlow);
  transform: translateY(-1px);
}

.sankey-node.muted {
  opacity: 0.28;
}

.sankey-node rect {
  opacity: 0.78;
  stroke: rgba(255, 255, 255, 0.36);
  stroke-width: 1;
}

.sankey-node text {
  fill: #eef9ff;
  pointer-events: none;
  paint-order: stroke;
  stroke: rgba(2, 6, 23, 0.62);
  stroke-width: 3px;
  stroke-linejoin: round;
  font-size: 12px;
  font-weight: 800;
}

.goal-node text,
.job-node text {
  text-anchor: start;
}

.requirement-node text,
.ability-node text {
  text-anchor: end;
}

.job-node .job-fit {
  fill: rgba(255, 255, 255, 0.78);
  font-size: 10px;
  font-weight: 700;
}

.sankey-particles circle {
  fill: rgba(103, 232, 249, 0.9);
  filter: url(#sankeyGlow);
  transform-box: fill-box;
  transform-origin: center;
  animation: sankeyParticlePulse 2.8s ease-in-out infinite;
}

.sankey-particles circle:nth-child(2n) {
  animation-delay: -0.8s;
  fill: rgba(196, 181, 253, 0.84);
}

.sankey-particles circle:nth-child(3n) {
  animation-delay: -1.4s;
  fill: rgba(52, 211, 153, 0.86);
}

@keyframes sankeyParticleFlow {
  to {
    stroke-dashoffset: -126;
  }
}

@keyframes sankeyParticlePulse {
  0%,
  100% {
    opacity: 0.42;
    transform: scale(0.78);
  }

  50% {
    opacity: 1;
    transform: scale(1.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sankey-flow-line,
  .sankey-particles circle {
    animation: none;
  }

  .sankey-path-particles {
    display: none;
  }
}

@media (max-width: 860px) {
  .panel-heading {
    flex-direction: column;
  }

  .panel-heading > span {
    text-align: left;
  }

  .sankey-shell {
    overflow-x: auto;
    padding-bottom: 6px;
  }

  .sankey-svg {
    width: 960px;
    min-height: 420px;
  }
}
</style>
