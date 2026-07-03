<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false,
  },
})

const canvasRef = ref(null)

let renderer
let scene
let camera
let frameId = 0
let cleanupThree = null
let orbitGroup = null
let particleField = null
let collapseProgress = 0
const pointer = { x: 0, y: 0 }

watch(
  () => props.collapsed,
  (value) => {
    collapseProgress = value ? 1 : 0
  },
)

function handlePointerMove(event) {
  const width = window.innerWidth || 1
  const height = window.innerHeight || 1
  pointer.x = (event.clientX / width - 0.5) * 2
  pointer.y = (event.clientY / height - 0.5) * 2
}

function handleResize() {
  if (!canvasRef.value || !renderer || !camera) return
  const width = canvasRef.value.clientWidth || 1
  const height = canvasRef.value.clientHeight || 1
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height, false)
}

onMounted(async () => {
  if (!canvasRef.value) return

  try {
    const THREE = await import('three')
    if (!canvasRef.value) return

    const width = canvasRef.value.clientWidth || 1
    const height = canvasRef.value.clientHeight || 1
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0.4, 8)

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      canvas: canvasRef.value,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75))
    renderer.setSize(width, height, false)

    const ambientLight = new THREE.AmbientLight('#6ecbff', 1.25)
    const pointLight = new THREE.PointLight('#2ea6ff', 2.1, 30, 2)
    pointLight.position.set(4, 3, 8)
    const rimLight = new THREE.PointLight('#8cf6ff', 1.4, 25, 2)
    rimLight.position.set(-5, -2, 4)
    scene.add(ambientLight, pointLight, rimLight)

    orbitGroup = new THREE.Group()
    scene.add(orbitGroup)

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#7ed7ff',
      transparent: true,
      opacity: 0.36,
      wireframe: true,
    })
    const ringMaterialSoft = new THREE.MeshBasicMaterial({
      color: '#2f8eff',
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    })

    const torusOne = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.06, 16, 120), ringMaterial)
    torusOne.rotation.x = Math.PI * 0.38
    torusOne.rotation.y = Math.PI * 0.12
    orbitGroup.add(torusOne)

    const torusTwo = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.05, 16, 100), ringMaterialSoft)
    torusTwo.rotation.x = Math.PI * 0.68
    torusTwo.rotation.z = Math.PI * 0.18
    orbitGroup.add(torusTwo)

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.82, 1),
      new THREE.MeshStandardMaterial({
        color: '#8ad8ff',
        emissive: '#1f8fff',
        emissiveIntensity: 0.8,
        metalness: 0.38,
        roughness: 0.28,
        transparent: true,
        opacity: 0.92,
      }),
    )
    orbitGroup.add(core)

    const particleCount = isMobile ? 220 : 520
    const positionArray = new Float32Array(particleCount * 3)
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 4.2 + Math.random() * 4.8
      const angle = Math.random() * Math.PI * 2
      const heightOffset = (Math.random() - 0.5) * 5.8
      positionArray[index * 3] = Math.cos(angle) * radius
      positionArray[index * 3 + 1] = heightOffset
      positionArray[index * 3 + 2] = Math.sin(angle) * radius
    }

    const particlesGeometry = new THREE.BufferGeometry()
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))
    const particlesMaterial = new THREE.PointsMaterial({
      color: '#9fe8ff',
      size: isMobile ? 0.03 : 0.04,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    particleField = new THREE.Points(particlesGeometry, particlesMaterial)
    scene.add(particleField)

    const clock = new THREE.Clock()

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime()
      const motionFactor = reduceMotion ? 0.2 : 1

      orbitGroup.rotation.y = elapsed * 0.18 * motionFactor
      orbitGroup.rotation.x = elapsed * 0.05 * motionFactor
      orbitGroup.position.x += (pointer.x * 0.35 - orbitGroup.position.x) * 0.04
      orbitGroup.position.y += (-pointer.y * 0.28 - orbitGroup.position.y) * 0.04
      const targetScale = 1 - collapseProgress * 0.14
      orbitGroup.scale.x += (targetScale - orbitGroup.scale.x) * 0.08
      orbitGroup.scale.y += (targetScale - orbitGroup.scale.y) * 0.08
      orbitGroup.scale.z += (targetScale - orbitGroup.scale.z) * 0.08
      orbitGroup.position.z += ((collapseProgress ? -0.35 : 0) - orbitGroup.position.z) * 0.08

      torusOne.rotation.z += 0.0022 * motionFactor
      torusTwo.rotation.x += 0.0028 * motionFactor
      core.rotation.x += 0.0034 * motionFactor
      core.rotation.y += 0.0052 * motionFactor
      core.scale.setScalar(1 - collapseProgress * 0.08)

      if (particleField) {
        particleField.rotation.y = elapsed * 0.035 * motionFactor
        particleField.rotation.x = Math.sin(elapsed * 0.12) * 0.06 * motionFactor
        const particleScale = 1 - collapseProgress * 0.08
        particleField.scale.setScalar(particleScale)
      }

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(renderFrame)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('pointermove', handlePointerMove)
    renderFrame()

    cleanupThree = () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.cancelAnimationFrame(frameId)
      scene?.traverse((item) => {
        if (item.geometry) item.geometry.dispose?.()
        if (item.material) {
          if (Array.isArray(item.material)) {
            item.material.forEach((entry) => entry.dispose?.())
          } else {
            item.material.dispose?.()
          }
        }
      })
      renderer?.dispose?.()
      scene = null
      camera = null
      renderer = null
      orbitGroup = null
      particleField = null
    }
  } catch (error) {
    console.warn('HeroScene init failed:', error)
  }
})

onUnmounted(() => {
  cleanupThree?.()
})
</script>

<template>
  <canvas ref="canvasRef" class="landing-hero-scene" aria-hidden="true" />
</template>
