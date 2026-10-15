<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const loading = ref(false)
const mode = ref<'login' | 'register'>('login')

const form = reactive({
  username: '',
  password: '',
  nickname: '',
})

async function submit() {
  if (loading.value) return
  if (!form.username || !form.password) {
    ElMessage.warning(mode.value === 'register' ? '请输入用户名和密码' : '请输入账号和密码')
    return
  }
  loading.value = true
  try {
    if (mode.value === 'register') {
      await auth.register(form.username, form.password, form.nickname)
      ElMessage.success('注册成功')
    } else {
      await auth.login(form.username, form.password)
      ElMessage.success('登录成功')
    }
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  } catch (e) {
    ElMessage.error(friendlyAuthError(e, mode.value === 'register' ? '注册失败' : '登录失败'))
  } finally {
    loading.value = false
  }
}

/** 把网络层错误翻译成可读提示 */
function friendlyAuthError(e: unknown, fallback: string): string {
  if (e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')) {
    return '连接服务器超时，请确认后端服务是否在运行'
  }
  if (e instanceof TypeError) {
    return '无法连接服务器，请检查网络或后端服务状态'
  }
  return e instanceof Error ? e.message : fallback
}

function switchMode(next: 'login' | 'register') {
  mode.value = next
  form.password = ''
}
</script>

<template>
  <div class="chat-login">
    <div class="chat-login__panel">
      <div class="chat-login__brand">极光AI</div>
      <h1>{{ mode === 'login' ? '登录后开始对话' : '注册账号' }}</h1>
      <p>
        {{
          mode === 'login'
            ? '前台用户账号与运营控制台分离；演示账号 demo / 123456。'
            : '用户名 3–32 位字母数字下划线，密码至少 6 位。'
        }}
      </p>
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" size="large" placeholder="如 demo" autocomplete="username" />
        </el-form-item>
        <el-form-item v-if="mode === 'register'" label="昵称（可选）">
          <el-input v-model="form.nickname" size="large" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            size="large"
            placeholder="密码"
            autocomplete="current-password"
          />
        </el-form-item>
        <el-button type="primary" size="large" native-type="submit" :loading="loading" style="width: 100%">
          {{ mode === 'login' ? '进入对话' : '注册并进入' }}
        </el-button>
      </el-form>
      <div class="chat-login__switch">
        <template v-if="mode === 'login'">
          没有账号？
          <button type="button" @click="switchMode('register')">去注册</button>
        </template>
        <template v-else>
          已有账号？
          <button type="button" @click="switchMode('login')">去登录</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-login {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(800px 420px at 20% 0%, rgba(22, 119, 255, 0.12), transparent 55%),
    linear-gradient(180deg, #f7f8fa, #eef1f6);
}

.chat-login__panel {
  width: min(420px, 100%);
  padding: 32px 28px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.chat-login__brand {
  font-size: 13px;
  letter-spacing: 0.16em;
  color: #8c8c8c;
  text-transform: uppercase;
}

.chat-login h1 {
  margin: 12px 0 8px;
  font-size: 28px;
  font-weight: 700;
}

.chat-login p {
  margin-bottom: 24px;
  color: #595959;
  line-height: 1.7;
}

.chat-login__switch {
  margin-top: 18px;
  text-align: center;
  font-size: 14px;
  color: #8c8c8c;
}

.chat-login__switch button {
  border: none;
  background: none;
  color: #1677ff;
  cursor: pointer;
  padding: 0;
  font: inherit;
}
</style>
