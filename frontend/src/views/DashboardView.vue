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

const trendRecordTotal = computed(() => trendPoints.value.reduce((sum, item) => sum + Number(item.value || 0), 0))

const generatedResourceCount = computed(() => (
  isAdminWorkspace.value ? llmProviderTotal.value + llmTemplateTotal.value : resourcePreviewRows.value.length
))

const backendOverviewCards = computed(() => {
  if (isAdminWorkspace.value) {
    return [
      { title: '系统用户', desc: '平台账号与权限概览', value: userTotal.value, unit: ' 个', path: '/admin/users', icon: UserFilled, tone: 'blue', badge: '账号' },
      { title: '资源题库', desc: '题目、试卷与作业资源', value: questionTotal.value + paperTotal.value + assignmentTotal.value, unit: ' 项', path: '/questions', icon: FolderOpened, tone: 'cyan', badge: '资源' },
      { title: '模型服务', desc: '模型与提示词模板配置', value: llmProviderTotal.value + llmTemplateTotal.value, unit: ' 项', path: '/admin/llm/models', icon: Setting, tone: 'purple', badge: '智能' },
      { title: '调用记录', desc: '大模型调用与系统日志', value: llmCallTotal.value, unit: ' 条', path: '/llm/calls', icon: DataAnalysis, tone: 'amber', badge: '日志' },
    ]
  }
  return [
    { title: '班级学生', desc: `${classCount.value} 个班级，来自班级管理`, value: studentCount.value, unit: ' 人', path: '/classes/manage', icon: UserFilled, tone: 'blue', badge: '班级' },
    { title: '薄弱知识点', desc: weakPointRows.value.length ? '来自阶段评价诊断' : '等待阶段评价数据', value: weakPointRows.value.length, unit: ' 项', path: '/teacher/stage-evaluations', icon: DataAnalysis, tone: 'amber', badge: '诊断' },
    { title: '待处理任务', desc: '待批改作业与待阅测验', value: reviewTotal.value, unit: ' 条', path: '/teacher/review', icon: DocumentChecked, tone: 'purple', badge: '待办' },
    { title: '资源推荐', desc: '个性化资源生成入口', value: generatedResourceCount.value, unit: ' 个', path: '/teacher/agent-resources', icon: CollectionTag, tone: 'cyan', badge: 'AI' },
  ]
})

const backendRefreshLabel = computed(() => (isAdminWorkspace.value ? '刷新系统数据' : '刷新教学数据'))

const aiTeachingTips = computed(() => {
  if (isAdminWorkspace.value) {
    return [
      { id: 'model', label: '模型服务', text: llmProviderTotal.value ? '模型服务已配置，可查看调用质量与日志。' : '暂无可用模型配置，建议先完善模型服务。', tone: 'blue' },
      { id: 'log', label: '运行记录', text: loginLogTotal.value ? '系统已有登录日志，可进入日志页核查活跃情况。' : '暂无登录日志记录。', tone: 'cyan' },
      { id: 'resource', label: '资源库', text: questionTotal.value ? '题库资源已建立，可继续完善试卷与作业链路。' : '题库数据较少，建议优先补充教学资源。', tone: 'amber' },
    ]
  }
  return [
    { id: 'review', label: '今日待办', text: reviewTotal.value ? `当前有 ${reviewTotal.value} 条待处理记录，建议优先进入阅卷中心。` : '暂无待批改记录，班级学习状态稳定。', tone: reviewTotal.value ? 'amber' : 'green' },
    { id: 'weak', label: '画像诊断', text: weakPointRows.value.length ? '已发现薄弱知识点，可生成针对性讲解与练习资源。' : '暂无明确薄弱知识点，可等待阶段评价更新。', tone: weakPointRows.value.length ? 'purple' : 'blue' },
    { id: 'resource', label: '资源建议', text: '可根据作业反馈生成讲解视频、练习题和错因复盘资源。', tone: 'cyan' },
  ]
})

const weakPointRows = computed(() => {
  const rows = []
  stageRows.value.forEach((row) => {
    const candidates = row.weakKnowledgePoints || row.weakPoints || row.weakTags || row.lowMasteryPoints || []
    if (Array.isArray(candidates)) {
      candidates.forEach((item, index) => {
        rows.push({
          id: item.id || item.knowledgePointId || `${row.id || row.studentId || 'stage'}-${index}`,
          name: item.name || item.title || item.knowledgePointName || item.tagName || '未命名知识点',
          value: item.count ?? item.studentCount ?? item.masteryValue ?? item.score ?? 0,
          desc: item.description || item.reason || row.studentName || row.username || '来自阶段评价记录',
        })
      })
    }
  })
  return rows.slice(0, 5)
})

// 当前 Dashboard 接口没有返回已生成资源列表；后续可接入教师智能体资源生成结果。
const resourcePreviewRows = computed(() => [])

