<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AuthDialog from '@/components/landing/AuthDialog.vue'
import CompetencyLayerView from '@/components/landing/CompetencyLayerView.vue'
import LandingIntroOverlay from '@/components/landing/LandingIntroOverlay.vue'
import { landingApi } from '@/api/services'
import '@/styles/landing.css'

const router = useRouter()
const skipLandingIntro =
  typeof window !== 'undefined' && window.sessionStorage.getItem('skipLandingIntro') === '1'
if (skipLandingIntro) {
  window.sessionStorage.removeItem('skipLandingIntro')
}
const openCompetencyLayerOnEnter =
  typeof window !== 'undefined' && window.sessionStorage.getItem('openCompetencyLayer') === '1'
if (openCompetencyLayerOnEnter) {
  window.sessionStorage.removeItem('openCompetencyLayer')
}

const showCompetency = ref(openCompetencyLayerOnEnter)
const authDialogVisible = ref(false)
const authDialogMode = ref('login')

const assetsReady = ref(false)
const introPhase = ref(skipLandingIntro ? 'entered' : 'booting')
const introMinElapsed = ref(skipLandingIntro)
const introDone = ref(skipLandingIntro)

const competencyDimensions = ref([])
const competencyJobs = ref([])
const syncMeta = ref({
  platform: '课程教学数据',
  lastSuccessAt: '',
  lastAttemptAt: '',
  status: 'loading',
  jobCount: 0,
})
const loading = ref(false)
const loadError = ref('')
const activeHeroModuleKey = ref('teaching')
const activeDataFlowIndex = ref(3)

const competencyDimensionDetails = computed(() =>
  competencyDimensions.value.reduce((acc, item) => {
    acc[item.name] = Array.isArray(item.details) ? item.details : []
    return acc
  }, {}),
)

const totalSkillCount = computed(() =>
  competencyDimensions.value.reduce((sum, item) => sum + Number(item.count || 0), 0),
)

const canExitIntro = computed(() => assetsReady.value && introMinElapsed.value)
const showLandingContent = computed(() => introDone.value && !showCompetency.value)

const syncStatusLabel = computed(() => {
  switch (syncMeta.value?.status) {
    case 'success':
      return '数据就绪'
    case 'degraded':
      return '使用缓存'
    case 'failed':
      return '同步受限'
    case 'running':
      return '更新中'
    case 'seeded':
      return '样例数据'
    default:
      return '加载中'
  }
})

const syncTimeLabel = computed(() => syncMeta.value?.lastSuccessAt || syncMeta.value?.lastAttemptAt || '等待首次更新')

const heroModules = [
  {
    key: 'goals',
    label: '课程目标层',
    className: 'node-goal',
    description: '组织目标、标签与知识点',
  },
  {
    key: 'competency',
    label: '能力素养层',
    className: 'node-ability',
    description: '分析能力维度与技能明细',
  },
  {
    key: 'knowledge',
    label: '学科知识层',
    className: 'node-knowledge',
    description: '关联知识点、题库与资源',
  },
  {
    key: 'teaching',
    label: '教学应用层',
    className: 'node-teaching',
    description: '支撑练习、反馈与推荐',
  },
]

const activeHeroModule = computed(
  () => heroModules.find((module) => module.key === activeHeroModuleKey.value) || heroModules[3],
)

const dashboardStats = computed(() => [
  {
    value: '128',
    label: '题目数量',
    state: 'QUESTIONS',
  },
  {
    value: '36',
    label: '知识点数量',
    state: 'KNOWLEDGE',
  },
  {
    value: String(totalSkillCount.value || 46).padStart(2, '0'),
    label: '标签数量',
    state: 'TAGS',
  },
  {
    value: syncMeta.value?.status === 'failed' ? '受限' : '运行中',
    label: '推荐服务',
    state: syncMeta.value?.status === 'failed' ? 'CACHE' : 'LIVE',
  },
])

