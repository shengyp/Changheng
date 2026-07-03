<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { teacherApi } from '@/api/services'
import { formatDateTime } from '@/utils/format'
import {
  APPEAL_STATUS_OPTIONS,
  GRADING_MODE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  labelBy,
  typeBy,
} from '@/constants/enums'
import JsonPreview from '@/components/JsonPreview.vue'
import AttemptQuestionReview from '@/components/AttemptQuestionReview.vue'

const activeTab = ref('grading')
const gradingMode = ref('manual')
const reviewLoading = ref(false)
const reviewList = ref([])
const selectedRows = ref([])
const reviewPage = ref(1)
const reviewSize = ref(10)
const reviewTotal = ref(0)
const reviewQuery = reactive({
  assignmentId: '',
  studentId: '',
  questionType: undefined,
  needsReview: '',
})

const providers = ref([])
const providerLoading = ref(false)
const llmLoading = ref(false)
const llmOptions = reactive({
  providerKey: '',
  temperature: 0.2,
  times: 1,
})

const paperReviewVisible = ref(false)
const paperReviewLoading = ref(false)
const paperReviewMode = ref('detail')
const paperReviewDetail = ref(null)
const activeAttemptId = ref(undefined)
const activeQuestionAnswerId = ref(undefined)

const gradeLoading = ref(false)
const gradeForm = reactive({
  answerId: undefined,
  score: 0,
  comment: '',
})

const appealLoading = ref(false)
const appealList = ref([])
const appealPage = ref(1)
const appealSize = ref(10)
const appealTotal = ref(0)
const appealStatus = ref(undefined)

const handleVisible = ref(false)
const handleLoading = ref(false)
const handleEvidenceLoading = ref(false)
const currentAppeal = ref(null)
const handleEvidence = ref(null)
const handleForm = reactive({
  appealId: undefined,
  action: 'approve',
  finalScore: undefined,
  decisionComment: '',
})

const selectedAnswerIds = computed(() => selectedRows.value.map((row) => row.answerId).filter(Boolean))
const currentProvider = computed(() => providers.value.find((item) => item.providerKey === llmOptions.providerKey))
const currentAttempt = computed(() =>
  (paperReviewDetail.value?.attempts || []).find((item) => Number(item.attemptId) === Number(activeAttemptId.value))
  || paperReviewDetail.value?.attempts?.[0]
  || null,
)
const paperQuestions = computed(() =>
  [...(currentAttempt.value?.questions || [])].sort((a, b) => Number(a.orderNo || 0) - Number(b.orderNo || 0)),
)
const activeQuestion = computed(() =>
  paperQuestions.value.find((item) => Number(item.answerId) === Number(activeQuestionAnswerId.value))
  || paperQuestions.value[0]
  || null,
)
const paperReviewTitle = computed(() =>
  paperReviewMode.value === 'grade' ? '整卷人工评分' : '整卷作答详情',
)
const activeQuestionMaxScore = computed(() => Number(activeQuestion.value?.maxScore || 0))

function toOptionalId(value) {
  const number = Number(value)
  if (!number || Number.isNaN(number) || number < 1) {
    return undefined
  }
  return number
}

function boolNeedsReview(value) {
  if (value === '') return undefined
  return value
}

function appealStatusText(value) {
  return labelBy(APPEAL_STATUS_OPTIONS, value, '未知')
}

async function loadReviews() {
  reviewLoading.value = true
  try {
    const data = await teacherApi.reviewAnswers({
      assignmentId: toOptionalId(reviewQuery.assignmentId),
      studentId: toOptionalId(reviewQuery.studentId),
      questionType: reviewQuery.questionType,
      needsReview: boolNeedsReview(reviewQuery.needsReview),
      page: reviewPage.value,
      size: reviewSize.value,
    })
    reviewList.value = data.list || []
    reviewTotal.value = data.total || 0
    selectedRows.value = []
  } catch (error) {
    ElMessage.error(error.message || '加载阅卷列表失败')
  } finally {
    reviewLoading.value = false
  }
}

