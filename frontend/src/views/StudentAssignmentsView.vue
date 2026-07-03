<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DataAnalysis, DocumentChecked, MagicStick, Search } from '@element-plus/icons-vue'
import { assignmentApi, attemptApi, questionApi, tagApi } from '@/api/services'
import QuestionDetailPreview from '@/components/QuestionDetailPreview.vue'
import { formatDateTime, splitCsv } from '@/utils/format'
import {
  ASSIGNMENT_STATUS_OPTIONS,
  CHAPTER_OPTIONS,
  QUESTION_TYPE_OPTIONS,
  labelBy,
  typeBy,
} from '@/constants/enums'

const router = useRouter()
const route = useRoute()
const bankOnly = computed(() => route.name === 'student-question-bank')

const loading = ref(false)
const list = ref([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const status = ref('all')

const practiceLoading = ref(false)
const practiceForm = reactive({
  mode: 'random',
  totalScore: 100,
  tagIdsCsv: '',
  questionTypesCsv: '',
  chapters: [],
})

const tags = ref([])
const questionLoading = ref(false)
const questionList = ref([])
const questionPage = ref(1)
const questionSize = ref(10)
const questionTotal = ref(0)
const selectedQuestionIds = ref([])

const questionQuery = reactive({
  keyword: '',
  chapter: '',
  difficulty: undefined,
  questionType: undefined,
  tagIds: [],
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

const assignmentStats = computed(() => [
  { label: '可见作业', value: total.value, icon: DocumentChecked },
  { label: '题库题目', value: questionTotal.value, icon: DataAnalysis },
  { label: '已选题目', value: selectedQuestionIds.value.length, icon: MagicStick },
])

async function loadAssignments() {
  loading.value = true
  try {
    const data = await assignmentApi.my(status.value, page.value, size.value)
    list.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载作业失败')
  } finally {
    loading.value = false
  }
}

async function loadTags() {
  try {
    tags.value = await tagApi.list('')
  } catch {
    tags.value = []
  }
}

async function loadQuestionBank() {
  questionLoading.value = true
  try {
    const data = await questionApi.search({
      studentView: true,
      keyword: questionQuery.keyword,
      chapter: questionQuery.chapter || undefined,
      difficulty: questionQuery.difficulty,
      questionType: questionQuery.questionType,
      tagIds: questionQuery.tagIds.length ? questionQuery.tagIds.join(',') : undefined,
      page: questionPage.value,
      size: questionSize.value,
    })
    questionList.value = data.list || []
    questionTotal.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '加载题库失败')
  } finally {
    questionLoading.value = false
  }
}

function resetQuestionQuery() {
  questionQuery.keyword = ''
  questionQuery.chapter = ''
  questionQuery.difficulty = undefined
  questionQuery.questionType = undefined
  questionQuery.tagIds = []
  questionPage.value = 1
  loadQuestionBank()
}

function handleQuestionSelectionChange(rows) {
  selectedQuestionIds.value = (rows || []).map((row) => row.id)
}

async function startAssignment(assignmentId) {
  try {
    const data = await attemptApi.startAssignment(assignmentId)
    ElMessage.success(`作答已开始（第 ${data.attemptNo} 次）`)
    router.push(`/attempts/${data.attemptId}/work`)
  } catch (error) {
    ElMessage.error(error.message || '开始作答失败')
  }
}

async function startPracticeByScope(scope) {
  practiceLoading.value = true
  try {
    const payload = {
      mode: practiceForm.mode,
      totalScore: Number(practiceForm.totalScore) || 100,
      scope,
    }
    const data = await attemptApi.startPractice(payload)
    ElMessage.success('练习已生成')
    router.push(`/attempts/${data.attemptId}/work`)
  } catch (error) {
    ElMessage.error(error.message || '生成练习失败')
  } finally {
    practiceLoading.value = false
  }
}

async function startQuickPractice() {
  await startPracticeByScope({
    tagIds: splitCsv(practiceForm.tagIdsCsv, (v) => Number(v)).filter((v) => !Number.isNaN(v)),
    chapters: practiceForm.chapters,
    questionTypes: splitCsv(practiceForm.questionTypesCsv, (v) => Number(v)).filter((v) => !Number.isNaN(v)),
  })
}

async function startSelectedPractice() {
  if (!selectedQuestionIds.value.length) {
    ElMessage.warning('请先勾选至少一道题')
    return
  }
  await startPracticeByScope({ questionIds: selectedQuestionIds.value })
}

async function openQuestionDetail(questionId) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = null
  try {
    detailData.value = await questionApi.detail(questionId)
  } catch (error) {
    ElMessage.error(error.message || '加载题目详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

onMounted(async () => {
  await loadTags()
  await Promise.all([loadAssignments(), loadQuestionBank()])
})
</script>

<template>
  <div class="student-practice-page">
    <section class="practice-hero" aria-labelledby="practice-title">
      <div>
        <p class="eyebrow">{{ bankOnly ? 'Question Bank' : 'Learning Tasks' }}</p>
        <h1 id="practice-title">{{ bankOnly ? '题库练习' : '我的作业与练习' }}</h1>
        <p>{{ bankOnly ? '按章节、题型、难度筛选题目，选择后直接生成练习。' : '集中查看老师布置的任务，也可以按知识点快速生成自测练习。' }}</p>
      </div>
      <div class="hero-stats">
        <article v-for="item in assignmentStats" :key="item.label">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>
    </section>

    <section v-if="!bankOnly" class="surface-panel">
      <div class="section-heading">
        <div>
          <h2>我的作业</h2>
          <p>按状态筛选作业，开始作答后会进入计时作答页。</p>
        </div>
        <div class="toolbar-inline">
          <el-select v-model="status" aria-label="作业状态" style="width: 180px">
            <el-option label="全部" value="all" />
            <el-option label="进行中" value="ongoing" />
            <el-option label="已过期" value="expired" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="page = 1; loadAssignments()">查询</el-button>
          <el-button @click="status = 'all'; page = 1; loadAssignments()">重置</el-button>
        </div>
      </div>

      <el-table :data="list" border v-loading="loading">
        <el-table-column prop="assignmentTitle" label="标题" min-width="220" />
        <el-table-column label="开始时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="截止时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.endTime) }}</template>
        </el-table-column>
        <el-table-column prop="timeLimitMin" label="限时(分钟)" width="110" />
        <el-table-column prop="myAttemptCount" label="我的次数" width="90" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="typeBy(ASSIGNMENT_STATUS_OPTIONS, row.publishStatus)">
              {{ labelBy(ASSIGNMENT_STATUS_OPTIONS, row.publishStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="startAssignment(row.assignmentId)">开始作答</el-button>
            <el-button link @click="router.push('/attempts/history')">作答记录</el-button>
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
        @size-change="(v) => { size = v; page = 1; loadAssignments() }"
        @current-change="(v) => { page = v; loadAssignments() }"
      />
    </section>

    <section v-if="!bankOnly" class="surface-panel quick-practice">
      <div class="section-heading">
        <div>
          <h2>快速练习</h2>
          <p>少量条件即可生成一套练习，适合课后自测。</p>
        </div>
      </div>
      <el-form class="practice-form" label-position="top">
        <el-form-item label="模式">
          <el-radio-group v-model="practiceForm.mode">
            <el-radio-button label="random">随机模式</el-radio-button>
            <el-radio-button label="adaptive">自适应模式</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="总分">
          <el-input-number v-model="practiceForm.totalScore" :min="10" :step="10" />
          <span class="practice-tip">编程题按 20 分计算，其余练习题按 10 分计算。</span>
        </el-form-item>
        <el-form-item label="章节">
          <el-select v-model="practiceForm.chapters" multiple collapse-tags placeholder="可选">
            <el-option v-for="opt in CHAPTER_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签ID列表">
          <el-input v-model="practiceForm.tagIdsCsv" placeholder="例如 1,2,3（可选）" />
        </el-form-item>
        <el-form-item label="题型列表">
          <el-input v-model="practiceForm.questionTypesCsv" placeholder="例如 1,2,6（可选）" />
        </el-form-item>
        <el-form-item class="form-action">
          <el-button type="success" :icon="MagicStick" :loading="practiceLoading" @click="startQuickPractice">生成练习并开始</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="surface-panel">
      <div class="section-heading">
        <div>
          <h2>题库练习</h2>
          <p>先筛选，再勾选题目生成练习；也可以直接查看题目详情。</p>
        </div>
        <el-button
          type="success"
          :loading="practiceLoading"
          :disabled="selectedQuestionIds.length === 0"
          @click="startSelectedPractice"
        >
          用选中题开始练习
        </el-button>
      </div>

      <div class="filter-grid">
        <el-input v-model="questionQuery.keyword" clearable placeholder="关键词" />
        <el-select v-model="questionQuery.chapter" clearable placeholder="章节">
          <el-option v-for="opt in CHAPTER_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="questionQuery.questionType" clearable placeholder="题型">
          <el-option v-for="opt in QUESTION_TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-select v-model="questionQuery.difficulty" clearable placeholder="难度">
          <el-option v-for="n in [1, 2, 3, 4, 5]" :key="n" :label="`${n}`" :value="n" />
        </el-select>
        <el-select v-model="questionQuery.tagIds" multiple collapse-tags placeholder="标签">
          <el-option v-for="tag in tags" :key="tag.id" :label="tag.tagName" :value="tag.id" />
        </el-select>
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" @click="questionPage = 1; loadQuestionBank()">查询</el-button>
          <el-button @click="resetQuestionQuery">重置</el-button>
        </div>
      </div>

      <el-table :data="questionList" border v-loading="questionLoading" @selection-change="handleQuestionSelectionChange">
        <el-table-column type="selection" width="48" />
        <el-table-column prop="title" label="标题" min-width="260" show-overflow-tooltip />
        <el-table-column label="题型" width="110">
          <template #default="{ row }">{{ labelBy(QUESTION_TYPE_OPTIONS, row.questionType) }}</template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="80" />
        <el-table-column prop="chapter" label="章节" width="140" show-overflow-tooltip />
        <el-table-column label="标签" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ (row.tagNames || []).join('、') || '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openQuestionDetail(row.id)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="table-pager"
        background
        layout="total, sizes, prev, pager, next"
        :current-page="questionPage"
        :page-size="questionSize"
        :page-sizes="[10, 20, 50]"
        :total="questionTotal"
        @size-change="(v) => { questionSize = v; questionPage = 1; loadQuestionBank() }"
        @current-change="(v) => { questionPage = v; loadQuestionBank() }"
      />
    </section>

    <el-dialog v-model="detailVisible" title="题目详情" width="900px">
      <div v-loading="detailLoading">
        <QuestionDetailPreview v-if="detailData" :detail="detailData" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-practice-page {
  display: grid;
  gap: 18px;
}

.practice-hero,
.surface-panel {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 26px rgba(53, 83, 73, 0.06);
}

.practice-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  background:
    linear-gradient(120deg, rgba(79, 143, 123, 0.12), transparent 55%),
    #ffffff;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--app-primary-dark);
  font-size: 13px;
  font-weight: 800;
}

.practice-hero h1,
.section-heading h2 {
  margin: 0;
  letter-spacing: 0;
}

.practice-hero h1 {
  font-size: 28px;
}

.practice-hero p,
.section-heading p {
  margin: 8px 0 0;
  color: var(--app-text-soft);
  line-height: 1.6;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(94px, 1fr));
  gap: 10px;
}

.hero-stats article {
  min-width: 104px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.hero-stats .el-icon {
  color: var(--app-primary-dark);
}

.hero-stats span,
.hero-stats strong {
  display: block;
}

.hero-stats span {
  margin-top: 8px;
  color: var(--app-text-soft);
  font-size: 12px;
}

.hero-stats strong {
  margin-top: 4px;
  color: var(--app-text);
  font-size: 22px;
}

.surface-panel {
  padding: 18px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.section-heading h2 {
  font-size: 20px;
}

.toolbar-inline,
.filter-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.practice-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 18px;
}

.practice-form .el-select,
.practice-form .el-input {
  width: 100%;
}

.practice-tip {
  margin-left: 12px;
  color: var(--app-text-soft);
  font-size: 13px;
}

.form-action {
  align-self: end;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) minmax(150px, 0.8fr) minmax(130px, 0.7fr) minmax(110px, 0.6fr) minmax(220px, 1fr) auto;
  gap: 10px;
  margin-bottom: 14px;
}

.table-pager {
  margin-top: 12px;
  justify-content: flex-end;
}

@media (max-width: 1180px) {
  .practice-hero,
  .section-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .practice-hero,
  .surface-panel {
    padding: 14px;
  }

  .hero-stats,
  .practice-form,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-inline .el-select,
  .toolbar-inline .el-button,
  .filter-actions .el-button {
    width: 100%;
  }
}
</style>