const systemFlowNodes = [
  { title: '题库建设', subtitle: '题目标签', description: '维护题目、标签、知识点和学习资源，为课程练习提供基础' },
  { title: '作业考试', subtitle: '测评发布', description: '教师发布作业、考试和阶段测评，明确班级或学生范围' },
  { title: '在线练习', subtitle: '学习行为', description: '学生在线作答，系统记录过程、错题和提交结果' },
  { title: '学习分析', subtitle: '掌握画像', description: '汇总作答记录、知识点掌握度和学习表现' },
  { title: '智能推荐', subtitle: '个性复习', description: '基于薄弱知识点推荐资源、练习和复习路径' },
]

const activeDataFlowNode = computed(() => systemFlowNodes[activeDataFlowIndex.value] || systemFlowNodes[3])

const architectureLayers = [
  {
    key: 'goals',
    title: '课程目标层',
    subtitle: '课程目标、知识点与题库目标管理',
    description: '组织课程目标、教学要求、题目标签、知识点和学习资源，为题库建设和学习分析提供基础。',
    tag: '目标管理',
    action: '进入课程目标层',
    tone: 'cyan',
    visual: 'pyramid',
  },
  {
    key: 'competency',
    title: '能力素养层',
    subtitle: '能力维度、技能明细与学习表现',
    description: '围绕 C 语言学习过程中的语法理解、程序设计、调试分析、算法思维等能力，构建课程能力素养框架。',
    tag: '9 维扩容',
    action: '进入能力素养层',
    tone: 'emerald',
    visual: 'radar',
  },
  {
    key: 'knowledge',
    title: '学科知识层',
    subtitle: '知识点、题库与能力标签联动',
    description: '建立 C 语言知识体系，将基础语法、控制结构、数组、函数、指针、结构体、文件操作等内容与题目和能力标签关联。',
    tag: '知识联动',
    action: '进入学科知识层',
    tone: 'blue',
    visual: 'graph',
  },
  {
    key: 'teaching',
    title: '教学应用层',
    subtitle: '作业考试、在线练习与智能推荐',
    description: '支撑作业考试、在线练习、学习资源推荐、学习反馈、成绩复核和教学改进。',
    tag: '智能支撑',
    action: '进入教学应用层',
    tone: 'violet',
    visual: 'loop',
  },
]

const abilityLoopSteps = [
  { order: '01', text: '题目标签建立练习入口' },
  { order: '02', text: '知识点关系组织学习路径' },
  { order: '03', text: '学习行为形成作答记录' },
  { order: '04', text: '掌握度画像定位薄弱点', active: true },
  { order: '05', text: '智能推荐推动教学改进' },
]

const jobMatches = [
  { title: '作业考试完成率', value: 92 },
  { title: '在线练习参与度', value: 90 },
  { title: '知识点掌握度', value: 86 },
  { title: '推荐任务完成率', value: 78 },
]

