<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { assignmentApi, classApi, paperApi, teacherApi } from '@/api/services'
import { formatDateTime, splitCsv, toLocalDateTimeString } from '@/utils/format'
import { QUESTION_TYPE_OPTIONS, labelBy, typeBy, ATTEMPT_STATUS_OPTIONS } from '@/constants/enums'
import AttemptQuestionReview from '@/components/AttemptQuestionReview.vue'

const loading = ref(false)
const list = ref([])
const page = ref(1)
const size = 10
const total = ref(0)
const DEFAULT_ASSIGNMENT_QUERY = {
  keyword: '',
}

const assignmentQuery = reactive({ ...DEFAULT_ASSIGNMENT_QUERY })

const papers = ref([])
const classes = ref([])

const dialogVisible = ref(false)
const saveLoading = ref(false)
const editingId = ref(null)
const DEFAULT_ASSIGNMENT_FORM = {
  paperId: undefined,
  assignmentTitle: '',
  assignmentDesc: '',
  startTime: '',
  endTime: '',
  timeLimitMin: 0,
  maxAttempts: 1,
  shuffleOptions: 0,
}

const form = reactive({ ...DEFAULT_ASSIGNMENT_FORM })

const targetVisible = ref(false)
const targetLoading = ref(false)
const DEFAULT_TARGET_FORM = {
  assignmentId: undefined,
  userIdsCsv: '',
  classIds: [],
}

const targetForm = reactive({ ...DEFAULT_TARGET_FORM })

const detailLoading = ref(false)
const detailList = ref([])
const detailPage = ref(1)
const detailSize = 10
const detailTotal = ref(0)
const activeAssignment = ref(null)

const studentDetailVisible = ref(false)
const studentDetailLoading = ref(false)
const studentDetail = ref(null)

const questionDetailVisible = ref(false)
const currentAttempt = ref(null)
const currentQuestion = ref(null)

const statusLabel = {
  1: '草稿',
  2: '已发布',
  3: '已关闭',
}

const statusType = {
  1: 'info',
  2: 'success',
  3: 'danger',
}

async function loadPapers() {
  try {
    const data = await paperApi.page(1, 200)
    papers.value = data.list || []
  } catch {
    papers.value = []
  }
}

async function loadClasses() {
  try {
    const data = await classApi.mine()
    classes.value = Array.isArray(data) ? data : []
  } catch {
    classes.value = []
  }
}

async function loadData() {
  loading.value = true
  try {
    const data = await assignmentApi.page(page.value, size, assignmentQuery.keyword)
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载作业/考试失败')
  } finally {
    loading.value = false
  }
}

function buildAssignmentFormState(row = null) {
  return {
    ...DEFAULT_ASSIGNMENT_FORM,
    paperId: row?.paperId,
    assignmentTitle: row?.assignmentTitle || '',
    assignmentDesc: row?.assignmentDesc || '',
    startTime: toLocalDateTimeString(row?.startTime) || '',
    endTime: toLocalDateTimeString(row?.endTime) || '',
    timeLimitMin: row?.timeLimitMin ?? DEFAULT_ASSIGNMENT_FORM.timeLimitMin,
    maxAttempts: row?.maxAttempts ?? DEFAULT_ASSIGNMENT_FORM.maxAttempts,
    shuffleOptions: row?.shuffleOptions ?? DEFAULT_ASSIGNMENT_FORM.shuffleOptions,
  }
}

function applyAssignmentFormState(nextState) {
  Object.assign(form, nextState)
}

function resetTargetForm(assignmentId = undefined) {
  Object.assign(targetForm, {
    ...DEFAULT_TARGET_FORM,
    assignmentId,
  })
}

function clearActiveDetails() {
  activeAssignment.value = null
  detailList.value = []
  detailTotal.value = 0
  studentDetailVisible.value = false
  questionDetailVisible.value = false
}

async function runListAction(action, successMessage, failureMessage) {
  try {
    await action()
    ElMessage.success(successMessage)
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || failureMessage)
    }
  }
}

