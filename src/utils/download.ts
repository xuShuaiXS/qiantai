import { resolveMediaUrl } from './mediaUrl'

/**
 * 下载图片到本地。
 * 同源（/uploads 经代理）走 fetch → blob → a[download]，可自定义文件名；
 * 失败兜底为新窗口打开，由用户手动保存。
 */
export async function downloadImage(url: string, filename?: string): Promise<void> {
  const src = resolveMediaUrl(url)
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    if (!blob.size) throw new Error('empty')
    const ext = blob.type.includes('png')
      ? 'png'
      : blob.type.includes('webp')
        ? 'webp'
        : blob.type.includes('gif')
          ? 'gif'
          : 'jpg'
    const name = filename?.replace(/[\\/:*?"<>|]/g, '_') || `aurora-${Date.now()}.${ext}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name.endsWith(`.${ext}`) ? name : `${name}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  } catch {
    window.open(src, '_blank', 'noopener,noreferrer')
  }
}
