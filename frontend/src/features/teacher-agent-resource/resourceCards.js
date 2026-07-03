import {
  deprecatedResourceTypes,
  exerciseResourceTypes,
  multimodalResourceTypes,
  resourceTypeLabels,
  videoResourceTypes,
} from '@/data/teacherAgentResource'

export function buildVideoCover(title, platform, accent = '#2f9b7b') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#071f1a"/>
          <stop offset="0.55" stop-color="#12382f"/>
          <stop offset="1" stop-color="#06120f"/>
        </linearGradient>
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="640" height="360" rx="24" fill="url(#bg)"/>
      <rect width="640" height="360" fill="url(#grid)"/>
      <circle cx="510" cy="70" r="120" fill="${accent}" opacity=".18"/>
      <rect x="42" y="46" width="140" height="34" rx="17" fill="${accent}" opacity=".9"/>
      <text x="112" y="69" text-anchor="middle" fill="#ffffff" font-size="18" font-family="Arial, sans-serif" font-weight="700">${platform}</text>
      <text x="48" y="172" fill="#ffffff" font-size="32" font-family="Arial, sans-serif" font-weight="800">${String(title || '').slice(0, 18)}</text>
      <text x="48" y="218" fill="#b8f3df" font-size="22" font-family="Arial, sans-serif">C 语言知识讲解</text>
      <polygon points="292,252 292,306 344,279" fill="#ffffff" opacity=".9"/>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function buildMockVideoRecommendations(focus = '数组与字符串') {
  return [
    {
      title: 'C语言数组与字符串基础讲解',
      platform: 'Bilibili',
      url: 'https://www.bilibili.com/video/BV1m8411m79X/',
      cover: buildVideoCover('数组与字符串', 'Bilibili', '#2f9b7b'),
      duration: '16:31',
      viewCount: '22万',
      reason: `该视频围绕字符数组、字符串初始化和常见用法展开，适合当前“${focus}”薄弱点的概念补强。`,
      matchedKnowledgePoints: ['数组', '字符串'],
    },
    {
      title: 'C语言 char 数组与字符串入门',
      platform: 'Bilibili',
      url: 'https://www.bilibili.com/video/BV1Bh4y1q7Nt/',
      cover: buildVideoCover('char 数组与字符串', 'Bilibili', '#3b82f6'),
      duration: '14:24',
      viewCount: '课程合集',
      reason: `课程分集包含 char 数组、字符串表示方式和指针相关内容，适合学生按知识链路复习“${focus}”。`,
      matchedKnowledgePoints: ['char数组', '字符串表示', '指针'],
    },
    {
      title: 'Arrays of strings in C explained!',
      platform: 'YouTube',
      url: 'https://www.youtube.com/watch?v=e7SACGE9hKw',
      cover: 'https://i.ytimg.com/vi/e7SACGE9hKw/hqdefault.jpg',
      duration: '11:20',
      viewCount: '教学视频',
      reason: '该视频用二维字符数组解释字符串数组，适合补齐数组和字符串组合使用时的理解断点。',
      matchedKnowledgePoints: ['字符串数组', '二维数组'],
    },
    {
      title: 'String Basics | C Programming Tutorial',
      platform: 'YouTube',
      url: 'https://www.youtube.com/watch?v=60OI5tzmkCw',
      cover: 'https://i.ytimg.com/vi/60OI5tzmkCw/hqdefault.jpg',
      duration: '13:04',
      viewCount: '入门讲解',
      reason: '该视频覆盖 C 字符串基础、初始化和访问方式，可用于学生在字符串基础题上的针对性复习。',
      matchedKnowledgePoints: ['字符串', '字符数组'],
    },
  ]
}

export function isVideoSearchUrl(url = '') {
  const value = String(url || '').trim().toLowerCase()
  return value.includes('search.bilibili.com') || value.includes('youtube.com/results')
}

export function isConcreteVideoUrl(url = '') {
  const value = String(url || '').trim()
  if (!value || isVideoSearchUrl(value)) return false
  return /^https?:\/\/(www\.)?bilibili\.com\/video\/(BV|av)[A-Za-z0-9]+/i.test(value)
    || /^https?:\/\/(www\.)?youtube\.com\/watch\?.*v=[A-Za-z0-9_-]+/i.test(value)
    || /^https?:\/\/youtu\.be\/[A-Za-z0-9_-]+/i.test(value)
}

