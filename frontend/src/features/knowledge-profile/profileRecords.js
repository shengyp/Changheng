export function formatStudentRecordForDisplay(record = {}, options = {}) {
  const type = record.type || 'record'
  const scoreText = record.score !== null && record.score !== undefined ? `本次得分 ${record.score} 分，已纳入知识画像分析。` : ''
  const base = {
    originalKey: options.recordKey ? options.recordKey(record) : defaultRecordKey(record),
    profileStatus: '已纳入画像',
    impactDimensions: buildRecordImpactDimensions(record),
    impactChanges: buildRecordImpactChanges(record),
    relatedKnowledge: inferRelatedKnowledge(record, options.fallbackKnowledge),
  }
  if (type === 'assistant') {
    const title = friendlyAssistantTitle(record)
    const summary = friendlyAssistantSummary(record)
    const qa = buildAssistantDisplayDetail(record, title, summary, options.fallbackKnowledge)
    return {
      ...record,
      ...base,
      title,
      summary,
      detail: qa.answer,
      question: qa.question,
      answerSummary: qa.answer,
      advice: qa.advice,
      primaryAction: '查看对话',
      secondaryAction: '查看建议',
    }
  }
  if (type === 'exam') {
    return {
      ...record,
      ...base,
      title: sanitizeStudentText(record.title) || '试卷记录',
      summary: scoreText || sanitizeStudentText(record.summary) || '你完成了一次阶段测评，系统已将结果纳入学习画像。',
      detail: sanitizeStudentText(record.detail || record.summary) || scoreText,
      primaryAction: '查看详情',
      secondaryAction: '查看画像影响',
    }
  }
  if (type === 'practice') {
    return {
      ...record,
      ...base,
      title: sanitizeStudentText(record.title) || '练习题记录',
      summary: scoreText || sanitizeStudentText(record.summary) || '你完成了一次专项练习，系统根据结果更新了知识点掌握情况。',
      detail: sanitizeStudentText(record.detail || record.summary) || scoreText,
      primaryAction: '查看详情',
      secondaryAction: '查看相关知识点',
    }
  }
  return {
    ...record,
    ...base,
    title: sanitizeStudentText(record.title) || '学习记录',
    summary: sanitizeStudentText(record.summary) || '该学习记录已纳入画像分析。',
    detail: sanitizeStudentText(record.detail || record.summary),
    primaryAction: '查看详情',
    secondaryAction: '查看画像影响',
  }
}

export function buildRecordImpactDimensions(record = {}) {
  if (record.type === 'assistant') return ['学习自律', '理解迁移', '资源筛选']
  if (record.type === 'exam') return ['知识基础', '理解迁移', '实践能力']
  if (record.type === 'practice') return ['知识基础', '实践能力']
  return ['知识基础']
}

export function buildRecordImpactChanges(record = {}) {
  const dimensions = buildRecordImpactDimensions(record)
  const score = Number(record.score)
  return dimensions.map((name, index) => {
    let delta = index === 0 ? 1 : 0
    if (Number.isFinite(score)) {
      delta = score >= 80 ? 2 - Math.min(index, 1) : score >= 60 ? 1 : index === 0 ? -1 : 0
    } else if (record.type === 'assistant') {
      delta = index < 2 ? 1 : 0
    }
    return { name, delta }
  })
}

export function inferRelatedKnowledge(record = {}, fallbackKnowledge = []) {
  const text = `${record.title || ''} ${record.summary || ''} ${record.detail || ''}`
  const points = []
  if (/变量|数据类型/.test(text)) points.push('变量与数据类型')
  if (/分支|循环|if|for|while/i.test(text)) points.push('分支循环')
  if (/数组|字符串|字符/.test(text)) points.push('数组与字符串')
  if (/指针/.test(text)) points.push('指针基础')
  if (/函数/.test(text)) points.push('函数设计')
  return points.length ? points.slice(0, 4) : fallbackKnowledge.slice(0, 3)
}

export function buildAssistantDisplayDetail(record = {}, title = '', summary = '', fallbackKnowledge = []) {
  const raw = normalizeRecordText(record.detail || record.summary || '')
  const question = sanitizeStudentText(
    extractStudentQuestion(raw)
    || record.question
    || (isInternalPromptText(raw) ? '帮我规划一个 C 语言学习计划。' : record.title)
    || title,
  )
  const answer = summary || '小C根据你的学习记录生成了学习路径建议。'
  const knowledge = inferRelatedKnowledge(record, fallbackKnowledge)
  return {
    question: question || '学习路径咨询',
    answer,
    advice: knowledge.length
      ? `建议先复习 ${knowledge.join('、')}，再进行综合练习。`
      : '建议先复盘近期作答，再完成对应专项练习。',
  }
}

export function friendlyAssistantTitle(record = {}) {
  const text = `${record.title || ''} ${record.summary || ''} ${record.detail || ''}`
  if (/路径|path|推荐|recommend/i.test(text)) return '小C学习路径对话'
  if (/错题|复盘|订正|错误/.test(text)) return '小C错题复盘建议'
  if (/数组|字符串|字符/.test(text)) return '数组与字符串复盘建议'
  if (/循环|分支|变量|数据类型/.test(text)) return '基础语法补强建议'
  return sanitizeStudentText(record.title) || '小C学习对话'
}

