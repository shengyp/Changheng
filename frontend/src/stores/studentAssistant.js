import { defineStore } from 'pinia'
import { llmApi } from '@/api/services'

const STORAGE_KEY = 'qb_student_assistant_messages'
const MAX_STORED_MESSAGES = 40
const MAX_REQUEST_HISTORY = 8

function safeParse(json, fallback = []) {
  if (!json) return fallback
  try {
    const value = JSON.parse(json)
    return Array.isArray(value) ? value : fallback
  } catch {
    return fallback
  }
}

function normalizeMessage(message) {
  return {
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    content: String(message?.content || '').trim(),
    createdAt: message?.createdAt || new Date().toISOString(),
    sources: Array.isArray(message?.sources) ? message.sources : [],
  }
}

function persistMessages(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
}

export const useStudentAssistantStore = defineStore('studentAssistant', {
  state: () => ({
    open: false,
    loading: false,
    messages: safeParse(localStorage.getItem(STORAGE_KEY)).map(normalizeMessage).filter((item) => item.content),
    pageContext: {},
    pendingMessage: '',
    lastError: '',
    profileRefreshToken: 0,
  }),
  getters: {
    lockedReason(state) {
      if (state.pageContext?.aiLocked) {
        return state.pageContext.lockedReason || '模拟考试期间不能使用小C，提交后可在结果页复盘。'
      }
      return ''
    },
    canSend() {
      return !this.loading && !this.lockedReason
    },
    recentHistory(state) {
      return state.messages.slice(-MAX_REQUEST_HISTORY).map((item) => ({
        role: item.role,
        content: item.content,
      }))
    },
  },
  actions: {
    setOpen(value) {
      this.open = Boolean(value)
    },
    toggleOpen() {
      this.open = !this.open
    },
    registerContext(context = {}) {
      this.pageContext = {
        ...this.pageContext,
        ...context,
      }
    },
    resetToRouteContext(routeContext = {}) {
      this.pageContext = { ...routeContext }
      this.lastError = ''
    },
    clearMessages() {
      this.messages = []
      this.pendingMessage = ''
      this.lastError = ''
      persistMessages(this.messages)
    },
    appendMessage(message) {
      const normalized = normalizeMessage(message)
      if (!normalized.content) return
      this.messages = [...this.messages, normalized].slice(-MAX_STORED_MESSAGES)
      persistMessages(this.messages)
    },
    async sendMessage(text) {
      const content = String(text || this.pendingMessage || '').trim()
      if (!content || !this.canSend) return null

      this.lastError = ''
      this.pendingMessage = ''
      this.appendMessage({ role: 'user', content })
      this.loading = true

      try {
        const result = await llmApi.studentAssistantChat({
          message: content,
          history: this.recentHistory,
          pageContext: this.pageContext,
          providerKey: this.pageContext?.providerKey || '',
        })
        const reply = result?.reply || '小C暂时没有生成回复，请稍后再试。'
        this.appendMessage({
          role: 'assistant',
          content: reply,
          sources: result?.contextUsed ? ['已结合当前页面上下文'] : [],
        })
        this.profileRefreshToken = Date.now()
        return result
      } catch (error) {
        this.pendingMessage = content
        this.lastError = error?.message || '小C连接失败，请稍后再试。'
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
