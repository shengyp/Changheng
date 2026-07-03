<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, User } from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import AuthDialog from '@/components/landing/AuthDialog.vue'
import KnowledgeGraphCanvas from '@/components/knowledge-graph/KnowledgeGraphCanvas.vue'
import KnowledgeStatsPanel from '@/components/knowledge-graph/KnowledgeStatsPanel.vue'
import KnowledgeGraphControls from '@/components/knowledge-graph/KnowledgeGraphControls.vue'
import KnowledgeDetailCarousel from '@/components/knowledge-graph/KnowledgeDetailCarousel.vue'
import { cLanguageKnowledgeGraph } from '@/data/cLanguageKnowledgeGraph'
import '@/styles/landing.css'

const router = useRouter()
const canvasRef = ref(null)
const pageRef = ref(null)
const selectedItem = ref(cLanguageKnowledgeGraph.center)
const detailVisible = ref(true)
const authDialogVisible = ref(false)
const authDialogMode = ref('login')
const stars = Array.from({ length: 64 }, (_, index) => ({
  id: index + 1,
  left: `${((index + 1) * 37) % 100}%`,
  top: `${((index + 1) * 61) % 100}%`,
  size: `${1 + ((index + 1) % 3)}px`,
  opacity: 0.28 + (((index + 1) % 6) * 0.1),
}))

const selectedId = computed(() => selectedItem.value?.id || '')

function selectItem(item) {
  selectedItem.value = item
  detailVisible.value = true
}

function backHome() {
  sessionStorage.setItem('skipLandingIntro', '1')
  router.push({ name: 'login' })
}

function openCompetencyLayer() {
  sessionStorage.setItem('skipLandingIntro', '1')
  sessionStorage.setItem('openCompetencyLayer', '1')
  router.push({ name: 'login' })
}

function openCourseGoals() {
  router.push({ name: 'course-goals' })
}

function openTeachingApplication() {
  router.push({ name: 'teaching-application' })
}

function handleLogin(mode = 'login') {
  authDialogMode.value = typeof mode === 'string' && mode ? mode : 'login'
  authDialogVisible.value = true
}

onMounted(() => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion || !pageRef.value) return
  gsap.fromTo(
    pageRef.value.querySelectorAll('.kg-star, .knowledge-map-nav, .floating-panel, .kg-controls-wrap'),
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.04, ease: 'power2.out' },
  )
})
</script>

<template>
  <main ref="pageRef" class="knowledge-map-page">
    <div class="kg-space-bg" aria-hidden="true">
      <span
        v-for="star in stars"
        :key="star.id"
        class="kg-star"
        :style="{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity }"
      ></span>
    </div>

    <header class="landing-nav landing-nav--subpage knowledge-map-nav">
      <button type="button" class="landing-brand" @click="backHome">
        <span class="landing-brand-mark">C</span>
        <span class="landing-brand-copy">
          <strong>C语言智能学习系统</strong>
        </span>
      </button>

      <nav class="landing-nav-items" aria-label="知识图谱层导航">
        <button type="button" class="landing-nav-item" @click="backHome">
          <span>首页</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openCourseGoals">
          <span>课程目标层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openCompetencyLayer">
          <span>能力素养层</span>
        </button>
        <button type="button" class="landing-nav-item active">
          <span>学科知识层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openTeachingApplication">
          <span>教学应用层</span>
        </button>
      </nav>

      <div class="landing-nav-actions">
        <button type="button" class="landing-back-pill" @click="backHome">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回首页</span>
        </button>
        <button type="button" class="landing-login-trigger" aria-label="登录" @click="handleLogin('login')">
          <el-icon><User /></el-icon>
        </button>
      </div>
    </header>

    <header v-if="false" class="kg-topbar">
      <div class="topbar-spacer" aria-hidden="true"></div>
      <div class="topbar-title">
        <p>C Language Knowledge Graph</p>
        <h1>C语言智能学习知识图谱</h1>
      </div>
      <div class="topbar-actions">
        <button type="button" class="topbar-button" aria-label="返回首页" @click="backHome">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回首页</span>
        </button>
        <button type="button" class="avatar-button" aria-label="登录系统" @click="handleLogin('login')">
          <el-icon><User /></el-icon>
        </button>
      </div>
    </header>

    <section class="kg-stage" aria-label="C语言知识图谱">
      <KnowledgeGraphCanvas
        ref="canvasRef"
        :center="cLanguageKnowledgeGraph.center"
        :groups="cLanguageKnowledgeGraph.groups"
        :points="cLanguageKnowledgeGraph.points"
        :selected-id="selectedId"
        @select="selectItem"
      />
    </section>

    <div class="floating-panel stats-wrap">
      <KnowledgeStatsPanel :stats="cLanguageKnowledgeGraph.stats" />
    </div>

    <div class="kg-controls-wrap">
      <KnowledgeGraphControls
        @zoom-in="canvasRef?.zoomIn()"
        @zoom-out="canvasRef?.zoomOut()"
        @fit-view="canvasRef?.fitView()"
        @reset-view="canvasRef?.resetView()"
      />
    </div>

    <div class="floating-panel detail-wrap">
      <KnowledgeDetailCarousel
        :item="selectedItem"
        :visible="detailVisible"
        @close="detailVisible = false"
      />
    </div>

    <AuthDialog v-model:visible="authDialogVisible" v-model:mode="authDialogMode" />
  </main>
