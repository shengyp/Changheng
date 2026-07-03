import {
  Connection,
  DocumentChecked,
  Files,
  MagicStick,
  Memo,
  Operation,
  Search,
  TrendCharts,
} from '@element-plus/icons-vue'

const agentImages = {
  coordinator: '/picture/coordinator%20Agent.png',
  knowledge: '/picture/Knowledge%20Agent.png',
  ability: '/picture/Ability%20Agent.png',
  behavior: '/picture/Reflection%20Agent.png',
  resource: '/picture/Resource%20Agent.png',
  practice: '/picture/Practice%20Agent.png',
  report: '/picture/Reporting%20Agent.png',
}

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

export const defaultAgentPositions = {
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
}

export {
  agentImages,
  agentInfoCards,
  agentProviderFieldMap,
  agentRunSequences,
  agents,
  backendAgentLabels,
  defaultResourceTypes,
  demoResources,
  demoStudent,
  deprecatedResourceTypes,
  editableAgentIds,
  edgesBase,
  exerciseResourceTypes,
  multimodalResourceTypes,
  resourceTypeLabels,
  stageOptions,
  videoResourceTypes,
}
