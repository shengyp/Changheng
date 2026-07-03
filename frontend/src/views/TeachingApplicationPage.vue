<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Collection,
  Connection,
  Cpu,
  DataAnalysis,
  Document,
  Histogram,
  Management,
  Reading,
  Setting,
  User,
} from '@element-plus/icons-vue'
import AuthDialog from '@/components/landing/AuthDialog.vue'
import '@/styles/landing.css'

const router = useRouter()
const authDialogVisible = ref(false)
const authDialogMode = ref('login')
const activeNodeId = ref('recommend')

const stars = Array.from({ length: 72 }, (_, index) => ({
  id: index + 1,
  left: `${((index + 1) * 43) % 100}%`,
  top: `${((index + 1) * 59) % 100}%`,
  size: `${1 + ((index + 2) % 3)}px`,
  opacity: 0.2 + (((index + 4) % 7) * 0.07),
}))

const stats = [
  { value: '18', label: '作业考试', tone: 'cyan' },
  { value: '140', label: '学习资源', tone: 'violet' },
  { value: '32', label: '推荐任务', tone: 'amber' },
  { value: '92%', label: '练习覆盖率', tone: 'emerald' },
]

const orchestrationNodes = [
  {
    id: 'bank',
    label: '题库建设',
    icon: Management,
    x: 50,
    y: 14,
    title: '题库建设',
    description: '围绕课程目标维护题目、标签、知识点和学习资源，形成作业考试与在线练习基础。',
    signal: 'Question bank ready',
    metric: '128 道题',
  },
  {
    id: 'exam',
    label: '作业考试',
    icon: Histogram,
    x: 75,
    y: 24,
    title: '作业考试',
    description: '教师发布作业、考试和阶段测评，设置班级或学生范围，并跟踪提交情况。',
    signal: 'Assessment running',
    metric: '18 个测评',
  },
  {
    id: 'answer',
    label: '学生作答',
    icon: Connection,
    x: 84,
    y: 50,
    title: '学生作答',
    description: '学生完成题库练习、作业和考试，系统记录作答过程、错题和提交结果。',
    signal: 'Answer stream active',
    metric: '1,286 条记录',
  },
  {
    id: 'analysis',
    label: '学习统计',
    icon: Reading,
    x: 75,
    y: 76,
    title: '学习统计',
    description: '根据作答数据统计错题、知识点掌握情况、练习完成率和阶段学习表现。',
    signal: 'Analytics running',
    metric: '92% 覆盖',
  },
  {
    id: 'profile',
    label: '知识画像',
    icon: Collection,
    x: 50,
    y: 86,
    title: '知识画像',
    description: '把题目标签、知识点关系和作答表现转化为学生掌握度画像与薄弱点清单。',
    signal: 'Profile updated',
    metric: '36 个知识点',
  },
  {
    id: 'recommend',
    label: '智能推荐',
    icon: Document,
    x: 25,
    y: 76,
    title: '智能推荐',
    description: '结合薄弱知识点、学习资源和练习记录，为学生推荐复习资源和针对性练习。',
    signal: 'Recommend running',
    metric: '32 项推荐',
  },
  {
    id: 'practice',
    label: '个性练习',
    icon: DataAnalysis,
    x: 16,
    y: 50,
    title: '个性化练习',
    description: '根据推荐结果生成复习计划、错题巩固和知识点专项练习。',
    signal: 'Practice queue ready',
    metric: '3 项今日练习',
  },
  {
    id: 'improve',
    label: '教学改进',
    icon: Setting,
    x: 25,
    y: 24,
    title: '教学改进',
    description: '把班级薄弱点、错题分布、成绩复核和推荐完成情况反馈给教师，形成教学调整建议。',
    signal: '策略建议生成',
    metric: '3 条建议',
  },
]

const activeNode = computed(
  () => orchestrationNodes.find((node) => node.id === activeNodeId.value) || orchestrationNodes[3],
)

const streamFlows = [
  {
    id: 'targetFlow',
    label: '题目标签 → 知识点关系 → 学习行为',
    tone: 'cyan',
    path: 'M13,26 C30,16 44,25 55,35 S74,48 87,40',
    delay: '0s',
  },
  {
    id: 'abilityFlow',
    label: '作答记录 → 掌握度画像 → 智能推荐',
    tone: 'violet',
    path: 'M13,58 C30,45 45,57 58,68 S75,78 87,63',
    delay: '-1.8s',
  },
  {
    id: 'resourceFlow',
    label: '薄弱知识点 → 资源推荐 → 教学改进',
    tone: 'amber',
    path: 'M15,76 C34,84 46,72 58,56 S72,25 86,21',
    delay: '-3.2s',
  },
]

const activeRuntimeStats = [
  { label: '关联知识点', value: '18' },
  { label: '推荐资源', value: '8' },
  { label: '生成练习', value: '3' },
  { label: '掌握覆盖率', value: '92%' },
]

const orchestrationPipeline = ['题目标签', '知识点关系', '学习行为', '推荐任务']