function searchAssignments() {
  page.value = 1
  loadData()
}

function resetAssignmentSearch() {
  Object.assign(assignmentQuery, DEFAULT_ASSIGNMENT_QUERY)
  page.value = 1
  loadData()
}

function resetForm() {
  editingId.value = null
  applyAssignmentFormState(buildAssignmentFormState())
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  applyAssignmentFormState(buildAssignmentFormState(row))
  dialogVisible.value = true
}

async function saveAssignment() {
  saveLoading.value = true
  try {
    const payload = {
      paperId: form.paperId,
      assignmentTitle: form.assignmentTitle,
      assignmentDesc: form.assignmentDesc || null,
      startTime: form.startTime || null,
      endTime: form.endTime,
      timeLimitMin: Number(form.timeLimitMin || 0),
      maxAttempts: Number(form.maxAttempts || 1),
      shuffleOptions: Number(form.shuffleOptions || 0),
    }
    if (editingId.value) {
      await assignmentApi.update(editingId.value, payload)
      ElMessage.success('作业/考试更新成功')
    } else {
      await assignmentApi.create(payload)
      ElMessage.success('作业/考试创建成功，当前为草稿状态')
    }
    dialogVisible.value = false
    await loadData()
    if (activeAssignment.value?.id) {
      activeAssignment.value = list.value.find((item) => Number(item.id) === Number(activeAssignment.value.id)) || activeAssignment.value
      await loadScoreTargets()
    }
  } catch (error) {
    ElMessage.error(error.message || '保存作业/考试失败')
  } finally {
    saveLoading.value = false
  }
}

async function removeAssignment(id) {
  try {
    await ElMessageBox.confirm('确认删除该作业/考试？', '提示', { type: 'warning' })
    await assignmentApi.remove(id)
    ElMessage.success('作业/考试已删除')
    if (Number(activeAssignment.value?.id) === Number(id)) {
      activeAssignment.value = null
      detailList.value = []
      detailTotal.value = 0
      studentDetailVisible.value = false
      questionDetailVisible.value = false
    }
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除作业/考试失败')
    }
  }
}

async function publishAssignment(id) {
  try {
    await assignmentApi.publish(id)
    ElMessage.success('作业/考试已发布')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '发布作业/考试失败')
  }
}

async function closeAssignment(id) {
  try {
    await assignmentApi.close(id)
    ElMessage.success('作业/考试已关闭')
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '关闭作业/考试失败')
  }
}

function openTargetDialog(row) {
  resetTargetForm(row.id)
  targetVisible.value = true
}

async function saveTargets() {
  targetLoading.value = true
  try {
    const userIds = splitCsv(targetForm.userIdsCsv, (v) => Number(v)).filter((v) => !Number.isNaN(v))
    const classIds = (targetForm.classIds || []).map((v) => Number(v)).filter((v) => !Number.isNaN(v))

    await assignmentApi.setTargets(targetForm.assignmentId, {
      userIds,
      classIds,
    })
    ElMessage.success('目标设置已更新')
    targetVisible.value = false
    if (Number(activeAssignment.value?.id) === Number(targetForm.assignmentId)) {
      detailPage.value = 1
      await loadScoreTargets()
    }
  } catch (error) {
    ElMessage.error(error.message || '更新目标设置失败')
  } finally {
    targetLoading.value = false
  }
}

async function openScoreDetail(row) {
  activeAssignment.value = row
  detailPage.value = 1
  await loadScoreTargets()
}

async function loadScoreTargets() {
  if (!activeAssignment.value?.id) {
    detailList.value = []
    detailTotal.value = 0
    return
  }
  detailLoading.value = true
  try {
    const data = await teacherApi.assignmentTargets(activeAssignment.value.id, detailPage.value, detailSize)
    detailList.value = data.list || []
    detailTotal.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载成绩详情失败')
  } finally {
    detailLoading.value = false
  }
}

