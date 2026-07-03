<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Close, Link, VideoCamera, Picture, Tools, Document, View, ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { gsap } from 'gsap'

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  visible: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['close'])

const cardRef = ref(null)
const resourceRef = ref(null)
const activeIndex = ref(0)
let carouselTimer
let mediaContext
let reduceMotion = false

const iconMap = {
  web: Link,
  video: VideoCamera,
  image: Picture,
  tool: Tools,
  paper: Document,
  vr: View,
}

const resources = computed(() => props.item?.resources || [])
const activeResource = computed(() => resources.value[activeIndex.value] || resources.value[0] || null)
const coreItems = computed(() => {
  if (Array.isArray(props.item?.coreContent)) return props.item.coreContent
  return props.item?.coreContent ? [props.item.coreContent] : []
})

function clampIndex(index) {
  const length = resources.value.length
  if (!length) return 0
  return (index + length) % length
}

function selectResource(index) {
  activeIndex.value = clampIndex(index)
}

function nextResource() {
  selectResource(activeIndex.value + 1)
}

function prevResource() {
  selectResource(activeIndex.value - 1)
}

function startCarousel() {
  stopCarousel()
  if (reduceMotion || !props.visible || resources.value.length <= 1) return
  carouselTimer = window.setInterval(() => {
    if (resources.value.length <= 1) return
    nextResource()
  }, 9000)
}

function stopCarousel() {
  if (carouselTimer) {
    window.clearInterval(carouselTimer)
    carouselTimer = undefined
  }
}

watch(
  () => props.item?.id,
  async () => {
    activeIndex.value = 0
    await nextTick()
    if (!reduceMotion && cardRef.value) {
      gsap.fromTo(cardRef.value, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out' })
    }
    startCarousel()
  },
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) startCarousel()
    else stopCarousel()
  },
)

watch(activeIndex, async () => {
  await nextTick()
  if (!reduceMotion && resourceRef.value) {
    gsap.fromTo(resourceRef.value, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' })
  }
})

onMounted(() => {
  mediaContext = gsap.matchMedia()
  mediaContext.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
    reduceMotion = Boolean(conditions.reduceMotion)
    if (reduceMotion) stopCarousel()
  })
  startCarousel()
})

onUnmounted(() => {
  stopCarousel()
  mediaContext?.revert()
})
</script>

<template>
  <aside
    v-if="visible && item"
    ref="cardRef"
    class="kg-detail-card"
    aria-label="知识点详情"
    @mouseenter="stopCarousel"
    @mouseleave="startCarousel"
    @focusin="stopCarousel"
    @focusout="startCarousel"
  >
    <header class="detail-header">
      <div>
        <p>{{ item.type === 'center' ? '课程中心' : item.type === 'group' ? '所属知识群' : item.groupName }}</p>
        <h2>{{ item.name }}</h2>
      </div>
      <button type="button" aria-label="关闭详情" @click="emit('close')">
        <el-icon><Close /></el-icon>
      </button>
    </header>

    <div class="detail-meta">
      <span>{{ item.groupName || '课程总览' }}</span>
      <span>{{ item.code }}</span>
      <em>{{ item.difficulty }}</em>
      <em>{{ item.importance }}</em>
    </div>

    <section class="detail-section">
      <h3>描述</h3>
      <p>{{ item.description }}</p>
    </section>

    <section class="detail-section">
      <h3>核心内容</h3>
      <ul>
        <li v-for="content in coreItems" :key="content">{{ content }}</li>
      </ul>
    </section>

    <section class="detail-section resource-section">
      <div class="section-title-row">
        <h3>学习资源</h3>
        <div class="resource-actions">
          <button type="button" aria-label="上一个资源" @click="prevResource">
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <button type="button" aria-label="下一个资源" @click="nextResource">
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </div>

      <a
        v-if="activeResource"
        ref="resourceRef"
        class="resource-card"
        :href="activeResource.url"
        target="_blank"
        rel="noreferrer"
      >
        <span class="resource-icon">
          <el-icon><component :is="iconMap[activeResource.type]" /></el-icon>
        </span>
        <span>
          <small>{{ activeResource.label }}</small>
          <strong>{{ activeResource.title }}</strong>
          <em>{{ activeResource.summary }}</em>
        </span>
      </a>

      <div class="resource-dots">
        <button
          v-for="(resource, index) in resources"
          :key="resource.id"
          type="button"
          :class="{ active: index === activeIndex }"
          :aria-label="`切换到${resource.label}`"
          @click="selectResource(index)"
        ></button>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.kg-detail-card {
  width: 360px;
  max-height: calc(100dvh - 128px);
  border: 1px solid rgba(125, 211, 252, 0.2);
  border-radius: 8px;
  padding: 18px;
  color: #e6f7ff;
  background: linear-gradient(180deg, rgba(9, 20, 48, 0.82), rgba(8, 16, 36, 0.66));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  overflow-y: auto;
}

.detail-header,
.section-title-row,
.resource-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.detail-header p {
  margin: 0 0 6px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 800;
}

.detail-header h2 {
  margin: 0;
  color: #fff;
  font-size: 22px;
  line-height: 1.25;
}

.detail-header > button,
.resource-actions button {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  color: #c8f7ff;
  background: rgba(15, 23, 42, 0.58);
  cursor: pointer;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 18px 0;
}

.detail-meta span,
.detail-meta em {
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 999px;
  padding: 7px 10px;
  color: rgba(226, 242, 255, 0.82);
  background: rgba(14, 116, 144, 0.14);
  font-size: 12px;
  font-style: normal;
}

.detail-meta em {
  border-color: rgba(251, 146, 60, 0.28);
  color: #fed7aa;
  background: rgba(154, 52, 18, 0.16);
}

.detail-section {
  margin-top: 16px;
}

.detail-section h3 {
  margin: 0 0 9px;
  color: #fff;
  font-size: 15px;
}

.detail-section p,
.detail-section li {
  color: rgba(226, 242, 255, 0.74);
  font-size: 13px;
  line-height: 1.7;
}

.detail-section p,
.detail-section ul {
  margin: 0;
}

.detail-section ul {
  padding-left: 18px;
}

.resource-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 12px;
  margin-top: 10px;
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 8px;
  padding: 14px;
  color: inherit;
  text-decoration: none;
  background: rgba(15, 23, 42, 0.56);
}

.resource-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 8px;
  color: #0f172a;
  background: linear-gradient(135deg, #67e8f9, #818cf8);
}

.resource-card small,
.resource-card strong,
.resource-card em {
  display: block;
}

.resource-card small {
  color: #67e8f9;
  font-size: 12px;
}

.resource-card strong {
  margin-top: 3px;
  color: #fff;
  font-size: 15px;
}

.resource-card em {
  margin-top: 8px;
  color: rgba(226, 242, 255, 0.68);
  font-size: 12px;
  font-style: normal;
  line-height: 1.6;
}

.resource-dots {
  display: flex;
  gap: 7px;
  margin-top: 12px;
}

.resource-dots button {
  width: 20px;
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.32);
  cursor: pointer;
}

.resource-dots button.active {
  background: #22d3ee;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.8);
}

@media (max-width: 1180px) {
  .kg-detail-card {
    width: 320px;
  }
}

@media (max-width: 860px) {
  .kg-detail-card {
    width: 100%;
    max-height: none;
  }
}
</style>
