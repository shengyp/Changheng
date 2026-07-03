<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  CollectionTag,
  DataAnalysis,
  Document,
  Reading,
  Refresh,
  TrendCharts,
} from '@element-plus/icons-vue'
import { learningApi } from '@/api/services'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const historyLoading = ref(false)
const exportingWord = ref(false)
const recommendation = ref(null)
const snapshotHistory = ref([])
const selectedNodeId = ref('')
const PATH_CACHE_KEY = 'learning-path-recommendation-cache'

const filters = reactive({
  stage: 'month',
  goal: 'improve_weakness',
  days: 14,
})

const stageOptions = [
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本学期', value: 'term' },
]

const goalOptions = [
  { label: '补弱路径', value: 'improve_weakness' },
  { label: '考前冲刺', value: 'exam_sprint' },
  { label: '迁移提升', value: 'transfer' },
]

const reportMode = computed(() => route.query.report === '1')
const snapshotId = computed(() => {
  const value = route.query.snapshotId
  return value ? Number(value) : null
})
const autoPrint = computed(() => route.query.autoprint === '1')

const phases = computed(() => recommendation.value?.phases || [])
const resources = computed(() => recommendation.value?.resources || [])
const evidence = computed(() => recommendation.value?.evidence || {})
const diagnosis = computed(() => recommendation.value?.diagnosis || {})
const strategy = computed(() => recommendation.value?.strategy || {})
const llmAdvice = computed(() => recommendation.value?.llmAdvice || {})
const reportMeta = computed(() => recommendation.value?.reportMeta || {})
const flatNodes = computed(() => phases.value.flatMap((phase) => (phase.nodes || []).map((node) => ({ ...node, phase }))))
const selectedNode = computed(() => flatNodes.value.find((node) => nodeKey(node) === selectedNodeId.value) || flatNodes.value[0] || null)

const summaryCards = computed(() => {
  const summary = recommendation.value?.summary || {}
  return [
    { label: '路径类型', value: summary.pathTypeLabel || '学习路径', icon: CollectionTag },
    { label: '目标周期', value: summary.cycleLabel || `${filters.days}天`, icon: Reading },
    { label: '主要问题', value: summary.primaryProblem || '待生成', icon: DataAnalysis },
    { label: '建议优先级', value: summary.priorityLabel || '待分析', icon: TrendCharts },
  ]
})

function normalizeRecommendation(data = {}) {
  return {
    snapshotId: data.snapshotId || data.reportMeta?.snapshotId || null,
    stage: data.stage || filters.stage,
    goal: data.goal || filters.goal,
    days: Number(data.days || filters.days),
    updatedAt: data.updatedAt || '',
    summary: data.summary || {},
    basis: data.basis || {},
    evidence: data.evidence || {},
    diagnosis: data.diagnosis || {},
    strategy: data.strategy || {},
    llmAdvice: data.llmAdvice || {},
    phases: Array.isArray(data.phases) ? data.phases : [],
    resources: Array.isArray(data.resources) ? data.resources : [],
    reportMeta: data.reportMeta || {},
  }
}

function nodeKey(node) {
  return `${node?.phase?.key || 'phase'}-${node?.knowledgePointId || node?.title || 'node'}`
}

function selectNode(node) {
  selectedNodeId.value = nodeKey(node)
}

function masteryPercent(value) {
  const number = Number(value || 0)
  return Math.round(number <= 1 ? number * 100 : number)
}

function resourceTypeText(type) {
  if (type === 'video') return '视频'
  if (type === 'exercise') return '练习'
  if (type === 'courseware') return '课件'
  return '资料'
}

function isVideoResource(row = {}) {
  return ['video', 'animated_explainer'].includes(String(row.resourceType || '').toLowerCase())
}

function isSearchVideoUrl(url = '') {
  const value = String(url || '').trim().toLowerCase()
  return value.includes('search.bilibili.com') || value.includes('youtube.com/results')
}

function isConcreteVideoUrl(url = '') {
  const value = String(url || '').trim()
  if (!value || isSearchVideoUrl(value)) return false
  return /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV|av)[A-Za-z0-9]+/i.test(value)
    || /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[A-Za-z0-9_-]+/i.test(value)
    || /^https?:\/\/youtu\.be\/[A-Za-z0-9_-]+/i.test(value)
}

function canOpenResource(row = {}) {
  if (!row.url) return false
  return !isVideoResource(row) || isConcreteVideoUrl(row.url)
}

