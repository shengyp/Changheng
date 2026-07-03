<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ChatDotRound,
  DataAnalysis,
  Delete,
  Document,
  Refresh,
  TrendCharts,
  View,
} from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import { learningApi } from '@/api/services'
import {
  buildFallbackReport,
  buildTrendPath,
  clamp,
  dimensionMeta,
  levelText,
  normalizeTrend,
  radarPoint,
  recordTypeText,
  scoreRadarPoint,
} from '@/features/knowledge-profile/profileReport'
import {
  formatStudentRecordForDisplay,
  parseAssistantDetail,
  sanitizeStudentText,
} from '@/features/knowledge-profile/profileRecords'
import { useStudentAssistantStore } from '@/stores/studentAssistant'

const router = useRouter()
const assistant = useStudentAssistantStore()

const pageRef = ref(null)
const radarPolygonRef = ref(null)
const loading = ref(false)
const refreshing = ref(false)
const selectedDimension = ref('知识基础')
const activeRecord = ref(null)
const detailOpen = ref(false)
const recordFilter = ref('all')
const diagnosticTab = ref('dimension')
const scoringSourceFilter = ref('all')
const evidenceExpanded = ref(false)
const report = ref(buildFallbackReport())

const PROFILE_REPORT_CACHE_KEY = 'knowledge-profile-report-cache'
const PROFILE_RECORD_DELETED_KEY = 'knowledge-profile-record-deleted'
const deletedRecordKeys = ref([])

let gsapContext = null
let mediaContext = null
let refreshTimer = null

const summaryCards = computed(() => {
  const summary = report.value.summary || {}
  const latest = latestAttemptRecord.value
  return [
    { label: '综合画像分', value: summary.profileScore ?? 0, suffix: '', hint: '综合诊断', icon: View },
    { label: '薄弱维度', value: weakestDimensions.value[0]?.name || '知识基础', suffix: '', hint: `${weakestDimensions.value[0]?.score ?? 0} 分`, icon: DataAnalysis },
    { label: '优势维度', value: strongestDimension.value?.name || '协作表达', suffix: '', hint: `${strongestDimension.value?.score ?? 0} 分`, icon: TrendCharts },
    {
      label: '最近测评',
      value: latest?.score !== null && latest?.score !== undefined ? latest.score : '待补充',
      suffix: latest?.score !== null && latest?.score !== undefined ? '分' : '',
      hint: latest?.title || '完成作答后更新',
      icon: Document,
    },
    { label: '推荐任务', value: Math.max(weakestDimensions.value.length, 1), suffix: '项', hint: '按薄弱维度生成', icon: ChatDotRound },
  ]
})

const radarDimensions = computed(() => {
  const source = Array.isArray(report.value.radar) && report.value.radar.length
    ? report.value.radar
    : buildFallbackReport().radar
  return source.map((item) => ({
    ...item,
    score: clamp(Number(item.score) || 0, 0, 100),
    ...(dimensionMeta[item.name] || { color: '#64748b', desc: '持续收集数据中。', action: '继续完成学习任务。' }),
  }))
})

const activeDimension = computed(() => {
  return radarDimensions.value.find((item) => item.name === selectedDimension.value) || radarDimensions.value[0]
})

const strongestDimension = computed(() => [...radarDimensions.value].sort((a, b) => b.score - a.score)[0])
const weakestDimensions = computed(() => [...radarDimensions.value].sort((a, b) => a.score - b.score).slice(0, 3))
const radarSummaryCards = computed(() => [
  {
    label: '薄弱点',
    value: weakestDimensions.value[0]?.name || '知识基础',
    text: weakestDimensions.value[0]?.action || '先补齐低掌握知识点。',
    tone: 'risk',
  },
  {
    label: '优势点',
    value: strongestDimension.value?.name || '协作表达',
    text: '保留当前优势维度的训练频率，用它带动复盘和表达。',
    tone: 'strength',
  },
  {
    label: '下一步',
    value: '专项补强',
    text: weakestDimensions.value.slice(0, 2).map((item) => item.name).join('、') || '完成一次针对性练习',
    tone: 'advice',
  },
])
const insights = computed(() => {
  const list = Array.isArray(report.value.insights) ? report.value.insights : []
  const generated = [
    {
      type: 'risk',
      title: `优先补强 ${weakestDimensions.value[0]?.name || '知识基础'}`,
      description: weakestDimensions.value[0]?.action || '完成一次练习后系统会给出更准确建议。',
      priority: '高优先级',
    },
    {
      type: 'strength',
      title: `${strongestDimension.value?.name || '协作表达'}较稳定`,
      description: `当前得分 ${strongestDimension.value?.score ?? 0}，可作为后续迁移、讲解和复盘表达的支点。`,
      priority: '保持',
    },
    {
      type: 'attempt',
      title: '最近作答已纳入画像',
      description: latestAttemptRecord.value
        ? `${latestAttemptRecord.value.title} 已计入得分趋势和能力分布。`
        : '完成试卷或练习后，系统会自动更新画像依据。',
      priority: '已更新',
    },
    {
      type: 'assistant',
      title: '小C对话持续更新画像',
      description: `${recordStats.value.assistant} 条小C互动会影响学习路径、资源筛选和复盘建议。`,
      priority: '持续采集',
    },
    {
      type: 'advice',
      title: '系统建议',
      description: `建议优先复习 ${weakestDimensions.value.map((item) => item.name).join('、') || '知识基础'}，并完成对应练习。`,
      priority: '下一步',
    },
  ]
  if (!list.length) return generated
  return [...list.slice(0, 3).map((item) => ({ ...item, description: sanitizeStudentText(item.description), priority: item.priority || '诊断' })), ...generated.slice(1, 4)]
})

