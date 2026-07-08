<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { learningApi } from '@/api/services'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const resources = ref([])
const knowledgePoints = ref([])
const query = reactive({ keyword: '', knowledgePointId: undefined })
const dialogVisible = ref(false)
const form = reactive({ id: undefined, title: '', resourceType: 'article', url: '', summary: '', knowledgePointId: undefined, tagId: undefined })

const canManage = auth.hasAnyRole(['TEACHER', 'ADMIN'])
const SEARCH_URL_MESSAGE = '当前链接是搜索结果页，不是具体视频。请打开某个视频后复制视频播放页链接。'

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

async function loadData() {
  loading.value = true
  try {
    const [resourceData, pointData] = await Promise.all([
      learningApi.resources({ ...query, limit: 100 }),
      learningApi.knowledgePoints(),
    ])
    resources.value = resourceData || []
    knowledgePoints.value = pointData || []
  } catch (error) {
    ElMessage.error(error.message || '加载资源失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { id: undefined, title: '', resourceType: 'article', url: '', summary: '', knowledgePointId: undefined, tagId: undefined })
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, row)
  dialogVisible.value = true
}

async function save() {
  try {
    if (isVideoResource(form) && !isConcreteVideoUrl(form.url)) {
      ElMessage.warning(isSearchVideoUrl(form.url) ? SEARCH_URL_MESSAGE : '视频资源必须填写具体播放页链接')
      return
    }
    if (form.id) await learningApi.updateResource(form.id, form)
    else await learningApi.createResource(form)
    ElMessage.success('已保存')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

async function remove(row) {
  try {
    await learningApi.removeResource(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '删除失败')
  }
}

async function record(row) {
  try {
    await learningApi.recordBehavior({ behaviorType: 'resource_view', refId: row.id, knowledgePointId: row.knowledgePointId, tagId: row.tagId, durationSeconds: 60 })
  } catch {}
}

onMounted(loadData)
</script>

<template>
  <section class="resource-hero">
    <div>
      <p class="eyebrow">Learning Resources</p>
      <h1>学习资源库</h1>
      <p>{{ canManage ? '管理课程资源、视频链接和知识点关联，保证学生看到的是可用资源。' : '按知识点查找教师发布和系统推荐的学习资源。' }}</p>
    </div>
    <el-button v-if="canManage" type="primary" @click="openCreate">新增资源</el-button>
  </section>

  <el-card class="page-card">
    <div class="page-toolbar">
      <el-input v-model="query.keyword" clearable style="width: 240px" placeholder="搜索资源" />
      <el-select v-model="query.knowledgePointId" clearable filterable style="width: 220px" placeholder="知识点">
        <el-option v-for="item in knowledgePoints" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-button type="primary" @click="loadData">查询</el-button>
      <el-button @click="query.keyword = ''; query.knowledgePointId = undefined; loadData()">重置</el-button>
    </div>

    <el-table :data="resources" border v-loading="loading">
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="resourceType" label="类型" width="110" />
      <el-table-column prop="knowledgePointName" label="知识点" min-width="140" />
      <el-table-column prop="summary" label="摘要" min-width="240" show-overflow-tooltip />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canOpenResource(row)" link type="primary" :href="row.url" tag="a" target="_blank" @click="record(row)">打开</el-button>
          <el-tag v-else-if="isVideoResource(row)" type="warning" effect="plain">待补充视频链接</el-tag>
          <el-button v-if="canManage" link type="warning" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canManage" link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" title="学习资源" width="620px">
    <el-form label-width="90px">
      <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
      <el-form-item label="类型"><el-input v-model="form.resourceType" /></el-form-item>
      <el-form-item label="链接"><el-input v-model="form.url" /></el-form-item>
      <el-form-item label="知识点">
        <el-select v-model="form.knowledgePointId" clearable filterable style="width: 100%">
          <el-option v-for="item in knowledgePoints" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="标签ID"><el-input-number v-model="form.tagId" :min="1" /></el-form-item>
      <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="4" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.resource-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
  border: 1px solid rgba(220, 235, 230, 0.94);
  border-radius: 20px;
  padding: 24px;
  background:
    radial-gradient(circle at 14% 16%, rgba(20, 184, 166, 0.18), transparent 32%),
    linear-gradient(112deg, rgba(20, 184, 166, 0.18), rgba(255, 255, 255, 0.95));
  box-shadow: 0 16px 40px rgba(15, 118, 110, 0.08);
}

.resource-hero .eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.resource-hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.2;
}

.resource-hero p:last-child {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

@media (max-width: 720px) {
  .resource-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
