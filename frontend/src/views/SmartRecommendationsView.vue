<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { learningApi } from '@/api/services'

const loading = ref(false)
const data = ref({ weakPoints: [], resources: [], plan: [] })

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
    data.value = await learningApi.recommendations()
  } catch (error) {
    ElMessage.error(error.message || '加载推荐失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="recommend-page">
    <el-card class="page-card">
      <h3 class="card-title">今日学习计划</h3>
      <el-timeline>
        <el-timeline-item v-for="item in data.plan || []" :key="item.knowledgePointId" :timestamp="item.title">
          <el-tag v-for="action in item.actions" :key="action" class="action-tag">{{ action }}</el-tag>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <el-card class="page-card">
      <h3 class="card-title">推荐资源</h3>
      <el-table :data="data.resources || []" border>
        <el-table-column prop="title" label="资源" min-width="180" />
        <el-table-column prop="knowledgePointName" label="知识点" min-width="140" />
        <el-table-column prop="summary" label="摘要" min-width="260" show-overflow-tooltip />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button v-if="canOpenResource(row)" link type="primary" tag="a" :href="row.url" target="_blank">打开</el-button>
            <el-tag v-else-if="isVideoResource(row)" type="warning" effect="plain">待确认</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.recommend-page { display: grid; gap: 16px; }
.action-tag { margin: 0 8px 8px 0; }
</style>