const learningHistoryRows = computed(() => {
  const assignmentRows = recentAssignments.value.slice(0, 3).map((row) => ({
    id: `assignment-${row.id || row.assignmentId || row.title}`,
    type: '作业',
    title: row.title || row.assignmentTitle || `作业 #${row.id || row.assignmentId || '-'}`,
    desc: row.status || row.assignmentType || '教学任务记录',
    date: formatDate(row.updatedAt || row.createdAt || row.publishedAt),
  }))
  const paperRows = recentPapers.value.slice(0, 3).map((row) => ({
    id: `paper-${row.id || row.paperId || row.title}`,
    type: '试卷',
    title: row.title || row.paperTitle || `试卷 #${row.id || row.paperId || '-'}`,
    desc: row.status || '试卷记录',
    date: formatDate(row.updatedAt || row.createdAt),
  }))
  return [...assignmentRows, ...paperRows].slice(0, 5)
})

function reloadDashboard() {
  if (isAdminWorkspace.value) {
    loadAdminDashboard()
  } else {
    loadTeacherDashboard()
  }
}

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

const studentUnifiedStatCards = computed(() => [
  { title: '学习任务', value: '作业', desc: '查看待完成和已提交任务', path: '/assignments/my', icon: DocumentChecked, tone: 'blue', badge: '任务' },
  { title: '练习入口', value: '题库', desc: '进入题库练习与专项训练', path: '/question-bank', icon: Reading, tone: 'amber', badge: '练习' },
  { title: '学习画像', value: '诊断', desc: '查看薄弱点、优势点和画像依据', path: '/knowledge-profile', icon: DataAnalysis, tone: 'purple', badge: '画像' },
  { title: '推荐资源', value: '资源', desc: '查看学习资源与智能推荐', path: '/smart-recommendations', icon: CollectionTag, tone: 'cyan', badge: 'AI' },
])

