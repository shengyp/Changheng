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
    <el-card shadow="never">
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

    <el-card shadow="never">
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

.card-header,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
