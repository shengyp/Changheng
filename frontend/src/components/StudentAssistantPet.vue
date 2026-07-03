<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Close, Delete, Lock, Promotion } from '@element-plus/icons-vue'
import { useStudentAssistantStore } from '@/stores/studentAssistant'

const assistant = useStudentAssistantStore()
const inputRef = ref(null)
const messagesRef = ref(null)
const rootRef = ref(null)
const petRef = ref(null)
const dragPosition = ref(null)
const dragging = ref(false)
const suppressNextClick = ref(false)
const viewport = ref({
  width: typeof window === 'undefined' ? 1440 : window.innerWidth,
  height: typeof window === 'undefined' ? 900 : window.innerHeight,
})

const POSITION_STORAGE_KEY = 'qb_student_assistant_position'
const DRAG_THRESHOLD = 4
let dragState = null

const quickPrompts = computed(() => {
  if (assistant.lockedReason) return []
  if (assistant.pageContext?.attemptId) {
    return ['提示一下思路', '我错在哪', '给我一个相似例子']
  }
  return ['帮我规划今天的练习', '解释一下指针', '推荐我下一步学什么']
})

const panelTitle = computed(() => {
  if (assistant.lockedReason) return '小C已锁定'
  if (assistant.pageContext?.attemptId) return '小C题目答疑'
  return '小C学习助手'
})

const rootStyle = computed(() => {
  if (!dragPosition.value) return {}
  return {
    left: `${dragPosition.value.x}px`,
    top: `${dragPosition.value.y}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

const panelStyle = computed(() => {
  if (viewport.value.width <= 720) return {}

  const gap = 14
  const panelWidth = 380
  const panelHeight = Math.min(560, viewport.value.height - 132)
  const pet = petSize()
  const petPosition = currentPositionFromDom()

  const rightSpace = viewport.value.width - (petPosition.x + pet.width)
  const leftSpace = petPosition.x
  let left
  if (rightSpace >= panelWidth + gap) {
    left = petPosition.x + pet.width + gap
  } else if (leftSpace >= panelWidth + gap) {
    left = petPosition.x - panelWidth - gap
  } else {
    left = Math.max(12, Math.min(petPosition.x, viewport.value.width - panelWidth - 12))
  }

  const belowSpace = viewport.value.height - (petPosition.y + pet.height)
  const aboveSpace = petPosition.y
  let top
  if (belowSpace >= panelHeight + gap) {
    top = petPosition.y
  } else if (aboveSpace >= panelHeight + gap) {
    top = petPosition.y + pet.height - panelHeight
  } else {
    top = Math.max(12, Math.min(petPosition.y, viewport.value.height - panelHeight - 12))
  }

  return {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${panelWidth}px`,
    height: `${panelHeight}px`,
    right: 'auto',
    bottom: 'auto',
  }
})

watch(
  () => assistant.open,
  async (open) => {
    if (!open) return
    await nextTick()
    scrollToBottom()
    inputRef.value?.focus?.()
  },
)

watch(
  () => assistant.messages.length,
  async () => {
    await nextTick()
    scrollToBottom()
  },
)

function scrollToBottom() {
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function send(text = '') {
  try {
    await assistant.sendMessage(text)
  } catch (error) {
    ElMessage.error(error?.message || '小C连接失败，请稍后再试')
  }
}

function readSavedPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_STORAGE_KEY) || 'null')
    if (typeof saved?.x === 'number' && typeof saved?.y === 'number') {
      dragPosition.value = clampPosition(saved.x, saved.y)
    }
  } catch {
    dragPosition.value = null
  }
}

function savePosition(position) {
  if (!position) return
  localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position))
}

function petSize() {
  const rect = petRef.value?.getBoundingClientRect()
  return {
    width: rect?.width || 72,
    height: rect?.height || 78,
  }
}

