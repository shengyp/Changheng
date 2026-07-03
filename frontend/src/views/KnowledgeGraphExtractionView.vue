<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { learningApi } from '@/api/services'

const loading = ref(false)
const extracting = ref(false)
const saving = ref(false)
const relations = ref([])
const knowledgePoints = ref([])
const extracted = ref([])
const rawText = ref('')
const selectedFile = ref(null)
const relationDialogVisible = ref(false)
const editingRelationId = ref(null)

const form = reactive({
  providerKey: '',
  autoSave: true,
})

const relationForm = reactive({
  sourceId: undefined,
  targetId: undefined,
  relationType: 'prerequisite',
  weight: 1,
  confidence: 1,
  description: '',
})

const providerOptions = [
  { value: '', label: '后端默认配置' },
  { value: 'qwen-plus', label: 'Qwen 3.5 Plus' },
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
  { value: 'deepseek-v3-1', label: 'DeepSeek V3.1' },
  { value: 'deepseek-v3-1-think', label: 'DeepSeek V3.1 Think' },
  { value: 'ernie-x1', label: 'ERNIE X1 Turbo 32K' },
  { value: 'ernie-45-128k', label: 'ERNIE 4.5 Turbo 128K' },
  { value: 'ernie-45-32k', label: 'ERNIE 4.5 Turbo 32K' },
  { value: 'ernie-45-vl', label: 'ERNIE 4.5 Turbo VL' },
  { value: 'qwen3-30b-instruct', label: 'Qwen 3 30B Instruct' },
  { value: 'qwen3-coder-30b', label: 'Qwen 3 Coder 30B' },
  { value: 'qwen-36-plus', label: 'Qwen 3.6 Plus' },
  { value: 'qwen-35-flash', label: 'Qwen 3.5 Flash' },
  { value: 'glm-5', label: 'GLM 5' },
  { value: 'minimax-m2-5', label: 'MiniMax M2.5' },
]

async function loadRelations() {
  loading.value = true
  try {
    const [relationData, pointData] = await Promise.all([
      learningApi.knowledgeRelations(),
      learningApi.knowledgePoints(),
    ])
    relations.value = relationData || []
    knowledgePoints.value = pointData || []
  } finally {
    loading.value = false
  }
}

function handleFileChange(uploadFile) {
  selectedFile.value = uploadFile.raw
}

function removeFile() {
  selectedFile.value = null
}

async function extractGraph() {
  if (!selectedFile.value) {
    ElMessage.warning('请先上传知识库文件')
    return
  }
  extracting.value = true
  try {
    const result = await learningApi.extractKnowledgeGraphFile(selectedFile.value, form)
    extracted.value = result.relations || []
    rawText.value = result.rawText || ''
    ElMessage.success(`抽取完成，已保存 ${result.savedCount || 0} 条关系`)
    await loadRelations()
  } finally {
    extracting.value = false
  }
}

async function removeRelation(row) {
  await ElMessageBox.confirm('确认删除这条知识关系吗？', '删除确认', { type: 'warning' })
  await learningApi.removeKnowledgeRelation(row.id)
  ElMessage.success('已删除')
  await loadRelations()
}

function resetRelationForm() {
  editingRelationId.value = null
  relationForm.sourceId = undefined
  relationForm.targetId = undefined
  relationForm.relationType = 'prerequisite'
  relationForm.weight = 1
  relationForm.confidence = 1
  relationForm.description = ''
}

function openCreateRelation() {
  resetRelationForm()
  relationDialogVisible.value = true
}

function openEditRelation(row) {
  editingRelationId.value = row.id
  relationForm.sourceId = row.sourceId
  relationForm.targetId = row.targetId
  relationForm.relationType = row.relationType || 'prerequisite'
  relationForm.weight = Number(row.weight ?? 1)
  relationForm.confidence = Number(row.confidence ?? 1)
  relationForm.description = row.description || ''
  relationDialogVisible.value = true
}

async function saveRelation() {
  if (!relationForm.sourceId || !relationForm.targetId) {
    ElMessage.warning('请选择前置知识点和后续知识点')
    return
  }
  if (relationForm.sourceId === relationForm.targetId) {
    ElMessage.warning('前置知识点和后续知识点不能相同')
    return
  }
  saving.value = true
  try {
    const payload = {
      sourceId: relationForm.sourceId,
      targetId: relationForm.targetId,
      relationType: relationForm.relationType || 'prerequisite',
      weight: Number(relationForm.weight ?? 1),
      confidence: Number(relationForm.confidence ?? 1),
      sourceType: 'manual',
      description: relationForm.description || '',
    }
    if (editingRelationId.value) {
      await learningApi.updateKnowledgeRelation(editingRelationId.value, payload)
      ElMessage.success('知识关系已更新')
    } else {
      await learningApi.createKnowledgeRelation(payload)
      ElMessage.success('知识关系已保存')
    }
    relationDialogVisible.value = false
    await loadRelations()
  } finally {
    saving.value = false
  }
}