const featureCards = [
  {
    key: 'path',
    title: '作业考试管理',
    icon: Reading,
    description: '教师发布作业考试，设置班级或学生范围，查看提交情况。',
    tags: ['测评发布', '提交跟踪', '班级范围'],
    metrics: [
      { label: '进行中', value: '6' },
      { label: '待批改', value: '12' },
      { label: '提交率', value: '92%' },
    ],
    steps: ['建题', '发布', '作答', '统计'],
    activeStep: 1,
  },
  {
    key: 'resource',
    title: '在线练习与作答记录',
    icon: Collection,
    description: '学生完成题库练习、作业和考试，系统记录作答过程与结果。',
    tags: ['在线作答', '错题记录', '过程留痕'],
    metrics: [
      { label: '练习记录', value: '1286' },
      { label: '错题归档', value: '214' },
      { label: '待提交', value: '18' },
      { label: '复核申请', value: '5' },
    ],
    resources: ['题库练习', '作业作答', '考试记录', '错题本', '成绩复核'],
  },
  {
    key: 'task',
    title: '学习统计与知识画像',
    icon: Document,
    description: '系统根据作答数据统计错题、掌握度和学习表现。',
    tags: ['错题统计', '掌握度画像', '阶段评价'],
    metrics: [
      { label: '薄弱知识点', value: '4' },
      { label: '待复习', value: '9' },
      { label: '高优先级', value: '2' },
    ],
    taskProgress: [
      { label: '作业完成率', value: 80 },
      { label: '知识掌握度', value: 65 },
      { label: '复核处理率', value: 40 },
    ],
  },
  {
    key: 'feedback',
    title: '智能推荐与个性化练习',
    icon: DataAnalysis,
    description: '结合薄弱知识点推荐学习资源和练习内容，生成针对性复习计划。',
    tags: ['资源推荐', '个性练习', '教学改进'],
    metrics: [
      { label: '推荐资源', value: '8' },
      { label: '练习生成', value: '3' },
      { label: '教学建议', value: '3' },
    ],
    radar: [
      { label: '知识薄弱点', value: 58 },
      { label: '练习完成率', value: 76 },
      { label: '掌握度画像', value: 68 },
      { label: '教学建议', value: 82 },
    ],
  },
]

const routeStages = [
  {
    level: 'Level 1',
    title: '题库标签',
    text: '题目、标签、知识点、学习资源配置',
    progress: 100,
    status: '已完成',
    state: 'done',
    keywords: '题库与知识点已配置',
  },
  {
    level: 'Level 2',
    title: '作业练习',
    text: '作业考试发布、在线练习、作答记录',
    progress: 72,
    status: '进行中',
    state: 'active',
    keywords: '作业考试与练习进行中',
    active: true,
  },
  {
    level: 'Level 3',
    title: '学习分析',
    text: '错题统计、掌握度画像、成绩复核',
    progress: 45,
    status: '待提升',
    state: 'next',
    keywords: '学习画像持续完善',
  },
  {
    level: 'Level 4',
    title: '推荐改进',
    text: '资源推荐、个性化练习、教学改进',
    progress: 18,
    status: '待提升',
    state: 'next',
    keywords: '推荐策略持续优化',
  },
]

const studentKpis = [
  { label: '当前阶段', value: '在线练习' },
  { label: '今日练习', value: '3' },
  { label: '推荐资源', value: '8' },
  { label: '薄弱知识点', value: '指针与内存模型' },
]

const studentTasks = [
  { status: '进行中', tone: 'cyan', title: '指针变量与地址访问' },
  { status: '待完成', tone: 'violet', title: '数组与指针综合练习' },
  { status: '推荐', tone: 'amber', title: '函数参数传递实验' },
]

const studentActions = ['继续练习', '查看资源', '开始复习']

const teacherKpis = [
  { label: '班级薄弱点', value: '指针与内存模型' },
  { label: '待复核申诉', value: '5' },
  { label: '作业完成率', value: '76%' },
  { label: '建议补充资源', value: '3' },
]

const teacherActions = ['发布作业', '查看统计', '处理复核']

const classStatus = [
  { label: '语法基础', value: 92, hint: '基础语法掌握稳定，可进入综合练习。' },
  { label: '指针内存', value: 58, hint: '错误集中在地址访问、指针运算和内存模型。' },
  { label: '模块设计', value: 71, hint: '函数拆分能力较好，多文件组织仍需强化。' },
  { label: '项目实践', value: 46, hint: '项目规范和调试记录完成度偏低。' },
]

function setActiveNode(nodeId) {
  activeNodeId.value = nodeId
}

function backHome() {
  sessionStorage.setItem('skipLandingIntro', '1')
  router.push({ name: 'login' })
}

function openCourseGoals() {
  router.push({ name: 'course-goals' })
}

function openCompetencyLayer() {
  sessionStorage.setItem('skipLandingIntro', '1')
  sessionStorage.setItem('openCompetencyLayer', '1')
  router.push({ name: 'login' })
}

function openKnowledgeMap() {
  router.push({ name: 'knowledge-map' })
}

function handleLogin(mode = 'login') {
  authDialogMode.value = typeof mode === 'string' && mode ? mode : 'login'
  authDialogVisible.value = true
}
</script>