async function loadProviders() {
  providerLoading.value = true
  try {
    const rows = await teacherApi.teacherLlmProviders({ enabled: true })
    providers.value = Array.isArray(rows) ? rows : []
    const defaultProvider = providers.value.find((item) => item.isDefault) || providers.value[0]
    if (!llmOptions.providerKey && defaultProvider) {
      llmOptions.providerKey = defaultProvider.providerKey
    }
  } catch (error) {
    if (error?.status !== 404) {
      ElMessage.warning(error.message || '加载模型列表失败')
    }
    providers.value = []
  } finally {
    providerLoading.value = false
  }
}

function syncGradeForm(question = activeQuestion.value) {
  gradeForm.answerId = question?.answerId
  gradeForm.score = Number(question?.finalScore ?? question?.autoScore ?? 0)
  gradeForm.comment = ''
}

async function openPaperReview(row, mode = 'detail') {
  if (!row?.assignmentId || !row?.studentId || !row?.attemptId) {
    ElMessage.warning('当前记录缺少作业、学生或作答信息，无法打开整卷详情')
    return
  }
  paperReviewVisible.value = true
  paperReviewLoading.value = true
  paperReviewMode.value = mode
  paperReviewDetail.value = null
  activeAttemptId.value = row.attemptId
  activeQuestionAnswerId.value = row.answerId
  try {
    paperReviewDetail.value = await teacherApi.assignmentStudentDetail(row.assignmentId, row.studentId)
    activeAttemptId.value = row.attemptId
    activeQuestionAnswerId.value = row.answerId
    if (mode === 'grade') {
      syncGradeForm()
    }
  } catch (error) {
    ElMessage.error(error.message || '加载整卷详情失败')
  } finally {
    paperReviewLoading.value = false
  }
}

function openGrade(row) {
  openPaperReview(row, 'grade')
}

function selectPaperQuestion(question) {
  activeQuestionAnswerId.value = question?.answerId
  if (paperReviewMode.value === 'grade') {
    syncGradeForm(question)
  }
}

async function submitGrade() {
  if (!gradeForm.answerId) {
    ElMessage.warning('请先选择要评分的题目')
    return
  }
  gradeLoading.value = true
  try {
    await teacherApi.manualGrade(gradeForm.answerId, {
      score: gradeForm.score,
      comment: gradeForm.comment,
    })
    ElMessage.success('人工评分已提交')
    if (activeQuestion.value) {
      activeQuestion.value.finalScore = gradeForm.score
    }
    syncGradeForm(activeQuestion.value)
    await loadReviews()
  } catch (error) {
    ElMessage.error(error.message || '评分失败')
  } finally {
    gradeLoading.value = false
  }
}

function buildLlmPayload(extra = {}) {
  return {
    providerKey: llmOptions.providerKey || undefined,
    temperature: Number(llmOptions.temperature),
    times: llmOptions.times,
    ...extra,
  }
}

async function llmRetry(row) {
  if (!llmOptions.providerKey) {
    ElMessage.warning('请先选择 LLM 模型')
    return
  }
  llmLoading.value = true
  try {
    const res = await teacherApi.llmRetry(row.answerId, buildLlmPayload())
    const ids = res?.llmCallIds || []
    ElMessage.success(`LLM 自动批改完成，调用 ${ids.length} 次`)
    await loadReviews()
  } catch (error) {
    ElMessage.error(error.message || 'LLM 自动批改失败')
  } finally {
    llmLoading.value = false
  }
}

async function runLlmBatchSelected() {
  if (!selectedAnswerIds.value.length) {
    ElMessage.warning('请先选择要批改的题目')
    return
  }
  await runLlmBatch({ answerIds: selectedAnswerIds.value }, `确认让 LLM 批改选中的 ${selectedAnswerIds.value.length} 道题吗？`)
}

async function runLlmBatchAssignment() {
  const assignmentId = toOptionalId(reviewQuery.assignmentId)
  if (!assignmentId) {
    ElMessage.warning('请先输入作业/试卷 ID')
    return
  }
  await runLlmBatch(
    { assignmentId, needsReview: boolNeedsReview(reviewQuery.needsReview) },
    '确认让 LLM 批改当前作业筛选范围内的题目吗？一次最多处理 50 道。'
  )
}

