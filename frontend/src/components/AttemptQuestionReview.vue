<script setup>
import { computed, ref, watch } from 'vue'
import { questionApi } from '@/api/services'
import QuestionDetailPreview from '@/components/QuestionDetailPreview.vue'
import { parseJsonSafe } from '@/utils/format'

const props = defineProps({
  snapshot: {
    type: [Object, String],
    default: null,
  },
  questionId: {
    type: [Number, String],
    default: undefined,
  },
  questionType: {
    type: [Number, String],
    default: undefined,
  },
  title: {
    type: String,
    default: '',
  },
  questionNo: {
    type: [Number, String],
    default: undefined,
  },
  scoreText: {
    type: String,
    default: '',
  },
  resultText: {
    type: String,
    default: '',
  },
  resultType: {
    type: String,
    default: 'info',
  },
  studentAnswer: {
    type: String,
    default: '',
  },
  answerTitle: {
    type: String,
    default: '学生答案',
  },
})

const detailLoading = ref(false)
const fetchedDetail = ref(null)

const snapshotDetail = computed(() => parseJsonSafe(props.snapshot, {}) || {})
const resolvedQuestionId = computed(() => {
  const id = props.questionId ?? snapshotDetail.value?.id
  const number = Number(id)
  return Number.isNaN(number) || number <= 0 ? undefined : number
})

const normalizedDetail = computed(() => {
  const raw = snapshotDetail.value || {}
  const detail = { ...raw }
  if (detail.id == null && props.questionId != null) {
    detail.id = props.questionId
  }
  if (detail.questionType == null && props.questionType != null) {
    detail.questionType = props.questionType
  }
  if (!detail.title && props.title) {
    detail.title = props.title
  }

  const latest = fetchedDetail.value
  if (latest) {
    if (!Array.isArray(detail.tagNames) || !detail.tagNames.length) {
      detail.tagNames = latest.tagNames || []
    }
    detail.analysisText = latest.analysisText ?? detail.analysisText
    detail.analysisSource = latest.analysisSource ?? detail.analysisSource
    detail.analysisLlmCallId = latest.analysisLlmCallId ?? detail.analysisLlmCallId
    detail.llmAnalyses = latest.llmAnalyses || detail.llmAnalyses || []
  }
  return detail
})

const answerText = computed(() => {
  if (props.studentAnswer == null || props.studentAnswer === '') {
    return '未作答'
  }
  return String(props.studentAnswer)
})

watch(
  resolvedQuestionId,
  async (questionId) => {
    fetchedDetail.value = null
    if (!questionId) {
      return
    }
    detailLoading.value = true
    try {
      fetchedDetail.value = await questionApi.detail(questionId)
    } catch {
      fetchedDetail.value = null
    } finally {
      detailLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="review-layout">
    <div class="review-meta">
      <el-tag v-if="questionNo != null" type="primary">题号 {{ questionNo }}</el-tag>
      <el-tag v-if="scoreText" type="success">得分 {{ scoreText }}</el-tag>
      <el-tag v-if="resultText" :type="resultType">{{ resultText }}</el-tag>
    </div>

    <el-card class="review-card" shadow="never" v-loading="detailLoading">
      <template #header>
        <div class="review-card-title">题目详情</div>
      </template>
      <QuestionDetailPreview :detail="normalizedDetail" />
    </el-card>

    <el-card class="review-card" shadow="never">
      <template #header>
        <div class="review-card-title">{{ answerTitle }}</div>
      </template>
      <pre class="answer-block">{{ answerText }}</pre>
    </el-card>
  </div>
</template>

<style scoped>
.review-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-card {
  border-radius: 18px;
}

.review-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #102a43;
}

.answer-block {
  margin: 0;
  min-height: 220px;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid #d9e4ef;
  background: #f8fbff;
  color: #102a43;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
  font-size: 15px;
  overflow-x: auto;
}
</style>
