import { marked, Renderer } from 'marked'
import DOMPurify from 'dompurify'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 轻量语法着色（避免额外依赖）；按 token 切分，不嵌套冲突 */
function highlightCode(src: string, lang: string): string {
  const escaped = escapeHtml(src)
  const l = lang.toLowerCase()
  const isJs =
    /^(javascript|js|typescript|ts|jsx|tsx|java|go|golang|c|cpp|csharp|cs|kotlin|swift|rust|php)$/.test(
      l,
    )
  const isPy = /^(python|py)$/.test(l)
  const isSql = l === 'sql'
  const isShell = /^(bash|shell|sh|zsh|powershell|ps1)$/.test(l)
  const isJson = /^(json|yaml|yml)$/.test(l)

  let keywords = ''
  if (isJs) {
    keywords =
      'break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield|async|await|of|interface|type|package|public|private|protected|implements|struct|map|chan|func|defer|go|range|select'
  } else if (isPy) {
    keywords =
      'False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield'
  } else if (isSql) {
    keywords =
      'SELECT|FROM|WHERE|AND|OR|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|DISTINCT|NULL|NOT|IN|LIKE|BETWEEN|ASC|DESC|PRIMARY|KEY|FOREIGN|REFERENCES|ALTER|DROP|UNION|ALL|CASE|WHEN|THEN|ELSE|END'
  } else if (isShell) {
    keywords =
      'if|then|else|elif|fi|for|while|do|done|case|esac|function|return|in|export|local|readonly|unset|shift|echo|cd|ls|rm|cp|mv|mkdir|cat|grep|sed|awk|sudo|apt|npm|yarn|git|docker'
  } else if (!isJson && !l) {
    return escaped
  }

  const parts: string[] = []
  const re =
    /(`(?:\\.|[^`])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|(\b\d+(?:\.\d+)?\b)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(escaped))) {
    if (m.index > last) parts.push(colorKeywords(escaped.slice(last, m.index), keywords))
    if (m[1]) parts.push(`<span class="tok-str">${m[1]}</span>`)
    else if (m[2]) parts.push(`<span class="tok-cmt">${m[2]}</span>`)
    else if (m[3]) parts.push(`<span class="tok-num">${m[3]}</span>`)
    last = m.index + m[0].length
  }
  if (last < escaped.length) parts.push(colorKeywords(escaped.slice(last), keywords))
  return parts.join('')
}

function colorKeywords(chunk: string, keywords: string): string {
  if (!keywords) return chunk
  const re = new RegExp(`\\b(?:${keywords})\\b`, 'gi')
  return chunk.replace(re, (k) => `<span class="tok-kw">${k}</span>`)
}

const renderer = new Renderer()

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const rawLang = (lang || '').trim().split(/\s+/)[0] || ''
  const label = escapeHtml(rawLang || 'text')
  const highlighted = highlightCode(text, rawLang)
  return (
    `<div class="md-code-block">` +
    `<div class="md-code-bar">` +
    `<span class="md-code-lang">${label}</span>` +
    `<button type="button" class="md-code-copy" aria-label="复制代码">复制</button>` +
    `</div>` +
    `<pre><code class="language-${escapeHtml(rawLang || 'text')}">${highlighted}</code></pre>` +
    `</div>`
  )
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
})

/** 将 Markdown 转为安全 HTML（供助手气泡渲染） */
export function renderMarkdown(src: string): string {
  if (!src) return ''
  const html = marked.parse(src, { async: false }) as string
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ['button'],
    ADD_ATTR: ['type', 'aria-label', 'class'],
  })
}