async function loadCompetencyLayer() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await landingApi.competencyLayer()
    competencyDimensions.value = Array.isArray(response?.dimensions) ? response.dimensions : []
    competencyJobs.value = Array.isArray(response?.jobs) ? response.jobs : []
    syncMeta.value = {
      platform: '课程教学数据',
      lastSuccessAt: response?.syncMeta?.lastSuccessAt || '',
      lastAttemptAt: response?.syncMeta?.lastAttemptAt || '',
      status: response?.syncMeta?.status || 'seeded',
      jobCount: Number(response?.syncMeta?.jobCount || competencyJobs.value.length || 0),
    }
  } catch (error) {
    loadError.value = error?.message || '能力素养层数据加载失败'
    competencyDimensions.value = []
    competencyJobs.value = []
    syncMeta.value = {
      platform: '课程教学数据',
      lastSuccessAt: '',
      lastAttemptAt: '',
      status: 'failed',
      jobCount: 0,
    }
    ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

function openCompetency() {
  showCompetency.value = true
}

function openKnowledgeMap() {
  router.push({ name: 'knowledge-map' })
}

function openCourseGoals() {
  router.push({ name: 'course-goals' })
}

function openTeachingApplication() {
  router.push({ name: 'teaching-application' })
}

function openLayer(key) {
  if (key === 'goals') {
    openCourseGoals()
    return
  }
  if (key === 'competency') {
    openCompetency()
    return
  }
  if (key === 'knowledge') {
    openKnowledgeMap()
    return
  }
  if (key === 'teaching') {
    openTeachingApplication()
  }
}

function backHome() {
  showCompetency.value = false
}

function handleLogin(mode = 'login') {
  authDialogMode.value = typeof mode === 'string' && mode ? mode : 'login'
  authDialogVisible.value = true
}

function ensureStyle(id, href) {
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = href
  document.head.appendChild(link)
}

function ensureScript(id, src, beforeAppend) {
  const existing = document.getElementById(id)
  if (existing?.dataset.loaded === 'true') return Promise.resolve()
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', reject, { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    beforeAppend?.()
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function initExternalAssets() {
  ensureStyle('landing-fontawesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css')

  await ensureScript('landing-tailwind-cdn', 'https://cdn.tailwindcss.com', () => {
    window.tailwind = window.tailwind || {}
    window.tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            tech: {
              900: '#020617',
              800: '#0f172a',
              cyan: '#22d3ee',
              emerald: '#34d399',
            },
          },
        },
      },
    }
  })

  await ensureScript('landing-tsparticles', 'https://cdn.jsdelivr.net/npm/tsparticles-slim@2.12.0/tsparticles.slim.bundle.min.js')
}

async function initParticles() {
  if (!window.tsParticles || showCompetency.value || !introDone.value) return
  await nextTick()
  const host = document.getElementById('tsparticles')
  if (!host) return
  try {
    await window.tsParticles.load('tsparticles', {
      fpsLimit: 60,
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'grab' },
          resize: true,
        },
        modes: {
          grab: {
            distance: 250,
            links: { opacity: 0.8, color: '#22d3ee' },
          },
        },
      },
      particles: {
        color: { value: ['#22d3ee', '#34d399', '#ffffff'] },
        links: {
          color: '#475569',
          distance: 180,
          enable: true,
          opacity: 0.4,
          width: 1,
        },
        move: {
          direction: 'none',
          enable: true,
          outModes: { default: 'bounce' },
          speed: 0.8,
        },
        number: {
          density: { enable: true, area: 1000 },
          value: 120,
        },
        opacity: { value: 0.5 },
        shape: { type: 'circle' },
        size: { value: { min: 1.5, max: 3.5 } },
      },
      detectRetina: true,
    })
  } catch {
    // Ignore particle init errors on the landing page.
  }
}

function handleIntroMinElapsed() {
  introMinElapsed.value = true
  if (assetsReady.value) {
    introPhase.value = 'readyToEnter'
  }
}

async function handleIntroComplete() {
  introDone.value = true
  introPhase.value = 'entered'
  await nextTick()
  await initParticles()
}

watch(showCompetency, async (visible) => {
  if (!visible && introDone.value) {
    await initParticles()
  }
})

onMounted(async () => {
  document.documentElement.classList.add('dark')
  try {
    await Promise.all([initExternalAssets(), loadCompetencyLayer()])
  } catch {
    // Resource loading failures should not block the intro forever.
  } finally {
    assetsReady.value = true
    if (skipLandingIntro) {
      introPhase.value = 'entered'
      await nextTick()
      await initParticles()
    } else if (introMinElapsed.value) {
      introPhase.value = 'readyToEnter'
    }
  }
})
</script>