async function loadRecommendation() {
  loading.value = true
  try {
    if (snapshotId.value) {
      const data = await learningApi.pathRecommendationSnapshot(snapshotId.value)
      recommendation.value = normalizeRecommendation(data)
      syncFiltersFromRecommendation()
    } else {
      syncFiltersFromQuery()
      const data = await learningApi.pathRecommendation({
        stage: filters.stage,
        goal: filters.goal,
        days: filters.days,
      })
      recommendation.value = normalizeRecommendation(data)
    }
    persistRecommendation()
    selectedNodeId.value = flatNodes.value[0] ? nodeKey(flatNodes.value[0]) : ''
    await nextTick()
    if (reportMode.value && autoPrint.value) {
      setTimeout(() => {
        triggerPrint()
      }, 350)
    }
  } catch (error) {
    const cached = loadCachedRecommendation()
    recommendation.value = cached || buildFallbackRecommendation()
    selectedNodeId.value = flatNodes.value[0] ? nodeKey(flatNodes.value[0]) : ''
    ElMessage.error(error.message || '学习路径加载失败，已展示缓存/演示路径')
  } finally {
    loading.value = false
  }
}

function persistRecommendation() {
  localStorage.setItem(PATH_CACHE_KEY, JSON.stringify(recommendation.value || {}))
}

function loadCachedRecommendation() {
  try {
    const raw = localStorage.getItem(PATH_CACHE_KEY)
    return raw ? normalizeRecommendation(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

async function loadSnapshotHistory() {
  if (reportMode.value) return
  historyLoading.value = true
  try {
    snapshotHistory.value = await learningApi.pathRecommendationSnapshots({ limit: 8 })
  } catch {
    snapshotHistory.value = []
  } finally {
    historyLoading.value = false
  }
}

function syncFiltersFromQuery() {
  filters.stage = String(route.query.stage || filters.stage || 'month')
  filters.goal = String(route.query.goal || filters.goal || 'improve_weakness')
  filters.days = normalizeDays(route.query.days || filters.days)
}

function syncFiltersFromRecommendation() {
  if (!recommendation.value) return
  filters.stage = recommendation.value.stage || filters.stage
  filters.goal = recommendation.value.goal || filters.goal
  filters.days = normalizeDays(recommendation.value.days || filters.days)
}

function normalizeDays(value) {
  const number = Number(value || 14)
  if (!Number.isFinite(number)) return 14
  return Math.max(3, Math.min(60, Math.round(number)))
}

async function regenerate() {
  await router.replace({
    name: 'learning-path',
    query: {
      stage: filters.stage,
      goal: filters.goal,
      days: String(filters.days),
    },
  })
}

async function saveSnapshot() {
  if (!recommendation.value) return
  saving.value = true
  try {
    const saved = await learningApi.savePathRecommendationSnapshot({
      stage: filters.stage,
      goal: filters.goal,
      days: filters.days,
      snapshot: recommendation.value,
    })
    ElMessage.success('学习路径报告已保存')
    await loadSnapshotHistory()
    return saved
  } catch (error) {
    ElMessage.error(error.message || '学习路径报告保存失败')
    return null
  } finally {
    saving.value = false
  }
}

function buildReportQuery(extra = {}) {
  return {
    report: '1',
    stage: filters.stage,
    goal: filters.goal,
    days: String(filters.days),
    ...extra,
  }
}

async function openReport(extra = {}) {
  await router.push({
    name: 'learning-path',
    query: buildReportQuery(extra),
  })
}

function openCurrentReport() {
  return openReport()
}

function downloadPdf() {
  return openReport({ autoprint: '1' })
}

async function triggerPrint() {
  await nextTick()
  window.focus()
  window.print()
}

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function buildFallbackRecommendation() {
  return normalizeRecommendation({
    stage: filters.stage,
    goal: filters.goal,
    days: filters.days,
    updatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    summary: {
      headline: '已综合学习画像、作题表现、考试表现与小C对话生成个性化学习路径。',
      pathTypeLabel: '补弱路径',
      cycleLabel: `${filters.stage === 'week' ? '本周' : filters.stage === 'term' ? '本学期' : '本月'} / ${filters.days}天`,
      primaryProblem: '知识基础与错题反思需要优先补强',
      priorityLabel: '高优先级补救',
    },
    evidence: {
      sections: [
        { title: '学生画像', bullets: ['知识基础偏弱，近期目标清晰度一般。', '实践能力和协作表达相对稳定，可作为带动维度。'] },
        { title: '作题与考试', bullets: ['最近作答波动较大，错题复盘质量不足。', '主观题步骤不完整，导致丢分。'] },
      ],
      dialogueSignals: ['已表达补弱诉求', '偏好示例讲解与分步复盘'],
      missingItems: [],
    },
    diagnosis: {
      knowledgeGaps: ['指针与地址', '结构体数组'],
      abilityRisks: ['错题反思不足', '迁移应用偏弱'],
      behaviorRisks: ['练后复盘不稳定'],
      examRisks: ['主观题过程分容易丢失'],
      opportunityPoints: ['实践能力可作为补弱带动项'],
      conclusion: '当前阶段应先补核心薄弱知识点，再用分阶段检查点验证是否真正掌握。',
    },
    strategy: {
      mode: 'remedial',
      label: '补救型路径',
      targetCycle: `${filters.days}天`,
      priority: 'high',
      reason: '基础知识与错题反思存在明显短板，宜先补基础再做迁移。',
      routingBasis: ['画像总分偏低', '薄弱知识点集中', '对话中明确表达补弱诉求'],
      goals: ['补齐基础概念', '完成错题复盘', '形成稳定练习节奏'],
    },
    llmAdvice: {
      headline: '先稳住核心薄弱点，再用阶段检查点验证是否真正掌握。',
      explanation: '当前建议以规则路径为主，并结合近期学习证据给出优先动作与风险提醒。',
      priorityActions: ['先完成基础补强与错题整理', '每天固定 30 分钟短练', '每阶段结束后与小C复盘一次'],
      riskWarnings: ['只看资料不做题会形成假掌握', '不记录错因会导致重复失分'],
      resourceAdvice: ['先看讲解，再做变式题', '同一知识点资源控制在 2 到 4 个'],
      dialogueAdvice: ['把卡点直接发给小C', '练完后让小C追问错因与改法'],
    },
    phases: [
      {
        key: 'phase-1',
        title: '阶段一',
        description: '先补概念、例题和基础实现。',
        goal: '夯实基础',
        checkpoint: '能独立解释知识点并完成基础题',
        riskReminder: '避免只浏览不动手',
        nodes: [
          {
            knowledgePointId: 1,
            title: '指针与地址补强',
            estimatedMinutes: 45,
            reason: '这是当前最主要的知识缺口。',
            tasks: ['阅读 1 份图解讲义', '完成 3 道基础题', '整理 1 份错因记录'],
            resources: [],
            checkpoint: '能解释地址与解引用关系',
            relatedEvidence: ['画像薄弱点', '近期错题'],
            expectedOutcome: '基础题正确率明显提升',
          },
        ],
      },
    ],
    resources: [],
    reportMeta: {
      printableTitle: '个性化学习路径报告',
      generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      snapshotId: null,
    },
  })
}

function paragraph(docx, text, options = {}) {
  return new docx.Paragraph({
    ...options,
    children: [new docx.TextRun(String(text || ''))],
  })
}

function createInfoTable(docx, rows) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => new docx.TableRow({
      children: [
        new docx.TableCell({ width: { size: 28, type: docx.WidthType.PERCENTAGE }, children: [paragraph(docx, label)] }),
        new docx.TableCell({ width: { size: 72, type: docx.WidthType.PERCENTAGE }, children: [paragraph(docx, value)] }),
      ],
    })),
  })
}