async function runLlmBatch(extra, message) {
  if (!llmOptions.providerKey) {
    ElMessage.warning('请先选择 LLM 模型')
    return
  }
  try {
    await ElMessageBox.confirm(message, 'LLM 自动批改', { type: 'warning' })
  } catch {
    return
  }
  llmLoading.value = true
  try {
    const result = await teacherApi.llmBatch(buildLlmPayload(extra))
    ElMessage.success(`批改完成：成功 ${result.successCount || 0} 道，失败 ${result.failureCount || 0} 道`)
    await loadReviews()
  } catch (error) {
    ElMessage.error(error.message || '批量批改失败')
  } finally {
    llmLoading.value = false
  }
}

function resetReviewQuery() {
  reviewQuery.assignmentId = ''
  reviewQuery.studentId = ''
  reviewQuery.questionType = undefined
  reviewQuery.needsReview = ''
  reviewPage.value = 1
  loadReviews()
}

async function loadAppeals() {
  appealLoading.value = true
  try {
    const data = await teacherApi.appeals({
      status: appealStatus.value,
      page: appealPage.value,
      size: appealSize.value,
    })
    appealList.value = data.list || []
    appealTotal.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载申诉列表失败')
  } finally {
    appealLoading.value = false
  }
}

async function openHandleAppeal(row) {
  currentAppeal.value = row
  handleForm.appealId = row.appealId
  handleForm.action = 'approve'
  handleForm.finalScore = undefined
  handleForm.decisionComment = ''
  handleEvidence.value = null
  handleVisible.value = true
  handleEvidenceLoading.value = true
  try {
    handleEvidence.value = await teacherApi.answerEvidence(row.answerId)
  } catch (error) {
    ElMessage.error(error.message || '加载题目详情失败')
  } finally {
    handleEvidenceLoading.value = false
  }
}

async function submitHandleAppeal() {
  handleLoading.value = true
  try {
    await teacherApi.handleAppeal(handleForm.appealId, {
      action: handleForm.action,
      finalScore: handleForm.finalScore,
      decisionComment: handleForm.decisionComment,
    })
    ElMessage.success('申诉处理成功')
    handleVisible.value = false
    await loadAppeals()
    await loadReviews()
  } catch (error) {
    ElMessage.error(error.message || '处理失败')
  } finally {
    handleLoading.value = false
  }
}

onMounted(() => {
  loadReviews()
  loadAppeals()
  loadProviders()
})
</script>

