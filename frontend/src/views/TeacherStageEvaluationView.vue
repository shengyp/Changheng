<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Search, TrendCharts, UserFilled } from '@element-plus/icons-vue'
import { stageEvaluationApi } from '@/api/services'

const loading = ref(false)
const stage = ref('month')
const studentId = ref('')
const rows = ref([])

const stageOptions = [
  { label: '近 7 天', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本学期', value: 'term' },
]

const summaryStats = computed(() => {
  const count = rows.value.length
  const ability = count
    ? Math.round(rows.value.reduce((sum, item) => sum + Number(item.abilityScore || 0), 0) / count)
    : 0
  const mastery = count
    ? Math.round(rows.value.reduce((sum, item) => sum + Number(item.masteryAverage || 0), 0) / count * 100)
    : 0
  const attempts = rows.value.reduce((sum, item) => sum + Number(item.completedAttemptCount || 0), 0)
  return [
    { label: '学生数', value: count, suffix: '', icon: UserFilled },
    { label: '平均能力值', value: ability, suffix: '', icon: TrendCharts },
    { label: '平均掌握度', value: mastery, suffix: '%', icon: DataAnalysis },
    { label: '累计作答', value: attempts, suffix: ' 次', icon: Search },
  ]
})

async function loadRows() {
  loading.value = true
  try {
    rows.value = await stageEvaluationApi.teacherStudents({
      stage: stage.value,
      studentId: studentId.value,
    })
  } catch (error) {
    ElMessage.error(error.message || '加载学生阶段评价失败')
  } finally {
    loading.value = false
  }
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

onMounted(loadRows)
</script>

<template>
  <div v-loading="loading" class="teacher-stage-page">
    <section class="stage-hero" aria-labelledby="stage-title">
      <div>
        <p class="eyebrow">Stage Evaluation</p>
        <h1 id="stage-title">学生阶段评价</h1>
        <p>快速查看阶段内学生能力值、知识掌握度和维度短板，用于安排复习、补弱和个性化资源生成。</p>
      </div>
      <div class="stage-controls">
        <el-segmented v-model="stage" :options="stageOptions" @change="loadRows" />
        <div class="filters">
          <el-input v-model="studentId" clearable placeholder="学生 ID" />
          <el-button type="primary" :icon="Search" @click="loadRows">查询</el-button>
        </div>
      </div>
    </section>

    <section class="stat-grid" aria-label="阶段评价概览">
      <article v-for="item in summaryStats" :key="item.label" class="stat-card">
        <span class="stat-icon">
          <el-icon><component :is="item.icon" /></el-icon>
        </span>
        <div>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}{{ item.suffix }}</strong>
        </div>
      </article>
    </section>

    <section class="surface-panel">
      <div class="section-heading">
        <div>
          <h2>学生阶段画像</h2>
          <p>用于筛出需要重点关注的学生和高频薄弱方向。</p>
        </div>
      </div>
      <el-table :data="rows" border>
        <el-table-column prop="studentName" label="学生" min-width="130" />
        <el-table-column prop="stageName" label="阶段" width="100" />
        <el-table-column prop="overallLevel" label="综合等级" width="110" />
        <el-table-column prop="abilityScore" label="能力值" width="90" />
        <el-table-column prop="completedAttemptCount" label="作答次数" width="100" />
        <el-table-column prop="averageScore" label="平均分" width="90" />
        <el-table-column label="掌握度" width="150">
          <template #default="{ row }">
            <el-progress :percentage="Math.round(Number(row.masteryAverage || 0) * 100)" />
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="评价摘要" min-width="320" />
      </el-table>
    </section>

    <section class="surface-panel">
      <div class="section-heading">
        <div>
          <h2>评价维度明细</h2>
          <p>展开学生查看各维度得分，定位知识、能力与行为层面的短板。</p>
        </div>
      </div>
      <el-collapse accordion>
        <el-collapse-item v-for="row in rows" :key="row.studentId" :title="`${row.studentName} - ${row.stageName} / 掌握度 ${percent(row.masteryAverage)}`">
          <el-table :data="row.dimensions || []" border>
            <el-table-column prop="name" label="维度" width="140" />
            <el-table-column label="得分" width="200">
              <template #default="{ row: dim }">
                <el-progress :percentage="dim.score || 0" />
              </template>
            </el-table-column>
            <el-table-column prop="level" label="等级" width="120" />
            <el-table-column prop="description" label="说明" min-width="280" />
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </section>
  </div>
</template>

<style scoped>
.teacher-stage-page {
  display: grid;
  gap: 18px;
}

.stage-hero,
.surface-panel,
.stat-card {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 26px rgba(53, 83, 73, 0.06);
}

.stage-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  background:
    linear-gradient(120deg, rgba(79, 143, 123, 0.12), transparent 55%),
    #ffffff;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--app-primary-dark);
  font-size: 13px;
  font-weight: 800;
}

.stage-hero h1,
.section-heading h2 {
  margin: 0;
  letter-spacing: 0;
}

.stage-hero h1 {
  font-size: 28px;
}

.stage-hero p,
.section-heading p {
  margin: 8px 0 0;
  color: var(--app-text-soft);
  line-height: 1.6;
}

.stage-controls {
  display: grid;
  gap: 12px;
  justify-items: end;
}

.filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filters .el-input {
  width: 190px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 86px;
  padding: 14px;
}

.stat-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 8px;
  color: var(--app-primary-dark);
  background: var(--app-primary-soft);
}

.stat-card span,
.stat-card strong {
  display: block;
}

.stat-card div span {
  color: var(--app-text-soft);
  font-size: 13px;
}

.stat-card strong {
  margin-top: 4px;
  color: var(--app-text);
  font-size: 22px;
}

.surface-panel {
  padding: 18px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.section-heading h2 {
  font-size: 20px;
}

@media (max-width: 1180px) {
  .stage-hero {
    align-items: stretch;
    flex-direction: column;
  }

  .stage-controls {
    justify-items: start;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .stage-hero,
  .surface-panel {
    padding: 14px;
  }

  .stat-grid {
    grid-template-columns: 1fr;
  }

  .filters,
  .filters .el-input,
  .filters .el-button {
    width: 100%;
  }

  .filters {
    flex-direction: column;
  }
}
</style>
