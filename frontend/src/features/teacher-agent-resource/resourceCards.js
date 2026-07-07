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

function readableList(rows = [], fallback = '当前薄弱知识点') {
  const names = rows
    .map((item) => item?.tagName || item?.name || item)
    .filter(Boolean)
    .slice(0, 6)
  return names.length ? names.join('、') : fallback
}

function contentLooksEmpty(text = '') {
  const value = String(text || '').trim()
  if (!value) return true
  if (value.length < 80) return true
  if (/[�]|[鏅璧鐭鑳绋绾炲€€俓]/.test(value)) return true
  return /根据学生画像、薄弱知识点和教师要求自动生成的个性化资源草案|建议教师复核后使用|自动生成的个性化资源草案/.test(value)
}

function buildStructuredResourceContent(card = {}, context = {}) {
  const student = context.student || {}
  const weakText = readableList(context.weakPoints, 'C 语言基础、数组与字符串、指针与函数')
  const gapText = readableList(context.abilityGaps, '理解迁移、实践能力、错题反思')
  const studentName = student.studentName || '当前学生'
  const scope = context.generationScope === 'class' ? 'class' : 'student'
  const count = Number(context.exerciseCount || 5)
  const requirement = context.teacherRequirement || '先补基础概念，再做变式练习，最后完成错因复盘。'
  const baseEvidence = [
    `对象：${scope === 'class' ? '当前班级' : studentName}`,
    `薄弱知识点：${weakText}`,
    `能力短板：${gapText}`,
    `作答概况：累计作答 ${student.completedAttemptCount ?? student.attemptCount ?? 0} 次，平均分 ${student.averageScore ?? '暂无'}。`,
    `教师补充要求：${requirement}`,
  ]

  if (card.resourceType === 'knowledge_video') {
    return {
      sections: [
        {
          title: '视频资源',
          items: [
            `讲解主题：${weakText}`,
            '资源形式：优先匹配可播放的 Bilibili / YouTube 知识讲解视频；如果没有可播放链接，教师可补充视频链接后保存。',
            '观看目标：学生看完后能说清核心概念、关键代码执行过程和常见错误触发条件。',
          ],
        },
        {
          title: '建议视频结构',
          items: [
            '0-3 分钟：用一道典型错题引出本节知识点。',
            '3-8 分钟：讲清概念、语法规则和变量/内存变化过程。',
            '8-12 分钟：演示一段可运行代码，并标注容易写错的位置。',
            '12-15 分钟：给出 2 道随堂检测题，要求学生写出判断依据。',
          ],
        },
        { title: '个性化依据', items: baseEvidence },
      ],
    }
  }

  if (card.resourceType === 'knowledge_handout') {
    return {
      sections: [
        {
          title: '一、讲义目标',
          items: [
            `围绕 ${weakText} 建立可复习的知识框架。`,
            `重点解决 ${gapText} 相关的理解断点。`,
            '讲义要求能直接给学生阅读，不能只有目录或标题。',
          ],
        },
        {
          title: '二、核心概念讲解',
          items: [
            '先用一句话定义知识点，再说明它解决什么问题。',
            '给出 C 语言语法模板，标注变量名、边界条件、输入输出要求。',
            '用一段短代码展示正确写法，并说明每一行的作用。',
          ],
        },
        {
          title: '三、典型例题',
          items: [
            `例题 1：围绕 ${weakText.split('、')[0] || '薄弱点'} 设计基础识别题，要求学生说出关键语句含义。`,
            '例题 2：给出一段含边界条件的代码，要求学生预测输出并解释原因。',
            '例题 3：给出错误代码，让学生定位错误、说明原因并写出修正版本。',
          ],
        },
        {
          title: '四、易错点提示',
          items: [
            '只记语法不理解执行过程，容易在变量更新、下标边界和输入输出上出错。',
            '遇到字符串、数组或指针题时，要先画出数据结构和访问范围。',
            '提交答案前检查：初始化、循环条件、数组下标、返回值、输出格式。',
          ],
        },
        { title: '五、个性化依据', items: baseEvidence },
      ],
    }
  }

  if (card.resourceType === 'learning_path') {
    return {
      sections: [
        {
          title: '阶段 1：知识补齐',
          items: [
            `任务：阅读讲义并观看 ${weakText} 相关视频。`,
            '产出：整理 1 页笔记，写出核心概念、语法模板和 3 个易错点。',
            '验收：能独立解释一段基础代码的执行过程。',
          ],
        },
        {
          title: '阶段 2：基础练习',
          items: [
            `任务：完成 ${Math.max(3, count)} 道基础题，覆盖概念识别、代码填空和输出判断。`,
            '产出：每题写出答案依据，不只写最终答案。',
            '验收：基础题正确率达到 80% 以上再进入下一阶段。',
          ],
        },
        {
          title: '阶段 3：变式迁移',
          items: [
            '任务：完成 2-3 道变式题，把知识点放到新的题干或小程序中使用。',
            `关注：${gapText}，尤其是能否迁移到没见过的题型。`,
            '验收：能说明题目变化点和解题策略变化。',
          ],
        },
        {
          title: '阶段 4：错因复盘',
          items: [
            '任务：整理本轮错题，标注错因、知识点和修正方法。',
            '产出：形成“错误原因 -> 正确方法 -> 同类题提醒”的复盘表。',
            '验收：再做 1 道同类题，确认不再重复同一类错误。',
          ],
        },
        { title: '阶段依据', items: baseEvidence },
      ],
    }
  }

  if (card.resourceType === 'error_reflection') {
    const detailSource = Array.isArray(card.errorItems) && card.errorItems.length
      ? card.errorItems
      : Array.isArray(card.wrongQuestions) && card.wrongQuestions.length
        ? card.wrongQuestions
        : []
    const questionItems = detailSource.slice(0, scope === 'class' ? 15 : 10).map((item, index) => {
      const title = item.title || item.stem || item.questionTitle || `错题 ${index + 1}`
      const wrongCount = item.wrongCount ?? item.errorCount ?? item.count
      const prefix = scope === 'class' && wrongCount != null ? `错 ${wrongCount} 人：` : ''
      return `${prefix}${title}。分析重点：涉及知识点、错误原因、正确解法、同类题迁移。`
    })
    return {
      sections: [
        {
          title: scope === 'class' ? '班级高频错题排序' : '学生错题重点复盘',
          items: questionItems.length
            ? questionItems
            : [
                scope === 'class'
                  ? `当前接口暂未返回班级逐题错误人数，先按薄弱知识点 ${weakText} 建立高频错题复盘清单；后端接入错题统计后应按错误人数从高到低取前 10-15 题。`
                  : `当前接口暂未返回学生具体错题题干，先按薄弱知识点 ${weakText} 建立待复核错题清单；后端接入学生错题记录后应逐题展示最近错题。`,
              ],
        },
        {
          title: '逐题分析模板',
          items: [
            '题目：保留原题题干、学生答案、标准答案和得分情况。',
            '错因：区分概念不清、边界遗漏、审题偏差、代码执行顺序误判、输出格式错误。',
            '修正：给出正确解法和关键代码片段。',
            '迁移：安排 1 道同类变式题，要求学生写出判断依据。',
          ],
        },
        {
          title: '复盘产出',
          items: [
            '学生端：形成个人错题复盘表，下一次练习前先看复盘表。',
            '班级端：形成高频错题讲评顺序，优先讲错误人数最多的题。',
            '教师端：讲评后再次布置同类变式题，观察错误率是否下降。',
          ],
        },
        { title: '个性化依据', items: baseEvidence },
      ],
    }
  }

  if (card.resourceType === 'remedial_exercise') {
    return {
      sections: [
        {
          title: '练习配置',
          items: [
            `练习主题：${weakText}`,
            `题量建议：${Math.max(3, count)} 道`,
            '题型结构：基础识别题、代码阅读题、变式应用题、错因复盘题。',
          ],
        },
        {
          title: '训练目标',
          items: [
            '每道题必须包含题干、答案、解析和知识点标签。',
            '学生答错时，先提示相关概念，再展示完整解析。',
            `重点观察 ${gapText} 是否改善。`,
          ],
        },
        { title: '个性化依据', items: baseEvidence },
      ],
    }
  }

  return {
    sections: [
      { title: '资源说明', items: [card.summary || `围绕 ${weakText} 生成的个性化学习资源。`] },
      { title: '个性化依据', items: baseEvidence },
    ],
  }
}

function structuredContentToText(structured) {
  return (structured?.sections || [])
    .map((section) => [
      section.title,
      ...(section.items || []).map((item, index) => `${index + 1}. ${item}`),
    ].join('\n'))
    .join('\n\n')
}

function enrichGeneratedCard(card = {}, context = {}) {
  const normalized = normalizeGeneratedCard(card)
  const structuredContent = normalized.structuredContent || buildStructuredResourceContent(normalized, context)
  const content = contentLooksEmpty(normalized.content)
    ? structuredContentToText(structuredContent)
    : normalized.content
  return {
    ...normalized,
    structuredContent,
    content,
    summary: normalized.summary || (structuredContent.sections?.[0]?.items?.[0] || '已生成可审核的个性化学习资源。'),
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
    .map((card) => enrichGeneratedCard(card, context))
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