<template>
  <div class="review-page">
    <section class="review-hero">
      <div>
        <p class="eyebrow">Teacher Grading Center</p>
        <h1>教师阅卷中心</h1>
        <p>集中处理作业、试卷和主观题复核，支持人工精批与 LLM 自动批改。</p>
      </div>
      <el-segmented
        v-model="gradingMode"
        :options="[
          { label: '手动批改', value: 'manual' },
          { label: 'LLM 自动批改', value: 'llm' },
        ]"
      />
    </section>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="阅卷列表" name="grading">
        <el-card class="page-card grading-card">
          <div class="toolbar-grid">
            <el-input v-model="reviewQuery.assignmentId" clearable placeholder="作业/试卷 ID" />
            <el-input v-model="reviewQuery.studentId" clearable placeholder="学生 ID" />
            <el-select v-model="reviewQuery.questionType" clearable placeholder="题型">
              <el-option
                v-for="opt in QUESTION_TYPE_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-select v-model="reviewQuery.needsReview" placeholder="复核状态">
              <el-option :value="true" label="仅看待复核" />
              <el-option :value="false" label="已完成复核" />
              <el-option value="" label="全部答题" />
            </el-select>
            <el-button type="primary" @click="reviewPage = 1; loadReviews()">查询</el-button>
            <el-button @click="resetReviewQuery">重置</el-button>
          </div>

          <div v-if="gradingMode === 'llm'" class="llm-panel">
            <div class="llm-model">
              <el-select
                v-model="llmOptions.providerKey"
                filterable
                placeholder="选择 LLM 模型"
                :loading="providerLoading"
              >
                <el-option
                  v-for="item in providers"
                  :key="`${item.source}-${item.providerKey}`"
                  :label="`${item.label || item.model} · ${item.model}`"
                  :value="item.providerKey"
                />
              </el-select>
              <span class="muted">
                当前模型：{{ currentProvider?.label || currentProvider?.model || '未选择' }}
              </span>
            </div>
            <el-input-number
              v-model="llmOptions.temperature"
              class="llm-number"
              :min="0"
              :max="2"
              :step="0.1"
              controls-position="right"
            />
            <el-input-number
              v-model="llmOptions.times"
              class="llm-number"
              :min="1"
              :max="5"
              controls-position="right"
            />
            <div class="llm-actions">
              <el-button type="warning" :loading="llmLoading" @click="runLlmBatchSelected">批改选中</el-button>
              <el-button :loading="llmLoading" @click="runLlmBatchAssignment">批改当前作业</el-button>
            </div>
          </div>

          <el-table
            :data="reviewList"
            border
            v-loading="reviewLoading"
            @selection-change="selectedRows = $event"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="answerId" label="答题ID" width="90" />
            <el-table-column label="作业/试卷" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">
                <strong>#{{ row.assignmentId || '-' }}</strong>
                <span class="muted"> {{ row.assignmentTitle || '未绑定作业' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="学生" min-width="130">
              <template #default="{ row }">
                {{ row.studentName || '-' }}
                <span class="muted">#{{ row.studentId }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="attemptId" label="作答ID" width="90" />
            <el-table-column prop="questionId" label="题目ID" width="90" />
            <el-table-column label="题型" width="100">
              <template #default="{ row }">{{ labelBy(QUESTION_TYPE_OPTIONS, row.questionType) }}</template>
            </el-table-column>
            <el-table-column prop="score" label="满分" width="70" />
            <el-table-column prop="currentFinalScore" label="当前分" width="90" />
            <el-table-column label="复核状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.needsReview ? 'warning' : 'success'">
                  {{ row.needsReview ? '待复核' : '已完成' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="提交时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.submittedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openPaperReview(row, 'detail')">详情</el-button>
                <el-button link type="success" @click="openGrade(row)">人工评分</el-button>
                <el-button link type="warning" :loading="llmLoading" @click="llmRetry(row)">LLM批改</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="table-pager"
            background
            layout="total, sizes, prev, pager, next"
            :current-page="reviewPage"
            :page-size="reviewSize"
            :page-sizes="[10, 20, 50]"
            :total="reviewTotal"
            @size-change="(v) => { reviewSize = v; reviewPage = 1; loadReviews() }"
            @current-change="(v) => { reviewPage = v; loadReviews() }"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="申诉处理" name="appeals">
        <el-card class="page-card">
          <div class="page-toolbar">
            <el-select v-model="appealStatus" clearable style="width: 180px" placeholder="申诉状态">
              <el-option
                v-for="opt in APPEAL_STATUS_OPTIONS"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <el-button type="primary" @click="appealPage = 1; loadAppeals()">查询</el-button>
            <el-button @click="appealStatus = undefined; appealPage = 1; loadAppeals()">重置</el-button>
          </div>

          <el-table :data="appealList" border v-loading="appealLoading">
            <el-table-column prop="appealId" label="申诉ID" width="90" />
            <el-table-column prop="assignmentId" label="作业ID" width="90" />
            <el-table-column prop="assignmentTitle" label="作业标题" min-width="180" show-overflow-tooltip />
            <el-table-column prop="answerId" label="答题ID" width="90" />
            <el-table-column prop="studentId" label="学生ID" width="90" />
            <el-table-column prop="reasonText" label="申诉理由" min-width="240" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="typeBy(APPEAL_STATUS_OPTIONS, row.appealStatus)">
                  {{ labelBy(APPEAL_STATUS_OPTIONS, row.appealStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="180">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openHandleAppeal(row)">处理</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            class="table-pager"
            background
            layout="total, sizes, prev, pager, next"
            :current-page="appealPage"
            :page-size="appealSize"
            :page-sizes="[10, 20, 50]"
            :total="appealTotal"
            @size-change="(v) => { appealSize = v; appealPage = 1; loadAppeals() }"
            @current-change="(v) => { appealPage = v; loadAppeals() }"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-drawer v-model="paperReviewVisible" :title="paperReviewTitle" size="92%" destroy-on-close>
      <div v-loading="paperReviewLoading" class="paper-review-shell">
        <el-card class="page-card">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="作业/试卷">
              #{{ paperReviewDetail?.assignmentId || '-' }} {{ paperReviewDetail?.assignmentTitle || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="学生">
              {{ paperReviewDetail?.displayName || paperReviewDetail?.username || '-' }}
              ({{ paperReviewDetail?.studentId || '-' }})
            </el-descriptions-item>
            <el-descriptions-item label="作答ID">{{ currentAttempt?.attemptId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ formatDateTime(currentAttempt?.submittedAt) }}</el-descriptions-item>
            <el-descriptions-item label="总分">{{ currentAttempt?.totalScore ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="复核状态">
              <el-tag :type="currentAttempt?.needsReview ? 'warning' : 'success'">
                {{ currentAttempt?.needsReview ? '待复核' : '已完成' }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <div class="paper-review-grid">
          <aside class="question-nav">
            <div class="question-nav-title">
              <strong>题目列表</strong>
              <span>{{ paperQuestions.length }} 题</span>
            </div>
            <el-empty v-if="!paperQuestions.length" description="暂无题目" :image-size="80" />
            <button
              v-for="question in paperQuestions"
              v-else
              :key="question.attemptQuestionId"
              type="button"
              class="question-nav-item"
              :class="{ 'is-active': activeQuestion?.answerId === question.answerId }"
              @click="selectPaperQuestion(question)"
            >
              <span class="question-no">第 {{ question.orderNo || '-' }} 题</span>
              <strong>{{ question.title || `题目 #${question.questionId || '-'}` }}</strong>
              <span class="question-meta">
                {{ labelBy(QUESTION_TYPE_OPTIONS, question.questionType) }}
                · {{ question.finalScore ?? '-' }}/{{ question.maxScore ?? 0 }} 分
              </span>
            </button>
          </aside>

          <main class="question-review-main">
            <AttemptQuestionReview
              v-if="activeQuestion"
              :snapshot="activeQuestion.snapshotJson"
              :question-id="activeQuestion.questionId"
              :question-type="activeQuestion.questionType"
              :title="activeQuestion.title"
              :question-no="activeQuestion.orderNo"
              :score-text="`${activeQuestion.finalScore ?? '-'} / ${activeQuestion.maxScore ?? 0}`"
              :student-answer="activeQuestion.answerContent"
            />
            <el-empty v-else description="请选择题目" />

            <el-card v-if="paperReviewMode === 'grade' && activeQuestion" class="page-card grade-panel">
              <h3 class="card-title">人工评分</h3>
              <el-form label-width="90px">
                <el-form-item label="答题ID">
                  <el-input v-model="gradeForm.answerId" disabled />
                </el-form-item>
                <el-form-item label="分数">
                  <el-input-number
                    v-model="gradeForm.score"
                    :min="0"
                    :max="activeQuestionMaxScore"
                    controls-position="right"
                  />
                  <span class="muted score-hint">满分 {{ activeQuestionMaxScore }} 分</span>
                </el-form-item>
                <el-form-item label="评语">
                  <el-input v-model="gradeForm.comment" type="textarea" :rows="4" />
                </el-form-item>
              </el-form>
              <div class="grade-actions">
                <el-button type="primary" :loading="gradeLoading" @click="submitGrade">提交本题评分</el-button>
              </div>
            </el-card>
          </main>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="handleVisible" title="处理申诉" width="88%" top="4vh" destroy-on-close>
      <div class="dialog-stack" v-loading="handleEvidenceLoading">
        <el-card class="page-card" v-if="currentAppeal">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="申诉ID">{{ currentAppeal.appealId }}</el-descriptions-item>
            <el-descriptions-item label="答题ID">{{ currentAppeal.answerId }}</el-descriptions-item>
            <el-descriptions-item label="作业">
              #{{ currentAppeal.assignmentId }} {{ currentAppeal.assignmentTitle || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="学生ID">{{ currentAppeal.studentId }}</el-descriptions-item>
            <el-descriptions-item label="状态">{{ appealStatusText(currentAppeal.appealStatus) }}</el-descriptions-item>
            <el-descriptions-item label="提交时间">{{ formatDateTime(currentAppeal.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="申诉理由" :span="2">{{ currentAppeal.reasonText || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <AttemptQuestionReview
          v-if="handleEvidence"
          :snapshot="handleEvidence.questionSnapshot"
          :student-answer="handleEvidence.studentAnswer"
        />

        <el-card class="page-card" v-if="(handleEvidence?.gradingRecords || []).length">
          <h3 class="card-title">已有评分记录</h3>
          <div v-for="(record, idx) in handleEvidence.gradingRecords || []" :key="idx" class="record-item">
            <p class="muted">
              模式：{{ labelBy(GRADING_MODE_OPTIONS, record.gradingMode) }} |
              分数：{{ record.score ?? '-' }} |
              置信度：{{ record.confidence ?? '-' }} |
              需复核：{{ record.needsReview ? '是' : '否' }}
            </p>
            <JsonPreview :data="record.detailJson" max-height="140px" />
            <p class="muted">评语：{{ record.reviewComment || '-' }}</p>
          </div>
        </el-card>

        <el-card class="page-card">
          <h3 class="card-title">处理结果</h3>
          <el-form label-width="100px">
            <el-form-item label="处理动作">
              <el-radio-group v-model="handleForm.action">
                <el-radio-button label="approve">通过</el-radio-button>
                <el-radio-button label="reject">驳回</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="最终分数">
              <el-input-number v-model="handleForm.finalScore" :min="0" />
            </el-form-item>
            <el-form-item label="处理说明">
              <el-input v-model="handleForm.decisionComment" type="textarea" :rows="5" />
            </el-form-item>
          </el-form>
        </el-card>
      </div>
      <template #footer>
        <el-button @click="handleVisible = false">取消</el-button>
        <el-button type="primary" :loading="handleLoading" @click="submitHandleAppeal">提交处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.review-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 24px;
  border: 1px solid #d7e6df;
  border-radius: 8px;
  background: linear-gradient(135deg, #f4fbf8 0%, #fffaf0 100%);
}

.review-hero h1 {
  margin: 4px 0 6px;
  font-size: 26px;
  color: #18322b;
}

.review-hero p {
  margin: 0;
  color: #5f6f68;
}

.eyebrow {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  color: #0f9f7a;
}

.grading-card {
  overflow: hidden;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr)) auto auto;
  gap: 10px;
  margin-bottom: 14px;
}

.llm-panel {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) 120px 110px max-content;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 14px;
  border: 1px solid #f0d9a0;
  border-radius: 8px;
  background: #fffaf0;
}

.llm-model {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.llm-model .el-select {
  width: 260px;
  flex: 0 0 260px;
}

.llm-number {
  width: 100%;
  min-width: 0;
}

.llm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  min-width: max-content;
}

.llm-actions .el-button + .el-button {
  margin-left: 0;
}

.table-pager {
  margin-top: 12px;
  justify-content: flex-end;
}

.drawer-stack,
.dialog-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paper-review-shell {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.paper-review-grid {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.question-nav {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 190px);
  padding: 14px;
  overflow: auto;
  border: 1px solid #d9e4ef;
  border-radius: 8px;
  background: #fbfdff;
}

.question-nav-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #18322b;
}

.question-nav-title span {
  color: #7a8a83;
  font-size: 13px;
}

.question-nav-item {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 12px;
  border: 1px solid #d9e4ef;
  border-radius: 8px;
  color: #263b35;
  text-align: left;
  background: #ffffff;
  cursor: pointer;
}

.question-nav-item:hover,
.question-nav-item.is-active {
  border-color: #0f9f7a;
  background: #f2fbf7;
}

.question-nav-item strong {
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-no,
.question-meta {
  color: #718078;
  font-size: 12px;
}

.question-review-main {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
}

.grade-panel {
  border-color: #b8e1d4;
}

.score-hint {
  margin-left: 10px;
}

.grade-actions {
  display: flex;
  justify-content: flex-end;
}

.record-item {
  border: 1px solid #d9e4ef;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

.muted {
  color: #7a8a83;
}

@media (max-width: 900px) {
  .review-hero,
  .llm-model {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-grid,
  .paper-review-grid {
    grid-template-columns: 1fr;
  }

  .llm-panel {
    grid-template-columns: 1fr 1fr;
  }

  .llm-model,
  .llm-actions {
    grid-column: 1 / -1;
  }

  .llm-model .el-select {
    width: 100%;
    flex-basis: auto;
  }

  .llm-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .question-nav {
    position: static;
    max-height: 360px;
  }
}
</style>
