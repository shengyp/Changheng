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

<style scoped>
.public-landing-page {
  position: relative;
  background:
    radial-gradient(circle at 74% 20%, rgba(139, 92, 246, 0.16), transparent 24%),
    radial-gradient(circle at 20% 24%, rgba(34, 211, 238, 0.18), transparent 26%),
    radial-gradient(circle at 70% 76%, rgba(251, 146, 60, 0.08), transparent 22%),
    linear-gradient(135deg, #020617 0%, #07132b 48%, #030712 100%);
}

.public-landing-page::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(125, 211, 252, 0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(125, 211, 252, 0.055) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}

.public-landing-page > nav.fixed,
.public-landing-page > main.relative {
  display: none !important;
}

.home-top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  min-height: 76px;
  align-items: center;
  gap: 22px;
  padding: 0 clamp(24px, 5vw, 96px);
  border-bottom: 1px solid rgba(125, 211, 252, 0.14);
  background: linear-gradient(135deg, rgba(11, 29, 123, 0.86), rgba(0, 9, 32, 0.92));
  backdrop-filter: blur(18px);
}

.home-brand,
.home-nav-links button,
.home-login-button,
.hero-actions button,
.engine-node,
.architecture-card button {
  font: inherit;
  cursor: pointer;
}

.home-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  border: 0;
  background: transparent;
}

.home-brand span {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #061126;
  font-size: 20px;
  font-weight: 900;
  border-radius: 50%;
  background: linear-gradient(135deg, #67e8f9, #a7f3d0);
  box-shadow: 0 0 28px rgba(34, 211, 238, 0.32);
}

.home-brand strong {
  font-size: 21px;
  letter-spacing: 0.04em;
}

.home-brand em {
  color: #67e8f9;
  font-size: 12px;
  font-style: normal;
}

.home-nav-links {
  display: flex;
  justify-content: center;
  flex: 1;
  gap: clamp(14px, 3vw, 40px);
}

.home-nav-links button {
  color: rgba(226, 242, 255, 0.78);
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 8px 10px;
  background: transparent;
  font-weight: 800;
}

.home-nav-links button:hover,
.home-nav-links button:focus-visible {
  color: #fff;
  outline: none;
  border-color: rgba(125, 211, 252, 0.22);
  background: rgba(34, 211, 238, 0.08);
}

.home-login-button,
.primary-action,
.secondary-action,
.architecture-card button {
  min-height: 42px;
  border-radius: 999px;
  padding: 0 18px;
  color: #e5f7ff;
  border: 1px solid rgba(125, 211, 252, 0.22);
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(139, 92, 246, 0.12)),
    rgba(255, 255, 255, 0.055);
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.1);
  font-weight: 900;
}

.home-login-button:hover,
.primary-action:hover,
.secondary-action:hover,
.architecture-card button:hover {
  border-color: rgba(34, 211, 238, 0.58);
  box-shadow: 0 0 32px rgba(34, 211, 238, 0.18);
}

.home-dashboard {
  position: relative;
  z-index: 1;
  width: min(calc(100vw - clamp(32px, 5vw, 96px)), 1500px);
  margin: 0 auto;
  padding: clamp(66px, 7.2vh, 82px) 0 clamp(36px, 5vh, 64px);
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 0.94fr) minmax(540px, 0.86fr);
  gap: clamp(28px, 4vw, 64px);
  align-items: center;
  min-height: clamp(430px, 50vh, 560px);
}

.hero-copy {
  display: grid;
  gap: 18px;
  align-content: center;
}

.hero-kicker,
.section-heading p {
  color: #67e8f9;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-kicker {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 10px;
  padding: 7px 13px;
  border: 1px solid rgba(34, 211, 238, 0.25);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.08);
}

.hero-copy h1 {
  margin: 0;
  max-width: 820px;
  color: #fff;
  font-size: clamp(46px, 5.35vw, 86px);
  line-height: 1.05;
  letter-spacing: 0;
}