async function exportWord() {
  if (!recommendation.value) return
  exportingWord.value = true
  try {
    const [docx, saver] = await Promise.all([import('docx'), import('file-saver')])
    const children = [
      new docx.Paragraph({
        text: reportMeta.value.printableTitle || '个性化学习路径报告',
        heading: docx.HeadingLevel.TITLE,
        alignment: docx.AlignmentType.CENTER,
      }),
      paragraph(docx, `生成时间：${reportMeta.value.generatedAt || recommendation.value.updatedAt || ''}`),
      paragraph(docx, recommendation.value.summary?.headline || ''),
      createInfoTable(docx, [
        ['路径类型', recommendation.value.summary?.pathTypeLabel || ''],
        ['目标周期', recommendation.value.summary?.cycleLabel || ''],
        ['主要问题', recommendation.value.summary?.primaryProblem || ''],
        ['建议优先级', recommendation.value.summary?.priorityLabel || ''],
      ]),
      new docx.Paragraph({ text: '一、诊断摘要', heading: docx.HeadingLevel.HEADING_1 }),
      paragraph(docx, diagnosis.value.conclusion || ''),
      createInfoTable(docx, [
        ['分流判定', strategy.value.label || ''],
        ['路径说明', strategy.value.reason || ''],
        ['大模型建议摘要', llmAdvice.value.headline || ''],
        ['快照编号', reportMeta.value.snapshotId || '未保存'],
      ]),
      new docx.Paragraph({ text: '二、综合证据', heading: docx.HeadingLevel.HEADING_1 }),
    ]

    ;(evidence.value.sections || []).forEach((section) => {
      children.push(new docx.Paragraph({ text: section.title || '证据', heading: docx.HeadingLevel.HEADING_2 }))
      ;(section.bullets || []).forEach((item) => children.push(paragraph(docx, `• ${sanitizeText(item)}`)))
    })
    if ((evidence.value.dialogueSignals || []).length) {
      children.push(new docx.Paragraph({ text: '小C 对话摘要', heading: docx.HeadingLevel.HEADING_2 }))
      ;(evidence.value.dialogueSignals || []).forEach((item) => children.push(paragraph(docx, `• ${sanitizeText(item)}`)))
    }

    children.push(new docx.Paragraph({ text: '三、阶段学习路径', heading: docx.HeadingLevel.HEADING_1 }))
    ;(phases.value || []).forEach((phase) => {
      children.push(new docx.Paragraph({ text: phase.title || '阶段', heading: docx.HeadingLevel.HEADING_2 }))
      children.push(paragraph(docx, phase.goal || ''))
      children.push(paragraph(docx, phase.description || ''))
      ;(phase.nodes || []).forEach((node, index) => {
        children.push(new docx.Paragraph({ text: `${index + 1}. ${node.title || '节点'}`, heading: docx.HeadingLevel.HEADING_3 }))
        children.push(paragraph(docx, `原因：${node.reason || ''}`))
        children.push(paragraph(docx, `预期结果：${node.expectedOutcome || ''}`))
        children.push(paragraph(docx, `检查点：${node.checkpoint || ''}`))
        ;(node.tasks || []).forEach((task) => children.push(paragraph(docx, `- ${sanitizeText(task)}`)))
      })
    })

    children.push(new docx.Paragraph({ text: '四、大模型建议', heading: docx.HeadingLevel.HEADING_1 }))
    children.push(paragraph(docx, llmAdvice.value.explanation || llmAdvice.value.headline || ''))
    ;(llmAdvice.value.priorityActions || []).forEach((item) => children.push(paragraph(docx, `优先动作：${sanitizeText(item)}`)))
    ;(llmAdvice.value.riskWarnings || []).forEach((item) => children.push(paragraph(docx, `风险提醒：${sanitizeText(item)}`)))
    ;(llmAdvice.value.resourceAdvice || []).forEach((item) => children.push(paragraph(docx, `资源建议：${sanitizeText(item)}`)))
    ;(llmAdvice.value.dialogueAdvice || []).forEach((item) => children.push(paragraph(docx, `对话建议：${sanitizeText(item)}`)))

    if (resources.value.length) {
      children.push(new docx.Paragraph({ text: '五、附录资源', heading: docx.HeadingLevel.HEADING_1 }))
      resources.value.forEach((item) => {
        children.push(paragraph(docx, `${item.title || '资源'} | ${resourceTypeText(item.resourceType)} | ${sanitizeText(item.summary || '')}`))
      })
    }

    const doc = new docx.Document({ sections: [{ properties: {}, children }] })
    const blob = await docx.Packer.toBlob(doc)
    saver.saveAs(blob, `学习路径报告_${new Date().toISOString().slice(0, 10)}.docx`)
    ElMessage.success('Word 报告已导出')
  } catch (error) {
    ElMessage.error(error.message || 'Word 导出失败')
  } finally {
    exportingWord.value = false
  }
}

