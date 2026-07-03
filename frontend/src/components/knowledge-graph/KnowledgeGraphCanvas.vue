<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  center: {
    type: Object,
    required: true,
  },
  groups: {
    type: Array,
    required: true,
  },
  points: {
    type: Array,
    required: true,
  },
  selectedId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select'])

const svgRef = ref(null)
const viewportRef = ref(null)
const centerCollapsed = ref(false)
const collapsedGroups = ref(new Set())
const hoverId = ref('')
const activeGroupId = ref('')
const transform = reactive({ x: 0, y: 0, scale: 1 })

let mediaContext
let pointerState = null
let dragFrame = 0
let pendingDrag = null
let reduceMotion = false

const viewBox = {
  width: 1600,
  height: 1000,
  cx: 800,
  cy: 500,
  groupRadius: 245,
  pointRadius: 410,
}

const bulkAnimationLimit = 70

const pointsByGroup = computed(() => {
  const map = new Map()
  props.groups.forEach((group) => map.set(group.id, []))
  props.points.forEach((point) => {
    if (!map.has(point.groupId)) map.set(point.groupId, [])
    map.get(point.groupId).push(point)
  })
  return map
})

const groupNodes = computed(() =>
  props.groups.map((group, index) => {
    const angle = -90 + (360 / props.groups.length) * index
    const rad = (Math.PI / 180) * angle
    return {
      ...group,
      angle,
      x: viewBox.cx + Math.cos(rad) * viewBox.groupRadius,
      y: viewBox.cy + Math.sin(rad) * viewBox.groupRadius,
      collapsed: collapsedGroups.value.has(group.id),
      hidden: centerCollapsed.value,
    }
  }),
)

const pointNodes = computed(() => {
  const nodes = []
  groupNodes.value.forEach((groupNode, groupIndex) => {
    const groupPoints = pointsByGroup.value.get(groupNode.id) || []
    const sector = 360 / props.groups.length
    const startAngle = -90 + sector * groupIndex - sector * 0.38
    const step = groupPoints.length > 1 ? (sector * 0.76) / (groupPoints.length - 1) : 0

    groupPoints.forEach((point, pointIndex) => {
      const angle = startAngle + step * pointIndex
      const rad = (Math.PI / 180) * angle
      const laneOffset = (pointIndex % 3) * 18
      const radius = viewBox.pointRadius + laneOffset
      nodes.push({
        ...point,
        angle,
        groupX: groupNode.x,
        groupY: groupNode.y,
        x: viewBox.cx + Math.cos(rad) * radius,
        y: viewBox.cy + Math.sin(rad) * radius,
        hidden: centerCollapsed.value || collapsedGroups.value.has(point.groupId),
      })
    })
  })
  return nodes
})

const visibleGroupNodes = computed(() => groupNodes.value.filter((node) => !node.hidden))
const visiblePointNodes = computed(() => pointNodes.value.filter((node) => !node.hidden))

const selectedPoint = computed(() => pointNodes.value.find((node) => node.id === props.selectedId) || null)
const selectedGroup = computed(() => groupNodes.value.find((node) => node.id === props.selectedId || node.id === selectedPoint.value?.groupId) || null)

const relatedIds = computed(() => {
  const ids = new Set()
  if (hoverId.value) {
    const hoveredPoint = pointNodes.value.find((node) => node.id === hoverId.value)
    const hoveredGroup = groupNodes.value.find((node) => node.id === hoverId.value)
    ids.add('center')
    ids.add(hoverId.value)
    if (hoveredPoint) ids.add(hoveredPoint.groupId)
    if (hoveredGroup) {
      ids.add(hoveredGroup.id)
      ;(pointsByGroup.value.get(hoveredGroup.id) || []).forEach((point) => ids.add(point.id))
    }
  }
  if (props.selectedId) {
    const point = pointNodes.value.find((node) => node.id === props.selectedId)
    const group = groupNodes.value.find((node) => node.id === props.selectedId)
    if (point) {
      ids.add('center')
      ids.add(point.id)
      ids.add(point.groupId)
    } else if (group) {
      ids.add('center')
      ids.add(group.id)
    }
  }
  if (activeGroupId.value) {
    ids.add('center')
    ids.add(activeGroupId.value)
  }
  return ids
})