.hero-copy h1 span,
.text-gradient,
.status-card strong,
.position-match-panel strong {
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(90deg, #fff, #67e8f9 42%, #a78bfa);
}

.hero-copy h1 span {
  display: block;
}

.hero-copy p,
.loop-summary {
  max-width: 800px;
  margin: 0;
  color: rgba(226, 242, 255, 0.72);
  font-size: clamp(16px, 1.15vw, 20px);
  line-height: 1.68;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.primary-action {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.34), rgba(139, 92, 246, 0.18));
}

.hero-engine {
  position: relative;
  display: grid;
  width: min(112%, 720px);
  aspect-ratio: 1;
  justify-self: end;
  place-items: center;
}

.hero-engine::before {
  content: '';
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(34, 211, 238, 0.15), transparent 62%);
  filter: blur(10px);
}

.engine-links {
  position: absolute;
  inset: 0;
  overflow: visible;
}

#homeEngineOrbit {
  fill: none;
  stroke: rgba(125, 211, 252, 0.34);
  stroke-width: 1.4;
  stroke-dasharray: 9 7;
  transform-box: fill-box;
  transform-origin: center;
  animation: homeFlowDash 18s linear infinite, homeOrbitSpin 46s linear infinite;
  filter: url('#homeEngineGlow');
}

.engine-spokes {
  fill: none;
  stroke: rgba(125, 211, 252, 0.28);
  stroke-width: 1.2;
  stroke-dasharray: 7 9;
  animation: homeFlowDash 24s linear infinite;
}

.engine-particle {
  filter: drop-shadow(0 0 8px currentColor);
}

.particle-cyan {
  color: #22d3ee;
  fill: #22d3ee;
}

.particle-violet {
  color: #a78bfa;
  fill: #a78bfa;
}

.particle-amber {
  color: #fb923c;
  fill: #fb923c;
}

.engine-core {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(42%, 220px);
  aspect-ratio: 1;
  place-items: center;
  align-content: center;
  gap: 6px;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 28%;
  background: rgba(3, 18, 42, 0.82);
  box-shadow: 0 0 52px rgba(34, 211, 238, 0.2), inset 0 0 32px rgba(167, 139, 250, 0.08);
  animation: homePulseGlow 4.8s ease-in-out infinite;
  transition: border-color 0.24s ease, box-shadow 0.24s ease, background 0.24s ease;
}

.engine-core strong {
  color: #fff;
  font-size: clamp(24px, 2.1vw, 34px);
}

.engine-core span {
  color: rgba(226, 242, 255, 0.72);
}

.engine-core em {
  max-width: 78%;
  color: rgba(159, 232, 255, 0.72);
  font-size: 12px;
  font-style: normal;
  line-height: 1.5;
  text-align: center;
}

.hero-engine:has(.engine-node:hover) .engine-core,
.hero-engine:has(.engine-node:focus-visible) .engine-core {
  border-color: rgba(34, 211, 238, 0.7);
  background: rgba(5, 25, 58, 0.88);
  box-shadow: 0 0 70px rgba(34, 211, 238, 0.32), inset 0 0 38px rgba(167, 139, 250, 0.16);
}

.engine-node {
  position: absolute;
  z-index: 3;
  min-width: 126px;
  min-height: 42px;
  color: #e5f7ff;
  border: 1px solid rgba(125, 211, 252, 0.24);
  border-radius: 999px;
  background: rgba(5, 20, 46, 0.86);
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.12);
  font-weight: 900;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.engine-node span,
.engine-node small {
  display: block;
  pointer-events: none;
}

.engine-node small {
  max-width: 142px;
  margin-top: 3px;
  color: rgba(226, 242, 255, 0);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  transition: color 0.2s ease;
}

.engine-node:hover,
.engine-node:focus-visible,
.engine-node.active {
  border-color: rgba(34, 211, 238, 0.62);
  background: rgba(9, 35, 72, 0.92);
  box-shadow: 0 0 34px rgba(34, 211, 238, 0.22);
  outline: none;
}

.engine-node:hover small,
.engine-node:focus-visible small,
.engine-node.active small {
  color: rgba(159, 232, 255, 0.72);
}

.node-goal {
  top: 8%;
  left: 50%;
  transform: translateX(-50%);
}

.node-ability {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}

.node-knowledge {
  bottom: 8%;
  left: 50%;
  transform: translateX(-50%);
}

