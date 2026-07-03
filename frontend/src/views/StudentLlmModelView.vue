<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  CircleCheck,
  Connection,
  Cpu,
  Delete,
  Document,
  Edit,
  Files,
  FolderOpened,
  Plus,
  Search,
  Setting,
  Star,
  Switch,
  View,
} from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import { llmApi } from '@/api/services'

const pageRoot = ref(null)
const providerDialogBody = ref(null)
const templateDialogBody = ref(null)
let gsapContext
let motionQuery

const activeTab = ref('models')
const loading = ref(false)
const providerLoading = ref(false)
const templateLoading = ref(false)
const providerDialogVisible = ref(false)
const templateDialogVisible = ref(false)
const providerDialogMode = ref('create')
const templateDialogMode = ref('create')
const providerSubmitting = ref(false)
const templateSubmitting = ref(false)
const detailVisible = ref(false)
const templateDetailVisible = ref(false)
const activeProvider = ref(null)
const activeTemplate = ref(null)
const templatePage = ref(1)
const templatePageSize = 10

const providers = ref([])
const templates = ref([])

const providerQuery = reactive({
  keyword: '',
  enabled: '',
})

const templateQuery = reactive({
  keyword: '',
  taskType: '',
})

const taskTypeOptions = [
  '自主风险分类模板',
  '自主风险对比模板',
  '自主风险检验模板',
  '题目讲解',
  '解题步骤',
  '错因分析',
  '知识点归纳',
  '相似题推荐',
]

const providerForm = reactive(blankProviderForm())
const templateForm = reactive(blankTemplateForm())

const modelKindOptions = [
  { label: 'API 模型', value: 'api' },
  { label: '本地模型', value: 'local' },
  { label: '检测模型', value: 'detection' },
]

const detectionTypeOptions = [
  { label: '表情识别', value: 'emoji' },
  { label: '特征学习', value: 'fealearner' },
  { label: '自定义检测', value: 'custom' },
]

const filteredProviders = computed(() => {
  if (providerQuery.enabled === '') return providers.value
  return providers.value.filter((item) => item.enabled === providerQuery.enabled)
})

const categorizedProviders = computed(() => {
  const rows = filteredProviders.value
  return {
    api: rows.filter((item) => inferModelKind(item) === 'api'),
    local: rows.filter((item) => inferModelKind(item) === 'local'),
    detection: rows.filter((item) => inferModelKind(item) === 'detection'),
  }
})

const providerStats = computed(() => {
  const rows = providers.value
  return {
    total: rows.length,
    api: rows.filter((item) => inferModelKind(item) === 'api').length,
    local: rows.filter((item) => inferModelKind(item) === 'local').length,
    detection: rows.filter((item) => inferModelKind(item) === 'detection').length,
    enabled: rows.filter((item) => item.enabled).length,
  }
})

const sortedTemplates = computed(() => {
  const rows = [...templates.value]
  rows.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
  return rows
})

const paginatedTemplates = computed(() => {
  const start = (templatePage.value - 1) * templatePageSize
  return sortedTemplates.value.slice(start, start + templatePageSize)
})

const defaultProviderName = computed(() => {
  return providers.value.find((item) => item.isDefault)?.label || '暂未设置'
})

function blankProviderForm() {
  return {
    id: null,
    modelKind: 'api',
    label: '',
    providerKey: '',
    providerType: 'API',
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.2,
    supportsTemperature: true,
    description: '',
    tags: '',
    detectionType: 'emoji',
    dataset: '',
    enabled: true,
  }
}

function blankTemplateForm() {
  return {
    id: null,
    templateName: '',
    taskType: taskTypeOptions[0],
    description: '',
    promptText: '',
  }
}

function resetObject(target, source) {
  Object.keys(target).forEach((key) => {
    target[key] = source[key]
  })
}

function normalizeEnabled(value) {
  return value === '' ? undefined : value
}