</template>

<style scoped>
.knowledge-map-page {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  color: #e5f7ff;
  background:
    radial-gradient(circle at 50% 46%, rgba(59, 130, 246, 0.24), transparent 28%),
    radial-gradient(circle at 78% 20%, rgba(124, 58, 237, 0.16), transparent 24%),
    radial-gradient(circle at 18% 78%, rgba(34, 211, 238, 0.13), transparent 26%),
    linear-gradient(135deg, #020617 0%, #07132b 46%, #030712 100%);
  font-family: Inter, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.knowledge-map-page::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(125, 211, 252, 0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(125, 211, 252, 0.055) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}

.kg-space-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.kg-star {
  position: absolute;
  border-radius: 50%;
  background: rgba(226, 242, 255, 0.86);
  box-shadow: 0 0 10px rgba(125, 211, 252, 0.72);
}

.kg-topbar {
  position: absolute;
  top: 18px;
  left: 24px;
  right: 24px;
  z-index: 5;
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr);
  gap: 16px;
  align-items: center;
  pointer-events: none;
}

.topbar-title {
  justify-self: center;
  text-align: center;
  pointer-events: auto;
}

.topbar-title p {
  margin: 0 0 4px;
  color: #67e8f9;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.topbar-title h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(22px, 2.1vw, 34px);
  letter-spacing: 0;
  text-shadow: 0 0 24px rgba(34, 211, 238, 0.28);
}

.topbar-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  border-radius: 8px;
  padding: 0 14px;
  color: #dff8ff;
  background: rgba(8, 16, 36, 0.68);
  box-shadow: 0 14px 46px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(14px);
  cursor: pointer;
  pointer-events: auto;
}

.topbar-spacer {
  width: 100%;
}

.topbar-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  pointer-events: auto;
}

.avatar-button {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(34, 211, 238, 0.42);
  border-radius: 50%;
  color: #dff8ff;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.22), transparent 30%),
    rgba(14, 116, 144, 0.32);
  box-shadow: 0 0 22px rgba(34, 211, 238, 0.18), 0 14px 46px rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(14px);
  cursor: pointer;
  pointer-events: auto;
}

.topbar-button:hover,
.topbar-button:focus-visible,
.avatar-button:hover,
.avatar-button:focus-visible {
  border-color: rgba(34, 211, 238, 0.78);
  outline: none;
}

.kg-stage {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.floating-panel,
.kg-controls-wrap {
  position: absolute;
  z-index: 4;
}

.stats-wrap {
  top: 112px;
  left: 24px;
}

.kg-controls-wrap {
  left: 24px;
  bottom: 28px;
}

.detail-wrap {
  top: 112px;
  right: 24px;
}

@media (max-width: 1180px) {
  .stats-wrap {
    top: 96px;
  }

  .detail-wrap {
    top: 96px;
  }
}

@media (max-width: 860px) {
  .knowledge-map-page {
    min-height: 100dvh;
    overflow-y: auto;
  }

  .kg-topbar {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    grid-template-columns: 1fr;
    padding: 14px;
  }

  .topbar-title {
    order: -1;
  }

  .topbar-spacer {
    display: none;
  }

  .topbar-actions {
    justify-content: flex-end;
  }

  .kg-stage,
  .floating-panel,
  .kg-controls-wrap {
    position: relative;
    inset: auto;
  }

  .kg-stage {
    height: 62dvh;
    min-height: 520px;
  }

  .stats-wrap,
  .detail-wrap,
  .kg-controls-wrap {
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    margin: 12px 14px;
  }

  .kg-controls-wrap {
    display: flex;
    justify-content: center;
  }
}
</style>
