import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'remixicon/fonts/remixicon.css'
import 'virtual:uno.css'
import './assets/css/main.css'
import './assets/css/image-tools.css'

// 手动 import 的 EP 反馈组件需要单独引入样式
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
