<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, User } from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import AuthDialog from '@/components/landing/AuthDialog.vue'
import CourseGoalSystemChart from '@/components/course-goals/CourseGoalSystemChart.vue'
import CourseGoalMappingSankey from '@/components/course-goals/CourseGoalMappingSankey.vue'
import CourseGoalTimeline from '@/components/course-goals/CourseGoalTimeline.vue'
import { courseGoalLayer, courseGoalRequirements } from '@/data/courseGoalLayer'
import '@/styles/landing.css'

const router = useRouter()
const pageRef = ref(null)
const activeGoalId = ref(courseGoalLayer.macroGoals[0]?.id || '')
const activeRequirementId = ref(courseGoalLayer.macroGoals[0]?.requirements[0]?.id || '')
const activeJobId = ref('')
const activeTimelineId = ref(courseGoalLayer.timeline[0]?.id || '')
const authDialogVisible = ref(false)
const authDialogMode = ref('login')

let gsapContext
let mediaContext
let goalCarouselTimer
let goalCarouselResumeTimer

const stars = Array.from({ length: 58 }, (_, index) => ({
  id: index + 1,
  left: `${((index + 1) * 41) % 100}%`,
  top: `${((index + 1) * 67) % 100}%`,
  size: `${1 + ((index + 2) % 3)}px`,
  opacity: 0.22 + (((index + 3) % 7) * 0.08),
}))

function backHome() {
  sessionStorage.setItem('skipLandingIntro', '1')
  router.push({ name: 'login' })
}

function openCompetencyLayer() {
  sessionStorage.setItem('skipLandingIntro', '1')
  sessionStorage.setItem('openCompetencyLayer', '1')
  router.push({ name: 'login' })
}

function openKnowledgeMap() {
  router.push({ name: 'knowledge-map' })
}

function openTeachingApplication() {
  router.push({ name: 'teaching-application' })
}

function handleLogin(mode = 'login') {
  authDialogMode.value = typeof mode === 'string' && mode ? mode : 'login'
  authDialogVisible.value = true
}

function selectGoal(goalId) {
  pauseGoalCarousel(7000)
  applyGoal(goalId)
}

function applyGoal(goalId) {
  const goal = courseGoalLayer.macroGoals.find((item) => item.id === goalId)
  if (!goal) return
  activeGoalId.value = goal.id
  activeRequirementId.value = goal.requirements[0]?.id || ''
  activeJobId.value = ''
}

function hoverGoal(goalId) {
  if (!goalId) return
  activeGoalId.value = goalId
}

function selectRequirement(requirementId) {
  pauseGoalCarousel(7000)
  applyRequirement(requirementId)
}

function applyRequirement(requirementId) {
  const requirement = courseGoalRequirements.find((item) => item.id === requirementId)
  if (!requirement) return
  activeGoalId.value = requirement.goalId
  activeRequirementId.value = requirement.id
  activeJobId.value = ''
}

function hoverRequirement(requirementId) {
  if (!requirementId) return
  applyRequirement(requirementId)
}

function selectJob(jobId) {
  pauseGoalCarousel(7000)
  applyJob(jobId)
}

function applyJob(jobId) {
  const job = courseGoalLayer.jobs.find((item) => item.id === jobId)
  if (!job) return
  const primaryRequirement = courseGoalRequirements.find((item) => item.id === job.requirementIds[0])
  activeJobId.value = job.id
  activeGoalId.value = primaryRequirement?.goalId || job.goalIds[0] || activeGoalId.value
  activeRequirementId.value = primaryRequirement?.id || job.requirementIds[0] || activeRequirementId.value
}

function hoverJob(jobId) {
  if (!jobId) return
  applyJob(jobId)
}

function cycleGoal() {
  const goals = courseGoalLayer.macroGoals
  if (!goals.length) return
  const currentIndex = goals.findIndex((goal) => goal.id === activeGoalId.value)
  const nextGoal = goals[(currentIndex + 1 + goals.length) % goals.length]
  applyGoal(nextGoal.id)
}

function startGoalCarousel() {
  window.clearInterval(goalCarouselTimer)
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return
  goalCarouselTimer = window.setInterval(() => {
    cycleGoal()
  }, 3600)
}

