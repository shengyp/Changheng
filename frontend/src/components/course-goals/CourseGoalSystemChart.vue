<script setup>
import { computed } from 'vue'

const props = defineProps({
  goals: {
    type: Array,
    required: true,
  },
  pyramid: {
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
})

const emit = defineEmits(['select-goal', 'select-requirement', 'hover-goal', 'hover-requirement'])

const layerMap = {
  career: {
    title: '课程教学目标',
    caption: '学习方向与阶段评价',
    color: '#f59e42',
    label: { x: 270, y: 146, w: 140, h: 54, side: 'left' },
    line: 'M410 172H478',
  },
  practice: {
    title: '题库与资源',
    caption: '题目、试卷与学习资源',
    color: '#38bdf8',
    label: { x: 766, y: 200, w: 150, h: 58, side: 'right' },
    line: 'M704 226H766',
  },
  thinking: {
    title: '知识点与标签',
    caption: '章节知识与题目标签',
    color: '#a78bfa',
    label: { x: 190, y: 258, w: 150, h: 58, side: 'left' },
    line: 'M340 286H404',
  },
  foundation: {
    title: '学习分析支撑',
    caption: '作答记录、画像与推荐',
    color: '#22d3ee',
    label: { x: 820, y: 396, w: 162, h: 58, side: 'right' },
    line: 'M736 424H820',
  },
}

const fallbackLayers = ['career', 'practice', 'thinking', 'foundation']

const goalLayers = computed(() => {
  const ids = props.pyramid?.length ? props.pyramid.map((item) => item.id) : fallbackLayers
  return ids
    .filter((id) => layerMap[id])
    .map((id) => ({
      id,
      ...layerMap[id],
      active: props.activeGoalId === id,
      muted: props.activeGoalId && props.activeGoalId !== id,
    }))
})

const activeGoal = computed(() => props.goals.find((goal) => goal.id === props.activeGoalId) || props.goals[0])

function handleKey(event, callback) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  callback()
}
</script>

