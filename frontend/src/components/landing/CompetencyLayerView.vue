<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Collection,
  DataAnalysis,
  Document,
  Histogram,
  Monitor,
  Reading,
  Search,
  Setting,
  User,
} from '@element-plus/icons-vue'
import { competencyPositionSnapshots } from '@/data/competencyPositionSnapshots'

const props = defineProps({
  dimensions: {
    type: Array,
    default: () => [],
  },
  dimensionDetails: {
    type: Object,
    default: () => ({}),
  },
  jobs: {
    type: Array,
    default: () => [],
  },
  syncMeta: {
    type: Object,
    default: () => ({}),
  },
})

defineEmits(['back-home', 'open-login', 'open-course-goals', 'open-knowledge-map', 'open-teaching-application'])

const activeDimension = ref('')
const activeJob = ref(null)
const activeDimensionDetail = ref(null)
const detailVisible = ref(false)
const dimensionDetailVisible = ref(false)
const carouselPaused = ref(false)
const searchKeyword = ref('')
const cachedJobs = ref([])

let carouselTimer
const JOB_CACHE_KEY = 'ceval-competency-position-snapshots'

const abilityKnowledgeMap = {
  数据分析: {
    description: '图像数组、结构化记录、统计和结果解释能力构建。',
    skills: ['数组处理', '结构化记录', '统计分析', '结果解释', '数据可视化'],
    weakness: '结构化数据处理和结果解释能力需要加强',
    knowledge: ['数组', '结构体', '文件操作'],
    exercises: ['成绩统计系统', '日志分析任务'],
    resources: ['数组综合练习', '结构体案例', '文件操作实验'],
  },
  程序设计: {
    description: '围绕需求拆解、流程控制、函数封装和程序组织形成实现能力。',
    skills: ['流程设计', '函数封装', '模块拆解', '边界处理'],
    weakness: '复杂流程拆解和函数复用意识需要持续训练',
    knowledge: ['分支循环', '函数', '模块化设计'],
    exercises: ['菜单系统设计', '函数重构任务'],
    resources: ['函数专题训练', '模块化案例'],
  },
  调试分析: {
    description: '通过断点跟踪、错误定位和运行状态解释提升问题诊断能力。',
    skills: ['断点调试', '错误定位', '变量跟踪', '日志分析'],
    weakness: '运行过程解释和错误复盘还需要强化',
    knowledge: ['调试工具', '指针', '内存模型'],
    exercises: ['指针错误排查', '内存访问调试'],
    resources: ['调试演示', '错误案例库'],
  },
  算法思维: {
    description: '面向排序、查找、递归和复杂度分析建立算法表达能力。',
    skills: ['查找排序', '递归建模', '复杂度分析', '问题抽象'],
    weakness: '复杂问题抽象和复杂度意识需要提升',
    knowledge: ['数组', '递归', '排序算法'],
    exercises: ['排序性能对比', '递归问题建模'],
    resources: ['算法专题题单', '复杂度讲义'],
  },
  工程质量: {
    description: '关注代码规范、可维护性、边界条件和工程化表达。',
    skills: ['代码规范', '注释表达', '边界测试', '可维护性'],
    weakness: '工程规范和边界测试覆盖不足',
    knowledge: ['工程规范', '文件组织', '测试用例'],
    exercises: ['代码规范重构', '边界测试设计'],
    resources: ['规范模板', '测试案例'],
  },
}

const genericAbilityProfile = {
  skills: ['语法理解', '程序实现', '调试分析', '实践迁移'],
  weakness: '核心知识迁移到实践任务的稳定性需要加强',
  knowledge: ['函数', '数组', '指针'],
  exercises: ['综合编程任务', '错题复盘训练'],
  resources: ['知识点讲义', '实验指导', '题库练习'],
}

const fallbackIcons = [
  Histogram,
  Monitor,
  DataAnalysis,
  Document,
  Search,
  Setting,
  Reading,
  Collection,
  User,
]

