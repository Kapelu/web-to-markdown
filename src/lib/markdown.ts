function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function escapeText(value: string): string {
  return value.replace(/([*_`])/g, '\\$1')
}

function convertChildren(element: Node): string {
  return Array.from(element.childNodes)
    .map((node) => convertNode(node))
    .join('')
}

function convertNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  const content = convertChildren(element)

  switch (tag) {
    case 'h1':
      return `\n\n# ${normalizeWhitespace(content)}\n\n`
    case 'h2':
      return `\n\n## ${normalizeWhitespace(content)}\n\n`
    case 'h3':
      return `\n\n### ${normalizeWhitespace(content)}\n\n`
    case 'h4':
      return `\n\n#### ${normalizeWhitespace(content)}\n\n`
    case 'h5':
      return `\n\n##### ${normalizeWhitespace(content)}\n\n`
    case 'h6':
      return `\n\n###### ${normalizeWhitespace(content)}\n\n`
    case 'p':
      return `\n\n${normalizeWhitespace(content)}\n\n`
    case 'strong':
    case 'b':
      return `**${normalizeWhitespace(content)}**`
    case 'em':
    case 'i':
      return `*${normalizeWhitespace(content)}*`
    case 'del':
    case 's':
      return `~~${normalizeWhitespace(content)}~~`
    case 'code':
      return `\`${normalizeWhitespace(content)}\``
    case 'pre':
      return `\n\n\`\`\`\n${element.textContent?.trim() ?? ''}\n\`\`\`\n\n`
    case 'blockquote':
      return `\n\n${normalizeWhitespace(content).split('\n').map((line) => `> ${line.trim()}`).join('\n')}\n\n`
    case 'br':
      return '\n'
    case 'hr':
      return '\n\n---\n\n'
    case 'a': {
      const href = (element as HTMLAnchorElement).href
      const text = normalizeWhitespace(content)
      return href && text ? `[${text}](${href})` : text
    }
    case 'img': {
      const image = element as HTMLImageElement
      const source = image.currentSrc || image.src
      return source ? `![${image.alt.trim()}](${source})` : ''
    }
    case 'ul':
      return `\n\n${Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((child) => `- ${normalizeWhitespace(convertChildren(child))}`)
        .join('\n')}\n\n`
    case 'ol':
      return `\n\n${Array.from(element.children)
        .filter((child) => child.tagName.toLowerCase() === 'li')
        .map((child, index) => `${index + 1}. ${normalizeWhitespace(convertChildren(child))}`)
        .join('\n')}\n\n`
    case 'li':
      return content
    case 'div':
    case 'section':
    case 'article':
    case 'main':
      return `\n${content}\n`
    default:
      return content
  }
}

export function htmlToMarkdown(element: HTMLElement): string {
  return convertChildren(element)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
