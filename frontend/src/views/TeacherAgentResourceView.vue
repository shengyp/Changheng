<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Connection,
  Delete,
  DocumentChecked,
  Files,
  Finished,
  MagicStick,
  Memo,
  Operation,
  SwitchButton,
  Refresh,
  Search,
  Setting,
  TrendCharts,
  UserFilled,
} from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import { classApi, learningApi, stageEvaluationApi, teacherApi } from '@/api/services'

const agentImages = {
  coordinator: '/picture/coordinator%20Agent.png',
  knowledge: '/picture/Knowledge%20Agent.png',
  ability: '/picture/Ability%20Agent.png',
  behavior: '/picture/Reflection%20Agent.png',
  resource: '/picture/Resource%20Agent.png',
  practice: '/picture/Practice%20Agent.png',
  report: '/picture/Reporting%20Agent.png',
}

const rootRef = ref(null)
const loading = ref(false)
const savingId = ref('')
const sendingId = ref('')
const stage = ref('month')
const studentId = ref('')
const selectedStudentId = ref('')
const students = ref([])
const teacherClasses = ref([])
const candidateResources = ref([])
const generatedResources = ref([])
const lastRun = ref(null)
const teacherRequirement = ref('')
const generationConfig = reactive({
  generationScope: 'student',
  classId: undefined,
  difficulty: 'improve',
  exerciseCount: 5,
  publishMode: 'draft_only',
  selectedWeakPoints: [],
  selectedResourceTypes: ['knowledge_video', 'remedial_exercise', 'knowledge_handout', 'error_reflection', 'learning_path'],
})
const revisionDraft = ref(null)
const revisionFeedback = ref('')
const completedAgents = ref([])
const activeAgentId = ref('')
const flowingEdges = ref([])
const logs = ref([])
const providerLoading = ref(false)
const providerOptions = ref([])
const providerDrawerVisible = ref(false)
const defaultProviderKey = ref('')
const agentOverrides = reactive({
  generator: '',
  qualityReviewer: '',
  consistencyReviewer: '',
})
const generationTaskId = ref('')
const generationTaskStatus = ref('idle')
const generationTaskMessage = ref('')
const executionStopped = ref(false)
const videoPlayback = reactive({})
const quizAnswers = reactive({})
const VIDEO_SEARCH_URL_MESSAGE = '当前链接是搜索结果页，不是具体视频。请打开某个视频后复制视频播放页链接。'

const TASK_STORAGE_KEY = 'teacher-agent-resource-task'
const AGENT_WORKSPACE_STORAGE_KEY = 'teacher-agent-resource-workspace'
const AGENT_LOG_STORAGE_KEY = 'teacher-agent-resource-logs'

let ctx
let taskPollTimer = null
let videoTimer = null
let normalizingGeneratedResources = false

const demoStudent = {
  studentId: 'DEMO-2026',
  studentName: '演示学生',
  stageKey: 'month',
  stageName: '本月',
  overallLevel: '待提升',
  abilityScore: 68,
  masteryAverage: 0.62,
  completedAttemptCount: 18,
  averageScore: 71,
  weakKnowledgePoints: [
    { tagId: 101, tagName: '指针与地址', masteryValue: 0.42, attemptCount: 6 },
    { tagId: 108, tagName: '结构体数组', masteryValue: 0.48, attemptCount: 4 },
    { tagId: 116, tagName: '文件读写', masteryValue: 0.53, attemptCount: 3 },
  ],
  dimensions: [
    { code: 'syntax', name: '语法掌握', score: 76, level: '良好', description: '基础语法较稳定，复杂声明仍需训练。' },
    { code: 'debug', name: '调试定位', score: 58, level: '待提升', description: '对运行时错误和边界条件定位不够稳定。' },
    { code: 'algorithm', name: '算法表达', score: 64, level: '发展中', description: '能完成基础流程，但抽象拆解能力偏弱。' },
    { code: 'project', name: '工程实践', score: 55, level: '待提升', description: '多文件组织、文件读写和模块拆分需要补强。' },
  ],
  suggestions: [
    '先补齐指针与结构体的关联练习，再进入文件读写综合题。',
    '每次练习后提交调试记录，重点说明错误定位过程。',
    '建议采用小项目任务驱动，把知识点放进完整程序中复盘。',
  ],
  summary: '该学生 C 语言基础语法较稳定，但指针、结构体数组和文件读写掌握度偏低，调试定位和工程实践维度需要重点提升。',
}

const demoResources = [
  { title: '指针与地址图解讲义', resourceType: 'article', summary: '用内存图解释变量地址、指针赋值和二级指针。' },
  { title: '结构体数组通讯录案例', resourceType: 'practice_plan', summary: '通过通讯录小项目训练结构体数组、排序和查找。' },
  { title: '文件读写常见错误清单', resourceType: 'article', summary: '梳理 fopen、fscanf、fprintf 和 EOF 判断误区。' },
]

