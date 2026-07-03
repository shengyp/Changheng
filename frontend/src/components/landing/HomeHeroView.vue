<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Collection, DataAnalysis, Document, Histogram, User } from '@element-plus/icons-vue'
import { gsap } from 'gsap'
import HeroScene from '@/components/landing/HeroScene.vue'

const props = defineProps({
  stats: { type: Array, default: () => [] },
  layers: { type: Array, default: () => [] },
  capabilities: { type: Array, default: () => [] },
})

defineEmits(['enter-competency', 'open-login', 'layer-click'])

const rootRef = ref(null)
let mediaContext
const prefersReducedMotion = ref(false)
const visualCollapsed = ref(false)

const nodeIcons = [DataAnalysis, Histogram, Collection, Document]

function getStatusClass(status) {
  if (status === '核心能力') return 'status-core'
  if (status === '已接入') return 'status-success'
  if (status === '能力联动') return 'status-warning'
  return 'status-evolving'
}

function handleHeroMove(event) {
  if (prefersReducedMotion.value) return
  const hero = event.currentTarget
  const rect = hero.getBoundingClientRect()
  const pointerX = (event.clientX - rect.left) / rect.width - 0.5
  const pointerY = (event.clientY - rect.top) / rect.height - 0.5

  gsap.to(hero.querySelector('.landing-model-shell'), {
    x: pointerX * 20, y: pointerY * 10, rotateY: pointerX * 10, rotateX: pointerY * -10,
    transformPerspective: 1000, duration: 0.5, ease: 'power2.out', overwrite: 'auto',
  })

  gsap.to(hero.querySelectorAll('.landing-orbit-node'), {
    x: (index) => pointerX * (index % 2 === 0 ? 15 : -15),
    y: (index) => pointerY * (index < 2 ? 10 : -10),
    duration: 0.5, ease: 'power2.out', overwrite: 'auto',
  })

  gsap.to(hero.querySelectorAll('.landing-stat'), {
    x: (index) => pointerX * (index < 2 ? -15 : 15),
    y: pointerY * 10, duration: 0.5, ease: 'power2.out', overwrite: 'auto',
  })
}

function enterVisualFocus(event) {
  if (prefersReducedMotion.value) return
  visualCollapsed.value = true

  const hero = event.currentTarget
  gsap.to(hero.querySelector('.landing-model-shell'), {
    scale: 0.94, duration: 0.4, ease: 'power2.out', overwrite: 'auto',
  })
  gsap.to(hero.querySelectorAll('.landing-orbit-node'), {
    scale: 1.05, duration: 0.4, ease: 'power2.out', overwrite: 'auto',
  })
}

function leaveVisualFocus(event) {
  visualCollapsed.value = false
  if (prefersReducedMotion.value) return

  const hero = event.currentTarget
  const modelShell = hero.querySelector('.landing-model-shell')
  const orbitNodes = hero.querySelectorAll('.landing-orbit-node')
  const stats = hero.querySelectorAll('.landing-stat')

  gsap.killTweensOf([modelShell, orbitNodes, stats])

  gsap.to(modelShell, { scale: 1, x: 0, y: 0, rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' })
  gsap.to(orbitNodes, { scale: 1, x: 0, y: 0, duration: 0.6, ease: 'power3.out' })
  gsap.to(stats, { x: 0, y: 0, duration: 0.6, ease: 'power3.out' })
}

function handleCardMove(event) {
  if (prefersReducedMotion.value) return
  const card = event.currentTarget
  const rect = card.getBoundingClientRect()
  const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 8
  const rotateX = -((event.clientY - rect.top) / rect.height - 0.5) * 8
  
  gsap.to(card, {
    rotateX, rotateY, y: -6, transformPerspective: 1000, duration: 0.25, overwrite: 'auto',
  })
}

function resetCardMove(event) {
  const card = event.currentTarget
  gsap.to(card, { rotateX: 0, rotateY: 0, y: 0, duration: 0.3, overwrite: 'auto' })
}

onMounted(() => {
  mediaContext = gsap.matchMedia()
  mediaContext.add(
    { reduceMotion: '(prefers-reduced-motion: reduce)' },
    ({ conditions }) => {
      prefersReducedMotion.value = Boolean(conditions.reduceMotion)
      if (conditions.reduceMotion) return

      const tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'power3.out' } })
      tl.from('.landing-nav', { autoAlpha: 0, y: -20 })
        .from('.landing-hero-copy > *', { autoAlpha: 0, y: 30, stagger: 0.1 }, '-=0.3')
        .from('.landing-model-shell', { autoAlpha: 0, scale: 0.9, duration: 0.8 }, '-=0.4')
        .from('.landing-orbit-node', { autoAlpha: 0, scale: 0.8, stagger: 0.05 }, '-=0.5')
        .from('.landing-stat', { autoAlpha: 0, y: 20, stagger: 0.05 }, '-=0.5')
        .from('.landing-layer-card', { autoAlpha: 0, y: 30, stagger: 0.05 }, '-=0.4')

      gsap.to('.node-core', {
        y: (index) => (index % 2 === 0 ? -6 : 6),
        duration: (index) => 2.2 + index * 0.3,
        ease: 'sine.inOut', repeat: -1, yoyo: true,
      })

      gsap.to('.landing-stat', {
        y: 'random(-4, 4)', duration: 'random(3, 4.5)', ease: 'sine.inOut', repeat: -1, yoyo: true,
      })
    },
    rootRef.value,
  )
})

