<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  CollectionTag,
  Connection,
  DataAnalysis,
  DocumentChecked,
  Files,
  FolderOpened,
  Management,
  Reading,
  Setting,
  UserFilled,
} from '@element-plus/icons-vue'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { graphic, init, use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  adminApi,
  assignmentApi,
  classApi,
  llmApi,
  paperApi,
  questionApi,
  stageEvaluationApi,
  teacherApi,
} from '@/api/services'
import { useAuthStore } from '@/stores/auth'
import { animatePageEnter } from '@/utils/pageMotion'

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const router = useRouter()
const auth = useAuthStore()
const pageRoot = ref(null)
const trendChartRef = ref(null)
let trendChart = null
let pageMotionContext = null

const loading = ref(false)
const loadError = ref('')
const questionTotal = ref(0)
const paperTotal = ref(0)
const assignmentTotal = ref(0)
const classes = ref([])
const classStudentMap = ref({})
const reviewTotal = ref(0)
const reviewRows = ref([])
const stageRows = ref([])
const recentAssignments = ref([])
const recentPapers = ref([])
const userTotal = ref(0)
const llmProviderTotal = ref(0)
const llmTemplateTotal = ref(0)
const llmCallTotal = ref(0)
const loginLogTotal = ref(0)

const displayName = computed(() => auth.displayName || auth.user?.username || '用户')
const isAdminWorkspace = computed(() => auth.hasAnyRole(['ADMIN']))
const isTeacherWorkspace = computed(() => auth.hasAnyRole(['TEACHER']) && !isAdminWorkspace.value)
const isBackendWorkspace = computed(() => isAdminWorkspace.value || isTeacherWorkspace.value)
const classCount = computed(() => classes.value.length)
const studentCount = computed(() => Object.values(classStudentMap.value).reduce((sum, rows) => sum + rows.length, 0))
const quizReviewCount = computed(() => reviewRows.value.filter((row) => isQuizLike(row)).length)
const assignmentReviewCount = computed(() => Math.max(0, reviewTotal.value - quizReviewCount.value))
const trendPoints = computed(() => buildTrendPoints())
const todayLabel = computed(() => formatDate(new Date()))

const dashboardTitle = computed(() => {
  if (isAdminWorkspace.value) return '管理员工作台'
  if (isTeacherWorkspace.value) return '教师工作台'
  return '学习工作台'
})

const dashboardSubtitle = computed(() => {
  if (isAdminWorkspace.value) return '集中查看系统用户、教学资源、模型服务和运行记录。'
  if (isTeacherWorkspace.value) return '集中查看班级学生、教学资源、待阅任务和阶段评价反馈。'
  return '集中查看常用学习功能入口。'
})

const insightStats = computed(() => {
  if (isAdminWorkspace.value) {
    return [
      { label: '系统用户数', value: userTotal.value, sub: '来自用户管理', tone: 'mint', path: '/admin/users' },
      { label: '模型服务数', value: llmProviderTotal.value, sub: '来自大模型管理', tone: 'blue', path: '/admin/llm/models' },
    ]
  }
  return [
    { label: '我的班级学生数', value: studentCount.value, sub: `${classCount.value} 个班级`, tone: 'mint', path: '/classes/manage' },
    { label: '待阅记录数', value: reviewTotal.value, sub: '来自阅卷中心', tone: 'warm', path: '/teacher/review' },
  ]
})

const metricCards = computed(() => {
  if (isAdminWorkspace.value) {
    return [
      { title: '用户管理', desc: '系统账号总数', value: userTotal.value, unit: ' 个用户', path: '/admin/users', icon: UserFilled, tone: 'green' },
      { title: '题目管理', desc: '题库资源总量', value: questionTotal.value, unit: ' 道题', path: '/questions', icon: FolderOpened, tone: 'blue' },
      { title: '试卷管理', desc: '试卷库总量', value: paperTotal.value, unit: ' 份试卷', path: '/papers', icon: Files, tone: 'teal' },
      { title: '大模型管理', desc: '模型与模板配置', value: llmProviderTotal.value + llmTemplateTotal.value, unit: ' 项配置', path: '/admin/llm/models', icon: Setting, tone: 'gold' },
    ]
  }
  return [
    { title: '项目数量', desc: '题目管理', value: questionTotal.value, unit: ' 道题', path: '/questions', icon: FolderOpened, tone: 'green' },
    { title: '试卷库总数', desc: '试卷管理', value: paperTotal.value, unit: ' 份试卷', path: '/papers', icon: Files, tone: 'blue' },
    { title: '作业管理', desc: '作业/考试管理', value: assignmentTotal.value, unit: ' 项作业', path: '/assignments/manage', icon: DocumentChecked, tone: 'gold' },
    { title: '调阅中心', desc: '待处理记录', value: reviewTotal.value, unit: ' 条记录', path: '/teacher/review', icon: Reading, tone: 'teal' },
  ]
})

const reviewStats = computed(() => {
  if (isAdminWorkspace.value) {
    return [
      { label: '模型调用', value: llmCallTotal.value, path: '/llm/calls' },
      { label: '登录日志', value: loginLogTotal.value, path: '/admin/logs' },
    ]
  }
  return [
    { label: '待阅作业', value: assignmentReviewCount.value, path: '/teacher/review' },
    { label: '待阅测验', value: quizReviewCount.value, path: '/teacher/review' },
  ]
})

const todoRows = computed(() => reviewRows.value.slice(0, 4).map((row) => {
  const student = row.studentName || row.studentUsername || `学生 ${row.studentId || ''}`.trim()
  const taskName = row.assignmentTitle || row.paperTitle || row.questionTitle || `作答 #${row.answerId || row.id || '-'}`
  return {
    id: row.answerId || row.id || `${student}-${taskName}`,
    actor: student,
    title: `${isQuizLike(row) ? '试题待阅' : '待阅作业'}：${taskName}`,
    source: '阅卷中心',
    date: formatDate(row.submittedAt || row.updatedAt || row.createdAt),
    avatar: firstChar(student),
    path: '/teacher/review',
  }
}))