<template>
  <main class="teaching-page">
    <div class="teaching-space-bg" aria-hidden="true">
      <span
        v-for="star in stars"
        :key="star.id"
        class="teaching-star"
        :style="{ left: star.left, top: star.top, width: star.size, height: star.size, opacity: star.opacity }"
      ></span>
    </div>

    <header class="landing-nav landing-nav--subpage teaching-nav">
      <button type="button" class="landing-brand" @click="backHome">
        <span class="landing-brand-mark">C</span>
        <span class="landing-brand-copy">
          <strong>C语言智能学习系统</strong>
        </span>
      </button>

      <nav class="landing-nav-items" aria-label="教学应用层导航">
        <button type="button" class="landing-nav-item" @click="backHome">
          <span>首页</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openCourseGoals">
          <span>课程目标层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openCompetencyLayer">
          <span>能力素养层</span>
        </button>
        <button type="button" class="landing-nav-item" @click="openKnowledgeMap">
          <span>学科知识层</span>
        </button>
        <button type="button" class="landing-nav-item active">
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

    <section class="teaching-hero">
      <div>
        <p>AI TEACHING ORCHESTRATION DASHBOARD</p>
        <h1>教学应用层</h1>
        <strong>作业考试、在线练习与智能推荐</strong>
        <span>
          围绕教师发布的作业考试、学生在线练习记录、知识点掌握情况和学习资源，为学生提供个性化练习与资源推荐，为教师提供学习统计、阶段评价、复核处理和教学改进依据。
        </span>
      </div>

      <div class="teaching-stat-strip" aria-label="教学应用层统计">
        <article v-for="stat in stats" :key="stat.label" :class="`tone-${stat.tone}`">
          <strong>{{ stat.value }}</strong>
          <span>{{ stat.label }}</span>
        </article>
      </div>
    </section>

    <section class="teaching-dashboard">
      <article class="teaching-panel teaching-orchestration-panel">
        <div class="teaching-section-head">
          <div>
            <p>AI TEACHING ORCHESTRATION</p>
            <h2>智能教学编排引擎</h2>
          </div>
          <span class="engine-state">ENGINE ACTIVE · {{ activeNode.signal }}</span>
        </div>

        <div class="orchestration-layout">
          <div class="teaching-loop-visual" aria-label="智能教学编排闭环">
            <svg class="loop-path" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <filter id="loopGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="loopStroke" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stop-color="#22d3ee" />
                  <stop offset="54%" stop-color="#8b5cf6" />
                  <stop offset="100%" stop-color="#fb923c" />
                </linearGradient>
              </defs>
              <path
                id="engineOrbitPath"
                d="M50,14 L75,24 L84,50 L75,76 L50,86 L25,76 L16,50 L25,24 Z"
                class="loop-polyline"
              />
              <circle class="orbit-particle orbit-particle-cyan" r="1.15">
                <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#engineOrbitPath" />
                </animateMotion>
              </circle>
              <circle class="orbit-particle orbit-particle-violet" r="1">
                <animateMotion dur="9s" begin="-3s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#engineOrbitPath" />
                </animateMotion>
              </circle>
              <circle class="orbit-particle orbit-particle-amber" r="0.9">
                <animateMotion dur="9s" begin="-6s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#engineOrbitPath" />
                </animateMotion>
              </circle>
            </svg>

            <svg class="data-flow-layer" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <filter id="streamGlow" x="-45%" y="-45%" width="190%" height="190%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g v-for="flow in streamFlows" :key="flow.id" :class="['stream-group', `stream-${flow.tone}`]">
                <path :id="flow.id" :d="flow.path" class="stream-path" :style="{ animationDelay: flow.delay }" />
                <circle class="stream-dot" r="1.2" :style="{ animationDelay: flow.delay }">
                  <animateMotion dur="7.5s" :begin="flow.delay" repeatCount="indefinite">
                    <mpath :href="`#${flow.id}`" />
                  </animateMotion>
                </circle>
              </g>
            </svg>

            <div class="loop-ring" aria-hidden="true"></div>
            <div class="loop-core">
              <el-icon><Cpu /></el-icon>
              <strong>智能教学编排引擎</strong>
              <span>{{ activeNode.title }} · {{ activeNode.metric }}</span>
            </div>

            <button
              v-for="node in orchestrationNodes"
              :key="node.id"
              type="button"
              :class="['loop-node', { active: node.id === activeNodeId }]"
              :style="{ left: `${node.x}%`, top: `${node.y}%` }"
              @mouseenter="setActiveNode(node.id)"
              @focus="setActiveNode(node.id)"
              @click="setActiveNode(node.id)"
            >
              <el-icon><component :is="node.icon" /></el-icon>
              <span>{{ node.label }}</span>
            </button>
          </div>

          <aside class="engine-insight-panel">
            <p>ACTIVE NODE</p>
            <h3>{{ activeNode.title }}</h3>
            <strong>{{ activeNode.metric }}</strong>
            <span>{{ activeNode.description }}</span>
            <div class="active-runtime-grid">
              <article v-for="item in activeRuntimeStats" :key="item.label">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </article>
            </div>
            <div class="pipeline-list" aria-label="实时编排流程">
              <span v-for="(item, index) in orchestrationPipeline" :key="item">
                {{ item }}
                <i v-if="index < orchestrationPipeline.length - 1">→</i>
              </span>
            </div>
            <div class="stream-legend">
              <div v-for="flow in streamFlows" :key="flow.id" :class="`legend-${flow.tone}`">
                <i></i>
                <span>{{ flow.label }}</span>
              </div>
            </div>
          </aside>
        </div>
      </article>

      <section class="teaching-module-grid" aria-label="教学应用模块">
        <article v-for="item in featureCards" :key="item.key" class="teaching-feature-card">
          <div class="feature-head">
            <div class="feature-icon">
              <el-icon><component :is="item.icon" /></el-icon>
            </div>
            <span v-if="item.key === 'resource'" class="feature-badge">记录池 1286</span>
          </div>

          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <div class="feature-metric-grid">
            <article v-for="metric in item.metrics" :key="metric.label">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </article>
          </div>

          <div v-if="item.key === 'path'" class="mini-path-visual" aria-label="迷你学习路径">
            <span v-for="(step, index) in item.steps" :key="step" :class="{ active: index === item.activeStep }">
              {{ step }}
            </span>
          </div>

          <div v-else-if="item.key === 'resource'" class="resource-stack" aria-label="资源堆叠">
            <span v-for="(resource, index) in item.resources" :key="resource" :style="{ '--stack-index': index }">
              {{ resource }}
            </span>
          </div>

          <div v-else-if="item.key === 'task'" class="task-bars" aria-label="任务编排进度">
            <div v-for="task in item.taskProgress" :key="task.label" class="task-bar-row">
              <div>
                <span>{{ task.label }}</span>
                <strong>{{ task.value }}%</strong>
              </div>
              <i :style="{ '--value': `${task.value}%` }"></i>
            </div>
          </div>

          <div v-else class="feedback-visual" aria-label="反馈分析结果">
            <svg viewBox="0 0 120 88" role="img" aria-label="反馈分析趋势">
              <polygon points="60,8 104,32 96,76 24,76 16,32" class="radar-grid" />
              <polygon points="60,20 86,36 82,64 38,66 32,38" class="radar-fill" />
              <polyline points="16,70 40,54 62,59 82,36 104,44" class="trend-line" />
              <circle cx="82" cy="36" r="3" class="trend-point" />
            </svg>
            <div>
              <span v-for="radar in item.radar" :key="radar.label">
                {{ radar.label }} <strong>{{ radar.value }}%</strong>
              </span>
            </div>
          </div>

          <div class="feature-tags">
            <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
          </div>
        </article>
      </section>

      <article class="teaching-panel teaching-route-panel">
        <div class="teaching-section-head">
          <div>
            <p>LEARNING IMPLEMENTATION ROUTE</p>
            <h2>教学实施路径</h2>
          </div>
          <span class="engine-state">CURRENT · Level 2 作业练习</span>
        </div>

        <div class="implementation-route">
          <article
            v-for="stage in routeStages"
            :key="stage.level"
            :class="['route-stage', `state-${stage.state}`, { active: stage.active }]"
            :title="stage.keywords"
          >
            <div class="route-stage-top">
              <span>{{ stage.level }}</span>
              <b>{{ stage.status }}</b>
            </div>
            <h3>{{ stage.title }}</h3>
            <p>{{ stage.text }}</p>
            <strong>{{ stage.progress }}%</strong>
            <i class="route-progress" :style="{ '--value': `${stage.progress}%` }"></i>
            <em>{{ stage.keywords }}</em>
          </article>
        </div>
      </article>

      <section class="teaching-perspective-grid">
        <article class="teaching-panel perspective-panel">
          <div class="perspective-title">
            <el-icon><Reading /></el-icon>
            <div>
              <p>STUDENT WORKSPACE</p>
              <h2>学生学习端</h2>
            </div>
          </div>
          <p class="perspective-copy">围绕个人学习状态，获得路径、资源、任务和反馈。</p>

          <div class="workspace-kpis">
            <article v-for="item in studentKpis" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>

          <div class="notice-card student-notice">
            <strong>今日推荐任务</strong>
            <button v-for="task in studentTasks" :key="task.title" type="button" :class="`task-chip tone-${task.tone}`">
              <span>{{ task.status }}</span>
              <em>{{ task.title }}</em>
            </button>
          </div>
          <div class="workspace-actions">
            <button v-for="action in studentActions" :key="action" type="button">{{ action }}</button>
          </div>
        </article>

        <article class="teaching-panel perspective-panel">
          <div class="perspective-title">
            <el-icon><Management /></el-icon>
            <div>
              <p>TEACHER WORKSPACE</p>
              <h2>教师教学端</h2>
            </div>
          </div>
          <p class="perspective-copy">基于班级学习数据，辅助教师进行资源组织、任务发布和教学调整。</p>

          <div class="workspace-kpis teacher-kpis">
            <article v-for="item in teacherKpis" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>

          <div class="teacher-status-panel">
            <div v-for="item in classStatus" :key="item.label" class="class-status-row" :title="item.hint">
              <div>
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}%</strong>
              </div>
              <i :style="{ '--value': `${item.value}%` }"></i>
            </div>
          </div>

          <div class="notice-card teacher-notice">
            <strong>教学提醒</strong>
            <p>当前班级在「指针与内存模型」模块错误率较高，建议增加代码跟踪演示与调试训练。</p>
          </div>
          <div class="workspace-actions">
            <button v-for="action in teacherActions" :key="action" type="button">{{ action }}</button>
          </div>
        </article>
      </section>
    </section>

    <AuthDialog v-model:visible="authDialogVisible" v-model:mode="authDialogMode" />
  </main>
