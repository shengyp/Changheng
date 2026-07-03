import React from 'react'
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

export type VideoScene = {
  title: string
  narration?: string
  visualPrompt?: string
  boardText?: string
  durationSeconds?: number
}

export type PersonalizedLearningVideoProps = {
  title: string
  studentName?: string
  focus?: string
  weakPoints?: string[]
  abilityGaps?: string[]
  scenes: VideoScene[]
}

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
}

function sceneDuration(scene: VideoScene, fps: number) {
  return Math.max(6, Number(scene.durationSeconds || 10)) * fps
}

function sceneStartFrames(scenes: VideoScene[], fps: number) {
  let cursor = 0
  return scenes.map((scene) => {
    const start = cursor
    cursor += sceneDuration(scene, fps)
    return start
  })
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: '14px 22px',
        border: '1px solid rgba(103, 232, 249, 0.35)',
        borderRadius: 999,
        background: 'rgba(8, 47, 73, 0.42)',
        color: '#cffafe',
        fontSize: 30,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  )
}

function Background() {
  const frame = useCurrentFrame()
  const drift = interpolate(frame, [0, 240], [0, 48], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(circle at 24% 24%, rgba(34, 211, 238, 0.24), transparent 30%), radial-gradient(circle at 80% 18%, rgba(167, 139, 250, 0.22), transparent 28%), linear-gradient(135deg, #020617 0%, #082f49 48%, #020617 100%)',
      }}
    >
      <AbsoluteFill
        style={{
          opacity: 0.36,
          backgroundImage:
            'linear-gradient(rgba(125, 211, 252, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 0.14) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          backgroundPosition: `${drift}px ${drift}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 90,
          border: '1px solid rgba(125, 211, 252, 0.18)',
          borderRadius: 42,
          boxShadow: 'inset 0 0 120px rgba(34, 211, 238, 0.08), 0 0 80px rgba(34, 211, 238, 0.08)',
        }}
      />
    </AbsoluteFill>
  )
}

function IntroScene({ props }: { props: PersonalizedLearningVideoProps }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 24], [0, 1], clamp)
  const y = interpolate(frame, [0, 42], [40, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 120, opacity, translate: `0 ${y}px` }}>
      <div style={{ color: '#67e8f9', fontSize: 34, fontWeight: 900, letterSpacing: 8, marginBottom: 34 }}>
        C LANGUAGE EXPLAINER VIDEO
      </div>
      <div style={{ color: 'white', fontSize: 92, fontWeight: 950, textAlign: 'center', lineHeight: 1.1, maxWidth: 1320 }}>
        {props.title}
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 44, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Badge>{props.studentName || '学生'}</Badge>
        <Badge>本节主题：{props.focus || props.weakPoints?.[0] || '薄弱知识点'}</Badge>
      </div>
    </AbsoluteFill>
  )
}

function LearningScene({ scene, index }: { scene: VideoScene; index: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const appear = interpolate(frame, [0, fps], [0, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const cardY = interpolate(frame, [0, fps], [44, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const progress = interpolate(frame, [0, Math.max(1, Number(scene.durationSeconds || 10) * fps - 12)], [0, 100], clamp)

  return (
    <AbsoluteFill style={{ padding: '120px 150px', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 58, alignItems: 'center', opacity: appear }}>
        <div style={{ color: '#e0f2fe' }}>
          <div style={{ color: '#67e8f9', fontSize: 34, fontWeight: 900, letterSpacing: 6, marginBottom: 28 }}>
            SCENE {String(index + 1).padStart(2, '0')}
          </div>
          <div style={{ color: 'white', fontSize: 78, fontWeight: 950, lineHeight: 1.06 }}>
            {scene.title}
          </div>
          <div style={{ marginTop: 34, color: '#cbd5e1', fontSize: 42, lineHeight: 1.45 }}>
            {scene.narration}
          </div>
        </div>

        <div
          style={{
            minHeight: 520,
            padding: 54,
            border: '1px solid rgba(103, 232, 249, 0.24)',
            borderRadius: 36,
            background: 'rgba(2, 6, 23, 0.58)',
            boxShadow: '0 32px 120px rgba(0, 0, 0, 0.32), inset 0 0 80px rgba(34, 211, 238, 0.08)',
            translate: `0 ${cardY}px`,
            display: 'grid',
            alignContent: 'center',
            gap: 30,
          }}
        >
          <div style={{ color: '#a5f3fc', fontSize: 34, fontWeight: 900 }}>讲解板书</div>
          <div style={{ color: 'white', fontSize: 58, fontWeight: 900, lineHeight: 1.18 }}>
            {scene.boardText || scene.visualPrompt || scene.title}
          </div>
          {scene.visualPrompt ? (
            <div style={{ color: '#94a3b8', fontSize: 30, lineHeight: 1.5 }}>
              {scene.visualPrompt}
            </div>
          ) : null}
          <div style={{ height: 12, borderRadius: 999, background: 'rgba(255, 255, 255, 0.12)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #22d3ee, #a78bfa, #fb923c)',
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function OutroScene({ props }: { props: PersonalizedLearningVideoProps }) {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, 24], [0, 1], clamp)

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', padding: 130, opacity }}>
      <div style={{ color: '#67e8f9', fontSize: 34, fontWeight: 900, letterSpacing: 6, marginBottom: 34 }}>
        NEXT PRACTICE
      </div>
      <div style={{ color: 'white', fontSize: 82, fontWeight: 950, textAlign: 'center', lineHeight: 1.12 }}>
        完成同类变式练习，确认这个知识点真正掌握
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 44, flexWrap: 'wrap', justifyContent: 'center' }}>
        {(props.weakPoints || []).slice(0, 3).map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
    </AbsoluteFill>
  )
}

export const PersonalizedLearningVideo = (props: PersonalizedLearningVideoProps) => {
  const { fps } = useVideoConfig()
  const scenes = props.scenes?.length ? props.scenes : []
  const starts = sceneStartFrames(scenes, fps)
  const introDuration = 4 * fps
  const contentStart = introDuration
  const contentDuration = scenes.reduce((sum, scene) => sum + sceneDuration(scene, fps), 0)

  return (
    <AbsoluteFill>
      <Background />
      <Sequence durationInFrames={introDuration}>
        <IntroScene props={props} />
      </Sequence>
      {scenes.map((scene, index) => (
        <Sequence key={`${scene.title}-${index}`} from={contentStart + starts[index]} durationInFrames={sceneDuration(scene, fps)}>
          <LearningScene scene={scene} index={index} />
        </Sequence>
      ))}
      <Sequence from={contentStart + contentDuration} durationInFrames={5 * fps}>
        <OutroScene props={props} />
      </Sequence>
    </AbsoluteFill>
  )
}