<template>
  <section class="goal-system-panel" aria-label="课程目标层培养目标体系">
    <div class="goal-system-stage">
      <svg class="system-svg" viewBox="0 0 1120 560" role="img" aria-label="C-EVAL v2.0 课程目标层立体培养目标体系">
        <defs>
          <filter id="softGlow" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="strongGlow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="13" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="stageBg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#082842" />
            <stop offset="45%" stop-color="#06152c" />
            <stop offset="100%" stop-color="#020713" />
          </linearGradient>
          <radialGradient id="goalOrb" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stop-color="#7dd3fc" stop-opacity="0.45" />
            <stop offset="62%" stop-color="#0ea5e9" stop-opacity="0.14" />
            <stop offset="100%" stop-color="#020617" stop-opacity="0" />
          </radialGradient>
          <linearGradient id="goldTop" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#ffe6b8" stop-opacity="0.88" />
            <stop offset="52%" stop-color="#f59e42" stop-opacity="0.62" />
            <stop offset="100%" stop-color="#5b2b15" stop-opacity="0.32" />
          </linearGradient>
          <linearGradient id="cyanGlass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#67e8f9" stop-opacity="0.7" />
            <stop offset="50%" stop-color="#38bdf8" stop-opacity="0.34" />
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0.18" />
          </linearGradient>
          <linearGradient id="purpleGlass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#c4b5fd" stop-opacity="0.66" />
            <stop offset="52%" stop-color="#8b5cf6" stop-opacity="0.38" />
            <stop offset="100%" stop-color="#10112b" stop-opacity="0.22" />
          </linearGradient>
          <linearGradient id="tealGlass" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#5eead4" stop-opacity="0.62" />
            <stop offset="54%" stop-color="#22d3ee" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#052331" stop-opacity="0.2" />
          </linearGradient>
          <linearGradient id="flowLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0" />
            <stop offset="40%" stop-color="#67e8f9" />
            <stop offset="78%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#a78bfa" stop-opacity="0" />
          </linearGradient>
        </defs>

        <rect width="1120" height="560" fill="url(#stageBg)" />

        <g class="star-field" aria-hidden="true">
          <circle v-for="i in 120" :key="i" :cx="(i * 83) % 1110" :cy="8 + ((i * 47) % 540)" :r="i % 8 === 0 ? 1.35 : 0.7" />
        </g>

        <g class="floor-grid" aria-hidden="true">
          <path d="M130 504H990M186 470H930M250 438H870M324 408H796M178 560 430 354M942 560 702 354" />
          <path d="M304 418 560 300 816 418 560 500Z" />
        </g>

        <g class="top-copy">
          <path d="M24 18H382L352 60H24Z" />
          <text x="34" y="42" class="title">C-EVAL <tspan>v2.0</tspan> - 课程目标层</text>
          <text x="34" y="84">围绕课程目标组织知识点、题目标签、</text>
          <text x="34" y="106">题库资源和学习分析支撑。</text>
        </g>

        <g class="coverage">
          <rect x="922" y="18" width="176" height="46" rx="6" />
          <text x="936" y="49" class="num">128</text>
          <text x="998" y="36">QUESTION</text>
          <text x="998" y="52">BANK COVERAGE</text>
        </g>

        <g class="obe-orb">
          <circle cx="560" cy="56" r="96" fill="url(#goalOrb)" />
          <path d="M468 56a92 92 0 0 1 184 0M482 24c48 24 108 24 156 0M482 88c48-24 108-24 156 0M560-36v184M468 56h184" />
          <text x="560" y="54">COURSE GOAL SYSTEM</text>
          <text x="560" y="80" class="main">课程目标体系</text>
        </g>

        <g class="decor satellite-left" transform="translate(210 160) rotate(-27)" aria-hidden="true">
          <rect x="-46" y="-8" width="36" height="16" rx="2" />
          <rect x="10" y="-8" width="36" height="16" rx="2" />
          <rect x="-10" y="-18" width="20" height="36" rx="5" />
          <circle cx="0" cy="0" r="10" />
          <path d="M-68 0h22M46 0h22" />
        </g>
        <g class="decor satellite-right" transform="translate(778 96) rotate(28)" aria-hidden="true">
          <rect x="-44" y="-8" width="34" height="16" rx="2" />
          <rect x="10" y="-8" width="34" height="16" rx="2" />
          <rect x="-10" y="-18" width="20" height="36" rx="5" />
          <circle cx="0" cy="0" r="10" />
          <path d="M-66 0h22M44 0h22" />
        </g>

        <g class="analysis-lines" aria-hidden="true">
          <path d="M58 250c30-24 56-24 84 0s58 24 92 0" />
          <path d="M58 284c46-50 96-50 148 0" />
          <path d="M58 318c34-18 66-18 102 0s58 18 92 0" />
          <path d="M100 220v126M56 318h190" />
        </g>

        <g class="server-rack" aria-hidden="true">
          <path d="M966 120l48-22 62 28-48 23zM966 120v94l62 32v-97zM1028 149l48-23v94l-48 26z" />
          <path d="M990 104l48-22 58 25-48 22zM1048 129v82" />
          <path d="M986 152h28M986 176h28M986 200h28M1038 158h26M1038 182h26M1038 206h26" />
        </g>

        <g class="data-flows" aria-hidden="true">
          <path d="M236 432C316 432 330 362 408 362" />
          <path d="M708 270C806 268 828 344 954 344" />
          <path d="M710 302C826 304 852 316 952 316" />
        </g>

        <ellipse cx="560" cy="482" rx="280" ry="38" class="pyramid-shadow" />
        <polygon points="302 404 560 292 820 404 560 508" class="base-plane" />
        <polygon points="350 410 560 326 770 410 560 492" class="base-plane inner" />

        <g
          class="pyramid-layer layer-foundation"
          :class="{ active: activeGoalId === 'foundation', muted: activeGoalId && activeGoalId !== 'foundation' }"
          tabindex="0"
          role="button"
          aria-label="基础与原理"
          @click="emit('select-goal', 'foundation')"
          @mouseenter="emit('hover-goal', 'foundation')"
          @mouseleave="emit('hover-goal', '')"
          @keydown="handleKey($event, () => emit('select-goal', 'foundation'))"
        >
          <polygon class="face top teal" points="320 368 560 282 800 368 560 458" />
          <polygon class="face left teal" points="320 368 560 458 560 502 302 404" />
          <polygon class="face right teal" points="800 368 560 458 560 502 820 404" />
          <polygon class="face front teal" points="302 404 560 502 820 404 560 492" />
          <path class="edge" d="M320 368 560 282 800 368 560 458Z M302 404 560 502 820 404" />
        </g>

        <g
          class="pyramid-layer layer-thinking"
          :class="{ active: activeGoalId === 'thinking', muted: activeGoalId && activeGoalId !== 'thinking' }"
          tabindex="0"
          role="button"
          aria-label="思维与素养"
          @click="emit('select-goal', 'thinking')"
          @mouseenter="emit('hover-goal', 'thinking')"
          @mouseleave="emit('hover-goal', '')"
          @keydown="handleKey($event, () => emit('select-goal', 'thinking'))"
        >
          <polygon class="face top purple" points="382 288 560 218 738 288 560 356" />
          <polygon class="face left purple" points="382 288 560 356 560 408 350 326" />
          <polygon class="face right purple" points="738 288 560 356 560 408 770 326" />
          <polygon class="face front purple" points="350 326 560 408 770 326 560 398" />
          <path class="edge" d="M382 288 560 218 738 288 560 356Z M350 326 560 408 770 326" />
        </g>

        <g
          class="pyramid-layer layer-practice"
          :class="{ active: activeGoalId === 'practice', muted: activeGoalId && activeGoalId !== 'practice' }"
          tabindex="0"
          role="button"
          aria-label="工程与实践"
          @click="emit('select-goal', 'practice')"
          @mouseenter="emit('hover-goal', 'practice')"
          @mouseleave="emit('hover-goal', '')"
          @keydown="handleKey($event, () => emit('select-goal', 'practice'))"
        >
          <polygon class="face top cyan" points="438 208 560 152 682 208 560 260" />
          <polygon class="face left cyan" points="438 208 560 260 560 324 382 256" />
          <polygon class="face right cyan" points="682 208 560 260 560 324 738 256" />
          <polygon class="face front cyan" points="382 256 560 324 738 256 560 314" />
          <path class="edge" d="M438 208 560 152 682 208 560 260Z M382 256 560 324 738 256" />
        </g>

        <g
          class="pyramid-layer layer-career"
          :class="{ active: activeGoalId === 'career', muted: activeGoalId && activeGoalId !== 'career' }"
          tabindex="0"
          role="button"
          aria-label="课程教学目标"
          @click="emit('select-goal', 'career')"
          @mouseenter="emit('hover-goal', 'career')"
          @mouseleave="emit('hover-goal', '')"
          @keydown="handleKey($event, () => emit('select-goal', 'career'))"
        >
          <polygon class="face top gold" points="560 100 640 166 480 166" />
          <polygon class="face left gold" points="560 100 480 166 560 210" />
          <polygon class="face right gold" points="560 100 640 166 560 210" />
          <polygon class="face front gold" points="480 166 560 210 640 166 560 198" />
          <path class="edge gold-edge" d="M560 100 480 166 560 210 640 166Z M560 100 640 166" />
          <g class="cap" aria-hidden="true">
            <path d="M514 164 560 144 606 164 560 184Z" />
            <path d="M532 172v26c16 12 40 12 56 0v-26" />
            <path d="M606 164v26" />
            <circle cx="606" cy="194" r="4" />
          </g>
        </g>

        <g class="inside-tech" aria-hidden="true">
          <path d="M508 214h100v50h-100zM524 248h62M524 232l20 8 20-18 26 25" />
          <path d="M474 316h116v58h-116zM492 354h70M492 334h14v14h-14zM518 326h16v22h-16zM546 338h16v10h-16z" />
          <path d="M610 334h92v52h-92zM628 368h52M628 350h16v10h-16zM654 342h16v18h-16z" />
          <path d="M640 412h116v46h-116zM660 438h72M660 424h18v10h-18zM690 420h18v14h-18z" />
          <circle cx="442" cy="390" r="24" />
          <path d="M418 390h48M442 366v48M426 378c10 7 22 7 32 0M426 402c10-7 22-7 32 0" />
        </g>

        <g
          v-for="layer in goalLayers"
          :key="layer.id"
          class="callout"
          :class="[`callout-${layer.id}`, { active: layer.active, muted: layer.muted }]"
          tabindex="0"
          role="button"
          :aria-label="layer.title"
          @click="emit('select-goal', layer.id)"
          @mouseenter="emit('hover-goal', layer.id)"
          @mouseleave="emit('hover-goal', '')"
          @keydown="handleKey($event, () => emit('select-goal', layer.id))"
        >
          <path class="connector" :d="layer.line" />
          <circle class="dot" :cx="layer.label.side === 'left' ? layer.label.x + layer.label.w : layer.label.x" :cy="layer.label.y + layer.label.h / 2" r="3" />
          <rect :x="layer.label.x" :y="layer.label.y" :width="layer.label.w" :height="layer.label.h" rx="8" :style="{ '--goal-color': layer.color }" />
          <text :x="layer.label.x + 16" :y="layer.label.y + 24" class="callout-title">{{ layer.title }}</text>
          <text :x="layer.label.x + 16" :y="layer.label.y + 43" class="callout-caption">{{ layer.caption }}</text>
        </g>

        <g class="knowledge-card callout" tabindex="0" role="button" aria-label="学科知识层">
          <path class="connector" d="M246 376H360" />
          <circle class="dot" cx="246" cy="376" r="3" />
          <rect x="118" y="348" width="128" height="56" rx="8" />
          <text x="134" y="372" class="callout-title">学科知识层</text>
          <text x="134" y="390" class="callout-caption">学科知识与知识服务</text>
        </g>

        <g class="boss-card" aria-hidden="true">
          <rect x="646" y="128" width="132" height="78" rx="7" />
          <text x="660" y="150" class="boss-title">题库资源</text>
          <text x="660" y="170">作业考试</text>
          <text x="660" y="188">在线练习</text>
          <text x="660" y="204">智能推荐</text>
        </g>

        <g class="app-label" aria-hidden="true">
          <path class="connector" d="M812 320H910" />
          <circle class="dot" cx="812" cy="320" r="3" />
          <rect x="910" y="296" width="122" height="48" rx="8" />
          <text x="928" y="328">教学应用层</text>
        </g>

        <g class="bot" aria-hidden="true">
          <circle cx="970" cy="246" r="30" />
          <rect x="946" y="206" width="48" height="36" rx="14" />
          <circle cx="963" cy="224" r="4" />
          <circle cx="980" cy="224" r="4" />
          <path d="M970 206v-16M958 276h26M948 306h44" />
        </g>

        <path class="sparkle" d="M1036 408l12 24 24 12-24 12-12 24-12-24-24-12 24-12z" aria-hidden="true" />

        <g class="stage-summary" aria-live="polite">
          <rect x="28" y="516" width="1064" height="32" rx="8" />
          <text x="44" y="537" class="summary-tag">{{ activeGoal?.shortName || '目标' }}</text>
          <text x="94" y="537" class="summary-name">{{ activeGoal?.name }}</text>
          <text x="202" y="537" class="summary-copy">{{ activeGoal?.summary }}</text>
        </g>
      </svg>
    </div>
  </section>
