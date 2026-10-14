/// <reference types="vite/client" />
/// <reference types="unocss/client" />

/**
 * 允许 TS 代码导入不带 <script lang="ts"> 的 SFC。
 * 从 oademo 移植过来的组件 / 页面仍是 JS 版（后续可逐步补类型），
 * 没有这条声明，vue-tsc 会以 TS7016 报“隐式 any”。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
  /** 'true' 时才要求登录；缺省/其它值 = 免登录直进首页 */
  readonly VITE_REQUIRE_LOGIN?: string
  /** 免登录模式下静默换成 token 的账号 */
  readonly VITE_AUTO_LOGIN_USERNAME?: string
  readonly VITE_AUTO_LOGIN_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