.node-teaching {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

.home-status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.status-card,
.home-sync-strip,
.system-flow-panel,
.architecture-card,
.ability-loop-panel,
.position-match-panel {
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(9, 20, 48, 0.78), rgba(8, 16, 36, 0.58)),
    rgba(8, 16, 36, 0.52);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
}

.status-card {
  position: relative;
  min-height: 106px;
  overflow: hidden;
  padding: 15px 17px;
}

.status-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(34, 211, 238, 0.12), transparent);
  transform: translateX(-120%);
  animation: homeScanLine 5.5s ease-in-out infinite;
}

.status-card span,
.home-sync-strip span {
  color: rgba(226, 242, 255, 0.56);
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 12px;
}

.status-card strong {
  display: block;
  margin-top: 8px;
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: clamp(30px, 2.35vw, 42px);
}

.status-card p {
  margin: 4px 0 0;
  color: rgba(226, 242, 255, 0.72);
}

.home-sync-strip {
  display: grid;
  grid-template-columns: minmax(160px, 0.7fr) minmax(260px, 1.1fr) minmax(160px, 0.7fr) auto;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
  padding: 11px 15px;
}

.home-sync-strip article {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.home-sync-strip strong {
  color: #fff;
  font-size: 14px;
}

.live-chip {
  display: inline-flex !important;
  grid-auto-flow: column;
  align-items: center;
  gap: 8px;
  justify-content: end;
}

.live-chip i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 14px rgba(52, 211, 153, 0.75);
}

.home-load-state {
  margin: 12px 0 0;
  color: #67e8f9;
}

.home-load-state.error {
  color: #fda4af;
}

.system-flow-panel,
.architecture-section,
.ability-loop-panel {
  margin-top: 16px;
  scroll-margin-top: 84px;
}

.system-flow-panel,
.ability-loop-panel {
  padding: clamp(18px, 1.75vw, 28px);
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.section-heading p,
.section-heading h2 {
  margin: 0;
}

.section-heading h2 {
  color: #fff;
  font-size: clamp(24px, 1.8vw, 34px);
}

.system-flow-track {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.system-flow-track::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 6%;
  right: 6%;
  height: 3px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, rgba(34, 211, 238, 0.12), rgba(34, 211, 238, 0.78), rgba(167, 139, 250, 0.72), rgba(251, 146, 60, 0.42)),
    linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent);
  background-size: 100% 100%, 22% 100%;
  background-position: 0 0, -30% 0;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.25);
  animation: homeFlowLine 6.8s ease-in-out infinite;
}

.system-flow-track::after {
  content: '';
  position: absolute;
  top: calc(50% - 5px);
  left: 6%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #67e8f9;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.75);
  animation: homeFlowDot 7.2s linear infinite;
}

.system-flow-track article {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 92px;
  place-items: center;
  align-content: center;
  gap: 6px;
  text-align: center;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background: rgba(2, 16, 39, 0.78);
  outline: none;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.system-flow-track article:hover,
.system-flow-track article:focus-visible,
.system-flow-track article.active {
  border-color: rgba(251, 146, 60, 0.46);
  background: rgba(10, 28, 62, 0.9);
  box-shadow: 0 0 30px rgba(251, 146, 60, 0.12);
  transform: translateY(-2px);
}

.system-flow-track strong {
  color: #fff;
}

.system-flow-track span {
  color: rgba(226, 242, 255, 0.62);
  font-size: 13px;
}

.flow-node-detail {
  margin: 14px 0 0;
  min-height: 24px;
  color: rgba(159, 232, 255, 0.78);
  font-size: 14px;
  text-align: center;
}

.architecture-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.architecture-card {
  position: relative;
  display: grid;
  min-height: 330px;
  gap: 12px;
  overflow: hidden;
  padding: clamp(20px, 1.8vw, 30px);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.architecture-card:hover {
  transform: translateY(-4px);
  border-color: rgba(34, 211, 238, 0.42);
  background:
    linear-gradient(180deg, rgba(13, 31, 68, 0.82), rgba(8, 17, 40, 0.66)),
    rgba(8, 16, 36, 0.58);
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.3), 0 0 44px rgba(34, 211, 238, 0.12);
}

.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-topline span {
  padding: 6px 10px;
  color: #9fe8ff;
  font-size: 12px;
  font-weight: 900;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.08);
}