<template>
  <div class="landing-shell">
    <CompetencyLayerView
      v-if="showCompetency"
      :dimensions="competencyDimensions"
      :dimension-details="competencyDimensionDetails"
      :jobs="competencyJobs"
      :sync-meta="syncMeta"
      @back-home="backHome"
      @open-course-goals="openCourseGoals"
      @open-knowledge-map="openKnowledgeMap"
      @open-teaching-application="openTeachingApplication"
      @open-login="handleLogin"
    />

    <LandingIntroOverlay
      v-if="!introDone"
      :can-exit="canExitIntro"
      @min-elapsed="handleIntroMinElapsed"
      @complete="handleIntroComplete"
    />

    <div
      v-else-if="showLandingContent"
      class="public-landing-page text-slate-300 antialiased font-sans overflow-x-hidden selection:bg-cyan-500 selection:text-white flex flex-col min-h-screen"
    >
      <div id="tsparticles"></div>

      <nav class="home-top-nav">
        <button type="button" class="home-brand" @click="backHome">
          <span>C</span>
          <strong>C-EVAL <em>v2.0</em></strong>
        </button>
        <div class="home-nav-links" aria-label="首页导航">
          <button type="button" @click="openCourseGoals">课程目标层</button>
          <button type="button" @click="openCompetency">能力素养层</button>
          <button type="button" @click="openKnowledgeMap">学科知识层</button>
          <button type="button" @click="openTeachingApplication">教学应用层</button>
        </div>
        <button type="button" class="home-login-button" @click="handleLogin('login')">
          进入系统 <i class="fa-solid fa-arrow-right"></i>
        </button>
      </nav>

      <main class="home-dashboard">
        <section class="home-hero">
          <div class="hero-copy">
            <div class="hero-kicker">
              <i class="fa-solid fa-network-wired"></i>
              题库建设与学习分析联动
            </div>
            <h1>
              C-EVAL v2.0
              <span>智能学习与教学辅助系统</span>
            </h1>
            <p>
              系统围绕题库建设、作业考试、在线练习、学习统计、知识画像、智能推荐和知识图谱关系，
              帮助学生完成课程学习与针对性复习，辅助教师开展题库管理、测评发布、学习分析和教学改进。
            </p>
            <div class="hero-actions">
              <button type="button" class="primary-action" @click="handleLogin('login')">进入系统</button>
              <button type="button" class="secondary-action" @click="openCompetency">查看能力图谱</button>
            </div>
          </div>

          <div
            class="hero-engine"
            :class="`active-${activeHeroModule.key}`"
            aria-label="C-EVAL 智能学习系统"
          >
            <svg class="engine-links" viewBox="0 0 420 420" aria-hidden="true">
              <defs>
                <filter id="homeEngineGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path id="homeEngineOrbit" d="M210,62 C292,62 358,128 358,210 C358,292 292,358 210,358 C128,358 62,292 62,210 C62,128 128,62 210,62 Z" />
              <path d="M210,210 L210,62 M210,210 L358,210 M210,210 L210,358 M210,210 L62,210" class="engine-spokes" />
              <circle r="4" class="engine-particle particle-cyan">
                <animateMotion dur="13s" repeatCount="indefinite"><mpath href="#homeEngineOrbit" /></animateMotion>
              </circle>
              <circle r="3.5" class="engine-particle particle-violet">
                <animateMotion dur="13s" begin="-4.3s" repeatCount="indefinite"><mpath href="#homeEngineOrbit" /></animateMotion>
              </circle>
              <circle r="3" class="engine-particle particle-amber">
                <animateMotion dur="13s" begin="-8.6s" repeatCount="indefinite"><mpath href="#homeEngineOrbit" /></animateMotion>
              </circle>
            </svg>
            <div class="engine-core">
              <strong>C-EVAL</strong>
              <span>学习引擎</span>
              <em>{{ activeHeroModule.description }}</em>
            </div>
            <button
              v-for="module in heroModules"
              :key="module.key"
              type="button"
              :class="['engine-node', module.className, { active: activeHeroModule.key === module.key }]"
              @mouseenter="activeHeroModuleKey = module.key"
              @focus="activeHeroModuleKey = module.key"
              @click="openLayer(module.key)"
            >
              <span>{{ module.label }}</span>
              <small>{{ module.description }}</small>
            </button>
          </div>
        </section>

        <section class="home-status-grid" aria-label="系统运行状态">
          <article v-for="stat in dashboardStats" :key="stat.label" class="status-card">
            <span>{{ stat.state }}</span>
            <strong>{{ stat.value }}</strong>
            <p>{{ stat.label }}</p>
          </article>
        </section>

        <section class="home-sync-strip" aria-label="同步状态">
          <article>
            <span>来源模块</span>
            <strong>{{ syncMeta.platform || '课程教学数据' }}</strong>
          </article>
          <article>
            <span>最近更新</span>
            <strong>{{ syncTimeLabel }}</strong>
          </article>
          <article>
            <span>数据范围</span>
            <strong>题库 / 知识点 / 学习资源</strong>
          </article>
          <article class="live-chip">
            <i></i>
            <strong>LIVE / active</strong>
          </article>
        </section>

        <p v-if="loading" class="home-load-state">能力素养层数据加载中...</p>
        <p v-else-if="loadError" class="home-load-state error">{{ loadError }}</p>

        <section class="system-flow-panel">
          <div class="section-heading">
            <p>SYSTEM DATA FLOW</p>
            <h2>系统能力链路</h2>
          </div>
          <div class="system-flow-track">
            <article
              v-for="(node, index) in systemFlowNodes"
              :key="node.title"
              :class="{ active: activeDataFlowIndex === index }"
              tabindex="0"
              @mouseenter="activeDataFlowIndex = index"
              @focusin="activeDataFlowIndex = index"
            >
              <strong>{{ node.title }}</strong>
              <span>{{ node.subtitle }}</span>
            </article>
          </div>
          <p class="flow-node-detail">{{ activeDataFlowNode.description }}</p>
        </section>

        <section class="architecture-section">
          <div class="section-heading">
            <p>C-EVAL ARCHITECTURE</p>
            <h2>系统架构分层</h2>
          </div>
          <div class="architecture-grid">
            <article
              v-for="layer in architectureLayers"
              :key="layer.key"
              :class="['architecture-card', `tone-${layer.tone}`]"
              role="button"
              tabindex="0"
              @click="openLayer(layer.key)"
              @keydown.enter.prevent="openLayer(layer.key)"
              @keydown.space.prevent="openLayer(layer.key)"
            >
              <div class="module-preview" :class="`preview-${layer.visual}`" aria-hidden="true">
                <template v-if="layer.visual === 'pyramid'">
                  <i><b>课程目标</b></i>
                  <i><b>知识点标签</b></i>
                  <i><b>题库资源</b></i>
                </template>
                <template v-else-if="layer.visual === 'radar'">
                  <svg viewBox="0 0 120 120">
                    <polygon points="60,10 103,35 103,85 60,110 17,85 17,35" />
                    <polygon points="60,28 84,42 88,75 60,92 34,76 38,43" />
                  </svg>
                  <span>语法</span>
                  <span>调试</span>
                  <span>算法</span>
                </template>
                <template v-else-if="layer.visual === 'graph'">
                  <i></i>
                  <span>C语言</span><span>数组</span><span>函数</span><span>指针</span><span>结构体</span><span>文件</span>
                </template>
                <template v-else>
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="38" />
                    <circle cx="60" cy="18" r="6" />
                    <circle cx="102" cy="60" r="6" />
                    <circle cx="60" cy="102" r="6" />
                    <circle cx="18" cy="60" r="6" />
                  </svg>
                </template>
              </div>
              <div class="card-topline">
                <span>{{ layer.tag }}</span>
                <i class="fa-solid fa-arrow-right"></i>
              </div>
              <h3>{{ layer.title }}</h3>
              <strong>{{ layer.subtitle }}</strong>
              <p>{{ layer.description }}</p>
              <button type="button" class="card-cta" @click.stop="openLayer(layer.key)">
                {{ layer.action }} <i class="fa-solid fa-arrow-right"></i>
              </button>
            </article>
          </div>
        </section>

        <section class="ability-loop-panel">
          <div>
            <div class="section-heading">
              <p>ABILITY TO POSITION LOOP</p>
              <h2>学习到改进闭环</h2>
            </div>
            <p class="loop-summary">
              系统将题目标签、知识点关系、学习行为和掌握度画像统一到一条可追踪的教学链路中，帮助学生针对性复习，也帮助教师持续优化题库、资源和教学安排。
            </p>
            <div class="loop-steps">
              <article
                v-for="step in abilityLoopSteps"
                :key="step.order"
                :class="{ active: step.active }"
              >
                <span>{{ step.order }}</span>
                <strong>{{ step.text }}</strong>
              </article>
            </div>
          </div>

          <div class="position-match-panel">
            <h3>学习分析面板</h3>
            <article v-for="job in jobMatches" :key="job.title">
              <div>
                <span>{{ job.title }}</span>
                <strong>{{ job.value }}%</strong>
              </div>
              <i :style="{ '--value': `${job.value}%` }"></i>
            </article>
          </div>
        </section>
      </main>

      <nav class="fixed w-full z-50 glass-panel border-b-0 py-4 px-[5%] xl:px-[8%] flex justify-between items-center">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 xl:w-10 xl:h-10 rounded bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            <i class="fa-solid fa-code text-white xl:text-lg"></i>
          </div>
          <span class="text-white font-bold text-xl xl:text-2xl tracking-wider">
            C-EVAL
            <span class="text-xs xl:text-sm text-cyan-400 font-normal ml-1">v2.0</span>
          </span>
        </div>
        <button
          class="px-6 py-2 xl:px-8 xl:py-3 text-sm xl:text-base font-bold text-white bg-white/10 border border-white/20 rounded-full hover:bg-cyan-500 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
          @click="handleLogin('login')"
        >
          系统登录 <i class="fa-solid fa-arrow-right ml-1"></i>
        </button>
      </nav>

      <main class="relative z-10 flex-grow pt-32 xl:pt-40 pb-20 w-[92%] max-w-[1600px] mx-auto flex flex-col items-center">
        <div class="text-center w-full max-w-5xl xl:max-w-6xl mx-auto mb-16 xl:mb-24">
          <div class="inline-block mb-6 px-5 py-1.5 xl:py-2 xl:px-6 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs xl:text-sm font-semibold tracking-widest backdrop-blur-sm">
            <i class="fa-solid fa-network-wired mr-2"></i>题库建设与学习分析联动
          </div>

          <h1 class="text-5xl md:text-7xl xl:text-[5.5rem] font-extrabold text-white mb-6 xl:mb-10 tracking-tight leading-tight">
            C-EVAL v2.0<br />
            <span class="text-gradient">智能学习与教学辅助系统</span>
          </h1>

          <p class="text-lg md:text-xl xl:text-2xl text-slate-400 mb-12 xl:mb-16 leading-relaxed max-w-3xl xl:max-w-4xl mx-auto">
            系统围绕题库建设、作业考试、在线练习、学习统计、知识画像、智能推荐和知识图谱关系，
            帮助学生完成课程学习与针对性复习，辅助教师开展题库管理、测评发布、学习分析和教学改进。
          </p>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-8 max-w-5xl mx-auto">
            <div class="glass-panel p-5 xl:p-8 rounded-xl text-center transition-transform hover:scale-105">
              <div class="text-4xl xl:text-6xl font-black text-white mb-2 text-gradient">
                {{ String(competencyDimensions.length).padStart(2, '0') }}
              </div>
              <div class="text-sm xl:text-base text-slate-400 font-medium tracking-wide">题目数量</div>
            </div>
            <div class="glass-panel p-5 xl:p-8 rounded-xl text-center transition-transform hover:scale-105">
              <div class="text-4xl xl:text-6xl font-black text-white mb-2 text-gradient">
                {{ String(totalSkillCount).padStart(2, '0') }}
              </div>
              <div class="text-sm xl:text-base text-slate-400 font-medium tracking-wide">知识点数量</div>
            </div>
            <div class="glass-panel p-5 xl:p-8 rounded-xl text-center transition-transform hover:scale-105">
              <div class="text-4xl xl:text-6xl font-black text-white mb-2 text-gradient">
                {{ String(syncMeta.jobCount || competencyJobs.length).padStart(2, '0') }}
              </div>
              <div class="text-sm xl:text-base text-slate-400 font-medium tracking-wide">标签数量</div>
            </div>
            <div class="glass-panel p-5 xl:p-8 rounded-xl text-center transition-transform hover:scale-105">
              <div class="text-lg xl:text-2xl font-black text-white mb-2 text-gradient">{{ syncStatusLabel }}</div>
              <div class="text-sm xl:text-base text-slate-400 font-medium tracking-wide">同步状态</div>
            </div>
          </div>

          <div class="mt-6 max-w-4xl mx-auto grid gap-3 md:grid-cols-3 text-left">
            <div class="glass-panel rounded-2xl px-5 py-4">
              <div class="text-xs uppercase tracking-[0.18em] text-cyan-400 mb-2">来源模块</div>
              <div class="text-white font-semibold">{{ syncMeta.platform || '课程教学数据' }}</div>
            </div>
            <div class="glass-panel rounded-2xl px-5 py-4">
              <div class="text-xs uppercase tracking-[0.18em] text-cyan-400 mb-2">最近更新</div>
              <div class="text-white font-semibold">{{ syncTimeLabel }}</div>
            </div>
            <div class="glass-panel rounded-2xl px-5 py-4">
              <div class="text-xs uppercase tracking-[0.18em] text-cyan-400 mb-2">数据范围</div>
              <div class="text-white font-semibold">题库 / 知识点 / 学习资源</div>
            </div>
          </div>

          <p v-if="loading" class="mt-6 text-cyan-300">能力素养层数据加载中...</p>
          <p v-else-if="loadError" class="mt-6 text-rose-300">{{ loadError }}</p>
        </div>

        <div class="w-full mt-8 xl:mt-12 max-w-6xl xl:max-w-[1400px]">
          <div class="flex items-center gap-4 mb-8 xl:mb-12">
            <h2 class="text-2xl xl:text-3xl font-bold text-white">系统架构分层</h2>
            <div class="h-[1px] flex-grow bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-10">
            <div
              class="glass-panel p-8 xl:p-12 rounded-2xl relative overflow-hidden group cursor-pointer h-full flex flex-col"
              role="button"
              tabindex="0"
              aria-label="打开课程目标层"
              @click="openCourseGoals"
              @keydown.enter.prevent="openCourseGoals"
              @keydown.space.prevent="openCourseGoals"
            >
              <div class="absolute top-0 right-0 w-40 h-40 xl:w-56 xl:h-56 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-cyan-500/20 transition-all"></div>
              <div class="flex justify-between items-start mb-6 xl:mb-8">
                <div class="w-12 h-12 xl:w-16 xl:h-16 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 text-cyan-400 text-xl xl:text-3xl">
                  <i class="fa-solid fa-chart-line"></i>
                </div>
                <span class="px-3 py-1 xl:px-4 xl:py-1.5 text-[10px] xl:text-xs font-bold uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">
                  学情分析
                </span>
              </div>
              <h3 class="text-xl xl:text-3xl font-bold text-white mb-2 xl:mb-3">课程目标层</h3>
              <div class="text-sm xl:text-base text-cyan-300/80 font-medium mb-4 xl:mb-6">课程目标、知识点与题库目标管理</div>
              <p class="text-slate-400 text-sm xl:text-lg leading-relaxed flex-grow">
                组织课程目标、教学要求、题目标签、知识点和学习资源，为题库建设和学习分析提供基础。
              </p>
            </div>

            <div class="glass-panel p-8 xl:p-12 rounded-2xl relative overflow-hidden group cursor-pointer h-full flex flex-col" @click="openCompetency">
              <div class="absolute top-0 right-0 w-40 h-40 xl:w-56 xl:h-56 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-all"></div>
              <div class="flex justify-between items-start mb-6 xl:mb-8">
                <div class="w-12 h-12 xl:w-16 xl:h-16 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 text-emerald-400 text-xl xl:text-3xl">
                  <i class="fa-solid fa-layer-group"></i>
                </div>
                <span class="px-3 py-1 xl:px-4 xl:py-1.5 text-[10px] xl:text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                  9 维扩容
                </span>
              </div>
              <h3 class="text-xl xl:text-3xl font-bold text-white mb-2 xl:mb-3">能力素养层</h3>
              <div class="text-sm xl:text-base text-emerald-300/80 font-medium mb-4 xl:mb-6">能力维度、技能明细与学习表现</div>
              <p class="text-slate-400 text-sm xl:text-lg leading-relaxed flex-grow">
                围绕C语言学习过程中的语法理解、程序设计、调试分析、算法思维等能力,构建课程能力素养框架。
              </p>
            </div>

            <div
              class="glass-panel p-8 xl:p-12 rounded-2xl relative overflow-hidden group cursor-pointer h-full flex flex-col"
              role="button"
              tabindex="0"
              aria-label="打开知识图谱层"
              @click="openKnowledgeMap"
              @keydown.enter.prevent="openKnowledgeMap"
            >
              <div class="absolute top-0 right-0 w-40 h-40 xl:w-56 xl:h-56 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-all"></div>
              <div class="flex justify-between items-start mb-6 xl:mb-8">
                <div class="w-12 h-12 xl:w-16 xl:h-16 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-blue-400 text-xl xl:text-3xl">
                  <i class="fa-solid fa-project-diagram"></i>
                </div>
                <span class="px-3 py-1 xl:px-4 xl:py-1.5 text-[10px] xl:text-xs font-bold uppercase tracking-wider rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/20">
                  知识联动
                </span>
              </div>
              <h3 class="text-xl xl:text-3xl font-bold text-white mb-2 xl:mb-3">学科知识层</h3>
              <div class="text-sm xl:text-base text-blue-300/80 font-medium mb-4 xl:mb-6">知识点、题库与能力标签联动</div>
              <p class="text-slate-400 text-sm xl:text-lg leading-relaxed flex-grow">
                建立C语言知识体系,将基础语法、控制结构、数组、函数、指针、结构体、文件操作等内容与题目和能力标签关联。
              </p>
            </div>

            <div
              class="glass-panel p-8 xl:p-12 rounded-2xl relative overflow-hidden group cursor-pointer h-full flex flex-col"
              role="button"
              tabindex="0"
              aria-label="打开教学应用层"
              @click="openTeachingApplication"
              @keydown.enter.prevent="openTeachingApplication"
              @keydown.space.prevent="openTeachingApplication"
            >
              <div class="absolute top-0 right-0 w-40 h-40 xl:w-56 xl:h-56 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/20 transition-all"></div>
              <div class="flex justify-between items-start mb-6 xl:mb-8">
                <div class="w-12 h-12 xl:w-16 xl:h-16 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30 text-purple-400 text-xl xl:text-3xl">
                  <i class="fa-solid fa-robot"></i>
                </div>
                <span class="px-3 py-1 xl:px-4 xl:py-1.5 text-[10px] xl:text-xs font-bold uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">
                  智能支撑
                </span>
              </div>
              <h3 class="text-xl xl:text-3xl font-bold text-white mb-2 xl:mb-3">教学应用层</h3>
              <div class="text-sm xl:text-base text-purple-300/80 font-medium mb-4 xl:mb-6">作业考试、在线练习与智能推荐</div>
              <p class="text-slate-400 text-sm xl:text-lg leading-relaxed flex-grow">
                支撑作业考试、在线练习、学习资源推荐、学习反馈、成绩复核和教学改进。
              </p>
            </div>
          </div>

          <div class="mt-12 xl:mt-20 text-center">
          </div>
        </div>
      </main>
    </div>

    <AuthDialog v-model:visible="authDialogVisible" v-model:mode="authDialogMode" />
  </div>
</template>

<style scoped src="@/styles/public-landing-view.css"></style>
