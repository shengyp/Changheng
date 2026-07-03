import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { pinia } from '@/stores'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/PublicLandingView.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/knowledge-map',
    name: 'knowledge-map',
    component: () => import('@/views/KnowledgeGraphPage.vue'),
    meta: { public: true, title: '知识图谱' },
  },
  {
    path: '/course-goals',
    name: 'course-goals',
    component: () => import('@/views/CourseGoalsPage.vue'),
    meta: { public: true, title: '课程目标层' },
  },
  {
    path: '/teaching-application',
    name: 'teaching-application',
    component: () => import('@/views/TeachingApplicationPage.vue'),
    meta: { public: true, title: '教学应用层' },
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', redirect: { name: 'login' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { title: '首页' },
      },

      {
        path: 'assignments/my',
        name: 'student-assignments',
        component: () => import('@/views/StudentAssignmentsView.vue'),
        meta: { roles: ['STUDENT'], title: '我的作业' },
      },
      {
        path: 'question-bank',
        name: 'student-question-bank',
        component: () => import('@/views/StudentAssignmentsView.vue'),
        meta: { roles: ['STUDENT'], title: '题库练习' },
      },
      {
        path: 'classes/my',
        name: 'student-classes',
        component: () => import('@/views/StudentClassesView.vue'),
        meta: { roles: ['STUDENT'], title: '我的班级' },
      },
      {
        path: 'attempts/history',
        name: 'attempt-history',
        component: () => import('@/views/AttemptHistoryView.vue'),
        meta: { roles: ['STUDENT'], title: '作答记录' },
      },
      {
        path: 'attempts/:attemptId/work',
        name: 'attempt-work',
        component: () => import('@/views/AttemptWorkView.vue'),
        meta: { roles: ['STUDENT'], title: '作答中' },
      },
      {
        path: 'attempts/:attemptId/result',
        name: 'attempt-result',
        component: () => import('@/views/AttemptResultView.vue'),
        meta: { roles: ['STUDENT'], title: '作答结果' },
      },
      {
        path: 'stats',
        name: 'stats',
        component: () => import('@/views/StatsView.vue'),
        meta: { roles: ['STUDENT'], title: '学习统计' },
      },
      {
        path: 'knowledge-profile',
        name: 'knowledge-profile',
        component: () => import('@/views/KnowledgeProfileView.vue'),
        meta: { roles: ['STUDENT'], title: '学生个性画像' },
      },
      {
        path: 'stage-evaluation',
        name: 'student-stage-evaluation',
        component: () => import('@/views/StudentStageEvaluationView.vue'),
        meta: { roles: ['STUDENT'], title: '阶段评价' },
      },
      {
        path: 'learning-resources',
        name: 'learning-resources',
        component: () => import('@/views/LearningResourcesView.vue'),
        meta: { roles: ['STUDENT', 'TEACHER', 'ADMIN'], title: '学习资源' },
      },
      {
        path: 'smart-recommendations',
        name: 'smart-recommendations',
        component: () => import('@/views/SmartRecommendationsView.vue'),
        meta: { roles: ['STUDENT'], title: '智能推荐' },
      },
      {
        path: 'learning-path',
        name: 'learning-path',
        component: () => import('@/views/LearningPathRecommendationView.vue'),
        meta: { roles: ['STUDENT'], title: '学习路径' },
      },
      {
        path: 'llm/models',
        name: 'student-llm-models',
        component: () => import('@/views/StudentLlmModelView.vue'),
        meta: { roles: ['STUDENT'], title: '大模型中心' },
      },
      {
        path: 'personalized-practice',
        name: 'personalized-practice',
        component: () => import('@/views/PersonalizedPracticeView.vue'),
        meta: { roles: ['STUDENT'], title: '个性化练习' },
      },
      {
        path: 'appeals/my',
        name: 'my-appeals',
        component: () => import('@/views/StudentAppealsView.vue'),
        meta: { roles: ['STUDENT'], title: '我的申诉' },
      },

      {
        path: 'questions',
        name: 'questions',
        component: () => import('@/views/QuestionManageView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '题目管理' },
      },
      {
        path: 'tags',
        name: 'tags',
        component: () => import('@/views/TagManageView.vue'),
        meta: { roles: ['ADMIN'], title: '标签管理' },
      },
      {
        path: 'papers',
        name: 'papers',
        component: () => import('@/views/PaperManageView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '试卷管理' },
      },
      {
        path: 'assignments/manage',
        name: 'manage-assignments',
        component: () => import('@/views/AssignmentManageView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '作业/考试管理' },
      },
      {
        path: 'classes/manage',
        name: 'manage-classes',
        component: () => import('@/views/TeacherClassesView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '班级管理' },
      },
      {
        path: 'teacher/review',
        name: 'teacher-review',
        component: () => import('@/views/TeacherReviewView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '阅卷中心' },
      },
      {
        path: 'knowledge-points',
        name: 'knowledge-points',
        component: () => import('@/views/KnowledgePointManageView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '知识点管理' },
      },
      {
        path: 'teacher/stage-evaluations',
        name: 'teacher-stage-evaluations',
        component: () => import('@/views/TeacherStageEvaluationView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '学生阶段评价' },
      },
      {
        path: 'teacher/agent-resources',
        name: 'teacher-agent-resources',
        component: () => import('@/views/TeacherAgentResourceView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: '智能体资源生成' },
      },
      {
        path: 'knowledge-graph',
        name: 'knowledge-graph',
        component: () => import('@/views/KnowledgeGraphExtractionView.vue'),
        meta: { roles: ['ADMIN'], title: '知识图谱抽取' },
      },
      {
        path: 'admin/llm/models',
        name: 'admin-llm-models',
        component: () => import('@/views/AdminLlmModelView.vue'),
        meta: { roles: ['ADMIN'], title: '大模型管理' },
      },
      {
        path: 'llm/calls',
        name: 'llm-calls',
        component: () => import('@/views/LlmCallsView.vue'),
        meta: { roles: ['TEACHER', 'ADMIN'], title: 'LLM 调用记录' },
      },

      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('@/views/AdminUsersView.vue'),
        meta: { roles: ['ADMIN'], title: '用户管理' },
      },
      {
        path: 'admin/logs',
        name: 'admin-logs',
        component: () => import('@/views/AdminLogsView.vue'),
        meta: { roles: ['ADMIN'], title: '系统日志' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { public: true, title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore(pinia)
  const requiresAuth = !to.meta.public

  if (!requiresAuth) {
    return true
  }

  if (!auth.token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  try {
    await auth.ensureProfile()
  } catch {
    auth.clearSession()
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  const requiredRoles = Array.isArray(to.meta.roles) ? to.meta.roles : []
  if (requiredRoles.length > 0 && !auth.hasAnyRole(requiredRoles)) {
    return { name: 'dashboard' }
  }
  return true
})

router.afterEach((to) => {
  const title = to.meta?.title ? `${to.meta.title} - 智能学习系统` : '智能学习系统'
  document.title = title
})

export default router