onUnmounted(() => {
  mediaContext?.revert()
})
</script>

<template>
  <section ref="rootRef" class="landing-home">
    <header class="landing-nav">
      <button type="button" class="landing-brand" @click="$emit('layer-click', { key: 'home' })">
        <span class="landing-brand-mark">C</span>
        <span class="landing-brand-copy">C语言智能学习系统</span>
      </button>

      <nav class="landing-nav-items" aria-label="首页导航">
        <button type="button" class="landing-nav-item active">首页</button>
        <button type="button" class="landing-nav-item" @click="$emit('layer-click', { key: 'diagnosis', title: '学情诊断层' })">学情诊断层</button>
        <button type="button" class="landing-nav-item" @click="$emit('enter-competency')">能力素养层</button>
        <button type="button" class="landing-nav-item" @click="$emit('layer-click', { key: 'knowledge', title: '知识图谱层' })">知识图谱层</button>
        <button type="button" class="landing-nav-item" @click="$emit('layer-click', { key: 'support', title: '资源支持层' })">资源支持层</button>
      </nav>

      <button type="button" class="landing-login-trigger" aria-label="登录" @click="$emit('open-login', 'login')">
        <el-icon><User /></el-icon>
        <span class="trigger-text">进入系统</span>
      </button>
    </header>

    <!-- 严格恢复原始结构 -->
    <section class="landing-hero">
      <HeroScene :collapsed="visualCollapsed" />

      <div class="landing-hero-copy">
        <h1 class="gradient-title">智能驱动的 C 语言学习引擎</h1>
        <p class="sub-title">闭环学情诊断 · 个性化路径推荐 · 密集知识图谱拓扑</p>
      </div>

      <div class="landing-hero-visual" @mouseenter="enterVisualFocus" @mouseleave="leaveVisualFocus" @mousemove="handleHeroMove">
        <div class="landing-model-shell">
          <div class="landing-model-copy">
            <div class="pulse-ring"></div>
            <strong>内核中枢</strong>
          </div>
          
          <span v-for="(item, index) in layers.slice(0, 4)" :key="item.key" class="landing-orbit-node" :class="`node-pos-${index}`">
            <div class="node-core">
              <div class="node-icon-wrapper"><el-icon><component :is="nodeIcons[index]" /></el-icon></div>
              <span class="node-title">{{ item.title }}</span>
            </div>
          </span>
        </div>
      </div>

      <!-- 还原玻璃圆环指标 -->
      <div class="landing-stats landing-stats-left">
        <article v-for="item in stats.slice(0, 2)" :key="item.label" class="landing-stat">
          <strong class="stat-value">{{ item.value }}</strong>
          <span class="stat-label">{{ item.label }}</span>
        </article>
      </div>

      <div class="landing-stats landing-stats-right">
        <article v-for="item in stats.slice(2)" :key="item.label" class="landing-stat">
          <strong class="stat-value">{{ item.value }}</strong>
          <span class="stat-label">{{ item.label }}</span>
        </article>
      </div>
    </section>

    <!-- 底部卡片网格 -->
    <section class="landing-layer-grid" aria-label="系统能力入口">
      <button v-for="layer in layers" :key="layer.key" type="button" class="landing-layer-card" @mousemove="handleCardMove" @mouseleave="resetCardMove" @click="layer.key === 'competency' ? $emit('enter-competency') : $emit('layer-click', layer)">
        <div class="landing-layer-head">
          <span class="landing-layer-icon"><el-icon><component :is="layer.icon" /></el-icon></span>
          <span class="landing-layer-state" :class="getStatusClass(layer.status)">{{ layer.status }}</span>
        </div>
        <strong class="card-title">{{ layer.title }}</strong>
        <p class="card-desc">{{ layer.desc }}</p>
      </button>
    </section>

    <section class="landing-capability-section" aria-label="系统能力概览">
      <div class="landing-capability-head">
        <h2>全链路协同演进特性</h2>
      </div>
      <div class="landing-capability-grid">
        <article v-for="item in capabilities" :key="item.title" class="landing-capability-card">
          <strong>{{ item.title }}</strong>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.landing-home {
  background-color: #030712;
  color: #f3f4f6;
  font-family: Inter, system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  padding-bottom: 80px;
}