const normalizedDimensions = computed(() =>
  props.dimensions.map((item, index) => ({
    ...item,
    count: Number(item.count || (Array.isArray(item.details) ? item.details.length : 0)),
    icon: item.icon || fallbackIcons[index % fallbackIcons.length],
  })),
)

const active = computed(() => {
  return normalizedDimensions.value.find((item) => item.name === activeDimension.value) || normalizedDimensions.value[0] || {}
})

const activeDimensionSkills = computed(() => props.dimensionDetails?.[active.value.name] || [])
const currentDimensionName = computed(() => active.value.name || '')
const backendJobs = computed(() => (Array.isArray(props.jobs) ? props.jobs : []))
const resolvedJobs = computed(() => {
  if (backendJobs.value.length) return backendJobs.value
  if (cachedJobs.value.length) return cachedJobs.value
  return competencyPositionSnapshots
})

const positionDataState = computed(() => {
  const status = props.syncMeta?.status
  if (backendJobs.value.length && status !== 'failed' && status !== 'degraded') {
    return {
      label: '同步正常',
      tone: 'live',
      message: '能力诊断运行中 · 岗位快照已缓存',
    }
  }
  if (backendJobs.value.length || cachedJobs.value.length) {
    return {
      label: '使用缓存',
      tone: 'cache',
      message: '岗位快照同步受限，当前展示最近一次缓存结果。',
    }
  }
  return {
    label: '使用样例数据',
    tone: 'sample',
    message: '岗位快照同步受限，当前展示样例岗位数据。',
  }
})

const positionSourceLabel = computed(() => '来源：BOSS直聘岗位快照')
const maxDimensionCount = computed(() => Math.max(...normalizedDimensions.value.map((item) => item.count || 1), 6))
const averageAbilityScore = computed(() => {
  if (!normalizedDimensions.value.length) return '5.1'
  const total = normalizedDimensions.value.reduce((sum, item) => sum + abilityScore(item), 0)
  return (total / normalizedDimensions.value.length).toFixed(1)
})

function abilityProfile(name) {
  return abilityKnowledgeMap[name] || {
    ...genericAbilityProfile,
    description: normalizedDimensions.value.find((item) => item.name === name)?.desc || '围绕 C 语言学习任务形成可迁移的综合能力。',
  }
}

function abilityScore(item) {
  const value = Number(item?.score || item?.level || item?.count || 1)
  return Math.max(1, Math.min(6, Math.round((value / maxDimensionCount.value) * 6)))
}

function jobMatch(job, index = 0) {
  const explicit = Number(job?.match || job?.matchScore || job?.score || 0)
  if (explicit) return Math.max(58, Math.min(98, explicit))
  const title = `${job?.title || ''}${job?.skill || ''}${job?.description || ''}`
  if (/linux|c\+\+|系统|嵌入/i.test(title)) return 92
  if (/物联网|iot|嵌入/i.test(title)) return 86
  if (/测试|质量|qa/i.test(title)) return 78
  return Math.max(72, 90 - index * 4)
}

const overviewMetrics = computed(() => [
  { value: String(normalizedDimensions.value.length || 9).padStart(2, '0'), label: '一级能力维度' },
  {
    value: String(normalizedDimensions.value.reduce((sum, item) => sum + Number(item.count || 0), 0) || 46).padStart(2, '0'),
    label: '技能明细',
  },
  { value: String(props.syncMeta?.jobCount || resolvedJobs.value.length || 8).padStart(2, '0'), label: '岗位快照' },
  { value: averageAbilityScore.value, label: '综合能力均值' },
])

const enhancedDimensions = computed(() =>
  normalizedDimensions.value.map((item) => {
    const profile = abilityProfile(item.name)
    const relatedJobs = resolvedJobs.value.filter((job) => job.dimension === item.name)
    return {
      ...item,
      description: profile.description || item.desc,
      skills: profile.skills,
      score: abilityScore(item),
      relatedJobCount: relatedJobs.length || Math.min(3, Math.max(1, Math.ceil((item.count || 1) / 2))),
    }
  }),
)

