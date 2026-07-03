export const dimensionMeta = {
  知识基础: {
    color: '#2563eb',
    desc: '反映核心概念、语法规则、基础题型和知识点掌握程度。',
    action: '先补齐低掌握知识点，再进入综合练习。',
  },
  目标清晰度: {
    color: '#0891b2',
    desc: '反映学习目标是否明确，以及能否拆成可执行的小任务。',
    action: '把本周目标拆成 3 个可检查的练习任务。',
  },
  学习自律: {
    color: '#16a34a',
    desc: '反映学习频率、复习节奏和任务持续完成情况。',
    action: '固定每日短练窗口，先稳定学习节奏。',
  },
  理解迁移: {
    color: '#7c3aed',
    desc: '反映能否把已学知识迁移到新题型、新场景或项目任务。',
    action: '每个知识点至少完成 1 道变式题和 1 道应用题。',
  },
  实践能力: {
    color: '#d97706',
    desc: '反映代码实现、实验复现、案例理解和动手解决问题的能力。',
    action: '用一个小案例把知识点落到代码或实验报告里。',
  },
  错题反思: {
    color: '#e11d48',
    desc: '反映错因定位、订正记录和二次巩固的质量。',
    action: '整理最近错题，标注错因、知识点和重新作答结果。',
  },
  资源筛选: {
    color: '#0d9488',
    desc: '反映能否选择适合自己的资料、题目和复习路径。',
    action: '按薄弱知识点筛选资源，避免泛泛浏览。',
  },
  协作表达: {
    color: '#9333ea',
    desc: '反映提问、解释思路、与小C或同伴对话复盘的能力。',
    action: '把一道题的思路讲给小C，再检查表达漏洞。',
  },
}

export function levelText(level, score) {
  if (score >= 85 || level === 'excellent') return '优势'
  if (score >= 70 || level === 'good') return '稳定'
  if (score >= 60 || level === 'normal') return '观察'
  return '预警'
}

export function recordTypeText(type) {
  if (type === 'exam') return '试卷'
  if (type === 'practice') return '练习'
  if (type === 'assistant') return '小C'
  return '记录'
}

export function normalizeTrend(points) {
  const list = points.slice(-10)
  if (!list.length) return []
  const width = 520
  const height = 180
  const paddingX = 24
  const step = list.length === 1 ? 0 : (width - paddingX * 2) / (list.length - 1)
  return list.map((item, index) => {
    const score = clamp(Number(item.score) || 0, 0, 100)
    return {
      ...item,
      score,
      x: paddingX + step * index,
      y: height - 18 - (score / 100) * 136,
    }
  })
}

export function buildTrendPath(points) {
  if (!points.length) return ''
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

export function radarPoint(radius, index, total) {
  const center = 180
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: Number((center + Math.cos(angle) * radius).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius).toFixed(2)),
  }
}

export function scoreRadarPoint(radius, index, total) {
  const center = 150
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2
  return {
    x: Number((center + Math.cos(angle) * radius).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius).toFixed(2)),
  }
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function buildFallbackReport() {
  const radar = [
    { name: '知识基础', score: 72, level: 'good' },
    { name: '目标清晰度', score: 68, level: 'normal' },
    { name: '学习自律', score: 64, level: 'normal' },
    { name: '理解迁移', score: 61, level: 'normal' },
    { name: '实践能力', score: 76, level: 'good' },
    { name: '错题反思', score: 58, level: 'risk' },
    { name: '资源筛选', score: 69, level: 'normal' },
    { name: '协作表达', score: 74, level: 'good' },
  ]
  return {
    summary: {
      profileScore: 68,
      examCount: 0,
      practiceCount: 0,
      assistantChatCount: 0,
      weakDimensionCount: 2,
      updatedAt: '等待最新数据',
    },
    radar,
    insights: [
      { type: 'risk', title: '错题反思需要加强', description: '建议把最近错题交给小C复盘，再做一次同类变式练习。' },
      { type: 'strength', title: '实践能力较稳定', description: '可以继续通过代码案例理解抽象概念。' },
    ],
    scoreTrend: [
      { date: '06-01', score: 58, sourceType: 'practice' },
      { date: '06-05', score: 64, sourceType: 'practice' },
      { date: '06-10', score: 68, sourceType: 'exam' },
      { date: '06-18', score: 72, sourceType: 'practice' },
    ],
    evaluationDistribution: radar,
    scoringItemAnalysis: {
      attemptCount: 1,
      sourceType: 'all',
      summary: '暂无真实评分项明细，完成试卷或练习并评分后会自动生成诊断。',
      bestItem: '问题分解完整性',
      weakestItem: '问题关联性认知',
      items: [
        { name: '问题关联性认知', scoreRate: 0, avgScore: 0, maxScore: 15 },
        { name: '计算思维体现', scoreRate: 0, avgScore: 0, maxScore: 10 },
        { name: '子问题求解思路清晰度', scoreRate: 0, avgScore: 0, maxScore: 25 },
        { name: '边缘情况考虑周全性', scoreRate: 0, avgScore: 0, maxScore: 20 },
        { name: '问题分解完整性', scoreRate: 16.7, avgScore: 5, maxScore: 30 },
      ],
      variants: {},
    },
    records: [
      { type: 'assistant', title: '小C对话示例', time: '等待真实记录', summary: '与小C对话后，这里会显示自然语言学习记录。' },
      { type: 'practice', title: '练习记录示例', time: '等待真实记录', score: 72, summary: '完成练习后，这里会显示得分和画像影响。' },
    ],
  }
}