const stageOptions = [
  { label: '近 7 天', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本学期', value: 'term' },
]

const agentOutputs = reactive({
  preprocess: '',
  coordinator: '',
  knowledge: '',
  ability: '',
  behavior: '',
  resource: '',
  practice: '',
  report: '',
  qualityReview: '',
  consistencyReview: '',
})

const agents = {
  preprocess: {
    id: 'preprocess',
    title: 'Preprocessing Agent',
    cnTitle: '预处理智能体',
    subtitle: '画像标准化',
    avatar: 'P',
    icon: Memo,
    note: '读取学生画像，转换为标准 JSON 输入。',
  },
  coordinator: {
    id: 'coordinator',
    title: 'Coordinator Agent',
    cnTitle: '协调智能体',
    subtitle: '任务分发',
    avatar: 'C',
    image: agentImages.coordinator,
    imagePosition: '12% center',
    icon: Connection,
    note: '把画像分发给知识、能力和行为分析智能体。',
  },
  knowledge: {
    id: 'knowledge',
    title: 'Knowledge Agent',
    cnTitle: '知识定位智能体',
    subtitle: '知识点与标签映射',
    avatar: 'K',
    image: agentImages.knowledge,
    imagePosition: '50% center',
    icon: Search,
    note: '将薄弱点映射到知识点、标签、章节和先修关系。',
  },
  ability: {
    id: 'ability',
    title: 'Ability Agent',
    cnTitle: '能力分析智能体',
    subtitle: '能力维度评估',
    avatar: 'A',
    image: agentImages.ability,
    imagePosition: '50% center',
    icon: TrendCharts,
    note: '分析维度得分，定位能力短板。',
  },
  behavior: {
    id: 'behavior',
    title: 'Reflection Agent',
    cnTitle: '资料生成智能体',
    subtitle: '讲义与错因复盘',
    avatar: 'R',
    image: agentImages.behavior,
    imagePosition: '50% center',
    icon: Operation,
    note: '生成知识点讲义、错因复盘和学习路径资料。',
  },
  resource: {
    id: 'resource',
    title: 'Resource Agent',
    cnTitle: '讲解生成智能体',
    subtitle: '知识讲解视频',
    avatar: 'M',
    image: agentImages.resource,
    imagePosition: '50% center',
    icon: Files,
    note: '生成或匹配具体可播放的知识讲解视频。',
  },
  practice: {
    id: 'practice',
    title: 'Practice Agent',
    cnTitle: '练习生成智能体',
    subtitle: '补救练习题',
    avatar: 'D',
    image: agentImages.practice,
    imagePosition: '50% center',
    icon: MagicStick,
    note: '生成带答案、解析、难度和知识点标签的补救练习。',
  },
  report: {
    id: 'report',
    title: 'Reporting Agent',
    cnTitle: '发布编排智能体',
    subtitle: '保存与发布准备',
    avatar: 'G',
    image: agentImages.report,
    imagePosition: '50% center',
    icon: DocumentChecked,
    note: '汇总审核结果，标记资源库保存、草稿题和发布目标。',
  },
  qualityReview: {
    id: 'qualityReview',
    title: 'Quality Review Agent',
    cnTitle: '质量审核智能体',
    subtitle: '适用性与可用性审核',
    avatar: 'Q',
    icon: DocumentChecked,
    note: '审核资源是否适合当前学生或班级并可直接使用。',
  },
  consistencyReview: {
    id: 'consistencyReview',
    title: 'Consistency Review Agent',
    cnTitle: '主题一致性审核智能体',
    subtitle: '一致性审核',
    avatar: 'T',
    icon: Search,
    note: '检查资源是否围绕学生画像、薄弱点和课程主题。',
  },
}

const agentInfoCards = ['preprocess', 'coordinator', 'knowledge', 'ability', 'behavior', 'resource', 'practice', 'report', 'qualityReview', 'consistencyReview']
const editableAgentIds = ['report', 'qualityReview', 'consistencyReview']
const agentProviderFieldMap = {
  report: 'generator',
  qualityReview: 'qualityReviewer',
  consistencyReview: 'consistencyReviewer',
}
const backendAgentLabels = {
  generator: '资源生成智能体',
  qualityReviewer: '资源质量审核智能体',
  consistencyReviewer: '主题一致性审核智能体',
}

const agentPositions = reactive({
  preprocess: { x: 80, y: 300 },
  coordinator: { x: 380, y: 300 },
  knowledge: { x: 700, y: 130 },
  ability: { x: 700, y: 300 },
  behavior: { x: 700, y: 470 },
  resource: { x: 1060, y: 200 },
  practice: { x: 1060, y: 400 },
  report: { x: 1360, y: 300 },
  qualityReview: { x: 1660, y: 210 },
  consistencyReview: { x: 1660, y: 390 },
})

const edgesBase = [
  { id: 'preprocess-coordinator', from: 'preprocess', to: 'coordinator' },
  { id: 'coordinator-knowledge', from: 'coordinator', to: 'knowledge' },
  { id: 'coordinator-ability', from: 'coordinator', to: 'ability' },
  { id: 'coordinator-behavior', from: 'coordinator', to: 'behavior' },
  { id: 'knowledge-resource', from: 'knowledge', to: 'resource' },
  { id: 'ability-practice', from: 'ability', to: 'practice' },
  { id: 'behavior-practice', from: 'behavior', to: 'practice' },
  { id: 'resource-report', from: 'resource', to: 'report' },
  { id: 'practice-report', from: 'practice', to: 'report' },
  { id: 'report-quality', from: 'report', to: 'qualityReview' },
  { id: 'report-consistency', from: 'report', to: 'consistencyReview' },
  { id: 'quality-target', from: 'qualityReview', to: 'target' },
  { id: 'consistency-target', from: 'consistencyReview', to: 'target' },
]

// 鍔ㄦ€佽绠?SVG 杩炵嚎璺緞 (璺熼殢鎷栨嫿鏇存柊)
const dynamicEdges = computed(() => {
  const nodeWidth = 260
  const nodeHeight = 88
  const verticalCenter = nodeHeight / 2

  return edgesBase.map(edge => {
    const fromPos = agentPositions[edge.from];
    if (!fromPos) return edge;

    let toPos, endX, endY;

    // 终点 Target box 的位置，匹配固定框的位置。
    if (edge.to === 'target') {
       endX = 1980; 
       endY = 340;
    } else {
       toPos = agentPositions[edge.to];
       if (!toPos) return edge;
       endX = toPos.x;
       endY = toPos.y + verticalCenter;
    }

    const startX = fromPos.x + nodeWidth;
    const startY = fromPos.y + verticalCenter;

    const cpOffset = Math.max(50, Math.abs(endX - startX) * 0.45)
    const path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`

    return { ...edge, path, startX, startY, endX, endY }
  })
})

// ===== 拖拽交互逻辑 =====
const dragState = reactive({
  isDragging: false,
  agentId: null,
  startX: 0,
  startY: 0,
  initialNodeX: 0,
  initialNodeY: 0
});
let hasDragged = false; 

function startDrag(event, agentId) {
  if (event.button !== 0) return
  dragState.isDragging = true
  dragState.agentId = agentId;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.initialNodeX = agentPositions[agentId].x;
  dragState.initialNodeY = agentPositions[agentId].y;
  hasDragged = false;

  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(event) {
  if (!dragState.isDragging || !dragState.agentId) return;
  const dx = event.clientX - dragState.startX;
  const dy = event.clientY - dragState.startY;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    hasDragged = true;
  }

  agentPositions[dragState.agentId].x = Math.max(40, Math.min(1940, dragState.initialNodeX + dx));
  agentPositions[dragState.agentId].y = Math.max(20, Math.min(552, dragState.initialNodeY + dy));
}

function stopDrag() {
  dragState.isDragging = false;
  dragState.agentId = null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

const agentRunSequences = {
  preprocess: ['preprocess'],
  coordinator: ['preprocess', 'coordinator'],
  knowledge: ['preprocess', 'coordinator', 'knowledge'],
  ability: ['preprocess', 'coordinator', 'ability'],
  behavior: ['preprocess', 'coordinator', 'behavior'],
  resource: ['preprocess', 'coordinator', 'knowledge', 'resource'],
  practice: ['preprocess', 'coordinator', 'ability', 'behavior', 'practice'],
  report: ['preprocess', 'coordinator', 'knowledge', 'ability', 'behavior', 'resource', 'practice', 'report'],
  qualityReview: ['preprocess', 'coordinator', 'knowledge', 'ability', 'behavior', 'resource', 'practice', 'report', 'qualityReview'],
  consistencyReview: ['preprocess', 'coordinator', 'knowledge', 'ability', 'behavior', 'resource', 'practice', 'report', 'consistencyReview'],
}

async function handleAgentClick(agentId) {
  if (hasDragged) return
  if (activeAgentId.value) {
    ElMessage.info('智能体正在执行，当前只支持拖动调整位置')
    return
  }
  if (!selectedStudent.value) {
    ElMessage.warning('请先选择学生画像')
    return
  }
  const sequence = agentRunSequences[agentId] || [agentId]
  for (const currentAgentId of sequence) {
    if (executionStopped.value) return
    if (isCompleted(currentAgentId)) continue
    await runAgent(currentAgentId)
  }
}
// ==========================

const selectedStudent = computed(() =>
  students.value.find((item) => String(item.studentId) === String(selectedStudentId.value)) || null,
)

const weakPoints = computed(() => selectedStudent.value?.weakKnowledgePoints || [])

const lowestDimensions = computed(() =>
  [...(selectedStudent.value?.dimensions || [])]
    .filter((item) => item && item.name)
    .sort((a, b) => Number(a.score || 0) - Number(b.score || 0))
    .slice(0, 3),
)

const completedSet = computed(() => new Set(completedAgents.value))
const flowingSet = computed(() => new Set(flowingEdges.value.map((edge) => edge.id)))

const profileStats = computed(() => {
  const student = selectedStudent.value
  return [
    { label: '能力值', value: student?.abilityScore ?? '-' },
    { label: '掌握度', value: student?.masteryAverage == null ? '-' : `${Math.round(Number(student.masteryAverage) * 100)}%` },
    { label: '薄弱点', value: weakPoints.value.length },
    { label: '完成次数', value: student?.completedAttemptCount ?? 0 },
  ]
})

const defaultProviderOption = computed(() =>
  providerOptions.value.find((item) => item.providerKey === defaultProviderKey.value) || null,
)

const providerSummaryText = computed(() => {
  if (defaultProviderOption.value) {
    return `默认模型：${defaultProviderOption.value.label || defaultProviderOption.value.providerKey}`
  }
  if (providerOptions.value.length > 0) {
    return '默认模型：跟随系统默认'
  }
  return '默认模型：暂无可用模型'
})

function isReady(agentId) {
  if (!selectedStudent.value) return false
  if (agentId === 'preprocess') return true
  if (agentId === 'coordinator') return completedSet.value.has('preprocess')
  if (['knowledge', 'ability', 'behavior'].includes(agentId)) return completedSet.value.has('coordinator')
  if (agentId === 'resource') return completedSet.value.has('knowledge')
  if (agentId === 'practice') return completedSet.value.has('ability') && completedSet.value.has('behavior')
  if (agentId === 'report') return completedSet.value.has('resource') && completedSet.value.has('practice')
  if (['qualityReview', 'consistencyReview'].includes(agentId)) return completedSet.value.has('report')
  return false
}

function isCompleted(agentId) {
  return completedSet.value.has(agentId)
}

function isActive(agentId) {
  return activeAgentId.value === agentId
}

function isReceiving(agentId) {
  return flowingEdges.value.some((edge) => edge.to === agentId)
}

function isPending(agentId) {
  return !isReady(agentId) && !isCompleted(agentId) && !isActive(agentId) && !isReceiving(agentId)
}

function statusClass(agentId) {
  if (isActive(agentId) || isReceiving(agentId)) return 'is-running'
  if (isCompleted(agentId)) return 'is-done'
  return 'is-idle'
}

function agentStatus(agentId) {
  if (isCompleted(agentId)) return '已完成'
  if (isActive(agentId)) return '流转中'
  if (isReady(agentId)) return '可执行'
  return '等待上游'
}

function edgeClass(edge) {
  return {
    'flow-edge': true,
    'is-flowing': flowingSet.value.has(edge.id),
    'is-finished': completedSet.value.has(edge.from),
    'is-resting': !flowingSet.value.has(edge.id),
  }
}

function addLog(agentId, content) {
  logs.value.unshift({
    id: `${agentId}-${Date.now()}`,
    agent: agents[agentId].cnTitle,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    content,
  })
  persistLogs()
}

function persistLogs() {
  localStorage.setItem(AGENT_LOG_STORAGE_KEY, JSON.stringify(logs.value))
}

function restoreLogs() {
  try {
    const raw = localStorage.getItem(AGENT_LOG_STORAGE_KEY)
    logs.value = raw ? JSON.parse(raw) : []
  } catch {
    logs.value = []
  }
}

function deleteLog(logId) {
  logs.value = logs.value.filter((item) => item.id !== logId)
  persistLogs()
}

function clearLogs() {
  logs.value = []
  persistLogs()
}

function resetOutputs() {
  Object.keys(agentOutputs).forEach((key) => {
    agentOutputs[key] = ''
  })
}

function resetFlow(options = {}) {
  const preserveGeneratedResources = options.preserveGeneratedResources === true
  completedAgents.value = []
  activeAgentId.value = ''
  flowingEdges.value = []
  executionStopped.value = false
  candidateResources.value = []
  if (!preserveGeneratedResources) {
    generatedResources.value = []
  }
  lastRun.value = null
  revisionDraft.value = null
  revisionFeedback.value = ''
  resetOutputs()
  persistWorkspace()
}

function resetFlowAndTask() {
  stopTaskPolling()
  clearTaskPersistence()
  resetFlow({ preserveGeneratedResources: true })
}

function stopTaskPolling() {
  if (taskPollTimer) {
    window.clearInterval(taskPollTimer)
    taskPollTimer = null
  }
}

function persistTask(task) {
  if (!task?.taskId) return
  generationTaskId.value = task.taskId
  generationTaskStatus.value = task.status || 'queued'
  generationTaskMessage.value = task.message || ''
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify({
    taskId: task.taskId,
    studentId: selectedStudent.value?.studentId || null,
    stage: stage.value,
  }))
  persistWorkspace()
}

function clearTaskPersistence(options = {}) {
  const preserveMessage = options.preserveMessage === true
  const preservedMessage = generationTaskMessage.value
  generationTaskId.value = ''
  generationTaskStatus.value = 'idle'
  generationTaskMessage.value = preserveMessage ? preservedMessage : ''
  localStorage.removeItem(TASK_STORAGE_KEY)
  persistWorkspace()
}

function syncGeneratedOutputs() {
  if (!lastRun.value) return
  executionStopped.value = false
  completedAgents.value = ['preprocess', 'coordinator', 'knowledge', 'ability', 'behavior', 'resource', 'practice', 'report', 'qualityReview', 'consistencyReview']
  agentOutputs.report = traceSummary('generator', `已生成 ${generatedResources.value.length} 个个性化资源草案，并完成后端审核。`)
  agentOutputs.qualityReview = traceSummary('quality-review', '资源质量审核已完成。')
  agentOutputs.consistencyReview = traceSummary('consistency-review', '主题一致性审核已完成。')
}

function applyGenerationResult(result) {
  lastRun.value = result || {}
  generatedResources.value = normalizeGeneratedCards(result?.resources)
  syncGeneratedOutputs()
  persistWorkspace()
}

function persistWorkspace() {
  localStorage.setItem(AGENT_WORKSPACE_STORAGE_KEY, JSON.stringify({
    selectedStudentId: selectedStudentId.value,
    stage: stage.value,
    completedAgents: completedAgents.value,
    activeAgentId: activeAgentId.value,
    flowingEdges: flowingEdges.value,
    candidateResources: candidateResources.value,
    generatedResources: generatedResources.value,
    lastRun: lastRun.value,
    teacherRequirement: teacherRequirement.value,
    generationConfig: { ...generationConfig },
    agentOutputs,
    generationTaskId: generationTaskId.value,
    generationTaskStatus: generationTaskStatus.value,
    generationTaskMessage: generationTaskMessage.value,
  }))
}

function restoreWorkspace() {
  try {
    const raw = localStorage.getItem(AGENT_WORKSPACE_STORAGE_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.selectedStudentId) selectedStudentId.value = String(saved.selectedStudentId)
    if (saved.stage) stage.value = saved.stage
    completedAgents.value = Array.isArray(saved.completedAgents) ? saved.completedAgents : []
    activeAgentId.value = saved.activeAgentId || ''
    flowingEdges.value = Array.isArray(saved.flowingEdges) ? saved.flowingEdges : []
    candidateResources.value = Array.isArray(saved.candidateResources) ? saved.candidateResources : []
    generatedResources.value = normalizeGeneratedCards(saved.generatedResources)
    lastRun.value = saved.lastRun || null
    teacherRequirement.value = saved.teacherRequirement || ''
    Object.assign(generationConfig, saved.generationConfig || {})
    Object.keys(agentOutputs).forEach((key) => {
      agentOutputs[key] = saved.agentOutputs?.[key] || ''
    })
    generationTaskId.value = saved.generationTaskId || ''
    generationTaskStatus.value = saved.generationTaskStatus || 'idle'
    generationTaskMessage.value = saved.generationTaskMessage || ''
  } catch {
    // ignore
  }
}

function loadDemoData(showMessage = true) {
  clearTaskPersistence()
  stopTaskPolling()
  students.value = [demoStudent]
  selectedStudentId.value = String(demoStudent.studentId)
  candidateResources.value = demoResources
  resetFlow()
  persistWorkspace()
  if (showMessage) ElMessage.success('已载入演示学生画像')
}

async function loadStudents() {
  loading.value = true
  try {
    const rows = await stageEvaluationApi.teacherStudents({
      stage: stage.value,
      studentId: studentId.value,
    })
    students.value = Array.isArray(rows) ? rows : []
    if (students.value.length > 0) {
      const stillExists = students.value.some((item) => String(item.studentId) === String(selectedStudentId.value))
      selectedStudentId.value = stillExists ? selectedStudentId.value : String(students.value[0].studentId)
      if (!generationTaskId.value && !lastRun.value && generatedResources.value.length === 0 && completedAgents.value.length === 0) {
        resetFlow()
      }
    } else {
      loadDemoData(false)
      ElMessage.info('当前接口暂无数据，已展示演示学生画像')
    }
  } catch (error) {
    loadDemoData(false)
    ElMessage.warning(error.message || '画像接口暂不可用，已展示演示学生画像')
  } finally {
    loading.value = false
  }
}

async function loadTeacherClasses() {
  try {
    const rows = await classApi.mine()
    teacherClasses.value = Array.isArray(rows) ? rows : []
    if (!generationConfig.classId && teacherClasses.value.length > 0) {
      generationConfig.classId = teacherClasses.value[0].id
    }
  } catch (error) {
    teacherClasses.value = []
  }
}

function primaryWeakPoint() {
  return weakPoints.value[0] || {}
}

function primaryDimension() {
  return lowestDimensions.value[0] || {}
}

function formatWeakNames(limit = 3) {
  const names = weakPoints.value.map((item) => item.tagName).filter(Boolean).slice(0, limit)
  return names.length ? names.join('、') : '暂无明显薄弱知识点'
}

function formatDimensionNames(limit = 3) {
  const names = lowestDimensions.value.map((item) => `${item.name}(${item.score ?? 0})`).slice(0, limit)
  return names.length ? names.join('、') : '暂无维度数据'
}

async function loadCandidateResources() {
  const weak = primaryWeakPoint()
  if (String(selectedStudent.value?.studentId) === String(demoStudent.studentId)) {
    candidateResources.value = demoResources
    return
  }
  try {
    const rows = await learningApi.resources({
      keyword: weak.tagName || selectedStudent.value?.summary || '',
      knowledgePointId: weak.knowledgePointId,
      limit: 6,
    })
    candidateResources.value = Array.isArray(rows) ? rows : []
  } catch (error) {
    candidateResources.value = demoResources
    ElMessage.warning(error.message || '候选资源加载失败，已使用演示候选资源')
  }
}

function buildGeneratedResources() {
  const student = selectedStudent.value || {}
  const weak = primaryWeakPoint()
  const dim = primaryDimension()
  const weakName = weak.tagName || 'C 语言核心知识'
  const dimName = dim.name || '综合编程能力'
  const suggestions = (student.suggestions || []).slice(0, 2).join('；') || '建议按知识补强、例题讲解、变式训练的节奏推进。'

  return [
    {
      id: 'knowledge',
      title: `${student.studentName || '学生'} - ${weakName} 知识补强包`,
      resourceType: 'article',
      summary: `围绕 ${weakName} 汇总概念解释、典型误区和 3 组递进例题，优先解决当前掌握度较低的问题。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '知识诊断智能体',
      saved: false,
    },
    {
      id: 'review',
      title: `${student.studentName || '学生'} 错因复盘清单`,
      resourceType: 'agent_plan',
      summary: `基于阶段画像生成错因复盘问题：先回看 ${weakName} 的错题，再记录错误原因、修正代码和同类题迁移结论。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '错因/行为分析智能体',
      saved: false,
    },
    {
      id: 'ability',
      title: `${student.studentName || '学生'} ${dimName} 能力提升任务`,
      resourceType: 'practice_plan',
      summary: `针对 ${dimName} 设计一个小型 C 语言任务，包含需求拆解、边界条件、调试记录和代码复盘要求。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '练习设计智能体',
      saved: false,
    },
    {
      id: 'path',
      title: `${student.studentName || '学生'} 个性化练习路径`,
      resourceType: 'practice_plan',
      summary: `${suggestions} 路径安排为：知识回顾 1 次、基础题 5 题、综合题 2 题、复盘总结 1 份。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '资源生成智能体',
      saved: false,
    },
  ]
}

const defaultResourceTypes = [
  'knowledge_video',
  'remedial_exercise',
  'knowledge_handout',
  'error_reflection',
  'learning_path',
]

const resourceTypeLabels = {
  knowledge_pack: '知识补强包',
  reflection_list: '错因复盘清单',
  ability_task: '能力任务',
  variant_practice: '变式练习',
  animated_explainer: '知识讲解视频',
  interactive_quiz: '互动测验',
  learning_path: '学习路径',
}

const deprecatedResourceTypes = new Set(['personalized_video'])
Object.assign(resourceTypeLabels, {
  knowledge_video: '知识讲解视频',
  remedial_exercise: '补救练习',
  knowledge_handout: '知识点讲义',
  error_reflection: '错因复盘',
  learning_path: '学习路径',
})
const videoResourceTypes = new Set(['knowledge_video', 'animated_explainer'])
const exerciseResourceTypes = new Set(['remedial_exercise', 'interactive_quiz', 'variant_practice'])
const multimodalResourceTypes = new Set(['knowledge_video', 'animated_explainer', 'remedial_exercise', 'interactive_quiz'])

function isEditableAgent(agentId) {
  return editableAgentIds.includes(agentId)
}

function providerLabel(providerKey) {
  if (!providerKey) return ''
  const provider = providerOptions.value.find((item) => item.providerKey === providerKey)
  return provider?.label || providerKey
}

function currentAgentProviderKey(agentId) {
  const providerField = agentProviderFieldMap[agentId]
  return providerField ? agentOverrides[providerField] || '' : ''
}

function currentAgentProviderLabel(agentId) {
  const providerKey = currentAgentProviderKey(agentId)
  if (providerKey) return providerLabel(providerKey)
  if (defaultProviderOption.value) return `${providerLabel(defaultProviderKey.value)}（继承默认）`
  return providerOptions.value.length > 0 ? '跟随系统默认' : '未配置'
}

function providerBindingMode(agentKey) {
  if (agentOverrides[agentKey]) return '独立覆盖模型'
  if (defaultProviderKey.value) return '继承页面默认模型'
  return '跟随系统默认模型'
}

function buildAgentProviderPayload() {
  return Object.entries(agentOverrides).reduce((result, [agentKey, providerKey]) => {
    if (providerKey) result[agentKey] = providerKey
    return result
  }, {})
}

async function loadProviders() {
  providerLoading.value = true
  try {
    const rows = await teacherApi.teacherLlmProviders({ enabled: true })
    providerOptions.value = Array.isArray(rows) ? rows : []
    const defaultProvider = providerOptions.value.find((item) => item.isDefault) || providerOptions.value[0]
    if (!defaultProviderKey.value && defaultProvider) {
      defaultProviderKey.value = defaultProvider.providerKey
    }
  } catch (error) {
    if (error?.status !== 404) {
      ElMessage.warning(error.message || '加载模型列表失败')
    }
    providerOptions.value = []
  } finally {
    providerLoading.value = false
  }
}

function findTrace(agentId) {
  return lastRun.value?.agentTrace?.find((item) => item.agentId === agentId) || null
}

function buildVideoCover(title, platform, accent = '#2f9b7b') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#071f1a"/>
          <stop offset="0.55" stop-color="#12382f"/>
          <stop offset="1" stop-color="#06120f"/>
        </linearGradient>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="640" height="360" rx="24" fill="url(#bg)"/>
      <rect width="640" height="360" fill="url(#grid)"/>
      <circle cx="510" cy="70" r="120" fill="${accent}" opacity=".18"/>
      <rect x="42" y="46" width="140" height="34" rx="17" fill="${accent}" opacity=".9"/>
      <text x="112" y="69" text-anchor="middle" fill="#ffffff" font-size="18" font-family="Arial, sans-serif" font-weight="700">${platform}</text>
      <text x="48" y="172" fill="#ffffff" font-size="32" font-family="Arial, sans-serif" font-weight="800">${title.slice(0, 18)}</text>
      <text x="48" y="218" fill="#b8f3df" font-size="22" font-family="Arial, sans-serif">C 语言知识讲解</text>
      <polygon points="292,252 292,306 344,279" fill="#ffffff" opacity=".9"/>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function buildMockVideoRecommendations(focus = '数组与字符串') {
  // 后续接入真实视频搜索接口时，保持相同字段结构替换这组本地样例即可。
  return [
    {
      title: 'C语言数组与字符串基础讲解',
      platform: 'Bilibili',
      url: 'https://www.bilibili.com/video/BV1m8411m79X/',
      cover: buildVideoCover('数组与字符串', 'Bilibili', '#2f9b7b'),
      duration: '16:31',
      viewCount: '22万',
      reason: `该视频围绕字符数组、字符串初始化和常见用法展开，适合当前“${focus}”薄弱点的概念补强。`,
      matchedKnowledgePoints: ['数组', '字符串'],
    },
    {
      title: 'C语言 char 数组与字符串入门',
      platform: 'Bilibili',
      url: 'https://www.bilibili.com/video/BV1Bh4y1q7Nt/',
      cover: buildVideoCover('char 数组与字符串', 'Bilibili', '#3b82f6'),
      duration: '14:24',
      viewCount: '课程合集',
      reason: `课程分集包含 char 数组、字符串表示方式和指针相关内容，适合学生按知识链路复习“${focus}”。`,
      matchedKnowledgePoints: ['char数组', '字符串表示', '指针'],
    },
    {
      title: 'Arrays of strings in C explained!',
      platform: 'YouTube',
      url: 'https://www.youtube.com/watch?v=e7SACGE9hKw',
      cover: 'https://i.ytimg.com/vi/e7SACGE9hKw/hqdefault.jpg',
      duration: '11:20',
      viewCount: '教学视频',
      reason: '该视频用二维字符数组解释字符串数组，适合补齐数组和字符串组合使用时的理解断点。',
      matchedKnowledgePoints: ['字符串数组', '二维数组'],
    },
    {
      title: 'String Basics | C Programming Tutorial',
      platform: 'YouTube',
      url: 'https://www.youtube.com/watch?v=60OI5tzmkCw',
      cover: 'https://i.ytimg.com/vi/60OI5tzmkCw/hqdefault.jpg',
      duration: '13:04',
      viewCount: '入门讲解',
      reason: '该视频覆盖 C 字符串基础、初始化和访问方式，可用于学生在字符串基础题上的针对性复习。',
      matchedKnowledgePoints: ['字符串', '字符数组'],
    },
  ]
}

function normalizeVideoRecommendations(card = {}) {
  const rows = card.videoAsset?.url
    ? [card.videoAsset, ...(Array.isArray(card.videoRecommendations) ? card.videoRecommendations : [])]
    : Array.isArray(card.videoRecommendations)
    ? card.videoRecommendations
    : Array.isArray(card.videoConfig?.videoRecommendations)
      ? card.videoConfig.videoRecommendations
      : []

  return rows
    .filter((item) => item?.url && item?.title && isConcreteVideoUrl(item.url))
    .slice(0, 6)
    .map((item, index) => ({
      id: item.id || `${card.draftId || card.id || 'video'}-${index}`,
      title: item.title,
      platform: item.platform || 'Bilibili',
      url: item.url,
      cover: item.cover || item.coverUrl || buildVideoCover(item.title, item.platform || 'Video'),
      duration: item.duration || '待确认',
      viewCount: item.viewCount || item.hotScore || '推荐',
      reason: item.reason || '该视频与当前薄弱知识点匹配，建议教师确认后推荐给学生。',
      matchedKnowledgePoints: Array.isArray(item.matchedKnowledgePoints) ? item.matchedKnowledgePoints : [],
    }))
}

function normalizeGeneratedCard(card = {}) {
  const scenes = Array.isArray(card.videoScenes) ? card.videoScenes : []
  const quizQuestions = Array.isArray(card.quizQuestions) ? card.quizQuestions : []
  const exerciseQuestions = Array.isArray(card.exerciseQuestions) ? card.exerciseQuestions : []
  const videoRecommendations = normalizeVideoRecommendations(card)
  return {
    ...card,
    id: card.draftId || `${card.resourceType || 'resource'}-${Date.now()}`,
    sourceAgent: '资源生成智能体',
    resourceTypeLabel: resourceTypeLabels[card.resourceType] || card.resourceType || '个性化资源',
    isMultimodal: multimodalResourceTypes.has(card.resourceType),
    isQuiz: card.resourceType === 'interactive_quiz' || exerciseResourceTypes.has(card.resourceType),
    isVideo: card.mediaType === 'video' || videoResourceTypes.has(card.resourceType) || scenes.length > 0,
    videoAsset: card.videoAsset || null,
    videoScenes: scenes,
    videoRecommendations,
    quizQuestions,
    exerciseQuestions,
    videoConfig: card.videoConfig || {},
    sourceStatus: card.sourceStatus || card.videoAsset?.sourceStatus || card.videoConfig?.sourceStatus || 'draft',
    publishTarget: card.publishTarget || (exerciseResourceTypes.has(card.resourceType) ? 'student_draft_questions' : 'student_recommended_resource'),
    agentOutputs: card.agentOutputs || {},
    reviewState: card.reviewState || {
      suitabilityApproved: false,
      usabilityApproved: false,
      teacherComment: '',
    },
    saved: Boolean(card.saved),
    sent: Boolean(card.sent),
    resourceId: card.resourceId || null,
    personalizationBasis: card.personalizationBasis || {},
    reviewReport: card.reviewReport || {},
    modelSource: card.modelSource || {},
    content: card.content || card.summary || '',
    status: card.status || 'pending_review',
  }
}

function buildExternalVideoCard() {
  const student = selectedStudent.value || {}
  const focus = weakPoints.value.map((item) => item.tagName).filter(Boolean)[0] || 'C语言薄弱知识点'
  const query = `C语言 ${focus} 讲解 例题`
  const encodedQuery = encodeURIComponent(query)
  const bilibiliUrl = `https://search.bilibili.com/all?keyword=${encodedQuery}`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`
  const draftId = `knowledge_video-frontend-video-${selectedStudentId.value || 'current'}-${encodedQuery}`
  const videoRecommendations = buildMockVideoRecommendations(focus)
  const recommendedVideo = videoRecommendations[0]
  return normalizeGeneratedCard({
    draftId,
    title: `${focus} 知识讲解视频推荐`,
    resourceType: 'knowledge_video',
    summary: `系统已根据学生薄弱点匹配具体知识讲解视频，教师可预览、替换或补充视频链接后保存为推荐资源。`,
    content: [
      `学生：${student.studentName || '当前学生'}`,
      `薄弱知识点：${focus}`,
      `检索关键词：${query}`,
      '推荐平台：Bilibili / YouTube',
      '使用建议：优先选择包含概念讲解、例题代码和易错点分析的视频片段。',
    ].join('\n'),
    sourceUrl: recommendedVideo?.url || '',
    mediaType: 'video',
    videoRecommendations,
    videoConfig: {
      renderMode: 'concrete_video_recommendation',
      platform: recommendedVideo?.platform || 'Bilibili',
      query,
      bilibiliUrl,
      youtubeUrl,
      sourceStatus: recommendedVideo?.url ? 'matched_sample' : 'fallback',
      videoRecommendations,
      style: '外部知识讲解视频',
      aspectRatio: '16:9',
    },
    videoScenes: [],
    personalizationBasis: {
      studentName: student.studentName || '当前学生',
      weakPoints: [focus],
      reason: '根据学生薄弱知识点匹配具体知识讲解视频。',
    },
    reviewReport: {
      qualityScore: 82,
      relevanceScore: 88,
      consistencyScore: 84,
      passed: true,
      comments: '已根据学生薄弱点匹配具体知识讲解视频，建议教师确认内容后推荐给学生。',
      revisionSuggestions: [`确认视频内容覆盖薄弱知识点：${focus}`],
    },
    modelSource: {
      generatorModel: '本地视频资源匹配',
      llmCallIds: [],
    },
    status: 'approved',
  })
}
function hasExternalVideoResource(cards) {
  return cards.some((card) => videoResourceTypes.has(card.resourceType))
}

function ensureVideoResource(cards) {
  if (!cards.length) return cards
  return hasExternalVideoResource(cards) ? cards : [...cards, buildExternalVideoCard()]
}

function normalizeGeneratedCards(cards = []) {
  const normalized = (Array.isArray(cards) ? cards : [])
    .filter((card) => !deprecatedResourceTypes.has(card?.resourceType))
    .filter((card) => {
      const hasRecommendations = Array.isArray(card?.videoRecommendations) && card.videoRecommendations.length > 0
      return !(videoResourceTypes.has(card?.resourceType) && !card?.sourceUrl && !hasRecommendations && Array.isArray(card?.videoScenes) && card.videoScenes.length > 0)
    })
    .map(normalizeGeneratedCard)
  return ensureVideoResource(normalized)
}

function videoState(card) {
  if (!videoPlayback[card.id]) {
    videoPlayback[card.id] = { sceneIndex: 0, playing: false }
  }
  return videoPlayback[card.id]
}

function currentVideoScene(card) {
  const scenes = Array.isArray(card.videoScenes) ? card.videoScenes : []
  if (!scenes.length) return null
  const state = videoState(card)
  return scenes[Math.min(state.sceneIndex || 0, scenes.length - 1)] || scenes[0]
}

function videoProgress(card) {
  const scenes = Array.isArray(card.videoScenes) ? card.videoScenes : []
  if (!scenes.length) return 0
  return Math.round(((videoState(card).sceneIndex + 1) / scenes.length) * 100)
}

function toggleVideo(card) {
  const state = videoState(card)
  state.playing = !state.playing
}

function selectVideoScene(card, index) {
  const state = videoState(card)
  state.sceneIndex = index
  state.playing = false
}

function nextVideoScene(card) {
  const scenes = Array.isArray(card.videoScenes) ? card.videoScenes : []
  if (!scenes.length) return
  const state = videoState(card)
  state.sceneIndex = (state.sceneIndex + 1) % scenes.length
}

function externalVideoLinks(card) {
  const config = card?.videoConfig || {}
  return [
    { label: '打开 Bilibili 搜索', url: config.bilibiliUrl },
    { label: '打开 YouTube 搜索', url: config.youtubeUrl },
  ].filter((item) => item.url)
}

function isVideoSearchUrl(url = '') {
  const value = String(url || '').trim().toLowerCase()
  return value.includes('search.bilibili.com') || value.includes('youtube.com/results')
}

function isConcreteVideoUrl(url = '') {
  const value = String(url || '').trim()
  if (!value || isVideoSearchUrl(value)) return false
  return /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV|av)[A-Za-z0-9]+/i.test(value)
    || /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[A-Za-z0-9_-]+/i.test(value)
    || /^https?:\/\/youtu\.be\/[A-Za-z0-9_-]+/i.test(value)
}

function primaryVideo(card) {
  const candidate = Array.isArray(card?.videoRecommendations) ? card.videoRecommendations.find((item) => isConcreteVideoUrl(item.url)) : null
  if (candidate) return candidate
  if (isConcreteVideoUrl(card?.sourceUrl)) {
    return {
      title: card.title,
      platform: card.videoConfig?.platform || 'Video',
      url: card.sourceUrl,
      reason: card.summary,
      matchedKnowledgePoints: card.personalizationBasis?.weakPoints || [],
    }
  }
  return null
}

function hasConcreteVideo(card) {
  return Boolean(primaryVideo(card))
}

function videoSourceStatus(card) {
  if (hasConcreteVideo(card)) return 'matched'
  return card?.videoConfig?.sourceStatus || 'fallback'
}

function openRecommendedVideo(video) {
  if (!video?.url) return
  window.open(video.url, '_blank', 'noopener,noreferrer')
}

function watchRecommendedVideo(card) {
  const video = primaryVideo(card)
  if (!video) {
    ElMessage.warning('请先补充具体视频播放页链接')
    return
  }
  openRecommendedVideo(video)
}

async function copyVideoLink(card) {
  const video = primaryVideo(card)
  if (!video?.url) {
    ElMessage.warning('当前还没有具体视频链接')
    return
  }
  await navigator.clipboard.writeText(video.url)
  ElMessage.success('已复制视频链接')
}

async function pasteVideoLink(card) {
  try {
    const { value } = await ElMessageBox.prompt('请粘贴 Bilibili 或 YouTube 的具体视频播放页链接', '补充视频链接', {
      confirmButtonText: '淇濆瓨閾炬帴',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：https://www.bilibili.com/video/BVxxxxxx',
    })
    const url = String(value || '').trim()
    if (!isConcreteVideoUrl(url)) {
      ElMessage.warning(isVideoSearchUrl(url) ? VIDEO_SEARCH_URL_MESSAGE : '请填写具体视频播放页链接')
      return
    }
    const focus = weakPoints.value.map((item) => item.tagName).filter(Boolean)[0] || 'C语言薄弱知识点'
    const video = {
      id: `${card.id}-manual-video`,
      title: card.title.replace(/\s*知识讲解视频推荐$/, '') || `${focus} 知识讲解视频`,
      platform: url.includes('bilibili.com') ? 'Bilibili' : 'YouTube',
      url,
      cover: buildVideoCover(card.title, url.includes('bilibili.com') ? 'Bilibili' : 'YouTube'),
      duration: '教师确认',
      viewCount: '手动补充',
      reason: `教师补充的具体视频播放页，建议用于“${focus}”薄弱点的针对性讲解与复习。`,
      matchedKnowledgePoints: [focus],
      sourceStatus: 'manual',
    }
    card.sourceUrl = url
    card.status = 'approved'
    card.videoConfig = {
      ...(card.videoConfig || {}),
      sourceStatus: 'manual',
      platform: video.platform,
      sourceUrl: url,
    }
    card.videoRecommendations = [video]
    persistWorkspace()
    ElMessage.success('已补充具体视频链接')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '补充链接失败')
  }
}

function resourceContentForSave(card) {
  if (card?.isQuiz) {
    return JSON.stringify({
      content: card.content || '',
      quizQuestions: card.quizQuestions || [],
      exerciseQuestions: card.exerciseQuestions || [],
      publishTarget: card.publishTarget || '',
      agentOutputs: card.agentOutputs || {},
      reviewState: card.reviewState || {},
    })
  }
  if (!card?.isVideo) return card?.content || ''
  const video = primaryVideo(card)
  return JSON.stringify({
    content: card.content || '',
    mediaType: 'video',
    platform: video?.platform || card.videoConfig?.platform || '',
    url: video?.url || card.sourceUrl || '',
    knowledgePoint: video?.matchedKnowledgePoints?.[0] || card.videoConfig?.query || '',
    weaknessTag: video?.matchedKnowledgePoints?.[0] || '',
    reason: video?.reason || card.summary || '',
    sourceStatus: video?.sourceStatus || card.videoConfig?.sourceStatus || 'matched',
    videoAsset: card.videoAsset || null,
    videoConfig: card.videoConfig || {},
    videoScenes: card.videoScenes || [],
    videoRecommendations: card.videoRecommendations || [],
    reviewState: card.reviewState || {},
  })
}

function quizAnswerKey(card, index) {
  return `${card.id}-${index}`
}

function quizAnswer(card, index) {
  return quizAnswers[quizAnswerKey(card, index)] || ''
}

function setQuizAnswer(card, index, value) {
  quizAnswers[quizAnswerKey(card, index)] = value
}

function quizDisplayQuestions(card) {
  if (Array.isArray(card?.exerciseQuestions) && card.exerciseQuestions.length > 0) {
    return card.exerciseQuestions
  }
  return Array.isArray(card?.quizQuestions) ? card.quizQuestions : []
}

function hasUsableExercise(card) {
  if (!exerciseResourceTypes.has(card?.resourceType)) return true
  const questions = quizDisplayQuestions(card)
  return questions.length > 0 && questions.every((item) => item?.stem && item?.answer && item?.explanation)
}

function hasTeacherApproval(card) {
  return Boolean(card?.reviewState?.suitabilityApproved && card?.reviewState?.usabilityApproved)
}

function canSaveGeneratedResource(card) {
  if (!hasTeacherApproval(card)) return false
  if (card?.isVideo && !hasConcreteVideo(card)) return false
  if (!hasUsableExercise(card)) return false
  return true
}

function normalizeAnswer(value) {
  return String(value || '').trim().replace(/^([A-D])[\s.銆侊紟:锛?]*/i, '$1').toUpperCase()
}

function isQuizCorrect(card, question, index) {
  const userAnswer = normalizeAnswer(quizAnswer(card, index))
  const answer = normalizeAnswer(question?.answer)
  return Boolean(userAnswer && answer && userAnswer === answer)
}

function quizFeedback(card, question, index) {
  const userAnswer = quizAnswer(card, index)
  if (!userAnswer) return ''
  return isQuizCorrect(card, question, index)
    ? question?.explanation || '回答正确。'
    : question?.wrongFeedback || question?.explanation || '回答不正确，请回到相关知识点重新判断。'
}

function safeFileName(text) {
  return String(text || 'personalized-learning-video')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'personalized-learning-video'
}

function buildRemotionProps(card) {
  const student = selectedStudent.value || {}
  const weakPointNames = weakPoints.value.map((item) => item.tagName).filter(Boolean)
  const abilityGaps = lowestDimensions.value.map((item) => item.name).filter(Boolean)
  const scenes = (card.videoScenes || []).map((scene) => ({
    title: scene.title || '瀛︿範鍦烘櫙',
    narration: scene.narration || '',
    visualPrompt: scene.visualPrompt || '',
    boardText: scene.boardText || scene.title || '',
    durationSeconds: Math.max(6, Number(scene.durationSeconds || 10)),
  }))

  return {
    title: card.title || '知识点讲解视频',
    studentName: student.studentName || '瀛︾敓',
    focus: weakPointNames[0] || card.title || '薄弱知识点',
    weakPoints: weakPointNames,
    abilityGaps,
    scenes,
  }
}

function remotionPropsFilename(card) {
  return `${safeFileName(card.title || card.id)}-remotion-props.json`
}

function downloadRemotionProps(card) {
  const data = buildRemotionProps(card)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = remotionPropsFilename(card)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出 Remotion 渲染数据')
}

async function copyRemotionCommand(card) {
  const propsFile = remotionPropsFilename(card)
  const outputFile = `${safeFileName(card.title || card.id)}.mp4`
  const command = `npm run remotion:render -- out/${outputFile} --props ${propsFile}`
  try {
    await navigator.clipboard.writeText(command)
    ElMessage.success('已复制 Remotion 渲染命令')
  } catch {
    ElMessage.info(command)
  }
}

async function generateAgentResources(feedback = '') {
  executionStopped.value = false
  const student = selectedStudent.value
  if (!student) {
    throw new Error('请先选择学生')
  }
  if (String(student.studentId).startsWith('DEMO')) {
    throw new Error('演示学生没有真实后端画像，请选择真实学生后生成')
  }
  let task
  const payload = {
    studentId: Number(student.studentId),
    stage: stage.value,
    resourceTypes: generationConfig.selectedResourceTypes?.length ? generationConfig.selectedResourceTypes : defaultResourceTypes,
    selectedResourceTypes: generationConfig.selectedResourceTypes?.length ? generationConfig.selectedResourceTypes : defaultResourceTypes,
    generationScope: generationConfig.generationScope,
    classId: generationConfig.classId,
    difficulty: generationConfig.difficulty,
    exerciseCount: generationConfig.exerciseCount,
    publishMode: generationConfig.publishMode,
    selectedWeakPoints: generationConfig.selectedWeakPoints,
    providerKey: defaultProviderKey.value || undefined,
    agentProviderKeys: buildAgentProviderPayload(),
    teacherRequirement: teacherRequirement.value,
    feedback,
  }
  try {
    task = await teacherApi.startGenerateAgentResourcesTask(payload)
  } catch (error) {
    if (error?.status === 404) {
      const result = await teacherApi.generateAgentResources(payload)
      applyGenerationResult(result || {})
      addLog('report', '当前后端未启用后台任务接口，已回退为当前请求直接生成。')
      return {
        status: 'completed',
        message: '当前后端未启用后台任务接口，已直接生成结果。',
        result,
      }
    }
    throw error
  }
  persistTask(task)
  await pollGenerationTask(true)
  startTaskPolling()
  return task
}

function startTaskPolling() {
  stopTaskPolling()
  taskPollTimer = window.setInterval(() => {
    pollGenerationTask().catch((error) => {
      generationTaskMessage.value = error.message || '网络波动，后台任务仍可能继续执行，请稍后重试查看状态。'
      persistWorkspace()
    })
  }, 3000)
}

async function pollGenerationTask(showToast = false) {
  if (!generationTaskId.value) return null
  const task = await teacherApi.generateAgentResourcesTaskStatus(generationTaskId.value)
  generationTaskStatus.value = task?.status || 'idle'
  generationTaskMessage.value = task?.message || ''
  persistWorkspace()
  if (task?.status === 'completed') {
    stopTaskPolling()
    applyGenerationResult(task.result || {})
    clearTaskPersistence()
    if (showToast) ElMessage.success('个性化资源生成完成')
  } else if (task?.status === 'failed') {
    stopTaskPolling()
    const message = task?.message || '个性化资源生成失败'
    throw new Error(message)
  } else if (task?.status === 'canceled') {
    stopTaskPolling()
    generationTaskMessage.value = task?.message || '任务已停止'
    clearTaskPersistence({ preserveMessage: true })
    persistWorkspace()
    if (showToast) ElMessage.warning(generationTaskMessage.value)
  }
  return task
}

async function stopGenerationTask() {
  executionStopped.value = true
  activeAgentId.value = ''
  flowingEdges.value = []
  gsap.killTweensOf('*')
  if (!generationTaskId.value) return
  try {
    const task = await teacherApi.cancelGenerateAgentResourcesTask(generationTaskId.value)
    generationTaskStatus.value = task?.status || 'canceled'
    generationTaskMessage.value = task?.message || '任务已停止'
    stopTaskPolling()
    addLog('report', generationTaskMessage.value)
    clearTaskPersistence({ preserveMessage: true })
    persistWorkspace()
    ElMessage.warning(generationTaskMessage.value)
  } catch (error) {
    ElMessage.error(error.message || '停止后台任务失败')
  }
}

function restoreGenerationTask() {
  const raw = localStorage.getItem(TASK_STORAGE_KEY)
  if (!raw) return
  try {
    const saved = JSON.parse(raw)
    if (!saved?.taskId) return
    if (saved.studentId && String(saved.studentId) !== String(selectedStudent.value?.studentId || '')) {
      return
    }
    generationTaskId.value = saved.taskId
    generationTaskStatus.value = 'running'
    generationTaskMessage.value = '已恢复后台生成任务，正在同步状态。'
    pollGenerationTask().catch((error) => {
      generationTaskMessage.value = error.message || '恢复后台任务状态失败，请稍后重试。'
      persistWorkspace()
    })
    startTaskPolling()
  } catch (error) {
    generationTaskMessage.value = '后台任务恢复失败，请重新生成。'
  }
}

function traceSummary(agentId, fallback) {
  const trace = findTrace(agentId)
  if (!trace) return fallback
  const model = trace.modelName ? `模型：${trace.modelName}` : ''
  const call = trace.llmCallId ? `调用ID：${trace.llmCallId}` : ''
  return [trace.summary, model, call].filter(Boolean).join('；') || fallback
}

async function completeAgent(agentId) {
  let output = ''
  if (agentId === 'preprocess') {
    output = `已标准化 ${selectedStudent.value?.studentName || '学生'} 的画像：${weakPoints.value.length} 个薄弱点，${selectedStudent.value?.dimensions?.length || 0} 个评价维度。`
  } else if (agentId === 'coordinator') {
    output = '已将画像分发给知识诊断、能力分析和错因/行为分析智能体。'
  } else if (agentId === 'knowledge') {
    output = `薄弱知识点优先级：${formatWeakNames()}。`
  } else if (agentId === 'ability') {
    output = `能力短板排序：${formatDimensionNames()}。`
  } else if (agentId === 'behavior') {
    const suggestions = selectedStudent.value?.suggestions || []
    output = suggestions.length
      ? `行为复盘建议：${suggestions.slice(0, 2).join('；')}。`
      : `完成 ${selectedStudent.value?.completedAttemptCount || 0} 次作答，建议补充错题复盘记录。`
  } else if (agentId === 'resource') {
    await loadCandidateResources()
    output = `已召回 ${candidateResources.value.length} 条候选资源，作为个性化资源生成依据。`
  } else if (agentId === 'practice') {
    output = `已按 ${generationConfig.exerciseCount} 题配置生成补救练习与阶段任务。`
  } else if (agentId === 'report') {
    if (String(selectedStudent.value?.studentId).startsWith('DEMO')) {
      generatedResources.value = normalizeGeneratedCards(buildGeneratedResources())
    } else {
      await generateAgentResources()
    }
    output = `资源草案已汇总，当前共有 ${generatedResources.value.length} 个待审核资源。`
  } else if (agentId === 'qualityReview') {
    output = '资源质量审核完成，等待教师确认后保存或发送。'
  } else if (agentId === 'consistencyReview') {
    output = '主题一致性审核完成，资源已对齐学生画像与薄弱点。'
  }
  if (!completedAgents.value.includes(agentId)) {
    completedAgents.value.push(agentId)
  }
  if (output) {
    agentOutputs[agentId] = output
    addLog(agentId, output)
  }
  persistWorkspace()
  await nextTick()
}
function reduceMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function animateNode(agentId) {
  if (reduceMotion() || !rootRef.value) return Promise.resolve()
  const node = rootRef.value.querySelector(`[data-agent-id="${agentId}"]`)
  if (!node) return Promise.resolve()
  return new Promise((resolve) => {
    gsap.fromTo(
      node,
      { y: 0, scale: 1 },
      { y: -8, scale: 1.03, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out', onComplete: resolve },
    )
  })
}

function animateEdges(edgeList) {
  if (reduceMotion() || !rootRef.value || edgeList.length === 0) return Promise.resolve()
  return Promise.all(
    edgeList.map((edge) => {
      const path = rootRef.value.querySelector(`[data-edge-path="${edge.id}"]`)
      const dot = rootRef.value.querySelector(`[data-edge-dot="${edge.id}"]`)
      if (!path || !dot) return Promise.resolve()
      const length = path.getTotalLength()
      const state = { progress: 0 }
      return new Promise((resolve) => {
        gsap.set(dot, { autoAlpha: 1 })
        gsap.to(state, {
          progress: 1,
          duration: 0.85,
          ease: 'power2.inOut',
          onUpdate() {
            const point = path.getPointAtLength(length * state.progress)
            gsap.set(dot, { attr: { cx: point.x, cy: point.y } })
          },
          onComplete() {
            gsap.set(dot, { autoAlpha: 0 })
            resolve()
          },
        })
      })
    }),
  )
}

async function runAgent(agentId) {
  if (executionStopped.value) return false
  if (activeAgentId.value) return false
  if (!isReady(agentId)) {
    ElMessage.warning('请先完成上游智能体')
    return false
  }

  const outgoing = edgesBase.filter((edge) => edge.from === agentId)
  activeAgentId.value = agentId
  flowingEdges.value = outgoing

  try {
    await animateNode(agentId)
    if (executionStopped.value) return

    // 启动线条和圆点动画
    const edgeAnimPromise = animateEdges(outgoing)

    // 等待 1.5 秒展示处理效果
    await new Promise(resolve => setTimeout(resolve, 1500))
    if (executionStopped.value) return

    await edgeAnimPromise
    if (executionStopped.value) return
    await completeAgent(agentId)
    if (executionStopped.value) return

    await nextTick()
    animateGeneratedCards()
    return true
  } catch (error) {
    if (!executionStopped.value) {
      ElMessage.error(error.message || '智能体执行失败')
    }
    return false
  } finally {
    activeAgentId.value = ''
    flowingEdges.value = []
  }
}

function animateGeneratedCards() {
  if (reduceMotion() || !rootRef.value || generatedResources.value.length === 0) return
  gsap.fromTo(
    rootRef.value.querySelectorAll('.resource-card-anim'),
    { autoAlpha: 0, y: 18 },
    { autoAlpha: 1, y: 0, duration: 0.42, stagger: 0.08, ease: 'power2.out', overwrite: 'auto' },
  )
}

async function ensureResourceSaved(card) {
  if (card.saved && card.resourceId) return card.resourceId
  if (!hasTeacherApproval(card)) {
    ElMessage.warning('请先完成适用性和可用性审核')
    return null
  }
  if (!hasUsableExercise(card)) {
    ElMessage.warning('补救练习必须包含题目、答案和解析后才能保存')
    return null
  }
  const video = card.isVideo ? primaryVideo(card) : null
  if (card.isVideo && !video) {
    ElMessage.warning('请先补充具体视频播放页链接后再保存')
    return null
  }
  if (card.isVideo && !isConcreteVideoUrl(video.url)) {
    ElMessage.warning(isVideoSearchUrl(video.url) ? VIDEO_SEARCH_URL_MESSAGE : '请填写具体视频播放页链接')
    return null
  }
  savingId.value = card.id
  const resourceId = await learningApi.createResource({
    title: card.isVideo ? video.title : card.title,
    resourceType: card.isVideo ? 'video' : card.resourceType,
    url: card.isVideo ? video.url : '',
    summary: card.isVideo ? video.reason : card.summary,
    content: resourceContentForSave(card),
    personalizationBasis: JSON.stringify(card.personalizationBasis || {}),
    reviewReportJson: JSON.stringify(card.reviewReport || {}),
    modelSourceJson: JSON.stringify(card.modelSource || {}),
    auditStatus: card.status || (card.reviewReport?.passed ? 'approved' : 'needs_revision'),
    knowledgePointId: card.knowledgePointId,
    tagId: card.tagId,
  })
  card.resourceId = resourceId
  card.saved = true
  return resourceId
}

async function sendResourceToTargets(card, resourceId) {
  const isClassScope = generationConfig.generationScope === 'class'
  const targetType = isClassScope ? 'class' : 'student'
  if (isClassScope && !generationConfig.classId) {
    ElMessage.warning('请先选择要发送的班级')
    return
  }
  if (!isClassScope && (!selectedStudent.value?.studentId || String(selectedStudent.value.studentId) === String(demoStudent.studentId))) {
    ElMessage.warning('请先选择真实学生后再发送')
    return
  }
  sendingId.value = card.id
  const result = await learningApi.recommendResourceTargets(resourceId, {
    targetType,
    classId: isClassScope ? generationConfig.classId : undefined,
    studentIds: isClassScope ? [] : [Number(selectedStudent.value.studentId)],
  })
  card.sent = true
  const count = result?.targetCount || 0
  ElMessage.success(isClassScope ? `已发送给班级内 ${count} 名学生` : '已发送给该学生')
}

async function saveResource(card, options = {}) {
  try {
    if (!card.saved) {
      const title = options.send ? '保存并发送资源' : '保存资源'
      const message = options.send
        ? `确认将“${card.title}”保存到资源库并发送到学生端？`
        : `确认将“${card.title}”保存到学习资源库？`
      await ElMessageBox.confirm(message, title, {
        confirmButtonText: options.send ? '保存并发送' : '保存',
        cancelButtonText: '取消',
        type: 'info',
      })
    }
    const resourceId = await ensureResourceSaved(card)
    if (!resourceId) return
    if (options.send) {
      await sendResourceToTargets(card, resourceId)
    } else {
      ElMessage.success('已保存到学习资源库')
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || (options.send ? '发送失败' : '保存失败'))
  } finally {
    savingId.value = ''
    sendingId.value = ''
  }
}
async function reviseResource(card) {
  try {
    const { value } = await ElMessageBox.prompt(
      `请说明“${card.title}”需要如何修改，系统会带着反馈重新生成并重新审核。`,
      '退回修改',
      {
        confirmButtonText: '重新生成',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '例如：降低难度，增加指针图解，减少综合项目篇幅。',
        inputValue: revisionFeedback.value,
      },
    )
    if (!value || !value.trim()) {
      ElMessage.warning('请填写修改意见')
      return
    }
    revisionDraft.value = card
    revisionFeedback.value = value.trim()
    const feedback = [
      `教师退回资源：${card.title}`,
      `当前资源类型：${card.resourceTypeLabel || card.resourceType}`,
      `当前摘要：${card.summary || ''}`,
      `当前正文：${card.content || ''}`,
      `修改意见：${revisionFeedback.value}`,
    ].join('\n')
    await generateAgentResources(feedback)
    completedAgents.value = ['preprocess', 'coordinator', 'knowledge', 'ability', 'behavior', 'resource', 'practice', 'report']
    agentOutputs.report = '已根据退回意见重新提交后端生成任务，新的资源草案完成后将自动刷新。'
    addLog('report', agentOutputs.report)
    ElMessage.success('已按退回意见重新提交后端生成任务')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '重新生成失败')
  } finally {
    revisionDraft.value = null
  }
}
watch(selectedStudentId, (value, oldValue) => {
  if (oldValue && value !== oldValue && !generationTaskId.value) {
    resetFlow()
  }
  persistWorkspace()
})

watch(providerOptions, (rows) => {
  const keys = new Set((rows || []).map((item) => item.providerKey))
  if (defaultProviderKey.value && !keys.has(defaultProviderKey.value)) {
    defaultProviderKey.value = ''
  }
  Object.keys(agentOverrides).forEach((agentKey) => {
    if (agentOverrides[agentKey] && !keys.has(agentOverrides[agentKey])) {
      agentOverrides[agentKey] = ''
    }
  })
  persistWorkspace()
}, { deep: true })

watch([teacherRequirement, defaultProviderKey], () => {
  persistWorkspace()
})

watch(generatedResources, (rows) => {
  if (normalizingGeneratedResources || !Array.isArray(rows) || rows.length === 0 || hasExternalVideoResource(rows)) {
    return
  }
  normalizingGeneratedResources = true
  generatedResources.value = ensureVideoResource(rows)
  persistWorkspace()
  nextTick(() => {
    normalizingGeneratedResources = false
  })
}, { deep: true })

onMounted(async () => {
  restoreWorkspace()
  restoreLogs()
  if (rootRef.value) {
    ctx = gsap.context(() => {
      if (reduceMotion()) return
      gsap.from('.agent-hero', { autoAlpha: 0, y: 18, duration: 0.5, ease: 'power2.out' })
      gsap.from('.agent-node', { autoAlpha: 0, y: 20, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.08 })
    }, rootRef.value)
  }
  await Promise.all([loadStudents(), loadProviders(), loadTeacherClasses()])
  if (lastRun.value) {
    syncGeneratedOutputs()
  }
  restoreGenerationTask()
  videoTimer = window.setInterval(() => {
    generatedResources.value.forEach((card) => {
      const state = videoPlayback[card.id]
      if (card.isVideo && state?.playing) nextVideoScene(card)
    })
  }, 2600)
})

onUnmounted(() => {
  stopTaskPolling()
  if (videoTimer) window.clearInterval(videoTimer)
  ctx?.revert()
})
</script>

<template>
  <div ref="rootRef" v-loading="loading" class="agent-resource-page">
    
    <section class="agent-hero">
      <div>
        <p class="eyebrow">Mapis-style Agent Workflow</p>
        <h1>智能体资源生成</h1>
        <p class="hero-copy">以学生画像为输入，点击智能体后触发数据流动，并逐步生成多个个性化学习资源。</p>
      </div>
      <div class="hero-stats">
        <div v-for="item in profileStats" :key="item.label" class="stat-pill">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="control-strip">
      <el-segmented v-model="stage" :options="stageOptions" @change="loadStudents" />
      <el-select v-model="selectedStudentId" filterable placeholder="选择学生" class="student-select">
        <el-option
          v-for="student in students"
          :key="student.studentId"
          :label="`${student.studentName || '学生'} (${student.studentId})`"
          :value="String(student.studentId)"
        />
      </el-select>
      <el-input v-model="studentId" clearable placeholder="按学生 ID 查询" class="student-id-input" @keyup.enter="loadStudents" />
      <el-input v-model="teacherRequirement" clearable placeholder="教师补充要求，如重点补强指针" class="requirement-input" />
      <span class="provider-summary">{{ providerSummaryText }}</span>
      <el-button type="primary" :icon="Search" @click="loadStudents">查询画像</el-button>
      <el-button :icon="Setting" :loading="providerLoading" @click="providerDrawerVisible = true">模型配置</el-button>
      <el-button :icon="UserFilled" @click="loadDemoData()">载入演示数据</el-button>
      <el-button
        v-if="generationTaskId && ['queued', 'running'].includes(generationTaskStatus)"
        type="danger"
        plain
        :icon="SwitchButton"
        @click="stopGenerationTask"
      >
        停止生成
      </el-button>
      <el-button :icon="Refresh" @click="resetFlowAndTask">重置流程</el-button>
    </section>

    <section class="generation-config-strip">
      <el-segmented
        v-model="generationConfig.generationScope"
        :options="[
          { label: '单个学生', value: 'student' },
          { label: '班级共性', value: 'class' },
        ]"
      />
      <el-select
        v-if="generationConfig.generationScope === 'class'"
        v-model="generationConfig.classId"
        class="config-select class-target-select"
        placeholder="选择投放班级"
      >
        <el-option
          v-for="clazz in teacherClasses"
          :key="clazz.id"
          :label="`${clazz.className || '班级'} (${clazz.classCode || clazz.id})`"
          :value="clazz.id"
        />
      </el-select>
      <el-select v-model="generationConfig.difficulty" class="config-select" placeholder="难度">
        <el-option label="基础补弱" value="basic" />
        <el-option label="提升训练" value="improve" />
        <el-option label="综合迁移" value="comprehensive" />
      </el-select>
      <el-input-number v-model="generationConfig.exerciseCount" :min="1" :max="10" controls-position="right" />
      <el-select v-model="generationConfig.publishMode" class="config-select" placeholder="发布模式">
        <el-option label="只生成草稿" value="draft_only" />
        <el-option label="审核后发布" value="publish_after_review" />
      </el-select>
      <el-select v-model="generationConfig.selectedResourceTypes" multiple collapse-tags class="resource-type-select" placeholder="资源类型">
        <el-option label="知识讲解视频" value="knowledge_video" />
        <el-option label="补救练习" value="remedial_exercise" />
        <el-option label="知识点讲义" value="knowledge_handout" />
        <el-option label="错因复盘" value="error_reflection" />
        <el-option label="学习路径" value="learning_path" />
      </el-select>
    </section>

    <el-alert
      v-if="generationTaskMessage"
      :title="generationTaskMessage"
      :type="generationTaskStatus === 'failed' ? 'error' : generationTaskStatus === 'canceled' ? 'warning' : 'info'"
      show-icon
      :closable="false"
    />

    <section class="agent-guide">
      <article v-for="agentId in agentInfoCards" :key="agentId" class="guide-card">
        <span class="guide-avatar">
          <img
            v-if="agents[agentId].image"
            :src="agents[agentId].image"
            :alt="agents[agentId].title"
            :style="{ objectPosition: agents[agentId].imagePosition || '50% center' }"
          />
          <el-icon v-else><component :is="agents[agentId].icon" /></el-icon>
        </span>
        <div>
          <strong>{{ agents[agentId].title }}</strong>
          <small>{{ agents[agentId].cnTitle }} / {{ agents[agentId].subtitle }}</small>
          <p>{{ agents[agentId].note }}</p>
          <p v-if="isEditableAgent(agentId)" class="guide-config-text">模型：{{ currentAgentProviderLabel(agentId) }}</p>
          <p v-else class="guide-config-text is-muted">流程节点 / 规则节点，不支持模型配置</p>
          <el-button v-if="isEditableAgent(agentId)" link type="primary" @click="providerDrawerVisible = true">配置模型</el-button>
        </div>
      </article>
    </section>

    <section class="workflow-shell">
      <div class="mapis-board">
        <svg class="flow-svg" viewBox="0 0 2240 660" aria-hidden="true">
          <path
            v-for="edge in dynamicEdges"
            :key="edge.id"
            :class="edgeClass(edge)"
            :d="edge.path"
            :data-edge-path="edge.id"
          />
          <text class="resource-output-label" x="1910" y="300">审核后资源</text>
          <circle
            v-for="edge in dynamicEdges"
            :key="`${edge.id}-dot`"
            :data-edge-dot="edge.id"
            class="flow-dot"
            r="6"
            :cx="edge.startX"
            :cy="edge.startY"
          />
        </svg>

        <div class="fixed-target-box">
          <div class="target-box">
            <div v-if="generatedResources.length === 0" class="target-empty">
              <strong>等待生成</strong>
              <span>完成资源生成智能体后展示多种个性化资源</span>
            </div>
            <div v-else class="target-list">
              <article v-for="card in generatedResources" :key="card.id" class="resource-card-anim">
                <strong>{{ card.title }}</strong>
                <span>{{ card.resourceTypeLabel || card.resourceType }}{{ card.isMultimodal ? ' · 多模态' : '' }} · {{ card.status === 'approved' ? '审核通过' : '需修改' }}</span>
              </article>
            </div>
          </div>
        </div>

        <div class="draggable-nodes">
          <button
            v-for="agentId in agentInfoCards"
            :key="agentId"
            type="button"
            class="agent-node"
            :style="{ left: agentPositions[agentId].x + 'px', top: agentPositions[agentId].y + 'px' }"
            :class="{
              'is-ready': isReady(agentId),
              'is-active': isActive(agentId),
              'is-receiving': isReceiving(agentId),
              'is-complete': isCompleted(agentId),
              'is-pending': isPending(agentId),
              'is-execution-blocked': !isReady(agentId) || Boolean(activeAgentId),
            }"
            :data-agent-id="agentId"
            @mousedown="startDrag($event, agentId)"
            @click="handleAgentClick(agentId)"
          >
            <div v-if="isActive(agentId)" class="processing-tooltip">Processing...</div>

            <span class="status-light" :class="statusClass(agentId)" :title="agentStatus(agentId)" />
            <span class="agent-portrait" :class="{ 'is-fallback': !agents[agentId].image }">
              <img
                v-if="agents[agentId].image"
                :src="agents[agentId].image"
                :alt="agents[agentId].title"
                :style="{ objectPosition: agents[agentId].imagePosition || '50% center' }"
              />
              <el-icon v-else><component :is="agents[agentId].icon" /></el-icon>
            </span>
            <span class="agent-body">
              <strong>{{ agents[agentId].title }}</strong>
              <small>{{ agents[agentId].cnTitle }}</small>
            </span>
          </button>
        </div>
      </div>
    </section>

    <section class="insight-grid">
      <div class="log-panel">
        <div class="section-title">
          <div class="section-title-main">
            <h2>处理日志</h2>
            <span>{{ logs.length }} 条</span>
          </div>
          <div class="section-title-actions">
            <el-button text type="danger" :icon="Delete" @click="clearLogs">批量删除</el-button>
          </div>
        </div>
        <el-empty v-if="logs.length === 0" description="点击智能体后显示处理日志" :image-size="88" />
        <ul v-else class="log-list">
          <li v-for="log in logs" :key="log.id">
            <time>{{ log.time }}</time>
            <strong>{{ log.agent }}</strong>
            <p>{{ log.content }}</p>
            <el-button text type="danger" size="small" :icon="Delete" @click="deleteLog(log.id)">删除</el-button>
          </li>
        </ul>
      </div>

      <div class="resource-panel" :class="{ 'is-targeted': generatedResources.length > 0 }">
        <div class="section-title">
          <h2>个性化资源生成结果</h2>
          <span>{{ generatedResources.length }} 个</span>
        </div>
        <el-empty v-if="generatedResources.length === 0" description="完成资源生成智能体后展示结果" :image-size="88" />
        <div v-else class="resource-grid">
          <article v-for="card in generatedResources" :key="card.id" class="resource-card">
            <div class="resource-card-head">
              <el-tag effect="dark" round>{{ card.sourceAgent }}</el-tag>
              <el-tag :type="card.isMultimodal ? 'success' : 'info'" round>{{ card.resourceTypeLabel }}</el-tag>
              <el-tag v-if="card.isMultimodal" type="primary" effect="plain" round>多模态</el-tag>
              <el-tag :type="card.status === 'approved' ? 'success' : 'warning'" round>
                {{ card.status === 'approved' ? '审核通过' : '需修改' }}
              </el-tag>
            </div>
            <h3>{{ card.title }}</h3>
            <p class="resource-summary">{{ card.summary }}</p>

            <div v-if="card.isVideo && currentVideoScene(card)" class="video-preview">
              <div class="video-player-bar">
                <span class="video-dot red"></span>
                <span class="video-dot yellow"></span>
                <span class="video-dot green"></span>
                <strong>知识点讲解视频</strong>
              </div>
              <div class="video-stage">
                <div class="video-visual">
                  <span>{{ currentVideoScene(card).title }}</span>
                  <strong>{{ currentVideoScene(card).boardText }}</strong>
                </div>
                <div class="video-caption">
                  {{ currentVideoScene(card).narration }}
                </div>
              </div>
              <div class="video-controls">
                <el-button size="small" type="primary" @click="toggleVideo(card)">
                  {{ videoState(card).playing ? '暂停' : '播放' }}
                </el-button>
                <el-button size="small" @click="nextVideoScene(card)">下一幕</el-button>
                <el-progress :percentage="videoProgress(card)" :show-text="false" />
                <span>{{ videoState(card).sceneIndex + 1 }} / {{ card.videoScenes.length }}</span>
              </div>
              <div class="video-scenes">
                <button
                  v-for="(scene, index) in card.videoScenes"
                  :key="`${card.id}-scene-${index}`"
                  type="button"
                  :class="{ active: videoState(card).sceneIndex === index }"
                  @click="selectVideoScene(card, index)"
                >
                  {{ index + 1 }}. {{ scene.title }}
                </button>
              </div>
            </div>
            <div v-else-if="card.isVideo && (card.sourceUrl || card.videoConfig?.sourceStatus === 'fallback' || card.videoRecommendations?.length)" class="video-preview existing-video-preview">
              <div class="video-player-bar">
                <span class="video-dot red"></span>
                <span class="video-dot yellow"></span>
                <span class="video-dot green"></span>
                <strong>外部知识讲解视频片段</strong>
              </div>
              <div class="video-stage">
                <div class="video-visual external-video-visual">
                  <span>{{ card.videoConfig?.query || 'C语言知识点讲解' }}</span>
                  <strong>{{ card.title }}</strong>
                </div>
                <div class="video-caption">
                  系统已根据学生薄弱点匹配具体知识讲解视频，教师可预览、替换或补充视频链接后推荐给学生。
                </div>
              </div>
              <div v-if="card.videoRecommendations?.length && hasConcreteVideo(card)" class="video-recommendation-grid">
                <article
                  v-for="video in card.videoRecommendations"
                  :key="video.id"
                  class="video-recommendation-card"
                  role="button"
                  tabindex="0"
                  @click="openRecommendedVideo(video)"
                  @keydown.enter.prevent="openRecommendedVideo(video)"
                >
                  <img :src="video.cover" :alt="video.title" loading="lazy" />
                  <div class="video-recommendation-body">
                    <div class="video-recommendation-meta">
                      <span>{{ video.platform }}</span>
                      <small>{{ video.duration }} · {{ video.viewCount }}</small>
                    </div>
                    <strong>{{ video.title }}</strong>
                    <p>{{ video.reason }}</p>
                    <div class="video-knowledge-tags">
                      <span v-for="point in video.matchedKnowledgePoints" :key="`${video.id}-${point}`">{{ point }}</span>
                    </div>
                    <el-button size="small" type="primary" @click.stop="openRecommendedVideo(video)">观看推荐视频</el-button>
                  </div>
                </article>
              </div>
              <div class="external-video-actions">
                <template v-if="hasConcreteVideo(card)">
                  <el-button type="primary" @click="watchRecommendedVideo(card)">观看推荐视频</el-button>
                  <el-button plain @click="pasteVideoLink(card)">更换视频</el-button>
                  <el-button plain @click="copyVideoLink(card)">复制链接</el-button>
                </template>
                <template v-else>
                  <el-button
                    v-for="item in externalVideoLinks(card)"
                    :key="item.label"
                    type="primary"
                    tag="a"
                    :href="item.url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    搜索候选视频
                  </el-button>
                  <el-button plain @click="pasteVideoLink(card)">粘贴视频链接</el-button>
                  <el-button plain disabled>暂存待完善</el-button>
                </template>
              </div>
            </div>
            <div v-if="card.isQuiz && (card.quizQuestions.length || card.exerciseQuestions.length)" class="quiz-preview">
              <div class="quiz-preview-head">
                <strong>互动测验题目</strong>
                <span>{{ quizDisplayQuestions(card).length }} 题</span>
              </div>
              <div class="quiz-question" v-for="(question, index) in quizDisplayQuestions(card)" :key="`${card.id}-quiz-${index}`">
                <div class="quiz-question-title">
                  <span>{{ index + 1 }}</span>
                  <strong>{{ question.stem }}</strong>
                </div>
                <div v-if="question.options?.length" class="quiz-options">
                  <button
                    v-for="(option, optionIndex) in question.options"
                    :key="`${card.id}-quiz-${index}-${optionIndex}`"
                    type="button"
                    :class="{ active: normalizeAnswer(quizAnswer(card, index)) === String.fromCharCode(65 + optionIndex) }"
                    @click="setQuizAnswer(card, index, String.fromCharCode(65 + optionIndex))"
                  >
                    {{ option }}
                  </button>
                </div>
                <el-input
                  v-else
                  :model-value="quizAnswer(card, index)"
                  size="small"
                  placeholder="请输入答案"
                  @update:model-value="setQuizAnswer(card, index, $event)"
                />
                <div v-if="quizFeedback(card, question, index)" class="quiz-feedback" :class="{ correct: isQuizCorrect(card, question, index) }">
                  {{ quizFeedback(card, question, index) }}
                </div>
              </div>
            </div>

            <el-collapse class="resource-detail" accordion>
              <el-collapse-item title="资源内容" name="content">
                <div class="resource-content">{{ card.content }}</div>
              </el-collapse-item>
              <el-collapse-item title="个性化依据" name="basis">
                <dl class="meta-list">
                  <template v-for="(value, key) in card.personalizationBasis" :key="key">
                    <dt>{{ key }}</dt>
                    <dd>{{ Array.isArray(value) ? value.join('、') : value }}</dd>
                  </template>
                </dl>
              </el-collapse-item>
              <el-collapse-item title="审核报告" name="review">
                <div class="score-row">
                  <span>质量 {{ card.reviewReport?.qualityScore ?? '-' }}</span>
                  <span>相关 {{ card.reviewReport?.relevanceScore ?? '-' }}</span>
                  <span>一致 {{ card.reviewReport?.consistencyScore ?? '-' }}</span>
                </div>
                <p class="review-comment">{{ card.reviewReport?.comments || '暂无审核意见' }}</p>
                <ul v-if="card.reviewReport?.revisionSuggestions?.length" class="suggestion-list">
                  <li v-for="item in card.reviewReport.revisionSuggestions" :key="item">{{ item }}</li>
                </ul>
              </el-collapse-item>
              <el-collapse-item title="模型来源" name="model">
                <dl class="meta-list">
                  <dt>生成模型</dt>
                  <dd>
                    {{ card.modelSource?.generatorModel || '-' }}
                    <small class="meta-hint">{{ providerBindingMode('generator') }}</small>
                  </dd>
                  <dt>质量审核模型</dt>
                  <dd>
                    {{ card.modelSource?.qualityReviewerModel || '-' }}
                    <small class="meta-hint">{{ providerBindingMode('qualityReviewer') }}</small>
                  </dd>
                  <dt>一致性审核模型</dt>
                  <dd>
                    {{ card.modelSource?.consistencyReviewerModel || '-' }}
                    <small class="meta-hint">{{ providerBindingMode('consistencyReviewer') }}</small>
                  </dd>
                  <dt>调用 ID</dt>
                  <dd>{{ card.modelSource?.llmCallIds?.join('、') || '-' }}</dd>
                </dl>
              </el-collapse-item>
            </el-collapse>

            <div class="teacher-review-box">
              <el-checkbox v-model="card.reviewState.suitabilityApproved">适合当前对象</el-checkbox>
              <el-checkbox v-model="card.reviewState.usabilityApproved">可直接使用</el-checkbox>
              <el-input
                v-model="card.reviewState.teacherComment"
                size="small"
                clearable
                placeholder="教师审核备注，可选"
              />
            </div>

            <div class="resource-actions">
              <el-button v-if="card.isVideo && card.videoScenes?.length" type="success" plain @click="downloadRemotionProps(card)">
                导出 Remotion 数据
              </el-button>
              <el-button v-if="card.isVideo && card.videoScenes?.length" plain @click="copyRemotionCommand(card)">
                复制渲染命令
              </el-button>
              <el-button
                type="primary"
                :icon="card.saved ? Finished : DocumentChecked"
                :loading="savingId === card.id"
                :disabled="card.saved || !canSaveGeneratedResource(card)"
                @click="saveResource(card)"
              >
                {{ card.saved ? '已保存' : '保存到资源库' }}
              </el-button>
              <el-button
                type="success"
                plain
                :loading="sendingId === card.id"
                :disabled="card.sent || !canSaveGeneratedResource(card)"
                @click="saveResource(card, { send: true })"
              >
                {{ card.sent ? '已发送' : '发送到学生端' }}
              </el-button>
              <el-button :icon="Refresh" @click="reviseResource(card)">退回修改</el-button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <el-drawer v-model="providerDrawerVisible" title="智能体模型配置" size="420px">
      <div class="provider-drawer">
        <p class="drawer-copy">仅对接入 LLM 的智能体开放模型选择。未单独配置时，自动继承页面默认模型；页面默认模型留空时，继续跟随系统默认。</p>
        <el-form label-position="top">
          <el-form-item label="页面默认模型">
            <el-select v-model="defaultProviderKey" clearable filterable placeholder="留空则跟随系统默认" :loading="providerLoading" style="width: 100%">
              <el-option
                v-for="item in providerOptions"
                :key="`${item.source}-${item.providerKey}`"
                :label="item.label || item.providerKey"
                :value="item.providerKey"
              />
            </el-select>
          </el-form-item>

          <div v-for="agentKey in Object.keys(agentOverrides)" :key="agentKey" class="provider-agent-block">
            <div class="provider-agent-head">
              <strong>{{ backendAgentLabels[agentKey] }}</strong>
              <span>{{ providerBindingMode(agentKey) }}</span>
            </div>
            <el-select v-model="agentOverrides[agentKey]" clearable filterable placeholder="未选择时继承页面默认模型" :loading="providerLoading" style="width: 100%">
              <el-option
                v-for="item in providerOptions"
                :key="`${agentKey}-${item.source}-${item.providerKey}`"
                :label="item.label || item.providerKey"
                :value="item.providerKey"
              />
            </el-select>
          </div>
        </el-form>

        <div class="provider-drawer-note">
          <strong>不支持配置的节点</strong>
          <p>预处理、协调、知识定位、能力分析、资料生成、讲解生成、练习生成当前是流程或规则节点，不暴露模型选择。</p>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
