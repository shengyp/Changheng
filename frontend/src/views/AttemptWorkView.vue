<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  Check,
  Clock,
  DocumentChecked,
  Lock,
  Memo,
  Promotion,
  Warning,
} from '@element-plus/icons-vue'
import { answerApi, attemptApi } from '@/api/services'
import { formatDateTime, parseJsonSafe } from '@/utils/format'
import { QUESTION_TYPE_OPTIONS, labelBy } from '@/constants/enums'
import { useStudentAssistantStore } from '@/stores/studentAssistant'

const route = useRoute()
const router = useRouter()
const assistant = useStudentAssistantStore()
const attemptId = computed(() => Number(route.params.attemptId))

const loading = ref(false)
const actionLoading = ref(false)
const checkLoading = ref(false)
const tutorLoading = ref(false)
const questions = ref([])
const currentIndex = ref(0)

const answerInput = ref('')
const multiAnswer = ref([])
const syncingEditor = ref(false)

const deadlineAt = ref('')
const remainingSec = ref(null)
const autoSubmitting = ref(false)
let countdownTimer = null

const tutorInput = ref('')

const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const currentSnapshot = computed(() => parseJsonSafe(currentQuestion.value?.snapshotJson, {}) || {})
const currentQuestionType = computed(() => Number(currentSnapshot.value.questionType || 0))
const currentOptions = computed(() => {
  const raw = Array.isArray(currentSnapshot.value.options) ? currentSnapshot.value.options : []
  if (!raw.length && currentQuestionType.value === 3) return createTrueFalseOptions()
  return [...raw]
})

const isSingleChoice = computed(() => [1, 3].includes(currentQuestionType.value))
const isMultiChoice = computed(() => currentQuestionType.value === 2)
const answeredCount = computed(() => questions.value.filter((item) => String(item.answerContent || '').trim()).length)
const checkedCount = computed(() => questions.value.filter((item) => item.checkResult).length)
const deadlineText = computed(() => (deadlineAt.value ? formatDateTime(deadlineAt.value) : '不限时'))
const remainingText = computed(() => formatRemain(remainingSec.value))
const attemptType = computed(() => Number(questions.value[0]?.attemptType || 0))
const isPracticeMode = computed(() => attemptType.value === 2)
const isExamMode = computed(() => !isPracticeMode.value)
const modeLabel = computed(() => (isPracticeMode.value ? '练习题模式' : '模拟考试模式'))
const aiDisabledReason = computed(() => (isExamMode.value ? '模拟考试期间不能使用 AI 答疑。提交后可在结果页复盘。' : ''))
const activeCheckResult = computed(() => currentQuestion.value?.checkResult || null)
const activeTutorMessages = computed(() => currentQuestion.value?.aiChatMessages || [])
const progressPercent = computed(() => (questions.value.length ? Math.round((answeredCount.value / questions.value.length) * 100) : 0))

assistant.registerContext({
  routeName: 'attempt-work',
  pageTitle: '作答中',
  attemptId: attemptId.value,
  aiLocked: true,
  lockedReason: '正在加载作答模式，小C会在确认是练习模式后开放。',
})

function registerAssistantContext() {
  const snapshot = currentSnapshot.value || {}
  const tags = Array.isArray(snapshot.tags)
    ? snapshot.tags.map((item) => item?.name || item).filter(Boolean)
    : []
  assistant.registerContext({
    routeName: 'attempt-work',
    pageTitle: '作答中',
    attemptId: attemptId.value,
    attemptQuestionId: currentQuestion.value?.attemptQuestionId || null,
    attemptType: attemptType.value || null,
    modeLabel: modeLabel.value,
    currentIndex: currentIndex.value + 1,
    totalQuestions: questions.value.length,
    aiLocked: questions.value.length === 0 || isExamMode.value,
    lockedReason:
      questions.value.length === 0
        ? '正在加载作答模式，小C会在确认是练习模式后开放。'
        : aiDisabledReason.value,
    questionTitle: snapshot.title || '',
    questionStem: snapshot.stem || '',
    questionType: currentQuestionType.value || '',
    chapter: snapshot.chapter || '',
    tags,
    studentAnswer: currentQuestion.value?.answerContent || buildAnswerContent(),
    checkResult: activeCheckResult.value,
  })
}