const hasFocusState = computed(() => relatedIds.value.size > 0)

function getGroupNode(groupId) {
  return groupNodes.value.find((node) => node.id === groupId)
}

function isRelated(id) {
  return !hasFocusState.value || relatedIds.value.has(id)
}

function lineClass(sourceId, targetId) {
  return {
    highlighted: relatedIds.value.has(sourceId) && relatedIds.value.has(targetId),
    muted: hasFocusState.value && !(relatedIds.value.has(sourceId) && relatedIds.value.has(targetId)),
  }
}

function nodeClass(node) {
  return {
    selected: node.id === props.selectedId,
    active: node.id === activeGroupId.value,
    related: isRelated(node.id),
    muted: hasFocusState.value && !isRelated(node.id),
    collapsed: node.collapsed,
  }
}

function pointClass(node) {
  return {
    selected: node.id === props.selectedId,
    related: isRelated(node.id),
    muted: hasFocusState.value && !isRelated(node.id),
  }
}

function handleCenterClick() {
  activeGroupId.value = ''
  emit('select', props.center)
  animateCenterToggle(!centerCollapsed.value)
}

function handleGroupClick(group) {
  activeGroupId.value = group.id
  emit('select', group)
  animateGroupToggle(group.id, !collapsedGroups.value.has(group.id))
}

function handlePointClick(point) {
  activeGroupId.value = point.groupId
  emit('select', point)
}

function onWheel(event) {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.08 : 0.08
  setZoom(transform.scale + delta)
}

function setZoom(value) {
  transform.scale = Math.min(1.9, Math.max(0.58, Number(value.toFixed(2))))
}

function zoomIn() {
  setZoom(transform.scale + 0.15)
}

function zoomOut() {
  setZoom(transform.scale - 0.15)
}

function resetView() {
  transform.x = 0
  transform.y = 0
  transform.scale = 1
}

function fitView() {
  transform.x = 0
  transform.y = 0
  transform.scale = 0.82
}

function onPointerDown(event) {
  if (event.target.closest?.('.center-node, .group-node, .point-node, button, a')) return
  pointerState = {
    id: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: transform.x,
    originY: transform.y,
  }
  event.currentTarget.setPointerCapture(event.pointerId)
}

function onPointerMove(event) {
  if (!pointerState || pointerState.id !== event.pointerId) return
  pendingDrag = {
    x: pointerState.originX + event.clientX - pointerState.startX,
    y: pointerState.originY + event.clientY - pointerState.startY,
  }
  if (dragFrame) return
  dragFrame = window.requestAnimationFrame(() => {
    dragFrame = 0
    if (!pendingDrag) return
    transform.x = pendingDrag.x
    transform.y = pendingDrag.y
    pendingDrag = null
  })
}

function onPointerUp(event) {
  if (!pointerState || pointerState.id !== event.pointerId) return
  if (dragFrame) {
    window.cancelAnimationFrame(dragFrame)
    dragFrame = 0
  }
  if (pendingDrag) {
    transform.x = pendingDrag.x
    transform.y = pendingDrag.y
    pendingDrag = null
  }
  pointerState = null
}

function animateIntro() {
  if (reduceMotion || !svgRef.value) return
  const root = svgRef.value
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
  tl.from(root.querySelectorAll('.kg-ambient'), { autoAlpha: 0, duration: 0.6 })
    .from(root.querySelector('.center-node'), { autoAlpha: 0, scale: 0.72, transformOrigin: 'center', duration: 0.45 }, '-=0.2')
    .from(root.querySelectorAll('.group-link, .group-node'), { autoAlpha: 0, scale: 0.82, transformOrigin: 'center', stagger: 0.025, duration: 0.42 }, '-=0.18')
    .from(root.querySelectorAll('.point-link, .point-node'), { autoAlpha: 0, scale: 0.64, transformOrigin: 'center', stagger: { amount: 0.55, from: 'center' }, duration: 0.48 }, '-=0.2')
}

