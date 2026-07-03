<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import SplitText from '@/components/landing/SplitText.vue'

const props = defineProps({
  canExit: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['min-elapsed', 'complete'])

const rootRef = ref(null)
const topDone = ref(false)
const titleDone = ref(false)
const holdReady = ref(false)
const exiting = ref(false)

let ctx

function markReadyIfDone() {
  if (!topDone.value || !titleDone.value || holdReady.value) return
  holdReady.value = true
  emit('min-elapsed')
  if (props.canExit) startExit()
}

function startExit() {
  if (!holdReady.value || exiting.value || !rootRef.value) return
  exiting.value = true

  ctx?.add(() => {
    gsap.timeline({ onComplete: () => emit('complete') })
      .to('.landing-intro-content', {
        autoAlpha: 0,
        y: -18,
        filter: 'blur(10px)',
        duration: 0.42,
        ease: 'power2.inOut',
      })
      .to(
        rootRef.value,
        {
          autoAlpha: 0,
          scale: 1.02,
          duration: 0.55,
          ease: 'power2.inOut',
        },
        0.08,
      )
  })
}

watch(
  () => props.canExit,
  (value) => {
    if (value && holdReady.value) {
      startExit()
    }
  },
)

onMounted(async () => {
  await nextTick()
  if (!rootRef.value) return

  ctx = gsap.context(() => {
    gsap.set(rootRef.value, { autoAlpha: 1 })
    gsap.fromTo(
      '.landing-intro-orbit',
      { autoAlpha: 0, scale: 0.92, rotation: -10 },
      { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.9, ease: 'power3.out' },
    )
    gsap.to('.landing-intro-orbit', {
      rotation: 360,
      duration: 18,
      ease: 'none',
      repeat: -1,
    })
  }, rootRef.value)
})

onUnmounted(() => {
  ctx?.revert()
})
</script>

<template>
  <div ref="rootRef" class="landing-intro-overlay">
    <div class="landing-intro-grid" aria-hidden="true"></div>
    <div class="landing-intro-orbit" aria-hidden="true"></div>
    <div class="landing-intro-content">
      <SplitText
        tag="p"
        text="欢迎来到"
        class-name="landing-intro-kicker"
        :delay="64"
        :duration="0.62"
        ease="power3.out"
        split-type="chars"
        :from="{ opacity: 0, y: 28, filter: 'blur(8px)' }"
        :to="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        root-margin="0px"
        text-align="center"
        @letter-animation-complete="topDone = true; markReadyIfDone()"
      />
      <SplitText
        tag="h1"
        text="智能学习系统"
        class-name="landing-intro-title"
        :delay="78"
        :duration="0.78"
        ease="power3.out"
        split-type="chars"
        :from="{ opacity: 0, y: 48, scale: 0.96, filter: 'blur(10px)' }"
        :to="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
        root-margin="0px"
        text-align="center"
        @letter-animation-complete="titleDone = true; markReadyIfDone()"
      />
    </div>
  </div>
</template>

<style scoped>
.landing-intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  overflow: hidden;
  background:
    radial-gradient(circle at 30% 20%, rgba(34, 211, 238, 0.12), transparent 20%),
    radial-gradient(circle at 74% 18%, rgba(52, 211, 153, 0.1), transparent 18%),
    radial-gradient(circle at 50% 50%, rgba(8, 47, 73, 0.28), transparent 40%),
    linear-gradient(145deg, #020617 0%, #061830 46%, #031126 100%);
}

.landing-intro-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(125, 211, 252, 0.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(125, 211, 252, 0.06) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(circle at center, black, transparent 70%);
}

.landing-intro-orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(56vw, 720px);
  aspect-ratio: 1;
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow:
    inset 0 0 44px rgba(34, 211, 238, 0.08),
    0 0 80px rgba(34, 211, 238, 0.12);
}

.landing-intro-orbit::before,
.landing-intro-orbit::after {
  content: '';
  position: absolute;
  border-radius: 50%;
}

.landing-intro-orbit::before {
  inset: 14%;
  border: 1px dashed rgba(125, 211, 252, 0.18);
}

.landing-intro-orbit::after {
  top: 14%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: #67e8f9;
  box-shadow: 0 0 18px rgba(103, 232, 249, 0.85);
}

.landing-intro-content {
  position: relative;
  z-index: 2;
  min-height: 100%;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  padding: 24px;
  text-align: center;
}

:deep(.landing-intro-kicker) {
  margin: 0;
  color: rgba(186, 230, 253, 0.92);
  font-size: clamp(20px, 2vw, 30px);
  font-weight: 700;
  letter-spacing: 0.22em;
}

:deep(.landing-intro-title) {
  margin: 0;
  color: rgba(248, 253, 255, 0.94);
  font-size: clamp(46px, 7vw, 94px);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: 0.08em;
  text-shadow:
    0 0 18px rgba(56, 189, 248, 0.52),
    0 0 42px rgba(45, 212, 191, 0.28);
}

@media (prefers-reduced-motion: reduce) {
  .landing-intro-orbit {
    display: none;
  }
}

@media (max-width: 760px) {
  .landing-intro-orbit {
    width: min(86vw, 420px);
  }

  :deep(.landing-intro-kicker) {
    letter-spacing: 0.16em;
  }

  :deep(.landing-intro-title) {
    font-size: clamp(34px, 10vw, 56px);
    letter-spacing: 0.04em;
  }
}
</style>
