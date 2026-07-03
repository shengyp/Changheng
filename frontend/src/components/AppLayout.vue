<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Calendar,
  CollectionTag,
  Connection,
  Cpu,
  DataLine,
  Document,
  EditPen,
  Histogram,
  House,
  Management,
  Notebook,
  Reading,
  SwitchButton,
  UserFilled,
  Warning,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useStudentAssistantStore } from '@/stores/studentAssistant'
import StudentAssistantPet from '@/components/StudentAssistantPet.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const assistant = useStudentAssistantStore()

const menuGroups = computed(() => {
  const groups = [
    {
      key: 'student',
      title: '学生学习',
      icon: Reading,
      children: [
        { path: '/assignments/my', title: '我的作业', roles: ['STUDENT'] },
        { path: '/question-bank', title: '题库练习', roles: ['STUDENT'] },
        { path: '/attempts/history', title: '作答记录', roles: ['STUDENT'] },
        { path: '/stats', title: '学习统计', roles: ['STUDENT'] },
        { path: '/knowledge-profile', title: '学生个性画像', roles: ['STUDENT'] },
        { path: '/stage-evaluation', title: '阶段评价', roles: ['STUDENT'] },
        { path: '/smart-recommendations', title: '智能推荐', roles: ['STUDENT'] },
        { path: '/learning-path', title: '学习路径', roles: ['STUDENT'] },
        { path: '/personalized-practice', title: '个性化练习', roles: ['STUDENT'] },
        { path: '/llm/models', title: '大模型中心', roles: ['STUDENT'] },
        { path: '/classes/my', title: '我的班级', roles: ['STUDENT'] },
        { path: '/appeals/my', title: '我的申诉', roles: ['STUDENT'] },
      ],
    },
    {
      key: 'resources',
      title: '学习资源',
      icon: Document,
      children: [
        { path: '/learning-resources', title: '资源库', roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
      ],
    },
    {
      key: 'teaching',
      title: '教师教学',
      icon: Management,
      children: [
        { path: '/questions', title: '题目管理', roles: ['TEACHER', 'ADMIN'] },
        { path: '/papers', title: '试卷管理', roles: ['TEACHER', 'ADMIN'] },
        { path: '/assignments/manage', title: '作业/考试管理', roles: ['TEACHER', 'ADMIN'] },
        { path: '/classes/manage', title: '班级管理', roles: ['TEACHER', 'ADMIN'] },
        { path: '/teacher/review', title: '阅卷中心', roles: ['TEACHER', 'ADMIN'] },
      ],
    },
    {
      key: 'evaluation',
      title: '评价与智能体',
      icon: Connection,
      children: [
        { path: '/knowledge-points', title: '知识点管理', roles: ['TEACHER', 'ADMIN'] },
        { path: '/teacher/stage-evaluations', title: '学生阶段评价', roles: ['TEACHER', 'ADMIN'] },
        { path: '/teacher/agent-resources', title: '智能体资源生成', roles: ['TEACHER', 'ADMIN'] },
        { path: '/llm/calls', title: '大模型调用记录', roles: ['TEACHER', 'ADMIN'] },
      ],
    },
    {
      key: 'system',
      title: '系统管理',
      icon: CollectionTag,
      children: [
        { path: '/tags', title: '标签管理', roles: ['ADMIN'] },
        { path: '/knowledge-graph', title: '知识图谱抽取', roles: ['ADMIN'] },
        { path: '/admin/llm/models', title: '大模型管理', roles: ['ADMIN'] },
        { path: '/admin/users', title: '用户管理', roles: ['ADMIN'] },
        { path: '/admin/logs', title: '系统日志', roles: ['ADMIN'] },
      ],
    },
  ]

  return groups
    .map((group) => ({
      ...group,
      children: group.children.filter((item) => !item.roles || auth.hasAnyRole(item.roles)),
    }))
    .filter((group) => group.children.length > 0)
})

const flatMenus = computed(() => [
  { path: '/dashboard', title: '首页' },
  ...menuGroups.value.flatMap((group) => group.children),
])

const openGroups = computed(() => menuGroups.value.map((group) => group.key))

const activeMenu = computed(() => {
  const m = [...flatMenus.value].sort((a, b) => b.path.length - a.path.length).find((item) => route.path.startsWith(item.path))
  return m?.path || '/dashboard'
})

const roleDisplay = computed(() => roleText(auth.role))
const isStudent = computed(() => auth.role === 'STUDENT')
const isLearningPathReport = computed(() => route.name === 'learning-path' && route.query.report === '1')

watch(
  () => route.fullPath,
  () => {
    if (!isStudent.value) return
    assistant.resetToRouteContext({
      routeName: route.name || '',
      pageTitle: route.meta?.title || '学生端页面',
      path: route.fullPath,
      aiLocked: false,
      lockedReason: '',
    })
  },
  { immediate: true },
)

function roleTagType(role) {
  const normalized = String(role || '').replace(/^ROLE_/, '').toUpperCase()
  if (normalized === 'ADMIN') return 'danger'
  if (normalized === 'TEACHER') return 'warning'
  return 'success'
}

function roleText(role) {
  const normalized = String(role || '').replace(/^ROLE_/, '').toUpperCase()
  if (normalized === 'ADMIN') return '管理员'
  if (normalized === 'TEACHER') return '教师'
  if (normalized === 'STUDENT') return '学生'
  return '未知角色'
}

async function handleLogout() {
  await auth.logout()
  router.replace('/login')
}
</script>

<template>
  <div v-if="isLearningPathReport" class="report-layout">
    <RouterView />
  </div>
  <el-container v-else class="layout-root">
    <el-aside width="240px" class="layout-aside">
      <div class="brand">
        <div class="brand-mark">题库</div>
        <div class="brand-text">
          <div>智能学习题库系统</div>
          <small>题库 + 学生个性画像</small>
        </div>
      </div>
      <div class="module-pill">
        <span>{{ roleDisplay }}工作台</span>
        <el-icon><Connection /></el-icon>
      </div>
      <el-menu
        :default-active="activeMenu"
        :default-openeds="openGroups"
        class="layout-menu"
        router
      >
        <el-menu-item index="/dashboard" class="home-menu-item">
          <el-icon><House /></el-icon>
          <span>首页概览</span>
        </el-menu-item>
        <el-sub-menu v-for="group in menuGroups" :key="group.key" :index="group.key">
          <template #title>
            <el-icon><component :is="group.icon" /></el-icon>
            <span>{{ group.title }}</span>
          </template>
          <el-menu-item v-for="item in group.children" :key="item.path" :index="item.path">
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <h2>{{ route.meta?.title || '题库系统' }}</h2>
          <p>{{ roleDisplay }}</p>
        </div>
        <div class="header-right">
          <el-tag :type="roleTagType(auth.role)" effect="dark" round>{{ roleText(auth.role) }}</el-tag>
          <span class="welcome">{{ auth.displayName }}</span>
          <el-button type="danger" plain :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="layout-main">
        <RouterView />
      </el-main>
    </el-container>
    <StudentAssistantPet v-if="isStudent" />
  </el-container>
</template>

<style scoped>
.report-layout {
  min-height: 100vh;
  background: #eef4f1;
}

.layout-root {
  min-height: 100vh;
  background: var(--app-bg);
}

.layout-aside {
  border-right: 1px solid var(--app-border);
  background: #ffffff;
  backdrop-filter: blur(10px);
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

.layout-aside::after {
  content: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px 12px;
  position: relative;
  z-index: 1;
}

.brand::after {
  content: '';
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--app-border), transparent);
}