export function friendlyAssistantSummary(record = {}) {
  const cleaned = sanitizeStudentText(record.summary || record.detail || record.title)
  const text = `${record.title || ''} ${record.summary || ''} ${record.detail || ''}`
  if (/路径|path|推荐|recommend/i.test(text)) {
    return '系统根据你的作答记录生成了下一步学习路径建议。'
  }
  if (/数组|字符串|字符/.test(text)) {
    return '围绕数组下标、字符串结束符和字符数组输入输出进行针对性复习。'
  }
  if (/错题|复盘|订正|错误/.test(text)) {
    return '小C根据近期错题整理了复盘重点，帮助你定位薄弱知识点。'
  }
  if (/循环|分支|变量|数据类型/.test(text)) {
    return '建议先补强变量、分支循环等基础语法，再进入综合练习。'
  }
  return cleaned || '小C对话已纳入画像，用于更新学习路径和复盘建议。'
}

export function sanitizeStudentText(text) {
  const normalized = normalizeRecordText(text)
  if (!normalized) return ''
  if (isInternalPromptText(normalized)) {
    return '系统已根据你的学习证据生成画像建议，重点用于学习路径、错题复盘和知识点补强。'
  }
  return normalized
    .replace(/```json[\s\S]*?```/gi, '系统已整理结构化建议。')
    .replace(/```[\s\S]*?```/g, '系统已整理学习建议。')
    .replace(/\{[\s\S]{80,}\}/g, '系统已整理学习建议。')
    .replace(/请基于[\s\S]*?(输出|生成)/g, '系统根据你的学习证据')
    .replace(/字段必须包含[\s\S]*$/g, '')
    .replace(/不要输出\s*markdown/gi, '')
    .replace(/严格\s*JSON/gi, '学习建议')
    .replace(/system prompt|assistant prompt|prompt/gi, '学习建议')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function isInternalPromptText(text) {
  return /严格\s*JSON|不要输出\s*markdown|字段必须包含|system prompt|developer prompt|assistant prompt|你是学习路径分析助手|请基于以下|输出\s*JSON|JSON\s*字段|模型调用参数|数据库字段|内部调试|异常信息/i.test(text)
}

export function parseAssistantDetail(record) {
  if (!record || record.type !== 'assistant') {
    return { question: '', answer: '' }
  }
  if (record.summary && !isInternalPromptText(record.summary)) {
    return {
      question: record.title || '小C学习对话',
      answer: sanitizeStudentText(record.summary),
    }
  }
  const detail = normalizeRecordText(record.detail || '')
  const summary = normalizeRecordText(record.summary || '')
  let question = extractDetailSection(detail, '问题', '回答')
  let answer = extractDetailSection(detail, '回答')

  question = cleanAssistantText(question || extractStudentQuestion(summary) || summary || '暂无问题详情')
  answer = cleanAssistantText(answer || '暂无回答详情')

  return {
    question,
    answer,
  }
}

export function normalizeRecordText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim()
}

function extractDetailSection(text, startLabel, endLabel = '') {
  if (!text) return ''
  const startPatterns = [`${startLabel}：`, `${startLabel}:`]
  let start = -1
  let labelLength = 0
  for (const pattern of startPatterns) {
    const index = text.indexOf(pattern)
    if (index >= 0 && (start === -1 || index < start)) {
      start = index
      labelLength = pattern.length
    }
  }
  if (start < 0) return ''
  const contentStart = start + labelLength
  if (!endLabel) return text.slice(contentStart).trim()
  const endCandidates = [`\n${endLabel}：`, `\n${endLabel}:`, `${endLabel}：`, `${endLabel}:`]
  let end = text.length
  for (const pattern of endCandidates) {
    const index = text.indexOf(pattern, contentStart)
    if (index >= 0) end = Math.min(end, index)
  }
  return text.slice(contentStart, end).trim()
}

function extractStudentQuestion(text) {
  const markers = ['学生本次提问：', '学生本次提问:', '对话： 学生：', '对话: 学生:', '学生：', '学生:', '用户：', '用户:']
  for (const marker of markers) {
    const index = text.lastIndexOf(marker)
    if (index >= 0) {
      return text.slice(index + marker.length)
    }
  }
  return text
}

function cleanAssistantText(text) {
  let content = normalizeRecordText(text)
  content = content
    .replace(/^对话编号[:：].*$/gmi, '')
    .replace(/^提问摘要[:：]/gmi, '')
    .replace(/^回复摘要[:：]/gmi, '')
    .replace(/^发生时间[:：].*$/gmi, '')
    .replace(/页面上下文[:：][\s\S]*$/g, '')
    .replace(/字段必须包含[:：][\s\S]*$/g, '')
    .replace(/输出严格\s*JSON[\s\S]*$/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return content || '暂无详情'
}

function defaultRecordKey(record) {
  return `${record?.type || 'record'}-${record?.refId || record?.title || 'item'}-${record?.time || ''}`
}
