function parseSnapshot(snapshot) {
  if (!snapshot) return {}
  if (typeof snapshot === 'object') return snapshot
  try {
    return JSON.parse(snapshot)
  } catch {
    return {}
  }
}

function normalizeAttemptAnswer(questionType, answer) {
  const text = String(answer || '').trim()
  if (!text) return ''

  if (Number(questionType) === 2) {
    return text
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
      .sort()
      .join(',')
  }

  if (Number(questionType) === 3) {
    const normalized = text.toUpperCase()
    if (['A', 'T', 'TRUE', '对', '正确'].includes(normalized)) return '对'
    if (['B', 'F', 'FALSE', '错', '错误'].includes(normalized)) return '错'
    return text
  }

  return text.toUpperCase()
}

export function localCheckQuestion(payload = {}) {
  const snapshot = parseSnapshot(payload.questionSnapshot)
  const questionType = Number(payload.questionType || snapshot.questionType || 0)
  const studentAnswer = String(payload.studentAnswer || '').trim()
  const standardAnswer = String(snapshot.standardAnswer || '').trim()
  const knowledgePoints = [snapshot.chapter, ...(snapshot.tags || []).map((item) => item?.name || item)]
    .filter(Boolean)
    .slice(0, 3)

  if (!studentAnswer) {
    return {
      isCorrect: false,
      score: 0,
      correctAnswer: standardAnswer || '请参考教师标准答案',
      analysisSummary: '当前还没有检测到有效作答内容，请先完成本题再检查。',
      knowledgePoints,
      canAskAi: false,
      source: 'local',
    }
  }

  if ([1, 2, 3, 4].includes(questionType)) {
    const normalizedStudent = normalizeAttemptAnswer(questionType, studentAnswer)
    const normalizedStandard = normalizeAttemptAnswer(questionType, standardAnswer)
    const isCorrect = Boolean(normalizedStudent) && normalizedStudent === normalizedStandard

    return {
      isCorrect,
      score: isCorrect ? Number(payload.score || snapshot.score || 0) : 0,
      correctAnswer: standardAnswer || '请参考标准答案',
      analysisSummary: isCorrect
        ? '本题判断为正确，当前答案和参考答案一致。'
        : `当前答案与参考答案不一致，建议先回到题干，确认考查点，再核对选项或关键词。`,
      knowledgePoints,
      canAskAi: true,
      source: 'local',
    }
  }

  return {
    isCorrect: false,
    score: 0,
    correctAnswer: standardAnswer || '主观题标准答案待教师或模型进一步解析',
    analysisSummary: '主观题在本地演示模式下先提供思路型反馈，后续可接入大模型完成更细致的判定。',
    knowledgePoints,
    canAskAi: true,
    source: 'local',
  }
}

export function localQuestionTutor(payload = {}) {
  const snapshot = parseSnapshot(payload.questionSnapshot)
  const messages = Array.isArray(payload.messages) ? payload.messages : []
  const latestQuestion = String(messages[messages.length - 1]?.content || '').trim()
  const checkResult = payload.checkResult || {}
  const correctAnswer = checkResult.correctAnswer || snapshot.standardAnswer || '参考答案'
  const analysisSummary = checkResult.analysisSummary || '建议回到题干重新定位考查点。'
  const chapter = snapshot.chapter || '当前题目相关知识点'
  const studentAnswer = String(payload.studentAnswer || '').trim() || '未填写答案'

  let reply = `你这题当前的作答是“${studentAnswer}”。${analysisSummary}`
  if (/类似|同类|变式/.test(latestQuestion)) {
    reply = `这类题通常先判断题干在考什么，再排除干扰项，最后把你的答案和“${correctAnswer}”对应的依据做比对。你可以先说说你最先排除了哪个选项。`
  } else if (/思路|怎么做|步骤/.test(latestQuestion)) {
    reply = `建议按这条线走：先提取题干关键词，再定位 ${chapter} 的核心规则，最后用这个规则验证为什么参考答案是“${correctAnswer}”。`
  } else if (/为什么|错在哪|哪里错/.test(latestQuestion)) {
    reply = `你主要不是“不会做”，而是没有把判断依据完整落到答案上。参考答案是“${correctAnswer}”，而你当前答案缺少与题干条件逐项对应的验证。`
  }

  return {
    reply,
    hints: ['先说出题目考查点', '再解释你为什么选当前答案', '最后对照参考答案复盘差异'],
    sources: [chapter, ...(checkResult.knowledgePoints || [])].filter(Boolean).slice(0, 3),
    source: 'local',
  }
}