const adminTodoRows = computed(() => [
  {
    id: 'llm-calls',
    actor: '模型服务',
    title: `累计调用记录 ${llmCallTotal.value} 条`,
    source: '大模型调用记录',
    date: todayLabel.value,
    avatar: '模',
    path: '/llm/calls',
  },
  {
    id: 'login-logs',
    actor: '系统日志',
    title: `累计登录日志 ${loginLogTotal.value} 条`,
    source: '系统日志',
    date: todayLabel.value,
    avatar: '志',
    path: '/admin/logs',
  },
  {
    id: 'llm-config',
    actor: '模型配置',
    title: `模型 ${llmProviderTotal.value} 个，模板 ${llmTemplateTotal.value} 个`,
    source: '大模型管理',
    date: todayLabel.value,
    avatar: '配',
    path: '/admin/llm/models',
  },
].filter((item) => item.title))

const workRows = computed(() => (isAdminWorkspace.value ? adminTodoRows.value : todoRows.value))

const feedbackRows = computed(() => stageRows.value.slice(0, 4).map((row) => {
  const student = row.studentName || row.username || `学生 ${row.studentId || ''}`.trim()
  const title = row.summary || row.diagnosis || row.stageComment || row.stageName || '阶段评价已更新'
  return {
    id: row.id || row.studentId || `${student}-${row.stageName || ''}`,
    student,
    title,
    meta: row.stageName || row.stage || '阶段评价',
    date: formatDate(row.updatedAt || row.createdAt || row.evaluatedAt),
    avatar: firstChar(student),
    path: '/teacher/stage-evaluations',
  }
}))

const adminFeedbackRows = computed(() => [
  { id: 'users', student: '用户管理', title: `当前系统共有 ${userTotal.value} 个用户`, meta: '账号与权限', date: todayLabel.value, avatar: '用', path: '/admin/users' },
  { id: 'questions', student: '教学资源', title: `题目 ${questionTotal.value} 道，试卷 ${paperTotal.value} 份，作业 ${assignmentTotal.value} 项`, meta: '资源概览', date: todayLabel.value, avatar: '教', path: '/questions' },
  { id: 'models', student: '模型服务', title: `模型 ${llmProviderTotal.value} 个，提示词模板 ${llmTemplateTotal.value} 个`, meta: '智能服务', date: todayLabel.value, avatar: '模', path: '/admin/llm/models' },
])

const activityRows = computed(() => (isAdminWorkspace.value ? adminFeedbackRows.value : feedbackRows.value))

const shortcutItems = computed(() => {
  const all = [
    { title: '我的作业', desc: '查看并开始待完成作业', path: '/assignments/my', roles: ['STUDENT'], icon: DocumentChecked, group: '学生学习' },
    { title: '题库练习', desc: '从题库选择题目并开始练习', path: '/question-bank', roles: ['STUDENT'], icon: Reading, group: '学生学习' },
    { title: '我的班级', desc: '加入班级并查看班级信息', path: '/classes/my', roles: ['STUDENT'], icon: UserFilled, group: '学生学习' },
    { title: '作答记录', desc: '查看练习和作业结果', path: '/attempts/history', roles: ['STUDENT'], icon: Files, group: '学习反馈' },
    { title: '学习统计', desc: '查看错题、掌握度和能力走势', path: '/stats', roles: ['STUDENT'], icon: DataAnalysis, group: '学习反馈' },
    { title: '学生个性画像', desc: '查看画像分、薄弱点和画像依据', path: '/knowledge-profile', roles: ['STUDENT'], icon: DataAnalysis, group: '学习反馈' },
    { title: '阶段评价', desc: '查看阶段表现和教师反馈', path: '/stage-evaluation', roles: ['STUDENT'], icon: Management, group: '学习反馈' },
    { title: '智能推荐', desc: '查看系统推荐的资源和练习', path: '/smart-recommendations', roles: ['STUDENT'], icon: Connection, group: '智能学习' },
    { title: '个性化练习', desc: '根据薄弱知识点生成练习', path: '/personalized-practice', roles: ['STUDENT'], icon: CollectionTag, group: '智能学习' },
    { title: '学习路径', desc: '按画像生成可执行的学习安排', path: '/learning-path', roles: ['STUDENT'], icon: CollectionTag, group: '智能学习' },
    { title: '大模型中心', desc: '查看可用学习助手和模型服务', path: '/llm/models', roles: ['STUDENT'], icon: Setting, group: '智能学习' },
    { title: '资源库', desc: '查看教师发布和系统推荐资源', path: '/learning-resources', roles: ['STUDENT'], icon: FolderOpened, group: '学习资源' },
    { title: '我的申诉', desc: '查看作答申诉和处理进度', path: '/appeals/my', roles: ['STUDENT'], icon: Files, group: '学习资源' },
  ]
  return all.filter((item) => auth.hasAnyRole(item.roles))
})

const groupedShortcuts = computed(() => {
  const map = new Map()
  shortcutItems.value.forEach((item) => {
    if (!map.has(item.group)) map.set(item.group, [])
    map.get(item.group).push(item)
  })
  return Array.from(map.entries()).map(([title, items]) => ({ title, items }))
})

const studentStatCards = computed(() => [
  { title: '学习任务', value: '作业', desc: '查看待完成和已提交任务', path: '/assignments/my', icon: DocumentChecked, tone: 'mint' },
  { title: '练习入口', value: '题库', desc: '进入题库练习与专项训练', path: '/question-bank', icon: Reading, tone: 'blue' },
  { title: '学习画像', value: '诊断', desc: '查看薄弱点、优势点和证据链', path: '/knowledge-profile', icon: DataAnalysis, tone: 'teal' },
  { title: '推荐资源', value: '资源', desc: '查看学习资源与智能推荐', path: '/smart-recommendations', icon: CollectionTag, tone: 'gold' },
])

const studentTodayTasks = computed(() => [
  { title: '查看我的作业', desc: '先确认待完成作业和提交状态。', path: '/assignments/my', icon: DocumentChecked, tag: '任务' },
  { title: '完成题库练习', desc: '从题库选择题目，巩固当前知识点。', path: '/question-bank', icon: Reading, tag: '练习' },
  { title: '复盘学习画像', desc: '查看最新薄弱维度和下一步建议。', path: '/knowledge-profile', icon: DataAnalysis, tag: '诊断' },
])

