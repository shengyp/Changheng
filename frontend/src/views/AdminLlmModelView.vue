<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  CircleCheck,
  Cpu,
  Delete,
  Document,
  Edit,
  Plus,
  Search,
  Setting,
  Star,
  View,
} from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import { llmApi } from '@/api/services'

const pageRoot = ref(null)
const managerShell = ref(null)
const providerDialogBody = ref(null)
const templateDialogBody = ref(null)
let gsapContext
let motionQuery

const activeTab = ref('providers')
const loading = ref(false)
const providerLoading = ref(false)
const templateLoading = ref(false)
const providers = ref([])
const templates = ref([])
const detailVisible = ref(false)
const activeProvider = ref(null)
const templateDetailVisible = ref(false)
const activeTemplate = ref(null)

const providerDialogVisible = ref(false)
const providerDialogMode = ref('create')
const providerSubmitting = ref(false)
const providerForm = reactive(blankProviderForm())

const templateDialogVisible = ref(false)
const templateDialogMode = ref('create')
const templateSubmitting = ref(false)
const templateForm = reactive(blankTemplateForm())

const providerQuery = reactive({
  keyword: '',
  providerType: '',
  enabled: '',
})

const templateQuery = reactive({
  keyword: '',
  taskType: '',
})

const providerTypeOptions = [
  { label: 'API 模型', value: 'API' },
  { label: '本地 LLM 模型', value: 'LOCAL' },
]

const taskTypeOptions = [
  { label: '错题讲解', value: '错题讲解' },
  { label: '编程调试', value: '编程调试' },
  { label: '知识点归纳', value: '知识点归纳' },
  { label: '类似题训练', value: '类似题训练' },
]

const providerStats = computed(() => {
  const rows = providers.value || []
  return {
    total: rows.length,
    managed: rows.filter((item) => item.editable).length,
    readonly: rows.filter((item) => !item.editable).length,
    enabled: rows.filter((item) => item.enabled).length,
    templates: templates.value.length,
  }
})

const defaultProviderName = computed(() => providers.value.find((item) => item.isDefault)?.label || '未设置')

function blankProviderForm() {
  return {
    id: null,
    providerKey: '',
    label: '',
    providerType: 'API',
    baseUrl: '',
    apiKey: '',
    model: '',
    temperature: 0.2,
    supportsTemperature: true,
    description: '',
    tags: '',
  }
}