</template>

<style scoped>
.teaching-page {
  position: relative;
  min-height: 100dvh;
  overflow-x: clip;
  color: #e5f7ff;
  background:
    radial-gradient(circle at 50% 18%, rgba(34, 211, 238, 0.18), transparent 26%),
    radial-gradient(circle at 84% 22%, rgba(139, 92, 246, 0.16), transparent 24%),
    radial-gradient(circle at 18% 76%, rgba(251, 146, 60, 0.09), transparent 24%),
    linear-gradient(135deg, #020617 0%, #07132b 48%, #030712 100%);
  font-family: Inter, 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.teaching-page::before,
.teaching-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.teaching-page::before {
  background:
    linear-gradient(90deg, rgba(125, 211, 252, 0.07) 1px, transparent 1px),
    linear-gradient(180deg, rgba(125, 211, 252, 0.055) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}

.teaching-page::after {
  background:
    radial-gradient(circle at 36% 34%, rgba(34, 211, 238, 0.1), transparent 18%),
    radial-gradient(circle at 70% 70%, rgba(167, 139, 250, 0.09), transparent 22%);
}

.teaching-space-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.teaching-star {
  position: absolute;
  border-radius: 50%;
  background: rgba(226, 242, 255, 0.86);
  box-shadow: 0 0 10px rgba(125, 211, 252, 0.72);
}

.teaching-hero,
.teaching-dashboard {
  position: relative;
  z-index: 1;
  width: min(calc(100vw - clamp(28px, 5vw, 96px)), 1840px);
  margin: 0 auto;
}

.teaching-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.68fr);
  gap: 24px;
  align-items: end;
  padding: clamp(96px, 11vh, 126px) 0 18px;
}

.teaching-hero p,
.teaching-section-head p,
.perspective-title p,
.engine-insight-panel p {
  margin: 0;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.teaching-hero h1 {
  margin: 8px 0 0;
  color: #fff;
  font-size: clamp(36px, 5vw, 72px);
  line-height: 1.05;
  letter-spacing: 0;
  text-shadow: 0 0 30px rgba(34, 211, 238, 0.24);
}

.teaching-hero > div:first-child > strong {
  display: block;
  margin-top: 10px;
  color: #dff8ff;
  font-size: clamp(18px, 1.5vw, 26px);
  line-height: 1.35;
}

.teaching-hero > div:first-child > span {
  display: block;
  max-width: 760px;
  margin-top: 16px;
  color: rgba(226, 242, 255, 0.72);
  font-size: clamp(15px, 1.1vw, 18px);
  line-height: 1.8;
}

.teaching-stat-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.teaching-stat-strip article,
.teaching-panel,
.teaching-feature-card {
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(9, 20, 48, 0.78), rgba(8, 16, 36, 0.58)),
    rgba(8, 16, 36, 0.52);
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    inset 0 0 32px rgba(34, 211, 238, 0.035);
  backdrop-filter: blur(18px);
}

.teaching-stat-strip article {
  min-height: 92px;
  padding: 14px;
}

.teaching-stat-strip strong,
.teaching-stat-strip span {
  display: block;
}

.teaching-stat-strip strong,
.route-stage > strong,
.workspace-kpis strong,
.engine-insight-panel > strong {
  color: #fff;
  background: linear-gradient(90deg, #fff, #67e8f9 42%, #a78bfa);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: Consolas, 'JetBrains Mono', monospace;
}

.teaching-stat-strip strong {
  font-size: clamp(26px, 2vw, 36px);
}

.teaching-stat-strip span {
  margin-top: 6px;
  color: rgba(226, 242, 255, 0.7);
  font-size: 12px;
}

.teaching-stat-strip .tone-cyan {
  box-shadow: inset 0 3px 0 #22d3ee;
}

.teaching-stat-strip .tone-violet {
  box-shadow: inset 0 3px 0 #a78bfa;
}

.teaching-stat-strip .tone-amber {
  box-shadow: inset 0 3px 0 #fb923c;
}

.teaching-stat-strip .tone-emerald {
  box-shadow: inset 0 3px 0 #34d399;
}

.teaching-dashboard {
  display: grid;
  gap: 18px;
  padding: 0 0 clamp(36px, 5vh, 72px);
}

.teaching-panel {
  min-width: 0;
  padding: clamp(18px, 1.6vw, 28px);
}

.teaching-section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.teaching-section-head h2,
.perspective-title h2 {
  margin: 6px 0 0;
  color: #fff;
  font-size: clamp(22px, 1.7vw, 32px);
  line-height: 1.2;
}

.engine-state {
  flex: 0 0 auto;
  padding: 8px 12px;
  color: #9fe8ff;
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 12px;
  border: 1px solid rgba(34, 211, 238, 0.24);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.08);
  box-shadow: 0 0 22px rgba(34, 211, 238, 0.1);
}

.orchestration-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.42fr);
  gap: 16px;
  align-items: stretch;
}

