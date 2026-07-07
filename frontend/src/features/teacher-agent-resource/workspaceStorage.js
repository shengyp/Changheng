export const TASK_STORAGE_KEY = 'teacher-agent-resource-task'
export const AGENT_WORKSPACE_STORAGE_KEY = 'teacher-agent-resource-workspace'
export const AGENT_LOG_STORAGE_KEY = 'teacher-agent-resource-logs'

export function readStorageJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStorageJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeStorageItem(key) {
  localStorage.removeItem(key)
}

export function buildTaskSnapshot(task, { studentId = null, stage = '' } = {}) {
  if (!task?.taskId) return null
  return {
    taskId: task.taskId,
    studentId: studentId || null,
    stage,
  }
}

export function buildWorkspaceSnapshot({
  selectedStudentId = '',
  stage = '',
  completedAgents = [],
  activeAgentId = '',
  flowingEdges = [],
  candidateResources = [],
  generatedResources = [],
  lastRun = null,
  liveConsultationMessages = [],
  pendingConsultationMessages = [],
  consultationState = 'idle',
  pausedAgentId = '',
  teacherRequirement = '',
  generationConfig = {},
  agentOutputs = {},
  generationTaskId = '',
  generationTaskStatus = 'idle',
  generationTaskMessage = '',
} = {}) {
  return {
    selectedStudentId,
    stage,
    completedAgents,
    activeAgentId,
    flowingEdges,
    candidateResources,
    generatedResources,
    lastRun,
    liveConsultationMessages,
    pendingConsultationMessages,
    consultationState,
    pausedAgentId,
    teacherRequirement,
    generationConfig,
    agentOutputs,
    generationTaskId,
    generationTaskStatus,
    generationTaskMessage,
  }
}
