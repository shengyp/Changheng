<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { attemptApi } from '@/api/services'
import { formatDateTime } from '@/utils/format'
import {
  ATTEMPT_STATUS_OPTIONS,
  ATTEMPT_TYPE_OPTIONS,
  labelBy,
  typeBy,
} from '@/constants/enums'

const router = useRouter()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const attemptType = ref(undefined)

async function loadData() {
  loading.value = true
  try {
    const data = await attemptApi.my(attemptType.value, page.value, size.value)
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载作答记录失败')
  } finally {
    loading.value = false
  }
}

function openRow(row) {
  if (row.status === 1) {
    router.push(`/attempts/${row.id}/work`)
    return
  }
  router.push(`/attempts/${row.id}/result`)
}

onMounted(loadData)
</script>

<template>
  <el-card class="page-card">
    <div class="records-head">
      <div>
        <p class="eyebrow">Attempt History</p>
        <h3 class="card-title">作答记录</h3>
        <p class="muted">查看作业、练习和测评的提交情况，继续未完成作答或回看结果。</p>
      </div>
    </div>
    <div class="page-toolbar">
      <el-select
        v-model="attemptType"
        clearable
        style="width: 180px"
        placeholder="作答类型"
      >
        <el-option
          v-for="opt in ATTEMPT_TYPE_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-button type="primary" @click="page = 1; loadData()">查询</el-button>
      <el-button @click="attemptType = undefined; page = 1; loadData()">重置</el-button>
    </div>

    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="id" label="作答ID" width="100" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ labelBy(ATTEMPT_TYPE_OPTIONS, row.attemptType) }}</template>
      </el-table-column>
      <el-table-column prop="assignmentId" label="作业ID" width="90" />
      <el-table-column prop="attemptNo" label="第几次" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="typeBy(ATTEMPT_STATUS_OPTIONS, row.status)">
            {{ labelBy(ATTEMPT_STATUS_OPTIONS, row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="totalScore" label="总分" width="90" />
      <el-table-column prop="objectiveScore" label="客观分" width="90" />
      <el-table-column prop="subjectiveScore" label="主观分" width="90" />
      <el-table-column label="开始时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.startedAt) }}</template>
      </el-table-column>
      <el-table-column label="提交时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openRow(row)">
            {{ row.status === 1 ? '继续作答' : '查看结果' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="table-pager"
      background
      layout="total, sizes, prev, pager, next"
      :current-page="page"
      :page-size="size"
      :page-sizes="[10, 20, 50]"
      :total="total"
      @size-change="(v) => { size = v; page = 1; loadData() }"
      @current-change="(v) => { page = v; loadData() }"
    />
  </el-card>
</template>

<style scoped>
.records-head {
  margin-bottom: 14px;
  border: 1px solid #e6edf3;
  border-radius: 16px;
  padding: 14px 16px;
  background:
    linear-gradient(135deg, rgba(20, 184, 166, 0.06), transparent 42%),
    #f8fafc;
}

.eyebrow {
  margin: 0 0 6px;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.records-head .card-title {
  margin-bottom: 6px;
}

.table-pager {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
