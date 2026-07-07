export function findProvider(providerOptions = [], providerKey = '') {
  if (!providerKey) return null
  return providerOptions.find((item) => item.providerKey === providerKey) || null
}

export function providerLabel(providerOptions = [], providerKey = '') {
  if (!providerKey) return ''
  return findProvider(providerOptions, providerKey)?.label || providerKey
}

export function providerSummaryText(providerOptions = [], defaultProviderKey = '') {
  const defaultProvider = findProvider(providerOptions, defaultProviderKey)
  if (defaultProvider) {
    return `默认模型：${defaultProvider.label || defaultProvider.providerKey}`
  }
  if (providerOptions.length > 0) {
    return '默认模型：跟随系统默认'
  }
  return '默认模型：暂无可用模型'
}

export function currentAgentProviderKey(agentId, agentOverrides = {}, providerFieldMap = {}) {
  const providerField = providerFieldMap[agentId] || agentId
  return agentOverrides[providerField] || ''
}

export function currentAgentProviderLabel(agentId, {
  agentOverrides = {},
  defaultProviderKey = '',
  providerFieldMap = {},
  providerOptions = [],
} = {}) {
  const providerKey = currentAgentProviderKey(agentId, agentOverrides, providerFieldMap)
  if (providerKey) return providerLabel(providerOptions, providerKey)
  if (findProvider(providerOptions, defaultProviderKey)) {
    return `${providerLabel(providerOptions, defaultProviderKey)}（继承默认）`
  }
  return providerOptions.length > 0 ? '跟随系统默认' : '未配置'
}

export function providerBindingMode(agentKey, { agentOverrides = {}, defaultProviderKey = '' } = {}) {
  if (agentOverrides[agentKey]) return '独立覆盖模型'
  if (defaultProviderKey) return '继承页面默认模型'
  return '跟随系统默认模型'
}

export function buildAgentProviderPayload(agentOverrides = {}) {
  return Object.entries(agentOverrides).reduce((result, [agentKey, providerKey]) => {
    if (providerKey) result[agentKey] = providerKey
    return result
  }, {})
}

export function findTrace(lastRun, agentId) {
  return lastRun?.agentTrace?.find((item) => item.agentId === agentId) || null
}

export function traceSummary(lastRun, agentId, fallback) {
  const trace = findTrace(lastRun, agentId)
  if (!trace) return fallback
  const model = trace.modelName ? `模型：${trace.modelName}` : ''
  const call = trace.llmCallId ? `调用ID：${trace.llmCallId}` : ''
  return [trace.summary, model, call].filter(Boolean).join('；') || fallback
}
