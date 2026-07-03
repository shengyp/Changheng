<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  CollectionTag,
  DataAnalysis,
  DocumentChecked,
  Files,
  Management,
  Reading,
  UserFilled,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const shortcuts = computed(() => {
  const all = [
    { title: '我的作业', desc: '查看并开始作答', path: '/assignments/my', roles: ['STUDENT'], icon: DocumentChecked, group: '学生学习' },
    { title: '题库练习', desc: '从题库选题并开始练习', path: '/question-bank', roles: ['STUDENT'], icon: Reading, group: '学生学习' },
    { title: '我的班级', desc: '输入班级码加入班级', path: '/classes/my', roles: ['STUDENT'], icon: UserFilled, group: '学生学习' },
    { title: '作答记录', desc: '查看练习和作业结果', path: '/attempts/history', roles: ['STUDENT'], icon: Files, group: '学习反馈' },
    { title: '学习统计', desc: '错题、掌握度、能力值', path: '/stats', roles: ['STUDENT'], icon: DataAnalysis, group: '学习反馈' },
    { title: '个性化练习', desc: '根据薄弱知识点生成练习', path: '/personalized-practice', roles: ['STUDENT'], icon: CollectionTag, group: '智能学习' },
    { title: '学习路径', desc: '按画像生成可导出的学习安排', path: '/learning-path', roles: ['STUDENT'], icon: CollectionTag, group: '智能学习' },
    { title: '我的申诉', desc: '提交成绩申诉', path: '/appeals/my', roles: ['STUDENT'], icon: Management, group: '学习反馈' },

    { title: '题目管理', desc: '题目检索与编辑', path: '/questions', roles: ['TEACHER', 'ADMIN'], icon: Reading, group: '教师教学' },
    { title: '试卷管理', desc: '组卷与快照', path: '/papers', roles: ['TEACHER', 'ADMIN'], icon: Files, group: '教师教学' },
    { title: '作业/考试管理', desc: '发布与截止控制', path: '/assignments/manage', roles: ['TEACHER', 'ADMIN'], icon: DocumentChecked, group: '教师教学' },
    { title: '班级管理', desc: '维护班级并查看学生', path: '/classes/manage', roles: ['TEACHER', 'ADMIN'], icon: UserFilled, group: '教师教学' },
    { title: '阅卷中心', desc: '人工批改与 LLM 自动阅卷', path: '/teacher/review', roles: ['TEACHER', 'ADMIN'], icon: Management, group: '评价反馈' },
    { title: '大模型记录', desc: '查看每次调用证据', path: '/llm/calls', roles: ['TEACHER', 'ADMIN'], icon: DataAnalysis, group: '评价反馈' },

    { title: '标签管理', desc: '树形标签维护', path: '/tags', roles: ['ADMIN'], icon: CollectionTag, group: '系统管理' },
    { title: '用户管理', desc: '管理员维护用户和角色', path: '/admin/users', roles: ['ADMIN'], icon: UserFilled, group: '系统管理' },
    { title: '系统日志', desc: '登录日志', path: '/admin/logs', roles: ['ADMIN'], icon: DataAnalysis, group: '系统管理' },
  ]
  return all.filter((item) => auth.hasAnyRole(item.roles))
})

const roleName = computed(() => {
  if (auth.hasAnyRole(['ADMIN'])) return '管理员'
  if (auth.hasAnyRole(['TEACHER'])) return '教师'
  return '学生'
})

const heroCopy = computed(() => {
  if (auth.hasAnyRole(['TEACHER', 'ADMIN'])) {
    return '从题目、试卷、作业到阶段评价，集中处理教学运营和学习反馈。'
  }
  return '从作业、题库练习到个性化推荐，围绕你的薄弱点安排下一步学习。'
})

const groupedShortcuts = computed(() => {
  const map = new Map()
  shortcuts.value.forEach((item) => {
    const group = item.group || '常用功能'
    if (!map.has(group)) map.set(group, [])
    map.get(group).push(item)
  })
  return Array.from(map.entries()).map(([title, items]) => ({ title, items }))
})
</script>

<template>
  <div class="dashboard-root">
    <section class="workspace-hero" aria-labelledby="dashboard-title">
      <div>
        <p class="eyebrow">{{ roleName }}工作台</p>
        <h1 id="dashboard-title">{{ auth.displayName || '欢迎回来' }}</h1>
        <p>{{ heroCopy }}</p>
      </div>
      <el-button type="primary" :icon="ArrowRight" @click="router.push(shortcuts[0]?.path || '/dashboard')">
        进入常用功能
      </el-button>
    </section>

    <section v-for="group in groupedShortcuts" :key="group.title" class="shortcut-section">
      <div class="section-heading">
        <h2>{{ group.title }}</h2>
        <span>{{ group.items.length }} 项</span>
      </div>
      <div class="shortcut-grid">
        <button v-for="item in group.items" :key="item.path" type="button" class="shortcut-item" @click="router.push(item.path)">
          <span class="shortcut-icon">
            <el-icon><component :is="item.icon" /></el-icon>
          </span>
          <span class="shortcut-copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.desc }}</small>
          </span>
          <el-icon class="shortcut-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard-root {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.workspace-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 156px;
  padding: 26px 28px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background:
    linear-gradient(120deg, rgba(79, 143, 123, 0.12), transparent 52%),
    linear-gradient(90deg, #ffffff, #f7fbf9);
  box-shadow: 0 12px 28px rgba(53, 83, 73, 0.08);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--app-primary-dark);
  font-size: 13px;
  font-weight: 800;
}

.workspace-hero h1 {
  margin: 0;
  font-size: 30px;
  letter-spacing: 0;
}

.workspace-hero p:last-child {
  max-width: 680px;
  margin: 10px 0 0;
  color: var(--app-text-soft);
  line-height: 1.7;
}

.shortcut-section {
  padding: 20px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-heading h2 {
  margin: 0;
  font-size: 20px;
}

.section-heading span {
  color: var(--app-text-soft);
  font-size: 13px;
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.shortcut-item {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  min-height: 86px;
  width: 100%;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
  padding: 14px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.shortcut-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 8px;
  color: var(--app-primary-dark);
  background: var(--app-primary-soft);
}

.shortcut-copy strong,
.shortcut-copy small {
  display: block;
}

.shortcut-copy strong {
  color: var(--app-text);
  font-size: 16px;
}

.shortcut-copy small {
  margin-top: 4px;
  color: var(--app-text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.shortcut-arrow {
  color: var(--app-text-soft);
}

.shortcut-item:hover,
.shortcut-item:focus-visible {
  transform: translateY(-1px);
  background: #f3faf6;
  border-color: var(--app-border-strong);
  outline: none;
}

@media (max-width: 1100px) {
  .workspace-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .workspace-hero,
  .shortcut-section {
    padding: 16px;
  }

  .workspace-hero h1 {
    font-size: 24px;
  }
}
</style>
