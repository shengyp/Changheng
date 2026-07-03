<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { stageEvaluationApi } from '@/api/services'

const loading = ref(false)
const stage = ref('month')
const evaluation = ref(null)

const stageOptions = [
  { label: '近 7 天', value: 'week' },
  { label: '本月', value: 'month' },
  { label: '本学期', value: 'term' },
]

async function loadEvaluation() {
  loading.value = true
  try {
    evaluation.value = await stageEvaluationApi.my({ stage: stage.value })
  } catch (error) {
    ElMessage.error(error.message || '加载阶段评价失败')
  } finally {
    loading.value = false
  }
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`
}

onMounted(loadEvaluation)
</script>

<template>
  <div v-loading="loading" class="stage-page">
    <section class="toolbar">
      <el-segmented v-model="stage" :options="stageOptions" @change="loadEvaluation" />
      <el-tag type="info" effect="plain">算法框架预留</el-tag>
    </section>

    <template v-if="evaluation">
      <section class="summary-grid">
        <div class="summary-item">
          <strong>{{ evaluation.abilityScore ?? 0 }}</strong>
          <span>能力值</span>
        </div>
        <div class="summary-item">
          <strong>{{ evaluation.completedAttemptCount ?? 0 }}</strong>
          <span>阶段作答</span>
        </div>
        <div class="summary-item">
          <strong>{{ evaluation.averageScore ?? 0 }}</strong>
          <span>平均分</span>
        </div>
        <div class="summary-item">
          <strong>{{ percent(evaluation.masteryAverage) }}</strong>
          <span>平均掌握度</span>
        </div>
      </section>

      <el-alert
        type="success"
        :closable="false"
        :title="evaluation.summary"
        :description="evaluation.algorithmPlaceholder"
      />

      <el-card class="page-card">
        <h3 class="card-title">阶段评价维度</h3>
        <el-table :data="evaluation.dimensions || []" border>
          <el-table-column prop="name" label="维度" width="120" />
          <el-table-column label="得分" width="180">
            <template #default="{ row }">
              <el-progress :percentage="row.score || 0" />
            </template>
          </el-table-column>
          <el-table-column prop="level" label="等级" width="100" />
          <el-table-column prop="description" label="说明" min-width="260" />
        </el-table>
      </el-card>

      <el-card class="page-card">
        <h3 class="card-title">薄弱知识点</h3>
        <el-table :data="evaluation.weakKnowledgePoints || []" border>
          <el-table-column prop="tagName" label="知识点标签" min-width="160" />
          <el-table-column label="掌握度" width="160">
            <template #default="{ row }">
              <el-progress :percentage="Math.round((row.masteryValue || 0) * 100)" />
            </template>
          </el-table-column>
          <el-table-column prop="attemptCount" label="作答次数" width="120" />
        </el-table>
      </el-card>

      <el-card class="page-card">
        <h3 class="card-title">阶段建议</h3>
        <el-timeline>
          <el-timeline-item v-for="item in evaluation.suggestions || []" :key="item">
            {{ item }}
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.stage-page { display: grid; gap: 16px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; }
.summary-item { background: #fff; border: 1px solid #e5edf5; border-radius: 8px; padding: 18px; }
.summary-item strong { display: block; font-size: 28px; color: #0b3954; }
.summary-item span { color: #5c748a; }
</style>
