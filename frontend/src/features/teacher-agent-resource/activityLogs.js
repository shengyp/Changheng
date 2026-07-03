import {
  AGENT_LOG_STORAGE_KEY,
  readStorageJson,
  writeStorageJson,
} from './workspaceStorage'

export function createActivityLog(agentId, content, agents = {}) {
  return {
    id: `${agentId}-${Date.now()}`,
    agent: agents[agentId]?.cnTitle || agentId,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    content,
  }
}

export function readActivityLogs() {
  return readStorageJson(AGENT_LOG_STORAGE_KEY, [])
}

export function persistActivityLogs(logs = []) {
  writeStorageJson(AGENT_LOG_STORAGE_KEY, logs)
}

export function prependActivityLog(logs = [], agentId, content, agents = {}) {
  return [createActivityLog(agentId, content, agents), ...logs]
}

export function removeActivityLog(logs = [], logId) {
  return logs.filter((item) => item.id !== logId)
}