function clampPosition(x, y) {
  const { width, height } = petSize()
  const gap = 12
  const maxX = Math.max(window.innerWidth - width - gap, gap)
  const maxY = Math.max(window.innerHeight - height - gap, gap)
  return {
    x: Math.min(Math.max(x, gap), maxX),
    y: Math.min(Math.max(y, gap), maxY),
  }
}

function currentPositionFromDom() {
  if (dragPosition.value) return dragPosition.value
  const rect = rootRef.value?.getBoundingClientRect()
  if (!rect) return clampPosition(window.innerWidth - 96, window.innerHeight - 102)
  return clampPosition(rect.left, rect.top)
}

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return
  const startPosition = currentPositionFromDom()
  dragState = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startX: startPosition.x,
    startY: startPosition.y,
    moved: false,
  }
  petRef.value?.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', moveDrag)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
}

function moveDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  const dx = event.clientX - dragState.startClientX
  const dy = event.clientY - dragState.startClientY
  if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
  dragState.moved = true
  dragging.value = true
  dragPosition.value = clampPosition(dragState.startX + dx, dragState.startY + dy)
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return
  if (dragState.moved) {
    suppressNextClick.value = true
    savePosition(dragPosition.value)
    window.setTimeout(() => {
      suppressNextClick.value = false
    }, 0)
  }
  dragging.value = false
  petRef.value?.releasePointerCapture?.(event.pointerId)
  dragState = null
  window.removeEventListener('pointermove', moveDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
}

function handlePetClick() {
  if (suppressNextClick.value) return
  assistant.toggleOpen()
}

function clampSavedPosition() {
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
  if (!dragPosition.value) return
  dragPosition.value = clampPosition(dragPosition.value.x, dragPosition.value.y)
  savePosition(dragPosition.value)
}

function updateViewport() {
  viewport.value = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
  clampSavedPosition()
}

