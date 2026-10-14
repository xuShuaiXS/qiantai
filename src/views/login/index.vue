<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: '123456',
})

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    await auth.login(form.username, form.password)
    ElMessage.success('登录成功')
    const redirect = (route.query.redirect as string) || '/'
    await router.replace(redirect)
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="chat-login">
    <div class="chat-login__panel">
      <div class="chat-login__brand">极光AI</div>
      <h1>登录后开始对话</h1>
      <p>与控制台共用同一账号，登录后即可调用后台已配置的模型。</p>
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model="form.username" size="large" placeholder="admin" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            size="large"
            placeholder="密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="submit">
          进入对话
        </el-button>
      </el-form>
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
</style>