const trendPoints = computed(() => normalizeTrend(report.value.scoreTrend || []))
const trendPath = computed(() => buildTrendPath(trendPoints.value))
const trendAreaPath = computed(() => {
  if (!trendPath.value) return ''
  const last = trendPoints.value[trendPoints.value.length - 1]
  const first = trendPoints.value[0]
  if (!first || !last) return ''
  return `${trendPath.value} L ${last.x} 180 L ${first.x} 180 Z`
})
const trendSummary = computed(() => {
  const raw = Array.isArray(report.value.scoreTrend) ? report.value.scoreTrend.slice(-5) : []
  const scores = raw.map((item) => clamp(Number(item.score) || 0, 0, 100))
  const first = scores[0] ?? 0
  const latest = scores[scores.length - 1] ?? 0
  const highest = scores.length ? Math.max(...scores) : 0
  const delta = latest - first
  const weak = weakestDimensions.value[0]?.name || '知识基础'
  const trend = delta > 3 ? '上升' : delta < -3 ? '下降' : '平稳'
  return {
    trend,
    highest,
    latest,
    delta,
    reason: trend === '下降'
      ? `最近一次测评表现回落，主要拉低 ${weak} 与理解迁移相关判断。`
      : trend === '上升'
        ? `最近作答表现改善，${strongestDimension.value?.name || '优势维度'}正在稳定支撑画像。`
        : `最近画像分波动不大，建议继续补充 ${weak} 的练习证据。`,
    advice: trend === '下降'
      ? '优先复盘错题并完成知识基础补强练习。'
      : `继续围绕 ${weak} 完成专项练习和小C复盘。`,
  }
})

const scoringVariants = computed(() => {
  const analysis = report.value.scoringItemAnalysis || buildFallbackReport().scoringItemAnalysis
  return analysis?.variants || { all: analysis }
})

const activeScoringAnalysis = computed(() => {
  return scoringVariants.value?.[scoringSourceFilter.value] || scoringVariants.value?.all || buildFallbackReport().scoringItemAnalysis
})

const scoringItems = computed(() => {
  return Array.isArray(activeScoringAnalysis.value?.items) ? activeScoringAnalysis.value.items : []
})

const scoringRadarGrid = computed(() => [0.25, 0.5, 0.75, 1].map((scale) => {
  return scoringItems.value.map((_, index) => {
    const point = scoreRadarPoint(102 * scale, index, scoringItems.value.length)
    return `${point.x},${point.y}`
  }).join(' ')
}))