function pauseGoalCarousel(resumeDelay = 0) {
  window.clearTimeout(goalCarouselResumeTimer)
  window.clearInterval(goalCarouselTimer)
  if (!resumeDelay) return
  goalCarouselResumeTimer = window.setTimeout(() => {
    startGoalCarousel()
  }, resumeDelay)
}

function resumeGoalCarousel() {
  window.clearTimeout(goalCarouselResumeTimer)
  startGoalCarousel()
}

onMounted(() => {
  if (!pageRef.value) return
  gsapContext = gsap.context(() => {
    mediaContext = gsap.matchMedia()
    mediaContext.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      ({ conditions }) => {
        if (conditions.reduceMotion) return
        gsap.fromTo(
          '.course-goals-star, .course-goals-nav, .course-hero-copy, .course-panel',
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.045, ease: 'power2.out' },
        )
      },
    )
  }, pageRef.value)
  startGoalCarousel()
})

onUnmounted(() => {
  window.clearInterval(goalCarouselTimer)
  window.clearTimeout(goalCarouselResumeTimer)
  mediaContext?.revert()
  gsapContext?.revert()
})
</script>

<template>
  <main ref="pageRef" class="course-goals-page">
    <div class="course-space-bg" aria-hidden="true">
      <span
        v-for="star in stars"
        :key="star.id"
        class="course-goals-star"
        :style="{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity }"
      ></span>
    </div>

    <header class="landing-nav landing-nav--subpage course-goals-nav">
      <button type="button" class="landing-brand" @click="backHome">
        <span class="landing-brand-mark">C</span>
        <span class="landing-brand-copy">
          <strong>C语言智能学习系统</strong>
        </span>
      </button>

      <nav class="landing-nav-items" aria-label="课程目标层导航">
        <button type="button" class="landing-nav-item" @click="backHome">
          <span>首页</span>
        </button>
        <button type="button" class="landing-nav-item active">
          <span>课程目标层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openCompetencyLayer">
          <span>能力素养层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openKnowledgeMap">
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

    <section class="course-hero-copy">
      <div>
        <p>Course Goal Layer</p>
        <h1>课程目标层</h1>
        <strong>课程目标、知识点与题库目标管理</strong>
        <span>围绕课程教学目标，组织课程知识点、题目标签、学习资源和题库内容，为学习分析、知识画像和智能推荐提供基础数据。</span>
      </div>
      <div class="course-stat-strip" aria-label="课程目标层统计">
        <article v-for="stat in courseGoalLayer.stats" :key="stat.key" :class="`tone-${stat.tone}`">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </article>
      </div>
    </section>

    <section class="course-dashboard">
      <div class="course-panel course-system-panel" @mouseenter="pauseGoalCarousel()" @mouseleave="resumeGoalCarousel">
        <CourseGoalSystemChart
          :goals="courseGoalLayer.macroGoals"
          :pyramid="courseGoalLayer.pyramid"
          :active-goal-id="activeGoalId"
          :active-requirement-id="activeRequirementId"
          @select-goal="selectGoal"
          @select-requirement="selectRequirement"
          @hover-goal="hoverGoal"
          @hover-requirement="hoverRequirement"
        />
      </div>

      <div class="course-panel course-sankey-panel">
        <CourseGoalMappingSankey
          :goals="courseGoalLayer.macroGoals"
          :jobs="courseGoalLayer.jobs"
          :active-goal-id="activeGoalId"
          :active-requirement-id="activeRequirementId"
          :active-job-id="activeJobId"
          @select-goal="selectGoal"
          @select-requirement="selectRequirement"
          @select-job="selectJob"
          @hover-goal="hoverGoal"
          @hover-requirement="hoverRequirement"
          @hover-job="hoverJob"
        />
      </div>

      <div class="course-panel course-timeline-panel">
        <CourseGoalTimeline
          :items="courseGoalLayer.timeline"
          :active-id="activeTimelineId"
          @select="activeTimelineId = $event"
        />
      </div>
    </section>

    <AuthDialog v-model:visible="authDialogVisible" v-model:mode="authDialogMode" />
  </main>
</template>