.architecture-card h3 {
  margin: 0;
  color: #fff;
  font-size: clamp(22px, 1.8vw, 30px);
}

.architecture-card > strong {
  color: #9fe8ff;
}

.architecture-card p {
  margin: 0;
  color: rgba(226, 242, 255, 0.68);
  line-height: 1.75;
}

.module-preview {
  position: absolute;
  top: 20px;
  right: 22px;
  width: 138px;
  height: 108px;
  opacity: 0.82;
  transition: opacity 0.22s ease, filter 0.22s ease, transform 0.22s ease;
}

.architecture-card:hover .module-preview {
  opacity: 1;
  filter: drop-shadow(0 0 16px rgba(34, 211, 238, 0.24));
  transform: translateY(-2px);
}

.preview-pyramid {
  display: grid;
  align-content: end;
  justify-items: center;
  gap: 6px;
}

.preview-pyramid i {
  position: relative;
  display: grid;
  place-items: center;
  height: 16px;
  border: 1px solid rgba(34, 211, 238, 0.38);
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.12), rgba(251, 191, 36, 0.08));
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.12), inset 0 0 12px rgba(251, 191, 36, 0.04);
}

.preview-pyramid b {
  display: block;
  color: rgba(255, 247, 237, 0.76);
  font-size: 9px;
  font-weight: 800;
  line-height: 16px;
  text-align: center;
}

.preview-pyramid i:nth-child(1) {
  width: 42px;
}

.preview-pyramid i:nth-child(2) {
  width: 72px;
}

.preview-pyramid i:nth-child(3) {
  width: 104px;
}

.preview-radar svg,
.preview-loop svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.preview-radar span {
  position: absolute;
  color: rgba(226, 242, 255, 0.62);
  font-size: 9px;
  font-weight: 800;
}

.preview-radar span:nth-of-type(1) { left: 8px; top: 12px; }
.preview-radar span:nth-of-type(2) { right: 4px; top: 46px; }
.preview-radar span:nth-of-type(3) { left: 42px; bottom: 0; }

.preview-radar polygon,
.preview-loop circle {
  fill: rgba(34, 211, 238, 0.08);
  stroke: rgba(125, 211, 252, 0.55);
  stroke-width: 2;
  filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.28));
}

.preview-radar polygon:last-child {
  fill: rgba(167, 139, 250, 0.18);
}

.preview-graph {
  --node-glow: rgba(34, 211, 238, 0.58);
}

.preview-graph i {
  position: absolute;
  inset: 16px 12px 12px;
  background:
    linear-gradient(28deg, transparent 49%, rgba(125, 211, 252, 0.26) 50%, transparent 51%),
    linear-gradient(142deg, transparent 49%, rgba(125, 211, 252, 0.22) 50%, transparent 51%),
    linear-gradient(90deg, transparent 49%, rgba(167, 139, 250, 0.2) 50%, transparent 51%);
  opacity: 0.65;
}

.preview-graph span {
  position: absolute;
  display: grid;
  min-width: 22px;
  height: 18px;
  place-items: center;
  padding: 0 5px;
  border-radius: 50%;
  color: rgba(2, 8, 23, 0.94);
  font-size: 8px;
  font-weight: 900;
  background: #67e8f9;
  box-shadow: 0 0 14px var(--node-glow);
}

