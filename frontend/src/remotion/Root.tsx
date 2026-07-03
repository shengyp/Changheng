import { type CalculateMetadataFunction, Composition } from 'remotion'
import { PersonalizedLearningVideo, type PersonalizedLearningVideoProps } from './PersonalizedLearningVideo'

const defaultProps: PersonalizedLearningVideoProps = {
  title: '指针与地址知识点讲解课',
  studentName: '演示学生',
  focus: '指针与地址',
  weakPoints: ['指针与地址', '结构体数组', '文件读写'],
  abilityGaps: ['调试定位', '工程实践'],
  scenes: [
    {
      title: '课程导入',
      narration: '这节课我们只讲一个重点：指针与地址。先用一道容易出错的小题引出今天的问题。',
      boardText: '这节课解决：指针与地址',
      durationSeconds: 10,
    },
    {
      title: '概念讲解',
      narration: '先把概念讲清楚：变量有地址，指针变量保存的是另一个变量的地址。',
      boardText: '变量 -> 地址 -> 指针保存地址',
      durationSeconds: 16,
    },
    {
      title: '例题代码',
      narration: '接着看一段完整 C 语言代码。先读题，再跟着每一行代码判断变量和输出。',
      boardText: 'int a = 10; int *p = &a; printf("%d", *p);',
      durationSeconds: 18,
    },
    {
      title: '总结复盘',
      narration: '最后总结这节课：记住核心判断方法，并用两道变式题确认自己真的掌握。',
      boardText: '总结：先找地址，再看指向，最后判断取值',
      durationSeconds: 12,
    },
  ],
}

const fps = 30

const calculateMetadata: CalculateMetadataFunction<PersonalizedLearningVideoProps> = async ({ props }) => {
  const scenes = Array.isArray(props.scenes) ? props.scenes : []
  const sceneSeconds = scenes.reduce((sum, scene) => sum + Math.max(6, Number(scene.durationSeconds || 10)), 0)
  const durationInFrames = Math.ceil((4 + sceneSeconds + 5) * fps)

  return {
    durationInFrames,
    width: 1920,
    height: 1080,
    fps,
    defaultOutName: `${props.studentName || 'student'}-${props.focus || 'personalized-learning-video'}`,
  }
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="PersonalizedLearningVideo"
      component={PersonalizedLearningVideo}
      durationInFrames={2700}
      fps={fps}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  )
}
