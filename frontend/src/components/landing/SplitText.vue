<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  tag: {
    type: String,
    default: 'p',
  },
  text: {
    type: String,
    default: '',
  },
  className: {
    type: String,
    default: '',
  },
  delay: {
    type: Number,
    default: 50,
  },
  duration: {
    type: Number,
    default: 1.25,
  },
  ease: {
    type: String,
    default: 'power3.out',
  },
  splitType: {
    type: String,
    default: 'chars',
  },
  from: {
    type: Object,
    default: () => ({ opacity: 0, y: 40 }),
  },
  to: {
    type: Object,
    default: () => ({ opacity: 1, y: 0 }),
  },
  threshold: {
    type: Number,
    default: 0.1,
  },
  rootMargin: {
    type: String,
    default: '-100px',
  },
  textAlign: {
    type: String,
    default: 'center',
  },
})

const emit = defineEmits(['letter-animation-complete'])

const rootRef = ref(null)
const fontsLoaded = ref(false)
const animationCompleted = ref(false)

let ctx
let observer

const normalizedTag = computed(() => {
  const allowedTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span']
  return allowedTags.includes(props.tag) ? props.tag : 'p'
})

const splitSegments = computed(() => {
  if (props.splitType.includes('words') && !props.splitType.includes('chars')) {
    return props.text.split(/(\s+)/).map((part, index) => ({
      key: `${part}-${index}`,
      value: part,
      whitespace: /^\s+$/.test(part),
      className: 'split-word',
    }))
  }

  return Array.from(props.text).map((char, index) => ({
    key: `${char}-${index}`,
    value: char,
    whitespace: char === ' ',
    className: 'split-char',
  }))
})

function cleanupAnimation() {
  observer?.disconnect()
  observer = undefined
  ctx?.revert()
  ctx = undefined
}

function runAnimation() {
  if (!rootRef.value || !props.text || animationCompleted.value) return

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const targets = rootRef.value.querySelectorAll('.split-char, .split-word')

  ctx = gsap.context(() => {
    if (reduceMotion) {
      gsap.set(targets, { opacity: 1, y: 0, clearProps: 'transform,opacity' })
      animationCompleted.value = true
      emit('letter-animation-complete')
      return
    }

    gsap.fromTo(
      targets,
      { ...props.from },
      {
        ...props.to,
        duration: props.duration,
        ease: props.ease,
        stagger: props.delay / 1000,
        force3D: true,
        onComplete: () => {
          animationCompleted.value = true
          emit('letter-animation-complete')
        },
      },
    )
  }, rootRef.value)
}

function setupObserver() {
  cleanupAnimation()
  if (!rootRef.value || !fontsLoaded.value) return

  animationCompleted.value = false
  const hasIntersectionObserver = typeof IntersectionObserver !== 'undefined'

  if (!hasIntersectionObserver) {
    runAnimation()
    return
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return
      observer?.disconnect()
      observer = undefined
      runAnimation()
    },
    {
      threshold: props.threshold,
      rootMargin: props.rootMargin,
    },
  )
  observer.observe(rootRef.value)
}

watch(
  () => [
    props.text,
    props.delay,
    props.duration,
    props.ease,
    props.splitType,
    JSON.stringify(props.from),
    JSON.stringify(props.to),
    props.threshold,
    props.rootMargin,
    fontsLoaded.value,
  ],
  async () => {
    await nextTick()
    setupObserver()
  },
)

onMounted(async () => {
  if (document.fonts?.status === 'loaded') {
    fontsLoaded.value = true
  } else if (document.fonts?.ready) {
    await document.fonts.ready
    fontsLoaded.value = true
  } else {
    fontsLoaded.value = true
  }
})

onUnmounted(() => {
  cleanupAnimation()
})
</script>

<template>
  <component
    :is="normalizedTag"
    ref="rootRef"
    :class="['split-parent', className]"
    :style="{ textAlign }"
  >
    <span
      v-for="segment in splitSegments"
      :key="segment.key"
      :class="[segment.className, { 'split-space': segment.whitespace }]"
      aria-hidden="true"
    >
      {{ segment.whitespace ? '\u00A0' : segment.value }}
    </span>
    <span class="split-sr-only">{{ text }}</span>
  </component>
</template>

<style scoped>
.split-parent {
  display: inline-block;
  overflow: hidden;
  white-space: normal;
  word-wrap: break-word;
  will-change: transform, opacity;
}

.split-char,
.split-word {
  display: inline-block;
  will-change: transform, opacity;
}

.split-space {
  width: 0.35em;
}

.split-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