export function normalizeVideoRecommendations(card = {}) {
  const rows = card.videoAsset?.url
    ? [card.videoAsset, ...(Array.isArray(card.videoRecommendations) ? card.videoRecommendations : [])]
    : Array.isArray(card.videoRecommendations)
    ? card.videoRecommendations
    : Array.isArray(card.videoConfig?.videoRecommendations)
      ? card.videoConfig.videoRecommendations
      : []

  return rows
    .filter((item) => item?.url && item?.title && isConcreteVideoUrl(item.url))
    .slice(0, 6)
    .map((item, index) => ({
      id: item.id || `${card.draftId || card.id || 'video'}-${index}`,
      title: item.title,
      platform: item.platform || 'Bilibili',
      url: item.url,
      cover: item.cover || item.coverUrl || buildVideoCover(item.title, item.platform || 'Video'),
      duration: item.duration || '待确认',
      viewCount: item.viewCount || item.hotScore || '推荐',
      reason: item.reason || '该视频与当前薄弱知识点匹配，建议教师确认后推荐给学生。',
      matchedKnowledgePoints: Array.isArray(item.matchedKnowledgePoints) ? item.matchedKnowledgePoints : [],
    }))
}

export function normalizeGeneratedCard(card = {}) {
  const scenes = Array.isArray(card.videoScenes) ? card.videoScenes : []
  const quizQuestions = Array.isArray(card.quizQuestions) ? card.quizQuestions : []
  const exerciseQuestions = Array.isArray(card.exerciseQuestions) ? card.exerciseQuestions : []
  const videoRecommendations = normalizeVideoRecommendations(card)
  return {
    ...card,
    id: card.draftId || `${card.resourceType || 'resource'}-${Date.now()}`,
    sourceAgent: '资源生成智能体',
    resourceTypeLabel: resourceTypeLabels[card.resourceType] || card.resourceType || '个性化资源',
    isMultimodal: multimodalResourceTypes.has(card.resourceType),
    isQuiz: card.resourceType === 'interactive_quiz' || exerciseResourceTypes.has(card.resourceType),
    isVideo: card.mediaType === 'video' || videoResourceTypes.has(card.resourceType) || scenes.length > 0,
    videoAsset: card.videoAsset || null,
    videoScenes: scenes,
    videoRecommendations,
    quizQuestions,
    exerciseQuestions,
    videoConfig: card.videoConfig || {},
    sourceStatus: card.sourceStatus || card.videoAsset?.sourceStatus || card.videoConfig?.sourceStatus || 'draft',
    publishTarget: card.publishTarget || (exerciseResourceTypes.has(card.resourceType) ? 'student_draft_questions' : 'student_recommended_resource'),
    agentOutputs: card.agentOutputs || {},
    reviewState: card.reviewState || {
      suitabilityApproved: false,
      usabilityApproved: false,
      teacherComment: '',
    },
    saved: Boolean(card.saved),
    sent: Boolean(card.sent),
    resourceId: card.resourceId || null,
    personalizationBasis: card.personalizationBasis || {},
    reviewReport: card.reviewReport || {},
    modelSource: card.modelSource || {},
    content: card.content || card.summary || '',
    status: card.status || 'pending_review',
  }
}

export function formatWeakPointNames(weakPoints = [], limit = 3) {
  const names = weakPoints.map((item) => item.tagName).filter(Boolean).slice(0, limit)
  return names.length ? names.join('、') : '暂无明显薄弱知识点'
}

export function formatDimensionNames(dimensions = [], limit = 3) {
  const names = dimensions.map((item) => `${item.name}(${item.score ?? 0})`).slice(0, limit)
  return names.length ? names.join('、') : '暂无维度数据'
}