function normalizeTagList(input) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item || '').trim()).filter(Boolean)
  }
  return String(input || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function inferModelKind(row) {
  if (String(row?.providerType || '').toUpperCase() === 'API') {
    return 'api'
  }
  const tags = normalizeTagList(row?.tags)
    .map((item) => item.toLowerCase())
  const text = [
    row?.label,
    row?.providerKey,
    row?.model,
    row?.description,
    ...tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (
    tags.some((item) => item.includes('检测') || item.includes('detection') || item.includes('emoji') || item.includes('fealearner')) ||
    /检测|detection|emoji|fealearner|情绪|表情/.test(text)
  ) {
    return 'detection'
  }
  return 'local'
}

function inferDetectionType(row) {
  const tags = normalizeTagList(row?.tags).join(' ').toLowerCase()
  const haystack = `${row?.providerKey || ''} ${row?.model || ''} ${tags}`.toLowerCase()
  if (haystack.includes('fealearner')) return 'fealearner'
  if (haystack.includes('custom')) return 'custom'
  return 'emoji'
}

function sourceText(row) {
  return row.editable ? '我的配置' : '系统内置'
}

function kindLabel(kind) {
  if (kind === 'api') return 'API 模型'
  if (kind === 'detection') return '检测模型'
  return '本地模型'
}

function toViewProvider(row) {
  const hasStudentShape = Object.prototype.hasOwnProperty.call(row || {}, 'label')
  const modelCategory = row?.modelCategory || (String(row?.providerType || '').toUpperCase() === 'API' ? 'api' : 'local_llm')
  const modelType = row?.modelType || (String(row?.providerType || '').toUpperCase() === 'API' ? 'api' : 'ollama')
  const datasets = Array.isArray(row?.supportedDatasets) ? row.supportedDatasets : normalizeTagList(row?.tags)
  const extraTags = []
  if (modelCategory === 'api') extraTags.push('API模型')
  if (modelCategory === 'local_llm') extraTags.push('本地模型')
  if (modelCategory === 'detection') extraTags.push('检测模型')
  if (row?.detectionType) extraTags.push(row.detectionType)
  datasets.forEach((item) => extraTags.push(`数据集:${item}`))

  return {
    id: row.id,
    label: hasStudentShape ? row.label : row.modelName,
    providerKey: hasStudentShape ? row.providerKey : row.modelCode,
    providerType: modelCategory === 'api' ? 'API' : 'LOCAL',
    baseUrl: hasStudentShape ? (row.baseUrl || '') : (row.apiBaseUrl || row.ollamaBaseUrl || row.modelPath || row.modelFilePath || ''),
    model: hasStudentShape ? (row.model || row.providerKey) : (row.apiBaseUrl ? row.modelCode : row.ollamaModelName || row.modelFilePath || row.modelPath || row.modelCode),
    description: row.description || '',
    temperature: row.temperature ?? 0.7,
    supportsTemperature: hasStudentShape ? row.supportsTemperature !== false : modelCategory !== 'detection',
    tags: hasStudentShape ? normalizeTagList(row.tags) : extraTags,
    enabled: hasStudentShape ? Boolean(row.enabled) : (row.isAvailable ?? row.status === 'active'),
    isDefault: Boolean(row.isDefault),
    hasApiKey: Boolean(row.hasApiKey),
    apiKeyMask: row.hasApiKey ? '已配置' : '',
    editable: Boolean(row.editable),
    source: row.source,
    raw: row,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toViewTemplate(row) {
  return {
    id: row.id,
    templateName: row.templateName,
    taskType: row.taskType,
    description: row.description || '',
    promptText: row.promptText || '',
    variables: row.variables,
    modelId: row.modelId,
    isActive: row.isActive,
    usageCount: row.usageCount ?? 0,
    editable: row.editable ?? true,
    source: row.source || 'personal',
    raw: row,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function formatDateTime(value) {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function shouldReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateCollection(selector) {
  if (!pageRoot.value || shouldReduceMotion()) return
  const nodes = pageRoot.value.querySelectorAll(selector)
  if (!nodes.length) return
  gsap.fromTo(
    nodes,
    { autoAlpha: 0, y: 14, scale: 0.985 },
    { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, stagger: 0.05, ease: 'power2.out', overwrite: 'auto' },
  )
}

function animateHover(event, enter = true) {
  if (shouldReduceMotion()) return
  gsap.to(event.currentTarget, {
    y: enter ? -4 : 0,
    scale: enter ? 1.008 : 1,
    duration: 0.22,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}

async function loadProviders() {
  providerLoading.value = true
  try {
    const rows = await llmApi.studentProviders({
      keyword: providerQuery.keyword,
      enabled: normalizeEnabled(providerQuery.enabled),
    })
    providers.value = Array.isArray(rows) ? rows.map(toViewProvider) : []
    await nextTick()
    animateCollection('.student-model-row')
  } catch (error) {
    ElMessage.error(error?.message || '模型加载失败')
  } finally {
    providerLoading.value = false
  }
}

async function loadTemplates() {
  templateLoading.value = true
  try {
    const rows = await llmApi.studentTemplates({
      keyword: templateQuery.keyword,
      taskType: templateQuery.taskType,
    })
    templates.value = Array.isArray(rows) ? rows.map(toViewTemplate) : []
    if (templatePage.value > Math.max(1, Math.ceil(templates.value.length / templatePageSize))) {
      templatePage.value = 1
    }
    await nextTick()
    animateCollection('.student-template-row')
  } catch (error) {
    ElMessage.error(error?.message || '模板加载失败')
  } finally {
    templateLoading.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadProviders(), loadTemplates()])
  } finally {
    loading.value = false
  }
}

function openProviderDialog(row = null) {
  providerDialogMode.value = row ? 'edit' : 'create'
  resetObject(providerForm, blankProviderForm())
  if (row) {
    const kind = inferModelKind(row)
    const tagList = normalizeTagList(row.tags)
    const datasetTag = tagList.find((item) => item.startsWith('数据集:'))
    Object.assign(providerForm, {
      id: row.id,
      modelKind: kind,
      label: row.label || '',
      providerKey: row.providerKey || '',
      providerType: row.providerType || 'API',
      baseUrl: row.baseUrl || '',
      apiKey: '',
      model: row.model || '',
      temperature: Number(row.temperature ?? 0.2),
      supportsTemperature: Boolean(row.supportsTemperature),
      description: row.description || '',
      tags: tagList.filter((item) => !item.startsWith('数据集:')).join(', '),
      detectionType: inferDetectionType(row),
      dataset: datasetTag ? datasetTag.replace('数据集:', '').trim() : '',
      enabled: Boolean(row.enabled),
    })
  } else {
    providerForm.baseUrl = 'https://api.openai.com/v1'
  }
  providerDialogVisible.value = true
}

function buildProviderPayload() {
  const isApi = providerForm.modelKind === 'api'
  const isDetection = providerForm.modelKind === 'detection'
  const datasets = providerForm.dataset
    ? providerForm.dataset.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean)
    : []
  const baseUrl = providerForm.baseUrl?.trim() || (isApi
    ? 'https://api.openai.com/v1'
    : isDetection
      ? 'local://detector'
      : 'http://localhost:11434')
  const modelCode = providerForm.providerKey.trim() || providerForm.model.trim() || providerForm.label.trim()

  return {
    modelName: providerForm.label.trim(),
    modelCode,
    modelCategory: isApi ? 'api' : isDetection ? 'detection' : 'local_llm',
    modelType: isApi ? 'api' : isDetection ? providerForm.detectionType : 'ollama',
    provider: isApi ? inferProviderName(baseUrl, modelCode) : isDetection ? 'detector' : 'ollama',
    apiKey: providerForm.apiKey.trim(),
    apiBaseUrl: isApi ? baseUrl : '',
    configTemplate: isApi ? inferProviderName(baseUrl, modelCode) : '',
    ollamaModelName: !isApi && !isDetection ? providerForm.model.trim() : '',
    ollamaBaseUrl: !isApi && !isDetection ? baseUrl : '',
    modelPath: !isApi && !isDetection && providerForm.model.trim() && !providerForm.model.includes(':') ? providerForm.model.trim() : '',
    detectionType: isDetection ? providerForm.detectionType : '',
    modelFilePath: isDetection ? providerForm.model.trim() : '',
    supportedDatasets: datasets,
    description: providerForm.description.trim(),
    isAvailable: providerForm.enabled,
    status: providerForm.enabled ? 'active' : 'inactive',
    isDefault: false,
    temperature: Number(providerForm.temperature ?? 0.7),
    topP: 0.9,
    timeout: 120,
  }
}

function inferProviderName(baseUrl, modelCode) {
  const haystack = `${baseUrl || ''} ${modelCode || ''}`.toLowerCase()
  if (haystack.includes('deepseek')) return 'deepseek'
  if (haystack.includes('dashscope') || haystack.includes('qwen')) return 'dashscope'
  if (haystack.includes('moonshot') || haystack.includes('kimi')) return 'moonshot'
  if (haystack.includes('glm') || haystack.includes('zhipu')) return 'zhipu'
  if (haystack.includes('google') || haystack.includes('gemini')) return 'google'
  if (haystack.includes('hunyuan')) return 'hunyuan'
  if (haystack.includes('openai')) return 'openai'
  return 'custom'
}

async function saveProvider() {
  const payload = buildProviderPayload()
  const studentPayload = {
    providerKey: payload.modelCode,
    label: payload.modelName,
    providerType: payload.modelCategory === 'api' ? 'API' : 'LOCAL',
    baseUrl: payload.apiBaseUrl || payload.ollamaBaseUrl || payload.modelPath || payload.modelFilePath,
    apiKey: payload.apiKey,
    model: payload.ollamaModelName || payload.modelFilePath || payload.modelPath || payload.modelCode,
    temperature: payload.temperature,
    supportsTemperature: payload.modelCategory !== 'detection',
    description: payload.description,
    tags: [
      ...(Array.isArray(payload.supportedDatasets) ? payload.supportedDatasets : []),
      ...(payload.modelCategory === 'detection' && payload.detectionType ? [payload.detectionType] : []),
    ].join(', '),
  }
  if (!payload.modelName) {
    ElMessage.warning('请输入模型名称')
    return
  }
  if (!payload.modelCode) {
    ElMessage.warning('请输入模型调用 ID 或模型标识')
    return
  }
  if (!(payload.apiBaseUrl || payload.ollamaBaseUrl || payload.modelPath || payload.modelFilePath)) {
    ElMessage.warning('请输入 Base URL')
    return
  }

  providerSubmitting.value = true
  try {
    if (providerDialogMode.value === 'edit') {
      await llmApi.updateStudentProvider(providerForm.id, studentPayload)
      ElMessage.success('模型已更新')
    } else {
      await llmApi.createStudentProvider(studentPayload)
      ElMessage.success('模型已创建')
    }
    providerDialogVisible.value = false
    await loadProviders()
  } catch (error) {
    ElMessage.error(error?.message || '模型保存失败')
  } finally {
    providerSubmitting.value = false
  }
}

async function toggleProvider(row, enabled) {
  if (!row.editable) {
    ElMessage.warning('系统内置模型不能直接修改启停状态')
    return
  }
  try {
    await llmApi.setStudentProviderEnabled(row.id, enabled)
    ElMessage.success(enabled ? '模型已启用' : '模型已停用')
    await loadProviders()
  } catch (error) {
    ElMessage.error(error?.message || '状态更新失败')
    await loadProviders()
  }
}

async function setDefaultProvider(row) {
  if (!row.editable) {
    ElMessage.warning('当前仅支持将自己的模型设为默认')
    return
  }
  try {
    await llmApi.setStudentProviderDefault(row.id)
    ElMessage.success('默认模型已更新')
    await loadProviders()
  } catch (error) {
    ElMessage.error(error?.message || '默认模型设置失败')
  }
}

async function deleteProvider(row) {
  if (!row.editable) {
    ElMessage.warning('系统内置模型不能删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除模型“${row.label}”吗？删除后不可恢复。`, '删除模型', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await llmApi.deleteStudentProvider(row.id)
    ElMessage.success('模型已删除')
    await loadProviders()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '模型删除失败')
    }
  }
}

function openProviderDetail(row) {
  activeProvider.value = row
  detailVisible.value = true
}

function openTemplateDialog(row = null) {
  if (row && !row.editable) {
    ElMessage.warning('系统模板仅可查看，不能修改')
    return
  }
  templateDialogMode.value = row ? 'edit' : 'create'
  resetObject(templateForm, blankTemplateForm())
  if (row) {
    Object.assign(templateForm, {
      id: row.id,
      templateName: row.templateName || '',
      taskType: row.taskType || taskTypeOptions[0],
      description: row.description || '',
      promptText: row.promptText || '',
    })
  }
  templateDialogVisible.value = true
}

async function saveTemplate() {
  if (!templateForm.templateName.trim() || !templateForm.promptText.trim()) {
    ElMessage.warning('请完整填写模板信息')
    return
  }

  templateSubmitting.value = true
  try {
    const payload = {
      templateName: templateForm.templateName.trim(),
      taskType: templateForm.taskType,
      description: templateForm.description.trim(),
      promptText: templateForm.promptText.trim(),
    }
    if (templateDialogMode.value === 'edit') {
      await llmApi.updateStudentTemplate(templateForm.id, payload)
      ElMessage.success('模板已更新')
    } else {
      await llmApi.createStudentTemplate(payload)
      ElMessage.success('模板已创建')
    }
    templateDialogVisible.value = false
    templatePage.value = 1
    await loadTemplates()
  } catch (error) {
    ElMessage.error(error?.message || '模板保存失败')
  } finally {
    templateSubmitting.value = false
  }
}

async function deleteTemplate(row) {
  if (!row.editable) {
    ElMessage.warning('系统模板不能删除')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除模板“${row.templateName}”吗？删除后不可恢复。`, '删除模板', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await llmApi.deleteStudentTemplate(row.id)
    ElMessage.success('模板已删除')
    await loadTemplates()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '模板删除失败')
    }
  }
}

function openTemplateDetail(row) {
  activeTemplate.value = row
  templateDetailVisible.value = true
}

watch(activeTab, async () => {
  await nextTick()
  animateCollection(activeTab.value === 'models' ? '.student-model-row' : '.student-template-row')
})

watch(providerDialogVisible, async (visible) => {
  if (!visible || shouldReduceMotion()) return
  await nextTick()
  if (providerDialogBody.value) {
    gsap.fromTo(providerDialogBody.value, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' })
  }
})

watch(templateDialogVisible, async (visible) => {
  if (!visible || shouldReduceMotion()) return
  await nextTick()
  if (templateDialogBody.value) {
    gsap.fromTo(templateDialogBody.value, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' })
  }
})

onMounted(async () => {
  await loadAll()
  motionQuery = gsap.matchMedia()
  gsapContext = gsap.context(() => {
    motionQuery.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        desktop: '(min-width: 960px)',
      },
      ({ conditions }) => {
        if (conditions.reduceMotion) return
        const tl = gsap.timeline({ defaults: { duration: 0.46, ease: 'power2.out' } })
        tl.from('.student-llm-hero', { autoAlpha: 0, y: 20, scale: 0.985 })
          .from('.student-llm-tabs', { autoAlpha: 0, y: 14 }, '-=0.18')
          .from('.student-llm-panel', { autoAlpha: 0, y: conditions.desktop ? 22 : 12 }, '-=0.2')
      },
    )
  }, pageRoot.value)
})

onUnmounted(() => {
  motionQuery?.revert()
  gsapContext?.revert()
})
</script>

<template>
  <div ref="pageRoot" class="student-llm-page">
    <section class="student-llm-hero">
      <div class="hero-copy">
        <span class="hero-eyebrow">Model Center</span>
        <h1>大模型中心</h1>
        <p>默认模型：{{ defaultProviderName }}</p>
      </div>
      <div class="hero-metrics">
        <div class="hero-metric">
          <strong>{{ providerStats.total }}</strong>
          <span>模型总数</span>
        </div>
        <div class="hero-metric">
          <strong>{{ providerStats.api }}</strong>
          <span>API 模型</span>
        </div>
        <div class="hero-metric">
          <strong>{{ providerStats.local }}</strong>
          <span>本地模型</span>
        </div>
        <div class="hero-metric">
          <strong>{{ templates.length }}</strong>
          <span>指令模板</span>
        </div>
      </div>
    </section>

    <section class="student-llm-tabs">
      <button
        class="tab-pill"
        :class="{ 'is-active': activeTab === 'models' }"
        type="button"
        @click="activeTab = 'models'"
      >
        <el-icon><Setting /></el-icon>
        <span>模型管理</span>
      </button>
      <button
        class="tab-pill"
        :class="{ 'is-active': activeTab === 'templates' }"
        type="button"
        @click="activeTab = 'templates'"
      >
        <el-icon><Files /></el-icon>
        <span>指令模板管理</span>
      </button>
    </section>

    <section class="student-llm-panel" v-loading="loading">
      <template v-if="activeTab === 'models'">
        <div class="student-toolbar">
          <div class="toolbar-filters">
            <el-input
              v-model="providerQuery.keyword"
              :prefix-icon="Search"
              clearable
              placeholder="搜索模型名称、标识或描述"
              @keyup.enter="loadProviders"
            />
            <el-select v-model="providerQuery.enabled" clearable placeholder="启用状态">
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button :icon="Search" @click="loadProviders">筛选</el-button>
          </div>
          <div class="toolbar-actions">
            <span>{{ providers.length }} 个模型</span>
            <el-button type="primary" :icon="Plus" @click="openProviderDialog()">添加模型</el-button>
          </div>
        </div>

        <div class="model-section-stack">
          <section class="model-section-card">
            <header class="section-head is-api">
              <div class="section-title">
                <el-icon><Connection /></el-icon>
                <span>API 模型</span>
              </div>
              <b>{{ categorizedProviders.api.length }}</b>
            </header>
            <div v-loading="providerLoading" class="section-body">
              <template v-if="categorizedProviders.api.length">
                <article
                  v-for="row in categorizedProviders.api"
                  :key="`${row.source}-${row.id || row.providerKey}`"
                  class="student-model-row"
                  :class="{ 'is-default': row.isDefault, 'is-disabled': !row.enabled }"
                  @mouseenter="animateHover($event, true)"
                  @mouseleave="animateHover($event, false)"
                >
                  <div class="row-mark is-api"><el-icon><Cpu /></el-icon></div>
                  <div class="row-main">
                    <div class="row-title">
                      <h3>{{ row.label }}</h3>
                      <el-tag v-if="row.isDefault" type="success" effect="plain" round>默认</el-tag>
                      <el-tag :type="row.editable ? 'primary' : 'info'" effect="plain" round>{{ sourceText(row) }}</el-tag>
                    </div>
                    <p>{{ row.description || '暂无模型说明' }}</p>
                    <div class="row-meta">
                      <span>{{ row.providerKey }}</span>
                      <span>{{ row.model }}</span>
                      <span>{{ row.baseUrl }}</span>
                      <span v-if="row.hasApiKey">{{ row.apiKeyMask || '已配置 API Key' }}</span>
                    </div>
                  </div>
                  <div class="row-actions">
                    <el-button :icon="Star" link type="primary" @click="setDefaultProvider(row)">
                      {{ row.isDefault ? '当前默认' : '设为默认' }}
                    </el-button>
                    <el-button :icon="View" link @click="openProviderDetail(row)">详情</el-button>
                    <el-button v-if="row.editable" :icon="Edit" link type="warning" @click="openProviderDialog(row)">编辑</el-button>
                    <el-button v-if="row.editable" :icon="Delete" link type="danger" @click="deleteProvider(row)">删除</el-button>
                    <el-switch
                      v-if="row.editable"
                      :model-value="row.enabled"
                      size="small"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                      @change="(value) => toggleProvider(row, value)"
                    />
                  </div>
                </article>
              </template>
              <el-empty v-else description="暂无 API 模型，点击上方按钮添加" />
            </div>
          </section>

          <section class="model-section-card">
            <header class="section-head is-local">
              <div class="section-title">
                <el-icon><FolderOpened /></el-icon>
                <span>本地 LLM 模型</span>
              </div>
              <b>{{ categorizedProviders.local.length }}</b>
            </header>
            <div v-loading="providerLoading" class="section-body">
              <template v-if="categorizedProviders.local.length">
                <article
                  v-for="row in categorizedProviders.local"
                  :key="`${row.source}-${row.id || row.providerKey}`"
                  class="student-model-row"
                  :class="{ 'is-default': row.isDefault, 'is-disabled': !row.enabled }"
                  @mouseenter="animateHover($event, true)"
                  @mouseleave="animateHover($event, false)"
                >
                  <div class="row-mark is-local"><el-icon><Switch /></el-icon></div>
                  <div class="row-main">
                    <div class="row-title">
                      <h3>{{ row.label }}</h3>
                      <el-tag v-if="row.isDefault" type="success" effect="plain" round>默认</el-tag>
                      <el-tag :type="row.editable ? 'primary' : 'info'" effect="plain" round>{{ sourceText(row) }}</el-tag>
                    </div>
                    <p>{{ row.description || '暂无模型说明' }}</p>
                    <div class="row-meta">
                      <span>{{ row.providerKey }}</span>
                      <span>{{ row.model }}</span>
                      <span>{{ row.baseUrl }}</span>
                    </div>
                  </div>
                  <div class="row-actions">
                    <el-button :icon="Star" link type="primary" @click="setDefaultProvider(row)">
                      {{ row.isDefault ? '当前默认' : '设为默认' }}
                    </el-button>
                    <el-button :icon="View" link @click="openProviderDetail(row)">详情</el-button>
                    <el-button v-if="row.editable" :icon="Edit" link type="warning" @click="openProviderDialog(row)">编辑</el-button>
                    <el-button v-if="row.editable" :icon="Delete" link type="danger" @click="deleteProvider(row)">删除</el-button>
                    <el-switch
                      v-if="row.editable"
                      :model-value="row.enabled"
                      size="small"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                      @change="(value) => toggleProvider(row, value)"
                    />
                  </div>
                </article>
              </template>
              <el-empty v-else description="暂无本地模型，点击上方按钮添加" />
            </div>
          </section>

          <section class="model-section-card">
            <header class="section-head is-detection">
              <div class="section-title">
                <el-icon><Document /></el-icon>
                <span>检测模型</span>
              </div>
              <b>{{ categorizedProviders.detection.length }}</b>
            </header>
            <div v-loading="providerLoading" class="section-body">
              <template v-if="categorizedProviders.detection.length">
                <article
                  v-for="row in categorizedProviders.detection"
                  :key="`${row.source}-${row.id || row.providerKey}`"
                  class="student-model-row"
                  :class="{ 'is-default': row.isDefault, 'is-disabled': !row.enabled }"
                  @mouseenter="animateHover($event, true)"
                  @mouseleave="animateHover($event, false)"
                >
                  <div class="row-mark is-detection"><el-icon><CircleCheck /></el-icon></div>
                  <div class="row-main">
                    <div class="row-title">
                      <h3>{{ row.label }}</h3>
                      <el-tag v-if="row.isDefault" type="success" effect="plain" round>默认</el-tag>
                      <el-tag :type="row.editable ? 'primary' : 'info'" effect="plain" round>{{ sourceText(row) }}</el-tag>
                    </div>
                    <p>{{ row.description || '暂无模型说明' }}</p>
                    <div class="row-meta">
                      <span>{{ row.providerKey }}</span>
                      <span>{{ row.model }}</span>
                      <span>{{ row.baseUrl }}</span>
                    </div>
                  </div>
                  <div class="row-actions">
                    <el-button :icon="Star" link type="primary" @click="setDefaultProvider(row)">
                      {{ row.isDefault ? '当前默认' : '设为默认' }}
                    </el-button>
                    <el-button :icon="View" link @click="openProviderDetail(row)">详情</el-button>
                    <el-button v-if="row.editable" :icon="Edit" link type="warning" @click="openProviderDialog(row)">编辑</el-button>
                    <el-button v-if="row.editable" :icon="Delete" link type="danger" @click="deleteProvider(row)">删除</el-button>
                    <el-switch
                      v-if="row.editable"
                      :model-value="row.enabled"
                      size="small"
                      inline-prompt
                      active-text="开"
                      inactive-text="关"
                      @change="(value) => toggleProvider(row, value)"
                    />
                  </div>
                </article>
              </template>
              <el-empty v-else description="暂无检测模型，点击上方按钮添加" />
            </div>
          </section>
        </div>
      </template>

      <template v-else>
        <div class="student-toolbar">
          <div class="toolbar-filters">
            <el-input
              v-model="templateQuery.keyword"
              :prefix-icon="Search"
              clearable
              placeholder="搜索模板名称、任务类型或说明"
              @keyup.enter="loadTemplates"
            />
            <el-select v-model="templateQuery.taskType" clearable placeholder="任务类型">
              <el-option
                v-for="item in taskTypeOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
            <el-button :icon="Search" @click="loadTemplates">筛选</el-button>
          </div>
          <div class="toolbar-actions">
            <span>共 {{ templates.length }} 个模板</span>
            <el-button type="primary" :icon="Plus" @click="openTemplateDialog()">创建模板</el-button>
          </div>
        </div>

        <section class="template-board">
          <el-table v-loading="templateLoading" :data="paginatedTemplates" class="template-table">
            <el-table-column prop="templateName" label="模板名称" min-width="180" />
            <el-table-column prop="taskType" label="任务类型" width="180">
              <template #default="{ row }">
                <el-tag effect="plain" round>{{ row.taskType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="300" show-overflow-tooltip />
            <el-table-column label="创建时间" width="180">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="210" fixed="right">
              <template #default="{ row }">
                <div class="table-actions student-template-row">
                  <el-button :icon="Edit" link type="primary" @click="openTemplateDialog(row)">编辑</el-button>
                  <el-button :icon="View" link @click="openTemplateDetail(row)">详情</el-button>
                  <el-button :icon="Delete" link type="danger" @click="deleteTemplate(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无模板，点击上方按钮创建" />
            </template>
          </el-table>
          <div class="template-footer">
            <span>显示 {{ paginatedTemplates.length }} / {{ templates.length }} 条</span>
            <el-pagination
              v-model:current-page="templatePage"
              layout="prev, pager, next"
              :page-size="templatePageSize"
              :total="templates.length"
              background
            />
          </div>
        </section>
      </template>
    </section>

    <el-dialog
      v-model="providerDialogVisible"
      :title="providerDialogMode === 'edit' ? '编辑模型' : '添加模型'"
      width="860px"
      destroy-on-close
    >
      <div ref="providerDialogBody" class="dialog-body">
        <el-form :model="providerForm" label-position="top">
          <el-form-item label="模型类型">
            <el-radio-group v-model="providerForm.modelKind" class="kind-radio-group">
              <el-radio-button
                v-for="item in modelKindOptions"
                :key="item.value"
                :label="item.value"
              >
                {{ item.label }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="模型名称">
                <el-input v-model="providerForm.label" placeholder="例如：通义千问-qwen-flash" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="模型标识">
                <el-input v-model="providerForm.providerKey" placeholder="例如：qwen-flash-personal" />
              </el-form-item>
            </el-col>

            <el-col :span="24">
              <el-form-item label="模型描述">
                <el-input v-model="providerForm.description" placeholder="例如：用于在线问答 / 风险复核 / 轻量推理" />
              </el-form-item>
            </el-col>

            <el-col v-if="providerForm.modelKind === 'detection'" :span="12">
              <el-form-item label="检测类型">
                <el-select v-model="providerForm.detectionType" style="width: 100%">
                  <el-option
                    v-for="item in detectionTypeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.modelKind === 'detection'" :span="12">
              <el-form-item label="适配数据集">
                <el-input v-model="providerForm.dataset" placeholder="例如：reddit / weibo / bigdata" />
              </el-form-item>
            </el-col>

            <el-col :span="12">
              <el-form-item :label="providerForm.modelKind === 'detection' ? '模型调用 ID' : '模型调用 ID / 版本'">
                <el-input
                  v-model="providerForm.model"
                  :placeholder="providerForm.modelKind === 'api' ? '例如：gpt-4.1-mini / qwen3.6-plus' : providerForm.modelKind === 'local' ? '例如：qwen2.5:7b' : '例如：emoji / fealearner'"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="Base URL">
                <el-input
                  v-model="providerForm.baseUrl"
                  :placeholder="providerForm.modelKind === 'api' ? 'https://api.example.com/v1' : providerForm.modelKind === 'local' ? 'http://localhost:11434' : 'local://detector'"
                />
              </el-form-item>
            </el-col>

            <el-col v-if="providerForm.modelKind === 'api'" :span="12">
              <el-form-item label="API Key">
                <el-input
                  v-model="providerForm.apiKey"
                  type="password"
                  show-password
                  :placeholder="providerDialogMode === 'edit' ? '留空则保持原有 API Key' : '请输入 API Key'"
                />
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.modelKind !== 'detection'" :span="6">
              <el-form-item label="支持温度">
                <el-switch v-model="providerForm.supportsTemperature" />
              </el-form-item>
            </el-col>
            <el-col v-if="providerForm.modelKind !== 'detection'" :span="6">
              <el-form-item label="温度">
                <el-input-number
                  v-model="providerForm.temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :disabled="!providerForm.supportsTemperature"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>

            <el-col :span="24">
              <el-form-item label="标签">
                <el-input v-model="providerForm.tags" placeholder="多个标签用逗号分隔，例如：自定义、推理、低成本" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="启用状态">
                <el-switch v-model="providerForm.enabled" inline-prompt active-text="启用" inactive-text="停用" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="providerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="providerSubmitting" @click="saveProvider">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="templateDialogVisible"
      :title="templateDialogMode === 'edit' ? '编辑指令模板' : '创建指令模板'"
      width="760px"
      destroy-on-close
    >
      <div ref="templateDialogBody" class="dialog-body">
        <el-form :model="templateForm" label-position="top">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="模板名称">
                <el-input v-model="templateForm.templateName" placeholder="请输入模板名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="任务类型">
                <el-select v-model="templateForm.taskType" style="width: 100%">
                  <el-option
                    v-for="item in taskTypeOptions"
                    :key="item"
                    :label="item"
                    :value="item"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="检测类型/说明">
                <el-input v-model="templateForm.description" placeholder="如：文本风险检测、多模态联合检测等" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="提示词内容">
                <el-input
                  v-model="templateForm.promptText"
                  type="textarea"
                  :rows="10"
                  placeholder="支持变量占位符，如 {{user_input}}、{{context}}，用于调用大模型时的 system/user 模板"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="templateSubmitting" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="模型详情" size="42%">
      <div v-if="activeProvider" class="detail-panel">
        <div class="detail-header">
          <div class="row-mark" :class="`is-${inferModelKind(activeProvider)}`">
            <el-icon><Cpu /></el-icon>
          </div>
          <div>
            <h3>{{ activeProvider.label }}</h3>
            <p>{{ kindLabel(inferModelKind(activeProvider)) }}</p>
          </div>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模型标识">{{ activeProvider.providerKey }}</el-descriptions-item>
          <el-descriptions-item label="模型调用 ID">{{ activeProvider.model }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ sourceText(activeProvider) }}</el-descriptions-item>
          <el-descriptions-item label="Base URL">{{ activeProvider.baseUrl }}</el-descriptions-item>
          <el-descriptions-item label="启用状态">{{ activeProvider.enabled ? '启用' : '停用' }}</el-descriptions-item>
          <el-descriptions-item label="默认模型">{{ activeProvider.isDefault ? '是' : '否' }}</el-descriptions-item>
          <el-descriptions-item label="API Key">{{ activeProvider.hasApiKey ? activeProvider.apiKeyMask || '已配置' : '未配置' }}</el-descriptions-item>
          <el-descriptions-item label="标签">{{ normalizeTagList(activeProvider.tags).join('、') || '暂无标签' }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ activeProvider.description || '暂无描述' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(activeProvider.updatedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>

    <el-drawer v-model="templateDetailVisible" title="模板详情" size="44%">
      <div v-if="activeTemplate" class="detail-panel">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模板名称">{{ activeTemplate.templateName }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">{{ activeTemplate.taskType }}</el-descriptions-item>
          <el-descriptions-item label="说明">{{ activeTemplate.description || '暂无说明' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(activeTemplate.updatedAt || activeTemplate.createdAt) }}</el-descriptions-item>
        </el-descriptions>
        <el-input :model-value="activeTemplate.promptText" type="textarea" :rows="14" readonly />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.student-llm-page {
  width: min(1420px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
  padding-bottom: 28px;
}

.student-llm-hero {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 18px;
  min-height: 156px;
  padding: 28px 30px;
  border: 1px solid rgba(176, 221, 214, 0.72);
  border-radius: 26px;
  background:
    radial-gradient(circle at left top, rgba(31, 191, 152, 0.14), transparent 34%),
    radial-gradient(circle at right center, rgba(92, 154, 255, 0.16), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(246, 252, 250, 0.95));
  box-shadow: 0 24px 64px rgba(33, 83, 73, 0.08);
}

.hero-copy {
  display: grid;
  align-content: start;
  gap: 8px;
}

.hero-eyebrow {
  display: inline-flex;
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(17, 181, 144, 0.12);
  color: #099978;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0;
  font-size: 36px;
  line-height: 1.1;
  color: #172c2a;
}

.hero-copy p {
  margin: 0;
  font-size: 15px;
  color: #5c726d;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-width: min(620px, 100%);
}

.hero-metric {
  min-width: 0;
  display: grid;
  gap: 6px;
  align-content: center;
  padding: 18px;
  border: 1px solid rgba(205, 232, 226, 0.84);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
}

.hero-metric strong {
  font-size: 28px;
  line-height: 1;
  color: #182f2d;
}

.hero-metric span {
  color: #69807a;
  font-size: 13px;
  font-weight: 600;
}

.student-llm-tabs {
  width: fit-content;
  display: inline-flex;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(201, 214, 230, 0.8);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 14px 36px rgba(42, 72, 93, 0.08);
}

.tab-pill {
  min-width: 154px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: #5f7181;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.22s ease;
}

.tab-pill.is-active {
  background: linear-gradient(135deg, #296dff, #4e90ff);
  color: #fff;
  box-shadow: 0 12px 24px rgba(41, 109, 255, 0.22);
}

.student-llm-panel {
  display: grid;
  gap: 18px;
}

.student-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border: 1px solid rgba(215, 227, 234, 0.9);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 42px rgba(38, 60, 78, 0.06);
}

.toolbar-filters,
.toolbar-actions,
.section-title,
.row-title,
.row-meta,
.row-actions,
.table-actions,
.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-filters {
  flex-wrap: wrap;
}

.toolbar-filters .el-input {
  width: 300px;
}

.toolbar-filters .el-select {
  width: 150px;
}

.toolbar-actions {
  color: #667c77;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.model-section-stack {
  display: grid;
  gap: 18px;
}

.model-section-card,
.template-board {
  overflow: hidden;
  border: 1px solid rgba(216, 228, 234, 0.92);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 48px rgba(38, 60, 78, 0.07);
}

.section-head {
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(221, 230, 238, 0.9);
}

.section-head b {
  min-width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  font-size: 12px;
}

.section-head.is-api {
  background: linear-gradient(90deg, rgba(231, 241, 255, 0.96), rgba(247, 250, 255, 0.96));
}

.section-head.is-api b {
  background: #dbe8ff;
  color: #346ef8;
}

.section-head.is-local {
  background: linear-gradient(90deg, rgba(227, 250, 244, 0.96), rgba(247, 255, 252, 0.96));
}

.section-head.is-local b {
  background: #c9f2e6;
  color: #11997b;
}

.section-head.is-detection {
  background: linear-gradient(90deg, rgba(243, 233, 255, 0.96), rgba(251, 247, 255, 0.96));
}

.section-head.is-detection b {
  background: #ead6ff;
  color: #8d54dd;
}

.section-title {
  color: #19302e;
  font-size: 15px;
  font-weight: 800;
}

.section-body {
  display: grid;
}

.student-model-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #edf2f6;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 252, 253, 0.92));
  will-change: transform;
}

.student-model-row:last-child {
  border-bottom: none;
}

.student-model-row.is-default {
  background: linear-gradient(180deg, rgba(241, 253, 249, 0.98), rgba(249, 255, 252, 0.95));
}

.student-model-row.is-disabled {
  opacity: 0.65;
}

.row-mark {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 20px;
}

.row-mark.is-api {
  background: linear-gradient(135deg, #4a8cff, #296dff);
}

.row-mark.is-local {
  background: linear-gradient(135deg, #2fc8a2, #0cae86);
}

.row-mark.is-detection {
  background: linear-gradient(135deg, #ba70ff, #9553ff);
}

.row-main {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.row-title {
  flex-wrap: wrap;
}

.row-title h3 {
  margin: 0;
  font-size: 17px;
  color: #162a28;
}

.row-main p {
  margin: 0;
  color: #67807a;
  font-size: 13px;
  line-height: 1.6;
}

.row-meta {
  flex-wrap: wrap;
}

.row-meta span {
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f3f7fb;
  color: #627784;
  font-size: 12px;
  font-weight: 600;
}

.row-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.template-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px 18px;
  border-top: 1px solid #edf2f6;
  color: #667c77;
  font-size: 13px;
}

.dialog-body {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 4px;
}

.kind-radio-group {
  width: 100%;
}

.kind-radio-group :deep(.el-radio-button__inner) {
  min-width: 132px;
}

.detail-panel {
  display: grid;
  gap: 16px;
}

.detail-header h3 {
  margin: 0 0 4px;
  font-size: 20px;
  color: #172e2b;
}

.detail-header p {
  margin: 0;
  color: #67807a;
}

@media (max-width: 1200px) {
  .student-llm-hero {
    grid-template-columns: 1fr;
    display: grid;
  }

  .hero-metrics {
    min-width: 0;
  }
}

@media (max-width: 980px) {
  .hero-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .student-toolbar,
  .student-model-row,
  .template-footer {
    grid-template-columns: 1fr;
    display: grid;
  }

  .row-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .student-llm-page {
    width: 100%;
  }

  .student-llm-hero {
    padding: 22px 18px;
    border-radius: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .student-llm-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .tab-pill {
    min-width: 0;
  }

  .toolbar-filters .el-input,
  .toolbar-filters .el-select {
    width: 100%;
  }

  .student-model-row {
    grid-template-columns: 1fr;
  }
}
</style>