function animateCenterToggle(collapsing) {
  const setCollapsed = () => {
    centerCollapsed.value = collapsing
  }
  const pulseCenter = () => {
    const center = svgRef.value?.querySelector('.center-core')
    if (!center || reduceMotion) return
    gsap.fromTo(
      center,
      { scale: 0.96, transformOrigin: `${viewBox.cx}px ${viewBox.cy}px` },
      { scale: 1, duration: 0.22, ease: 'power2.out', overwrite: 'auto' },
    )
  }
  if (reduceMotion) {
    setCollapsed()
    return
  }

  if (collapsing) {
    const targets = svgRef.value?.querySelectorAll('.group-node, .point-node, .group-link, .point-link')
    if (!targets?.length) {
      setCollapsed()
      return
    }
    if (targets.length > bulkAnimationLimit) {
      gsap.killTweensOf(targets)
      setCollapsed()
      nextTick(pulseCenter)
      return
    }
    gsap.to(targets, {
      scale: 0.12,
      autoAlpha: 0,
      transformOrigin: `${viewBox.cx}px ${viewBox.cy}px`,
      duration: 0.34,
      stagger: { amount: 0.08, from: 'center' },
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: setCollapsed,
    })
    return
  }

  setCollapsed()
  nextTick(() => {
    const targets = svgRef.value?.querySelectorAll('.group-node, .point-node, .group-link, .point-link')
    if (!targets?.length) return
    if (targets.length > bulkAnimationLimit) {
      pulseCenter()
      return
    }
    gsap.fromTo(
      targets,
      { scale: 0.12, autoAlpha: 0, transformOrigin: `${viewBox.cx}px ${viewBox.cy}px` },
      { scale: 1, autoAlpha: 1, duration: 0.38, stagger: { amount: 0.16, from: 'center' }, ease: 'power2.out', overwrite: 'auto' },
    )
  })
}

function animateGroupToggle(groupId, collapsing) {
  const setCollapsed = () => {
    const next = new Set(collapsedGroups.value)
    if (collapsing) next.add(groupId)
    else next.delete(groupId)
    collapsedGroups.value = next
  }
  const group = groupNodes.value.find((node) => node.id === groupId)
  const origin = group ? `${group.x}px ${group.y}px` : `${viewBox.cx}px ${viewBox.cy}px`

  if (reduceMotion) {
    setCollapsed()
    return
  }

  if (collapsing) {
    const targets = svgRef.value?.querySelectorAll(`[data-group-id="${groupId}"].point-node, [data-group-id="${groupId}"].point-link`)
    if (!targets?.length) {
      setCollapsed()
      return
    }
    gsap.to(targets, {
      scale: 0.18,
      autoAlpha: 0,
      transformOrigin: origin,
      duration: 0.3,
      stagger: { amount: 0.08, from: 'center' },
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: setCollapsed,
    })
    return
  }

  setCollapsed()
  nextTick(() => {
    const targets = svgRef.value?.querySelectorAll(`[data-group-id="${groupId}"].point-node, [data-group-id="${groupId}"].point-link`)
    if (!targets?.length) return
    gsap.fromTo(
      targets,
      { scale: 0.18, autoAlpha: 0, transformOrigin: origin },
      { scale: 1, autoAlpha: 1, duration: 0.32, stagger: { amount: 0.1, from: 'center' }, ease: 'power2.out', overwrite: 'auto' },
    )
  })
}

watch(
  () => props.selectedId,
  (id) => {
    const point = pointNodes.value.find((node) => node.id === id)
    const group = groupNodes.value.find((node) => node.id === id)
    if (point) activeGroupId.value = point.groupId
    if (group) activeGroupId.value = group.id
  },
)

onMounted(() => {
  mediaContext = gsap.matchMedia()
  mediaContext.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
    reduceMotion = Boolean(conditions.reduceMotion)
    if (!reduceMotion) animateIntro()
  })
})

onUnmounted(() => {
  if (dragFrame) window.cancelAnimationFrame(dragFrame)
  mediaContext?.revert()
})

defineExpose({
  zoomIn,
  zoomOut,
  fitView,
  resetView,
})
</script>