.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.16), transparent 48%),
    var(--app-primary);
  color: #fff;
  display: grid;
  place-content: center;
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(79, 143, 123, 0.22);
}

.brand-text {
  font-weight: 700;
  color: var(--app-text);
}

.brand-text small {
  display: block;
  color: var(--app-text-soft);
  font-weight: 500;
  font-size: 12px;
}

.module-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  margin: 4px 14px 14px;
  padding: 0 18px;
  border-radius: 24px;
  color: #039c7f;
  font-weight: 800;
  background: #ddf4ef;
}

.module-pill .el-icon {
  font-size: 16px;
}

.layout-menu {
  border-right: none;
  background: transparent;
  padding: 2px 0 22px;
  position: relative;
  z-index: 1;
}

.layout-menu :deep(.el-menu-item),
.layout-menu :deep(.el-sub-menu__title) {
  height: 58px;
  padding: 0 24px !important;
  color: #17252f;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0;
  background: transparent;
}

.layout-menu :deep(.el-sub-menu__title .el-icon),
.layout-menu :deep(.home-menu-item .el-icon) {
  margin-right: 10px;
  color: var(--app-primary-dark);
  font-size: 18px;
}

.layout-menu :deep(.el-sub-menu__title:hover),
.layout-menu :deep(.home-menu-item:hover) {
  color: #039c7f;
  background: #f4faf8;
}

.layout-menu :deep(.el-sub-menu .el-menu) {
  background: transparent;
}

.layout-menu :deep(.el-sub-menu .el-menu-item) {
  height: 52px;
  padding: 0 20px 0 52px !important;
  color: #8b9895;
  font-size: 16px;
  font-weight: 600;
  background: transparent;
}

.layout-menu :deep(.el-sub-menu .el-menu-item:hover) {
  color: #039c7f;
  background: #f5fbf9;
}

.layout-menu :deep(.el-sub-menu .el-menu-item.is-active) {
  color: #039c7f;
  background: #eef8f5;
  font-weight: 800;
  box-shadow: inset 6px 0 0 #10b98f;
}

.layout-menu :deep(.home-menu-item.is-active) {
  color: #039c7f;
  background: #eef8f5;
  box-shadow: inset 6px 0 0 #10b98f;
}

.layout-menu :deep(.el-sub-menu__icon-arrow) {
  right: 22px;
  color: #8b9895;
  font-size: 14px;
}

.layout-header {
  min-height: 74px;
  background:
    linear-gradient(90deg, rgba(79, 143, 123, 0.08), transparent 38%, rgba(215, 185, 140, 0.09)),
    rgba(255, 255, 255, 0.9);
  color: var(--app-text);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  gap: 16px;
  border-bottom: 1px solid var(--app-border);
  backdrop-filter: blur(10px);
  position: sticky;
  top: 0;
  z-index: 3;
}

.layout-header::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--app-primary), var(--app-accent), var(--app-warm));
  opacity: 0.76;
}

.header-left h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.2;
}

.header-left p {
  margin: 4px 0 0;
  color: var(--app-text-soft);
  font-size: 13px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.welcome {
  font-size: 14px;
  padding: 0 4px;
  color: #465b54;
}

.layout-main {
  background:
    linear-gradient(120deg, rgba(79, 143, 123, 0.07), transparent 34%),
    linear-gradient(180deg, rgba(233, 243, 239, 0.55), rgba(250, 252, 251, 0.85) 240px),
    var(--app-bg);
  padding: 18px;
}

@media (max-width: 900px) {
  .layout-root {
    display: block;
  }

  .layout-aside {
    width: 100% !important;
    border-right: none;
    border-bottom: 1px solid var(--app-border);
    max-height: 48vh;
  }

  .layout-menu {
    padding-bottom: 12px;
  }

  .layout-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    flex-wrap: wrap;
  }
}
</style>