async function openStudentDetail(row) {
  if (!activeAssignment.value?.id) {
    return
  }
  studentDetailVisible.value = true
  studentDetailLoading.value = true
  studentDetail.value = null
  currentAttempt.value = null
  currentQuestion.value = null
  questionDetailVisible.value = false
  try {
    studentDetail.value = await teacherApi.assignmentStudentDetail(activeAssignment.value.id, row.studentId)
  } catch (error) {
    ElMessage.error(error.message || '加载学生作答详情失败')
    studentDetailVisible.value = false
  } finally {
    studentDetailLoading.value = false
  }
}

function openQuestionDetail(attempt, question) {
  currentAttempt.value = attempt
  currentQuestion.value = question
  questionDetailVisible.value = true
}

function scoreText(question) {
  const finalScore = question?.finalScore ?? 0
  const maxScore = question?.maxScore ?? 0
  return `${finalScore} / ${maxScore}`
}

function resultText(question) {
  if (question?.isCorrect == null) {
    return '待判定'
  }
  return Number(question.isCorrect) === 1 ? '正确' : '未满分'
}

function resultType(question) {
  if (question?.isCorrect == null) {
    return 'info'
  }
  return Number(question.isCorrect) === 1 ? 'success' : 'warning'
}

function studentRowClassName() {
  return 'clickable-row'
}

function questionRowClassName() {
  return 'clickable-row'
}

onMounted(async () => {
  await Promise.all([loadPapers(), loadClasses()])
  await loadData()
})
</script>