.teaching-loop-visual {
  position: relative;
  display: grid;
  min-height: clamp(460px, 35vw, 610px);
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(125, 211, 252, 0.12);
  border-radius: 8px;
  background:
    radial-gradient(circle at 50% 50%, rgba(34, 211, 238, 0.14), transparent 28%),
    radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.1), transparent 48%),
    rgba(2, 16, 39, 0.42);
}

.loop-path,
.data-flow-layer {
  position: absolute;
  inset: clamp(36px, 5vw, 82px);
  width: auto;
  height: auto;
  overflow: visible;
}

.data-flow-layer {
  inset: 13%;
  opacity: 0.52;
}

.loop-polyline {
  fill: none;
  stroke: url('#loopStroke');
  stroke-width: 0.9;
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-dasharray: 8 5;
  animation: flowDash 14s linear infinite;
  filter: url('#loopGlow');
  opacity: 0.78;
}

.orbit-particle,
.stream-dot {
  filter: drop-shadow(0 0 5px currentColor);
}

.orbit-particle-cyan {
  color: #22d3ee;
  fill: #22d3ee;
}

.orbit-particle-violet {
  color: #a78bfa;
  fill: #a78bfa;
}

.orbit-particle-amber {
  color: #fb923c;
  fill: #fb923c;
}

.stream-path {
  fill: none;
  stroke-width: 0.62;
  stroke-linecap: round;
  stroke-dasharray: 8 9;
  animation: flowDash 10s linear infinite;
  filter: url('#streamGlow');
}

.stream-cyan .stream-path,
.stream-cyan .stream-dot {
  stroke: rgba(34, 211, 238, 0.7);
  fill: #22d3ee;
  color: #22d3ee;
}

.stream-violet .stream-path,
.stream-violet .stream-dot {
  stroke: rgba(167, 139, 250, 0.72);
  fill: #a78bfa;
  color: #a78bfa;
}