.preview-graph span:nth-of-type(1) { left: 48px; top: 40px; min-width: 36px; height: 24px; background: #a5f3fc; }
.preview-graph span:nth-of-type(2) { left: 4px; top: 14px; }
.preview-graph span:nth-of-type(3) { right: 4px; top: 12px; }
.preview-graph span:nth-of-type(4) { left: 8px; bottom: 12px; }
.preview-graph span:nth-of-type(5) { right: 4px; bottom: 18px; }
.preview-graph span:nth-of-type(6) { left: 50px; bottom: 0; }

.preview-loop svg {
  animation: homeOrbitSpin 34s linear infinite;
}

.preview-loop circle:nth-child(n + 2) {
  fill: #67e8f9;
}

.architecture-card:hover .preview-loop circle:nth-child(4) {
  fill: #fb923c;
  stroke: rgba(251, 146, 60, 0.9);
}

.card-cta {
  justify-self: end;
  align-self: end;
  min-height: 0;
  padding: 0;
  color: #9fe8ff;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  font-size: 14px;
  font-weight: 900;
  transition: color 0.22s ease, transform 0.22s ease;
}

.card-cta i {
  margin-left: 6px;
  transition: transform 0.22s ease;
}

.architecture-card:hover .card-cta {
  color: #fff;
  transform: translateX(2px);
}

.architecture-card:hover .card-cta i {
  transform: translateX(4px);
}

.architecture-card .card-cta:hover {
  border-color: transparent;
  box-shadow: none;
}

.ability-loop-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.56fr);
  gap: 22px;
  align-items: start;
}

.loop-steps {
  position: relative;
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.loop-steps::before {
  content: '';
  position: absolute;
  left: 22px;
  top: 18px;
  bottom: 18px;
  width: 1px;
  background: linear-gradient(180deg, rgba(34, 211, 238, 0.18), rgba(34, 211, 238, 0.74), rgba(251, 146, 60, 0.28));
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.24);
}

.loop-steps article {
  position: relative;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  color: rgba(226, 242, 255, 0.78);
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  transition: border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.loop-steps article::before {
  content: '';
  position: absolute;
  left: 18px;
  top: 50%;
  z-index: 1;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #67e8f9;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.62);
  transform: translateY(-50%);
}

.loop-steps article:hover,
.loop-steps article.active {
  border-color: rgba(251, 146, 60, 0.4);
  background: rgba(34, 211, 238, 0.07);
  box-shadow: 0 0 24px rgba(34, 211, 238, 0.1);
  transform: translateX(2px);
}

.loop-steps article.active::before {
  background: #fb923c;
  box-shadow: 0 0 18px rgba(251, 146, 60, 0.7);
}

.loop-steps article span {
  position: relative;
  z-index: 2;
  width: 34px;
  color: #67e8f9;
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 900;
  text-align: right;
}

.loop-steps article strong {
  color: rgba(226, 242, 255, 0.82);
  font-size: 15px;
}

.loop-steps article:hover strong,
.loop-steps article.active strong {
  color: #fff;
}

.position-match-panel {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.position-match-panel h3 {
  margin: 0;
  color: #fff;
  font-size: 22px;
}

.position-match-panel article {
  display: grid;
  gap: 8px;
  padding: 8px;
  margin: -8px;
  border-radius: 8px;
  transition: background 0.22s ease, transform 0.22s ease;
}

.position-match-panel article:hover {
  background: rgba(34, 211, 238, 0.06);
  transform: translateX(2px);
}

.position-match-panel article div {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  color: rgba(226, 242, 255, 0.78);
}

.position-match-panel strong {
  color: #67e8f9;
}

.position-match-panel i {
  position: relative;
  display: block;
  height: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.position-match-panel i::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--value);
  border-radius: inherit;
  background: linear-gradient(90deg, #22d3ee, #a78bfa, #fb923c);
  box-shadow: 0 0 18px rgba(251, 146, 60, 0.22);
}

.position-match-panel i::after {
  content: '';
  position: absolute;
  inset: 0;
  width: 42%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.38), transparent);
  animation: homeShimmer 4.8s ease-in-out infinite;
}

@keyframes homeFlowDash {
  to {
    stroke-dashoffset: -160;
  }
}

@keyframes homeOrbitSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes homeFlowLine {
  0% {
    background-position: 0 0, -32% 0;
  }
  55% {
    background-position: 0 0, 78% 0;
  }
  100% {
    background-position: 0 0, 132% 0;
  }
}

@keyframes homeFlowDot {
  0% {
    left: 6%;
    opacity: 0;
  }
  10%,
  86% {
    opacity: 1;
  }
  100% {
    left: calc(94% - 10px);
    opacity: 0;
  }
}

@keyframes homePulseGlow {
  0%,
  100% {
    box-shadow:
      inset 0 0 34px rgba(34, 211, 238, 0.16),
      0 0 42px rgba(34, 211, 238, 0.2);
  }
  50% {
    box-shadow:
      inset 0 0 46px rgba(167, 139, 250, 0.18),
      0 0 58px rgba(34, 211, 238, 0.32);
  }
}

