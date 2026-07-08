<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { appealApi } from '@/api/services'
import { formatDateTime } from '@/utils/format'
import { APPEAL_STATUS_OPTIONS, labelBy, typeBy } from '@/constants/enums'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(10)
const status = ref(undefined)

async function loadData() {
  loading.value = true
  try {
    const data = await appealApi.my({
      status: status.value,
      page: page.value,
      size: size.value,
    })
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载申诉列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <el-card class="page-card">
    <div class="appeal-head">
      <div>
        <p class="eyebrow">Appeal Center</p>
        <h3 class="card-title">我的申诉记录</h3>
        <p class="muted">查看作答申诉的提交状态和处理进度。</p>
      </div>
    </div>

    <div class="page-toolbar">
      <el-select v-model="status" clearable style="width: 180px" placeholder="状态筛选">
        <el-option
          v-for="opt in APPEAL_STATUS_OPTIONS"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-button type="primary" @click="page = 1; loadData()">查询</el-button>
      <el-button @click="status = undefined; page = 1; loadData()">重置</el-button>
    </div>

    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="appealId" label="申诉ID" width="90" />
      <el-table-column prop="answerId" label="答案ID" width="90" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="typeBy(APPEAL_STATUS_OPTIONS, row.appealStatus)">
            {{ labelBy(APPEAL_STATUS_OPTIONS, row.appealStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
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
.appeal-head {
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

.appeal-head .card-title {
  margin-bottom: 6px;
}

.table-pager {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