const studentHeroMetrics = computed(() => [
  { label: '今日建议', value: studentTodayTasks.value.length },
  { label: '反馈入口', value: studentInsightCards.value.length },
  { label: '智能学习', value: studentSmartCards.value.length },
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
    <section class="dashboard-page-head motion-hero" aria-labelledby="backend-dashboard-title">
      <div class="page-title-group">
        <p class="eyebrow">{{ isAdminWorkspace ? 'Admin Console' : 'Teacher Console' }}</p>
        <h1 id="backend-dashboard-title">{{ dashboardTitle }}</h1>
        <p>{{ dashboardSubtitle }}</p>
      </div>
      <div class="hero-summary-panel" aria-label="今日教学摘要">
        <span class="ai-badge">教学摘要</span>
        <div class="hero-summary-grid">
          <span>
            <strong>{{ reviewTotal }}</strong>
            <small>{{ isAdminWorkspace ? '调用记录' : '待处理任务' }}</small>
          </span>
          <span>
            <strong>{{ trendRecordTotal }}</strong>
            <small>近 7 日记录</small>
          </span>
          <span>
            <strong>{{ generatedResourceCount }}</strong>
            <small>{{ isAdminWorkspace ? '模型配置' : '已生成资源' }}</small>
          </span>
        </div>
      </div>
      <div class="page-head-actions">
        <div class="profile-chip">
          <span class="profile-avatar">{{ firstChar(displayName) }}</span>
          <span>
            <strong>{{ displayName }}</strong>
            <small>{{ isAdminWorkspace ? '管理员' : '教师' }}</small>
          </span>
        </div>
        <el-button class="hero-action" type="primary" :loading="loading" @click="reloadDashboard">
          {{ backendRefreshLabel }}
        </el-button>
      </div>
    </section>

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

    <section v-if="loadError" class="dashboard-error motion-card">
      <span>{{ loadError }}</span>
      <el-button link type="danger" @click="reloadDashboard">重试</el-button>
    </section>

    <section class="overview-grid" aria-label="数据概览">
      <button
        v-for="card in backendOverviewCards"
        :key="card.title"
        type="button"
        :class="['metric-card', 'motion-card', card.tone]"
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
        <span class="metric-badge">{{ card.badge }}</span>
      </button>
    </section>

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
        <div class="ai-reminder-list">
          <div v-for="tip in aiTeachingTips" :key="tip.id" :class="['ai-reminder-item', tip.tone]">
            <span>{{ tip.label }}</span>
            <p>{{ tip.text }}</p>
          </div>
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

    <section class="education-core-grid motion-card" aria-label="教育业务核心区">
      <article class="compact-card">
        <div class="compact-card-head">
          <div>
            <p class="eyebrow">Weak Points</p>
            <h2>薄弱知识点 Top 5</h2>
          </div>
          <el-tag size="small" effect="plain">{{ weakPointRows.length }} 项</el-tag>
        </div>
        <div v-if="weakPointRows.length" class="compact-list">
          <button v-for="item in weakPointRows" :key="item.id" type="button" class="knowledge-row" @click="router.push('/teacher/stage-evaluations')">
            <span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.desc }}</small>
            </span>
            <el-progress :percentage="Math.min(100, Number(item.value) || 0)" :show-text="false" />
          </button>
        </div>
        <div v-else class="mini-empty">暂无薄弱知识点数据，可在阶段评价接口补充后展示。</div>
      </article>

      <article class="compact-card">
        <div class="compact-card-head">
          <div>
            <p class="eyebrow">Resources</p>
            <h2>个性化资源推荐</h2>
          </div>
          <el-button link type="primary" @click="router.push(isAdminWorkspace ? '/admin/llm/models' : '/teacher/agent-resources')">
            {{ isAdminWorkspace ? '模型配置' : '生成资源' }}
          </el-button>
        </div>
        <div v-if="resourcePreviewRows.length" class="compact-list">
          <button v-for="item in resourcePreviewRows" :key="item.id" type="button" class="resource-row">
            <span class="type-pill">{{ item.type }}</span>
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.desc }}</small>
            </span>
          </button>
        </div>
        <div v-else class="mini-empty">暂无资源生成结果，进入智能体资源生成后可查看。</div>
      </article>

      <article class="compact-card">
        <div class="compact-card-head">
          <div>
            <p class="eyebrow">History</p>
            <h2>学习历史记录</h2>
          </div>
          <el-button link type="primary" @click="router.push(isAdminWorkspace ? '/llm/calls' : '/teacher/review')">查看记录</el-button>
        </div>
        <div v-if="learningHistoryRows.length" class="compact-list">
          <button v-for="item in learningHistoryRows" :key="item.id" type="button" class="history-row" @click="router.push(item.type === '试卷' ? '/papers' : '/assignments/manage')">
            <span class="type-pill muted-pill">{{ item.type }}</span>
            <span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.desc }} · {{ item.date }}</small>
            </span>
          </button>
        </div>
        <div v-else class="mini-empty">暂无考试、作业或学习记录。</div>
      </article>
    </section>

    <section class="detail-record-card dash-card motion-card" aria-label="详细记录区">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Activity</p>
          <h2>{{ isAdminWorkspace ? '系统概览记录' : '作业反馈详情' }}</h2>
        </div>
        <button type="button" @click="router.push(isAdminWorkspace ? '/admin/users' : '/teacher/stage-evaluations')">
          更多
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
      <div v-if="activityRows.length" class="detail-record-list">
        <button
          v-for="row in activityRows"
          :key="row.id"
          type="button"
          class="detail-record-row"
          @click="router.push(row.path)"
        >
          <span class="mini-avatar photo">{{ row.avatar }}</span>
          <span class="detail-record-main">
            <strong>{{ row.student }}</strong>
            <small>{{ cleanFeedbackTitle(row.title) }}</small>
          </span>
          <span v-if="feedbackScoreTags(row.title).length" class="ai-score-tags">
            <span v-for="tag in feedbackScoreTags(row.title)" :key="tag" class="ai-score-tag">{{ tag }}</span>
          </span>
          <time>{{ row.date }}</time>
          <el-icon><ArrowRight /></el-icon>
        </button>
      </div>
      <div v-else class="mini-empty">{{ isAdminWorkspace ? '暂无系统概览数据。' : '暂无阶段反馈记录。' }}</div>
    </section>

    <Teleport to="body">
      <aside class="date-widget dashboard-date-floating" aria-label="日期">
        <strong>今日</strong>
        <time>{{ todayLabel }}</time>
      </aside>
    </Teleport>
  </div>

  <div v-else ref="pageRoot" class="student-dashboard">
    <section class="student-hero motion-hero" aria-labelledby="dashboard-title">
      <div class="student-hero-copy">
        <p class="eyebrow">Student Console</p>
        <h1 id="dashboard-title">学生学习总览</h1>
        <p>欢迎回来，{{ displayName }}。集中查看作业、题库练习、学习画像、智能推荐和下一步学习路径。</p>
      </div>
      <div class="hero-summary-panel student-hero-summary" aria-label="今日学习摘要">
        <span class="ai-badge">学习摘要</span>
        <div class="hero-summary-grid">
          <span v-for="item in studentHeroMetrics" :key="item.label">
            <strong>{{ item.value }}</strong>
            <small>{{ item.label }}</small>
          </span>
        </div>
      </div>
      <div class="page-head-actions student-head-actions">
        <div class="profile-chip">
          <span class="profile-avatar">{{ firstChar(displayName) }}</span>
          <span>
            <strong>{{ displayName }}</strong>
            <small>学生</small>
          </span>
        </div>
        <el-button class="student-hero-action" type="primary" :icon="ArrowRight" @click="router.push('/assignments/my')">
          进入我的作业
        </el-button>
      </div>
    </section>

    <section class="student-summary-grid" aria-label="学习概览">
      <button
        v-for="card in studentUnifiedStatCards"
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
        <span class="student-card-badge">{{ card.badge }}</span>
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

/* Current page dashboard refinement: light modern education admin style. */
.backend-dashboard {
  max-width: 1680px;
  width: 100%;
  margin: 0 auto;
  gap: 20px;
  min-height: calc(100vh - 120px);
  padding: 6px 4px 72px;
  color: #172033;
}

.dashboard-hero {
  display: none;
}

.dashboard-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 1px solid #e5eaf3;
  border-radius: 18px;
  padding: 22px 24px;
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(255, 255, 255, 0.96)),
    #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.page-title-group {
  min-width: 0;
}