const activeEnhancedDimension = computed(
  () => enhancedDimensions.value.find((item) => item.name === activeDimension.value) || enhancedDimensions.value[0] || {},
)

const activeProfile = computed(() => abilityProfile(activeEnhancedDimension.value.name))

const activeSummary = computed(() => ({
  name: activeEnhancedDimension.value.name || '数据分析',
  score: activeEnhancedDimension.value.score || 5,
  maxScore: 6,
  skillCount: activeEnhancedDimension.value.count || activeProfile.value.skills?.length || 5,
  jobCount: activeEnhancedDimension.value.relatedJobCount || 3,
  suggestion: activeProfile.value.weakness || genericAbilityProfile.weakness,
  knowledge: activeProfile.value.knowledge || genericAbilityProfile.knowledge,
}))

const syncStatusLabel = computed(() => {
  if (positionDataState.value.label) return positionDataState.value.label
  switch (props.syncMeta?.status) {
    case 'success':
      return '同步正常'
    case 'degraded':
      return '同步降级'
    case 'failed':
      return '同步失败'
    case 'running':
      return '同步中'
    case 'seeded':
      return '初始化快照'
    default:
      return '待同步'
  }
})

const syncTimeLabel = computed(() => props.syncMeta?.lastSuccessAt || props.syncMeta?.lastAttemptAt || '等待首次同步')

function loadCachedJobs() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(JOB_CACHE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    cachedJobs.value = Array.isArray(parsed) ? parsed : []
  } catch {
    cachedJobs.value = []
  }
}

function cacheBackendJobs(jobs) {
  if (typeof window === 'undefined' || !Array.isArray(jobs) || jobs.length === 0) return
  cachedJobs.value = jobs
  window.localStorage.setItem(JOB_CACHE_KEY, JSON.stringify(jobs))
}

function jobScore(job, keyword) {
  let score = 0

  if (currentDimensionName.value && job.dimension === currentDimensionName.value) {
    score += 1000
  }

  if (!keyword) return score

  const title = String(job.title || '').toLowerCase()
  const skill = String(job.skill || '').toLowerCase()
  const description = String(job.description || '').toLowerCase()
  const company = String(job.company || '').toLowerCase()
  const tags = Array.isArray(job.tags) ? job.tags.join(' ').toLowerCase() : ''

  if (title.includes(keyword)) score += 300
  if (skill.includes(keyword)) score += 220
  if (tags.includes(keyword)) score += 160
  if (company.includes(keyword)) score += 100
  if (description.includes(keyword)) score += 80

  return score
}

const radarPoints = computed(() => {
  if (!normalizedDimensions.value.length) return ''
  const center = 50
  const maxRadius = 31
  return enhancedDimensions.value
    .map((item, index) => {
      const angle = -90 + (360 / enhancedDimensions.value.length) * index
      const radius = (abilityScore(item) / 6) * maxRadius
      const rad = (Math.PI / 180) * angle
      return `${center + Math.cos(rad) * radius},${center + Math.sin(rad) * radius}`
    })
    .join(' ')
})

const radarNodePoints = computed(() => {
  const center = 50
  const maxRadius = 31
  return enhancedDimensions.value.map((item, index) => {
    const angle = -90 + (360 / enhancedDimensions.value.length) * index
    const radius = (abilityScore(item) / 6) * maxRadius
    const rad = (Math.PI / 180) * angle
    return {
      name: item.name,
      x: center + Math.cos(rad) * radius,
      y: center + Math.sin(rad) * radius,
    }
  })
})