function enrichQuestion(item) {
  return {
    ...item,
    checkResult: item.checkResult || null,
    aiChatMessages: Array.isArray(item.aiChatMessages) ? item.aiChatMessages : [],
    lastCheckedAnswer: item.lastCheckedAnswer || '',
  }
}

function syncEditorFromCurrent() {
  syncingEditor.value = true
  const value = currentQuestion.value?.answerContent || ''
  if (isMultiChoice.value) {
    multiAnswer.value = value.split(',').map((v) => v.trim()).filter(Boolean)
    answerInput.value = ''
  } else {
    answerInput.value = value
    multiAnswer.value = []
  }
  nextTick(() => {
    syncingEditor.value = false
  })
}

function syncCurrentQuestionFromEditor() {
  if (syncingEditor.value || !currentQuestion.value) return
  currentQuestion.value.answerContent = buildAnswerContent()
}

watch(currentQuestion, () => {
  tutorInput.value = ''
  syncEditorFromCurrent()
})

watch(answerInput, syncCurrentQuestionFromEditor)

watch(
  multiAnswer,
  () => {
    syncCurrentQuestionFromEditor()
  },
  { deep: true },
)

watch(
  [currentQuestion, answerInput, multiAnswer, activeCheckResult, attemptType],
  () => {
    registerAssistantContext()
  },
  { deep: true },
)

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function formatRemain(value) {
  if (value == null) return '不限时'
  const safe = Math.max(Number(value) || 0, 0)
  const hours = String(Math.floor(safe / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

function deadlineTimestamp(value) {
  if (!value) return NaN
  return new Date(String(value).replace(' ', 'T')).getTime()
}

function refreshCountdown() {
  if (!deadlineAt.value) {
    remainingSec.value = null
    return
  }
  const diffMs = deadlineTimestamp(deadlineAt.value) - Date.now()
  remainingSec.value = Math.max(Math.floor(diffMs / 1000), 0)
  if (!autoSubmitting.value && remainingSec.value <= 3) {
    autoSubmitting.value = true
    submitWholeAttempt({ auto: true })
  }
}

function initCountdown() {
  stopCountdown()
  const meta = questions.value[0] || {}
  deadlineAt.value = meta.deadlineAt || ''
  remainingSec.value = meta.remainingSec ?? null
  autoSubmitting.value = false
  if (!deadlineAt.value) return
  refreshCountdown()
  countdownTimer = setInterval(refreshCountdown, 1000)
}

function questionState(item, idx) {
  if (idx === currentIndex.value) return 'current'
  if (item.checkResult?.isCorrect) return 'correct'
  if (item.checkResult && !item.checkResult.isCorrect) return 'wrong'
  if (String(item.answerContent || '').trim()) return 'answered'
  return 'empty'
}

function answerStatusText(item) {
  if (item.checkResult?.isCorrect) return '正确'
  if (item.checkResult && !item.checkResult.isCorrect) return '待修正'
  if (String(item.answerContent || '').trim()) return '已作答'
  return '未作答'
}

function buildAnswerContent() {
  if (isMultiChoice.value) return multiAnswer.value.join(',')
  return answerInput.value || ''
}

function createTrueFalseOptions() {
  return [
    { optionLabel: '对', optionContent: '对' },
    { optionLabel: '错', optionContent: '错' },
  ]
}

function optionDisplayText(option) {
  if (currentQuestionType.value === 3) return option.optionContent || option.optionLabel
  const label = option.optionLabel || ''
  const content = option.optionContent || ''
  return label ? `${label}. ${content}` : content
}

async function loadQuestions() {
  loading.value = true
  try {
    const data = await attemptApi.questions(attemptId.value)
    questions.value = (data || []).map(enrichQuestion)
    if (questions.value.length === 0) {
      ElMessage.warning('该作答没有题目')
      return
    }
    currentIndex.value = 0
    syncEditorFromCurrent()
    initCountdown()
    registerAssistantContext()
  } catch (error) {
    if (error?.code === 'CONFLICT' || /自动提交/.test(error?.message || '')) {
      ElMessage.warning(error.message || '作答已自动提交，请到作答记录查看结果')
      router.replace('/attempts/history')
      return
    }
    ElMessage.error(error.message || '加载题目失败')
  } finally {
    loading.value = false
  }
}

function jumpTo(index) {
  if (index < 0 || index >= questions.value.length) return
  syncCurrentQuestionFromEditor()
  currentIndex.value = index
}

async function saveAllDrafts(options = {}) {
  syncCurrentQuestionFromEditor()
  const draftQuestions = questions.value.filter((item) => item?.answerId)
  if (!draftQuestions.length) {
    if (!options.silent) ElMessage.warning('当前作答没有可保存的题目')
    return
  }
  actionLoading.value = true
  try {
    await Promise.all(draftQuestions.map((item) => answerApi.saveDraft(item.answerId, item.answerContent || '')))
    draftQuestions.forEach((item) => {
      item.answerStatus = 1
    })
    if (!options.silent) ElMessage.success('草稿已保存')
  } catch (error) {
    if (!options.silent && !options.ignoreError) ElMessage.error(error.message || '保存失败')
    if (!options.ignoreError) throw error
  } finally {
    actionLoading.value = false
  }
}

async function checkCurrentQuestion() {
  if (!currentQuestion.value || isExamMode.value) return
  syncCurrentQuestionFromEditor()
  if (!String(currentQuestion.value.answerContent || '').trim()) {
    ElMessage.warning('请先完成当前题目再检查')
    return
  }
  checkLoading.value = true
  try {
    const result = await attemptApi.checkQuestion(attemptId.value, currentQuestion.value.attemptQuestionId, {
      questionSnapshot: currentQuestion.value.snapshotJson,
      questionType: currentQuestionType.value,
      score: currentQuestion.value.score,
      studentAnswer: currentQuestion.value.answerContent || '',
    })
    currentQuestion.value.checkResult = result
    currentQuestion.value.lastCheckedAnswer = currentQuestion.value.answerContent || ''
    ElMessage.success(result?.isCorrect ? '本题检查为正确' : '已生成本题反馈')
  } catch (error) {
    ElMessage.error(error.message || '检查失败')
  } finally {
    checkLoading.value = false
  }
}

async function sendTutorQuestion(text = '') {
  if (!currentQuestion.value || isExamMode.value) return
  syncCurrentQuestionFromEditor()
  const content = String(text || tutorInput.value || '').trim()
  if (!content) {
    ElMessage.warning('请输入想问的问题')
    return
  }
  const messages = [...activeTutorMessages.value, { role: 'user', content }]
  currentQuestion.value.aiChatMessages = messages
  tutorInput.value = ''
  tutorLoading.value = true
  try {
    const result = await attemptApi.questionTutor(attemptId.value, currentQuestion.value.attemptQuestionId, {
      questionSnapshot: currentQuestion.value.snapshotJson,
      studentAnswer: currentQuestion.value.answerContent || '',
      checkResult: activeCheckResult.value,
      messages,
    })
    currentQuestion.value.aiChatMessages = [
      ...messages,
      {
        role: 'assistant',
        content: result?.reply || '暂时没有生成新的讲解。',
        sources: result?.sources || [],
      },
    ]
  } catch (error) {
    ElMessage.error(error.message || 'AI 答疑失败')
  } finally {
    tutorLoading.value = false
  }
}

async function submitWholeAttempt(options = {}) {
  const auto = Boolean(options.auto)
  if (actionLoading.value) return
  try {
    if (!auto) {
      await ElMessageBox.confirm('确认提交整份作答？提交后不可修改。', '提交确认', { type: 'warning' })
    }
    await saveAllDrafts({ silent: true, ignoreError: auto })
    actionLoading.value = true
    await attemptApi.submit(attemptId.value)
    stopCountdown()
    ElMessage.success(auto ? '已到截止时间，系统已自动提交' : '整份作答提交成功，请等待系统批改后到作答记录查看成绩')
    router.replace('/attempts/history')
  } catch (error) {
    if (error?.code === 'TIMEOUT') {
      stopCountdown()
      ElMessage.success(auto ? '系统正在自动提交，请稍后到作答记录查看成绩' : '作答已提交，系统正在批改中，请稍后到作答记录查看成绩')
      router.replace('/attempts/history')
      return
    }
    if (auto && (error?.code === 'CONFLICT' || /自动提交/.test(error?.message || ''))) {
      stopCountdown()
      router.replace('/attempts/history')
      return
    }
    if (error !== 'cancel') ElMessage.error(error.message || '提交失败')
  } finally {
    actionLoading.value = false
  }
}

onMounted(loadQuestions)
onUnmounted(stopCountdown)
</script>

<template>
  <div class="attempt-work-page" v-loading="loading">
    <section class="attempt-topbar" aria-labelledby="attempt-title">
      <div>
        <p class="eyebrow">{{ modeLabel }}</p>
        <h1 id="attempt-title">学生作答</h1>
        <p>已完成 {{ answeredCount }}/{{ questions.length }} 题，{{ isPracticeMode ? '练习模式支持即时检查与 AI 答疑。' : '模拟考试期间 AI 答疑已锁定。' }}</p>
      </div>
      <div class="topbar-actions">
        <el-tag :type="remainingSec !== null && remainingSec <= 180 ? 'danger' : 'success'" size="large">
          <el-icon><Clock /></el-icon>
          {{ remainingText }}
        </el-tag>
        <el-button :loading="actionLoading" @click="saveAllDrafts">保存草稿</el-button>
        <el-button type="success" :loading="actionLoading" @click="submitWholeAttempt()">提交</el-button>
      </div>
    </section>

    <section class="progress-panel" aria-label="答题进度">
      <el-progress :percentage="progressPercent" :stroke-width="10" />
      <div class="progress-meta">
        <span>截止时间：{{ deadlineText }}</span>
        <span>已检查：{{ checkedCount }} 题</span>
      </div>
    </section>

    <div class="attempt-layout">
      <aside class="question-nav-panel" aria-label="题目导航">
        <div class="panel-title">
          <h2>题目导航</h2>
          <span>{{ questions.length }} 题</span>
        </div>
        <div class="question-nav-grid">
          <button
            v-for="(item, idx) in questions"
            :key="item.attemptQuestionId"
            type="button"
            class="question-nav-button"
            :class="`is-${questionState(item, idx)}`"
            :aria-current="idx === currentIndex ? 'step' : undefined"
            @click="jumpTo(idx)"
          >
            <strong>{{ idx + 1 }}</strong>
            <small>{{ answerStatusText(item) }}</small>
          </button>
        </div>
      </aside>

      <main class="answer-panel">
        <template v-if="currentQuestion">
          <div class="answer-head">
            <div>
              <p class="eyebrow">Question {{ currentIndex + 1 }}</p>
              <h2>{{ currentSnapshot.title || `第 ${currentIndex + 1} 题` }}</h2>
              <div class="question-tags">
                <el-tag type="warning" effect="plain">{{ labelBy(QUESTION_TYPE_OPTIONS, currentQuestionType, '未知题型') }}</el-tag>
                <el-tag type="success" effect="plain">分值 {{ currentQuestion.score || 0 }}</el-tag>
                <el-tag v-if="currentSnapshot.chapter" type="info" effect="plain">{{ currentSnapshot.chapter }}</el-tag>
              </div>
            </div>
            <el-tag :type="String(currentQuestion.answerContent || '').trim() ? 'success' : 'info'" size="large">
              {{ String(currentQuestion.answerContent || '').trim() ? '已作答' : '未作答' }}
            </el-tag>
          </div>

          <el-alert
            v-if="isExamMode"
            type="warning"
            :closable="false"
            class="mode-alert"
            title="模拟考试期间已关闭 AI 答疑与即时检查，请独立完成作答。"
          />

          <article class="question-stem">
            {{ currentSnapshot.stem || '-' }}
          </article>

          <template v-if="isSingleChoice">
            <el-radio-group v-model="answerInput" class="option-list">
              <el-radio v-for="opt in currentOptions" :key="opt.optionLabel" :label="opt.optionLabel" class="option-item">
                {{ optionDisplayText(opt) }}
              </el-radio>
            </el-radio-group>
          </template>

          <template v-else-if="isMultiChoice">
            <el-checkbox-group v-model="multiAnswer" class="option-list">
              <el-checkbox v-for="opt in currentOptions" :key="opt.optionLabel" :label="opt.optionLabel" class="option-item">
                {{ optionDisplayText(opt) }}
              </el-checkbox>
            </el-checkbox-group>
          </template>

          <template v-else>
            <el-input v-model="answerInput" type="textarea" :rows="9" placeholder="请输入你的答案" />
          </template>

          <div class="answer-actions">
            <el-button :disabled="currentIndex === 0" @click="jumpTo(currentIndex - 1)">上一题</el-button>
            <el-button :disabled="currentIndex >= questions.length - 1" @click="jumpTo(currentIndex + 1)">下一题</el-button>
            <el-button v-if="isPracticeMode" type="primary" :icon="Check" :loading="checkLoading" @click="checkCurrentQuestion">检查本题</el-button>
          </div>
        </template>
      </main>

      <aside class="ai-panel" aria-label="答题结果和 AI 答疑">
        <section class="result-card">
          <div class="panel-title">
            <h2>答题结果</h2>
            <el-icon><DocumentChecked /></el-icon>
          </div>
          <template v-if="activeCheckResult">
            <el-tag :type="activeCheckResult.isCorrect ? 'success' : 'danger'" size="large">
              {{ activeCheckResult.isCorrect ? '本题正确' : '需要修正' }}
            </el-tag>
            <p>{{ activeCheckResult.analysisSummary }}</p>
            <div v-if="activeCheckResult.knowledgePoints?.length" class="knowledge-tags">
              <el-tag v-for="item in activeCheckResult.knowledgePoints" :key="item" effect="plain">{{ item }}</el-tag>
            </div>
          </template>
          <template v-else>
            <div class="empty-result">
              <el-icon><Memo /></el-icon>
              <strong>{{ isPracticeMode ? '尚未检查本题' : '提交后查看结果' }}</strong>
              <span>{{ isPracticeMode ? '完成作答后点击“检查本题”查看反馈。' : '模拟考试不展示即时结果。' }}</span>
            </div>
          </template>
        </section>

        <section class="tutor-card" :class="{ 'is-locked': isExamMode }">
          <div class="panel-title">
            <h2>AI 答疑</h2>
            <el-icon><ChatDotRound /></el-icon>
          </div>

          <div v-if="isExamMode" class="locked-state">
            <el-icon><Lock /></el-icon>
            <strong>AI 答疑已锁定</strong>
            <p>{{ aiDisabledReason }}</p>
          </div>

          <template v-else>
            <div class="quick-prompts">
              <el-button size="small" @click="sendTutorQuestion('我错在哪一步')">我错在哪一步</el-button>
              <el-button size="small" @click="sendTutorQuestion('这题正确思路是什么')">正确思路</el-button>
            </div>
            <div class="chat-list">
              <div v-if="activeTutorMessages.length === 0" class="chat-empty">
                <el-icon><Warning /></el-icon>
                <span>可以围绕当前题目提问，AI 会结合你的答案给出提示。</span>
              </div>
              <div
                v-for="(message, index) in activeTutorMessages"
                :key="`${message.role}-${index}`"
                class="chat-message"
                :class="`is-${message.role}`"
              >
                <strong>{{ message.role === 'user' ? '我' : 'AI' }}</strong>
                <p>{{ message.content }}</p>
              </div>
            </div>
            <div class="tutor-input">
              <el-input
                v-model="tutorInput"
                type="textarea"
                :rows="3"
                placeholder="输入你想追问的问题"
                @keyup.ctrl.enter="sendTutorQuestion()"
              />
              <el-button type="primary" :icon="Promotion" :loading="tutorLoading" @click="sendTutorQuestion()">发送</el-button>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped src="@/styles/attempt-work-view.css"></style>