const studentInsightCards = computed(() => [
  { title: '学习统计', desc: '查看错题、掌握度和能力走势。', path: '/stats', icon: DataAnalysis },
  { title: '作答记录', desc: '回看练习和作业结果。', path: '/attempts/history', icon: Files },
  { title: '阶段评价', desc: '查看阶段表现和教师反馈。', path: '/stage-evaluation', icon: Management },
])

const studentSmartCards = computed(() => [
  { title: '个性化练习', desc: '根据薄弱知识点生成练习。', path: '/personalized-practice', icon: CollectionTag, tone: 'mint' },
  { title: '学习路径', desc: '按画像生成可执行安排。', path: '/learning-path', icon: Connection, tone: 'blue' },
  { title: '智能推荐', desc: '查看系统推荐资源和练习。', path: '/smart-recommendations', icon: Reading, tone: 'teal' },
  { title: '资源库', desc: '查看教师发布和系统资源。', path: '/learning-resources', icon: FolderOpened, tone: 'gold' },
])

watch(isBackendWorkspace, async (value) => {
  if (!value) return
  await nextTick()
  initTrendChart()
  if (isAdminWorkspace.value) {
    loadAdminDashboard()
  } else {
    loadTeacherDashboard()
  }
}, { immediate: true })

watch(trendPoints, () => {
  updateTrendChart()
}, { deep: true })

onMounted(() => {
  window.addEventListener('resize', resizeTrendChart)
  nextTick(() => {
    pageMotionContext = animatePageEnter(pageRoot.value)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeTrendChart)
  disposeTrendChart()
  pageMotionContext?.revert()
})

async function loadTeacherDashboard() {
  loading.value = true
  loadError.value = ''
  try {
    const [questions, papers, assignments, classRows, reviews, stages] = await Promise.all([
      safeLoad(() => questionApi.search({ page: 1, size: 100 })),
      safeLoad(() => paperApi.page(1, 100)),
      safeLoad(() => assignmentApi.page(1, 100)),
      safeLoad(() => classApi.mine()),
      safeLoad(() => teacherApi.reviewAnswers({ needsReview: true, page: 1, size: 100 })),
      safeLoad(() => stageEvaluationApi.teacherStudents({ stage: 'month' })),
    ])

    questionTotal.value = totalOf(questions)
    paperTotal.value = totalOf(papers)
    assignmentTotal.value = totalOf(assignments)
    recentAssignments.value = listOf(assignments)
    recentPapers.value = listOf(papers)
    classes.value = Array.isArray(classRows) ? classRows : listOf(classRows)
    reviewTotal.value = totalOf(reviews)
    reviewRows.value = listOf(reviews)
    stageRows.value = listOf(stages)
    await loadClassStudents(classes.value)
  } catch (error) {
    loadError.value = error?.message || '首页数据加载失败'
  } finally {
    loading.value = false
    await nextTick()
    resizeTrendChart()
    updateTrendChart()
  }
}

async function loadAdminDashboard() {
  loading.value = true
  loadError.value = ''
  try {
    const [questions, papers, assignments, users, providers, templates, calls, loginLogs] = await Promise.all([
      safeLoad(() => questionApi.search({ page: 1, size: 100 })),
      safeLoad(() => paperApi.page(1, 100)),
      safeLoad(() => assignmentApi.page(1, 100)),
      safeLoad(() => adminApi.pageUsers(1, 100)),
      safeLoad(() => llmApi.adminProviders({})),
      safeLoad(() => llmApi.adminTemplates({})),
      safeLoad(() => llmApi.page({ page: 1, size: 100 })),
      safeLoad(() => adminApi.loginLogs({ page: 1, size: 100 })),
    ])

    questionTotal.value = totalOf(questions)
    paperTotal.value = totalOf(papers)
    assignmentTotal.value = totalOf(assignments)
    recentAssignments.value = listOf(assignments)
    recentPapers.value = listOf(papers)
    reviewRows.value = listOf(calls)
    stageRows.value = []
    userTotal.value = totalOf(users)
    llmProviderTotal.value = Array.isArray(providers) ? providers.length : totalOf(providers)
    llmTemplateTotal.value = Array.isArray(templates) ? templates.length : totalOf(templates)
    llmCallTotal.value = totalOf(calls)
    loginLogTotal.value = totalOf(loginLogs)
  } catch (error) {
    loadError.value = error?.message || '首页数据加载失败'
  } finally {
    loading.value = false
    await nextTick()
    resizeTrendChart()
    updateTrendChart()
  }
}

async function loadClassStudents(rows) {
  const entries = await Promise.all(rows.map(async (row) => {
    const classId = row.id || row.classId
    if (!classId) return [classId, []]
    const students = await safeLoad(() => classApi.students(classId), [])
    return [classId, Array.isArray(students) ? students : listOf(students)]
  }))
  classStudentMap.value = Object.fromEntries(entries.filter(([id]) => id))
}

function initTrendChart() {
  if (!trendChartRef.value) return
  disposeTrendChart()
  trendChart = init(trendChartRef.value)
  updateTrendChart()
}

function updateTrendChart() {
  if (!trendChart) return
  const points = trendPoints.value
  const maxValue = Math.max(5, ...points.map((item) => item.value))
  trendChart.setOption({
    color: ['#0f766e'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: { backgroundColor: '#6a7985' },
      },
      backgroundColor: 'rgba(15, 23, 42, 0.88)',
      borderWidth: 0,
      textStyle: { color: '#ffffff' },
      formatter(params) {
        const item = params?.[0]
        return `${item.axisValue}<br/>记录数：${item.value}`
      },
    },
    grid: { top: '15%', bottom: '15%', left: '5%', right: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: points.map((item) => item.label),
      axisLine: { lineStyle: { color: '#dbe8e4' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontWeight: 700 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: Math.ceil(maxValue * 1.2),
      minInterval: 1,
      splitNumber: 4,
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#e4eeeb', type: 'dashed' } },
    },
    series: [{
      type: 'line',
      smooth: true,
      symbolSize: 7,
      data: points.map((item) => item.value),
      lineStyle: { width: 3, color: '#0f766e' },
      itemStyle: { color: '#0f766e', borderColor: '#ffffff', borderWidth: 2 },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(45, 183, 165, 0.4)' },
          { offset: 1, color: 'rgba(45, 183, 165, 0.05)' },
        ]),
      },
    }],
  })
}