const filteredJobs = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return [...resolvedJobs.value]
    .filter((job) => {
      const inDimension = !active.value.name || job.dimension === active.value.name
      const searchText = [
        job.title,
        job.skill,
        job.location,
        job.company,
        job.description,
        ...(Array.isArray(job.tags) ? job.tags : []),
      ]
        .join(' ')
        .toLowerCase()
      return inDimension && (!keyword || searchText.includes(keyword))
    })
    .sort((left, right) => {
      const scoreDiff = jobScore(right, keyword) - jobScore(left, keyword)
      if (scoreDiff !== 0) return scoreDiff
      return String(left.title || '').localeCompare(String(right.title || ''), 'zh-CN')
    })
})

const activePositionMatches = computed(() => {
  const jobs = filteredJobs.value.length
    ? filteredJobs.value
    : resolvedJobs.value.filter((job) => !active.value.name || job.dimension === active.value.name)
  const source = jobs.length ? jobs : resolvedJobs.value
  return source.slice(0, 4).map((job, index) => ({
    ...job,
    match: jobMatch(job, index),
    relatedAbilities: [job.dimension || activeSummary.value.name, '程序设计', '工程质量'].filter(Boolean),
    skillTags: String(job.skill || '')
      .split(/[、,，/ ]+/)
      .filter(Boolean)
      .slice(0, 4),
  }))
})

const mappingSkills = computed(() => {
  const detailSkills = activeDimensionSkills.value.map((item) => item.title || item.name).filter(Boolean)
  return [...new Set([...(activeProfile.value.skills || []), ...detailSkills])].slice(0, 6)
})

const improvementCards = computed(() => [
  { icon: '!', label: '薄弱点', value: activeProfile.value.weakness || genericAbilityProfile.weakness },
  { icon: '#', label: '推荐知识点', value: (activeProfile.value.knowledge || genericAbilityProfile.knowledge).join(' / ') },
  { icon: 'T', label: '推荐练习', value: (activeProfile.value.exercises || genericAbilityProfile.exercises).join(' / ') },
  { icon: 'R', label: '推荐资源', value: (activeProfile.value.resources || genericAbilityProfile.resources).join(' / ') },
])

const dimensionDetailSkills = computed(() => {
  if (activeDimensionSkills.value.length) return activeDimensionSkills.value
  return (activeProfile.value.skills || genericAbilityProfile.skills).map((skill) => ({
    title: skill,
    text: `${skill} 是“${activeSummary.value.name}”维度下的关键技能，可结合推荐知识点、练习任务和学习资源进行补强。`,
  }))
})

const jobsEmptyText = computed(() => {
  const keyword = searchKeyword.value.trim()
  if (keyword) {
    return `当前维度“${currentDimensionName.value || '全部'}”下没有匹配“${keyword}”的岗位结果。`
  }
  if (currentDimensionName.value) {
    return `当前维度“${currentDimensionName.value}”暂无岗位推荐。`
  }
  return '当前筛选条件下暂无岗位推荐。'
})

function selectDimension(item, openDetail = false) {
  activeDimension.value = item.name
  carouselPaused.value = true
  if (openDetail) {
    activeDimensionDetail.value = item
    dimensionDetailVisible.value = true
  }
}

function openJob(job) {
  activeJob.value = job
  detailVisible.value = true
}

function startCarousel() {
  stopCarousel()
  carouselTimer = window.setInterval(() => {
    if (carouselPaused.value || detailVisible.value || dimensionDetailVisible.value || normalizedDimensions.value.length === 0) return
    const currentIndex = normalizedDimensions.value.findIndex((item) => item.name === activeDimension.value)
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % normalizedDimensions.value.length : 0
    activeDimension.value = normalizedDimensions.value[nextIndex].name
  }, 3200)
}

function stopCarousel() {
  if (carouselTimer) {
    window.clearInterval(carouselTimer)
    carouselTimer = undefined
  }
}

watch(
  normalizedDimensions,
  (items) => {
    if (!items.length) return
    if (!items.some((item) => item.name === activeDimension.value)) {
      activeDimension.value = items.find((item) => item.name === '数据分析')?.name || items[0].name
    }
  },
  { immediate: true },
)

