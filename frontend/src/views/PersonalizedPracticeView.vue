<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { learningApi } from '@/api/services'

const router = useRouter()
const loading = ref(false)
const starting = ref(false)
const plan = ref(null)

const form = reactive({
  mode: 'adaptive',
  totalScore: 100,
})

async function loadPlan() {
  loading.value = true
  try {
    plan.value = await learningApi.personalizedPracticePlan(form)
  } finally {
    loading.value = false
  }
}

async function startPractice() {
  starting.value = true
  try {
    const result = await learningApi.startPersonalizedPractice(form)
    ElMessage.success('个性化练习已生成')
    router.push(`/attempts/${result.attemptId}/work`)
  } finally {
    starting.value = false
  }
}

onMounted(loadPlan)
</script>

<template>
  <div class="practice-page">
    <section class="practice-hero">
      <div>
        <p class="eyebrow">Adaptive Practice</p>
        <h1>个性化练习</h1>
        <p>系统根据薄弱知识点生成练习计划，开始后会进入正式作答页。</p>
      </div>
      <el-button type="primary" :loading="starting" @click="startPractice">生成并开始</el-button>
    </section>

    <el-card class="page-card practice-control-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>个性化练习生成</span>
          <div class="actions">
            <el-button :loading="loading" @click="loadPlan">刷新计划</el-button>
            <el-button type="primary" :loading="starting" @click="startPractice">生成并开始</el-button>
          </div>
        </div>
      </template>

      <el-form :inline="true">
        <el-form-item label="练习模式">
          <el-select v-model="form.mode" style="width: 160px">
            <el-option label="自适应" value="adaptive" />
            <el-option label="随机" value="random" />
          </el-select>
        </el-form-item>
        <el-form-item label="总分">
          <el-input-number v-model="form.totalScore" :min="20" :max="300" :step="10" />
        </el-form-item>
      </el-form>

      <el-alert v-if="plan?.reason" :title="plan.reason" type="info" show-icon :closable="false" />
    </el-card>

    <el-card class="page-card" shadow="never">
      <template #header>薄弱知识点</template>
      <el-table v-loading="loading" :data="plan?.weakPoints || []" border>
        <el-table-column prop="name" label="知识点" min-width="160" />
        <el-table-column prop="code" label="编码" min-width="140" />
        <el-table-column prop="masteryValue" label="掌握度" width="100" />
        <el-table-column prop="tagId" label="关联标签" width="110" />
        <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.practice-page {
  display: grid;
  gap: 16px;
}

.practice-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 150px;
  overflow: hidden;
  border: 1px solid rgba(220, 235, 230, 0.94);
  border-radius: 20px;
  padding: 24px;
  background:
    radial-gradient(circle at 16% 18%, rgba(20, 184, 166, 0.18), transparent 30%),
    linear-gradient(112deg, rgba(20, 184, 166, 0.2), rgba(255, 255, 255, 0.94));
  box-shadow: 0 16px 40px rgba(15, 118, 110, 0.08);
}

.practice-hero .eyebrow {
  margin: 0 0 8px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.practice-hero h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.2;
}

.practice-hero p:last-child {
  margin: 10px 0 0;
  color: #475569;
  line-height: 1.7;
}

.card-header,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.practice-control-card :deep(.el-card__header) {
  border-bottom-color: #edf2f7;
}

@media (max-width: 720px) {
  .practice-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