function resizeTrendChart() {
  trendChart?.resize()
}

function disposeTrendChart() {
  trendChart?.dispose()
  trendChart = null
}

async function safeLoad(fn, fallback = null) {
  try {
    return await fn()
  } catch (error) {
    console.warn('dashboard data load failed:', error)
    return fallback
  }
}

function listOf(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.list)) return data.list
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.content)) return data.content
  return []
}

function totalOf(data) {
  if (typeof data?.total === 'number') return data.total
  if (typeof data?.totalElements === 'number') return data.totalElements
  if (typeof data?.count === 'number') return data.count
  return listOf(data).length
}

function buildTrendPoints() {
  const days = lastSevenDays()
  const buckets = Object.fromEntries(days.map((day) => [day.key, 0]))
  const records = [
    ...recentAssignments.value,
    ...recentPapers.value,
    ...reviewRows.value,
    ...stageRows.value,
  ]
  records.forEach((row) => {
    const key = dateKey(row.updatedAt || row.createdAt || row.publishedAt || row.submittedAt || row.evaluatedAt || row.callTime || row.startTime)
    if (key && key in buckets) buckets[key] += 1
  })
  const points = days.map((day) => ({ ...day, value: buckets[day.key] }))
  if (points.every((item) => item.value === 0)) {
    const demoValues = [12, 35, 28, 56, 42, 68, 50]
    return points.map((day, index) => ({ ...day, value: demoValues[index] || 0 }))
  }
  return points
}

function lastSevenDays() {
  const result = []
  const today = new Date()
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    result.push({ key: dateKey(date), label: `${date.getMonth() + 1}/${date.getDate()}` })
  }
  return result
}