function blankTemplateForm() {
  return {
    id: null,
    templateName: '',
    taskType: '错题讲解',
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

function formatProviderType(type) {
  return providerTypeOptions.find((item) => item.value === type)?.label || type || '未知类型'
}

function sourceText(row) {
  return row.editable ? '后台系统' : '配置只读'
}

async function showTemplateManager() {
  activeTab.value = 'templates'
  await nextTick()
  managerShell.value?.scrollIntoView({
    behavior: shouldReduceMotion() ? 'auto' : 'smooth',
    block: 'start',
  })
  if (managerShell.value && !shouldReduceMotion()) {
    gsap.fromTo(
      managerShell.value,
      { autoAlpha: 0.92, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.26, ease: 'power2.out', overwrite: 'auto' },
    )
  }
}

async function loadProviders() {
  providerLoading.value = true
  try {
    const rows = await llmApi.adminProviders({
      keyword: providerQuery.keyword,
      providerType: providerQuery.providerType,
      enabled: normalizeEnabled(providerQuery.enabled),
      includeReadonly: true,
    })
    providers.value = Array.isArray(rows) ? rows : []
    await nextTick()
    animateCollection('.model-card')
  } catch (error) {
    ElMessage.error(error?.message || '系统模型加载失败')
  } finally {
    providerLoading.value = false
  }
}

async function loadTemplates() {
  templateLoading.value = true
  try {
    const rows = await llmApi.adminTemplates(templateQuery)
    templates.value = Array.isArray(rows) ? rows : []
    await nextTick()
    animateCollection('.template-list .el-table__row')
  } catch (error) {
    ElMessage.error(error?.message || '系统模板加载失败')
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
    Object.assign(providerForm, {
      id: row.id,
      providerKey: row.providerKey,
      label: row.label,
      providerType: row.providerType || 'API',
      baseUrl: row.baseUrl || '',
      apiKey: '',
      model: row.model || '',
      temperature: Number(row.temperature ?? 0.2),
      supportsTemperature: Boolean(row.supportsTemperature),
      description: row.description || '',
      tags: Array.isArray(row.tags) ? row.tags.join(', ') : '',
    })
  }
  providerDialogVisible.value = true
}

async function saveProvider() {
  providerSubmitting.value = true
  try {
    const payload = { ...providerForm }
    if (providerDialogMode.value === 'edit') {
      await llmApi.updateAdminProvider(providerForm.id, payload)
      ElMessage.success('系统模型已更新')
    } else {
      await llmApi.createAdminProvider(payload)
      ElMessage.success('系统模型已添加')
    }
    providerDialogVisible.value = false
    await loadProviders()
  } catch (error) {
    ElMessage.error(error?.message || '系统模型保存失败')
  } finally {
    providerSubmitting.value = false
  }
}

async function toggleProvider(row, enabled) {
  if (!row.editable) return
  try {
    await llmApi.setAdminProviderEnabled(row.id, enabled)
    ElMessage.success(enabled ? '系统模型已启用' : '系统模型已停用')
    await loadProviders()
  } catch (error) {
    ElMessage.error(error?.message || '状态更新失败')
    await loadProviders()
  }
}

async function setDefaultProvider(row) {
  if (!row.editable) {
    ElMessage.warning('配置文件模型为只读，不能设为后台默认')
    return
  }
  try {
    await llmApi.setAdminProviderDefault(row.id)
    ElMessage.success('系统默认模型已更新')
    await loadProviders()
  } catch (error) {
    ElMessage.error(error?.message || '默认模型更新失败')
  }
}

async function deleteProvider(row) {
  if (!row.editable) return
  try {
    await ElMessageBox.confirm(`确定删除系统模型「${row.label}」吗？`, '删除系统模型', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await llmApi.deleteAdminProvider(row.id)
    ElMessage.success('系统模型已删除')
    await loadProviders()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '系统模型删除失败')
    }
  }
}

function openProviderDetail(row) {
  activeProvider.value = row
  detailVisible.value = true
}

function editProviderFromDetail() {
  if (!activeProvider.value?.editable) return
  detailVisible.value = false
  openProviderDialog(activeProvider.value)
}

function openTemplateDialog(row = null) {
  templateDialogMode.value = row ? 'edit' : 'create'
  resetObject(templateForm, blankTemplateForm())
  if (row) {
    Object.assign(templateForm, {
      id: row.id,
      templateName: row.templateName,
      taskType: row.taskType,
      description: row.description || '',
      promptText: row.promptText || '',
    })
  }
  templateDialogVisible.value = true
}

function openTemplateDetail(row) {
  activeTemplate.value = row
  templateDetailVisible.value = true
}

async function saveTemplate() {
  templateSubmitting.value = true
  try {
    const payload = { ...templateForm }
    if (templateDialogMode.value === 'edit') {
      await llmApi.updateAdminTemplate(templateForm.id, payload)
      ElMessage.success('系统模板已更新')
    } else {
      await llmApi.createAdminTemplate(payload)
      ElMessage.success('系统模板已添加')
    }
    templateDialogVisible.value = false
    await loadTemplates()
  } catch (error) {
    ElMessage.error(error?.message || '系统模板保存失败')
  } finally {
    templateSubmitting.value = false
  }
}

async function deleteTemplate(row) {
  try {
    await ElMessageBox.confirm(`确定删除系统模板「${row.templateName}」吗？`, '删除系统模板', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await llmApi.deleteAdminTemplate(row.id)
    ElMessage.success('系统模板已删除')
    await loadTemplates()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '系统模板删除失败')
    }
  }
}

function shouldReduceMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function animateCollection(selector) {
  if (!pageRoot.value || shouldReduceMotion()) return
  const items = pageRoot.value.querySelectorAll(selector)
  if (!items.length) return
  gsap.fromTo(
    items,
    { autoAlpha: 0, y: 14 },
    { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.045, ease: 'power2.out', overwrite: 'auto' },
  )
}

function animateHover(event, enter = true) {
  if (shouldReduceMotion()) return
  gsap.to(event.currentTarget, {
    y: enter ? -5 : 0,
    scale: enter ? 1.01 : 1,
    duration: 0.22,
    ease: 'power2.out',
    overwrite: 'auto',
  })
}

watch(activeTab, async () => {
  await nextTick()
  animateCollection(activeTab.value === 'providers' ? '.model-card' : '.template-list .el-table__row')
})

watch(providerDialogVisible, async (visible) => {
  if (!visible || shouldReduceMotion()) return
  await nextTick()
  if (providerDialogBody.value) {
    gsap.fromTo(providerDialogBody.value, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' })
  }
})

watch(templateDialogVisible, async (visible) => {
  if (!visible || shouldReduceMotion()) return
  await nextTick()
  if (templateDialogBody.value) {
    gsap.fromTo(templateDialogBody.value, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' })
  }
})

onMounted(async () => {
  await loadAll()
  motionQuery = gsap.matchMedia()
  gsapContext = gsap.context(() => {
    motionQuery.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        desktop: '(min-width: 900px)',
      },
      ({ conditions }) => {
        if (conditions.reduceMotion) return
        const tl = gsap.timeline({ defaults: { duration: 0.42, ease: 'power2.out' } })
        tl.from('.llm-hero', { autoAlpha: 0, y: 18 })
          .from('.metric-card', { autoAlpha: 0, y: 18, stagger: 0.06 }, '<0.08')
          .from('.manager-shell', { autoAlpha: 0, y: conditions.desktop ? 18 : 10 }, '<0.12')
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
  <div ref="pageRoot" class="admin-llm-page">
    <section class="llm-hero">
      <div>
        <p class="eyebrow">Admin Model Center</p>
        <h1>大模型管理</h1>
        <p class="hero-copy">系统默认模型：{{ defaultProviderName }}</p>
      </div>
      <div class="hero-actions">
        <el-button :icon="Document" plain @click="showTemplateManager">指令模板</el-button>
        <el-button type="primary" :icon="Plus" @click="openProviderDialog()">添加系统模型</el-button>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-card">
        <el-icon><Cpu /></el-icon>
        <div><strong>{{ providerStats.total }}</strong><span>展示模型</span></div>
      </div>
      <div class="metric-card">
        <el-icon><Setting /></el-icon>
        <div><strong>{{ providerStats.managed }}</strong><span>后台管理</span></div>
      </div>
      <div class="metric-card">
        <el-icon><CircleCheck /></el-icon>
        <div><strong>{{ providerStats.enabled }}</strong><span>启用中</span></div>
      </div>
      <div class="metric-card">
        <el-icon><Document /></el-icon>
        <div><strong>{{ providerStats.templates }}</strong><span>指令模板</span></div>
      </div>
    </section>

    <section ref="managerShell" v-loading="loading" class="manager-shell">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="模型管理" name="providers">
          <div class="toolbar">
            <el-input v-model="providerQuery.keyword" :prefix-icon="Search" clearable placeholder="搜索系统模型、标识或标签" @keyup.enter="loadProviders" />
            <el-select v-model="providerQuery.providerType" clearable placeholder="模型类型">
              <el-option v-for="item in providerTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-model="providerQuery.enabled" clearable placeholder="启用状态">
              <el-option label="启用" :value="true" />
              <el-option label="停用" :value="false" />
            </el-select>
            <el-button :icon="Search" @click="loadProviders">筛选</el-button>
            <el-button type="primary" :icon="Plus" @click="openProviderDialog()">添加系统模型</el-button>
          </div>

          <div v-loading="providerLoading" class="model-grid">
            <article
              v-for="row in providers"
              :key="`${row.source}-${row.id || row.providerKey}`"
              class="model-card"
              :class="{ 'is-default': row.isDefault, 'is-disabled': !row.enabled }"
              @mouseenter="animateHover($event, true)"
              @mouseleave="animateHover($event, false)"
            >
              <div class="model-card__top">
                <div class="model-mark"><el-icon><Cpu /></el-icon></div>
                <div class="model-title">
                  <h3>{{ row.label }}</h3>
                  <span class="mono">{{ row.providerKey }}</span>
                </div>
                <el-tag :type="row.editable ? 'primary' : 'info'" effect="plain">{{ sourceText(row) }}</el-tag>
              </div>
              <p class="model-desc">{{ row.description || '暂无模型描述' }}</p>
              <div class="model-meta">
                <span>{{ formatProviderType(row.providerType) }}</span>
                <span class="mono">{{ row.model }}</span>
                <span>{{ row.supportsTemperature ? `温度 ${row.temperature ?? 0.2}` : '固定温度' }}</span>
              </div>
              <div class="tag-line">
                <el-tag v-for="tag in row.tags || []" :key="tag" size="small" round>{{ tag }}</el-tag>
                <el-tag v-if="row.hasApiKey" size="small" type="success" round>{{ row.apiKeyMask || '已配置密钥' }}</el-tag>
              </div>
              <div class="model-actions">
                <el-button :icon="Star" link type="primary" :disabled="!row.editable" @click="setDefaultProvider(row)">
                  {{ row.isDefault ? '系统默认' : '设为默认' }}
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
            <el-empty v-if="!providerLoading && !providers.length" description="暂无系统模型" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="指令模板" name="templates">
          <div class="toolbar">
            <el-input v-model="templateQuery.keyword" :prefix-icon="Search" clearable placeholder="搜索系统模板、任务或提示词" @keyup.enter="loadTemplates" />
            <el-select v-model="templateQuery.taskType" clearable placeholder="任务类型">
              <el-option v-for="item in taskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button :icon="Search" @click="loadTemplates">筛选</el-button>
            <el-button type="primary" :icon="Plus" @click="openTemplateDialog()">添加系统模板</el-button>
          </div>

          <el-table v-loading="templateLoading" :data="templates" class="template-table template-list">
            <el-table-column prop="templateName" label="模板名称" min-width="170" />
            <el-table-column prop="taskType" label="任务类型" width="130">
              <template #default="{ row }"><el-tag effect="plain">{{ row.taskType }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column prop="promptText" label="提示词" min-width="280" show-overflow-tooltip />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <div class="template-actions">
                  <el-button :icon="View" link @click="openTemplateDetail(row)">查看</el-button>
                  <el-button :icon="Edit" link type="primary" @click="openTemplateDialog(row)">编辑</el-button>
                  <el-button :icon="Delete" link type="danger" @click="deleteTemplate(row)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </section>

    <el-dialog v-model="providerDialogVisible" :title="providerDialogMode === 'edit' ? '编辑系统模型' : '添加系统模型'" width="760px" destroy-on-close>
      <div ref="providerDialogBody" class="dialog-body">
        <el-form :model="providerForm" label-position="top">
          <el-row :gutter="14">
            <el-col :span="12"><el-form-item label="模型名称"><el-input v-model="providerForm.label" /></el-form-item></el-col>
            <el-col :span="12">
              <el-form-item label="模型类型">
                <el-select v-model="providerForm.providerType" style="width: 100%">
                  <el-option v-for="item in providerTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12"><el-form-item label="模型标识"><el-input v-model="providerForm.providerKey" placeholder="例如 qwen-admin" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="模型名称/版本"><el-input v-model="providerForm.model" placeholder="例如 qwen3-coder-30b" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="Base URL"><el-input v-model="providerForm.baseUrl" placeholder="https://example.com/v1" /></el-form-item></el-col>
            <el-col :span="12">
              <el-form-item label="API Key">
                <el-input v-model="providerForm.apiKey" type="password" show-password :placeholder="providerDialogMode === 'edit' ? '留空则保留原密钥' : '请输入 API Key'" />
              </el-form-item>
            </el-col>
            <el-col :span="6"><el-form-item label="支持温度"><el-switch v-model="providerForm.supportsTemperature" /></el-form-item></el-col>
            <el-col :span="6"><el-form-item label="温度"><el-input-number v-model="providerForm.temperature" :min="0" :max="2" :step="0.1" :disabled="!providerForm.supportsTemperature" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="标签"><el-input v-model="providerForm.tags" placeholder="用逗号分隔" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="描述"><el-input v-model="providerForm.description" type="textarea" :rows="3" /></el-form-item></el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="providerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="providerSubmitting" @click="saveProvider">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="templateDialogVisible" :title="templateDialogMode === 'edit' ? '编辑系统模板' : '添加系统模板'" width="720px" destroy-on-close>
      <div ref="templateDialogBody" class="dialog-body">
        <el-form :model="templateForm" label-position="top">
          <el-row :gutter="14">
            <el-col :span="12"><el-form-item label="模板名称"><el-input v-model="templateForm.templateName" /></el-form-item></el-col>
            <el-col :span="12">
              <el-form-item label="任务类型">
                <el-select v-model="templateForm.taskType" style="width: 100%">
                  <el-option v-for="item in taskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24"><el-form-item label="说明"><el-input v-model="templateForm.description" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="提示词"><el-input v-model="templateForm.promptText" type="textarea" :rows="8" /></el-form-item></el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="templateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="templateSubmitting" @click="saveTemplate">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="系统模型详情" size="42%">
      <div v-if="activeProvider" class="detail-panel">
        <div class="detail-title">
          <div class="model-mark"><el-icon><Cpu /></el-icon></div>
          <div><h3>{{ activeProvider.label }}</h3><span class="mono">{{ activeProvider.providerKey }}</span></div>
        </div>
        <div class="detail-toolbar">
          <el-button type="primary" :icon="Edit" @click="editProviderFromDetail">编辑模型</el-button>
          <el-button v-if="activeProvider.providerType === 'API'" :icon="Setting" @click="editProviderFromDetail">配置 API</el-button>
        </div>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="来源">{{ sourceText(activeProvider) }}</el-descriptions-item>
          <el-descriptions-item label="模型类型">{{ formatProviderType(activeProvider.providerType) }}</el-descriptions-item>
          <el-descriptions-item label="模型标识">{{ activeProvider.model }}</el-descriptions-item>
          <el-descriptions-item label="Base URL">{{ activeProvider.baseUrl }}</el-descriptions-item>
          <el-descriptions-item label="密钥状态">{{ activeProvider.hasApiKey ? activeProvider.apiKeyMask || '已配置' : '未配置' }}</el-descriptions-item>
          <el-descriptions-item label="温度">{{ activeProvider.supportsTemperature ? activeProvider.temperature ?? 0.2 : '不支持' }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ activeProvider.enabled ? '启用' : '停用' }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ activeProvider.description || '暂无描述' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>

    <el-drawer v-model="templateDetailVisible" title="系统模板详情" size="42%">
      <div v-if="activeTemplate" class="detail-panel">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模板名称">{{ activeTemplate.templateName }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">{{ activeTemplate.taskType }}</el-descriptions-item>
          <el-descriptions-item label="说明">{{ activeTemplate.description || '暂无说明' }}</el-descriptions-item>
        </el-descriptions>
        <el-input :model-value="activeTemplate.promptText" type="textarea" :rows="12" readonly />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped src="@/styles/admin-llm-model-view.css"></style>