const scoringRadarAxis = computed(() => scoringItems.value.map((_, index) => scoreRadarPoint(102, index, scoringItems.value.length)))
const scoringRadarPoints = computed(() => scoringItems.value.map((item, index) => ({
  ...item,
  scoreRate: clamp(Number(item.scoreRate) || 0, 0, 100),
  ...scoreRadarPoint((102 * clamp(Number(item.scoreRate) || 0, 0, 100)) / 100, index, scoringItems.value.length),
})))
const scoringRadarPolygon = computed(() => scoringRadarPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
const scoringRadarLabels = computed(() => scoringItems.value.map((item, index) => ({
  ...item,
  ...scoreRadarPoint(122, index, scoringItems.value.length),
  anchor: index === 0 ? 'middle' : index > 0 && index < scoringItems.value.length / 2 ? 'start' : 'end',
})))
const diagnosisSummary = computed(() => {
  const items = scoringItems.value.length
    ? scoringItems.value.map((item) => ({ name: item.name, score: clamp(Number(item.scoreRate) || 0, 0, 100) }))
    : radarDimensions.value.map((item) => ({ name: item.name, score: item.score }))
  const best = [...items].sort((a, b) => b.score - a.score)[0]
  const weak = [...items].sort((a, b) => a.score - b.score)[0]
  return {
    best: best?.name || strongestDimension.value?.name || '计算思维',
    weak: weak?.name || weakestDimensions.value[0]?.name || '边缘情况考虑',
    advice: `优先完成 ${weakestDimensions.value.slice(0, 3).map((item) => item.name).join('、') || '数组与字符串、分支循环、变量与数据类型'} 相关练习。`,
  }
})

const filteredRecords = computed(() => {
  const records = Array.isArray(report.value.records) ? report.value.records : []
  const visible = records.filter((item) => !deletedRecordKeys.value.includes(recordKey(item)))
  if (recordFilter.value === 'all') return visible
  return visible.filter((item) => item.type === recordFilter.value)
})
const evidenceRecords = computed(() => filteredRecords.value.map(displayRecord))
const visibleEvidenceRecords = computed(() => evidenceExpanded.value ? evidenceRecords.value : evidenceRecords.value.slice(0, 5))

const recordTabs = [
  { label: '全部', value: 'all' },
  { label: '试卷记录', value: 'exam' },
  { label: '练习题记录', value: 'practice' },
  { label: '小C对话', value: 'assistant' },
]

const currentRecordTabLabel = computed(() => {
  return recordTabs.find((tab) => tab.value === recordFilter.value)?.label || '全部'
})

const recordStats = computed(() => {
  const records = Array.isArray(report.value.records) ? report.value.records : []
  return {
    all: records.length,
    exam: records.filter((item) => item.type === 'exam').length,
    practice: records.filter((item) => item.type === 'practice').length,
    assistant: records.filter((item) => item.type === 'assistant').length,
  }
})

const latestAttemptRecord = computed(() => {
  const source = filteredRecords.value.find((item) => item.type === 'exam' || item.type === 'practice')
    || (Array.isArray(report.value.records) ? report.value.records.find((item) => item.type === 'exam' || item.type === 'practice') : null)
  return source ? displayRecord(source) : null
})

const latestAssistantRecord = computed(() => {
  const source = filteredRecords.value.find((item) => item.type === 'assistant')
    || (Array.isArray(report.value.records) ? report.value.records.find((item) => item.type === 'assistant') : null)
  return source ? displayRecord(source) : null
})
const evidenceAdvice = computed(() => {
  const weak = weakestDimensions.value[0]?.name || '知识基础'
  if (latestAttemptRecord.value && latestAssistantRecord.value) {
    return `结合最近作答和小C对话，建议优先完成 ${weak} 专项练习。`
  }
  return `继续补充作答记录和小C复盘，让系统更准确判断 ${weak} 的补强路径。`
})
const profileSyncStatus = computed(() => {
  const updatedAt = report.value.summary?.updatedAt || latestAssistantRecord.value?.time || latestAttemptRecord.value?.time || '等待数据'
  if (refreshing.value) {
    return {
      label: '画像更新中',
      text: '正在根据最新记录重新计算画像',
      updatedAt,
      tone: 'syncing',
    }
  }
  if (recordStats.value.all > 0) {
    return {
      label: '画像已同步',
      text: '最近记录已纳入画像分析',
      updatedAt,
      tone: 'synced',
    }
  }
  return {
    label: '等待更新',
    text: '完成作答或小C对话后更新画像',
    updatedAt,
    tone: 'pending',
  }
})

const profileNarrative = computed(() => {
  const strong = strongestDimension.value
  const weak = weakestDimensions.value[0]
  return `当前画像显示，${strong?.name || '学习能力'}相对稳定，${weak?.name || '知识基础'}需要优先关注。系统会持续结合最新作答和小C对话记录更新判断。`
})

const activeAssistantQa = computed(() => parseAssistantDetail(activeRecord.value))

watch(recordFilter, () => {
  evidenceExpanded.value = false
})

async function loadReport(options = {}) {
  if (options.silent) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  try {
    const data = await learningApi.profileReport()
    report.value = normalizeReport(data)
    persistReport()
    if (options.animate !== false) {
      await nextTick()
      animateRefresh()
    }
  } catch (error) {
    if (!options.silent) {
      ElMessage.warning(error.message || '画像报告暂时无法加载，已使用本地演示数据')
    }
    const cached = loadCachedReport()
    if (cached) {
      report.value = normalizeReport(cached)
    } else if (!report.value?.summary) {
      report.value = buildFallbackReport()
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function recordKey(record) {
  return `${record?.type || 'record'}-${record?.refId || record?.title || 'item'}-${record?.time || ''}`
}

function displayRecord(record) {
  return formatStudentRecordForDisplay(record, {
    recordKey,
    fallbackKnowledge: weakestDimensions.value.slice(0, 3).map((item) => item.name),
  })
}

function persistReport() {
  localStorage.setItem(PROFILE_REPORT_CACHE_KEY, JSON.stringify(report.value || buildFallbackReport()))
}

function loadCachedReport() {
  try {
    const raw = localStorage.getItem(PROFILE_REPORT_CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistDeletedRecordKeys() {
  localStorage.setItem(PROFILE_RECORD_DELETED_KEY, JSON.stringify(deletedRecordKeys.value))
}

function restoreDeletedRecordKeys() {
  try {
    const raw = localStorage.getItem(PROFILE_RECORD_DELETED_KEY)
    deletedRecordKeys.value = raw ? JSON.parse(raw) : []
  } catch {
    deletedRecordKeys.value = []
  }
}

function deleteRecord(record) {
  const key = record?.originalKey || recordKey(record)
  if (!deletedRecordKeys.value.includes(key)) {
    deletedRecordKeys.value = [key, ...deletedRecordKeys.value]
    persistDeletedRecordKeys()
  }
  if (activeRecord.value && (activeRecord.value.originalKey || recordKey(activeRecord.value)) === key) {
    detailOpen.value = false
    activeRecord.value = null
  }
}

function batchDeleteRecords() {
  const keys = filteredRecords.value.map(recordKey)
  if (!keys.length) return
  deletedRecordKeys.value = Array.from(new Set([...deletedRecordKeys.value, ...keys]))
  persistDeletedRecordKeys()
  if (activeRecord.value && deletedRecordKeys.value.includes(recordKey(activeRecord.value))) {
    detailOpen.value = false
    activeRecord.value = null
  }
}

function scheduleRefresh() {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null
    loadReport({ silent: true })
  }, 360)
}

function selectDimension(name) {
  selectedDimension.value = name
  animateDimensionFocus()
}

function openRecord(record) {
  activeRecord.value = record ? { ...record } : null
  detailOpen.value = true
  nextTick(() => animateDrawer())
}

function goRecord(record) {
  if (!record || record.type === 'assistant' || !record.refId) return
  router.push(`/attempts/${record.refId}/result`)
}

function normalizeReport(data = {}) {
  const fallback = buildFallbackReport()
  const cached = loadCachedReport()
  const incomingRecords = Array.isArray(data.records) && data.records.length ? data.records : cached?.records || fallback.records
  return {
    summary: { ...fallback.summary, ...(data.summary || {}) },
    radar: Array.isArray(data.radar) && data.radar.length ? data.radar : fallback.radar,
    insights: Array.isArray(data.insights) && data.insights.length ? data.insights : fallback.insights,
    scoreTrend: Array.isArray(data.scoreTrend) && data.scoreTrend.length ? data.scoreTrend : fallback.scoreTrend,
    evaluationDistribution:
      Array.isArray(data.evaluationDistribution) && data.evaluationDistribution.length
        ? data.evaluationDistribution
        : fallback.evaluationDistribution,
    scoringItemAnalysis: data.scoringItemAnalysis || fallback.scoringItemAnalysis,
    records: incomingRecords,
  }
}

const radarGrid = computed(() => [0.2, 0.4, 0.6, 0.8, 1].map((scale) => {
  return radarDimensions.value.map((_, index) => {
    const p = radarPoint(126 * scale, index, radarDimensions.value.length)
    return `${p.x},${p.y}`
  }).join(' ')
}))

const radarAxis = computed(() => radarDimensions.value.map((_, index) => radarPoint(126, index, radarDimensions.value.length)))
const radarDataPoints = computed(() => radarDimensions.value.map((item, index) => ({
  ...item,
  ...radarPoint(126 * item.score / 100, index, radarDimensions.value.length),
})))
const radarPolygon = computed(() => radarDataPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
const radarLabels = computed(() => radarDimensions.value.map((item, index) => ({
  ...item,
  ...radarPoint(154, index, radarDimensions.value.length),
  anchor: index === 0 || index === 4 ? 'middle' : index > 0 && index < 4 ? 'start' : 'end',
})))

function animateIntro() {
  if (!pageRef.value) return
  mediaContext = gsap.matchMedia()
  mediaContext.add(
    {
      reduceMotion: '(prefers-reduced-motion: reduce)',
      isDesktop: '(min-width: 900px)',
    },
    (context) => {
      if (context.conditions.reduceMotion) return
      gsapContext = gsap.context(() => {
        gsap.from('.profile-animate', {
          autoAlpha: 0,
          y: 18,
          duration: 0.56,
          ease: 'power2.out',
          stagger: 0.055,
        })
        gsap.from('.summary-card', {
          autoAlpha: 0,
          y: 14,
          scale: 0.98,
          duration: 0.42,
          ease: 'power2.out',
          stagger: 0.045,
        })
        gsap.from(radarPolygonRef.value, {
          scale: 0.78,
          autoAlpha: 0,
          transformOrigin: '50% 50%',
          duration: 0.7,
          ease: 'back.out(1.4)',
        })
      }, pageRef.value)
    },
  )
}

function animateRefresh() {
  if (!pageRef.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.fromTo(
    pageRef.value.querySelectorAll('.live-pulse'),
    { scale: 0.985 },
    { scale: 1, duration: 0.26, ease: 'power2.out', overwrite: 'auto' },
  )
  gsap.fromTo(
    pageRef.value.querySelectorAll('.record-row:first-child'),
    { x: 18, autoAlpha: 0.35 },
    { x: 0, autoAlpha: 1, duration: 0.38, ease: 'power2.out', overwrite: 'auto' },
  )
}

function animateDimensionFocus() {
  if (!pageRef.value || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.fromTo(
    pageRef.value.querySelector('.dimension-focus'),
    { y: 8, autoAlpha: 0.68 },
    { y: 0, autoAlpha: 1, duration: 0.28, ease: 'power2.out', overwrite: 'auto' },
  )
}

function animateDrawer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const drawer = document.querySelector('.profile-record-drawer')
  if (!drawer) return
  gsap.fromTo(drawer, { scale: 0.96, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.22, ease: 'power2.out' })
}

watch(
  () => assistant.profileRefreshToken,
  (value, oldValue) => {
    if (value && value !== oldValue) scheduleRefresh()
  },
)

onMounted(async () => {
  restoreDeletedRecordKeys()
  const cached = loadCachedReport()
  if (cached) {
    report.value = normalizeReport(cached)
  }
  assistant.registerContext({
    routeName: 'KnowledgeProfile',
    pageTitle: '学生个性画像',
    profileReportVisible: true,
  })
  await loadReport({ animate: false })
  await nextTick()
  animateIntro()
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearTimeout(refreshTimer)
  gsapContext?.revert()
  mediaContext?.revert()
})
</script>

<template>
  <div ref="pageRef" class="profile-report-page" v-loading="loading">
    <div class="profile-dashboard-inner">
    <section class="profile-hero profile-section profile-animate">
      <div>
        <p class="eyebrow">Student Profile Report</p>
        <h1>学生个性画像</h1>
        <p>{{ profileNarrative }}</p>
      </div>
      <el-button :icon="Refresh" :loading="refreshing" @click="loadReport({ silent: true })">
        刷新画像
      </el-button>
    </section>

    <section class="summary-grid profile-section profile-animate live-pulse">
      <article v-for="card in summaryCards" :key="card.label" class="summary-card">
        <div class="summary-icon">
          <el-icon><component :is="card.icon" /></el-icon>
        </div>
        <div>
          <strong>{{ card.value }}{{ card.suffix }}</strong>
          <span>{{ card.label }}</span>
          <em>{{ card.hint }}</em>
        </div>
      </article>
    </section>

    <section class="profile-main-grid profile-section profile-animate">
      <article class="report-card radar-card live-pulse">
        <div class="card-head">
          <div>
            <p class="eyebrow">Radar</p>
            <h2>学习特征雷达</h2>
          </div>
          <span class="score-pill">{{ report.summary?.profileScore || 0 }}</span>
        </div>

        <div class="radar-layout">
          <svg class="radar-svg" viewBox="0 0 360 360" role="img" aria-label="学习特征雷达图">
            <defs>
              <radialGradient id="profileRadarFill" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.34" />
                <stop offset="100%" stop-color="#2563eb" stop-opacity="0.08" />
              </radialGradient>
            </defs>
            <polygon
              v-for="(points, index) in radarGrid"
              :key="index"
              class="radar-grid-line"
              :points="points"
            />
            <line
              v-for="(axis, index) in radarAxis"
              :key="index"
              class="radar-axis"
              x1="180"
              y1="180"
              :x2="axis.x"
              :y2="axis.y"
            />
            <polygon ref="radarPolygonRef" class="radar-area" :points="radarPolygon" />
            <polyline class="radar-stroke" :points="radarPolygon" />
            <g
              v-for="point in radarDataPoints"
              :key="point.name"
              class="radar-node"
              :class="{ active: selectedDimension === point.name }"
              @click="selectDimension(point.name)"
            >
              <circle :cx="point.x" :cy="point.y" r="10" :fill="point.color" opacity="0.14" />
              <circle :cx="point.x" :cy="point.y" r="4.8" :fill="point.color" />
            </g>
            <g
              v-for="label in radarLabels"
              :key="label.name"
              class="radar-label"
              :class="{ active: selectedDimension === label.name }"
              @click="selectDimension(label.name)"
            >
              <text :x="label.x" :y="label.y" :text-anchor="label.anchor">{{ label.name }}</text>
              <text :x="label.x" :y="label.y + 18" :text-anchor="label.anchor" class="radar-label-score">{{ label.score }}</text>
            </g>
          </svg>

          <div class="dimension-focus">
            <span class="dimension-dot" :style="{ background: activeDimension?.color }" />
            <h3>{{ activeDimension?.name }}</h3>
            <strong>{{ activeDimension?.score }}</strong>
            <p>{{ activeDimension?.desc }}</p>
            <div class="dimension-bar">
              <span :style="{ width: `${activeDimension?.score || 0}%`, background: activeDimension?.color }" />
            </div>
          </div>
        </div>

        <div class="radar-summary-grid">
          <article v-for="item in radarSummaryCards" :key="item.label" :class="['radar-summary-card', item.tone]">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.text }}</p>
          </article>
        </div>
      </article>

      <article class="report-card insight-card live-pulse">
        <div class="card-head">
          <div>
            <p class="eyebrow">Insight</p>
            <h2>画像洞察</h2>
          </div>
          <el-tag round effect="light">{{ weakestDimensions.length }} 个重点</el-tag>
        </div>

        <div class="insight-scroll">
        <div class="insight-list">
          <article v-for="item in insights" :key="`${item.type}-${item.title}`" :class="['insight-item', item.type]">
            <div class="insight-item-head">
              <span class="insight-type">{{ item.type }}</span>
              <em>{{ item.priority || '诊断' }}</em>
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ sanitizeStudentText(item.description) }}</p>
          </article>
        </div>

        <div class="action-panel">
          <h3>下一步建议</h3>
          <div v-for="item in weakestDimensions" :key="item.name" class="action-row">
            <span>{{ item.name }}</span>
            <p>{{ item.action }}</p>
          </div>
        </div>
        </div>
      </article>
    </section>

    <section class="profile-analysis-grid profile-section profile-animate">
      <article class="report-card live-pulse">
        <div class="card-head">
          <div>
            <p class="eyebrow">Trend</p>
            <h2>学习趋势分析</h2>
          </div>
          <el-icon><TrendCharts /></el-icon>
        </div>
        <div class="trend-panel">
          <svg class="trend-chart" viewBox="0 0 520 210" role="img" aria-label="得分趋势折线图">
            <line v-for="y in [44, 78, 112, 146, 180]" :key="y" x1="24" :y1="y" x2="496" :y2="y" class="chart-grid" />
            <path v-if="trendAreaPath" :d="trendAreaPath" class="trend-area" />
            <path v-if="trendPath" :d="trendPath" class="trend-line" />
            <g v-for="point in trendPoints" :key="`${point.date}-${point.attemptId || point.score}`">
              <circle class="trend-point" :cx="point.x" :cy="point.y" r="5" />
              <text :x="point.x" :y="point.y - 12" text-anchor="middle" class="trend-score">{{ point.score }}</text>
              <text :x="point.x" y="202" text-anchor="middle" class="trend-date">{{ point.date }}</text>
            </g>
          </svg>
          <aside class="trend-diagnosis-card">
            <span :class="['trend-status', trendSummary.trend === '下降' ? 'down' : trendSummary.trend === '上升' ? 'up' : 'flat']">
              当前趋势：{{ trendSummary.trend }}
            </span>
            <dl>
              <div>
                <dt>最高分</dt>
                <dd>{{ trendSummary.highest }}</dd>
              </div>
              <div>
                <dt>最近分</dt>
                <dd>{{ trendSummary.latest }}</dd>
              </div>
            </dl>
            <p>{{ trendSummary.reason }}</p>
            <strong>{{ trendSummary.advice }}</strong>
          </aside>
        </div>
      </article>

      <article class="report-card diagnosis-card live-pulse">
        <div class="card-head">
          <div>
            <p class="eyebrow">Diagnosis</p>
            <h2>评估诊断</h2>
          </div>
          <el-icon><DataAnalysis /></el-icon>
        </div>

        <div class="diagnosis-toolbar" role="tablist" aria-label="评估诊断视图">
          <button type="button" :class="{ active: diagnosticTab === 'dimension' }" @click="diagnosticTab = 'dimension'">
            画像维度
          </button>
          <button type="button" :class="{ active: diagnosticTab === 'scoring' }" @click="diagnosticTab = 'scoring'">
            评分项诊断
          </button>
        </div>

        <div v-if="diagnosticTab === 'dimension'" class="dimension-diagnosis-grid">
          <div class="distribution-list">
            <div v-for="item in radarDimensions" :key="item.name" class="distribution-row">
              <div>
                <span>{{ item.name }}</span>
                <em>{{ levelText(item.level, item.score) }}</em>
              </div>
              <div class="distribution-track">
                <span :style="{ width: `${item.score}%`, background: item.color }" />
              </div>
              <strong>{{ item.score }}</strong>
            </div>
          </div>
          <svg class="dimension-mini-radar" viewBox="0 0 360 360" role="img" aria-label="画像维度小雷达图">
            <polygon
              v-for="(points, index) in radarGrid"
              :key="index"
              class="radar-grid-line"
              :points="points"
            />
            <line
              v-for="(axis, index) in radarAxis"
              :key="index"
              class="radar-axis"
              x1="180"
              y1="180"
              :x2="axis.x"
              :y2="axis.y"
            />
            <polygon class="radar-area" :points="radarPolygon" />
            <polyline class="radar-stroke" :points="radarPolygon" />
            <circle
              v-for="point in radarDataPoints"
              :key="point.name"
              :cx="point.x"
              :cy="point.y"
              r="4.5"
              :fill="point.color"
            />
          </svg>
        </div>

        <div v-else class="scoring-diagnosis">
          <p class="scoring-summary">{{ activeScoringAnalysis?.summary }}</p>
          <div class="source-tabs" role="tablist" aria-label="评分来源筛选">
            <button
              v-for="source in [
                { label: '全部', value: 'all' },
                { label: '试卷', value: 'exam' },
                { label: '练习题', value: 'practice' },
              ]"
              :key="source.value"
              type="button"
              :class="{ active: scoringSourceFilter === source.value }"
              @click="scoringSourceFilter = source.value"
            >
              {{ source.label }}
            </button>
          </div>

          <div v-if="scoringItems.length" class="scoring-grid">
            <div class="scoring-bars" aria-label="评分项得分率柱状图">
              <div v-for="item in scoringItems" :key="item.name" class="scoring-bar-row">
                <span>{{ item.name }}</span>
                <div class="scoring-bar-track">
                  <i :style="{ height: `${item.scoreRate}%` }" />
                </div>
                <strong>{{ item.scoreRate }}%</strong>
              </div>
            </div>

            <svg class="scoring-radar" viewBox="0 0 300 300" role="img" aria-label="评分项诊断雷达图">
              <polygon
                v-for="(points, index) in scoringRadarGrid"
                :key="index"
                class="radar-grid-line"
                :points="points"
              />
              <line
                v-for="(axis, index) in scoringRadarAxis"
                :key="index"
                class="radar-axis"
                x1="150"
                y1="150"
                :x2="axis.x"
                :y2="axis.y"
              />
              <polygon class="scoring-radar-area" :points="scoringRadarPolygon" />
              <polyline class="scoring-radar-line" :points="scoringRadarPolygon" />
              <g v-for="point in scoringRadarPoints" :key="point.name">
                <circle class="scoring-radar-node" :cx="point.x" :cy="point.y" r="4.5" />
              </g>
              <g v-for="label in scoringRadarLabels" :key="label.name" class="scoring-radar-label">
                <text :x="label.x" :y="label.y" :text-anchor="label.anchor">{{ label.name }}</text>
                <text :x="label.x" :y="label.y + 14" :text-anchor="label.anchor">{{ label.scoreRate }}%</text>
              </g>
            </svg>
          </div>
          <el-empty v-else description="暂无评分项明细" />
        </div>
        <div class="diagnosis-summary">
          <p><span>优势维度</span>{{ diagnosisSummary.best }}体现较好</p>
          <p><span>薄弱维度</span>{{ diagnosisSummary.weak }}需要补强</p>
          <p><span>建议</span>{{ diagnosisSummary.advice }}</p>
        </div>
      </article>
    </section>

    <section class="report-card records-card profile-section profile-animate live-pulse">
      <div class="profile-evidence-grid">
        <div class="records-main">
      <div class="card-head">
        <div>
          <p class="eyebrow">Evidence</p>
          <h2>学习轨迹与画像依据</h2>
          <p class="section-subtitle">系统根据你的作答记录、练习记录和小C对话，实时更新学习画像和下一步学习建议。</p>
        </div>
        <div :class="['profile-sync-status', profileSyncStatus.tone]">
          <strong>{{ profileSyncStatus.label }}</strong>
          <span>最近更新：{{ profileSyncStatus.updatedAt }}</span>
          <em>{{ profileSyncStatus.text }}</em>
        </div>
        <div class="record-tabs" role="tablist" aria-label="记录筛选">
          <button
            v-for="tab in recordTabs"
            :key="tab.value"
            type="button"
            :class="{ active: recordFilter === tab.value }"
            @click="recordFilter = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="record-list" :class="{ expanded: evidenceExpanded }">
        <div
          v-for="record in visibleEvidenceRecords"
          :key="`${record.type}-${record.refId || record.title}-${record.time}`"
          class="evidence-row"
        >
          <button type="button" class="record-row-main" @click="openRecord(record)">
            <span class="record-type" :class="record.type">{{ recordTypeText(record.type) }}</span>
            <span class="record-main">
              <span class="record-title-line">
                <strong>{{ record.title }}</strong>
                <i>{{ record.profileStatus }}</i>
              </span>
              <em>{{ record.summary }}</em>
              <span class="record-impact-tags">
                <b v-for="impact in record.impactChanges" :key="`${record.title}-${impact.name}`">
                  {{ impact.name }} {{ impact.delta > 0 ? `+${impact.delta}` : impact.delta }}
                </b>
              </span>
            </span>
            <span class="record-meta">
              <strong v-if="record.score !== null && record.score !== undefined">{{ record.score }}</strong>
              <em>{{ record.time }}</em>
            </span>
          </button>
          <div class="record-row-actions">
            <el-button text type="primary" @click.stop="openRecord(record)">{{ record.primaryAction }}</el-button>
            <el-button text @click.stop="openRecord(record)">{{ record.secondaryAction }}</el-button>
            <el-button text class="record-delete-action" :icon="Delete" @click.stop="deleteRecord(record)">删除</el-button>
          </div>
        </div>
        <el-empty v-if="!evidenceRecords.length" description="暂无画像证据" />
      </div>
      <div v-if="evidenceRecords.length > 5" class="evidence-more">
        <el-button text type="primary" @click="evidenceExpanded = !evidenceExpanded">
          {{ evidenceExpanded ? '收起记录' : `查看更多 ${evidenceRecords.length - 5} 条` }}
        </el-button>
      </div>
        </div>

        <aside class="records-side">
          <article class="records-side-card">
            <div class="records-side-head">
              <h3>画像更新依据</h3>
              <span>{{ currentRecordTabLabel }}</span>
            </div>
            <div class="record-stat-grid">
              <div class="record-stat-chip">
                <strong>{{ recordStats.all }}</strong>
                <span>总记录</span>
              </div>
              <div class="record-stat-chip">
                <strong>{{ recordStats.exam }}</strong>
                <span>试卷</span>
              </div>
              <div class="record-stat-chip">
                <strong>{{ recordStats.practice }}</strong>
                <span>练习</span>
              </div>
              <div class="record-stat-chip">
                <strong>{{ recordStats.assistant }}</strong>
                <span>小C</span>
              </div>
              <div class="record-stat-chip">
                <strong>{{ recordStats.all }}</strong>
                <span>已纳入画像</span>
              </div>
            </div>
          </article>

          <article class="records-side-card">
            <h3>最近作答</h3>
            <template v-if="latestAttemptRecord">
              <p class="records-side-title">{{ latestAttemptRecord.title }}</p>
              <p class="records-side-text">{{ latestAttemptRecord.summary }}</p>
              <div class="records-side-meta">
                <span>{{ latestAttemptRecord.time }}</span>
                <strong v-if="latestAttemptRecord.score !== null && latestAttemptRecord.score !== undefined">{{ latestAttemptRecord.score }}</strong>
              </div>
              <p class="records-side-note">已纳入画像评分</p>
            </template>
            <el-empty v-else :image-size="56" description="暂无作答记录" />
          </article>

          <article class="records-side-card">
            <h3>最近小C对话</h3>
            <template v-if="latestAssistantRecord">
              <p class="records-side-title">{{ latestAssistantRecord.title }}</p>
              <p class="records-side-text">{{ latestAssistantRecord.summary }}</p>
              <div class="records-side-meta">
                <span>{{ latestAssistantRecord.time }}</span>
              </div>
              <p class="records-side-note">重点关注 {{ weakestDimensions[0]?.name || '知识基础' }} 与理解迁移</p>
            </template>
            <el-empty v-else :image-size="56" description="暂无小C对话" />
          </article>

          <article class="records-side-card">
            <h3>当前画像变化</h3>
            <div class="profile-change-list">
              <span>{{ weakestDimensions[0]?.name || '知识基础' }}需要补强</span>
              <span>{{ strongestDimension?.name || '协作表达' }}表现稳定</span>
              <span>理解迁移建议加强</span>
            </div>
          </article>

          <article class="records-side-card">
            <h3>联动建议</h3>
            <div class="action-row compact">
              <span>下一步</span>
              <p>{{ evidenceAdvice }}</p>
            </div>
          </article>
        </aside>
      </div>
    </section>
    </div>

    <el-dialog
      v-model="detailOpen"
      class="profile-record-drawer"
      :title="activeRecord?.type === 'assistant' ? '小C对话详情' : (activeRecord?.title || '记录详情')"
      width="620px"
      append-to-body
      destroy-on-close
    >
      <div v-if="activeRecord" class="record-detail">
        <div class="record-detail-head">
          <span class="record-type" :class="activeRecord.type">{{ recordTypeText(activeRecord.type) }}</span>
          <div>
            <h3>{{ activeRecord.title }}</h3>
            <p v-if="activeRecord.type !== 'assistant'">{{ activeRecord.summary }}</p>
          </div>
        </div>
        <div v-if="activeRecord.type === 'assistant'" class="assistant-qa-detail">
          <section class="qa-block question">
            <span>学生提问</span>
            <p>{{ activeRecord.question || activeAssistantQa.question }}</p>
          </section>
          <section class="qa-block answer">
            <span>小C回复摘要</span>
            <p>{{ activeRecord.answerSummary || activeAssistantQa.answer }}</p>
          </section>
          <section class="qa-block advice">
            <span>学习建议</span>
            <p>{{ activeRecord.advice || '建议结合最近作答继续完成专项练习。' }}</p>
          </section>
          <section class="qa-block knowledge">
            <span>关联知识点</span>
            <div class="detail-tag-list">
              <b v-for="point in activeRecord.relatedKnowledge" :key="point">{{ point }}</b>
            </div>
          </section>
        </div>
        <pre v-else class="record-detail-text">{{ activeRecord.detail || activeRecord.summary }}</pre>
        <dl>
          <div>
            <dt>时间</dt>
            <dd>{{ activeRecord.time || '未记录' }}</dd>
          </div>
          <div v-if="activeRecord.score !== null && activeRecord.score !== undefined">
            <dt>得分</dt>
            <dd>{{ activeRecord.score }}</dd>
          </div>
          <div>
            <dt>画像影响</dt>
            <dd>
              <span class="detail-impact-list">
                <b v-for="impact in activeRecord.impactChanges" :key="impact.name">
                  {{ impact.name }} {{ impact.delta > 0 ? `+${impact.delta}` : impact.delta }}
                </b>
              </span>
            </dd>
          </div>
        </dl>
        <el-button
          v-if="activeRecord.type !== 'assistant' && activeRecord.refId"
          type="primary"
          @click="goRecord(activeRecord)"
        >
          查看作答结果
        </el-button>
        <el-button text type="danger" :icon="Delete" @click="deleteRecord(activeRecord)">删除这条记录</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<style src="@/styles/knowledge-profile-view.css" scoped></style>



