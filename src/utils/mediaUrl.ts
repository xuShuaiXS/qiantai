/**
 * 将仅本机可访问的图片地址转为当前前端可加载的路径。
 * 历史消息常存 http://localhost:8080/uploads/...，别人打开会指向他们自己的本机。
 * 改成相对路径后走 Vite /uploads 代理即可。
 */
export function resolveMediaUrl(url: string): string {
  const u = (url || '').trim()
  if (!u) return u
  const m = u.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/uploads\/.+)$/i)
  // noUncheckedIndexedAccess 下捕获组 m[1] 为 string | undefined，回退原地址
  if (m) return m[1] ?? u
  return u
}

export function resolveMediaUrls(urls: string[] | undefined): string[] {
  if (!urls?.length) return []
  return urls.map(resolveMediaUrl).filter(Boolean)
}