/* 导航 */
.landing-nav {
  align-items: center; background: rgba(3, 7, 18, 0.6); border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px); display: flex; height: 70px; justify-content: space-between;
  padding: 0 40px; position: fixed; top: 0; left: 0; right: 0; z-index: 100;
}
.landing-brand { align-items: center; background: none; border: none; cursor: pointer; display: flex; gap: 10px; }
.landing-brand-mark { background: linear-gradient(135deg, #6366f1, #3b82f6); border-radius: 8px; color: #fff; font-weight: 800; padding: 4px 10px; }
.landing-brand-copy { color: #fff; font-size: 16px; font-weight: 600; }
.landing-nav-items { display: flex; gap: 32px; }
.landing-nav-item { background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 14px; font-weight: 500; transition: color 0.2s; position: relative;}
.landing-nav-item:hover, .landing-nav-item.active { color: #fff; }
.landing-login-trigger {
  align-items: center; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px; color: #fff; cursor: pointer; display: flex; gap: 6px; font-size: 13px; font-weight: 500; padding: 6px 16px; transition: all 0.2s;
}
.landing-login-trigger:hover { background: #fff; color: #000; }

@media (max-width: 900px) {
  .landing-nav-items, .trigger-text { display: none; }
  .landing-nav { padding: 0 20px; }
}

/* Hero 结构恢复 */
.landing-hero {
  align-items: center; display: flex; flex-direction: column; justify-content: center;
  min-height: 85vh; padding-top: 100px; position: relative; width: 100%;
}
.landing-hero-copy { text-align: center; z-index: 10; margin-bottom: 30px; padding: 0 20px; }
.gradient-title {
  background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  font-size: clamp(28px, 4vw, 44px); font-weight: 800; margin-bottom: 12px;
}
.sub-title { color: #6b7280; font-size: clamp(13px, 2vw, 16px); letter-spacing: 2px; }

/* 交互区（星环 + 节点） */
.landing-hero-visual {
  cursor: grab; height: 500px; position: relative; width: 100%; max-width: 900px; z-index: 20;
}
.landing-model-shell { height: 100%; position: relative; width: 100%; }

/* 中枢胶囊化 */
.landing-model-copy {
  background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(99, 102, 241, 0.5);
  border-radius: 30px; box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
  color: #fff; display: flex; align-items: center; justify-content: center;
  padding: 12px 28px; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, calc(-50% + 40px)); backdrop-filter: blur(12px); z-index: 30; font-size: 16px; letter-spacing: 2px;
}
.pulse-ring {
  border: 1px solid rgba(99, 102, 241, 0.5); border-radius: 30px;
  position: absolute; top: -5px; bottom: -5px; left: -5px; right: -5px;
  animation: pulse 2.5s infinite ease-out;
}
@keyframes pulse { 0% { transform: scale(0.95); opacity: 1; } 100% { transform: scale(1.15); opacity: 0; } }

/* 节点排布策略：绝对居中 + margin 偏移。完美避免与 GSAP translate 冲突！ */
.landing-orbit-node { position: absolute; top: 50%; left: 50%; z-index: 25; }

/* 桌面端坐标偏移 */
.node-pos-0 { margin-top: -120px; margin-left: -320px; }
.node-pos-1 { margin-top: -140px; margin-left: 180px; }
.node-pos-2 { margin-top: 100px; margin-left: -260px; }
.node-pos-3 { margin-top: 80px; margin-left: 200px; }

/* 平板端自动收缩 */
@media (max-width: 1024px) {
  .node-pos-0 { margin-top: -100px; margin-left: -240px; }
  .node-pos-1 { margin-top: -120px; margin-left: 140px; }
  .node-pos-2 { margin-top: 80px; margin-left: -200px; }
  .node-pos-3 { margin-top: 60px; margin-left: 160px; }
}

.node-core {
  align-items: center; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px); border-radius: 24px; display: flex; gap: 10px; padding: 6px 14px; white-space: nowrap;
}
.node-icon-wrapper { background: rgba(99, 102, 241, 0.15); border-radius: 50%; color: #818cf8; display: flex; padding: 6px; }
.node-title { color: #e5e7eb; font-size: 13px; font-weight: 500; }

/* 还原精美的侧边圆形数据指标 */
.landing-stats {
  display: flex; flex-direction: column; gap: 40px; position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
}
.landing-stats-left { left: 8%; }
.landing-stats-right { right: 8%; }

.landing-stat {
  width: 90px; height: 90px; border-radius: 50%;
  background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.stat-value { color: #fff; font-size: 24px; font-weight: 700; font-family: monospace; }
.stat-label { color: #9ca3af; font-size: 11px; margin-top: 2px;}

/* 小屏幕时数据指标自动沉降排布 */
@media (max-width: 1200px) {
  .landing-hero { padding-bottom: 60px; }
  .landing-stats { position: relative; top: 0; left: 0; right: 0; transform: none; flex-direction: row; justify-content: center; gap: 20px; margin-top: 40px; }
}

/* 底部精细控制的强制网格（拒绝 auto-fit 导致错版） */
.landing-layer-grid {
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 30px; /* 卡片间距变大 */
  margin: 100px auto 0; /* 重点：增加了 margin-top 往下挪，拉开与星球的距离 */
  max-width: 1400px; /* 重点：最大宽度从 1200 放宽到 1400，整体变大 */
  padding: 0 40px;
}

.landing-capability-grid {
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 30px;
  margin: 0 auto; 
  max-width: 1400px; 
  padding: 0 40px;
}

@media (max-width: 1024px) {
  .landing-layer-grid, .landing-capability-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .landing-layer-grid, .landing-capability-grid { grid-template-columns: 1fr; padding: 0 20px; }
}

/* 核心能力卡片样式放大 */
.landing-layer-card {
  background: rgba(255, 255, 255, 0.02); 
  border: 1px solid rgba(255, 255, 255, 0.06); 
  border-radius: 20px; /* 圆角变大更柔和 */
  cursor: pointer; 
  display: flex; 
  flex-direction: column; 
  padding: 36px 32px; /* 重点：内边距明显增大，撑起卡片体积 */
  text-align: left; 
  transition: border-color 0.3s;
}
.landing-layer-card:hover { border-color: rgba(99, 102, 241, 0.4); }
.landing-layer-head { display: flex; justify-content: space-between; margin-bottom: 24px; align-items: center; }

/* 图标与状态标签放大 */
.landing-layer-icon { color: #9ca3af; font-size: 28px; } /* 图标变大 */
.landing-layer-card:hover .landing-layer-icon { color: #818cf8; }
.landing-layer-state { border-radius: 6px; font-size: 12px; font-weight: 600; padding: 4px 10px; }

.status-core { background: rgba(239, 68, 68, 0.1); color: #f87171; }
.status-success { background: rgba(16, 185, 129, 0.1); color: #34d399; }
.status-warning { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
.status-evolving { background: rgba(107, 114, 128, 0.1); color: #9ca3af; }

/* 文字整体字号提升 */
.card-title { color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 12px; } /* 标题变大 */
.card-desc { color: #9ca3af; font-size: 15px; line-height: 1.6; } /* 描述变大 */

/* 底部特性能力区放大 */
.landing-capability-section { margin-top: 120px; text-align: center; } /* 进一步往下挪 */
.landing-capability-head h2 { color: #fff; font-size: 28px; font-weight: 700; margin-bottom: 50px; } /* 模块标题变大 */

.landing-capability-card { 
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%); 
  border-top: 1px solid rgba(255,255,255,0.08); 
  padding: 32px 24px; /* 内边距增大 */
  text-align: left; 
  border-radius: 12px;
}
.landing-capability-card strong { color: #e5e7eb; display: block; font-size: 18px; margin-bottom: 12px; } /* 特性标题变大 */
.landing-capability-card p { color: #6b7280; font-size: 14px; line-height: 1.7; } /* 特性描述变大 */
</style>