<template>
  <div
    class="kg-canvas"
    @wheel="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <svg ref="svgRef" viewBox="0 0 1600 1000" role="img" aria-label="C语言智能学习系统知识图谱">
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f0abfc" />
          <stop offset="55%" stop-color="#7c3aed" />
          <stop offset="100%" stop-color="#312e81" />
        </radialGradient>
        <radialGradient id="groupGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#bae6fd" />
          <stop offset="60%" stop-color="#2563eb" />
          <stop offset="100%" stop-color="#0f172a" />
        </radialGradient>
        <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#cffafe" />
          <stop offset="70%" stop-color="#0891b2" />
          <stop offset="100%" stop-color="#083344" />
        </radialGradient>
        <radialGradient id="selectedGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fed7aa" />
          <stop offset="70%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#7c2d12" />
        </radialGradient>
        <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g class="kg-ambient">
        <circle cx="800" cy="500" r="460" class="orbit orbit-outer" />
        <circle cx="800" cy="500" r="300" class="orbit" />
        <circle cx="800" cy="500" r="170" class="orbit orbit-inner" />
        <path d="M180 500H1420M800 80V920M280 210L1320 790M1320 210L280 790" class="grid-lines" />
      </g>

      <g
        ref="viewportRef"
        class="kg-viewport"
        :style="{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '800px 500px' }"
      >
        <g class="links">
          <line
            v-for="group in visibleGroupNodes"
            :key="`center-${group.id}`"
            class="graph-link group-link"
            :class="lineClass('center', group.id)"
            :x1="viewBox.cx"
            :y1="viewBox.cy"
            :x2="group.x"
            :y2="group.y"
          />
          <line
            v-for="point in visiblePointNodes"
            :key="`point-${point.id}`"
            class="graph-link point-link"
            :class="lineClass(point.groupId, point.id)"
            :data-group-id="point.groupId"
            :x1="point.groupX"
            :y1="point.groupY"
            :x2="point.x"
            :y2="point.y"
          />
        </g>

        <g
          class="center-node"
          :class="{ selected: selectedId === center.id, collapsed: centerCollapsed }"
          tabindex="0"
          role="button"
          @click.stop="handleCenterClick"
          @keydown.enter.prevent="handleCenterClick"
          @mouseenter="hoverId = 'center'"
          @mouseleave="hoverId = ''"
        >
          <circle :cx="viewBox.cx" :cy="viewBox.cy" r="78" class="center-halo" />
          <circle :cx="viewBox.cx" :cy="viewBox.cy" r="56" class="center-core" />
          <text :x="viewBox.cx" :y="viewBox.cy - 6" class="center-title">C语言</text>
          <text :x="viewBox.cx" :y="viewBox.cy + 18" class="center-subtitle">智能学习系统</text>
        </g>

        <g
          v-for="group in visibleGroupNodes"
          :key="group.id"
          class="group-node"
          :class="nodeClass(group)"
          tabindex="0"
          role="button"
          :aria-label="group.name"
          @click.stop="handleGroupClick(group)"
          @keydown.enter.prevent="handleGroupClick(group)"
          @mouseenter="hoverId = group.id"
          @mouseleave="hoverId = ''"
        >
          <circle :cx="group.x" :cy="group.y" r="38" class="group-halo" />
          <circle :cx="group.x" :cy="group.y" r="28" class="group-core" />
          <text :x="group.x" :y="group.y + 55" class="group-label">{{ group.name }}</text>
        </g>

        <g
          v-for="point in visiblePointNodes"
          :key="point.id"
          class="point-node"
          :class="pointClass(point)"
          :data-group-id="point.groupId"
          tabindex="0"
          role="button"
          :aria-label="point.name"
          @click.stop="handlePointClick(point)"
          @keydown.enter.prevent="handlePointClick(point)"
          @mouseenter="hoverId = point.id"
          @mouseleave="hoverId = ''"
        >
          <circle :cx="point.x" :cy="point.y" r="16" class="point-halo" />
          <circle :cx="point.x" :cy="point.y" r="8" class="point-core" />
          <text :x="point.x" :y="point.y - 18" class="point-label">
            {{ point.name }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped src="@/styles/knowledge-graph-canvas.css"></style>