/* =========================================================================
   1. 瀹岀編杩樺師浣犵殑鍏ㄥ眬銆佸ご閮ㄣ€佸紩瀵煎尯銆佸簳閮ㄦ牱寮?(鏈仛浠讳綍鏇存敼)
   ========================================================================= */
.agent-resource-page {
  display: grid;
  gap: 18px;
  color: #222831;
}

.agent-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 22px 24px;
  border: 1px solid #d7dfdb;
  border-radius: 10px;
  background: linear-gradient(135deg, #ffffff, #f4f8f6);
  box-shadow: 0 10px 26px rgba(45, 73, 67, 0.08);
}

.eyebrow {
  margin: 0 0 6px;
  color: #4f8f7b;
  font-size: 13px;
  font-weight: 700;
}

.agent-hero h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 0;
}

.hero-copy {
  margin: 10px 0 0;
  color: #5f6f6c;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(78px, 1fr));
  gap: 10px;
}

.stat-pill {
  min-width: 86px;
  padding: 12px 14px;
  border: 1px solid #d9e4df;
  border-radius: 8px;
  background: #ffffff;
}

.stat-pill span {
  display: block;
  color: #6d7c79;
  font-size: 12px;
}

.stat-pill strong {
  display: block;
  margin-top: 4px;
  color: #2c6f5e;
  font-size: 20px;
}

