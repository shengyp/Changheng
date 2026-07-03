<script setup>
import { computed, ref, watch } from 'vue'
import { QUESTION_TYPE_OPTIONS, labelBy } from '@/constants/enums'

const props = defineProps({
  detail: {
    type: Object,
    default: null,
  },
})

const analysisTab = ref('teacher')

const optionList = computed(() => (Array.isArray(props.detail?.options) ? props.detail.options : []))
const tagNames = computed(() => (Array.isArray(props.detail?.tagNames) ? props.detail.tagNames : []))
const llmAnalyses = computed(() => (Array.isArray(props.detail?.llmAnalyses) ? props.detail.llmAnalyses : []))

const analysisOptions = computed(() => [
  {
    key: 'teacher',
    label: '教师解析',
    ready: Boolean(props.detail?.analysisText),
  },
  ...llmAnalyses.value.map((item) => ({
    key: item.analysisKey,
    label: item.analysisLabel,
    ready: Boolean(item?.hasAnalysis || item?.analysisText),
  })),
])

const activeModelAnalysis = computed(
  () => llmAnalyses.value.find((item) => item.analysisKey === analysisTab.value) || null,
)

const analysisText = computed(() => {
  if (analysisTab.value === 'teacher') {
    return props.detail?.analysisText || '暂无教师解析'
  }
  return activeModelAnalysis.value?.analysisText || '暂无该模型解析'
})

const analysisMeta = computed(() => {
  if (analysisTab.value === 'teacher') {
    return []
  }
  const current = activeModelAnalysis.value
  if (!current) {
    return []
  }
  return [
    current.modelName ? `模型 ${current.modelName}` : '',
    current.latencyMs ? `耗时 ${current.latencyMs} ms` : '',
    current.llmCallId ? `调用ID ${current.llmCallId}` : '',
  ].filter(Boolean)
})

watch(
  analysisOptions,
  (items) => {
    if (!items.some((item) => item.key === analysisTab.value)) {
      analysisTab.value = 'teacher'
    }
  },
  { immediate: true },
)

function typeLabel(value) {
  return labelBy(QUESTION_TYPE_OPTIONS, Number(value || 0), '未知题型')
}

function questionTitle(detail) {
  if (!detail) {
    return '-'
  }
  return detail.title || detail.stem || `题目 #${detail.id || '-'}`
}

function analysisOptionClass(item) {
  return {
    'analysis-tab--active': analysisTab.value === item.key,
    'analysis-tab--ready': item.ready,
    'analysis-tab--missing': !item.ready,
  }
}
</script>

<template>
  <div v-if="detail" class="question-detail">
    <div class="detail-meta">
      <el-tag type="primary">题目ID {{ detail.id || '-' }}</el-tag>
      <el-tag type="warning">{{ typeLabel(detail.questionType) }}</el-tag>
      <el-tag type="success">难度 {{ detail.difficulty || '-' }}</el-tag>
      <el-tag v-if="detail.chapter" type="info">{{ detail.chapter }}</el-tag>
    </div>

    <h3 class="detail-title">{{ questionTitle(detail) }}</h3>

    <div v-if="tagNames.length" class="detail-section">
      <div class="detail-label">标签</div>
      <div class="detail-content">{{ tagNames.join('、') }}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">题干</div>
      <div class="detail-content pre-wrap">{{ detail.stem || '-' }}</div>
    </div>

    <div v-if="optionList.length" class="detail-section">
      <div class="detail-label">选项</div>
      <div class="detail-content option-list">
        <div v-for="opt in optionList" :key="opt.id || opt.optionLabel" class="option-item">
          <span>{{ opt.optionLabel }}. {{ opt.optionContent }}</span>
          <el-tag v-if="Number(opt.isCorrect) === 1" type="success" size="small">正确答案</el-tag>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-label">标准答案</div>
      <div class="detail-content pre-wrap">{{ detail.standardAnswer || '-' }}</div>
    </div>

    <div class="detail-section">
      <div class="detail-label">解析</div>
      <div class="analysis-switch">
        <div class="analysis-tabs">
          <button
            v-for="item in analysisOptions"
            :key="item.key"
            type="button"
            class="analysis-tab"
            :class="analysisOptionClass(item)"
            @click="analysisTab = item.key"
          >
            {{ item.label }}
          </button>
        </div>
        <div v-if="analysisMeta.length" class="analysis-meta">
          <span v-for="item in analysisMeta" :key="item">{{ item }}</span>
        </div>
      </div>
      <div class="detail-content pre-wrap">{{ analysisText }}</div>
      <el-alert
        v-if="analysisTab !== 'teacher' && activeModelAnalysis?.errorMessage"
        type="warning"
        :closable="false"
        :title="activeModelAnalysis.errorMessage"
      />
    </div>
  </div>
</template>

<style scoped>
.question-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-title {
  margin: 0;
  color: #102a43;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-label {
  color: #334e68;
  font-weight: 700;
}

.detail-content {
  padding: 12px;
  border: 1px solid #d9e4ef;
  border-radius: 10px;
  background: #f8fbff;
}

.pre-wrap {
  white-space: pre-wrap;
  line-height: 1.7;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.6;
}

.analysis-switch {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.analysis-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.analysis-tab {
  border: 1px solid #9ae6b4;
  border-radius: 18px;
  background: #f0fff4;
  color: #1f6f43;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.analysis-tab--missing {
  border-color: #f5c2c7;
  background: #fff5f5;
  color: #c0392b;
}

.analysis-tab--active.analysis-tab--ready {
  background: #22c55e;
  border-color: #22c55e;
  color: #fff;
  box-shadow: 0 10px 24px rgba(34, 197, 94, 0.22);
}

.analysis-tab--active.analysis-tab--missing {
  background: #fff;
  border-color: #ef4444;
  color: #c0392b;
}

.analysis-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  color: #6b7c93;
  font-size: 13px;
}
</style>