async function openSnapshotReport(id) {
  await router.push({
    name: 'learning-path',
    query: {
      report: '1',
      snapshotId: String(id),
    },
  })
}

async function saveAndOpenSnapshot() {
  const saved = await saveSnapshot()
  if (saved?.id) {
    await openSnapshotReport(saved.id)
  }
}

function backToInteractive() {
  router.replace({
    name: 'learning-path',
    query: {
      stage: recommendation.value?.stage || filters.stage,
      goal: recommendation.value?.goal || filters.goal,
      days: String(recommendation.value?.days || filters.days),
    },
  })
}

watch(
  () => route.fullPath,
  async () => {
    await loadRecommendation()
    await loadSnapshotHistory()
  },
)

onMounted(async () => {
  const cached = loadCachedRecommendation()
  if (cached) {
    recommendation.value = cached
  }
  await loadRecommendation()
  await loadSnapshotHistory()
})
</script>

<template>
  <div v-loading="loading" class="learning-path-v2">
    <template v-if="!reportMode">
      <section class="hero-panel">
        <div class="hero-copy">
          <p class="eyebrow">学生端 · 个性化学习路径</p>
          <h1>综合画像、作题、考试与小 C 对话生成动态学习路径</h1>
          <p class="hero-desc">
            当前路径不再只看薄弱知识点，而是把个性画像、作题表现、考试风险与对话证据一起纳入分析，再给出阶段路径和大模型建议。
          </p>
        </div>
        <div class="hero-actions">
          <el-segmented v-model="filters.stage" :options="stageOptions" />
          <el-select v-model="filters.goal" class="goal-select">
            <el-option v-for="item in goalOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input-number v-model="filters.days" :min="3" :max="60" controls-position="right" />
          <el-button :icon="Refresh" @click="regenerate">重新生成</el-button>
          <el-button :icon="Document" @click="openCurrentReport">打印预览</el-button>
          <el-button type="primary" :icon="Reading" @click="downloadPdf">下载 PDF</el-button>
          <el-button :loading="exportingWord" @click="exportWord">下载 Word</el-button>
          <el-button :loading="saving" @click="saveSnapshot">保存快照</el-button>
        </div>
      </section>

      <section class="summary-grid">
        <article v-for="item in summaryCards" :key="item.label" class="summary-card">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </section>

      <section class="advice-banner">
        <div>
          <p class="section-kicker">LLM 综合建议</p>
          <h2>{{ llmAdvice.headline || recommendation?.summary?.headline }}</h2>
        </div>
        <small>来源：{{ llmAdvice.source === 'llm' ? (llmAdvice.modelName || '大模型') : '系统回退建议' }}</small>
      </section>

      <main class="workspace-grid">
        <aside class="left-column">
          <section class="panel-card">
            <div class="panel-header">
              <h3>综合证据摘要</h3>
              <span>完整度 {{ evidence.completenessScore || 0 }}</span>
            </div>
            <article v-for="section in evidence.sections || []" :key="section.title" class="evidence-section">
              <h4>{{ section.title }}</h4>
              <ul>
                <li v-for="item in section.bullets || []" :key="item">{{ item }}</li>
              </ul>
            </article>
            <div v-if="(evidence.dialogueSignals || []).length" class="dialogue-box">
              <h4>来自小 C 对话的证据</h4>
              <ul>
                <li v-for="item in evidence.dialogueSignals || []" :key="item">{{ item }}</li>
              </ul>
            </div>
            <el-alert
              v-if="(evidence.missingItems || []).length"
              type="warning"
              :closable="false"
              :title="`证据缺失：${(evidence.missingItems || []).join('；')}`"
            />
          </section>

          <section class="panel-card">
            <div class="panel-header">
              <h3>分流判定</h3>
              <el-tag type="success" effect="plain">{{ strategy.label || '学习路径' }}</el-tag>
            </div>
            <p class="panel-text">{{ strategy.reason }}</p>
            <div class="chip-list">
              <el-tag v-for="item in strategy.routingBasis || []" :key="item" effect="plain">{{ item }}</el-tag>
            </div>
            <h4>本轮目标</h4>
            <ul class="compact-list">
              <li v-for="item in strategy.goals || []" :key="item">{{ item }}</li>
            </ul>
          </section>

          <section class="panel-card">
            <div class="panel-header">
              <h3>历史报告</h3>
              <span>{{ snapshotHistory.length }} 份</span>
            </div>
            <el-skeleton v-if="historyLoading" :rows="4" animated />
            <div v-else class="history-list">
              <button
                v-for="item in snapshotHistory"
                :key="item.id"
                class="history-item"
                type="button"
                @click="openSnapshotReport(item.id)"
              >
                <strong>{{ item.title || '学习路径报告' }}</strong>
                <span>{{ item.generatedAt }}</span>
                <small>{{ item.summaryText || `${item.days} 天 ${item.goal}` }}</small>
              </button>
              <el-empty v-if="!snapshotHistory.length" :image-size="72" description="还没有保存过报告快照" />
            </div>
          </section>
        </aside>

        <section class="center-column">
          <section class="panel-card">
            <div class="panel-header">
              <h3>综合诊断结论</h3>
              <span>{{ recommendation?.updatedAt }}</span>
            </div>
            <p class="panel-text">{{ diagnosis.conclusion }}</p>
            <div class="diagnosis-grid">
              <article class="diag-card">
                <h4>知识缺口</h4>
                <ul class="compact-list">
                  <li v-for="item in diagnosis.knowledgeGaps || []" :key="item">{{ item }}</li>
                </ul>
              </article>
              <article class="diag-card">
                <h4>能力短板</h4>
                <ul class="compact-list">
                  <li v-for="item in diagnosis.abilityRisks || []" :key="item">{{ item }}</li>
                </ul>
              </article>
              <article class="diag-card">
                <h4>行为风险</h4>
                <ul class="compact-list">
                  <li v-for="item in diagnosis.behaviorRisks || []" :key="item">{{ item }}</li>
                </ul>
              </article>
              <article class="diag-card">
                <h4>考试风险</h4>
                <ul class="compact-list">
                  <li v-for="item in diagnosis.examRisks || []" :key="item">{{ item }}</li>
                </ul>
              </article>
            </div>
          </section>

          <section class="panel-card">
            <div class="panel-header">
              <h3>阶段学习路径</h3>
              <el-button link type="primary" @click="saveAndOpenSnapshot">保存并打开报告版</el-button>
            </div>
            <div class="phase-timeline">
              <article v-for="phase in phases" :key="phase.key" class="phase-card">
                <header>
                  <div>
                    <p class="phase-kicker">{{ phase.title }}</p>
                    <h4>{{ phase.goal }}</h4>
                  </div>
                  <small>{{ phase.riskReminder }}</small>
                </header>
                <p class="phase-desc">{{ phase.description }}</p>
                <button
                  v-for="node in phase.nodes || []"
                  :key="nodeKey({ ...node, phase })"
                  class="node-card"
                  :class="{ active: selectedNodeId === nodeKey({ ...node, phase }) }"
                  type="button"
                  @click="selectNode({ ...node, phase })"
                >
                  <strong>{{ node.title }}</strong>
                  <span>{{ node.estimatedMinutes }} 分钟 · 掌握度 {{ masteryPercent(node.masteryValue) }}%</span>
                  <small>{{ node.expectedOutcome }}</small>
                </button>
              </article>
            </div>
          </section>
        </section>

        <aside class="right-column">
          <section class="panel-card detail-card">
            <template v-if="selectedNode">
              <div class="panel-header">
                <h3>{{ selectedNode.title }}</h3>
                <span>{{ selectedNode.phase?.title }}</span>
              </div>
              <el-progress :percentage="masteryPercent(selectedNode.masteryValue)" :stroke-width="8" />
              <p class="detail-copy">{{ selectedNode.reason }}</p>
              <h4>阶段任务</h4>
              <ol class="task-list">
                <li v-for="task in selectedNode.tasks || []" :key="task">{{ task }}</li>
              </ol>
              <h4>阶段检查点</h4>
              <p class="detail-copy">{{ selectedNode.checkpoint }}</p>
              <h4>关联证据</h4>
              <ul class="compact-list">
                <li v-for="item in selectedNode.relatedEvidence || []" :key="item">{{ item }}</li>
              </ul>
              <h4>推荐资源包</h4>
              <div class="resource-links">
                <a
                  v-for="item in (selectedNode.resources || []).filter(canOpenResource)"
                  :key="item.id"
                  class="resource-link"
                  :href="item.url"
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{{ item.title }}</strong>
                  <small>{{ resourceTypeText(item.resourceType) }}</small>
                </a>
                <el-empty v-if="!(selectedNode.resources || []).filter(canOpenResource).length" :image-size="60" description="暂无可直接打开的资源" />
              </div>
            </template>
          </section>

          <section class="panel-card">
            <div class="panel-header">
              <h3>大模型建议细化</h3>
              <span>{{ llmAdvice.modelName || llmAdvice.source }}</span>
            </div>
            <h4>优先动作</h4>
            <ul class="compact-list">
              <li v-for="item in llmAdvice.priorityActions || []" :key="item">{{ item }}</li>
            </ul>
            <h4>风险提醒</h4>
            <ul class="compact-list">
              <li v-for="item in llmAdvice.riskWarnings || []" :key="item">{{ item }}</li>
            </ul>
            <h4>资源使用建议</h4>
            <ul class="compact-list">
              <li v-for="item in llmAdvice.resourceAdvice || []" :key="item">{{ item }}</li>
            </ul>
            <h4>和小 C 配合复盘</h4>
            <ul class="compact-list">
              <li v-for="item in llmAdvice.dialogueAdvice || []" :key="item">{{ item }}</li>
            </ul>
          </section>
        </aside>
      </main>

      <section class="resource-table panel-card">
        <div class="panel-header">
          <h3>资源清单</h3>
          <span>{{ resources.length }} 项</span>
        </div>
        <el-table :data="resources" border>
          <el-table-column prop="title" label="资源标题" min-width="180" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">{{ resourceTypeText(row.resourceType) }}</template>
          </el-table-column>
          <el-table-column prop="knowledgePointName" label="知识点" min-width="140" />
          <el-table-column prop="summary" label="摘要" min-width="260" show-overflow-tooltip />
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button v-if="canOpenResource(row)" link type="primary" tag="a" :href="row.url" target="_blank">打开</el-button>
              <el-tag v-else-if="isVideoResource(row)" type="warning" effect="plain">待确认</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </template>

    <template v-else>
      <section class="report-shell">
        <header class="report-toolbar no-print">
          <div>
            <h1>{{ reportMeta.printableTitle || '个性化学习路径报告' }}</h1>
            <p>{{ reportMeta.generatedAt || recommendation?.updatedAt }}</p>
          </div>
          <div class="report-actions">
            <el-button @click="backToInteractive">返回交互页</el-button>
            <el-button :loading="exportingWord" @click="exportWord">下载 Word</el-button>
            <el-button type="primary" @click="triggerPrint">打印 / 保存 PDF</el-button>
          </div>
        </header>

        <article class="report-page">
          <section class="report-cover">
            <p class="eyebrow">学习路径 · 智能学习系统</p>
            <h1>{{ reportMeta.printableTitle || '个性化学习路径报告' }}</h1>
            <p>{{ recommendation?.summary?.headline }}</p>
            <div class="report-meta-grid">
              <div>
                <span>路径类型</span>
                <strong>{{ recommendation?.summary?.pathTypeLabel }}</strong>
              </div>
              <div>
                <span>目标周期</span>
                <strong>{{ recommendation?.summary?.cycleLabel }}</strong>
              </div>
              <div>
                <span>生成时间</span>
                <strong>{{ reportMeta.generatedAt || recommendation?.updatedAt }}</strong>
              </div>
              <div>
                <span>快照编号</span>
                <strong>{{ reportMeta.snapshotId || '未保存' }}</strong>
              </div>
            </div>
          </section>

          <section class="report-section">
            <h2>一、诊断摘要</h2>
            <p>{{ diagnosis.conclusion }}</p>
            <div class="report-grid">
              <article class="report-card">
                <h3>主要问题</h3>
                <p>{{ recommendation?.summary?.primaryProblem }}</p>
              </article>
              <article class="report-card">
                <h3>分流判定</h3>
                <p>{{ strategy.label }}</p>
                <small>{{ strategy.reason }}</small>
              </article>
              <article class="report-card">
                <h3>优先级</h3>
                <p>{{ recommendation?.summary?.priorityLabel }}</p>
              </article>
              <article class="report-card">
                <h3>大模型建议摘要</h3>
                <p>{{ llmAdvice.headline }}</p>
              </article>
            </div>
          </section>

          <section class="report-section">
            <h2>二、综合证据</h2>
            <article v-for="section in evidence.sections || []" :key="section.title" class="report-block">
              <h3>{{ section.title }}</h3>
              <ul>
                <li v-for="item in section.bullets || []" :key="item">{{ item }}</li>
              </ul>
            </article>
            <article v-if="(evidence.dialogueSignals || []).length" class="report-block">
              <h3>小 C 对话摘要</h3>
              <ul>
                <li v-for="item in evidence.dialogueSignals || []" :key="item">{{ item }}</li>
              </ul>
            </article>
          </section>

          <section class="report-section">
            <h2>三、阶段学习路径</h2>
            <article v-for="phase in phases" :key="phase.key" class="phase-report">
              <header>
                <div>
                  <p>{{ phase.title }}</p>
                  <h3>{{ phase.goal }}</h3>
                </div>
                <span>{{ phase.riskReminder }}</span>
              </header>
              <p>{{ phase.description }}</p>
              <div v-for="node in phase.nodes || []" :key="nodeKey({ ...node, phase })" class="phase-node-report">
                <h4>{{ node.title }}</h4>
                <p>{{ node.reason }}</p>
                <p>预期结果：{{ node.expectedOutcome }}</p>
                <p>阶段检查点：{{ node.checkpoint }}</p>
                <ul>
                  <li v-for="task in node.tasks || []" :key="task">{{ task }}</li>
                </ul>
              </div>
            </article>
          </section>

          <section class="report-section">
            <h2>四、大模型建议</h2>
            <article class="report-block">
              <h3>{{ llmAdvice.headline }}</h3>
              <p>{{ llmAdvice.explanation }}</p>
              <div class="report-grid">
                <div class="report-card">
                  <h4>优先动作</h4>
                  <ul>
                    <li v-for="item in llmAdvice.priorityActions || []" :key="item">{{ item }}</li>
                  </ul>
                </div>
                <div class="report-card">
                  <h4>风险提醒</h4>
                  <ul>
                    <li v-for="item in llmAdvice.riskWarnings || []" :key="item">{{ item }}</li>
                  </ul>
                </div>
                <div class="report-card">
                  <h4>资源使用方式</h4>
                  <ul>
                    <li v-for="item in llmAdvice.resourceAdvice || []" :key="item">{{ item }}</li>
                  </ul>
                </div>
                <div class="report-card">
                  <h4>与小 C 配合复盘</h4>
                  <ul>
                    <li v-for="item in llmAdvice.dialogueAdvice || []" :key="item">{{ item }}</li>
                  </ul>
                </div>
              </div>
            </article>
          </section>

          <section class="report-section">
            <h2>五、附录资源</h2>
            <table class="report-table">
              <thead>
                <tr>
                  <th>资源</th>
                  <th>类型</th>
                  <th>摘要</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in resources" :key="item.id">
                  <td>{{ item.title }}</td>
                  <td>{{ resourceTypeText(item.resourceType) }}</td>
                  <td>{{ item.summary }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.learning-path-v2 {
  display: grid;
  gap: 18px;
  color: #1b2c31;
}

.hero-panel,
.panel-card,
.summary-card,
.advice-banner,
.report-page {
  background: #fff;
  border: 1px solid #d7e3df;
  border-radius: 18px;
  box-shadow: 0 18px 40px rgba(24, 54, 46, 0.06);
}

.hero-panel {
  display: grid;
  gap: 18px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(11, 128, 99, 0.14), transparent 36%),
    linear-gradient(135deg, #f7fbf9, #ffffff 56%);
}

.eyebrow,
.section-kicker,
.phase-kicker {
  margin: 0;
  color: #0f8b6d;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-panel h1,
.report-cover h1 {
  margin: 10px 0 0;
  font-size: 30px;
  line-height: 1.2;
  color: #102a25;
}

.hero-desc {
  max-width: 820px;
  margin: 12px 0 0;
  color: #55706a;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.goal-select {
  width: 160px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  display: grid;
  gap: 8px;
  min-height: 122px;
  padding: 18px;
}

.summary-card .el-icon {
  color: #0f8b6d;
  font-size: 24px;
}

.summary-card span {
  color: #69817a;
}

.summary-card strong {
  font-size: 21px;
  line-height: 1.45;
}

.advice-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  background: linear-gradient(90deg, #113c32, #1a5b4d);
  color: #f8fffd;
}

.advice-banner h2 {
  margin: 6px 0 0;
  font-size: 22px;
}

.advice-banner small {
  color: rgba(248, 255, 253, 0.82);
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) minmax(360px, 1.4fr) minmax(300px, 1fr);
  gap: 16px;
  align-items: start;
}

.left-column,
.center-column,
.right-column {
  display: grid;
  gap: 16px;
}

.panel-card {
  padding: 18px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
}

.panel-header h3,
.report-section h2 {
  margin: 0;
  font-size: 18px;
}

.panel-header span {
  color: #6e847d;
  font-size: 13px;
}

.panel-text,
.detail-copy,
.phase-desc,
.report-section p,
.report-block p {
  margin: 0;
  color: #4f6962;
  line-height: 1.7;
}

.evidence-section + .evidence-section,
.dialogue-box,
.diag-card,
.report-block {
  margin-top: 14px;
}

.evidence-section h4,
.diag-card h4,
.panel-card h4,
.report-block h3,
.phase-node-report h4,
.report-card h3,
.report-card h4 {
  margin: 0 0 8px;
  font-size: 15px;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.compact-list,
.task-list,
.evidence-section ul,
.dialogue-box ul,
.report-block ul,
.report-card ul {
  margin: 0;
  padding-left: 18px;
  color: #445c56;
  line-height: 1.8;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item,
.node-card {
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  background: #f7fbfa;
  border: 1px solid #dbe8e4;
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.history-item:hover,
.node-card:hover,
.node-card.active {
  background: #eef9f5;
  border-color: #42a382;
  transform: translateY(-1px);
}

.history-item strong,
.node-card strong {
  display: block;
  color: #183b35;
}

.history-item span,
.history-item small,
.node-card span,
.node-card small {
  display: block;
  margin-top: 4px;
  color: #67817a;
}

.diagnosis-grid,
.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.diag-card,
.report-card {
  padding: 14px;
  background: #f8fbfa;
  border: 1px solid #e0ebe7;
  border-radius: 14px;
}

.phase-timeline {
  display: grid;
  gap: 14px;
}

.phase-card {
  padding: 16px;
  background: linear-gradient(180deg, #fbfefd, #f5faf8);
  border: 1px solid #dbe7e3;
  border-radius: 16px;
}

.phase-card header,
.phase-report header,
.report-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.phase-card h4,
.phase-report h3 {
  margin: 4px 0 0;
  font-size: 18px;
}

.phase-card header small,
.phase-report header span {
  max-width: 220px;
  color: #6d837d;
  line-height: 1.5;
}

.detail-card {
  position: sticky;
  top: 20px;
}

.resource-links {
  display: grid;
  gap: 8px;
}

.resource-link {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  color: #173733;
  text-decoration: none;
  background: #f8fbfa;
  border: 1px solid #dce7e3;
  border-radius: 12px;
}

.resource-link small {
  color: #0f8b6d;
}

.resource-table {
  overflow: hidden;
}

.report-shell {
  display: grid;
  gap: 16px;
}

.report-toolbar {
  padding: 16px 18px;
  background: #f8fbfa;
  border: 1px solid #d7e3df;
  border-radius: 16px;
}

.report-toolbar h1 {
  margin: 0;
  font-size: 24px;
}

.report-toolbar p {
  margin: 6px 0 0;
  color: #69807a;
}

.report-actions {
  display: flex;
  gap: 10px;
}

.report-page {
  width: min(100%, 960px);
  margin: 0 auto;
  padding: 28px;
}

.report-cover,
.report-section,
.phase-report,
.phase-node-report {
  break-inside: avoid;
}

.report-cover {
  padding-bottom: 24px;
  border-bottom: 2px solid #d9e6e1;
}

.report-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.report-meta-grid div {
  padding: 14px;
  background: #f7fbfa;
  border: 1px solid #dbe7e3;
  border-radius: 14px;
}

.report-meta-grid span {
  display: block;
  color: #70857f;
}

.report-meta-grid strong {
  display: block;
  margin-top: 8px;
}

.report-section {
  padding-top: 22px;
}

.phase-report {
  margin-top: 16px;
  padding: 18px;
  background: #fafdfc;
  border: 1px solid #dde7e3;
  border-radius: 16px;
}

.phase-node-report {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e3ece8;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 14px;
}

.report-table th,
.report-table td {
  padding: 10px 12px;
  border: 1px solid #d8e3df;
  text-align: left;
  vertical-align: top;
}

@media (max-width: 1200px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .detail-card {
    position: static;
  }
}

@media (max-width: 820px) {
  .summary-grid,
  .diagnosis-grid,
  .report-grid,
  .report-meta-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .report-toolbar,
  .phase-card header,
  .phase-report header {
    display: grid;
  }

  .goal-select {
    width: 100%;
  }

  .report-page {
    padding: 18px;
  }
}

@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  :global(html),
  :global(body) {
    background: #fff !important;
  }

  .no-print,
  .report-toolbar {
    display: none !important;
  }

  .learning-path-v2,
  .report-shell {
    display: block;
    background: #fff;
  }

  .report-page {
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .report-cover,
  .report-section,
  .report-card,
  .phase-report,
  .phase-node-report,
  .report-table {
    break-inside: avoid;
  }
}
</style>
