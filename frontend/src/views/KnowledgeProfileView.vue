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

const dimensionMeta = {
  知识基础: {
    color: '#2563eb',
    desc: '反映核心概念、语法规则、基础题型和知识点掌握程度。',
    action: '先补齐低掌握知识点，再进入综合练习。',
  },
  目标清晰度: {
    color: '#0891b2',
    desc: '反映学习目标是否明确，以及能否拆成可执行的小任务。',
    action: '把本周目标拆成 3 个可检查的练习任务。',
  },
  学习自律: {
    color: '#16a34a',
    desc: '反映学习频率、复习节奏和任务持续完成情况。',
    action: '固定每日短练窗口，先稳定学习节奏。',
  },
  理解迁移: {
    color: '#7c3aed',
    desc: '反映能否把已学知识迁移到新题型、新场景或项目任务。',
    action: '每个知识点至少完成 1 道变式题和 1 道应用题。',
  },
  实践能力: {
    color: '#d97706',
    desc: '反映代码实现、实验复现、案例理解和动手解决问题的能力。',
    action: '用一个小案例把知识点落到代码或实验报告里。',
  },
  错题反思: {
    color: '#e11d48',
    desc: '反映错因定位、订正记录和二次巩固的质量。',
    action: '整理最近错题，标注错因、知识点和重新作答结果。',
  },
  资源筛选: {
    color: '#0d9488',
    desc: '反映能否选择适合自己的资料、题目和复习路径。',
    action: '按薄弱知识点筛选资源，避免泛泛浏览。',
  },
  协作表达: {
    color: '#9333ea',
    desc: '反映提问、解释思路、与小C或同伴对话复盘的能力。',
    action: '把一道题的思路讲给小C，再检查表达漏洞。',
  },
}

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
const evidenceRecords = computed(() => filteredRecords.value.map(formatStudentRecordForDisplay))
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
  return source ? formatStudentRecordForDisplay(source) : null
})