export function buildFallbackGeneratedResources({ student = {}, weak = {}, dimension = {} } = {}) {
  const weakName = weak.tagName || 'C 语言核心知识'
  const dimName = dimension.name || '综合编程能力'
  const suggestions = (student.suggestions || []).slice(0, 2).join('；') || '建议按知识补强、例题讲解、变式训练的节奏推进。'

  return [
    {
      id: 'knowledge',
      title: `${student.studentName || '学生'} - ${weakName} 知识补强包`,
      resourceType: 'article',
      summary: `围绕 ${weakName} 汇总概念解释、典型误区和 3 组递进例题，优先解决当前掌握度较低的问题。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '知识诊断智能体',
      saved: false,
    },
    {
      id: 'review',
      title: `${student.studentName || '学生'} 错因复盘清单`,
      resourceType: 'agent_plan',
      summary: `基于阶段画像生成错因复盘问题：先回看 ${weakName} 的错题，再记录错误原因、修正代码和同类题迁移结论。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '错因/行为分析智能体',
      saved: false,
    },
    {
      id: 'ability',
      title: `${student.studentName || '学生'} ${dimName} 能力提升任务`,
      resourceType: 'practice_plan',
      summary: `针对 ${dimName} 设计一个小型 C 语言任务，包含需求拆解、边界条件、调试记录和代码复盘要求。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '练习设计智能体',
      saved: false,
    },
    {
      id: 'path',
      title: `${student.studentName || '学生'} 个性化练习路径`,
      resourceType: 'practice_plan',
      summary: `${suggestions} 路径安排为：知识回顾 1 次、基础题 5 题、综合题 2 题、复盘总结 1 份。`,
      knowledgePointId: weak.knowledgePointId,
      tagId: weak.tagId,
      sourceAgent: '资源生成智能体',
      saved: false,
    },
  ]
}

export function buildExternalVideoCard({ student = {}, weakPoints = [], selectedStudentId = '' } = {}) {
  const focus = weakPoints.map((item) => item.tagName).filter(Boolean)[0] || 'C语言薄弱知识点'
  const query = `C语言 ${focus} 讲解 例题`
  const encodedQuery = encodeURIComponent(query)
  const bilibiliUrl = `https://search.bilibili.com/all?keyword=${encodedQuery}`
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodedQuery}`
  const draftId = `knowledge_video-frontend-video-${selectedStudentId || 'current'}-${encodedQuery}`
  const videoRecommendations = buildMockVideoRecommendations(focus)
  const recommendedVideo = videoRecommendations[0]
  return normalizeGeneratedCard({
    draftId,
    title: `${focus} 知识讲解视频推荐`,
    resourceType: 'knowledge_video',
    summary: '系统已根据学生薄弱点匹配具体知识讲解视频，教师可预览、替换或补充视频链接后保存为推荐资源。',
    content: [
      `学生：${student.studentName || '当前学生'}`,
      `薄弱知识点：${focus}`,
      `检索关键词：${query}`,
      '推荐平台：Bilibili / YouTube',
      '使用建议：优先选择包含概念讲解、例题代码和易错点分析的视频片段。',
    ].join('\n'),
    sourceUrl: recommendedVideo?.url || '',
    mediaType: 'video',
    videoRecommendations,
    videoConfig: {
      renderMode: 'concrete_video_recommendation',
      platform: recommendedVideo?.platform || 'Bilibili',
      query,
      bilibiliUrl,
      youtubeUrl,
      sourceStatus: recommendedVideo?.url ? 'matched_sample' : 'fallback',
      videoRecommendations,
      style: '外部知识讲解视频',
      aspectRatio: '16:9',
    },
    videoScenes: [],
    personalizationBasis: {
      studentName: student.studentName || '当前学生',
      weakPoints: [focus],
      reason: '根据学生薄弱知识点匹配具体知识讲解视频。',
    },
    reviewReport: {
      qualityScore: 82,
      relevanceScore: 88,
      consistencyScore: 84,
      passed: true,
      comments: '已根据学生薄弱点匹配具体知识讲解视频，建议教师确认内容后推荐给学生。',
      revisionSuggestions: [`确认视频内容覆盖薄弱知识点：${focus}`],
    },
    modelSource: {
      generatorModel: '本地视频资源匹配',
      llmCallIds: [],
    },
    status: 'approved',
  })
}

export function hasExternalVideoResource(cards = []) {
  return cards.some((card) => videoResourceTypes.has(card?.resourceType))
}

export function ensureVideoResource(cards = [], context = {}) {
  if (!cards.length) return cards
  return hasExternalVideoResource(cards) ? cards : [...cards, buildExternalVideoCard(context)]
}

export function normalizeGeneratedCards(cards = [], context = {}) {
  const normalized = (Array.isArray(cards) ? cards : [])
    .filter((card) => !deprecatedResourceTypes.has(card?.resourceType))
    .filter((card) => {
      const hasRecommendations = Array.isArray(card?.videoRecommendations) && card.videoRecommendations.length > 0
      return !(videoResourceTypes.has(card?.resourceType) && !card?.sourceUrl && !hasRecommendations && Array.isArray(card?.videoScenes) && card.videoScenes.length > 0)
    })
    .map(normalizeGeneratedCard)
  return ensureVideoResource(normalized, context)
}

export function externalVideoLinks(card) {
  const config = card?.videoConfig || {}
  return [
    { label: '打开 Bilibili 搜索', url: config.bilibiliUrl },
    { label: '打开 YouTube 搜索', url: config.youtubeUrl },
  ].filter((item) => item.url)
}

export function primaryVideo(card) {
  const candidate = Array.isArray(card?.videoRecommendations) ? card.videoRecommendations.find((item) => isConcreteVideoUrl(item.url)) : null
  if (candidate) return candidate
  if (isConcreteVideoUrl(card?.sourceUrl)) {
    return {
      title: card.title,
      platform: card.videoConfig?.platform || 'Video',
      url: card.sourceUrl,
      reason: card.summary,
      matchedKnowledgePoints: card.personalizationBasis?.weakPoints || [],
    }
  }
  return null
}

export function hasConcreteVideo(card) {
  return Boolean(primaryVideo(card))
}

export function videoSourceStatus(card) {
  if (hasConcreteVideo(card)) return 'matched'
  return card?.videoConfig?.sourceStatus || 'fallback'
}

export function resourceContentForSave(card) {
  if (card?.isQuiz) {
    return JSON.stringify({
      content: card.content || '',
      quizQuestions: card.quizQuestions || [],
      exerciseQuestions: card.exerciseQuestions || [],
      publishTarget: card.publishTarget || '',
      agentOutputs: card.agentOutputs || {},
      reviewState: card.reviewState || {},
    })
  }
  if (!card?.isVideo) return card?.content || ''
  const video = primaryVideo(card)
  return JSON.stringify({
    content: card.content || '',
    mediaType: 'video',
    platform: video?.platform || card.videoConfig?.platform || '',
    url: video?.url || card.sourceUrl || '',
    knowledgePoint: video?.matchedKnowledgePoints?.[0] || card.videoConfig?.query || '',
    weaknessTag: video?.matchedKnowledgePoints?.[0] || '',
    reason: video?.reason || card.summary || '',
    sourceStatus: video?.sourceStatus || card.videoConfig?.sourceStatus || 'matched',
    videoAsset: card.videoAsset || null,
    videoConfig: card.videoConfig || {},
    videoScenes: card.videoScenes || [],
    videoRecommendations: card.videoRecommendations || [],
    reviewState: card.reviewState || {},
  })
}

export function quizDisplayQuestions(card) {
  if (Array.isArray(card?.exerciseQuestions) && card.exerciseQuestions.length > 0) {
    return card.exerciseQuestions
  }
  return Array.isArray(card?.quizQuestions) ? card.quizQuestions : []
}

export function hasUsableExercise(card) {
  if (!exerciseResourceTypes.has(card?.resourceType)) return true
  const questions = quizDisplayQuestions(card)
  return questions.length > 0 && questions.every((item) => item?.stem && item?.answer && item?.explanation)
}

export function hasTeacherApproval(card) {
  return Boolean(card?.reviewState?.suitabilityApproved && card?.reviewState?.usabilityApproved)
}

export function canSaveGeneratedResource(card) {
  if (!hasTeacherApproval(card)) return false
  if (card?.isVideo && !hasConcreteVideo(card)) return false
  if (!hasUsableExercise(card)) return false
  return true
}

export function validateResourceBeforeSave(card, { videoSearchUrlMessage = '当前链接是搜索结果页，不是具体视频。' } = {}) {
  if (!hasTeacherApproval(card)) {
    return { valid: false, message: '请先完成适用性和可用性审核' }
  }
  if (!hasUsableExercise(card)) {
    return { valid: false, message: '补救练习必须包含题目、答案和解析后才能保存' }
  }
  const video = card?.isVideo ? primaryVideo(card) : null
  if (card?.isVideo && !video) {
    return { valid: false, message: '请先补充具体视频播放页链接后再保存' }
  }
  if (card?.isVideo && !isConcreteVideoUrl(video.url)) {
    return {
      valid: false,
      message: isVideoSearchUrl(video.url) ? videoSearchUrlMessage : '请填写具体视频播放页链接',
    }
  }
  return { valid: true, video }
}

export function buildResourceSavePayload(card, video = null) {
  return {
    title: card.isVideo ? video.title : card.title,
    resourceType: card.isVideo ? 'video' : card.resourceType,
    url: card.isVideo ? video.url : '',
    summary: card.isVideo ? video.reason : card.summary,
    content: resourceContentForSave(card),
    personalizationBasis: JSON.stringify(card.personalizationBasis || {}),
    reviewReportJson: JSON.stringify(card.reviewReport || {}),
    modelSourceJson: JSON.stringify(card.modelSource || {}),
    auditStatus: card.status || (card.reviewReport?.passed ? 'approved' : 'needs_revision'),
    knowledgePointId: card.knowledgePointId,
    tagId: card.tagId,
  }
}

export function buildResourceSaveConfirm(card, { send = false } = {}) {
  return {
    title: send ? '保存并发送资源' : '保存资源',
    message: send
      ? `确认将“${card.title}”保存到资源库并发送到学生端？`
      : `确认将“${card.title}”保存到学习资源库？`,
    confirmButtonText: send ? '保存并发送' : '保存',
  }
}

export function buildRecommendTargetPayload({ generationScope = 'student', classId, studentId } = {}) {
  const isClassScope = generationScope === 'class'
  return {
    valid: isClassScope ? Boolean(classId) : Boolean(studentId),
    warning: isClassScope ? '请先选择要发送的班级' : '请先选择真实学生后再发送',
    targetType: isClassScope ? 'class' : 'student',
    payload: {
      targetType: isClassScope ? 'class' : 'student',
      classId: isClassScope ? classId : undefined,
      studentIds: isClassScope ? [] : [Number(studentId)],
    },
  }
}

export function buildRevisionFeedback(card, revisionFeedback = '') {
  return [
    `教师退回资源：${card.title}`,
    `当前资源类型：${card.resourceTypeLabel || card.resourceType}`,
    `当前摘要：${card.summary || ''}`,
    `当前正文：${card.content || ''}`,
    `修改意见：${revisionFeedback}`,
  ].join('\n')
}

export function normalizeAnswer(value) {
  return String(value || '').trim().replace(/^([A-D])[\s.、，:：]*/i, '$1').toUpperCase()
}

export function isQuizAnswerCorrect(userAnswer, question) {
  const normalizedUserAnswer = normalizeAnswer(userAnswer)
  const answer = normalizeAnswer(question?.answer)
  return Boolean(normalizedUserAnswer && answer && normalizedUserAnswer === answer)
}

export function quizFeedbackText(userAnswer, question) {
  if (!userAnswer) return ''
  return isQuizAnswerCorrect(userAnswer, question)
    ? question?.explanation || '回答正确。'
    : question?.wrongFeedback || question?.explanation || '回答不正确，请回到相关知识点重新判断。'
}

export function safeFileName(text) {
  return String(text || 'personalized-learning-video')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'personalized-learning-video'
}

export function buildRemotionProps(card, { student = {}, weakPoints = [], abilityGaps = [] } = {}) {
  const weakPointNames = weakPoints.map((item) => item.tagName).filter(Boolean)
  const dimensionNames = abilityGaps.map((item) => item.name).filter(Boolean)
  const scenes = (card.videoScenes || []).map((scene) => ({
    title: scene.title || '学习场景',
    narration: scene.narration || '',
    visualPrompt: scene.visualPrompt || '',
    boardText: scene.boardText || scene.title || '',
    durationSeconds: Math.max(6, Number(scene.durationSeconds || 10)),
  }))

  return {
    title: card.title || '知识点讲解视频',
    studentName: student.studentName || '学生',
    focus: weakPointNames[0] || card.title || '薄弱知识点',
    weakPoints: weakPointNames,
    abilityGaps: dimensionNames,
    scenes,
  }
}

export function remotionPropsFilename(card) {
  return `${safeFileName(card.title || card.id)}-remotion-props.json`
}