.stream-amber .stream-path,
.stream-amber .stream-dot {
  stroke: rgba(251, 146, 60, 0.72);
  fill: #fb923c;
  color: #fb923c;
}

.loop-ring {
  position: absolute;
  width: min(40%, 340px);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(2, 16, 39, 0.9) 0 52%, transparent 53%),
    conic-gradient(from 20deg, #22d3ee, #8b5cf6, #fb923c, #22d3ee);
  animation: rotateSlow 28s linear infinite, pulseGlow 4.8s ease-in-out infinite;
  box-shadow:
    0 0 50px rgba(34, 211, 238, 0.16),
    inset 0 0 42px rgba(139, 92, 246, 0.16);
}

.loop-ring::before,
.loop-ring::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(125, 211, 252, 0.22);
}

.loop-ring::before {
  inset: 12%;
}

.loop-ring::after {
  inset: -12%;
  border-color: rgba(167, 139, 250, 0.18);
  box-shadow: 0 0 42px rgba(139, 92, 246, 0.14);
}

.loop-core {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(31%, 280px);
  min-width: 220px;
  min-height: 138px;
  place-items: center;
  align-content: center;
  gap: 10px;
  padding: 22px;
  text-align: center;
  border: 1px solid rgba(125, 211, 252, 0.28);
  border-radius: 8px;
  background: rgba(3, 18, 42, 0.86);
  box-shadow: 0 0 46px rgba(34, 211, 238, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.loop-core .el-icon {
  color: #67e8f9;
  font-size: 30px;
}

.loop-core strong {
  color: #fff;
  font-size: clamp(21px, 1.5vw, 28px);
}

.loop-core span {
  color: rgba(226, 242, 255, 0.72);
  font-size: 14px;
}

.loop-node {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: clamp(112px, 8.4vw, 142px);
  min-height: 42px;
  padding: 8px 12px;
  color: #e5f7ff;
  border: 1px solid rgba(125, 211, 252, 0.25);
  border-radius: 999px;
  background: rgba(5, 20, 46, 0.86);
  box-shadow: 0 0 28px rgba(34, 211, 238, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.loop-node:hover,
.loop-node:focus-visible,
.loop-node.active {
  outline: none;
  border-color: rgba(34, 211, 238, 0.72);
  background: rgba(14, 116, 144, 0.32);
  box-shadow: 0 0 34px rgba(34, 211, 238, 0.28), inset 0 0 24px rgba(34, 211, 238, 0.08);
  transform: translate(-50%, -50%) scale(1.04);
}

.loop-node .el-icon {
  color: #67e8f9;
  flex: 0 0 auto;
}

.loop-node span {
  font-size: clamp(13px, 0.86vw, 15px);
  font-weight: 800;
  white-space: nowrap;
}

.engine-insight-panel {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 22px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background: rgba(2, 16, 39, 0.54);
  box-shadow: inset 0 0 30px rgba(34, 211, 238, 0.04);
}

.engine-insight-panel h3 {
  margin: 0;
  color: #fff;
  font-size: clamp(24px, 1.7vw, 32px);
}

.engine-insight-panel > strong {
  font-size: 24px;
}

.engine-insight-panel > span {
  color: rgba(226, 242, 255, 0.74);
  line-height: 1.75;
}

.active-runtime-grid,
.feature-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.active-runtime-grid article,
.feature-metric-grid article {
  display: grid;
  gap: 5px;
  min-height: 58px;
  padding: 10px;
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
}

.active-runtime-grid span,
.feature-metric-grid span {
  color: rgba(226, 242, 255, 0.58);
  font-size: 12px;
}

.active-runtime-grid strong,
.feature-metric-grid strong {
  color: #9fe8ff;
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 18px;
}

.pipeline-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-radius: 8px;
  background: rgba(34, 211, 238, 0.055);
}

.pipeline-list span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(226, 242, 255, 0.76);
  font-size: 13px;
}

.pipeline-list i {
  color: #67e8f9;
  font-style: normal;
}

.stream-legend {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.stream-legend div {
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgba(226, 242, 255, 0.74);
  font-size: 13px;
}

.stream-legend i {
  width: 24px;
  height: 2px;
  border-radius: 999px;
  box-shadow: 0 0 12px currentColor;
}

.legend-cyan i {
  color: #22d3ee;
  background: #22d3ee;
}

.legend-violet i {
  color: #a78bfa;
  background: #a78bfa;
}

.legend-amber i {
  color: #fb923c;
  background: #fb923c;
}

.teaching-module-grid,
.teaching-perspective-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.teaching-feature-card {
  display: grid;
  min-height: 348px;
  gap: 12px;
  padding: clamp(20px, 1.8vw, 30px);
  overflow: hidden;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.teaching-feature-card:hover,
.perspective-panel:hover,
.route-stage:hover {
  transform: translateY(-3px);
  border-color: rgba(34, 211, 238, 0.42);
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.3), 0 0 44px rgba(34, 211, 238, 0.12);
}

.feature-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.feature-icon,
.perspective-title > .el-icon {
  display: inline-grid;
  width: 52px;
  height: 52px;
  place-items: center;
  color: #061126;
  border-radius: 8px;
  background: linear-gradient(135deg, #67e8f9, #a78bfa);
  box-shadow: 0 0 28px rgba(34, 211, 238, 0.2);
}

.feature-icon .el-icon,
.perspective-title > .el-icon {
  font-size: 24px;
}

.feature-badge {
  padding: 7px 10px;
  color: #9fe8ff;
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 12px;
  border: 1px solid rgba(125, 211, 252, 0.24);
  border-radius: 999px;
  background: rgba(34, 211, 238, 0.08);
}

.teaching-feature-card h3,
.route-stage h3 {
  margin: 0;
  color: #fff;
  font-size: clamp(20px, 1.35vw, 26px);
}

.teaching-feature-card p,
.route-stage p,
.perspective-copy,
.notice-card p {
  margin: 0;
  color: rgba(226, 242, 255, 0.72);
  line-height: 1.75;
}

.mini-path-visual {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 22px 0 8px;
}

.mini-path-visual::before {
  content: '';
  position: absolute;
  top: 40px;
  left: 7%;
  right: 7%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #22d3ee, #a78bfa, transparent);
  background-size: 180% 100%;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.32);
}

.teaching-feature-card:hover .mini-path-visual::before {
  animation: shimmer 1.8s linear infinite;
}

.mini-path-visual span {
  position: relative;
  display: grid;
  min-height: 62px;
  place-items: end center;
  color: rgba(226, 242, 255, 0.72);
  font-size: 12px;
  text-align: center;
}

.mini-path-visual span::before {
  content: '';
  position: absolute;
  top: 9px;
  width: 18px;
  height: 18px;
  border: 4px solid rgba(2, 16, 39, 0.95);
  border-radius: 50%;
  background: rgba(125, 211, 252, 0.55);
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.32);
}

.mini-path-visual span.active {
  color: #fff;
  font-weight: 900;
}

.mini-path-visual span.active::before {
  background: #fb923c;
  box-shadow: 0 0 20px rgba(251, 146, 60, 0.68);
}

.resource-stack {
  position: relative;
  min-height: 126px;
}

.resource-stack span {
  position: absolute;
  left: calc(var(--stack-index) * 8%);
  top: calc(var(--stack-index) * 10px);
  display: inline-flex;
  min-width: 132px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: #e5f7ff;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.2), 0 0 20px rgba(34, 211, 238, 0.08);
  animation: floatCard 4.8s ease-in-out infinite;
  animation-delay: calc(var(--stack-index) * -0.45s);
}

.task-bars,
.teacher-status-panel {
  display: grid;
  gap: 12px;
}

.task-bar-row,
.class-status-row {
  display: grid;
  gap: 8px;
}

.task-bar-row div,
.class-status-row div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(226, 242, 255, 0.78);
  font-size: 13px;
}

.task-bar-row strong,
.class-status-row strong {
  color: #9fe8ff;
  font-family: Consolas, 'JetBrains Mono', monospace;
}

.task-bar-row i,
.class-status-row i,
.route-progress {
  position: relative;
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.task-bar-row i::before,
.class-status-row i::before,
.route-progress::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--value);
  border-radius: inherit;
  background: linear-gradient(90deg, #22d3ee, #8b5cf6, #fb923c);
  background-size: 180% 100%;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.34);
}