@keyframes homeScanLine {
  0% {
    transform: translateX(-120%);
  }
  58%,
  100% {
    transform: translateX(140%);
  }
}

@keyframes homeShimmer {
  0%,
  42% {
    transform: translateX(-120%);
    opacity: 0;
  }
  58% {
    opacity: 0.7;
  }
  100% {
    transform: translateX(260%);
    opacity: 0;
  }
}

@keyframes homeFloatNode {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes homeOrbitGlow {
  0%,
  100% {
    opacity: 0.58;
  }
  50% {
    opacity: 0.9;
  }
}

@media (max-width: 1440px) {
  .home-dashboard {
    width: min(calc(100vw - 52px), 1388px);
  }

  .home-hero {
    grid-template-columns: minmax(0, 0.92fr) minmax(500px, 0.84fr);
    min-height: 505px;
  }

  .hero-engine {
    width: min(110%, 660px);
    min-height: 470px;
  }

  .module-preview {
    width: 108px;
    height: 88px;
  }
}

@media (max-width: 1180px) {
  .home-nav-links {
    display: none;
  }

  .home-dashboard {
    padding-top: 82px;
  }

  .home-hero,
  .ability-loop-panel {
    grid-template-columns: 1fr;
  }

  .home-hero {
    min-height: auto;
  }

  .hero-copy {
    max-width: 820px;
  }

  .hero-engine {
    width: min(100%, 680px);
    min-height: 430px;
    justify-self: center;
  }

  .home-status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-sync-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .system-flow-track {
    grid-template-columns: repeat(5, minmax(130px, 1fr));
    overflow-x: auto;
    padding-bottom: 8px;
  }

  .architecture-card {
    min-height: 300px;
  }
}

@media (max-width: 860px) {
  .home-top-nav {
    min-height: 68px;
    padding: 0 18px;
  }

  .home-brand strong {
    font-size: 18px;
  }

  .home-brand em {
    display: none;
  }

  .home-dashboard {
    width: min(calc(100vw - 28px), 760px);
    padding-top: 76px;
  }

  .hero-copy h1 {
    font-size: clamp(38px, 12vw, 58px);
  }

  .hero-actions,
  .home-sync-strip,
  .architecture-grid,
  .home-status-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions {
    display: grid;
  }

  .hero-engine {
    min-height: 380px;
    padding: 20px;
  }

  .engine-node {
    width: clamp(92px, 25vw, 130px);
    min-height: 54px;
    font-size: 12px;
  }

  .node-goal {
    top: 8%;
  }

  .node-ability {
    right: 2%;
  }

  .node-knowledge {
    bottom: 8%;
  }

  .node-teaching {
    left: 2%;
  }

  .engine-core {
    width: clamp(150px, 45vw, 210px);
    height: clamp(150px, 45vw, 210px);
  }

  .module-preview {
    position: relative;
    top: auto;
    right: auto;
    order: -1;
    width: 132px;
    height: 92px;
  }

  .architecture-card {
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  #homeEngineOrbit,
  .engine-spokes,
  .engine-particle,
  .engine-core,
  .status-card::after,
  .system-flow-track::before,
  .system-flow-track::after,
  .preview-loop svg,
  .position-match-panel i::after {
    animation: none !important;
  }

  .architecture-card,
  .status-card,
  .engine-node {
    transition: none;
  }
}

.glass-panel {
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.glass-panel:hover {
  border-color: rgba(34, 211, 238, 0.4);
  box-shadow: 0 0 25px rgba(34, 211, 238, 0.15);
  transform: translateY(-4px);
}

.text-gradient {
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(to right, #22d3ee, #34d399);
}

#tsparticles {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);
}

:global(::-webkit-scrollbar) {
  width: 6px;
}

:global(::-webkit-scrollbar-track) {
  background: rgba(0, 0, 0, 0.1);
}

:global(::-webkit-scrollbar-thumb) {
  background: rgba(34, 211, 238, 0.3);
  border-radius: 4px;
}
</style>
