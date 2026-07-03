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

<style scoped src="@/styles/student-assistant-pet.css"></style>


