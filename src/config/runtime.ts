/**
 * 运行时开关：登录策略
 *
 * 说明
 * ----
 * 本前台默认走「免登录」模式：打开站点直接进入首页，不再拦截到 /login。
 * 因为页面里的接口（模型列表、会话、生图等）仍需带着 token 调后端，
 * 所以免登录模式下会在启动时用下面这组默认账号静默登录一次，
 * 用户在界面上看不到任何登录步骤。
 *
 * 需要恢复「必须登录」时，把环境变量改成：
 *   VITE_REQUIRE_LOGIN=true
 * 即可（路由守卫、接口 401 处理都会自动切回原来的拦截逻辑）。
 *
 * 注意：默认账号是给内网演示用的，正式部署请务必改成 true，
 * 或通过 VITE_AUTO_LOGIN_USERNAME / VITE_AUTO_LOGIN_PASSWORD 换成专用账号。
 */

/** true = 需要登录；false（默认）= 免登录直进首页 */
export const REQUIRE_LOGIN = import.meta.env.VITE_REQUIRE_LOGIN === 'true'

/** 免登录模式下用于静默换取 token 的账号 */
export const AUTO_LOGIN_USERNAME = import.meta.env.VITE_AUTO_LOGIN_USERNAME || 'admin'
export const AUTO_LOGIN_PASSWORD = import.meta.env.VITE_AUTO_LOGIN_PASSWORD || '123456'
