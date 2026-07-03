<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  mode: {
    type: String,
    default: 'login',
  },
})

const emit = defineEmits(['update:visible', 'update:mode', 'success'])

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(false)
const roleOptions = [
  { value: 'ADMIN', label: '管理员' },
  { value: 'STUDENT', label: '学生' },
  { value: 'TEACHER', label: '教师' },
]

const loginForm = reactive({
  role: 'STUDENT',
  username: '',
  password: '',
})

const registerForm = reactive({
  username: '',
  password: '',
  displayName: '',
  email: '',
  role: 'STUDENT',
})

const currentMode = ref(props.mode)

watch(
  () => props.mode,
  (value) => {
    currentMode.value = value || 'login'
  },
)

watch(currentMode, (value) => {
  emit('update:mode', value)
})

function closeDialog() {
  if (loading.value) return
  emit('update:visible', false)
}

function afterAuth() {
  emit('update:visible', false)
  emit('success')
  const redirect = route.query.redirect
  router.replace(typeof redirect === 'string' ? redirect : '/dashboard')
}

async function handleLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    await auth.login({ ...loginForm })
    ElMessage.success('登录成功')
    afterAuth()
  } catch (error) {
    ElMessage.error(error?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerForm.username || !registerForm.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    await auth.register({ ...registerForm })
    ElMessage.success('注册成功')
    afterAuth()
  } catch (error) {
    ElMessage.error(error?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="landing-auth-overlay" @click.self="closeDialog">
    <section class="landing-auth-dialog" aria-labelledby="landing-auth-title">
      <div class="landing-auth-header">
        <div>
          <p class="landing-auth-kicker">Access Portal</p>
          <h3 id="landing-auth-title">{{ currentMode === 'login' ? '登录系统' : '注册账号' }}</h3>
        </div>
        <button type="button" class="landing-auth-close" aria-label="关闭" @click="closeDialog">×</button>
      </div>

      <el-radio-group v-model="currentMode" class="landing-auth-switch">
        <el-radio-button label="login">登录</el-radio-button>
        <el-radio-button label="register">注册</el-radio-button>
      </el-radio-group>

      <el-form v-if="currentMode === 'login'" :model="loginForm" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="身份">
          <el-select v-model="loginForm.role" class="landing-auth-input">
            <el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model.trim="loginForm.username" autocomplete="username" placeholder="请输入用户名">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="loginForm.password"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-button type="primary" class="landing-auth-submit" :loading="loading" @click="handleLogin">登录</el-button>
      </el-form>

      <el-form v-else :model="registerForm" label-position="top" @submit.prevent="handleRegister">
        <el-form-item label="身份">
          <el-select v-model="registerForm.role" class="landing-auth-input">
            <el-option v-for="role in roleOptions" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model.trim="registerForm.username" autocomplete="username" placeholder="用于登录的账号" />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model.trim="registerForm.displayName" autocomplete="name" placeholder="例如：张三" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model.trim="registerForm.email" autocomplete="email" placeholder="可选" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="registerForm.password"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="请设置密码"
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <el-button type="primary" class="landing-auth-submit" :loading="loading" @click="handleRegister">创建账号并进入</el-button>
      </el-form>
    </section>
  </div>
</template>