.teaching-feature-card:hover .task-bar-row i::before,
.class-status-row:hover i::before,
.route-stage:hover .route-progress::before {
  animation: shimmer 1.7s linear infinite;
}

.feedback-visual {
  display: grid;
  grid-template-columns: minmax(120px, 0.6fr) minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}

.feedback-visual svg {
  width: 100%;
  min-height: 110px;
  filter: drop-shadow(0 0 14px rgba(34, 211, 238, 0.16));
}

.radar-grid {
  fill: rgba(34, 211, 238, 0.04);
  stroke: rgba(125, 211, 252, 0.26);
  stroke-width: 1;
}

.radar-fill {
  fill: rgba(139, 92, 246, 0.2);
  stroke: rgba(167, 139, 250, 0.75);
  stroke-width: 1.2;
}

.trend-line {
  fill: none;
  stroke: #22d3ee;
  stroke-width: 2;
  stroke-linecap: round;
}

.trend-point {
  fill: #fb923c;
  filter: drop-shadow(0 0 6px rgba(251, 146, 60, 0.75));
}

.feedback-visual div {
  display: grid;
  gap: 8px;
}

.feedback-visual span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: rgba(226, 242, 255, 0.74);
  font-size: 13px;
}

.feedback-visual strong {
  color: #9fe8ff;
  font-family: Consolas, 'JetBrains Mono', monospace;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-self: end;
}

.feature-tags span {
  padding: 7px 10px;
  color: #dff8ff;
  font-size: 12px;
  border: 1px solid rgba(125, 211, 252, 0.22);
  border-radius: 999px;
  background: rgba(36, 146, 255, 0.1);
}

.implementation-route {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  padding-top: 28px;
}