.control-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid #d7dfdb;
  border-radius: 10px;
  background: #ffffff;
}

.student-select {
  width: 240px;
}

.student-id-input {
  width: 180px;
}

.requirement-input {
  width: 320px;
}

.provider-summary {
  color: #536663;
  font-size: 13px;
}

.generation-config-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border: 1px solid #d7dfdb;
  border-radius: 10px;
  background: #fbfefd;
}

.config-select {
  width: 150px;
}

.class-target-select {
  width: min(220px, 100%);
}

.resource-type-select {
  width: min(360px, 100%);
}

.agent-guide {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.guide-card {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 12px;
  min-height: 118px;
  padding: 14px;
  border: 1px solid #d7dfdb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(45, 73, 67, 0.06);
}

.guide-avatar {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  color: #ffffff;
  font-size: 24px;
  background: linear-gradient(135deg, #5a987d, #2e6757);
}

.guide-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.guide-card strong,
.guide-card small,
.guide-card p {
  display: block;
}

.guide-card strong {
  color: #1f2f2d;
  font-size: 15px;
}

.guide-card small {
  margin-top: 3px;
  color: #60706d;
  font-size: 12px;
}

.guide-card p {
  margin: 8px 0 0;
  color: #4d5b58;
  font-size: 13px;
  line-height: 1.55;
}

.guide-config-text {
  margin-top: 10px;
  color: #2c6f5e;
  font-size: 12px;
  font-weight: 600;
}

.guide-config-text.is-muted {
  color: #7b8886;
  font-weight: 500;
}

.insight-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 18px;
}

.log-panel,
.resource-panel {
  min-width: 0;
  padding: 18px;
  border: 1px solid #d7dfdb;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgba(45, 73, 67, 0.08);
}

.resource-panel.is-targeted {
  border-color: #2c8c67;
  box-shadow: 0 12px 34px rgba(44, 140, 103, 0.16);
}

.resource-panel .resource-grid {
  max-height: min(72vh, 760px);
  padding-right: 8px;
  overflow: auto;
  overscroll-behavior: contain;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-title-main,
.section-title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title h2 {
  margin: 0;
  font-size: 19px;
}

.section-title span {
  color: #71807d;
  font-size: 13px;
}

.log-list {
  display: grid;
  gap: 12px;
  max-height: 420px;
  padding: 0;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.log-list li {
  padding: 12px;
  border-left: 4px solid #4f8f7b;
  background: #f6faf8;
  display: grid;
  gap: 6px;
}

.log-list time {
  display: block;
  color: #7d8a87;
  font-size: 12px;
}

.log-list strong {
  display: block;
  margin-top: 3px;
  color: #2c6f5e;
}

.log-list p {
  margin: 6px 0 0;
  color: #4f5f5c;
  line-height: 1.55;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.resource-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 220px;
  padding: 18px;
  border: 1px solid #d7dfdb;
  border-radius: 8px;
  background: #fbfdfc;
  box-shadow: 0 8px 20px rgba(45, 73, 67, 0.06);
  will-change: transform;
}

.resource-card-head {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.resource-card h3 {
  margin: 0;
  font-size: 18px;
}

.resource-card p {
  margin: 0;
  color: #52615f;
  line-height: 1.7;
}

.resource-summary {
  min-height: 48px;
}

.video-preview {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #cfe3dc;
  border-radius: 10px;
  background: linear-gradient(180deg, #f5fbf8 0%, #eef8f4 100%);
}

.video-player-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #d6e7e1;
  border-radius: 8px;
  color: #35534a;
  background: #ffffff;
}

.video-player-bar strong {
  margin-left: 4px;
  color: #1f3f36;
  font-size: 13px;
}

.video-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.video-dot.red {
  background: #ef4444;
}

.video-dot.yellow {
  background: #f59e0b;
}

.video-dot.green {
  background: #22c55e;
}

.video-stage {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(9, 95, 73, 0.4);
  background: #071b17;
  color: #ecfdf5;
  box-shadow: inset 0 0 36px rgba(45, 212, 191, 0.12);
}

.video-visual {
  display: grid;
  min-height: 160px;
  padding: 22px;
  place-content: center;
  gap: 12px;
  text-align: center;
  background:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    radial-gradient(circle at 30% 20%, rgba(42, 185, 139, 0.30), transparent 32%),
    linear-gradient(135deg, #08251f 0%, #0d1f1b 55%, #071511 100%);
  background-size: 22px 22px, 22px 22px, auto, auto;
}

.video-visual span {
  width: fit-content;
  justify-self: center;
  padding: 5px 10px;
  border-radius: 999px;
  color: #8ee8c2;
  background: rgba(20, 83, 45, 0.45);
  font-size: 13px;
  font-weight: 700;
}

.video-visual strong {
  max-width: 560px;
  color: #ffffff;
  font-size: 21px;
  line-height: 1.45;
  text-shadow: 0 0 18px rgba(110, 231, 183, 0.22);
}

.video-caption {
  padding: 10px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  color: #d7f5e8;
  background: rgba(0, 0, 0, 0.22);
  line-height: 1.65;
}

.external-video-visual {
  min-height: 190px;
  background:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    radial-gradient(circle at 50% 35%, rgba(34, 197, 94, 0.28), transparent 34%),
    linear-gradient(135deg, #071b17 0%, #10251f 58%, #06130f 100%);
}

.external-video-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.video-recommendation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.video-recommendation-card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid rgba(47, 155, 123, 0.28);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 12px 30px rgba(21, 92, 70, 0.08);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.video-recommendation-card:hover,
.video-recommendation-card:focus-visible {
  border-color: rgba(47, 155, 123, 0.62);
  box-shadow: 0 16px 34px rgba(21, 92, 70, 0.16);
  transform: translateY(-2px);
  outline: none;
}

.video-recommendation-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: #09251f;
}

.video-recommendation-body {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.video-recommendation-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #5d716b;
  font-size: 12px;
}

.video-recommendation-meta span {
  padding: 3px 8px;
  border-radius: 999px;
  color: #0f6c52;
  background: #e8f7f1;
  font-weight: 700;
}

.video-recommendation-body strong {
  color: #173c33;
  font-size: 15px;
  line-height: 1.45;
}

.video-recommendation-body p {
  margin: 0;
  color: #52615f;
  font-size: 13px;
  line-height: 1.65;
}

.video-knowledge-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.video-knowledge-tags span {
  padding: 3px 8px;
  border: 1px solid rgba(47, 155, 123, 0.22);
  border-radius: 999px;
  color: #2a6b58;
  background: #f2fbf7;
  font-size: 12px;
}

.quiz-preview {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #cfe3dc;
  border-radius: 10px;
  background: #f7fcfa;
}

.quiz-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #20443a;
}

.quiz-preview-head strong {
  font-size: 15px;
}

.quiz-preview-head span {
  color: #4f756b;
  font-size: 12px;
}

.quiz-question {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #d8e8e2;
  border-radius: 8px;
  background: #ffffff;
}

.quiz-question-title {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  color: #20312d;
}

.quiz-question-title span {
  display: grid;
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  background: #3f9477;
  font-size: 12px;
  font-weight: 700;
}

.quiz-question-title strong {
  line-height: 1.5;
}

.quiz-options {
  display: grid;
  gap: 8px;
}

.quiz-options button {
  padding: 9px 11px;
  border: 1px solid #d5e6df;
  border-radius: 8px;
  color: #375650;
  background: #fbfefd;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.quiz-options button:hover,
.quiz-options button.active {
  border-color: #3f9477;
  background: #ecf8f4;
  transform: translateY(-1px);
}

.quiz-feedback {
  padding: 9px 11px;
  border-radius: 8px;
  color: #8a4b10;
  background: #fff7ed;
  line-height: 1.55;
}

.quiz-feedback.correct {
  color: #17634e;
  background: #ecfdf5;
}

.video-controls {
  display: grid;
  grid-template-columns: auto auto minmax(120px, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.video-controls span {
  color: #52615f;
  font-size: 12px;
}

.video-scenes {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.video-scenes button {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid #cfe3dc;
  border-radius: 999px;
  color: #3d5951;
  background: #ffffff;
  cursor: pointer;
}

.video-scenes button.active {
  color: #ffffff;
  border-color: #2c8c67;
  background: #2c8c67;
}

.resource-detail {
  --el-collapse-header-height: 38px;
  border-top: 1px solid #e0e8e4;
  border-bottom: 1px solid #e0e8e4;
}

.resource-content {
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  color: #34423f;
  line-height: 1.7;
}

.meta-list {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 8px 12px;
  margin: 0;
}

.meta-list dt {
  color: #6a7976;
  font-weight: 700;
}

.meta-list dd {
  min-width: 0;
  margin: 0;
  color: #263330;
  word-break: break-word;
}

.meta-hint {
  display: block;
  margin-top: 4px;
  color: #758481;
  font-size: 12px;
}

.score-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.score-row span {
  padding: 6px 10px;
  border-radius: 999px;
  color: #245f50;
  background: #e8f5ef;
  font-weight: 700;
}

.review-comment {
  margin: 10px 0 0;
}

.suggestion-list {
  margin: 10px 0 0;
  padding-left: 18px;
  color: #8a5a16;
}

.resource-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}

.teacher-review-box {
  display: grid;
  grid-template-columns: repeat(2, max-content) minmax(180px, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed #b8d7cd;
  border-radius: 10px;
  background: #f7fcfa;
}

.provider-drawer {
  display: grid;
  gap: 16px;
}

.drawer-copy {
  margin: 0;
  color: #566663;
  line-height: 1.6;
}

.provider-agent-block {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.provider-agent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.provider-agent-head strong {
  color: #20312d;
}

.provider-agent-head span {
  color: #6d7c79;
  font-size: 12px;
}

.provider-drawer-note {
  padding: 14px;
  border: 1px solid #dbe4df;
  border-radius: 10px;
  background: #f7faf8;
}

.provider-drawer-note strong {
  color: #1f2f2d;
}

.provider-drawer-note p {
  margin: 8px 0 0;
  color: #5a6866;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .agent-hero { align-items: stretch; flex-direction: column; }
  .agent-guide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .insight-grid { grid-template-columns: 1fr; }
  .workflow-shell { --board-scale: 0.72; }
}

@media (max-width: 720px) {
  .agent-hero, .control-strip, .generation-config-strip, .log-panel, .resource-panel { padding: 14px; }
  .agent-hero h1 { font-size: 24px; }
  .student-select, .student-id-input, .requirement-input, .provider-summary, .control-strip .el-button, .config-select, .resource-type-select, .generation-config-strip .el-input-number { width: 100%; }
  .resource-grid { grid-template-columns: 1fr; }
  .teacher-review-box { grid-template-columns: 1fr; }

  .video-controls {
    grid-template-columns: 1fr 1fr;
  }

  .video-controls .el-progress {
    grid-column: 1 / -1;
  }
  .agent-guide { grid-template-columns: 1fr; }
  .workflow-shell { --board-scale: 0.54; }
}


/* =========================================================================
   2. 宸ヤ綔娴佺敾鏉挎牳蹇冩牱寮?(杩欓噷寮曞叆浜嗙粷瀵瑰畾浣嶃€佺櫧鏉垮拰娴佸姩绾挎潯)
   ========================================================================= */

.workflow-shell {
  --board-scale: 0.9;
  overflow-x: hidden;
  overflow-y: hidden;
  padding-bottom: 0;
  min-height: calc(660px * var(--board-scale) + 2px);
}

/* 鐧芥澘搴曞骇 */
.mapis-board {
  position: relative;
  width: 2240px;
  min-width: 2240px;
  min-height: 660px;
  border: 1px solid #d2d8d5;
  border-radius: 8px;
  background-color: #fffdf8;
  /* 鐐归樀鑳屾櫙鍥?*/
  background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
  background-size: 24px 24px;
  transform: scale(var(--board-scale));
  transform-origin: top left;
  user-select: none;
}

/* ==== 鍥哄畾鍦ㄥ彸渚х殑鐩爣鐢熸垚妗?(娌跨敤浣犱箣鍓嶇殑 target-box 鏍峰紡) ==== */
.fixed-target-box {
  position: absolute;
  left: 1980px;
  top: 140px;
  width: 260px;
  z-index: 2;
}

.target-box {
  display: grid;
  align-content: center;
  min-height: 260px;
  padding: 14px;
  border: 2px dashed #d7a24e;
  background: rgba(255, 250, 239, 0.72);
}

@media (min-width: 2100px) {
  .workflow-shell { --board-scale: 0.94; }
}

@media (max-width: 1700px) {
  .workflow-shell { --board-scale: 0.72; }
}

@media (max-width: 1440px) {
  .workflow-shell { --board-scale: 0.6; }
}

@media (max-width: 1180px) {
  .workflow-shell { --board-scale: 0.44; }
}

@media (max-width: 720px) {
  .workflow-shell { --board-scale: 0.31; }
}

.target-empty {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 200px;
  color: #60706d;
  text-align: center;
}

.target-empty strong { color: #2c6f5e; font-size: 22px; }

.target-list { display: grid; gap: 12px; }

.target-list article {
  padding: 12px;
  border-left: 4px solid #2c8c67;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(45, 73, 67, 0.08);
}
.target-list strong { color: #1f2f2d; font-size: 14px; line-height: 1.5; display: block; }
.target-list span { margin-top: 5px; color: #6d7c79; font-size: 12px; display: block; }


/* ==== SVG 杩炵嚎娴佷綋鏁堟灉 ==== */
.flow-svg {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.flow-edge {
  fill: none;
  stroke: #a8b3af;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 8 8; 
  transition: stroke 0.3s ease, opacity 0.3s ease;
  opacity: 0.6;
}

/* 鏍稿績锛氱偣浜畬鎴愬悗渚濈劧鎸佺画娴佸姩 */
.flow-edge.is-finished {
  stroke: #12a76a;
  stroke-width: 3.5;
  opacity: 0.8;
  animation: data-dash 1.5s linear infinite;
}

/* 澶勭悊涓祦閫熻緝蹇?*/
.flow-edge.is-flowing {
  stroke: #12a76a;
  stroke-width: 4.5;
  stroke-dasharray: 10 10;
  opacity: 1;
  animation: data-dash 0.6s linear infinite;
  filter: drop-shadow(0 0 8px rgba(18, 167, 106, 0.6));
}

@keyframes data-dash {
  to { stroke-dashoffset: -32; }
}

.resource-output-label {
  fill: #356b5b;
  font-size: 14px;
  font-weight: 700;
}

.flow-dot {
  fill: #24f0a2;
  filter: drop-shadow(0 0 14px rgba(36, 240, 162, 0.95));
  opacity: 0;
  visibility: hidden;
}


/* ==== 鍙嫋鎷界殑鏅鸿兘浣撹妭鐐瑰眰 ==== */
.draggable-nodes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.agent-node {
  /* 鍙樹负缁濆瀹氫綅浠ユ敮鎸佹嫋鎷?*/
  position: absolute; 
  pointer-events: auto;
  z-index: 4;
  /* 涓ユ牸閿佸畾灏哄闃叉绾挎潯閿欎綅绌挎ā */
  width: 260px;
  height: 88px;
  box-sizing: border-box;
  
  /* 鍐呴儴淇濈暀浣犲師鏉ョ殑甯冨眬 */
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #cdd7d2;
  border-radius: 4px;
  color: inherit;
  text-align: left;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 18px rgba(22, 35, 32, 0.08);
  cursor: grab;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  will-change: transform, box-shadow, left, top;
}

.agent-node:active {
  cursor: grabbing;
}

.agent-node:hover {
  border-color: #2c8c67;
  box-shadow: 0 13px 24px rgba(22, 35, 32, 0.13);
}

.agent-node.is-execution-blocked {
  cursor: grab;
  opacity: 1;
  background: rgba(255, 255, 255, 0.78);
}

.agent-node.is-execution-blocked .agent-body,
.agent-node.is-execution-blocked .status-light {
  opacity: 0.55;
}

/* 婵€娲绘椂鍙戝厜 */
.agent-node.is-active {
  z-index: 20; 
  border-color: #4ade80; 
  background: #ffffff;
  box-shadow: 0 0 0 2px #4ade80, 0 0 20px 5px rgba(74, 222, 128, 0.4);
  transform: translateY(-4px);
  animation: neon-pulse 1.5s infinite alternate;
}

@keyframes neon-pulse {
  from { box-shadow: 0 0 0 2px #4ade80, 0 0 10px rgba(74, 222, 128, 0.3); }
  to { box-shadow: 0 0 0 3px #4ade80, 0 0 25px 8px rgba(74, 222, 128, 0.6); }
}

.processing-tooltip {
  position: absolute;
  top: -38px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #ffffff;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 6px rgba(0,0,0,0.15);
  z-index: 30;
}

.processing-tooltip::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0;
  border-style: solid;
  border-color: #1e293b transparent transparent transparent;
}

.agent-node.is-receiving {
  border-color: #38bdf8;
  background: #f3fbff;
  box-shadow: 0 14px 28px rgba(56, 189, 248, 0.18), 0 0 0 4px rgba(56, 189, 248, 0.08);
}

.agent-node.is-complete {
  border-color: #d7dfdb;
  background: rgba(255, 255, 255, 0.9);
}

.agent-node.is-pending {
  border-color: #d8dfdc;
  background: rgba(255, 255, 255, 0.72);
}

.agent-portrait {
  display: grid;
  place-items: center;
  width: 82px;
  height: 72px;
  border: 0;
  border-radius: 0;
  overflow: visible;
  color: #ffffff;
  font-size: 28px;
  font-weight: 800;
  background: transparent;
  box-shadow: none;
}

.agent-portrait.is-fallback {
  border-radius: 50%;
  background: linear-gradient(135deg, #4f8f7b, #2c6f5e);
  box-shadow: 0 10px 18px rgba(44, 111, 94, 0.18);
}
.agent-portrait.is-fallback .el-icon { font-size: 32px; }
.agent-portrait img {
  width: 100%; height: 100%; object-fit: cover; object-position: var(--agent-image-position, center); filter: drop-shadow(0 10px 14px rgba(31, 47, 45, 0.18));
}

.agent-body { min-width: 0; }
.agent-body strong, .agent-body small, .agent-body em { display: block; }
.agent-body strong { font-size: 15px; }
.agent-body small { margin-top: 3px; color: #56625f; font-size: 12px; }

.status-light {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #c8d0cd;
  box-shadow: 0 0 0 3px rgba(200, 208, 205, 0.22);
}

.status-light.is-done {
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18), 0 0 10px rgba(34, 197, 94, 0.55);
}

.status-light.is-running {
  background: #38bdf8;
  animation: status-pulse 1s ease-in-out infinite;
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.18), 0 0 14px rgba(56, 189, 248, 0.72);
}

.status-light.is-idle {
  background: #a8b3af;
}

@keyframes status-pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.74; }
  50% { transform: scale(1.22); opacity: 1; }
}

</style>