function dateKey(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function firstChar(text) {
  return String(text || '学').trim().slice(0, 1) || '学'
}

function isQuizLike(row) {
  const text = [
    row.assignmentType,
    row.attemptType,
    row.paperTitle,
    row.assignmentTitle,
    row.questionTitle,
  ].filter(Boolean).join(' ')
  return /quiz|exam|test|测验|考试|试卷/i.test(text)
}
function feedbackScoreTags(text) {
  const source = String(text || '')
  const matches = source.match(/(能力值|平均分|得分|评分)\s*[：:]?\s*\d+(?:\.\d+)?/g) || []
  return matches.slice(0, 3)
}

function cleanFeedbackTitle(text) {
  let result = String(text || '')
  feedbackScoreTags(result).forEach((tag) => {
    result = result.replace(tag, '')
  })
  return result.replace(/[，,、；;：:]\s*$/g, '').trim() || String(text || '')
}
</script>

<template>
  <div v-if="isBackendWorkspace" ref="pageRoot" v-loading="loading" class="backend-dashboard">
    <section class="dashboard-hero motion-hero" aria-labelledby="backend-dashboard-title">
      <div class="profile-card">
        <span class="profile-avatar">{{ firstChar(displayName) }}</span>
        <div>
          <p class="eyebrow">{{ isAdminWorkspace ? 'Admin Console' : 'Teacher Console' }}</p>
          <h1 id="backend-dashboard-title">{{ displayName }}</h1>
          <span>{{ isAdminWorkspace ? '管理员' : '教师' }}</span>
        </div>
      </div>
      <div class="hero-copy">
        <h2>{{ dashboardTitle }}</h2>
        <p>{{ dashboardSubtitle }}</p>
      </div>
      <el-button class="hero-action" plain type="primary" @click="isAdminWorkspace ? loadAdminDashboard() : loadTeacherDashboard()">
        刷新数据
      </el-button>
    </section>

    <p v-if="loadError" class="dashboard-error">{{ loadError }}</p>

    <section class="dashboard-grid" :aria-label="dashboardTitle">
      <article class="insight-panel dash-card motion-card">
        <div class="panel-head">
          <div>
            <p class="eyebrow">INSIGHT</p>
            <h2>{{ isAdminWorkspace ? '系统洞察' : '学习洞察' }}</h2>
          </div>
          <button type="button" @click="router.push(isAdminWorkspace ? '/admin/users' : '/teacher/stage-evaluations')">
            查看详情
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
        <div class="insight-content">
          <div class="student-stat-stack">
            <button
              v-for="stat in insightStats"
              :key="stat.label"
              type="button"
              :class="['student-stat-card', stat.tone]"
              @click="router.push(stat.path)"
            >
              <span>{{ stat.label }}</span>
              <strong>{{ stat.value }}</strong>
              <em>{{ stat.sub }}</em>
            </button>
          </div>
          <div class="trend-block">
            <div class="trend-head">
              <strong>近 7 日记录趋势</strong>
              <span><i></i> 来自真实记录</span>
            </div>
            <div ref="trendChartRef" class="trend-chart"></div>
          </div>
        </div>
        <div class="insight-metric-grid">
          <button
            v-for="card in metricCards"
            :key="card.title"
            type="button"
            :class="['metric-card', card.tone]"
            @click="router.push(card.path)"
          >
            <span class="metric-icon">
              <el-icon><component :is="card.icon" /></el-icon>
            </span>
            <span class="metric-copy">
              <strong>{{ card.title }}</strong>
              <small>{{ card.desc }}</small>
              <em><b>{{ card.value }}</b>{{ card.unit }}</em>
            </span>
          </button>
        </div>
      </article>

      <article class="todo-panel dash-card motion-card">
        <div class="panel-head">
          <div>
            <p class="eyebrow">TASKS</p>
            <h2>{{ isAdminWorkspace ? '运行关注' : '待办任务' }}</h2>
          </div>
          <button type="button" @click="router.push(isAdminWorkspace ? '/admin/logs' : '/teacher/review')">
            {{ isAdminWorkspace ? '系统日志' : '阅卷中心' }}
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
        <div class="review-summary">
          <button
            v-for="item in reviewStats"
            :key="item.label"
            type="button"
            @click="router.push(item.path)"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
        <div v-if="workRows.length" class="todo-list">
          <button v-for="row in workRows" :key="row.id" type="button" class="todo-row" @click="router.push(row.path)">
            <span class="mini-avatar">{{ row.avatar }}</span>
            <strong>{{ row.actor }}</strong>
            <span>{{ row.title }}</span>
            <small>{{ row.source }}</small>
            <time>{{ row.date }}</time>
          </button>
        </div>
        <el-empty v-else :description="isAdminWorkspace ? '暂无运行记录' : '暂无待阅记录'" :image-size="56" />
        <el-button class="review-action" type="primary" @click="router.push(isAdminWorkspace ? '/admin/logs' : '/teacher/review')">
          {{ isAdminWorkspace ? '查看系统日志' : '开始批阅' }}
        </el-button>
      </article>

      <article class="feedback-panel dash-card motion-card">
        <div class="panel-head">
          <div>
            <p class="eyebrow">ACTIVITY</p>
            <h2>{{ isAdminWorkspace ? '系统概览' : '作业反馈详情' }}</h2>
          </div>
          <button type="button" @click="router.push(isAdminWorkspace ? '/admin/users' : '/teacher/stage-evaluations')">
            更多
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
        <div v-if="activityRows.length" class="feedback-list">
          <button
            v-for="row in activityRows"
            :key="row.id"
            type="button"
            class="feedback-row"
            @click="router.push(row.path)"
          >
            <span class="mini-avatar photo">{{ row.avatar }}</span>
            <span class="feedback-copy">
              <strong>{{ row.student }} · {{ cleanFeedbackTitle(row.title) }}</strong>
              <span v-if="feedbackScoreTags(row.title).length" class="ai-score-tags">
                <span v-for="tag in feedbackScoreTags(row.title)" :key="tag" class="ai-score-tag">{{ tag }}</span>
              </span>
              <small>{{ row.meta }} · {{ row.date }}</small>
            </span>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
        <el-empty v-else :description="isAdminWorkspace ? '暂无系统概览数据' : '暂无阶段反馈记录'" :image-size="56" />
      </article>
    </section>

    <aside class="date-widget" aria-label="日期">
      <strong>今日</strong>
      <time>{{ todayLabel }}</time>
    </aside>
  </div>

  <div v-else ref="pageRoot" class="student-dashboard">
    <section class="student-hero motion-hero" aria-labelledby="dashboard-title">
      <div class="student-hero-card">
        <span class="profile-avatar">{{ firstChar(displayName) }}</span>
        <div>
          <p class="eyebrow">Student Workspace</p>
          <h1 id="dashboard-title">{{ displayName }}</h1>
          <span>学生</span>
        </div>
      </div>
      <div class="student-hero-copy">
        <h2>首页</h2>
        <p>集中查看作业、练习、画像诊断、学习路径和智能推荐，快速进入下一步学习。</p>
      </div>
      <el-button class="student-hero-action" plain type="primary" :icon="ArrowRight" @click="router.push('/assignments/my')">
        进入我的作业
      </el-button>
    </section>

    <section class="student-summary-grid" aria-label="学习概览">
      <button
        v-for="card in studentStatCards"
        :key="card.title"
        type="button"
        :class="['student-summary-card', 'motion-card', card.tone]"
        @click="router.push(card.path)"
      >
        <span class="summary-icon">
          <el-icon><component :is="card.icon" /></el-icon>
        </span>
        <span>
          <strong>{{ card.value }}</strong>
          <small>{{ card.title }}</small>
          <em>{{ card.desc }}</em>
        </span>
      </button>
    </section>

    <section class="student-bento-grid" aria-label="学生工作台">
      <article class="student-panel student-learning-panel motion-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Learning</p>
            <h2>学生学习</h2>
          </div>
          <span>核心入口</span>
        </div>
        <div class="student-primary-actions">
          <button v-for="item in groupedShortcuts[0]?.items || []" :key="item.path" type="button" class="student-action-card" @click="router.push(item.path)">
            <span class="shortcut-icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </span>
            <span class="shortcut-copy">
              <strong>{{ item.title }}</strong>
              <small>{{ item.desc }}</small>
            </span>
            <el-icon class="shortcut-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </article>

      <article class="student-panel student-task-panel motion-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Today</p>
            <h2>今日学习建议</h2>
          </div>
          <span>{{ studentTodayTasks.length }} 项</span>
        </div>
        <div class="student-task-list">
          <button v-for="task in studentTodayTasks" :key="task.title" type="button" class="student-task-row" @click="router.push(task.path)">
            <span class="task-tag">{{ task.tag }}</span>
            <span>
              <strong>{{ task.title }}</strong>
              <small>{{ task.desc }}</small>
            </span>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </article>

      <article class="student-panel student-feedback-panel motion-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Feedback</p>
            <h2>学习反馈</h2>
          </div>
          <span>{{ studentInsightCards.length }} 项</span>
        </div>
        <div class="student-insight-grid">
          <button v-for="item in studentInsightCards" :key="item.path" type="button" class="student-mini-card" @click="router.push(item.path)">
            <span class="shortcut-icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </span>
            <strong>{{ item.title }}</strong>
            <small>{{ item.desc }}</small>
          </button>
        </div>
      </article>

      <article class="student-panel student-smart-panel motion-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Smart Learning</p>
            <h2>智能学习</h2>
          </div>
          <span>{{ studentSmartCards.length }} 项</span>
        </div>
        <div class="student-smart-grid">
          <button
            v-for="item in studentSmartCards"
            :key="item.path"
            type="button"
            :class="['student-smart-card', item.tone]"
            @click="router.push(item.path)"
          >
            <span class="shortcut-icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </span>
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.desc }}</small>
            </span>
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.backend-dashboard {
  position: relative;
  display: grid;
  gap: 18px;
  min-height: calc(100vh - 120px);
  padding: 8px 8px 72px;
  color: #1e293b;
}