</template>

<style scoped>
.goal-system-panel {
  min-width: 0;
}

.goal-system-stage {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 8px;
  background: #020714;
  box-shadow: inset 0 0 80px rgba(34, 211, 238, 0.08);
}

.system-svg {
  display: block;
  width: 100%;
  aspect-ratio: 2 / 1;
  min-height: clamp(500px, 48vw, 760px);
}

.star-field circle {
  fill: rgba(226, 242, 255, 0.72);
}

.floor-grid path,
.analysis-lines path,
.obe-orb path {
  fill: none;
  stroke: rgba(125, 211, 252, 0.24);
  stroke-width: 1;
}

.floor-grid path {
  stroke-dasharray: 5 10;
}

.top-copy path {
  fill: rgba(8, 38, 64, 0.78);
  stroke: rgba(103, 232, 249, 0.34);
}

.top-copy text,
.coverage text,
.obe-orb text,
.boss-card text,
.app-label text {
  fill: #e9fbff;
  pointer-events: none;
  font-weight: 800;
}

.top-copy .title {
  fill: #fff;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: 0;
}

.top-copy .title tspan,
.coverage .num,
.obe-orb text {
  fill: #67e8f9;
}

.top-copy text:not(.title) {
  font-size: 14px;
  fill: rgba(226, 242, 255, 0.92);
}