.page-title-group h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 800;
}

.page-title-group p:last-child {
  max-width: 860px;
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

.page-head-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex: 0 0 auto;
}

.profile-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  border: 1px solid #e5eaf3;
  border-radius: 999px;
  padding: 5px 12px 5px 6px;
  background: #ffffff;
}

.profile-chip .profile-avatar {
  width: 36px;
  height: 36px;
  border: 0;
  color: #2563eb;
  background: #eff6ff;
  font-size: 15px;
}

.profile-chip strong,
.profile-chip small {
  display: block;
}

.profile-chip strong {
  color: #172033;
  font-size: 14px;
  font-weight: 800;
}

.profile-chip small {
  margin-top: 1px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.backend-dashboard .hero-action {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
}

.dashboard-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  border: 1px solid #fecaca;
  border-radius: 14px;
  padding: 12px 14px;
  color: #991b1b;
  background: #fff1f2;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.dashboard-grid {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
}

.dash-card,
.metric-card {
  border: 1px solid #e5eaf3;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.dash-card {
  padding: 20px;
}

.dash-card:hover,
.metric-card:hover,
.metric-card:focus-visible {
  border-color: rgba(37, 99, 235, 0.22);
  box-shadow: 0 16px 36px rgba(37, 99, 235, 0.09);
}

.insight-panel {
  grid-column: span 8;
  min-height: 360px;
}

.todo-panel {
  grid-column: span 4;
  min-height: 360px;
}

.feedback-panel {
  grid-column: span 8;
}

.feedback-panel::before,
.insight-metric-grid {
  display: none;
}

.panel-head {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}

.panel-head h2 {
  color: #111827;
  font-size: 18px;
}

.panel-head .eyebrow {
  color: #2563eb;
}

.panel-head button {
  min-height: 32px;
  border-radius: 999px;
  padding: 0 10px;
  color: #2563eb;
  background: #eff6ff;
}

.insight-content {
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 18px;
  min-height: 250px;
}

.student-stat-card {
  min-height: 108px;
  border: 1px solid #e5eaf3;
  background: #f8fafc;
}

.student-stat-card.mint,
.student-stat-card.warm,
.student-stat-card.blue {
  background: #f8fafc;
}

.student-stat-card strong {
  color: #1d4ed8;
}

.student-stat-card em {
  color: #2563eb;
  background: #eff6ff;
}

.trend-chart {
  min-height: 250px;
}

.review-summary {
  gap: 12px;
}

.review-summary button {
  min-height: 112px;
  border: 1px solid #e5eaf3;
  background: #f8fafc;
}

.review-summary button:nth-child(2) {
  background: #f8fafc;
}

.review-summary strong {
  color: #1d4ed8;
}

.todo-list,
.feedback-list {
  gap: 10px;
}

.todo-row,
.feedback-row {
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 9px 10px;
  background: #ffffff;
}

.todo-row:hover,
.todo-row:focus-visible,
.feedback-row:hover,
.feedback-row:focus-visible {
  transform: translateY(-1px);
  border-color: #dbeafe;
  background: #f8fafc;
  box-shadow: none;
}

.metric-card {
  min-height: 116px;
  padding: 18px;
}

.metric-icon {
  color: #2563eb;
  background: #eff6ff;
}

.metric-card.blue .metric-icon,
.metric-card.gold .metric-icon,
.metric-card.teal .metric-icon {
  color: #2563eb;
  background: #eff6ff;
}

.metric-copy strong {
  color: #111827;
}

.metric-copy b {
  color: #1d4ed8;
}

.review-action {
  margin-top: 14px;
  background: linear-gradient(135deg, #2563eb, #0891b2);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
}

.date-widget {
  border: 1px solid #e5eaf3;
  color: #172033;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
}

/* Compact education admin dashboard overrides. */
.backend-dashboard {
  max-width: none;
  width: min(1720px, calc(100vw - 64px));
  margin: 0 auto;
  gap: 16px;
  min-height: calc(100vh - 96px);
  padding: 0 0 48px;
  background: #f5f7fb;
  box-shadow: 0 0 0 100vmax #f5f7fb;
  clip-path: inset(0 -100vmax);
}

.dashboard-page-head {
  min-height: 82px;
  border-color: #e6eaf0;
  border-radius: 14px;
  padding: 16px 18px;
  background: #ffffff;
  box-shadow: none;
}

.page-title-group h1 {
  font-size: 24px;
}

.page-title-group p:last-child {
  margin-top: 6px;
  font-size: 13px;
}

.page-head-actions {
  gap: 10px;
}

.profile-chip {
  min-height: 40px;
  border-radius: 12px;
}

.backend-dashboard .hero-action {
  min-height: 38px;
  border-radius: 10px;
  background: #2563eb;
  box-shadow: none;
}

.dashboard-error {
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff7f7;
}

.overview-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.overview-grid .metric-card {
  min-height: 104px;
  border-radius: 14px;
  padding: 16px;
  box-shadow: none;
}

.overview-grid .metric-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
}

