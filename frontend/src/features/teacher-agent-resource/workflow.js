const DEFAULT_NODE_WIDTH = 260
const DEFAULT_NODE_HEIGHT = 88
const DEFAULT_TARGET_POSITION = { x: 1980, y: 340 }

export function buildDynamicEdges(edges = [], agentPositions = {}, options = {}) {
  const nodeWidth = options.nodeWidth || DEFAULT_NODE_WIDTH
  const nodeHeight = options.nodeHeight || DEFAULT_NODE_HEIGHT
  const targetPosition = options.targetPosition || DEFAULT_TARGET_POSITION
  const verticalCenter = nodeHeight / 2

  return edges.map((edge) => {
    const fromPos = agentPositions[edge.from]
    if (!fromPos) return edge

    let endX
    let endY
    if (edge.to === 'target') {
      endX = targetPosition.x
      endY = targetPosition.y
    } else {
      const toPos = agentPositions[edge.to]
      if (!toPos) return edge
      endX = toPos.x
      endY = toPos.y + verticalCenter
    }

    const startX = fromPos.x + nodeWidth
    const startY = fromPos.y + verticalCenter
    const cpOffset = Math.max(50, Math.abs(endX - startX) * 0.45)
    const path = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`

    return { ...edge, path, startX, startY, endX, endY }
  })
}

export function isAgentReady(agentId, { hasStudent = false, completedSet = new Set() } = {}) {
  if (!hasStudent) return false
  if (agentId === 'preprocess') return true
  if (agentId === 'coordinator') return completedSet.has('preprocess')
  if (['knowledge', 'ability', 'behavior'].includes(agentId)) return completedSet.has('coordinator')
  if (agentId === 'resource') return completedSet.has('knowledge')
  if (agentId === 'practice') return completedSet.has('ability') && completedSet.has('behavior')
  if (agentId === 'report') return completedSet.has('resource') && completedSet.has('practice')
  if (['qualityReview', 'consistencyReview'].includes(agentId)) return completedSet.has('report')
  return false
}

export function isReceivingAgent(agentId, flowingEdges = []) {
  return flowingEdges.some((edge) => edge.to === agentId)
}

export function isPendingAgent(agentId, state = {}) {
  return !state.ready && !state.completed && !state.active && !isReceivingAgent(agentId, state.flowingEdges || [])
}

export function agentNodeStatusClass({ active = false, receiving = false, completed = false } = {}) {
  if (active || receiving) return 'is-running'
  if (completed) return 'is-done'
  return 'is-idle'
}

export function agentStatusText({ completed = false, active = false, ready = false } = {}) {
  if (completed) return '已完成'
  if (active) return '流转中'
  if (ready) return '可执行'
  return '等待上游'
}

export function edgeClassState(edge, { flowingSet = new Set(), completedSet = new Set() } = {}) {
  const flowing = flowingSet.has(edge.id)
  return {
    'flow-edge': true,
    'is-flowing': flowing,
    'is-finished': completedSet.has(edge.from),
    'is-resting': !flowing,
  }
}