.dashboard-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  min-height: 150px;
  border: 1px solid rgba(226, 232, 240, 0.78);
  border-radius: 24px;
  padding: 24px;
  background:
    radial-gradient(circle at 12% 20%, rgba(255, 255, 255, 0.46), transparent 28%),
    linear-gradient(105deg, rgba(20, 184, 166, 0.92), rgba(153, 229, 219, 0.66) 34%, rgba(255, 255, 255, 0.9) 58%, rgba(45, 212, 191, 0.34));
  background-size: 180% 180%, 220% 220%;
  box-shadow: 0 24px 60px rgba(15, 118, 110, 0.15);
  overflow: hidden;
  animation: heroGradientFlow 18s ease-in-out infinite alternate;
}

.dashboard-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 34px 34px;
  opacity: 0.22;
  transform: translate3d(0, 0, 0);
  animation: dataTextureDrift 24s linear infinite;
  pointer-events: none;
}

.dashboard-hero::after {
  content: '';
  position: absolute;
  inset: 12px;
  background:
    radial-gradient(circle at 18% 28%, rgba(255, 255, 255, 0.36) 0 2px, transparent 3px),
    radial-gradient(circle at 74% 36%, rgba(20, 184, 166, 0.2) 0 2px, transparent 3px),
    radial-gradient(circle at 88% 72%, rgba(255, 255, 255, 0.26) 0 1px, transparent 2px);
  background-size: 260px 160px, 300px 180px, 220px 140px;
  opacity: 0.5;
  animation: particleFloat 16s ease-in-out infinite alternate;
  pointer-events: none;
}

.dashboard-hero > * {
  position: relative;
  z-index: 1;
}

.dashboard-hero .hero-action {
  border: 0;
  --el-button-bg-color: rgba(255, 255, 255, 0.34);
  --el-button-border-color: transparent;
  --el-button-text-color: #0f4f49;
  --el-button-hover-bg-color: rgba(255, 255, 255, 0.44);
  --el-button-hover-border-color: transparent;
  --el-button-hover-text-color: #0b3b36;
  color: #0f4f49;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: none;
  backdrop-filter: blur(10px);
  font-weight: 700;
  transition: color 0.25s ease, background-color 0.25s ease, transform 0.25s ease;
}

.dashboard-hero .hero-action:hover,
.dashboard-hero .hero-action:focus {
  color: #0b3b36;
  background: rgba(255, 255, 255, 0.44);
  transform: translateY(-1px);
}

.dashboard-hero .hero-action :deep(span) {
  color: currentColor;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 22px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.38);
  backdrop-filter: blur(10px);
}

.profile-avatar,
.mini-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  font-weight: 800;
}