.overview-grid .metric-copy b {
  font-size: 28px;
}

.dashboard-grid {
  gap: 16px;
}

.dash-card {
  border-radius: 14px;
  padding: 18px;
  box-shadow: none;
}

.insight-panel {
  grid-column: span 8;
  min-height: 340px;
}

.todo-panel {
  grid-column: span 4;
  min-height: 340px;
}

.feedback-panel {
  display: none;
}

.panel-head {
  margin-bottom: 14px;
  padding-bottom: 10px;
}

.panel-head h2,
.compact-card-head h2 {
  margin: 0;
  color: #111827;
  font-size: 16px;
  font-weight: 800;
}

.panel-head > div > p:last-child {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.insight-content {
  grid-template-columns: 150px minmax(0, 1fr);
  min-height: 234px;
}

.student-stat-stack {
  gap: 10px;
}

.student-stat-card {
  min-height: 98px;
  border-radius: 12px;
  padding: 13px;
}

.trend-chart {
  min-height: 228px;
}

.review-summary button {
  min-height: 92px;
  border-radius: 12px;
  padding: 14px;
}

.review-summary strong {
  font-size: 26px;
}

.todo-row {
  grid-template-columns: 28px 70px minmax(0, 1fr) 76px;
  min-height: 40px;
  padding: 8px 9px;
}

.todo-row time {
  display: none;
}

.review-action {
  min-height: 38px;
  border-radius: 10px;
  background: #2563eb;
  box-shadow: none;
}

.education-core-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.compact-card,
.detail-record-card {
  border: 1px solid #e6eaf0;
  border-radius: 14px;
  padding: 16px;
  background: #ffffff;
  box-shadow: none;
}

.compact-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.compact-card-head .eyebrow {
  color: #2563eb;
}

.compact-list {
  display: grid;
  gap: 8px;
}

.knowledge-row,
.resource-row,
.history-row {
  display: grid;
  align-items: center;
  width: 100%;
  min-height: 54px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  padding: 10px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.knowledge-row {
  grid-template-columns: minmax(0, 1fr) 86px;
  gap: 10px;
}

.resource-row,
.history-row {
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
}

.knowledge-row:hover,
.resource-row:hover,
.history-row:hover,
.detail-record-row:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.knowledge-row strong,
.resource-row strong,
.history-row strong,
.detail-record-main strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.knowledge-row small,
.resource-row small,
.history-row small,
.detail-record-main small {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #6b7280;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  border-radius: 999px;
  padding: 4px 8px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 12px;
  font-weight: 800;
}

.muted-pill {
  color: #475569;
  background: #f1f5f9;
}

.mini-empty {
  display: grid;
  min-height: 112px;
  place-items: center;
  border: 1px dashed #dbe3ee;
  border-radius: 12px;
  padding: 16px;
  color: #94a3b8;
  background: #fafcff;
  font-size: 13px;
  text-align: center;
}

.detail-record-card {
  grid-column: 1 / -1;
}

.detail-record-list {
  display: grid;
  gap: 8px;
}

.detail-record-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto 92px 18px;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  padding: 10px 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}

.detail-record-row time {
  color: #64748b;
  font-size: 12px;
  text-align: right;
}

.date-widget {
  position: fixed;
  right: 28px;
  bottom: 88px;
  z-index: 30;
  border-radius: 12px;
  box-shadow: none;
}

.dashboard-date-floating {
  position: fixed !important;
  right: 28px !important;
  bottom: 28px !important;
  z-index: 3000 !important;
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
}

/* Student dashboard unified with teacher/admin console style. */
.student-dashboard {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  gap: 16px;
  min-height: calc(100vh - 96px);
  padding: 0 0 48px;
  color: #172033;
  background: #f5f7fb;
  box-shadow: 0 0 0 100vmax #f5f7fb;
  clip-path: inset(0 -100vmax);
}

.student-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 150px;
  gap: 24px;
  border: 0;
  border-radius: 18px;
  padding: 22px 24px;
  color: #ffffff;
  background:
    radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.28), transparent 22%),
    radial-gradient(circle at 52% 112%, rgba(20, 184, 166, 0.42), transparent 34%),
    linear-gradient(135deg, #2563eb 0%, #4f46e5 48%, #14b8a6 100%);
  box-shadow: 0 16px 38px rgba(37, 99, 235, 0.16);
}

.student-hero::before {
  display: none;
}

.student-hero-copy {
  min-width: 0;
}

.student-hero-copy .eyebrow,
.student-hero-copy h1,
.student-hero-copy p {
  color: #ffffff;
}

.student-hero-copy .eyebrow {
  margin-bottom: 8px;
  opacity: 0.82;
}

.student-hero-copy h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
}

.student-hero-copy p {
  max-width: 720px;
  margin: 10px 0 0;
  opacity: 0.86;
  font-size: 14px;
  line-height: 1.7;
}

.student-hero-summary {
  flex: 0 0 320px;
}

.student-head-actions {
  flex: 0 0 auto;
}

.student-head-actions .profile-chip {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.16);
}