<template>
  <el-card class="page-card">
    <div class="panel-head">
      <h3 class="card-title">作业/考试管理</h3>
      <div class="panel-actions">
        <el-input
          v-model="assignmentQuery.keyword"
          clearable
          placeholder="搜索作业ID或标题"
          style="width: 280px"
          @keyup.enter="searchAssignments"
          @clear="searchAssignments"
        />
        <el-button type="primary" @click="searchAssignments">查询</el-button>
        <el-button @click="resetAssignmentSearch">重置</el-button>
        <el-button type="success" @click="openCreate">新建作业/考试</el-button>
        <el-button @click="loadData">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="assignmentTitle" label="标题" min-width="220" />
      <el-table-column prop="paperId" label="试卷ID" width="90" />
      <el-table-column label="时间范围" min-width="280">
        <template #default="{ row }">
          {{ formatDateTime(row.startTime) }} ~ {{ formatDateTime(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column prop="maxAttempts" label="最多作答次数" width="130" />
      <el-table-column prop="timeLimitMin" label="限时(分钟)" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType[row.publishStatus] || 'info'">
            {{ statusLabel[row.publishStatus] || '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="420" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="success" @click="publishAssignment(row.id)">发布</el-button>
          <el-button link type="warning" @click="closeAssignment(row.id)">关闭</el-button>
          <el-button link type="info" @click="openTargetDialog(row)">目标</el-button>
          <el-button link type="primary" @click="openScoreDetail(row)">成绩详情</el-button>
          <el-button link type="danger" @click="removeAssignment(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="table-pager"
      background
      layout="total, prev, pager, next"
      :current-page="page"
      :page-size="size"
      :total="total"
      @current-change="(v) => { page = v; loadData() }"
    />
  </el-card>

  <el-card class="page-card">
    <div class="detail-head">
      <div>
        <h3 class="card-title">作业/考试成绩详情</h3>
        <p class="muted" v-if="activeAssignment">
          当前作业：#{{ activeAssignment.id }} {{ activeAssignment.assignmentTitle }}
        </p>
      </div>
      <el-button v-if="activeAssignment" type="primary" plain @click="loadScoreTargets">刷新详情</el-button>
    </div>

    <el-empty v-if="!activeAssignment" description="请先在上方选择“成绩详情”查看指定作业/考试的完成情况" />

    <template v-else>
      <el-table
        :data="detailList"
        border
        v-loading="detailLoading"
        @row-click="openStudentDetail"
        :row-class-name="studentRowClassName"
      >
        <el-table-column prop="studentId" label="学生ID" width="100" />
        <el-table-column prop="displayName" label="姓名" width="140" />
        <el-table-column prop="username" label="用户名" width="160" />
        <el-table-column prop="attemptCount" label="作答次数" width="100" />
        <el-table-column label="完成情况" width="110">
          <template #default="{ row }">
            <el-tag :type="Number(row.completed) === 1 ? 'success' : 'danger'">
              {{ Number(row.completed) === 1 ? '已完成' : '未完成' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="latestAttemptId" label="最近作答ID" width="120" />
        <el-table-column prop="latestTotalScore" label="最近总分" width="100" />
        <el-table-column label="最近状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.latestAttemptStatus != null" :type="typeBy(ATTEMPT_STATUS_OPTIONS, row.latestAttemptStatus)">
              {{ labelBy(ATTEMPT_STATUS_OPTIONS, row.latestAttemptStatus) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="最近提交时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.latestSubmittedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openStudentDetail(row)">查看学生详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="table-pager"
        background
        layout="total, prev, pager, next"
        :current-page="detailPage"
        :page-size="detailSize"
        :total="detailTotal"
        @current-change="(v) => { detailPage = v; loadScoreTargets() }"
      />
    </template>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑作业/考试' : '新建作业/考试'" width="760px">
    <el-form label-width="110px">
      <el-alert
        title="保存后默认为草稿，可在列表中再执行发布。题目顺序固定，选项乱序不会影响客观题判分。"
        type="info"
        :closable="false"
        style="margin-bottom: 16px"
      />
      <el-form-item label="试卷">
        <el-select v-model="form.paperId" filterable style="width: 100%">
          <el-option v-for="paper in papers" :key="paper.id" :value="paper.id" :label="`${paper.id} - ${paper.paperTitle}`" />
        </el-select>
      </el-form-item>
      <el-form-item label="标题">
        <el-input v-model="form.assignmentTitle" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.assignmentDesc" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item label="开始时间">
        <el-date-picker
          v-model="form.startTime"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          style="width: 100%"
          placeholder="可选"
        />
      </el-form-item>
      <el-form-item label="结束时间">
        <el-date-picker
          v-model="form.endTime"
          type="datetime"
          value-format="YYYY-MM-DDTHH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="限时(分钟)">
            <el-input-number v-model="form.timeLimitMin" :min="0" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最多作答次数">
            <el-input-number v-model="form.maxAttempts" :min="1" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="选项乱序">
        <el-switch v-model="form.shuffleOptions" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="saveLoading" @click="saveAssignment">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="targetVisible" title="配置目标范围" width="620px">
    <el-form label-width="110px">
      <el-form-item label="作业ID">
        <el-input v-model="targetForm.assignmentId" disabled />
      </el-form-item>
      <el-form-item label="目标班级">
        <el-select v-model="targetForm.classIds" multiple filterable style="width: 100%" placeholder="请选择班级">
          <el-option v-for="clazz in classes" :key="clazz.id" :value="clazz.id" :label="`${clazz.className} (${clazz.classCode})`" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标用户ID">
        <el-input
          v-model="targetForm.userIdsCsv"
          type="textarea"
          :rows="4"
          placeholder="逗号分隔，例如：10001,10002"
        />
      </el-form-item>
      <el-alert
        title="两个字段都留空时，默认按任课教师名下学生和已参与学生展示完成情况。"
        type="info"
        :closable="false"
      />
    </el-form>
    <template #footer>
      <el-button @click="targetVisible = false">取消</el-button>
      <el-button type="primary" :loading="targetLoading" @click="saveTargets">保存目标设置</el-button>
    </template>
  </el-dialog>

  <el-drawer v-model="studentDetailVisible" title="学生作答详情" size="88%">
    <div v-loading="studentDetailLoading" class="drawer-stack">
      <el-empty v-if="studentDetail && !(studentDetail.attempts || []).length" description="该学生尚未完成本次作业/考试" />

      <template v-else-if="studentDetail">
        <el-card class="page-card">
          <h3 class="card-title">基础信息</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="作业">
              #{{ studentDetail.assignmentId }} {{ studentDetail.assignmentTitle }}
            </el-descriptions-item>
            <el-descriptions-item label="学生">
              {{ studentDetail.displayName || '-' }} ({{ studentDetail.studentId }})
            </el-descriptions-item>
            <el-descriptions-item label="用户名" :span="2">{{ studentDetail.username || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card
          v-for="attempt in studentDetail.attempts || []"
          :key="attempt.attemptId"
          class="page-card"
        >
          <div class="detail-head">
            <div>
              <h3 class="card-title">第 {{ attempt.attemptNo || '-' }} 次作答</h3>
              <p class="muted">
                作答ID：{{ attempt.attemptId }}
                | 状态：{{ labelBy(ATTEMPT_STATUS_OPTIONS, attempt.status) }}
                | 总分：{{ attempt.totalScore ?? 0 }}
                | 提交时间：{{ formatDateTime(attempt.submittedAt) }}
                | 用时：{{ attempt.durationSec ?? 0 }} 秒
              </p>
            </div>
            <el-tag :type="Number(attempt.needsReview) === 1 ? 'warning' : 'success'">
              {{ Number(attempt.needsReview) === 1 ? '待复核' : '已完成' }}
            </el-tag>
          </div>

          <el-table
            :data="attempt.questions || []"
            border
            @row-click="(row) => openQuestionDetail(attempt, row)"
            :row-class-name="questionRowClassName"
          >
            <el-table-column prop="orderNo" label="题号" width="80" />
            <el-table-column prop="title" label="题目" min-width="320" show-overflow-tooltip />
            <el-table-column label="题型" width="110">
              <template #default="{ row }">{{ labelBy(QUESTION_TYPE_OPTIONS, row.questionType) }}</template>
            </el-table-column>
            <el-table-column label="得分" width="100">
              <template #default="{ row }">{{ scoreText(row) }}</template>
            </el-table-column>
            <el-table-column label="判定" width="100">
              <template #default="{ row }">{{ resultText(row) }}</template>
            </el-table-column>
            <el-table-column label="学生答案" min-width="260">
              <template #default="{ row }">
                <div class="answer-preview">{{ row.answerContent || '未作答' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click.stop="openQuestionDetail(attempt, row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </div>
  </el-drawer>

  <el-drawer v-model="questionDetailVisible" title="题目详情与学生答案" size="88%">
    <div v-if="currentQuestion" class="drawer-stack">
      <el-card class="page-card">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="作业">
            #{{ studentDetail?.assignmentId }} {{ studentDetail?.assignmentTitle }}
          </el-descriptions-item>
          <el-descriptions-item label="学生">
            {{ studentDetail?.displayName || '-' }} ({{ studentDetail?.studentId || '-' }})
          </el-descriptions-item>
          <el-descriptions-item label="作答">
            {{ currentAttempt?.attemptId || '-' }} / 第 {{ currentAttempt?.attemptNo || '-' }} 次
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            {{ labelBy(ATTEMPT_STATUS_OPTIONS, currentAttempt?.status) }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <AttemptQuestionReview
        :snapshot="currentQuestion.snapshotJson"
        :question-id="currentQuestion.questionId"
        :question-type="currentQuestion.questionType"
        :title="currentQuestion.title"
        :question-no="currentQuestion.orderNo"
        :score-text="scoreText(currentQuestion)"
        :result-text="resultText(currentQuestion)"
        :result-type="resultType(currentQuestion)"
        :student-answer="currentQuestion.answerContent"
      />
    </div>
  </el-drawer>
</template>

<style scoped>
.table-pager {
  margin-top: 12px;
  justify-content: flex-end;
}

.panel-head,
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.drawer-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.answer-preview {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

:deep(.clickable-row td) {
  cursor: pointer;
}
</style>
