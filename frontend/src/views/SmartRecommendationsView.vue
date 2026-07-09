<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { learningApi } from '@/api/services'
import { animatePageEnter } from '@/utils/pageMotion'

const loading = ref(false)
const data = ref({ weakPoints: [], resources: [], plan: [] })
const pageRoot = ref(null)
let pageMotionContext = null

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

onMounted(() => {
  loadData()
  nextTick(() => {
    pageMotionContext = animatePageEnter(pageRoot.value)
  })
})

onBeforeUnmount(() => {
  pageMotionContext?.revert()
})
</script>

<template>
  <div ref="pageRoot" v-loading="loading" class="recommend-page">
    <section class="recommend-hero motion-hero">
      <div>
        <p class="eyebrow">Smart Recommendation</p>
        <h1>智能推荐</h1>
        <p>根据薄弱知识点、学习计划和资源记录，汇总下一步可执行的学习建议。</p>
      </div>
      <el-button type="primary" @click="loadData">刷新推荐</el-button>
    </section>

    <el-card class="page-card motion-card">
      <h3 class="card-title">今日学习计划</h3>
      <el-timeline class="recommend-timeline">
        <el-timeline-item v-for="item in data.plan || []" :key="item.knowledgePointId" :timestamp="item.title">
          <el-tag v-for="action in item.actions" :key="action" class="action-tag">{{ action }}</el-tag>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <el-card class="page-card motion-card">
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
.recommend-page {
  display: grid;
  gap: 18px;
  min-height: calc(100vh - 110px);
  margin: -18px;
  padding: clamp(18px, 2vw, 30px);
  background:
    radial-gradient(circle at 10% 0%, rgba(20, 184, 166, 0.12), transparent 28%),
    radial-gradient(circle at 92% 8%, rgba(37, 99, 235, 0.1), transparent 24%),
    linear-gradient(180deg, #f8fbff, #f5f7fb);
}

.recommend-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 0;
  border-radius: 18px;
  padding: 24px;
  color: #ffffff;
  background:
    radial-gradient(circle at 88% 18%, rgba(255, 255, 255, 0.28), transparent 22%),
    radial-gradient(circle at 52% 112%, rgba(20, 184, 166, 0.42), transparent 34%),
    linear-gradient(135deg, #2563eb 0%, #4f46e5 48%, #14b8a6 100%);
  box-shadow: 0 16px 38px rgba(37, 99, 235, 0.16);
}

.recommend-hero::after {
  position: absolute;
  right: -40px;
  bottom: -60px;
  width: 210px;
  height: 210px;
  border-radius: 999px;
  content: '';
  background: rgba(255, 255, 255, 0.14);
}

.recommend-hero > * {
  position: relative;
  z-index: 1;
}

.recommend-hero .eyebrow {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.recommend-hero h1 {
  margin: 0;
  color: #ffffff;
  font-size: 30px;
  line-height: 1.2;
}

.recommend-hero p:last-child {
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.7;
}

.recommend-hero :deep(.el-button) {
  border: 0;
  color: #2563eb;
  background: #ffffff;
  font-weight: 800;
}

.page-card {
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.card-title {
  margin: 0 0 14px;
  color: #111827;
  font-size: 17px;
  font-weight: 800;
}

.recommend-timeline :deep(.el-timeline-item__content) {
  border: 1px solid #e6edf3;
  border-radius: 16px;
  padding: 12px 14px;
  background:
    radial-gradient(circle at 96% 0%, rgba(20, 184, 166, 0.12), transparent 26%),
    linear-gradient(135deg, #ffffff, #f8fafc);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.recommend-timeline :deep(.el-timeline-item__content:hover) {
  transform: translateX(2px);
  border-color: rgba(20, 184, 166, 0.32);
  box-shadow: 0 12px 26px rgba(15, 118, 110, 0.07);
}

.action-tag {
  margin: 0 8px 8px 0;
  font-weight: 700;
}

.recommend-page :deep(.el-table) {
  --el-table-border-color: #eef2f7;
  --el-table-header-bg-color: #f8fafc;
  border-radius: 14px;
  overflow: hidden;
}

.recommend-page :deep(.el-table th) {
  color: #334155;
  font-weight: 800;
}

.recommend-page :deep(.el-table__row) {
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.recommend-page :deep(.el-table__row:hover) {
  background: #f8fbff;
}

@media (max-width: 720px) {
  .recommend-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
