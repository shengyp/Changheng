<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { learningApi, tagApi } from '@/api/services'

const loading = ref(false)
const points = ref([])
const tags = ref([])
const dialogVisible = ref(false)
const form = reactive({ id: undefined, name: '', code: '', parentId: undefined, tagId: undefined, level: 1, description: '', sortOrder: 0 })

async function loadData() {
  loading.value = true
  try {
    const [pointData, tagData] = await Promise.all([learningApi.knowledgePoints(), tagApi.list()])
    points.value = pointData || []
    tags.value = tagData || []
  } catch (error) {
    ElMessage.error(error.message || '加载知识点失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  Object.assign(form, { id: undefined, name: '', code: '', parentId: undefined, tagId: undefined, level: 1, description: '', sortOrder: 0 })
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, row)
  dialogVisible.value = true
}

async function save() {
  try {
    if (form.id) await learningApi.updateKnowledgePoint(form.id, form)
    else await learningApi.createKnowledgePoint(form)
    ElMessage.success('已保存')
    dialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  }
}

async function remove(row) {
  try {
    await learningApi.removeKnowledgePoint(row.id)
    ElMessage.success('已删除')
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '删除失败')
  }
}

onMounted(loadData)
</script>

<template>
  <el-card class="page-card">
    <div class="page-toolbar">
      <el-button type="primary" @click="openCreate">新增知识点</el-button>
      <el-button @click="loadData">刷新</el-button>
    </div>
    <el-table :data="points" border v-loading="loading">
      <el-table-column prop="name" label="知识点" min-width="160" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="tagName" label="关联标签" min-width="140" />
      <el-table-column prop="level" label="层级" width="80" />
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" title="知识点" width="560px">
    <el-form label-width="90px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="编码"><el-input v-model="form.code" /></el-form-item>
      <el-form-item label="父级ID"><el-input-number v-model="form.parentId" :min="1" /></el-form-item>
      <el-form-item label="关联标签">
        <el-select v-model="form.tagId" clearable filterable style="width: 100%">
          <el-option v-for="item in tags" :key="item.id" :label="item.tagName" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="层级"><el-input-number v-model="form.level" :min="1" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
