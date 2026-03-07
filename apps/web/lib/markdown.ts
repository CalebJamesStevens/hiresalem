function sanitizeHref(value: string) {
  const trimmed = value.trim()

  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed
  }

  return null
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderInlineMarkdown(value: string) {
  const escaped = escapeHtml(value)
  const withLinks = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    const safeHref = sanitizeHref(href)
    if (!safeHref) {
      return escapeHtml(label)
    }

    return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noreferrer" class="font-medium text-slate-900 underline underline-offset-4">${escapeHtml(label)}</a>`
  })

  return withLinks
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-slate-900">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
}

function renderParagraph(lines: string[]) {
  const content = lines
    .map((line) => renderInlineMarkdown(line.trim()))
    .join("<br />")

  return `<p class="text-slate-700 leading-7">${content}</p>`
}

function renderList(lines: string[], ordered: boolean) {
  const items = lines
    .map((line) => line.replace(ordered ? /^\d+\.\s+/ : /^[-*+]\s+/, "").trim())
    .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
    .join("")

  const tag = ordered ? "ol" : "ul"
  const classes = ordered ? "list-decimal" : "list-disc"
  return `<${tag} class="${classes} space-y-2 pl-6 text-slate-700">${items}</${tag}>`
}

function renderBlockquote(lines: string[]) {
  const content = lines
    .map((line) => line.replace(/^>\s?/, ""))
    .map((line) => renderInlineMarkdown(line.trim()))
    .join("<br />")

  return `<blockquote class="border-l-4 border-slate-300 pl-4 italic text-slate-700">${content}</blockquote>`
}

function renderCodeBlock(lines: string[]) {
  return `<pre class="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100"><code>${escapeHtml(lines.join("\n"))}</code></pre>`
}

function renderHeading(line: string) {
  const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
  if (!match) {
    return null
  }

  const level = match[1].length
  const text = renderInlineMarkdown(match[2].trim())
  const tag = `h${level}`
  const classes =
    level === 1
      ? "text-3xl font-semibold text-slate-950"
      : level === 2
        ? "text-2xl font-semibold text-slate-950"
        : "text-xl font-semibold text-slate-950"

  return `<${tag} class="${classes}">${text}</${tag}>`
}

function isSentenceLikeHeading(text: string) {
  if (/[.!?]/.test(text)) {
    return true
  }

  return text.split(/\s+/).filter(Boolean).length > 12 || text.length > 90
}

export function normalizeJobDescriptionMarkdown(value: string | null | undefined) {
  const markdown = value?.replace(/\r\n/g, "\n").trim()
  if (!markdown) {
    return ""
  }

  const lines = markdown.split("\n")
  const normalized: string[] = []

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim())
    if (!match) {
      normalized.push(line)
      continue
    }

    const level = match[1].length
    const text = match[2].trim().replace(/:+$/, "")

    if (!text) {
      continue
    }

    if (isSentenceLikeHeading(text)) {
      normalized.push(`**${text}**`)
      continue
    }

    normalized.push(`**${text}:**`)

    if (level <= 2) {
      normalized.push("")
    }
  }

  return normalized.join("\n").replace(/\n{3,}/g, "\n\n")
}

export function markdownToHtml(value: string | null | undefined) {
  const markdown = value?.replace(/\r\n/g, "\n").trim()
  if (!markdown) {
    return ""
  }

  const lines = markdown.split("\n")
  const fragments: string[] = []
  let paragraphLines: string[] = []
  let listLines: string[] = []
  let listOrdered: boolean | null = null
  let quoteLines: string[] = []
  let codeLines: string[] = []
  let inCodeBlock = false

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      fragments.push(renderParagraph(paragraphLines))
      paragraphLines = []
    }
  }

  const flushList = () => {
    if (listLines.length > 0 && listOrdered !== null) {
      fragments.push(renderList(listLines, listOrdered))
      listLines = []
      listOrdered = null
    }
  }

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      fragments.push(renderBlockquote(quoteLines))
      quoteLines = []
    }
  }

  const flushCode = () => {
    if (codeLines.length > 0) {
      fragments.push(renderCodeBlock(codeLines))
      codeLines = []
    }
  }

  const flushAll = () => {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCodeBlock) {
        flushCode()
        inCodeBlock = false
      } else {
        flushAll()
        inCodeBlock = true
      }

      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (!line.trim()) {
      flushAll()
      continue
    }

    const heading = renderHeading(line)
    if (heading) {
      flushAll()
      fragments.push(heading)
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      flushParagraph()
      flushQuote()

      if (listOrdered !== false) {
        flushList()
        listOrdered = false
      }

      listLines.push(line)
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      flushParagraph()
      flushQuote()

      if (listOrdered !== true) {
        flushList()
        listOrdered = true
      }

      listLines.push(line)
      continue
    }

    if (/^>\s?/.test(line)) {
      flushParagraph()
      flushList()
      quoteLines.push(line)
      continue
    }

    flushList()
    flushQuote()
    paragraphLines.push(line)
  }

  if (inCodeBlock) {
    flushCode()
  }

  flushAll()

  return fragments.join("")
}

export function jobDescriptionToHtml(value: string | null | undefined) {
  return markdownToHtml(normalizeJobDescriptionMarkdown(value))
}

export function markdownToPlainText(value: string | null | undefined) {
  const markdown = value?.replace(/\r\n/g, "\n")
  if (!markdown) {
    return ""
  }

  return markdown
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, "").trim())
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
