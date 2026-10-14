/**
 * 轻量消息提示（兼容 oademo 项目 useMessage 的调用接口）
 *
 * 原实现是「模块级单例队列 + 自定义挂载点渲染」，移植到极光AI 后
 * 直接复用宿主已有的 Element Plus，避免再多引入一套 toast 渲染。
 * 调用签名保持完全一致：success / error / warning / info(content, duration?)
 */
import { ElMessage } from 'element-plus'

type MessageContent = string

function show(type: 'success' | 'error' | 'warning' | 'info', content: MessageContent, duration = 2600) {
  return ElMessage({ type, message: content, duration })
}

export function useMessage() {
  return {
    success: (content: MessageContent, duration?: number) => show('success', content, duration),
    error: (content: MessageContent, duration?: number) => show('error', content, duration),
    warning: (content: MessageContent, duration?: number) => show('warning', content, duration),
    info: (content: MessageContent, duration?: number) => show('info', content, duration),
  }
}
