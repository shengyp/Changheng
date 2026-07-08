<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { stageEvaluationApi } from '@/api/services'
import { animatePageEnter } from '@/utils/pageMotion'

const loading = ref(false)
const stage = ref('month')
const evaluation = ref(null)
const pageRoot = ref(null)
let pageMotionContext = null

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

onMounted(() => {
  loadEvaluation()
  nextTick(() => {
    pageMotionContext = animatePageEnter(pageRoot.value)
  })
})

onBeforeUnmount(() => {
  pageMotionContext?.revert()
})
</script>

<template>
  <div ref="pageRoot" v-loading="loading" class="stage-page">
    <section class="stage-hero motion-hero">
      <div>
        <p class="eyebrow">Stage Review</p>
        <h1>阶段评价</h1>
        <p>查看本阶段能力值、作答情况、掌握度和针对性学习建议。</p>
      </div>
      <div class="toolbar">
        <el-segmented v-model="stage" :options="stageOptions" @change="loadEvaluation" />
        <el-tag type="success" effect="plain">画像已同步</el-tag>
      </div>
    </section>

    <template v-if="evaluation">
      <section class="summary-grid">
        <div class="summary-item motion-card">
          <strong>{{ evaluation.abilityScore ?? 0 }}</strong>
          <span>能力值</span>
        </div>
        <div class="summary-item motion-card">
          <strong>{{ evaluation.completedAttemptCount ?? 0 }}</strong>
          <span>阶段作答</span>
        </div>
        <div class="summary-item motion-card">
          <strong>{{ evaluation.averageScore ?? 0 }}</strong>
          <span>平均分</span>
        </div>
        <div class="summary-item motion-card">
          <strong>{{ percent(evaluation.masteryAverage) }}</strong>
          <span>平均掌握度</span>
        </div>
      </section>

      <el-alert
        class="stage-summary-alert"
        type="success"
        :closable="false"
        :title="evaluation.summary"
        :description="evaluation.algorithmPlaceholder"
      />

      <el-card class="page-card motion-card">
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

      <el-card class="page-card motion-card">
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
.stage-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid rgba(220, 235, 230, 0.94);
  border-radius: 20px;
  padding: 24px;
  background:
    radial-gradient(circle at 14% 16%, rgba(20, 184, 166, 0.18), transparent 32%),
    linear-gradient(112deg, rgba(20, 184, 166, 0.18), rgba(255, 255, 255, 0.95));
  box-shadow: 0 16px 40px rgba(15, 118, 110, 0.08);
}

.stage-hero .eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stage-hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.2;
}

.stage-hero p:last-child {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); gap: 12px; }
.summary-item {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #e5edf5;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 12px 30px rgba(15, 118, 110, 0.05);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.summary-item::after {
  position: absolute;
  right: -20px;
  bottom: -26px;
  width: 76px;
  height: 76px;
  border-radius: 999px;
  content: '';
  background: rgba(20, 184, 166, 0.1);
}

.summary-item:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 184, 166, 0.28);
  box-shadow: 0 18px 38px rgba(15, 118, 110, 0.1);
}

.summary-item strong { display: block; font-size: 28px; color: #0f766e; font-weight: 800; }
.summary-item span { color: #475569; font-weight: 700; }

.stage-summary-alert {
  border-radius: 16px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  box-shadow: 0 12px 30px rgba(15, 118, 110, 0.05);
}

@media (max-width: 900px) {
  .stage-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