const latestAssistantRecord = computed(() => {
  const source = filteredRecords.value.find((item) => item.type === 'assistant')
    || (Array.isArray(report.value.records) ? report.value.records.find((item) => item.type === 'assistant') : null)
  return source ? formatStudentRecordForDisplay(source) : null
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

function formatStudentRecordForDisplay(record = {}) {
  const type = record.type || 'record'
  const scoreText = record.score !== null && record.score !== undefined ? `本次得分 ${record.score} 分，已纳入知识画像分析。` : ''
  const base = {
    originalKey: recordKey(record),
    profileStatus: '已纳入画像',
    impactDimensions: buildRecordImpactDimensions(record),
    impactChanges: buildRecordImpactChanges(record),
    relatedKnowledge: inferRelatedKnowledge(record),
  }
  if (type === 'assistant') {
    const title = friendlyAssistantTitle(record)
    const summary = friendlyAssistantSummary(record)
    const qa = buildAssistantDisplayDetail(record, title, summary)
    return {
      ...record,
      ...base,
      title,
      summary,
      detail: qa.answer,
      question: qa.question,
      answerSummary: qa.answer,
      advice: qa.advice,
      primaryAction: '查看对话',
      secondaryAction: '查看建议',
    }
  }
  if (type === 'exam') {
    return {
      ...record,
      ...base,
      title: sanitizeStudentText(record.title) || '试卷记录',
      summary: scoreText || sanitizeStudentText(record.summary) || '你完成了一次阶段测评，系统已将结果纳入学习画像。',
      detail: sanitizeStudentText(record.detail || record.summary) || scoreText,
      primaryAction: '查看详情',
      secondaryAction: '查看画像影响',
    }
  }
  if (type === 'practice') {
    return {
      ...record,
      ...base,
      title: sanitizeStudentText(record.title) || '练习题记录',
      summary: scoreText || sanitizeStudentText(record.summary) || '你完成了一次专项练习，系统根据结果更新了知识点掌握情况。',
      detail: sanitizeStudentText(record.detail || record.summary) || scoreText,
      primaryAction: '查看详情',
      secondaryAction: '查看相关知识点',
    }
  }
  return {
    ...record,
    ...base,
    title: sanitizeStudentText(record.title) || '学习记录',
    summary: sanitizeStudentText(record.summary) || '该学习记录已纳入画像分析。',
    detail: sanitizeStudentText(record.detail || record.summary),
    primaryAction: '查看详情',
    secondaryAction: '查看画像影响',
  }
}

function sanitizeRecordForStudent(record = {}) {
  return formatStudentRecordForDisplay(record)
}

function buildRecordImpactDimensions(record = {}) {
  if (record.type === 'assistant') return ['学习自律', '理解迁移', '资源筛选']
  if (record.type === 'exam') return ['知识基础', '理解迁移', '实践能力']
  if (record.type === 'practice') return ['知识基础', '实践能力']
  return ['知识基础']
}

function buildRecordImpactChanges(record = {}) {
  const dimensions = buildRecordImpactDimensions(record)
  const score = Number(record.score)
  return dimensions.map((name, index) => {
    let delta = index === 0 ? 1 : 0
    if (Number.isFinite(score)) {
      delta = score >= 80 ? 2 - Math.min(index, 1) : score >= 60 ? 1 : index === 0 ? -1 : 0
    } else if (record.type === 'assistant') {
      delta = index < 2 ? 1 : 0
    }
    return { name, delta }
  })
}

function inferRelatedKnowledge(record = {}) {
  const text = `${record.title || ''} ${record.summary || ''} ${record.detail || ''}`
  const points = []
  if (/变量|数据类型/.test(text)) points.push('变量与数据类型')
  if (/分支|循环|if|for|while/i.test(text)) points.push('分支循环')
  if (/数组|字符串|字符/.test(text)) points.push('数组与字符串')
  if (/指针/.test(text)) points.push('指针基础')
  if (/函数/.test(text)) points.push('函数设计')
  return points.length ? points.slice(0, 4) : weakestDimensions.value.slice(0, 3).map((item) => item.name)
}

function buildAssistantDisplayDetail(record = {}, title = '', summary = '') {
  const raw = normalizeRecordText(record.detail || record.summary || '')
  const question = sanitizeStudentText(
    extractStudentQuestion(raw)
    || record.question
    || (isInternalPromptText(raw) ? '帮我规划一个 C 语言学习计划。' : record.title)
    || title
  )
  const answer = summary || '小C根据你的学习记录生成了学习路径建议。'
  return {
    question: question || '学习路径咨询',
    answer,
    advice: inferRelatedKnowledge(record).length
      ? `建议先复习 ${inferRelatedKnowledge(record).join('、')}，再进行综合练习。`
      : '建议先复盘近期作答，再完成对应专项练习。',
  }
}

function friendlyAssistantTitle(record = {}) {
  const text = `${record.title || ''} ${record.summary || ''} ${record.detail || ''}`
  if (/路径|path|推荐|recommend/i.test(text)) return '小C学习路径对话'
  if (/错题|复盘|订正|错误/.test(text)) return '小C错题复盘建议'
  if (/数组|字符串|字符/.test(text)) return '数组与字符串复盘建议'
  if (/循环|分支|变量|数据类型/.test(text)) return '基础语法补强建议'
  return sanitizeStudentText(record.title) || '小C学习对话'
}

function friendlyAssistantSummary(record = {}) {
  const cleaned = sanitizeStudentText(record.summary || record.detail || record.title)
  const text = `${record.title || ''} ${record.summary || ''} ${record.detail || ''}`
  if (/路径|path|推荐|recommend/i.test(text)) {
    return '系统根据你的作答记录生成了下一步学习路径建议。'
  }
  if (/数组|字符串|字符/.test(text)) {
    return '围绕数组下标、字符串结束符和字符数组输入输出进行针对性复习。'
  }
  if (/错题|复盘|订正|错误/.test(text)) {
    return '小C根据近期错题整理了复盘重点，帮助你定位薄弱知识点。'
  }
  if (/循环|分支|变量|数据类型/.test(text)) {
    return '建议先补强变量、分支循环等基础语法，再进入综合练习。'
  }
  return cleaned || '小C对话已纳入画像，用于更新学习路径和复盘建议。'
}

function sanitizeStudentText(text) {
  const normalized = normalizeRecordText(text)
  if (!normalized) return ''
  if (isInternalPromptText(normalized)) {
    return '系统已根据你的学习证据生成画像建议，重点用于学习路径、错题复盘和知识点补强。'
  }
  return normalized
    .replace(/```json[\s\S]*?```/gi, '系统已整理结构化建议。')
    .replace(/```[\s\S]*?```/g, '系统已整理学习建议。')
    .replace(/\{[\s\S]{80,}\}/g, '系统已整理学习建议。')
    .replace(/请基于[\s\S]*?(输出|生成)/g, '系统根据你的学习证据')
    .replace(/字段必须包含[\s\S]*$/g, '')
    .replace(/不要输出\s*markdown/gi, '')
    .replace(/严格\s*JSON/gi, '学习建议')
    .replace(/system prompt|assistant prompt|prompt/gi, '学习建议')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function isInternalPromptText(text) {
  return /严格\s*JSON|不要输出\s*markdown|字段必须包含|system prompt|developer prompt|assistant prompt|你是学习路径分析助手|请基于以下|输出\s*JSON|JSON\s*字段|模型调用参数|数据库字段|内部调试|异常信息/i.test(text)
}

function parseAssistantDetail(record) {
  if (!record || record.type !== 'assistant') {
    return { question: '', answer: '' }
  }
  if (record.summary && !isInternalPromptText(record.summary)) {
    return {
      question: record.title || '小C学习对话',
      answer: sanitizeStudentText(record.summary),
    }
  }
  const detail = normalizeRecordText(record.detail || '')
  const summary = normalizeRecordText(record.summary || '')
  let question = extractDetailSection(detail, '问题', '回答')
  let answer = extractDetailSection(detail, '回答')

  question = cleanAssistantText(question || extractStudentQuestion(summary) || summary || '暂无问题详情')
  answer = cleanAssistantText(answer || '暂无回答详情')

  return {
    question,
    answer,
  }
}

function normalizeRecordText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim()
}

function extractDetailSection(text, startLabel, endLabel = '') {
  if (!text) return ''
  const startPatterns = [`${startLabel}：`, `${startLabel}:`]
  let start = -1
  let labelLength = 0
  for (const pattern of startPatterns) {
    const index = text.indexOf(pattern)
    if (index >= 0 && (start === -1 || index < start)) {
      start = index
      labelLength = pattern.length
    }
  }
  if (start < 0) return ''
  const contentStart = start + labelLength
  if (!endLabel) return text.slice(contentStart).trim()
  const endCandidates = [`\n${endLabel}：`, `\n${endLabel}:`, `${endLabel}：`, `${endLabel}:`]
  let end = text.length
  for (const pattern of endCandidates) {
    const index = text.indexOf(pattern, contentStart)
    if (index >= 0) end = Math.min(end, index)
  }
  return text.slice(contentStart, end).trim()
}

function extractStudentQuestion(text) {
  const markers = ['学生本次提问：', '学生本次提问:', '对话： 学生：', '对话: 学生:', '学生：', '学生:', '用户：', '用户:']
  for (const marker of markers) {
    const index = text.lastIndexOf(marker)
    if (index >= 0) {
      return text.slice(index + marker.length)
    }
  }
  return text
}

function cleanAssistantText(text) {
  let content = normalizeRecordText(text)
  content = content
    .replace(/^对话编号[:：].*$/gmi, '')
    .replace(/^提问摘要[:：]/gmi, '')
    .replace(/^回复摘要[:：]/gmi, '')
    .replace(/^发生时间[:：].*$/gmi, '')
    .replace(/页面上下文[:：][\s\S]*$/g, '')
    .replace(/字段必须包含[:：][\s\S]*$/g, '')
    .replace(/输出严格\s*JSON[\s\S]*$/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return content || '暂无详情'
}

function goRecord(record) {
  if (!record || record.type === 'assistant' || !record.refId) return
  router.push(`/attempts/${record.refId}/result`)
}

function levelText(level, score) {
  if (score >= 85 || level === 'excellent') return '优势'
  if (score >= 70 || level === 'good') return '稳定'
  if (score >= 60 || level === 'normal') return '观察'
  return '预警'
}

function recordTypeText(type) {
  if (type === 'exam') return '试卷'
  if (type === 'practice') return '练习'
  if (type === 'assistant') return '小C'
  return '记录'
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

function normalizeTrend(points) {
  const list = points.slice(-10)
  if (!list.length) return []
  const width = 520
  const height = 180
  const paddingX = 24
  const step = list.length === 1 ? 0 : (width - paddingX * 2) / (list.length - 1)
  return list.map((item, index) => {
    const score = clamp(Number(item.score) || 0, 0, 100)
    return {
      ...item,
      score,
      x: paddingX + step * index,
      y: height - 18 - (score / 100) * 136,
    }
  })
}

function buildTrendPath(points) {
  if (!points.length) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function radarPoint(radius, index, total) {
  const center = 180
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: Number((center + Math.cos(angle) * radius).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius).toFixed(2)),
  }
}

function scoreRadarPoint(radius, index, total) {
  const center = 150
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2
  return {
    x: Number((center + Math.cos(angle) * radius).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius).toFixed(2)),
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function buildFallbackReport() {
  const radar = [
    { name: '知识基础', score: 72, level: 'good' },
    { name: '目标清晰度', score: 68, level: 'normal' },
    { name: '学习自律', score: 64, level: 'normal' },
    { name: '理解迁移', score: 61, level: 'normal' },
    { name: '实践能力', score: 76, level: 'good' },
    { name: '错题反思', score: 58, level: 'risk' },
    { name: '资源筛选', score: 69, level: 'normal' },
    { name: '协作表达', score: 74, level: 'good' },
  ]
  return {
    summary: {
      profileScore: 68,
      examCount: 0,
      practiceCount: 0,
      assistantChatCount: 0,
      weakDimensionCount: 2,
      updatedAt: '等待最新数据',
    },
    radar,
    insights: [
      { type: 'risk', title: '错题反思需要加强', description: '建议把最近错题交给小C复盘，再做一次同类变式练习。' },
      { type: 'strength', title: '实践能力较稳定', description: '可以继续通过代码案例理解抽象概念。' },
    ],
    scoreTrend: [
      { date: '06-01', score: 58, sourceType: 'practice' },
      { date: '06-05', score: 64, sourceType: 'practice' },
      { date: '06-10', score: 68, sourceType: 'exam' },
      { date: '06-18', score: 72, sourceType: 'practice' },
    ],
    evaluationDistribution: radar,
    scoringItemAnalysis: {
      attemptCount: 1,
      sourceType: 'all',
      summary: '暂无真实评分项明细，完成试卷或练习并评分后会自动生成诊断。',
      bestItem: '问题分解完整性',
      weakestItem: '问题关联性认知',
      items: [
        { name: '问题关联性认知', scoreRate: 0, avgScore: 0, maxScore: 15 },
        { name: '计算思维体现', scoreRate: 0, avgScore: 0, maxScore: 10 },
        { name: '子问题求解思路清晰度', scoreRate: 0, avgScore: 0, maxScore: 25 },
        { name: '边缘情况考虑周全性', scoreRate: 0, avgScore: 0, maxScore: 20 },
        { name: '问题分解完整性', scoreRate: 16.7, avgScore: 5, maxScore: 30 },
      ],
      variants: {},
    },
    records: [
      { type: 'assistant', title: '小C对话示例', time: '等待真实记录', summary: '与小C对话后，这里会显示自然语言学习记录。' },
      { type: 'practice', title: '练习记录示例', time: '等待真实记录', score: 72, summary: '完成练习后，这里会显示得分和画像影响。' },
    ],
  }
}

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

<style scoped>
.profile-report-page {
  min-height: calc(100vh - 110px);
  margin: -18px;
  padding: clamp(16px, 1.4vw, 28px);
  color: #152033;
  background:
    linear-gradient(rgba(15, 118, 110, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 118, 110, 0.035) 1px, transparent 1px),
    radial-gradient(circle at 12% 8%, rgba(20, 184, 166, 0.14), transparent 32%),
    linear-gradient(180deg, #f7fbfa 0%, #eef7f4 100%);
  background-size: 24px 24px, 24px 24px, auto, auto;
}

.profile-dashboard-inner {
  width: min(100%, 1680px);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.2vw, 22px);
}

.profile-section {
  margin: 0;
  width: 100%;
  min-width: 0;
}

.profile-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 8px;
  font-size: clamp(28px, 2vw, 38px);
  line-height: 1.2;
  color: #10223f;
}

h2 {
  margin-bottom: 0;
  font-size: 21px;
  color: #10223f;
}

h3 {
  margin-bottom: 8px;
  font-size: 17px;
  color: #10223f;
}

.profile-hero p {
  max-width: none;
  margin-bottom: 0;
  color: #5d6b7c;
  line-height: 1.7;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: clamp(12px, 1vw, 16px);
}

.summary-card,
.report-card {
  border: 1px solid rgba(15, 118, 110, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 14px 38px rgba(21, 75, 72, 0.08);
}

.summary-card {
  min-height: 94px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: #0f766e;
  background: #dff7f2;
}

.summary-card strong {
  display: block;
  color: #10223f;
  font-size: 28px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.summary-card span {
  color: #64748b;
  font-size: 14px;
}

.summary-card em {
  display: block;
  margin-top: 4px;
  color: #0f766e;
  font-size: 12px;
  font-style: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.update-card {
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
}

.update-card strong {
  font-size: 15px;
  line-height: 1.5;
}

.profile-main-grid,
.profile-analysis-grid,
.profile-evidence-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(340px, 0.85fr);
  gap: clamp(14px, 1.1vw, 20px);
  align-items: start;
}

.report-card {
  padding: clamp(16px, 1.1vw, 20px);
}

.insight-card {
  min-height: 0;
  max-height: 560px;
  overflow: hidden;
}

.radar-card {
  min-height: unset;
  height: auto;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.score-pill {
  min-width: 58px;
  height: 44px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #064e3b;
  background: linear-gradient(135deg, #ccfbf1, #a7f3d0);
  font-weight: 800;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.radar-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) minmax(260px, 0.75fr);
  gap: clamp(14px, 1.2vw, 20px);
  align-items: center;
  min-height: 0;
}

.radar-svg {
  width: 100%;
  height: clamp(300px, 22vw, 380px);
  max-width: 560px;
  max-height: 380px;
  aspect-ratio: 1;
  justify-self: center;
}

.radar-grid-line {
  fill: none;
  stroke: rgba(15, 118, 110, 0.2);
}

.radar-axis {
  stroke: rgba(100, 116, 139, 0.22);
}

.radar-area {
  fill: url(#profileRadarFill);
}

.radar-stroke {
  fill: none;
  stroke: #0f766e;
  stroke-width: 2.4;
}

.radar-node,
.radar-label {
  cursor: pointer;
}

.radar-node.active circle:last-child {
  stroke: #ffffff;
  stroke-width: 2;
}

.radar-label text {
  fill: #334155;
  font-size: 12px;
  font-weight: 700;
}

.radar-label-score {
  fill: #0f766e;
  font-size: 15px;
}

.radar-label.active text {
  fill: #0f766e;
}

.dimension-focus {
  border-radius: 8px;
  width: 100%;
  max-width: 440px;
  min-height: 250px;
  padding: 24px;
  align-self: center;
  justify-self: center;
  background: #f5fbf9;
  border: 1px solid rgba(15, 118, 110, 0.14);
}

.dimension-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  display: inline-block;
  margin-bottom: 12px;
}

.dimension-focus strong {
  display: block;
  margin-bottom: 12px;
  color: #10223f;
  font-size: 52px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.dimension-focus p,
.insight-item p,
.action-row p,
.record-main em,
.record-detail p {
  color: #64748b;
  line-height: 1.7;
}

.dimension-bar,
.distribution-track {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #e2e8f0;
}

.dimension-bar span,
.distribution-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.radar-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.radar-summary-card {
  min-height: 118px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #dbece8;
  background: #f8fbfa;
}

.radar-summary-card span {
  display: block;
  margin-bottom: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.radar-summary-card strong {
  display: block;
  margin-bottom: 6px;
  color: #10223f;
  font-size: 17px;
}

.radar-summary-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.55;
}

.radar-summary-card.risk {
  border-color: #fed7aa;
  background: #fff7ed;
}

.radar-summary-card.strength {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.radar-summary-card.advice {
  border-color: #99f6e4;
  background: #f0fdfa;
}

.insight-list {
  display: grid;
  gap: 10px;
}

.insight-card {
  display: flex;
  flex-direction: column;
}

.insight-scroll {
  flex: 1;
  min-height: 0;
  max-height: 468px;
  display: grid;
  gap: 14px;
  overflow-y: auto;
  padding-right: 6px;
}

.insight-scroll::-webkit-scrollbar {
  width: 10px;
}

.insight-scroll::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #edf4f2;
}

.insight-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, #c4b5fd, #8b5cf6);
  border: 2px solid #edf4f2;
}

.insight-item,
.action-row {
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.insight-item {
  position: relative;
  padding-left: 18px;
}

.insight-item::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 18px;
  width: 5px;
  height: calc(100% - 36px);
  border-radius: 999px;
  background: #14b8a6;
}

.insight-item.risk {
  border-color: #fed7aa;
  background: #fff7ed;
}

.insight-item.risk::before {
  background: #f97316;
}

.insight-item.strength {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.insight-item.strength::before {
  background: #22c55e;
}

.insight-item.advice,
.insight-item.assistant {
  border-color: #99f6e4;
  background: #f0fdfa;
}

.insight-item.attempt {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.insight-item-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.insight-item-head em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.insight-type {
  display: inline-flex;
  height: 24px;
  padding: 0 9px;
  align-items: center;
  border-radius: 999px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 12px;
  margin-bottom: 10px;
}

.action-panel {
  margin-top: 16px;
}

.action-row {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 12px;
  margin-top: 10px;
}

.action-row span {
  color: #10223f;
  font-weight: 700;
}

.action-row p {
  margin-bottom: 0;
}

.trend-chart {
  width: 100%;
  height: clamp(220px, 18vw, 280px);
  min-height: 0;
  max-height: 280px;
}

.trend-panel {
  height: auto;
  min-height: clamp(280px, 24vw, 340px);
  max-height: 380px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  gap: clamp(14px, 1.2vw, 20px);
  align-items: center;
}

.trend-diagnosis-card {
  padding: 16px;
  border: 1px solid #dbece8;
  border-radius: 8px;
  background: #f8fbfa;
}

.trend-status {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 13px;
  font-weight: 700;
}

.trend-status.down {
  color: #9a3412;
  background: #ffedd5;
}

.trend-status.up {
  color: #166534;
  background: #dcfce7;
}

.trend-diagnosis-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0;
}

.trend-diagnosis-card dt {
  color: #64748b;
  font-size: 12px;
}

.trend-diagnosis-card dd {
  margin: 2px 0 0;
  color: #10223f;
  font-size: 24px;
  font-weight: 800;
}

.trend-diagnosis-card p {
  margin-bottom: 10px;
  color: #64748b;
  line-height: 1.65;
}

.trend-diagnosis-card strong {
  color: #0f766e;
  line-height: 1.5;
}

.chart-grid {
  stroke: #e2e8f0;
}

.trend-area {
  fill: rgba(20, 184, 166, 0.12);
}

.trend-line {
  fill: none;
  stroke: #0f766e;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-point {
  fill: #0f766e;
  stroke: #ffffff;
  stroke-width: 3;
}

.trend-score {
  fill: #10223f;
  font-size: 13px;
  font-weight: 700;
}

.trend-date {
  fill: #64748b;
  font-size: 12px;
}

.distribution-list {
  display: grid;
  gap: 10px;
}

.dimension-diagnosis-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.68fr);
  gap: 16px;
  align-items: center;
}

.diagnosis-card {
  max-height: 420px;
  overflow-y: auto;
}

.dimension-mini-radar {
  width: 100%;
  min-height: 260px;
  max-height: 280px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.diagnosis-toolbar,
.source-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.diagnosis-toolbar button,
.source-tabs button {
  min-height: 36px;
  border: 1px solid #d7e3e1;
  border-radius: 999px;
  padding: 0 14px;
  color: #475569;
  background: #ffffff;
  cursor: pointer;
}

.diagnosis-toolbar button.active,
.source-tabs button.active {
  color: #064e3b;
  border-color: #99f6e4;
  background: #ccfbf1;
  font-weight: 700;
}

.scoring-summary {
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  color: #334155;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  line-height: 1.7;
}

.scoring-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.72fr);
  gap: 16px;
  align-items: center;
}

.scoring-bars {
  min-height: 260px;
  display: grid;
  grid-template-columns: repeat(5, minmax(42px, 1fr));
  gap: 10px;
  align-items: end;
  padding: 14px 10px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background:
    linear-gradient(to top, #e2e8f0 1px, transparent 1px) 0 0 / 100% 25%,
    #ffffff;
}

.scoring-bar-row {
  min-width: 0;
  height: 240px;
  display: grid;
  grid-template-rows: 34px 1fr 38px;
  gap: 8px;
  justify-items: center;
  align-items: end;
}

.scoring-bar-row span {
  align-self: start;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
}

.scoring-bar-track {
  width: 18px;
  height: 146px;
  display: flex;
  align-items: end;
  border-radius: 999px;
  overflow: hidden;
  background: #eef2f7;
}

.scoring-bar-track i {
  display: block;
  width: 100%;
  min-height: 2px;
  border-radius: inherit;
  background: linear-gradient(180deg, #818cf8, #2563eb);
}

.scoring-bar-row strong {
  color: #10223f;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.scoring-radar {
  width: 100%;
  min-height: 260px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.diagnosis-summary {
  display: grid;
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid #dbece8;
  border-radius: 8px;
  background: #f8fbfa;
}

.diagnosis-summary p {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 10px;
  margin: 0;
  color: #475569;
  line-height: 1.55;
}

.diagnosis-summary span {
  color: #0f766e;
  font-weight: 800;
}

.scoring-radar-area {
  fill: rgba(129, 140, 248, 0.18);
}

.scoring-radar-line {
  fill: none;
  stroke: #8b5cf6;
  stroke-width: 2;
  stroke-linejoin: round;
}

.scoring-radar-node {
  fill: #8b5cf6;
  stroke: #ffffff;
  stroke-width: 2;
}

.scoring-radar-label text {
  fill: #64748b;
  font-size: 10px;
}

.scoring-radar-label text + text {
  fill: #8b5cf6;
  font-weight: 700;
}

.distribution-row {
  display: grid;
  grid-template-columns: 112px 1fr 42px;
  gap: 12px;
  align-items: center;
}

.distribution-row span {
  display: block;
  color: #10223f;
  font-weight: 700;
}

.distribution-row em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.distribution-row strong {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.records-card {
  min-height: 0;
}

.records-card .card-head {
  align-items: flex-start;
}

.profile-evidence-grid {
  display: grid;
  gap: 20px;
  align-items: start;
}

.section-subtitle {
  max-width: 980px;
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.profile-sync-status {
  min-width: 220px;
  padding: 10px 12px;
  border: 1px solid #99f6e4;
  border-radius: 8px;
  background: #f0fdfa;
}

.profile-sync-status strong,
.profile-sync-status span,
.profile-sync-status em {
  display: block;
}

.profile-sync-status strong {
  color: #064e3b;
  font-size: 14px;
}

.profile-sync-status span {
  margin-top: 3px;
  color: #0f766e;
  font-size: 12px;
}

.profile-sync-status em {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.profile-sync-status.syncing {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.profile-sync-status.pending {
  border-color: #fed7aa;
  background: #fff7ed;
}

.records-main,
.records-side {
  min-width: 0;
}

.records-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.records-side {
  display: grid;
  gap: 12px;
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
  align-content: start;
  position: static;
}

.records-side::-webkit-scrollbar {
  width: 10px;
}

.records-side::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #edf4f2;
}

.records-side::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, #93c5fd, #2563eb);
  border: 2px solid #edf4f2;
}

.records-side-card {
  padding: 14px;
  border-radius: 10px;
  background: #f8fbfa;
  border: 1px solid #dde9e5;
}

.records-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.records-side-head span,
.records-side-meta span,
.records-side-text {
  color: #64748b;
}

.record-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.record-stat-chip {
  padding: 12px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e2ece8;
}

.record-stat-chip strong,
.records-side-title {
  display: block;
  color: #10223f;
  font-weight: 800;
}

.record-stat-chip strong {
  font-size: 22px;
  line-height: 1.1;
}

.record-stat-chip span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.records-side-title {
  margin: 0 0 6px;
}

.records-side-text {
  margin: 0;
  line-height: 1.7;
}

.records-side-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.records-side-meta strong {
  color: #10223f;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.action-row.compact {
  grid-template-columns: 96px 1fr;
  margin-top: 0;
}

.action-row.compact + .action-row.compact {
  margin-top: 10px;
}

.record-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.record-tabs button {
  min-height: 36px;
  border: 1px solid #d7e3e1;
  border-radius: 999px;
  padding: 0 14px;
  color: #475569;
  background: #ffffff;
  cursor: pointer;
}

.record-tabs button.active {
  color: #064e3b;
  border-color: #99f6e4;
  background: #ccfbf1;
  font-weight: 700;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: none;
  overflow-y: auto;
  padding-right: 6px;
  align-content: start;
}

.record-list.expanded {
  max-height: min(58vh, 620px);
  padding-right: 8px;
  overscroll-behavior: contain;
}

.record-list::-webkit-scrollbar {
  width: 10px;
}

.record-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #edf4f2;
}

.record-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, #99f6e4, #14b8a6);
  border: 2px solid #edf4f2;
}

.record-row,
.evidence-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 130px;
  align-items: center;
  gap: 10px;
}

.record-row-main {
  appearance: none;
  width: auto;
  min-width: 0;
  min-height: 82px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 120px;
  gap: 12px;
  align-items: center;
  text-align: left;
  background: #ffffff;
  cursor: pointer;
}

.record-row-main:hover {
  border-color: #5eead4;
  background: #f8fffd;
  box-shadow: 0 10px 24px rgba(20, 83, 75, 0.08);
}

.record-type {
  min-height: 32px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  padding: 0 10px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 13px;
  font-weight: 700;
}

.record-type.exam {
  color: #1d4ed8;
  background: #dbeafe;
}

.record-type.practice {
  color: #92400e;
  background: #fef3c7;
}

.record-type.assistant {
  color: #7e22ce;
  background: #f3e8ff;
}

.record-main {
  min-width: 0;
}

.record-main strong,
.record-main em {
  display: block;
}

.record-main strong {
  color: #10223f;
  margin-bottom: 4px;
}

.record-title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.record-title-line i {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  border-radius: 999px;
  padding: 0 8px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.record-main em {
  overflow: hidden;
  font-style: normal;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.record-impact-tags,
.detail-impact-list,
.detail-tag-list,
.profile-change-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.record-impact-tags {
  margin-top: 9px;
}

.record-impact-tags b,
.detail-impact-list b,
.detail-tag-list b,
.profile-change-list span {
  border-radius: 999px;
  padding: 4px 8px;
  color: #0f766e;
  background: #ecfdf5;
  font-size: 12px;
  font-weight: 700;
}

.record-meta {
  text-align: right;
}

.record-meta strong {
  display: block;
  color: #10223f;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}

.record-meta em {
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.record-row-actions {
  width: auto;
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 0;
}

.record-delete-action {
  color: #94a3b8;
}

.record-delete-action:hover {
  color: #dc2626;
}

.evidence-more {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}

.records-side-note {
  margin: 10px 0 0;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
}

.profile-record-drawer :deep(.el-dialog) {
  border-radius: 12px;
}

.profile-record-drawer :deep(.el-dialog__body) {
  max-height: min(72vh, 720px);
  overflow: auto;
  padding-top: 8px;
}

.record-detail-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.record-detail-head h3 {
  margin: 0;
  color: #10223f;
  font-size: 18px;
}

.record-detail-head p {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.6;
}

.record-detail .record-type {
  flex: 0 0 auto;
}

.record-detail-text {
  margin: 0;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fbfa;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
}

.assistant-qa-detail {
  display: grid;
  gap: 12px;
}

.qa-block {
  padding: 14px 16px;
  border: 1px solid #dbe7e4;
  border-radius: 10px;
  background: #f8fbfa;
}

.qa-block span {
  display: inline-flex;
  margin-bottom: 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.qa-block p {
  margin: 0;
  color: #25364d;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.qa-block.answer {
  background: #ffffff;
}

.qa-block.advice {
  background: #f0fdfa;
}

.qa-block.knowledge {
  background: #eff6ff;
}

.record-detail dl {
  display: grid;
  gap: 12px;
  margin: 18px 0;
}

.record-detail dl div {
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.record-detail dt {
  color: #64748b;
  font-size: 12px;
}

.record-detail dd {
  margin: 4px 0 0;
  color: #10223f;
  line-height: 1.6;
}

@media (max-width: 1600px) {
  .profile-dashboard-inner {
    width: min(100%, 1480px);
  }
}

@media (max-width: 1400px) {
  .radar-layout {
    grid-template-columns: 1fr;
  }

  .dimension-focus {
    max-width: none;
    justify-self: stretch;
  }
}

@media (max-width: 1280px) {
  .summary-card {
    padding: 14px;
  }

  .summary-card strong {
    font-size: 24px;
  }

  .profile-dashboard-inner {
    width: 100%;
  }

  .profile-main-grid,
  .profile-analysis-grid,
  .profile-evidence-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  }

  .radar-layout,
  .trend-panel,
  .dimension-diagnosis-grid,
  .scoring-grid {
    grid-template-columns: 1fr;
  }

  .radar-svg {
    max-width: 560px;
  }

  .dimension-focus {
    max-width: none;
    justify-self: stretch;
  }

  .record-row-main {
    grid-template-columns: 78px minmax(0, 1fr);
  }

  .record-meta {
    grid-column: 2;
    text-align: left;
  }

  .record-row-actions {
    width: 118px;
  }
}

@media (max-width: 1024px) {
  .profile-dashboard-inner {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .profile-main-grid,
  .profile-analysis-grid,
  .profile-evidence-grid {
    grid-template-columns: 1fr;
  }

  .records-side {
    position: static;
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }

  .diagnosis-card,
  .insight-card {
    max-height: none;
    overflow: visible;
  }
}

@media (max-width: 760px) {
  .profile-report-page {
    margin: -18px;
    padding: 16px;
  }

  .profile-hero {
    display: grid;
  }

  h1 {
    font-size: 26px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .radar-layout {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .radar-svg {
    max-height: none;
  }

  .radar-summary-grid {
    grid-template-columns: 1fr;
  }

  .trend-panel {
    min-height: 0;
  }

  .record-tabs {
    justify-content: flex-start;
  }

  .record-list {
    max-height: 560px;
    padding-right: 2px;
  }

  .record-stat-grid {
    grid-template-columns: 1fr 1fr;
  }

  .record-row {
    flex-direction: column;
  }

  .evidence-row {
    grid-template-columns: 1fr;
  }

  .record-row-actions {
    width: auto;
    display: flex;
    align-items: center;
  }

  .record-meta {
    text-align: left;
  }

  .distribution-row {
    grid-template-columns: 92px 1fr 36px;
  }

  .scoring-grid {
    grid-template-columns: 1fr;
  }

  .scoring-bars {
    overflow-x: auto;
  }

  .scoring-bar-row {
    min-width: 56px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
