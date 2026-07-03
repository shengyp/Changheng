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

<style scoped src="@/styles/teaching-application-page.css"></style>