watch(
  () => props.dimensionDetails,
  (details) => {
    if (!details || typeof details !== 'object') return
    normalizedDimensions.value.forEach((item) => {
      const actualCount = Array.isArray(details[item.name]) ? details[item.name].length : 0
      if (actualCount !== Number(item.count || 0)) {
        console.warn(`[CompetencyLayerView] ${item.name} count mismatch: expected ${item.count}, actual ${actualCount}`)
      }
    })
  },
  { immediate: true, deep: true },
)

watch(
  backendJobs,
  (jobs) => {
    cacheBackendJobs(jobs)
  },
  { immediate: true },
)

onMounted(() => {
  loadCachedJobs()
  startCarousel()
})

onUnmounted(() => {
  stopCarousel()
})
</script>

<template>
  <section class="competency-shell">
    <header class="landing-nav landing-nav--subpage">
      <button type="button" class="landing-brand" @click="$emit('back-home')">
        <span class="landing-brand-mark">C</span>
        <span class="landing-brand-copy">
          <strong>C语言智能学习系统</strong>
        </span>
      </button>

      <nav class="landing-nav-items" aria-label="能力素养层导航">
        <button type="button" class="landing-nav-item" @click="$emit('back-home')">
          <span>首页</span>
        </button>
        <button type="button" class="landing-nav-item" @click="$emit('open-course-goals')">
          <span>课程目标层</span>
        </button>
        <button type="button" class="landing-nav-item active">
          <span>能力素养层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="$emit('open-knowledge-map')">
          <span>学科知识层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="$emit('open-teaching-application')">
          <span>教学应用层</span>
        </button>
      </nav>

      <div class="landing-nav-actions">
        <button type="button" class="landing-back-pill" @click="$emit('back-home')">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回首页</span>
        </button>
        <button type="button" class="landing-login-trigger" aria-label="登录" @click="$emit('open-login', 'login')">
          <el-icon><User /></el-icon>
        </button>
      </div>
    </header>

    <main class="competency-page">
      <section class="competency-hero-panel">
        <div class="competency-hero-copy">
          <p>ABILITY LITERACY LAYER</p>
          <h1>能力素养层</h1>
          <h2>能力维度、技能明细与岗位映射</h2>
          <span>
            围绕 C 语言学习过程中的语法理解、程序设计、调试分析、算法思维、工程质量等能力，构建课程能力素养框架，并与岗位需求和学习补强路径联动。
          </span>
          <div class="competency-status-chip" :class="`is-${positionDataState.tone}`">
            <i></i>
            <strong>{{ positionDataState.message }}</strong>
          </div>
        </div>
        <div class="competency-metric-grid">
          <article v-for="metric in overviewMetrics" :key="metric.label" class="competency-metric-card">
            <strong>{{ metric.value }}</strong>
            <span>{{ metric.label }}</span>
          </article>
        </div>
      </section>

      <section class="competency-overview-grid">
        <article class="competency-panel competency-radar-panel">
          <div class="competency-panel-title-row">
            <div>
              <p class="competency-section-kicker">ABILITY DIAGNOSIS ENGINE</p>
              <h2>能力诊断引擎</h2>
            </div>
            <button type="button" class="competency-ghost-button" @click="carouselPaused = !carouselPaused">
              {{ carouselPaused ? '继续轮播' : '暂停轮播' }}
            </button>
          </div>

          <div class="competency-radar-box">
            <svg class="competency-radar-svg" viewBox="0 0 100 100" role="img" aria-label="能力维度雷达图">
              <polygon points="50,11 75.1,20.1 88.6,43.6 83.9,70.5 63.5,88.1 36.5,88.1 16.1,70.5 11.4,43.6 24.9,20.1" class="competency-grid-line" />
              <polygon points="50,20 69.3,27 79.7,45 76.1,65.8 60.4,79.4 39.6,79.4 23.9,65.8 20.3,45 30.7,27" class="competency-grid-line" />
              <polygon points="50,30 64.5,35.2 72.3,48.7 69.6,64.3 57.8,74.5 42.2,74.5 30.4,64.3 27.7,48.7 35.5,35.2" class="competency-grid-line" />
              <polygon points="50,40 59.6,43.5 64.8,52.5 63,62.9 55.2,69.6 44.8,69.6 37,62.9 35.2,52.5 40.4,43.5" class="competency-grid-line" />
              <line x1="50" y1="50" x2="50" y2="11" class="competency-grid-line" />
              <line x1="50" y1="50" x2="88.6" y2="43.6" class="competency-grid-line" />
              <line x1="50" y1="50" x2="83.9" y2="70.5" class="competency-grid-line" />
              <line x1="50" y1="50" x2="63.5" y2="88.1" class="competency-grid-line" />
              <line x1="50" y1="50" x2="36.5" y2="88.1" class="competency-grid-line" />
              <line x1="50" y1="50" x2="16.1" y2="70.5" class="competency-grid-line" />
              <line x1="50" y1="50" x2="11.4" y2="43.6" class="competency-grid-line" />
              <line x1="50" y1="50" x2="24.9" y2="20.1" class="competency-grid-line" />
              <line x1="50" y1="50" x2="75.1" y2="20.1" class="competency-grid-line" />
              <polygon v-if="radarPoints" :points="radarPoints" class="competency-radar-area" />
              <polyline v-if="radarPoints" :points="`${radarPoints} ${radarPoints.split(' ')[0]}`" class="competency-radar-line" />
              <circle
                v-for="point in radarNodePoints"
                :key="point.name"
                :cx="point.x"
                :cy="point.y"
                :class="['competency-radar-dot', { active: point.name === activeDimension }]"
                r="1.8"
              />
            </svg>

            <button
              v-for="(item, index) in enhancedDimensions"
              :key="item.name"
              type="button"
              :class="['competency-radar-label', { active: item.name === activeDimension }]"
              :style="{ '--angle': `${index * (360 / enhancedDimensions.length) - 90}deg` }"
              @mouseenter="selectDimension(item)"
              @focus="selectDimension(item)"
              @click="selectDimension(item)"
            >
              <span>{{ item.name }}</span>
              <strong>{{ item.score }}/6</strong>
            </button>
          </div>

          <div class="competency-active-summary">
            <strong>当前维度：{{ activeSummary.name }}</strong>
            <span>能力评分：{{ activeSummary.score }} / {{ activeSummary.maxScore }}</span>
            <span>关联技能：{{ activeSummary.skillCount }} 项</span>
            <span>岗位关联：{{ activeSummary.jobCount }} 个</span>
            <p>补强建议：{{ activeSummary.suggestion }}</p>
            <div class="competency-summary-tags" aria-label="推荐知识点">
              <span>推荐知识点</span>
              <em v-for="tag in activeSummary.knowledge" :key="tag">{{ tag }}</em>
            </div>
          </div>
        </article>

        <article class="competency-panel competency-index-panel">
          <div class="competency-panel-title-row">
            <div>
              <p class="competency-section-kicker">ABILITY DIMENSION INDEX</p>
              <h2>能力维度索引</h2>
            </div>
          </div>

          <div class="competency-dimension-list">
            <button
              v-for="item in enhancedDimensions"
              :key="item.name"
              type="button"
              :class="['competency-dimension-card', { active: item.name === activeDimension }]"
              @click="selectDimension(item)"
            >
              <span class="competency-dimension-icon" :style="{ background: item.color }">
                <el-icon><component :is="item.icon" /></el-icon>
              </span>
              <span class="competency-dimension-copy">
                <strong>{{ item.name }}</strong>
                <small>{{ item.description }}</small>
              </span>
              <span class="competency-dimension-stats">
                <em
                  class="dimension-skill-trigger"
                  role="button"
                  tabindex="0"
                  title="查看技能详情"
                  @click.stop="selectDimension(item, true)"
                  @keydown.enter.stop.prevent="selectDimension(item, true)"
                  @keydown.space.stop.prevent="selectDimension(item, true)"
                >
                  {{ item.count }} 项技能
                </em>
                <em>评分 {{ item.score }} / 6</em>
                <em>岗位关联 {{ item.relatedJobCount }}</em>
              </span>
              <el-icon class="dimension-detail-arrow" @click.stop="selectDimension(item, true)"><ArrowRight /></el-icon>
            </button>
          </div>
        </article>
      </section>

      <section class="competency-panel competency-mapping-panel">
        <div class="competency-panel-title-row">
          <div>
            <p class="competency-section-kicker">ABILITY TO POSITION MAPPING</p>
            <h2>能力到岗位映射链路</h2>
          </div>
        </div>

        <div class="competency-mapping-flow">
          <svg class="mapping-flow-svg" viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true">
            <path class="mapping-flow-path" d="M245 130 C330 70 395 70 480 130" />
            <path class="mapping-flow-path mapping-flow-path--alt" d="M520 130 C610 190 690 190 775 130" />
            <circle r="6" class="mapping-flow-dot">
              <animateMotion dur="6s" repeatCount="indefinite" path="M245 130 C330 70 395 70 480 130" />
            </circle>
            <circle r="5" class="mapping-flow-dot mapping-flow-dot--alt">
              <animateMotion dur="6s" begin="-3s" repeatCount="indefinite" path="M520 130 C610 190 690 190 775 130" />
            </circle>
          </svg>
          <article class="mapping-column mapping-ability">
            <span>能力维度</span>
            <strong>{{ activeSummary.name }}</strong>
            <p>{{ activeEnhancedDimension.description }}</p>
          </article>
          <div class="mapping-connector" aria-hidden="true"><i></i></div>
          <article class="mapping-column mapping-skills">
            <span>技能明细</span>
            <div class="mapping-skill-tags">
              <em v-for="skill in mappingSkills" :key="skill">{{ skill }}</em>
            </div>
          </article>
          <div class="mapping-connector" aria-hidden="true"><i></i></div>
          <article class="mapping-column mapping-positions">
            <span>岗位需求</span>
            <div v-for="job in activePositionMatches.slice(0, 3)" :key="job.id || job.title" class="mapping-position-row">
              <strong>{{ job.title }}</strong>
              <small>{{ job.match }}%</small>
              <i :style="{ '--value': `${job.match}%` }"></i>
            </div>
          </article>
        </div>
      </section>

      <section class="competency-improvement-section">
        <div class="competency-panel-title-row">
          <div>
            <p class="competency-section-kicker">LEARNING IMPROVEMENT SUGGESTIONS</p>
            <h2>学习补强建议</h2>
          </div>
        </div>
        <div class="competency-improvement-grid">
          <article v-for="card in improvementCards" :key="card.label" class="competency-improvement-card">
            <i>{{ card.icon }}</i>
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
          </article>
        </div>
      </section>

      <section class="competency-panel competency-jobs-panel">
        <div class="competency-panel-title-row">
          <div>
            <p class="competency-section-kicker">C POSITION MATCHING</p>
            <h2>C语言岗位推荐</h2>
            <p class="competency-jobs-caption">
              {{ positionSourceLabel }} · 状态：{{ syncStatusLabel }} · 最近成功同步：{{ syncTimeLabel }}
              <span v-if="positionDataState.tone !== 'live'"> · {{ positionDataState.message }}</span>
            </p>
          </div>
          <div class="competency-sync-badges">
            <span class="competency-sync-badge">岗位数 {{ syncMeta.jobCount || resolvedJobs.length }}</span>
            <span class="competency-sync-badge">{{ positionDataState.label }}</span>
          </div>
        </div>

        <div class="competency-dimension-tabs">
          <button
            v-for="item in normalizedDimensions"
            :key="item.name"
            type="button"
            :class="{ active: item.name === activeDimension }"
            @click="selectDimension(item)"
          >
            {{ item.name }}
          </button>
        </div>

        <div class="competency-job-toolbar">
          <strong>当前维度：{{ active.name || '全部' }}</strong>
          <label>
            <span class="sr-only">搜索岗位、技能、城市或公司</span>
            <input v-model="searchKeyword" type="search" placeholder="搜索岗位、技能、城市或公司" />
          </label>
        </div>

        <div class="competency-job-card-grid" aria-label="岗位推荐卡片">
          <button
            v-for="job in activePositionMatches"
            :key="job.id || job.title"
            type="button"
            class="competency-job-card"
            @click="openJob(job)"
          >
            <div class="job-card-head">
              <span>
                <strong>{{ job.title }}</strong>
                <small>{{ job.location || '远程/不限' }} · {{ job.sourcePlatform || 'BOSS直聘' }}</small>
              </span>
              <em>{{ job.match }}%</em>
            </div>
            <i class="job-match-bar" :style="{ '--value': `${job.match}%` }"></i>
            <p>关联能力：{{ job.relatedAbilities.join('、') }}</p>
            <div class="job-skill-tags">
              <span v-for="tag in job.skillTags" :key="tag">{{ tag }}</span>
            </div>
            <p>{{ job.description }}</p>
          </button>

          <p v-if="activePositionMatches.length === 0" class="competency-job-empty">{{ jobsEmptyText }}</p>
        </div>
      </section>
    </main>

    <div v-if="dimensionDetailVisible" class="landing-modal-overlay" @click.self="dimensionDetailVisible = false">
      <section class="landing-detail-dialog" aria-labelledby="dimension-detail-title">
        <div class="landing-detail-header">
          <h3 id="dimension-detail-title">{{ activeDimensionDetail?.name }}</h3>
          <button type="button" aria-label="关闭维度详情" @click="dimensionDetailVisible = false">×</button>
        </div>
        <div class="landing-detail-body">
          <p>{{ activeDimensionDetail?.description || activeDimensionDetail?.desc }}</p>
          <div class="landing-detail-list">
            <p v-for="skill in dimensionDetailSkills" :key="skill.title">
              <strong>{{ skill.title }}：</strong>
              <span>{{ skill.text }}</span>
            </p>
          </div>
        </div>
      </section>
    </div>

    <div v-if="detailVisible" class="landing-modal-overlay" @click.self="detailVisible = false">
      <section class="landing-detail-dialog" aria-labelledby="job-detail-title">
        <div class="landing-detail-header">
          <h3 id="job-detail-title">{{ activeJob?.title }}</h3>
          <button type="button" aria-label="关闭岗位详情" @click="detailVisible = false">×</button>
        </div>
        <div class="landing-detail-body">
          <p class="landing-detail-meta">
            {{ activeJob?.company }} · {{ activeJob?.location }} · {{ activeJob?.salary }} · {{ activeJob?.experience }} · {{ activeJob?.education }}
          </p>
          <p v-if="activeJob?.sourcePlatform" class="landing-detail-meta">
            来源：{{ activeJob?.sourcePlatform }}<span v-if="activeJob?.sourceUpdatedAt"> · {{ activeJob?.sourceUpdatedAt }}</span>
          </p>
          <p>{{ activeJob?.description }}</p>
          <div class="landing-detail-tags">
            <span v-for="tag in activeJob?.tags || []" :key="tag">{{ tag }}</span>
          </div>
          <p><strong>技能摘要：</strong>{{ activeJob?.skill }}</p>
          <p v-if="activeJob?.sourceUrl" class="landing-detail-link">
            <a :href="activeJob.sourceUrl" target="_blank" rel="noreferrer">打开来源岗位</a>
          </p>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped src="@/styles/competency-layer-view.css"></style>