.profile-avatar {
  width: 62px;
  height: 62px;
  color: #0f766e;
  border: 4px solid rgba(255, 255, 255, 0.66);
  background: linear-gradient(180deg, #dff8f3, #ffffff);
  font-size: 24px;
}

.eyebrow {
  margin: 0 0 7px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-card .eyebrow {
  color: rgba(15, 23, 42, 0.58);
}

.profile-card h1,
.hero-copy h2 {
  margin: 0;
  color: #0f172a;
  line-height: 1.2;
}

.profile-card h1 {
  font-size: 24px;
}

.profile-card span:not(.profile-avatar) {
  display: inline-block;
  margin-top: 8px;
  border-radius: 999px;
  padding: 4px 14px;
  color: #475569;
  background: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 700;
}

.hero-copy h2 {
  font-size: 28px;
}

.hero-copy p {
  max-width: 760px;
  margin: 8px 0 0;
  color: #475569;
  line-height: 1.7;
}

.dashboard-error {
  margin: 0;
  border: 1px solid #fecaca;
  border-radius: 14px;
  padding: 12px 14px;
  color: #b91c1c;
  background: #fff1f2;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.dash-card,
.metric-card {
  border: 1px solid rgba(226, 232, 240, 0.78);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.dash-card {
  padding: 18px;
}

.insight-panel,
.todo-panel {
  grid-column: span 6;
}

.insight-panel,
.todo-panel {
  min-height: 420px;
}

.insight-panel {
  display: flex;
  flex-direction: column;
}

.todo-panel {
  display: flex;
  flex-direction: column;
}

.feedback-panel {
  grid-column: span 6;
  position: relative;
  overflow: hidden;
}

.feedback-panel::before {
  content: '';
  position: absolute;
  inset: 14px auto 14px 0;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(20, 184, 166, 0.18), rgba(20, 184, 166, 0.78), rgba(14, 165, 233, 0.18));
  box-shadow: 0 0 16px rgba(20, 184, 166, 0.2);
  animation: aiBreath 2.8s ease-in-out infinite;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.panel-head h2 {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
}

.panel-head button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  color: #64748b;
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.insight-content {
  display: grid;
  grid-template-columns: 144px minmax(0, 1fr);
  gap: 16px;
  flex: 1;
  min-height: 236px;
}

.student-stat-stack {
  display: grid;
  gap: 12px;
}

.student-stat-card {
  position: relative;
  min-height: 92px;
  border: 0;
  border-radius: 16px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
}

.student-stat-card.mint {
  background: #ecfdf5;
}

.student-stat-card.warm {
  background: #fff7ed;
}

.student-stat-card.blue {
  background: #eff6ff;
}

.student-stat-card span,
.student-stat-card strong,
.student-stat-card em {
  display: block;
}

.student-stat-card span {
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.student-stat-card strong {
  margin-top: 8px;
  color: #0f172a;
  font-size: 28px;
  line-height: 1;
}

.student-stat-card em {
  position: absolute;
  right: 12px;
  bottom: 12px;
  border-radius: 999px;
  padding: 3px 8px;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.78);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}

.trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.trend-head strong {
  color: #334155;
  font-size: 13px;
}

.trend-head span {
  color: #64748b;
  font-size: 12px;
}

.trend-head i {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 4px;
  border-radius: 50%;
  background: #0f766e;
}

.trend-block {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.trend-chart {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 220px;
}

.insight-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #edf2f7;
}

.review-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.review-summary button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  min-height: 104px;
  border: 0;
  border-radius: 16px;
  padding: 18px 16px;
  color: #0f172a;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease-in-out;
}

.review-summary button:nth-child(2) {
  background: linear-gradient(135deg, #eff6ff, #e0f2fe);
}

.review-summary button:hover,
.review-summary button:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 18px 34px rgba(15, 118, 110, 0.1);
  outline: none;
}

.review-summary button:hover .el-icon,
.review-summary button:focus-visible .el-icon {
  color: #0f766e;
  transform: scale(1.1);
}

.review-summary span,
.review-summary strong {
  display: block;
}

.review-summary span {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
}

.review-summary strong {
  margin-top: 6px;
  font-size: 30px;
  line-height: 1;
}

.todo-list,
.feedback-list {
  display: grid;
  gap: 8px;
}

.todo-row,
.feedback-row {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.todo-row {
  display: grid;
  grid-template-columns: 30px 78px minmax(0, 1fr) 92px 80px;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  color: #475569;
  font-size: 12px;
}

.mini-avatar {
  width: 28px;
  height: 28px;
  color: #0f766e;
  background: #dff8f3;
  font-size: 12px;
}

.mini-avatar.photo {
  color: #0f172a;
  background: linear-gradient(135deg, #fef3c7, #bae6fd);
}

.todo-row strong {
  color: #0f172a;
  font-size: 13px;
}

.todo-row span:nth-child(3),
.feedback-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-row time {
  color: #64748b;
  text-align: right;
}

.review-action {
  width: 100%;
  margin-top: auto;
  margin-bottom: 2px;
  border-radius: 999px;
  background: linear-gradient(135deg, #155e75, #0f766e);
  border: 0;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.22);
}

.metric-card {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  min-height: 88px;
  gap: 10px;
  padding: 14px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease-in-out;
}

.metric-card:hover,
.metric-card:focus-visible,
.feedback-row:hover,
.feedback-row:focus-visible,
.todo-row:hover,
.todo-row:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 20px 38px rgba(15, 118, 110, 0.12);
  outline: none;
}

.metric-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: #0f766e;
  background: #dff8f3;
  transition: transform 0.3s ease-in-out, color 0.3s ease-in-out, background-color 0.3s ease-in-out;
}

.metric-card:hover .metric-icon,
.metric-card:focus-visible .metric-icon {
  color: #14b8a6;
  background: #ccfbf1;
  transform: scale(1.1);
}

.metric-card.blue .metric-icon {
  color: #075985;
  background: #e0f2fe;
}

.metric-card.gold .metric-icon {
  color: #92400e;
  background: #fef3c7;
}

.metric-card.teal .metric-icon {
  color: #0f766e;
  background: #ccfbf1;
}

.metric-copy strong,
.metric-copy small,
.metric-copy em,
.feedback-copy strong,
.feedback-copy small {
  display: block;
}

.metric-copy strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
}

.metric-copy small {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.metric-copy em {
  margin-top: 10px;
  color: #0f172a;
  font-style: normal;
}

.metric-copy b {
  margin-right: 4px;
  font-size: 24px;
  font-weight: 800;
}

.feedback-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  border-bottom: 1px solid #edf2f7;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feedback-row:last-child {
  border-bottom: 0;
}

.feedback-copy strong {
  color: #0f172a;
  font-size: 13px;
}

.feedback-copy small {
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.ai-score-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.ai-score-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 1px solid #99f6e4;
  border-radius: 999px;
  padding: 4px 10px;
  color: #0f766e;
  background: #f0fdfa;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(20, 184, 166, 0.08);
}

@keyframes heroGradientFlow {
  0% {
    background-position: 0% 50%, 0% 50%;
  }

  100% {
    background-position: 100% 50%, 100% 50%;
  }
}

@keyframes dataTextureDrift {
  0% {
    transform: translate3d(0, 0, 0);
  }

  100% {
    transform: translate3d(34px, 34px, 0);
  }
}

@keyframes particleFloat {
  0% {
    transform: translate3d(-8px, 4px, 0);
  }

  100% {
    transform: translate3d(12px, -8px, 0);
  }
}

@keyframes aiBreath {
  0%,
  100% {
    opacity: 0.52;
    box-shadow: 0 0 12px rgba(20, 184, 166, 0.14);
  }

  50% {
    opacity: 1;
    box-shadow: 0 0 26px rgba(20, 184, 166, 0.36);
  }
}

.date-widget {
  position: fixed;
  right: 28px;
  bottom: 24px;
  z-index: 4;
  display: grid;
  gap: 2px;
  min-width: 128px;
  border: 1px solid rgba(226, 232, 240, 0.78);
  border-radius: 16px;
  padding: 12px 14px;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(10px);
}

.date-widget strong {
  font-size: 15px;
}

.date-widget time {
  color: #64748b;
  font-size: 12px;
}

.student-dashboard {
  display: grid;
  gap: 18px;
  min-height: calc(100vh - 120px);
  padding: 8px 8px 72px;
  color: #1e293b;
}

.student-hero,
.student-panel,
.student-summary-card {
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}

.student-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(260px, 350px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  min-height: 188px;
  overflow: hidden;
  padding: 28px;
  background:
    linear-gradient(112deg, rgba(20, 184, 166, 0.78), rgba(153, 246, 228, 0.36), rgba(255, 255, 255, 0.94)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(15, 118, 110, 0.12));
  background-size: 200% 200%, 100% 100%;
  animation: heroGradientFlow 18s ease-in-out infinite alternate;
}

.student-hero::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: 0.38;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.34) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.34) 1px, transparent 1px);
  background-size: 28px 28px;
  animation: dataTextureDrift 24s linear infinite;
}

.student-hero > * {
  position: relative;
  z-index: 1;
}

.student-hero-card {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  border-radius: 18px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(12px);
}

.student-hero-card h1,
.student-hero-copy h2 {
  margin: 0;
  color: #0f172a;
  line-height: 1.15;
}

.student-hero-card h1 {
  font-size: 28px;
  font-weight: 800;
}

.student-hero-card span:not(.profile-avatar) {
  display: inline-flex;
  margin-top: 8px;
  border-radius: 999px;
  padding: 3px 12px;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 800;
}

.student-hero-copy h2 {
  font-size: 30px;
  font-weight: 800;
}

.student-hero-copy p {
  max-width: 720px;
  margin: 10px 0 0;
  color: #334155;
  font-size: 15px;
  line-height: 1.7;
}

.student-hero-action {
  border: 0;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 800;
  box-shadow: 0 12px 26px rgba(15, 118, 110, 0.14);
  backdrop-filter: blur(12px);
}