<style scoped>
.course-goals-page {
  position: relative;
  min-height: 100dvh;
  overflow-x: clip;
  color: #e5f7ff;
  background:
    radial-gradient(circle at 52% 24%, rgba(56, 189, 248, 0.2), transparent 26%),
    radial-gradient(circle at 82% 18%, rgba(251, 146, 60, 0.1), transparent 22%),
    radial-gradient(circle at 18% 72%, rgba(167, 139, 250, 0.13), transparent 26%),
    linear-gradient(135deg, #020617 0%, #07132b 48%, #030712 100%);
  font-family: Inter, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.course-goals-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(125, 211, 252, 0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(125, 211, 252, 0.055) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}

.course-space-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.course-goals-star {
  position: absolute;
  border-radius: 50%;
  background: rgba(226, 242, 255, 0.86);
  box-shadow: 0 0 10px rgba(125, 211, 252, 0.72);
}

.course-hero-copy,
.course-dashboard {
  position: relative;
  z-index: 1;
  width: min(calc(100vw - clamp(28px, 5vw, 96px)), 1840px);
  margin: 0 auto;
}

.course-hero-copy {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.68fr);
  gap: 24px;
  align-items: end;
  padding: clamp(96px, 11vh, 126px) 0 18px;
}

.course-hero-copy p {
  margin: 0 0 8px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.course-hero-copy h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 1.05;
  letter-spacing: 0;
  text-shadow: 0 0 30px rgba(34, 211, 238, 0.24);
}

.course-hero-copy > div:first-child > strong {
  display: block;
  margin-top: 10px;
  color: #a5f3fc;
  font-size: clamp(17px, 1.35vw, 24px);
  font-weight: 900;
}

.course-hero-copy > div:first-child > span {
  display: block;
  max-width: 760px;
  margin-top: 10px;
  color: rgba(226, 242, 255, 0.72);
  font-size: clamp(15px, 1.1vw, 18px);
  line-height: 1.8;
}

.course-stat-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.course-stat-strip article {
  min-height: 92px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  padding: 14px;
  background: rgba(8, 16, 36, 0.64);
  backdrop-filter: blur(14px);
}

.course-stat-strip strong,
.course-stat-strip span {
  display: block;
}

.course-stat-strip strong {
  color: #fff;
  font-size: clamp(26px, 2vw, 36px);
  font-family: Consolas, 'JetBrains Mono', monospace;
}

.course-stat-strip span {
  margin-top: 6px;
  color: rgba(226, 242, 255, 0.7);
  font-size: 12px;
}

.course-stat-strip .tone-cyan {
  box-shadow: inset 0 3px 0 #22d3ee;
}

.course-stat-strip .tone-violet {
  box-shadow: inset 0 3px 0 #a78bfa;
}

.course-stat-strip .tone-amber {
  box-shadow: inset 0 3px 0 #fb923c;
}

.course-stat-strip .tone-emerald {
  box-shadow: inset 0 3px 0 #34d399;
}

.course-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: 0 0 clamp(36px, 5vh, 72px);
}

.course-panel {
  min-width: 0;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(9, 20, 48, 0.78), rgba(8, 16, 36, 0.58)),
    rgba(8, 16, 36, 0.52);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
}

.course-system-panel,
.course-sankey-panel,
.course-timeline-panel {
  padding: clamp(18px, 1.6vw, 28px);
}

.course-system-panel {
  grid-column: 1 / -1;
  align-self: stretch;
}

.course-sankey-panel,
.course-timeline-panel {
  grid-column: 1 / -1;
}

@media (max-width: 1180px) {
  .course-hero-copy,
  .course-dashboard {
    grid-template-columns: 1fr;
  }

  .course-stat-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .course-hero-copy,
  .course-dashboard {
    width: min(calc(100vw - 28px), 720px);
  }

  .course-hero-copy {
    padding-top: 112px;
  }

  .course-stat-strip {
    grid-template-columns: 1fr 1fr;
  }

  .course-system-panel,
  .course-sankey-panel,
  .course-timeline-panel {
    padding: 16px;
  }
}

@media (max-width: 560px) {
  .course-stat-strip {
    grid-template-columns: 1fr;
  }
}
</style>