.coverage rect,
.boss-card rect {
  fill: rgba(8, 16, 36, 0.72);
  stroke: rgba(103, 232, 249, 0.58);
}

.coverage .num {
  font-size: 29px;
  font-weight: 900;
}

.coverage text:not(.num) {
  font-size: 8px;
}

.obe-orb circle {
  filter: url(#strongGlow);
}

.obe-orb text {
  text-anchor: middle;
  font-size: 13px;
  letter-spacing: 0.04em;
}

.obe-orb .main {
  fill: #fff;
  font-size: 23px;
  font-weight: 900;
}

.decor rect,
.decor circle {
  fill: rgba(96, 165, 250, 0.44);
  stroke: rgba(125, 211, 252, 0.78);
}

.decor path {
  fill: none;
  stroke: rgba(125, 211, 252, 0.62);
}

.server-rack path {
  fill: rgba(71, 85, 105, 0.2);
  stroke: rgba(148, 163, 184, 0.34);
}

.server-rack path:last-child {
  fill: none;
  stroke: rgba(103, 232, 249, 0.38);
}

.data-flows path {
  fill: none;
  stroke: url(#flowLine);
  stroke-linecap: round;
  stroke-width: 5;
  stroke-dasharray: 4 12;
  filter: url(#softGlow);
  animation: dataFlow 4.4s linear infinite;
}

.pyramid-shadow {
  fill: rgba(0, 0, 0, 0.42);
  filter: blur(6px);
}

.base-plane {
  fill: rgba(34, 211, 238, 0.08);
  stroke: rgba(103, 232, 249, 0.5);
  stroke-width: 1.4;
}

.base-plane.inner {
  fill: rgba(14, 165, 233, 0.05);
  stroke: rgba(167, 139, 250, 0.34);
}

.pyramid-layer,
.callout {
  cursor: pointer;
  outline: none;
  transition: opacity 0.22s ease, filter 0.22s ease, transform 0.22s ease;
}

.pyramid-layer:hover,
.pyramid-layer:focus-visible,
.pyramid-layer.active,
.callout:hover,
.callout:focus-visible,
.callout.active {
  filter: url(#strongGlow);
}

.pyramid-layer:hover,
.pyramid-layer:focus-visible,
.pyramid-layer.active {
  transform: translateY(-3px);
}

.pyramid-layer.muted,
.callout.muted {
  opacity: 0.45;
}

.face {
  stroke-width: 1.8;
  paint-order: fill stroke;
}

.face.teal {
  fill: url(#tealGlass);
  stroke: rgba(103, 232, 249, 0.92);
}

.face.purple {
  fill: url(#purpleGlass);
  stroke: rgba(196, 181, 253, 0.86);
}

.face.cyan {
  fill: url(#cyanGlass);
  stroke: rgba(125, 211, 252, 0.94);
}

.face.gold {
  fill: url(#goldTop);
  stroke: rgba(251, 191, 36, 0.92);
}

.edge {
  fill: none;
  stroke: rgba(226, 242, 255, 0.42);
  stroke-width: 1.3;
}

.gold-edge {
  stroke: rgba(251, 191, 36, 0.8);
}

.cap path {
  fill: rgba(245, 158, 66, 0.35);
  stroke: rgba(255, 224, 178, 0.82);
  stroke-width: 1.4;
}

.cap circle {
  fill: #fbbf24;
  filter: url(#softGlow);
}

.inside-tech path,
.inside-tech circle {
  fill: rgba(8, 16, 36, 0.12);
  stroke: rgba(186, 230, 253, 0.72);
  stroke-width: 1.7;
}

.connector {
  fill: none;
  stroke: rgba(226, 242, 255, 0.62);
  stroke-width: 1.4;
}

.dot {
  fill: rgba(226, 242, 255, 0.9);
  filter: url(#softGlow);
}

.callout rect {
  fill: color-mix(in srgb, var(--goal-color, #22d3ee) 26%, rgba(15, 23, 42, 0.9));
  stroke: color-mix(in srgb, var(--goal-color, #22d3ee) 76%, #ffffff 8%);
  stroke-width: 1.3;
}

.callout-title,
.callout-caption {
  pointer-events: none;
  paint-order: stroke;
  stroke: rgba(2, 8, 23, 0.82);
  stroke-linejoin: round;
}

.callout-title {
  fill: #fff;
  font-size: 16px;
  font-weight: 900;
  stroke-width: 3px;
}

.callout-caption {
  fill: rgba(226, 242, 255, 0.82);
  font-size: 10.5px;
  font-weight: 700;
  stroke-width: 2px;
}

.knowledge-card rect {
  fill: rgba(20, 83, 79, 0.72);
  stroke: rgba(94, 234, 212, 0.78);
}

.boss-card rect {
  stroke: rgba(251, 146, 60, 0.66);
}

.boss-card .boss-title {
  fill: #34d399;
  font-size: 12px;
  font-weight: 900;
}

.boss-card text:not(.boss-title) {
  font-size: 9px;
}

.app-label rect {
  fill: rgba(69, 54, 122, 0.78);
  stroke: rgba(196, 181, 253, 0.76);
}

.app-label text {
  fill: #fff;
  font-size: 18px;
  font-weight: 900;
  paint-order: stroke;
  stroke: rgba(2, 8, 23, 0.78);
  stroke-width: 3px;
}

.bot circle,
.bot rect {
  fill: rgba(103, 232, 249, 0.16);
  stroke: rgba(125, 211, 252, 0.74);
  filter: url(#softGlow);
}

.bot path {
  fill: none;
  stroke: rgba(226, 242, 255, 0.74);
  stroke-width: 2;
}

.sparkle {
  fill: rgba(226, 242, 255, 0.68);
  opacity: 0.72;
}

.stage-summary rect {
  fill: rgba(3, 7, 18, 0.52);
  stroke: rgba(125, 211, 252, 0.16);
}

.stage-summary text {
  dominant-baseline: middle;
  pointer-events: none;
  font-weight: 800;
}

.summary-tag {
  fill: #67e8f9;
  font-size: 11px;
}

.summary-name {
  fill: #fff;
  font-size: 13px;
}

.summary-copy {
  fill: rgba(226, 242, 255, 0.76);
  font-size: 12px;
}

@keyframes dataFlow {
  to {
    stroke-dashoffset: -110;
  }
}

@media (prefers-reduced-motion: reduce) {
  .data-flows path {
    animation: none;
  }
}

@media (max-width: 1180px) {
  .goal-system-stage {
    overflow-x: auto;
  }

  .system-svg {
    min-width: 980px;
  }
}

@media (max-width: 860px) {
  .system-svg {
    min-width: 900px;
    min-height: 450px;
  }
}
</style>