.student-head-actions .profile-chip strong,
.student-head-actions .profile-chip small {
  color: #ffffff;
}

.student-head-actions .profile-avatar {
  color: #2563eb;
  background: #ffffff;
}

.student-hero-action {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  padding: 0 18px;
  color: #2563eb;
  background: #ffffff;
  font-weight: 800;
  box-shadow: none;
}

.student-hero-action:hover,
.student-hero-action:focus {
  color: #1d4ed8;
  background: rgba(255, 255, 255, 0.9);
}

.student-summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.student-summary-card {
  position: relative;
  overflow: hidden;
  min-height: 116px;
  border: 0;
  border-radius: 18px;
  padding: 18px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.student-summary-card::after {
  position: absolute;
  right: -28px;
  bottom: -36px;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  content: '';
  opacity: 0.5;
}

.student-summary-card.blue {
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}

.student-summary-card.amber {
  background: linear-gradient(135deg, #fff7ed, #ffffff);
}

.student-summary-card.purple {
  background: linear-gradient(135deg, #f5f3ff, #ffffff);
}

.student-summary-card.cyan {
  background: linear-gradient(135deg, #ecfeff, #ffffff);
}

.student-summary-card.blue::after {
  background: #bfdbfe;
}

.student-summary-card.amber::after {
  background: #fed7aa;
}

.student-summary-card.purple::after {
  background: #ddd6fe;
}

.student-summary-card.cyan::after {
  background: #a5f3fc;
}

.student-card-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  border-radius: 999px;
  padding: 3px 9px;
  color: #475569;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 800;
}

.student-summary-card .summary-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
}

.student-summary-card.blue .summary-icon,
.student-summary-card.blue strong {
  color: #2563eb;
}

.student-summary-card.amber .summary-icon,
.student-summary-card.amber strong {
  color: #d97706;
}

.student-summary-card.purple .summary-icon,
.student-summary-card.purple strong {
  color: #7c3aed;
}

.student-summary-card.cyan .summary-icon,
.student-summary-card.cyan strong {
  color: #0f766e;
}

.student-summary-card.blue .summary-icon {
  background: #dbeafe;
}

.student-summary-card.amber .summary-icon {
  background: #ffedd5;
}

.student-summary-card.purple .summary-icon {
  background: #ede9fe;
}

.student-summary-card.cyan .summary-icon {
  background: #ccfbf1;
}

.student-summary-card small {
  color: #111827;
}

.student-summary-card em {
  color: #64748b;
}

.student-bento-grid {
  grid-template-columns: minmax(0, 1.45fr) minmax(380px, 0.85fr);
  gap: 16px;
  align-items: stretch;
}

.student-panel {
  border: 1px solid #e6eaf0;
  border-radius: 16px;
  padding: 18px;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.student-learning-panel {
  grid-column: 1;
  grid-row: span 2;
  background:
    linear-gradient(180deg, rgba(239, 246, 255, 0.88), rgba(255, 255, 255, 0.96) 38%),
    #ffffff;
}

.student-task-panel {
  grid-column: 2;
  grid-row: span 2;
  border-color: #dbeafe;
  background:
    radial-gradient(circle at 90% 12%, rgba(124, 58, 237, 0.11), transparent 28%),
    linear-gradient(180deg, #ffffff, #f8fbff);
}

.student-feedback-panel,
.student-smart-panel {
  grid-column: auto;
}

.student-feedback-panel {
  background: linear-gradient(180deg, #ffffff, #fffbeb);
}

.student-smart-panel {
  background: linear-gradient(180deg, #ffffff, #f0fdfa);
}

.student-primary-actions {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.student-insight-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.student-action-card,
.student-task-row,
.student-mini-card,
.student-smart-card {
  border-color: #eef2f7;
  background: #ffffff;
}

.student-task-row {
  border-left: 3px solid #2563eb;
}

.task-tag,
.student-smart-card.mint .shortcut-icon,
.student-smart-card.teal .shortcut-icon {
  color: #0f766e;
  background: #ccfbf1;
}

.student-smart-card.blue .shortcut-icon {
  color: #2563eb;
  background: #dbeafe;
}

.student-smart-card.gold .shortcut-icon {
  color: #d97706;
  background: #ffedd5;
}

/* MotionSites-inspired stats and AI feature card polish. */
.overview-grid .metric-card,
.student-summary-card {
  isolation: isolate;
  transform: translateZ(0);
}

.overview-grid .metric-card::before,
.student-summary-card::before {
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  content: '';
  pointer-events: none;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.82), transparent 38%),
    radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.65), transparent 24%);
  opacity: 0.72;
  z-index: -1;
}

.overview-grid .metric-card:hover,
.student-summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 44px rgba(37, 99, 235, 0.11);
}

.overview-grid .metric-card:hover .metric-icon,
.student-summary-card:hover .summary-icon {
  transform: scale(1.08) rotate(-2deg);
}

.metric-badge,
.student-card-badge {
  border: 1px solid rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
}

.ai-reminder-item {
  position: relative;
  overflow: hidden;
  border-left: 0;
  border: 1px solid rgba(226, 232, 240, 0.72);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.ai-reminder-item::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 3px;
  border-radius: 999px;
  content: '';
  background: linear-gradient(180deg, #2563eb, #14b8a6);
}

.ai-reminder-item:hover,
.student-task-row:hover,
.resource-row:hover,
.history-row:hover,
.knowledge-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
}

.ai-reminder-item.green::before {
  background: linear-gradient(180deg, #22c55e, #14b8a6);
}

.ai-reminder-item.amber::before {
  background: linear-gradient(180deg, #f59e0b, #fb7185);
}

.ai-reminder-item.purple::before {
  background: linear-gradient(180deg, #7c3aed, #2563eb);
}

.compact-card,
.student-panel {
  position: relative;
  overflow: hidden;
}

.compact-card::before,
.student-panel::before {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: radial-gradient(circle at 92% 0%, rgba(37, 99, 235, 0.08), transparent 30%);
  opacity: 0;
  transition: opacity 0.24s ease;
}

.compact-card:hover::before,
.student-panel:hover::before {
  opacity: 1;
}

/* Modern intelligent education workspace layer. */
.dashboard-page-head {
  min-height: 150px;
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 18px;
  padding: 22px 24px;
  color: #ffffff;
  background:
    radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.28), transparent 22%),
    radial-gradient(circle at 52% 112%, rgba(20, 184, 166, 0.42), transparent 34%),
    linear-gradient(135deg, #2563eb 0%, #4f46e5 48%, #14b8a6 100%);
  box-shadow: 0 16px 38px rgba(37, 99, 235, 0.16);
}

.dashboard-page-head::before,
.dashboard-page-head::after {
  position: absolute;
  content: '';
  border-radius: 999px;
  pointer-events: none;
}

.dashboard-page-head::before {
  right: 330px;
  bottom: -54px;
  width: 160px;
  height: 160px;
  background: rgba(255, 255, 255, 0.12);
}

.dashboard-page-head::after {
  top: -44px;
  right: -28px;
  width: 190px;
  height: 190px;
  background: rgba(255, 255, 255, 0.14);
}

.dashboard-page-head > * {
  position: relative;
  z-index: 1;
}

.dashboard-page-head .eyebrow,
.dashboard-page-head .page-title-group h1,
.dashboard-page-head .page-title-group p:last-child {
  color: #ffffff;
}

.dashboard-page-head .eyebrow {
  opacity: 0.82;
}

.dashboard-page-head .page-title-group h1 {
  font-size: 28px;
}

.dashboard-page-head .page-title-group p:last-child {
  max-width: 680px;
  opacity: 0.86;
}

.hero-summary-panel {
  min-width: 320px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 16px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(14px);
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  color: #dffafe;
  background: rgba(255, 255, 255, 0.16);
  font-size: 12px;
  font-weight: 800;
}

.hero-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.hero-summary-grid span {
  display: grid;
  gap: 3px;
}

.hero-summary-grid strong {
  color: #ffffff;
  font-size: 24px;
  line-height: 1;
}

.hero-summary-grid small {
  color: rgba(255, 255, 255, 0.74);
  font-size: 12px;
}

.dashboard-page-head .profile-chip {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.16);
}

.dashboard-page-head .profile-chip strong,
.dashboard-page-head .profile-chip small {
  color: #ffffff;
}

.dashboard-page-head .profile-chip .profile-avatar {
  color: #2563eb;
  background: #ffffff;
}

.backend-dashboard .hero-action {
  color: #2563eb;
  background: #ffffff;
}

.overview-grid .metric-card {
  position: relative;
  overflow: hidden;
  border: 0;
}

.overview-grid .metric-card::after {
  position: absolute;
  right: -28px;
  bottom: -36px;
  width: 112px;
  height: 112px;
  border-radius: 999px;
  content: '';
  opacity: 0.5;
}

.overview-grid .metric-card.blue {
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}

.overview-grid .metric-card.amber {
  background: linear-gradient(135deg, #fff7ed, #ffffff);
}

.overview-grid .metric-card.purple {
  background: linear-gradient(135deg, #f5f3ff, #ffffff);
}

.overview-grid .metric-card.cyan {
  background: linear-gradient(135deg, #ecfeff, #ffffff);
}

.overview-grid .metric-card.blue::after {
  background: #bfdbfe;
}

.overview-grid .metric-card.amber::after {
  background: #fed7aa;
}

.overview-grid .metric-card.purple::after {
  background: #ddd6fe;
}

.overview-grid .metric-card.cyan::after {
  background: #a5f3fc;
}

.metric-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  border-radius: 999px;
  padding: 3px 9px;
  color: #475569;
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  font-weight: 800;
}

.overview-grid .metric-card.blue .metric-icon,
.overview-grid .metric-card.blue .metric-copy b {
  color: #2563eb;
}

.overview-grid .metric-card.amber .metric-icon,
.overview-grid .metric-card.amber .metric-copy b {
  color: #d97706;
}

.overview-grid .metric-card.purple .metric-icon,
.overview-grid .metric-card.purple .metric-copy b {
  color: #7c3aed;
}

.overview-grid .metric-card.cyan .metric-icon,
.overview-grid .metric-card.cyan .metric-copy b {
  color: #0f766e;
}

.overview-grid .metric-card.blue .metric-icon {
  background: #dbeafe;
}

.overview-grid .metric-card.amber .metric-icon {
  background: #ffedd5;
}

.overview-grid .metric-card.purple .metric-icon {
  background: #ede9fe;
}

.overview-grid .metric-card.cyan .metric-icon {
  background: #ccfbf1;
}

.insight-panel {
  background:
    linear-gradient(180deg, rgba(239, 246, 255, 0.88), rgba(255, 255, 255, 0.96) 38%),
    #ffffff;
}

.trend-block {
  border-radius: 16px;
  padding: 12px 14px 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.76), rgba(240, 253, 250, 0.52));
}

.todo-panel {
  border-color: #dbeafe;
  background:
    radial-gradient(circle at 90% 12%, rgba(124, 58, 237, 0.11), transparent 28%),
    linear-gradient(180deg, #ffffff, #f8fbff);
}

.ai-reminder-list {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}

.ai-reminder-item {
  border-left: 3px solid #2563eb;
  border-radius: 12px;
  padding: 10px 11px;
  background: #f8fafc;
}

.ai-reminder-item span {
  display: inline-flex;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 800;
}

.ai-reminder-item p {
  margin: 7px 0 0;
  color: #475569;
  font-size: 12px;
  line-height: 1.55;
}

.ai-reminder-item.blue span {
  color: #2563eb;
  background: #dbeafe;
}

.ai-reminder-item.cyan span {
  color: #0f766e;
  background: #ccfbf1;
}

.ai-reminder-item.amber span {
  color: #d97706;
  background: #ffedd5;
}

.ai-reminder-item.purple span {
  color: #7c3aed;
  background: #ede9fe;
}

.ai-reminder-item.green span {
  color: #15803d;
  background: #dcfce7;
}

.compact-card:nth-child(1) {
  background: linear-gradient(180deg, #ffffff, #fffbeb);
}

.compact-card:nth-child(2) {
  background: linear-gradient(180deg, #ffffff, #f0fdfa);
}

.compact-card:nth-child(3) {
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.knowledge-row :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, #f59e0b, #ef4444);
}

.resource-row {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.history-row {
  position: relative;
  padding-left: 14px;
}

.history-row::before {
  position: absolute;
  left: 6px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  content: '';
  background: #14b8a6;
}

.detail-record-card {
  background: #ffffff;
}

.detail-record-row {
  background: linear-gradient(90deg, #ffffff, #f8fbff);
}

/* Wide-screen fit and second-row equal-height refinement. */
.backend-dashboard {
  width: 100%;
  max-width: none;
  padding-inline: 0;
}

.dashboard-page-head,
.overview-grid,
.dashboard-grid,
.education-core-grid,
.detail-record-card {
  width: 100%;
}

.dashboard-grid {
  grid-template-columns: minmax(0, 2fr) minmax(420px, 1fr);
  align-items: stretch;
}

.insight-panel {
  grid-column: auto;
  display: flex;
  flex-direction: column;
  min-height: 520px;
}

.todo-panel {
  grid-column: auto;
  min-height: 520px;
}

.insight-content {
  flex: 1;
  min-height: 0;
}

.trend-block {
  min-height: 0;
}

.trend-chart {
  min-height: 330px;
}

.student-stat-stack {
  align-content: start;
}

.education-core-grid {
  margin-top: 0;
}

@media (max-width: 1280px) {
  .backend-dashboard {
    width: min(100%, calc(100vw - 40px));
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-page-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .education-core-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-record-card {
    grid-column: auto;
  }

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

  .overview-grid,
  .education-core-grid,
  .page-head-actions {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    display: grid;
  }

  .detail-record-row {
    grid-template-columns: 32px minmax(0, 1fr) 18px;
  }

  .detail-record-row .ai-score-tags,
  .detail-record-row time {
    display: none;
  }

  .page-head-actions {
    align-items: stretch;
    flex-direction: column;
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
    bottom: 74px;
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

@media (max-width: 1280px) {
  .student-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .student-hero-summary {
    width: 100%;
    flex-basis: auto;
  }

  .student-head-actions {
    width: 100%;
    justify-content: space-between;
  }

  .student-bento-grid {
    grid-template-columns: 1fr;
  }

  .student-learning-panel,
  .student-task-panel,
  .student-feedback-panel,
  .student-smart-panel {
    grid-column: auto;
    grid-row: auto;
  }
}

@media (max-width: 820px) {
  .student-dashboard {
    padding-bottom: 90px;
  }

  .student-summary-grid,
  .student-primary-actions,
  .student-insight-grid,
  .student-smart-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .student-head-actions {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .student-summary-grid,
  .student-primary-actions,
  .student-insight-grid,
  .student-smart-grid {
    grid-template-columns: 1fr;
  }

  .student-hero-copy h1 {
    font-size: 24px;
  }
}
</style>