.implementation-route::before {
  content: '';
  position: absolute;
  top: 52px;
  left: 8%;
  right: 8%;
  height: 3px;
  border-radius: 999px;
  background:
    linear-gradient(90deg, #22d3ee 0 27%, #fb923c 27% 48%, rgba(125, 211, 252, 0.18) 48% 100%);
  background-size: 180% 100%;
  box-shadow: 0 0 22px rgba(34, 211, 238, 0.28);
  animation: shimmer 4s linear infinite;
}

.route-stage {
  position: relative;
  display: grid;
  gap: 10px;
  min-height: 214px;
  padding: 48px 18px 18px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.route-stage::before {
  content: '';
  position: absolute;
  top: 15px;
  left: 22px;
  width: 20px;
  height: 20px;
  border: 4px solid rgba(2, 16, 39, 0.95);
  border-radius: 50%;
  background: #67e8f9;
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.65);
}

.route-stage-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.route-stage.active {
  border-color: rgba(251, 146, 60, 0.46);
  background:
    radial-gradient(circle at 88% 16%, rgba(251, 146, 60, 0.18), transparent 30%),
    linear-gradient(180deg, rgba(251, 146, 60, 0.1), rgba(255, 255, 255, 0.045));
  box-shadow: 0 0 46px rgba(251, 146, 60, 0.12), inset 0 0 24px rgba(251, 146, 60, 0.06);
}

.route-stage.active::before {
  background: #fb923c;
  box-shadow: 0 0 22px rgba(251, 146, 60, 0.72);
}

.route-stage-top span {
  color: #67e8f9;
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.route-stage-top b {
  flex: 0 0 auto;
  padding: 5px 8px;
  color: rgba(226, 242, 255, 0.72);
  font-size: 12px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
}

.route-stage.state-done .route-stage-top b {
  color: #86efac;
  border-color: rgba(52, 211, 153, 0.26);
}

.route-stage.state-active .route-stage-top b {
  color: #fdba74;
  border-color: rgba(251, 146, 60, 0.34);
}

.route-stage.state-next .route-stage-top b {
  color: rgba(226, 242, 255, 0.6);
}

.route-stage > strong {
  font-size: 24px;
}

.route-stage em {
  color: rgba(226, 242, 255, 0.62);
  font-size: 12px;
  font-style: normal;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.route-stage:hover em,
.route-stage.active em {
  opacity: 1;
  transform: translateY(0);
}

.perspective-panel {
  display: grid;
  gap: 18px;
  align-content: start;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.perspective-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.workspace-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.workspace-kpis article {
  display: grid;
  min-height: 86px;
  gap: 8px;
  align-content: center;
  padding: 14px;
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
}

.workspace-kpis span {
  color: rgba(226, 242, 255, 0.62);
  font-size: 12px;
}

.workspace-kpis strong {
  font-size: clamp(18px, 1.3vw, 24px);
}

.notice-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.notice-card > strong {
  color: #fff;
  font-size: 18px;
}

.workspace-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.workspace-actions button {
  min-height: 38px;
  padding: 0 14px;
  color: #e5f7ff;
  font-weight: 800;
  border: 1px solid rgba(125, 211, 252, 0.2);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.14), rgba(139, 92, 246, 0.1)),
    rgba(255, 255, 255, 0.045);
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.08);
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.workspace-actions button:hover,
.workspace-actions button:focus-visible {
  outline: none;
  transform: translateY(-1px);
  border-color: rgba(34, 211, 238, 0.48);
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.22), rgba(139, 92, 246, 0.14)),
    rgba(255, 255, 255, 0.055);
  box-shadow: 0 0 26px rgba(34, 211, 238, 0.16);
}

.task-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 12px;
  color: #e5f7ff;
  text-align: left;
  border: 1px solid rgba(125, 211, 252, 0.14);
  border-radius: 8px;
  background: rgba(2, 16, 39, 0.48);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.task-chip:hover {
  transform: translateX(3px);
  border-color: rgba(34, 211, 238, 0.42);
  background: rgba(34, 211, 238, 0.08);
}

.task-chip span {
  flex: 0 0 auto;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}

.task-chip em {
  font-style: normal;
}

.task-chip.tone-cyan span {
  color: #67e8f9;
}

.task-chip.tone-violet span {
  color: #c4b5fd;
}

.task-chip.tone-amber span {
  color: #fdba74;
}

.student-notice {
  box-shadow: inset 3px 0 0 #22d3ee;
}

.teacher-notice {
  box-shadow: inset 3px 0 0 #fb923c;
}

@keyframes pulseGlow {
  0%,
  100% {
    filter: brightness(1);
    opacity: 0.86;
  }
  50% {
    filter: brightness(1.18);
    opacity: 1;
  }
}

@keyframes rotateSlow {
  to {
    transform: rotate(360deg);
  }
}

@keyframes flowDash {
  to {
    stroke-dashoffset: -96;
  }
}

@keyframes floatCard {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

@keyframes shimmer {
  to {
    background-position: -180% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
}

@media (max-width: 1180px) {
  .teaching-hero,
  .orchestration-layout {
    grid-template-columns: 1fr;
  }

  .teaching-stat-strip,
  .workspace-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .teaching-loop-visual {
    min-height: clamp(520px, 58vw, 660px);
  }

  .implementation-route {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .implementation-route::before {
    display: none;
  }
}

@media (max-width: 860px) {
  .teaching-hero,
  .teaching-dashboard {
    width: min(calc(100vw - 28px), 720px);
  }

  .teaching-hero {
    padding-top: 112px;
  }

  .teaching-module-grid,
  .teaching-perspective-grid {
    grid-template-columns: 1fr;
  }

  .teaching-loop-visual {
    min-height: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 18px;
  }

  .loop-path,
  .loop-ring,
  .data-flow-layer {
    display: none;
  }

  .loop-core,
  .loop-node {
    position: relative;
    left: auto !important;
    top: auto !important;
    width: auto;
    min-width: 0;
    transform: none;
  }

  .loop-node:hover,
  .loop-node:focus-visible,
  .loop-node.active {
    transform: none;
  }

  .loop-core {
    grid-column: 1 / -1;
    width: 100%;
    min-height: 126px;
  }

  .loop-node {
    border-radius: 8px;
  }
}

@media (max-width: 560px) {
  .teaching-stat-strip,
  .implementation-route,
  .teaching-loop-visual,
  .workspace-kpis,
  .feedback-visual {
    grid-template-columns: 1fr;
  }

  .teaching-section-head {
    align-items: start;
    flex-direction: column;
  }

  .engine-state {
    width: 100%;
  }

  .resource-stack {
    min-height: 190px;
  }

  .resource-stack span {
    left: 0;
    right: auto;
    min-width: 180px;
  }
}
</style>