onMounted(() => {
  readSavedPosition()
  updateViewport()
  window.addEventListener('resize', updateViewport)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
  window.removeEventListener('pointermove', moveDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
})
</script>

<template>
  <div ref="rootRef" class="student-assistant" :class="{ 'is-dragging': dragging }" :style="rootStyle">
    <transition name="assistant-panel">
      <section v-if="assistant.open" class="assistant-card" :style="panelStyle" aria-label="小C学习助手">
        <header class="assistant-header">
          <button class="assistant-identity" type="button" @click="assistant.toggleOpen">
            <span class="assistant-face assistant-face-small" aria-hidden="true">
              <span class="face-screen">C</span>
            </span>
            <span>
              <strong>{{ panelTitle }}</strong>
              <small>{{ assistant.lockedReason ? '考试纪律保护中' : '陪你理解 C 语言' }}</small>
            </span>
          </button>
          <div class="assistant-actions">
            <button type="button" aria-label="清空小C对话" @click="assistant.clearMessages">
              <el-icon><Delete /></el-icon>
            </button>
            <button type="button" aria-label="关闭小C" @click="assistant.setOpen(false)">
              <el-icon><Close /></el-icon>
            </button>
          </div>
        </header>

        <div v-if="assistant.lockedReason" class="assistant-locked">
          <el-icon><Lock /></el-icon>
          <strong>模拟考试期间不能使用小C</strong>
          <p>{{ assistant.lockedReason }}</p>
        </div>

        <template v-else>
          <div ref="messagesRef" class="assistant-messages">
            <div v-if="assistant.messages.length === 0" class="assistant-empty">
              <el-icon><ChatDotRound /></el-icon>
              <strong>你好，我是小C</strong>
              <p>可以问我 C 语言概念、练习规划、题目思路和错因复盘。</p>
            </div>
            <article
              v-for="(message, index) in assistant.messages"
              :key="`${message.createdAt}-${index}`"
              class="assistant-message"
              :class="`is-${message.role}`"
            >
              <strong>{{ message.role === 'assistant' ? '小C' : '我' }}</strong>
              <p>{{ message.content }}</p>
              <span v-if="message.sources?.length">{{ message.sources.join('、') }}</span>
            </article>
            <article v-if="assistant.loading" class="assistant-message is-assistant is-loading">
              <strong>小C</strong>
              <p>正在思考中...</p>
            </article>
          </div>

          <div class="assistant-prompts">
            <button v-for="prompt in quickPrompts" :key="prompt" type="button" @click="send(prompt)">
              {{ prompt }}
            </button>
          </div>

          <div v-if="assistant.lastError" class="assistant-error" role="alert">
            {{ assistant.lastError }}
          </div>

          <form class="assistant-input" @submit.prevent="send()">
            <label class="sr-only" for="student-assistant-input">输入给小C的问题</label>
            <textarea
              id="student-assistant-input"
              ref="inputRef"
              v-model="assistant.pendingMessage"
              rows="2"
              placeholder="问小C一个问题..."
              @keydown.ctrl.enter.prevent="send()"
            />
            <button type="submit" :disabled="!assistant.canSend || !assistant.pendingMessage.trim()" aria-label="发送给小C">
              <el-icon><Promotion /></el-icon>
            </button>
          </form>
        </template>
      </section>
    </transition>

    <button
      ref="petRef"
      type="button"
      class="assistant-pet"
      :class="{ 'is-open': assistant.open, 'is-locked': assistant.lockedReason }"
      :aria-expanded="assistant.open"
      aria-label="打开小C学习助手"
      @pointerdown="startDrag"
      @click="handlePetClick"
    >
      <span class="assistant-face" aria-hidden="true">
        <span class="face-screen">C</span>
        <span class="face-eye face-eye-left"></span>
        <span class="face-eye face-eye-right"></span>
      </span>
      <span class="assistant-pet-label">小C</span>
      <span class="assistant-status" aria-hidden="true"></span>
    </button>
  </div>
</template>

<style scoped>
.student-assistant {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  color: var(--app-text);
}

.assistant-pet {
  position: relative;
  display: grid;
  width: 72px;
  min-height: 78px;
  place-items: center;
  border: 1px solid rgba(79, 143, 123, 0.38);
  border-radius: 26px;
  color: #174b3e;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(222, 245, 238, 0.94)),
    #edf8f4;
  box-shadow: 0 16px 36px rgba(35, 77, 63, 0.2);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.student-assistant.is-dragging .assistant-pet {
  cursor: grabbing;
  transform: scale(0.98);
}

.assistant-pet:hover,
.assistant-pet:focus-visible {
  outline: none;
  transform: translateY(-2px);
  box-shadow: 0 20px 42px rgba(35, 77, 63, 0.26);
}

.student-assistant.is-dragging .assistant-pet:hover,
.student-assistant.is-dragging .assistant-pet:focus-visible {
  transform: scale(0.98);
}

.assistant-pet.is-open {
  transform: scale(0.96);
}

.assistant-pet.is-locked .assistant-status {
  background: #d99635;
}

.assistant-face {
  position: relative;
  display: grid;
  width: 48px;
  height: 42px;
  place-items: center;
  border: 2px solid rgba(47, 111, 94, 0.34);
  border-radius: 18px;
  background: linear-gradient(150deg, #4f8f7b, #b7ddcd);
}

.assistant-face::before,
.assistant-face::after {
  content: '';
  position: absolute;
  top: -8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #4f8f7b;
}

.assistant-face::before {
  left: 10px;
}

.assistant-face::after {
  right: 10px;
}

.assistant-face-small {
  width: 42px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 15px;
}

.face-screen {
  display: grid;
  width: 28px;
  height: 24px;
  place-items: center;
  border-radius: 10px;
  color: #fff;
  background: rgba(24, 75, 61, 0.86);
  font-weight: 900;
}

.face-eye {
  position: absolute;
  bottom: 7px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e9fff7;
}

.face-eye-left {
  left: 14px;
}

.face-eye-right {
  right: 14px;
}

.assistant-pet-label {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 900;
}

.assistant-status {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 11px;
  height: 11px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  background: #18b984;
}

.assistant-card {
  position: fixed;
  display: flex;
  flex-direction: column;
  width: 380px;
  height: min(560px, calc(100dvh - 132px));
  border: 1px solid rgba(79, 143, 123, 0.24);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 28px 80px rgba(30, 70, 58, 0.24);
  overflow: hidden;
}

.assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid var(--app-border);
  background:
    linear-gradient(135deg, rgba(79, 143, 123, 0.13), transparent 58%),
    #ffffff;
}

.assistant-identity {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border: 0;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.assistant-identity strong,
.assistant-identity small {
  display: block;
}

.assistant-identity strong {
  font-size: 16px;
}

.assistant-identity small {
  margin-top: 2px;
  color: var(--app-text-soft);
  font-size: 12px;
}

.assistant-actions {
  display: flex;
  gap: 6px;
}

.assistant-actions button,
.assistant-input button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  color: var(--app-primary-dark);
  background: #ffffff;
  cursor: pointer;
}

.assistant-actions button:hover,
.assistant-input button:hover {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
}

.assistant-messages {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  overflow-y: auto;
}

.assistant-empty,
.assistant-locked {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 28px;
  color: var(--app-text-soft);
  text-align: center;
}

.assistant-empty .el-icon,
.assistant-locked .el-icon {
  color: var(--app-primary-dark);
  font-size: 30px;
}

.assistant-empty strong,
.assistant-locked strong {
  color: var(--app-text);
}

.assistant-empty p,
.assistant-locked p {
  margin: 0;
  line-height: 1.7;
}

.assistant-message {
  max-width: 86%;
  border-radius: 14px;
  padding: 10px 12px;
  line-height: 1.65;
}

.assistant-message strong {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
}

.assistant-message p {
  margin: 0;
  white-space: pre-wrap;
}

.assistant-message span {
  display: block;
  margin-top: 6px;
  color: var(--app-text-soft);
  font-size: 12px;
}

.assistant-message.is-user {
  justify-self: end;
  color: #173d35;
  background: #ddf4ef;
}

.assistant-message.is-assistant {
  justify-self: start;
  border: 1px solid var(--app-border);
  background: #f7faf9;
}

.assistant-message.is-loading p {
  color: var(--app-text-soft);
}

.assistant-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 14px 12px;
}

.assistant-prompts button {
  min-height: 34px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  padding: 0 12px;
  color: var(--app-primary-dark);
  background: #f8fbfa;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}

.assistant-error {
  margin: 0 14px 10px;
  border-radius: 8px;
  padding: 8px 10px;
  color: #9f3a38;
  background: #fff1f0;
  font-size: 13px;
}

.assistant-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 10px;
  padding: 12px 14px 14px;
  border-top: 1px solid var(--app-border);
}

.assistant-input textarea {
  min-height: 44px;
  max-height: 92px;
  resize: vertical;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 10px 12px;
  color: var(--app-text);
  outline: none;
  font: inherit;
  line-height: 1.5;
}

.assistant-input textarea:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(79, 143, 123, 0.12);
}

.assistant-input button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: no-preference) {
  .assistant-pet .assistant-face {
    animation: xiao-c-breathe 3.8s ease-in-out infinite;
  }

  @keyframes xiao-c-breathe {
    0%,
    100% {
      box-shadow: 0 0 0 rgba(79, 143, 123, 0);
    }
    50% {
      box-shadow: 0 0 18px rgba(79, 143, 123, 0.32);
    }
  }
}

@media (max-width: 720px) {
  .student-assistant {
    right: 16px;
    bottom: 16px;
  }

  .assistant-card {
    position: fixed;
    right: 12px;
    bottom: 104px;
    left: 12px;
    width: auto;
    height: min(620px, calc(100dvh - 128px));
    border-radius: 18px;
  }

  .assistant-pet {
    width: 68px;
    min-height: 74px;
  }
}
</style>
