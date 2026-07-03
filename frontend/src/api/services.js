import { request } from './http'

function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

function send(method, url, options = {}) {
  return request({
    url,
    method,
    ...options,
  })
}

function get(url, params, options = {}) {
  return send('get', url, {
    ...(params === undefined ? {} : { params }),
    ...options,
  })
}

function query(url, params, options = {}) {
  return get(url, clean(params), options)
}

function post(url, data, options = {}) {
  return send('post', url, {
    ...(data === undefined ? {} : { data }),
    ...options,
  })
}

function put(url, data, options = {}) {
  return send('put', url, {
    ...(data === undefined ? {} : { data }),
    ...options,
  })
}

function patch(url, data, options = {}) {
  return send('patch', url, {
    ...(data === undefined ? {} : { data }),
    ...options,
  })
}

function del(url, options = {}) {
  return send('delete', url, options)
}

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

function localCheckQuestion(payload = {}) {
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

function localQuestionTutor(payload = {}) {
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

export const authApi = {
  register(payload) {
    return post('/api/register', payload)
  },
  login(payload) {
    return post('/api/login', payload)
  },
  logout() {
    return post('/api/logout')
  },
  me() {
    return get('/api/auth/me')
  },
}

export const tagApi = {
  list(keyword) {
    return query('/api/tags', { keyword })
  },
  tree() {
    return get('/api/tags/tree')
  },
  create(payload) {
    return post('/api/tags', payload)
  },
  update(tagId, payload) {
    return put(`/api/tags/${tagId}`, payload)
  },
  remove(tagId) {
    return del(`/api/tags/${tagId}`)
  },
}

export const questionApi = {
  search(params) {
    return query('/api/questions', params)
  },
  detail(questionId) {
    return get(`/api/questions/${questionId}`)
  },
  create(payload) {
    return post('/api/questions', payload)
  },
  update(questionId, payload) {
    return put(`/api/questions/${questionId}`, payload)
  },
  remove(questionId) {
    return del(`/api/questions/${questionId}`)
  },
  publish(questionId) {
    return post(`/api/questions/${questionId}/publish`)
  },
  submitBankReview(questionId) {
    return post(`/api/questions/${questionId}/bank-review/submit`)
  },
  cancelBankReview(questionId) {
    return post(`/api/questions/${questionId}/bank-review/cancel`)
  },
  reviewBankQuestion(questionId, payload) {
    return post(`/api/questions/${questionId}/bank-review`, payload)
  },
  generateLlmAnalysis(questionId, payload = {}) {
    return post(`/api/questions/${questionId}/analysis/llm`, payload, { timeout: 8000 })
  },
}

export const paperApi = {
  page(page = 1, size = 20) {
    return get('/api/papers', { page, size })
  },
  detail(paperId) {
    return get(`/api/papers/${paperId}`)
  },
  create(payload) {
    return post('/api/papers', payload)
  },
  update(paperId, payload) {
    return put(`/api/papers/${paperId}`, payload)
  },
  remove(paperId) {
    return del(`/api/papers/${paperId}`)
  },
  addQuestion(paperId, payload) {
    return post(`/api/papers/${paperId}/questions`, payload)
  },
  batchUpdateQuestions(paperId, payload) {
    return put(`/api/papers/${paperId}/questions/batch`, payload)
  },
  updatePaperQuestion(paperQuestionId, payload) {
    return put(`/api/papers/questions/${paperQuestionId}`, payload)
  },
  removePaperQuestion(paperQuestionId) {
    return del(`/api/papers/questions/${paperQuestionId}`)
  },
}

export const assignmentApi = {
  page(page = 1, size = 20, keyword) {
    return query('/api/assignments', { page, size, keyword })
  },
  my(status, page = 1, size = 10) {
    return query('/api/assignments/my', { status, page, size })
  },
  detail(assignmentId) {
    return get(`/api/assignments/${assignmentId}`)
  },
  create(payload) {
    return post('/api/assignments', payload)
  },
  update(assignmentId, payload) {
    return put(`/api/assignments/${assignmentId}`, payload)
  },
  remove(assignmentId) {
    return del(`/api/assignments/${assignmentId}`)
  },
  publish(assignmentId) {
    return post(`/api/assignments/${assignmentId}/publish`)
  },
  close(assignmentId) {
    return post(`/api/assignments/${assignmentId}/close`)
  },
  setTargets(assignmentId, payload) {
    return put(`/api/assignments/${assignmentId}/targets`, payload)
  },
}

export const classApi = {
  create(payload) {
    return post('/api/classes', payload)
  },
  mine() {
    return get('/api/classes/mine')
  },
  update(classId, payload) {
    return put(`/api/classes/${classId}`, payload)
  },
  remove(classId) {
    return del(`/api/classes/${classId}`)
  },
  teacherOptions() {
    return get('/api/classes/teachers')
  },
  students(classId) {
    return get(`/api/classes/${classId}/students`)
  },
  kickStudent(classId, studentId) {
    return del(`/api/classes/${classId}/students/${studentId}`)
  },
  join(classCode) {
    return post('/api/classes/join', { classCode })
  },
  my() {
    return get('/api/classes/my')
  },
}

export const attemptApi = {
  startAssignment(assignmentId) {
    return post(`/api/attempts/assignment/${assignmentId}/start`)
  },
  startPractice(payload) {
    return post('/api/attempts/practice/start', payload)
  },
  questions(attemptId) {
    return get(`/api/attempts/${attemptId}/questions`)
  },
  hint(attemptId, attemptQuestionId, payload) {
    return post(`/api/attempts/${attemptId}/questions/${attemptQuestionId}/hint`, payload, { timeout: 120000 })
  },
  async checkQuestion(attemptId, attemptQuestionId, payload) {
    try {
      return await post(`/api/attempts/${attemptId}/questions/${attemptQuestionId}/check`, payload, { timeout: 120000 })
    } catch (error) {
      console.warn('attemptApi.checkQuestion fallback to local mock:', error)
      return localCheckQuestion(payload)
    }
  },
  async questionTutor(attemptId, attemptQuestionId, payload) {
    try {
      const messages = Array.isArray(payload?.messages) ? payload.messages : []
      const latestMessage = messages[messages.length - 1]?.content || ''
      const result = await post(
        `/api/attempts/${attemptId}/questions/${attemptQuestionId}/hint`,
        {
          question: latestMessage,
          currentAnswer: payload?.studentAnswer || '',
          providerKey: payload?.providerKey || '',
        },
        { timeout: 120000 },
      )
      return {
        reply: result?.hint || '暂时没有生成新的讲解。',
        hints: [],
        sources: Array.isArray(result?.contextSources) ? result.contextSources : [],
        llmCallId: result?.llmCallId,
        source: 'llm',
      }
    } catch (error) {
      console.warn('attemptApi.questionTutor fallback to local mock:', error)
      return localQuestionTutor(payload)
    }
  },
  submit(attemptId) {
    return post(`/api/attempts/${attemptId}/submit`, undefined, { timeout: 8000 })
  },
  result(attemptId) {
    return get(`/api/attempts/${attemptId}/result`)
  },
  my(attemptType, page = 1, size = 20) {
    return query('/api/attempts/my', { attemptType, page, size })
  },
}

export const answerApi = {
  saveDraft(answerId, answerContent) {
    return put(`/api/answers/${answerId}/draft`, { answerContent })
  },
  submit(answerId, answerContent) {
    return put(`/api/answers/${answerId}/submit`, { answerContent })
  },
}

export const statsApi = {
  wrongQuestions(params) {
    return query('/api/stats/wrong-questions', params)
  },
  resolveWrongQuestion(questionId) {
    return post(`/api/stats/wrong-questions/${questionId}/resolve`)
  },
  mastery(tagType = 1) {
    return get('/api/stats/mastery', { tagType })
  },
  ability() {
    return get('/api/stats/ability')
  },
  questionStats(params) {
    return query('/api/stats/question-stats', params)
  },
}

export const appealApi = {
  create(payload) {
    return post('/api/appeals', payload)
  },
  my(params) {
    return query('/api/appeals/my', params)
  },
}

export const teacherApi = {
  reviewAnswers(params) {
    return query('/api/teacher/review/answers', params)
  },
  answerEvidence(answerId) {
    return get(`/api/teacher/answers/${answerId}/evidence`)
  },
  manualGrade(answerId, payload) {
    return post(`/api/teacher/answers/${answerId}/grade`, payload)
  },
  llmRetry(answerId, payload) {
    return post(`/api/teacher/answers/${answerId}/llm-retry`, payload)
  },
  llmBatch(payload) {
    return post('/api/teacher/answers/llm-batch', payload, { timeout: 180000 })
  },
  teacherLlmProviders(params) {
    return query('/api/teacher/llm/providers', params)
  },
  generateAgentResources(payload) {
    return post('/api/teacher/agent-resources/generate', payload, { timeout: 180000 })
  },
  startGenerateAgentResourcesTask(payload) {
    return post('/api/teacher/agent-resources/generate-tasks', payload, { timeout: 30000 })
  },
  generateAgentResourcesTaskStatus(taskId) {
    return get(`/api/teacher/agent-resources/generate-tasks/${taskId}`)
  },
  cancelGenerateAgentResourcesTask(taskId) {
    return post(`/api/teacher/agent-resources/generate-tasks/${taskId}/cancel`)
  },
  videoRecommendations(params) {
    return query('/api/resource/video-recommendations', params)
  },
  assignmentScores(assignmentId, page = 1, size = 10) {
    return get(`/api/teacher/assignments/${assignmentId}/scores`, { page, size })
  },
  assignmentTargets(assignmentId, page = 1, size = 10) {
    return get(`/api/teacher/assignments/${assignmentId}/targets`, { page, size })
  },
  assignmentStudentDetail(assignmentId, studentId) {
    return get(`/api/teacher/assignments/${assignmentId}/targets/${studentId}`)
  },
  appeals(params) {
    return query('/api/teacher/appeals', params)
  },
  handleAppeal(appealId, payload) {
    return post(`/api/teacher/appeals/${appealId}/handle`, payload)
  },
}

export const llmApi = {
  studentAssistantChat(payload) {
    return post('/api/student/assistant/chat', payload, { timeout: 120000 })
  },
  modelCenterModels(params) {
    return query('/api/models', params)
  },
  modelCenterModelDetail(id) {
    return get(`/api/models/${id}`)
  },
  createModelCenterModel(payload) {
    return post('/api/models', payload)
  },
  updateModelCenterModel(id, payload) {
    return put(`/api/models/${id}`, payload)
  },
  deleteModelCenterModel(id) {
    return del(`/api/models/${id}`)
  },
  updateModelCenterApiKey(id, apiKey) {
    return put(`/api/models/${id}/api-key`, { apiKey })
  },
  testModelCenterModel(id, payload) {
    return post(`/api/models/${id}/test`, payload)
  },
  callModelCenterModel(id, payload) {
    return post(`/api/models/${id}/call`, payload, { timeout: 120000 })
  },
  modelCenterTemplates(params) {
    return query('/api/models/templates', params)
  },
  modelCenterTemplateDetail(id) {
    return get(`/api/models/templates/${id}`)
  },
  createModelCenterTemplate(payload) {
    return post('/api/models/templates', payload)
  },
  updateModelCenterTemplate(id, payload) {
    return put(`/api/models/templates/${id}`, payload)
  },
  deleteModelCenterTemplate(id) {
    return del(`/api/models/templates/${id}`)
  },
  page(params) {
    return query('/api/llm/calls', params)
  },
  detail(llmCallId) {
    return get(`/api/llm/calls/${llmCallId}`)
  },
  studentProviders(params) {
    return query('/api/student/llm/providers', params)
  },
  createStudentProvider(payload) {
    return post('/api/student/llm/providers', payload)
  },
  updateStudentProvider(id, payload) {
    return put(`/api/student/llm/providers/${id}`, payload)
  },
  setStudentProviderEnabled(id, enabled) {
    return patch(`/api/student/llm/providers/${id}/enabled`, { enabled })
  },
  setStudentProviderDefault(id) {
    return patch(`/api/student/llm/providers/${id}/default`)
  },
  deleteStudentProvider(id) {
    return del(`/api/student/llm/providers/${id}`)
  },
  studentTemplates(params) {
    return query('/api/student/llm/templates', params)
  },
  createStudentTemplate(payload) {
    return post('/api/student/llm/templates', payload)
  },
  updateStudentTemplate(id, payload) {
    return put(`/api/student/llm/templates/${id}`, payload)
  },
  deleteStudentTemplate(id) {
    return del(`/api/student/llm/templates/${id}`)
  },
  async adminProviders(params = {}) {
    const normalized = {
      keyword: params.keyword,
      enabled: params.enabled,
      ...(params.providerType === 'API' ? { category: 'api' } : {}),
    }
    const rows = await query('/api/models', normalized)
    const filtered = params.providerType === 'LOCAL'
      ? rows.filter((item) => item.modelCategory !== 'api')
      : rows
    return filtered.map((item) => ({
      id: item.id,
      providerKey: item.modelCode,
      label: item.modelName,
      providerType: item.modelCategory === 'api' ? 'API' : 'LOCAL',
      baseUrl: item.apiBaseUrl || item.ollamaBaseUrl || item.modelPath || item.modelFilePath || '',
      apiKey: '',
      model: item.apiBaseUrl ? item.modelCode : item.ollamaModelName || item.modelFilePath || item.modelPath || item.modelCode,
      temperature: item.temperature ?? 0.7,
      supportsTemperature: item.modelCategory !== 'detection',
      description: item.description || '',
      tags: Array.isArray(item.supportedDatasets) ? item.supportedDatasets : [],
      enabled: Boolean(item.isAvailable),
      isDefault: Boolean(item.isDefault),
      hasApiKey: Boolean(item.hasApiKey),
      apiKeyMask: item.apiKeyMask || '',
      source: item.source || 'system',
      editable: item.source === 'system',
      deletable: item.source === 'system' && !item.isBuiltin,
      modelCategory: item.modelCategory,
      modelType: item.modelType,
      detectionType: item.detectionType,
      configTemplate: item.configTemplate,
    }))
  },
  createAdminProvider(payload) {
    const providerType = payload.providerType === 'API' ? 'api' : 'local_llm'
    const modelType = providerType === 'api' ? 'api' : 'ollama'
    return post('/api/models', {
      createAsSystem: true,
      modelName: payload.label,
      modelCode: payload.providerKey,
      modelCategory: providerType,
      modelType,
      provider: providerType === 'api' ? inferProviderName(payload.baseUrl, payload.model || payload.providerKey) : 'ollama',
      apiBaseUrl: providerType === 'api' ? payload.baseUrl : '',
      configTemplate: providerType === 'api' ? inferProviderName(payload.baseUrl, payload.model || payload.providerKey) : '',
      apiKey: payload.apiKey || '',
      ollamaModelName: providerType === 'api' ? '' : payload.model,
      ollamaBaseUrl: providerType === 'api' ? '' : payload.baseUrl,
      description: payload.description || '',
      supportedDatasets: splitTags(payload.tags),
      isAvailable: payload.enabled ?? true,
      isDefault: false,
      temperature: payload.supportsTemperature === false ? 0 : payload.temperature ?? 0.7,
      status: payload.enabled === false ? 'inactive' : 'active',
    })
  },
  updateAdminProvider(id, payload) {
    const providerType = payload.providerType === 'API' ? 'api' : 'local_llm'
    const modelType = providerType === 'api' ? 'api' : 'ollama'
    return put(`/api/models/${id}`, {
      modelName: payload.label,
      modelCode: payload.providerKey,
      modelCategory: providerType,
      modelType,
      provider: providerType === 'api' ? inferProviderName(payload.baseUrl, payload.model || payload.providerKey) : 'ollama',
      apiBaseUrl: providerType === 'api' ? payload.baseUrl : '',
      configTemplate: providerType === 'api' ? inferProviderName(payload.baseUrl, payload.model || payload.providerKey) : '',
      apiKey: payload.apiKey || undefined,
      ollamaModelName: providerType === 'api' ? '' : payload.model,
      ollamaBaseUrl: providerType === 'api' ? '' : payload.baseUrl,
      description: payload.description || '',
      supportedDatasets: splitTags(payload.tags),
      temperature: payload.supportsTemperature === false ? 0 : payload.temperature ?? 0.7,
    })
  },
  setAdminProviderEnabled(id, enabled) {
    return put(`/api/models/${id}`, {
      isAvailable: enabled,
      status: enabled ? 'active' : 'inactive',
    })
  },
  setAdminProviderDefault(id) {
    return put(`/api/models/${id}`, { isDefault: true })
  },
  deleteAdminProvider(id) {
    return del(`/api/models/${id}`)
  },
  async adminTemplates(params = {}) {
    const rows = await query('/api/models/templates', {
      keyword: params.keyword,
      task_type: params.taskType,
    })
    return rows.map((item) => ({
      id: item.id,
      templateName: item.name,
      taskType: item.taskType,
      description: item.description || '',
      promptText: item.promptContent,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      editable: item.source === 'system' || item.source === 'personal',
      source: item.source,
    }))
  },
  createAdminTemplate(payload) {
    return post('/api/models/templates', {
      createAsSystem: true,
      name: payload.templateName,
      taskType: payload.taskType,
      description: payload.description || '',
      promptContent: payload.promptText,
    })
  },
  updateAdminTemplate(id, payload) {
    return put(`/api/models/templates/${id}`, {
      name: payload.templateName,
      taskType: payload.taskType,
      description: payload.description || '',
      promptContent: payload.promptText,
    })
  },
  deleteAdminTemplate(id) {
    return del(`/api/models/templates/${id}`)
  },
}

export const landingApi = {
  competencyLayer() {
    return get('/api/landing/competency-layer')
  },
  syncCompetencyJobs() {
    return post('/api/admin/landing/jobs/sync')
  },
  competencySyncRecords(params) {
    return query('/api/admin/landing/jobs/sync-records', params)
  },
}

function splitTags(tags) {
  if (Array.isArray(tags)) return tags.map((item) => String(item).trim()).filter(Boolean)
  return String(tags || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function inferProviderName(baseUrl, modelCode) {
  const text = `${baseUrl || ''} ${modelCode || ''}`.toLowerCase()
  if (text.includes('dashscope') || text.includes('qwen')) return 'dashscope'
  if (text.includes('deepseek')) return 'deepseek'
  if (text.includes('openai') || text.includes('gpt')) return 'openai'
  if (text.includes('zhipu') || text.includes('glm')) return 'zhipu'
  if (text.includes('moonshot') || text.includes('kimi')) return 'moonshot'
  if (text.includes('ollama')) return 'ollama'
  return 'custom'
}

export const learningApi = {
  knowledgePoints() {
    return get('/api/learning/knowledge-points')
  },
  createKnowledgePoint(payload) {
    return post('/api/learning/knowledge-points', payload)
  },
  updateKnowledgePoint(id, payload) {
    return put(`/api/learning/knowledge-points/${id}`, payload)
  },
  removeKnowledgePoint(id) {
    return del(`/api/learning/knowledge-points/${id}`)
  },
  resources(params) {
    return query('/api/learning/resources', params)
  },
  createResource(payload) {
    return post('/api/learning/resources', payload)
  },
  recommendResourceTargets(id, payload) {
    return post(`/api/learning/resources/${id}/recommend-targets`, payload)
  },
  updateResource(id, payload) {
    return put(`/api/learning/resources/${id}`, payload)
  },
  removeResource(id) {
    return del(`/api/learning/resources/${id}`)
  },
  recordBehavior(payload) {
    return post('/api/learning/behaviors', payload)
  },
  profile() {
    return get('/api/learning/profile')
  },
  profileReport() {
    return get('/api/learning/profile/report')
  },
  extractProfileFeatures(payload) {
    return post('/api/learning/profile/extract-features', payload, { timeout: 20000 })
  },
  recommendations() {
    return get('/api/learning/recommendations')
  },
  pathRecommendation(params) {
    return query('/api/learning/path-recommendation', params)
  },
  savePathRecommendationSnapshot(payload) {
    return post('/api/learning/path-recommendation/snapshots', payload)
  },
  pathRecommendationSnapshot(id) {
    return get(`/api/learning/path-recommendation/snapshots/${id}`)
  },
  pathRecommendationSnapshots(params) {
    return query('/api/learning/path-recommendation/snapshots', params)
  },
  knowledgeRelations() {
    return get('/api/learning/knowledge-relations')
  },
  createKnowledgeRelation(payload) {
    return post('/api/learning/knowledge-relations', payload)
  },
  updateKnowledgeRelation(id, payload) {
    return put(`/api/learning/knowledge-relations/${id}`, payload)
  },
  extractKnowledgeGraph(payload) {
    return post('/api/learning/knowledge-graph/extract', payload, { timeout: 120000 })
  },
  extractKnowledgeGraphFile(file, payload = {}) {
    const formData = new FormData()
    formData.append('file', file)
    Object.entries(clean(payload)).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return post('/api/learning/knowledge-graph/extract-file', formData, { timeout: 120000 })
  },
  removeKnowledgeRelation(id) {
    return del(`/api/learning/knowledge-relations/${id}`)
  },
  personalizedPracticePlan(params) {
    return query('/api/learning/personalized-practice/plan', params)
  },
  startPersonalizedPractice(payload) {
    return post('/api/learning/personalized-practice/start', payload)
  },
}

export const stageEvaluationApi = {
  my(params) {
    return query('/api/stage-evaluations/my', params)
  },
  teacherStudents(params) {
    return query('/api/stage-evaluations/teacher/students', params)
  },
}

export const adminApi = {
  pageUsers(page = 1, size = 20) {
    return get('/api/admin/users', { page, size })
  },
  createUser(payload) {
    return post('/api/admin/users', payload)
  },
  updateUser(userId, payload) {
    return put(`/api/admin/users/${userId}`, payload)
  },
  updateUserRole(userId, role) {
    return put(`/api/admin/users/${userId}/role`, { role })
  },
  loginLogs(params) {
    return query('/api/admin/login-logs', params)
  },
  auditLogs(params) {
    return query('/api/admin/audit-logs', params)
  },
}