onMounted(loadRelations)
</script>

<template>
  <div class="kg-page">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>知识库文件抽取</span>
          <el-button type="primary" :loading="extracting" @click="extractGraph">开始抽取</el-button>
        </div>
      </template>

      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-remove="removeFile"
        accept=".txt,.md,.csv,.json,.sql,.html,.htm,.docx"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="upload-text">拖入或点击上传知识库文件</div>
        <template #tip>
          <div class="upload-tip">支持 txt、md、csv、json、sql、html、docx，单个文件不超过 5MB</div>
        </template>
      </el-upload>

      <el-form class="option-form" label-width="110px">
        <el-form-item label="模型配置">
          <el-select
            v-model="form.providerKey"
            clearable
            filterable
            placeholder="请选择模型配置"
            style="width: 100%"
          >
            <el-option
              v-for="item in providerOptions"
              :key="item.value || 'default'"
              :label="item.label"
              :value="item.value"
            >
              <div class="provider-option">
                <span>{{ item.label }}</span>
                <small v-if="item.value">{{ item.value }}</small>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="自动保存">
          <el-switch v-model="form.autoSave" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>当前知识关系</span>
          <div class="header-actions">
            <el-button @click="loadRelations">刷新</el-button>
            <el-button type="primary" @click="openCreateRelation">新增关系</el-button>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="relations" border>
        <el-table-column prop="sourceName" label="前置知识点" min-width="150" />
        <el-table-column prop="targetName" label="后续知识点" min-width="150" />
        <el-table-column prop="relationType" label="关系" width="130" />
        <el-table-column prop="weight" label="权重" width="90" />
        <el-table-column prop="confidence" label="置信度" width="90" />
        <el-table-column prop="sourceType" label="来源" width="100" />
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditRelation(row)">编辑</el-button>
            <el-button type="danger" link @click="removeRelation(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card v-if="extracted.length || rawText" shadow="never">
      <template #header>本次抽取结果</template>
      <el-table v-if="extracted.length" :data="extracted" border>
        <el-table-column prop="sourceName" label="前置知识点" min-width="150" />
        <el-table-column prop="targetName" label="后续知识点" min-width="150" />
        <el-table-column prop="confidence" label="置信度" width="90" />
        <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
      </el-table>
      <el-input v-model="rawText" class="raw-output" type="textarea" :rows="6" readonly />
    </el-card>
  </div>

  <el-dialog v-model="relationDialogVisible" :title="editingRelationId ? '编辑知识关系' : '新增知识关系'" width="640px">
    <el-form label-width="100px">
      <el-form-item label="前置知识点">
        <el-select v-model="relationForm.sourceId" filterable style="width: 100%" placeholder="请选择前置知识点">
          <el-option
            v-for="item in knowledgePoints"
            :key="item.id"
            :label="item.name"
            :value="item.id"
            :disabled="item.id === relationForm.targetId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="后续知识点">
        <el-select v-model="relationForm.targetId" filterable style="width: 100%" placeholder="请选择后续知识点">
          <el-option
            v-for="item in knowledgePoints"
            :key="item.id"
            :label="item.name"
            :value="item.id"
            :disabled="item.id === relationForm.sourceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="关系类型">
        <el-select v-model="relationForm.relationType" style="width: 100%">
          <el-option label="先修关系" value="prerequisite" />
        </el-select>
      </el-form-item>
      <el-form-item label="权重">
        <el-input-number v-model="relationForm.weight" :min="0" :max="10" :step="0.1" />
      </el-form-item>
      <el-form-item label="置信度">
        <el-input-number v-model="relationForm.confidence" :min="0" :max="1" :step="0.05" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="relationForm.description" type="textarea" :rows="3" placeholder="例如：学习数组前需要理解变量和数据类型" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="relationDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="saveRelation">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.kg-page {
  display: grid;
  gap: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-icon {
  font-size: 42px;
  color: #409eff;
}

.upload-text {
  margin-top: 8px;
  color: #303133;
  font-weight: 600;
}

.upload-tip {
  color: #6b7280;
  font-size: 13px;
}

.option-form {
  margin-top: 18px;
}

.provider-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.provider-option small {
  color: var(--app-text-soft);
  font-size: 12px;
}

.raw-output {
  margin-top: 12px;
}
</style>