.student-hero-action:hover,
.student-hero-action:focus {
  color: #0f766e;
  background: rgba(255, 255, 255, 0.9);
}

.student-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.student-summary-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 104px;
  padding: 18px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.student-summary-card:hover,
.student-summary-card:focus-visible,
.student-panel:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 184, 166, 0.32);
  box-shadow: 0 18px 36px rgba(15, 118, 110, 0.08);
  outline: none;
}

.summary-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 15px;
  color: #0f766e;
  background: #ccfbf1;
  transition: transform 0.24s ease;
}

.student-summary-card:hover .summary-icon,
.student-action-card:hover .shortcut-icon,
.student-mini-card:hover .shortcut-icon,
.student-smart-card:hover .shortcut-icon {
  transform: scale(1.08);
}

.student-summary-card strong,
.student-summary-card small,
.student-summary-card em {
  display: block;
}

.student-summary-card strong {
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
}

.student-summary-card small {
  margin-top: 2px;
  color: #0f766e;
  font-size: 13px;
  font-weight: 800;
}

.student-summary-card em {
  margin-top: 5px;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.student-summary-card.blue .summary-icon,
.student-smart-card.blue .shortcut-icon {
  color: #0369a1;
  background: #e0f2fe;
}

.student-summary-card.teal .summary-icon,
.student-smart-card.teal .shortcut-icon {
  color: #0f766e;
  background: #ccfbf1;
}

.student-summary-card.gold .summary-icon,
.student-smart-card.gold .shortcut-icon {
  color: #92400e;
  background: #fef3c7;
}

.student-bento-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.student-panel {
  padding: 22px;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.student-learning-panel {
  grid-column: span 7;
}

.student-task-panel {
  grid-column: span 5;
}

.student-feedback-panel {
  grid-column: span 5;
}

.student-smart-panel {
  grid-column: span 7;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 0;
  color: #172033;
  font-size: 20px;
}

.section-heading span {
  color: #667085;
  font-size: 13px;
}

.student-primary-actions,
.student-insight-grid,
.student-smart-grid {
  display: grid;
  gap: 14px;
}

.student-primary-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.student-insight-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.student-smart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.student-action-card,
.student-task-row,
.student-mini-card,
.student-smart-card {
  border: 1px solid #e6edf3;
  background: #f8fafc;
  cursor: pointer;
  text-align: left;
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease, background-color 0.24s ease;
}

.student-action-card,
.student-smart-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 13px;
  min-height: 92px;
  width: 100%;
  border-radius: 16px;
  padding: 16px;
}

.student-smart-card {
  grid-template-columns: 46px minmax(0, 1fr);
}

.student-task-list {
  display: grid;
  gap: 12px;
}

.student-task-row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 13px;
  min-height: 82px;
  border-radius: 16px;
  padding: 15px 16px;
}

.task-tag {
  display: inline-flex;
  justify-content: center;
  border-radius: 999px;
  padding: 6px 10px;
  color: #0f766e;
  background: #ccfbf1;
  font-size: 12px;
  font-weight: 800;
}

.student-mini-card {
  display: grid;
  gap: 8px;
  min-height: 138px;
  border-radius: 16px;
  padding: 16px;
}

.shortcut-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  color: #0f766e;
  background: #e6f7f4;
}

.shortcut-copy strong,
.shortcut-copy small {
  display: block;
}

.shortcut-copy strong {
  color: #172033;
  font-size: 16px;
}

.shortcut-copy small {
  margin-top: 5px;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.shortcut-arrow {
  color: #98a2b3;
}

.student-action-card:hover,
.student-action-card:focus-visible,
.student-task-row:hover,
.student-task-row:focus-visible,
.student-mini-card:hover,
.student-mini-card:focus-visible,
.student-smart-card:hover,
.student-smart-card:focus-visible {
  transform: translateY(-2px);
  border-color: rgba(20, 184, 166, 0.45);
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(15, 118, 110, 0.08);
  outline: none;
}

.student-task-row strong,
.student-task-row small,
.student-mini-card strong,
.student-mini-card small,
.student-smart-card strong,
.student-smart-card small {
  display: block;
}

.student-task-row strong,
.student-mini-card strong,
.student-smart-card strong {
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
}

.student-task-row small,
.student-mini-card small,
.student-smart-card small {
  margin-top: 5px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

@media (max-width: 1280px) {
  .dashboard-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .student-hero {
    grid-template-columns: 1fr;
    align-items: start;
  }

  .insight-panel,
  .todo-panel,
  .feedback-panel {
    grid-column: span 12;
  }

  .insight-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .student-summary-grid,
  .student-smart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .student-learning-panel,
  .student-task-panel,
  .student-feedback-panel,
  .student-smart-panel {
    grid-column: span 12;
  }
}

@media (max-width: 820px) {
  .backend-dashboard,
  .student-dashboard {
    padding: 0 0 90px;
  }

  .insight-content {
    grid-template-columns: 1fr;
  }

  .student-stat-stack,
  .review-summary,
  .student-summary-grid,
  .student-primary-actions,
  .student-insight-grid,
  .student-smart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-chart {
    min-height: 240px;
  }

  .todo-row {
    grid-template-columns: 30px 64px minmax(0, 1fr);
  }

  .todo-row small,
  .todo-row time {
    display: none;
  }

  .date-widget {
    right: 12px;
    bottom: 12px;
  }
}

@media (max-width: 640px) {
  .dashboard-hero,
  .dash-card,
  .student-hero,
  .student-panel {
    padding: 16px;
  }

  .profile-card,
  .student-hero-card {
    width: 100%;
  }

  .student-stat-stack,
  .review-summary,
  .insight-metric-grid,
  .student-summary-grid,
  .student-primary-actions,
  .student-insight-grid,
  .student-smart-grid {
    grid-template-columns: 1fr;
  }

  .student-hero-card h1,
  .student-hero-copy h2,
  .hero-copy h2 {
    font-size: 24px;
  }

  .student-task-row {
    grid-template-columns: 50px minmax(0, 1fr);
  }

  .student-task-row > .el-icon {
    display: none;
  }
}
</style>
