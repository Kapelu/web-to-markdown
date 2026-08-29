/*
 * Reemplaza espacios no separables por espacios normales, colapsa espacios/tabs repetidos,
 * limita saltos de línea consecutivos a un máximo de 2, y recorta espacios al inicio/final.
 */
function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/*
 * Escapa los caracteres especiales de Markdown (*, _, `) dentro de texto plano
 * para que no se interpreten como formato involuntariamente.
 */
function escapeText(value: string): string {
  return value.replace(/([*_`])/g, '\\$1')
}

/*
 * Recorre todos los nodos hijos de un elemento y concatena su conversión a Markdown.
 */
function convertChildren(element: Node): string {
  return Array.from(element.childNodes)
    .map((node) => convertNode(node))
    .join('')
}

/*
 * Calcula cuántos backticks (```) se necesitan para envolver un bloque de código
 * sin que el contenido interno rompa el fence (busca la secuencia de backticks más larga
 * dentro del contenido y devuelve una un poco más larga, con mínimo 3).
 */
function getCodeFence(value: string): string {
  const matches = value.match(/`+/g) ?? []
  const longest = matches.reduce((max, match) => Math.max(max, match.length), 0)
  return '`'.repeat(Math.max(3, longest + 1))
}

/*
 * Extrae el texto de un bloque "console" custom del sitio (clase .console),
 * ya sea desde un atributo guardado previamente o recorriendo su .console-body,
 * resolviendo <slot> de Shadow DOM y descartando header/botones de copiar.
 */
function getConsoleContent(element: HTMLElement): string {
  const storedContent = element.getAttribute('data-console-content')

  if (storedContent) {
    return storedContent.trim()
  }

  const consoleBody = element.querySelector('.console-body')

  if (!consoleBody) {
    return ''
  }

  const getNodeText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? ''
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return ''
    }

    const child = node as HTMLElement

    if (child.tagName.toLowerCase() === 'slot') {
      const slot = child as HTMLSlotElement
      const assignedNodes = slot.assignedNodes({ flatten: true })

      if (assignedNodes.length > 0) {
        return assignedNodes.map(getNodeText).join('')
      }
    }

    if (
      child.classList.contains('console-header') ||
      child.classList.contains('copy-container') ||
      child.classList.contains('copy-button') ||
      child.classList.contains('copy-flash')
    ) {
      return ''
    }

    return Array.from(child.childNodes).map(getNodeText).join('')
  }

  return getNodeText(consoleBody)
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

/*
 * Convierte un elemento con clase "console" (bloque de código custom del sitio)
 * a un code fence de Markdown con lenguaje "text".
 */
function convertConsoleBlock(element: HTMLElement): string | null {
  const consoleContent = getConsoleContent(element)

  if (!consoleContent) {
    return null
  }

  const fence = getCodeFence(consoleContent)
  return `\n\n${fence}text\n${consoleContent}\n${fence}\n\n`
}

/*
 * Convierte el custom element <lll-ui-console> (otro tipo de bloque de código del sitio,
 * compuesto por líneas <lll-ui-console-line>) a un code fence de Markdown,
 * usando el atributo "language" del elemento si está presente.
 */
function convertLllUiConsole(element: HTMLElement): string | null {
  const lines = Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'lll-ui-console-line')
    .map((child) => (child.textContent ?? '').trim())
    .filter(Boolean)

  const consoleContent = lines.join('\n')

  if (!consoleContent) {
    return null
  }

  const fence = getCodeFence(consoleContent)
  return `\n\n${fence}${element.getAttribute('language') ?? 'text'}\n${consoleContent}\n${fence}\n\n`
}

/*
 * Convierte un heading (h1-h6) a la sintaxis "#" de Markdown correspondiente a su nivel.
 */
function convertHeading(level: number, content: string): string {
  return `\n\n${'#'.repeat(level)} ${normalizeWhitespace(content)}\n\n`
}

/*
 * Convierte un párrafo <p> a texto plano rodeado de líneas en blanco.
 */
function convertParagraph(content: string): string {
  return `\n\n${normalizeWhitespace(content)}\n\n`
}

/*
 * Convierte <strong>/<b> a negrita Markdown (**texto**).
 */
function convertBold(content: string): string {
  return `**${normalizeWhitespace(content)}**`
}

/*
 * Convierte <em>/<i> a cursiva Markdown (*texto*).
 */
function convertItalic(content: string): string {
  return `*${normalizeWhitespace(content)}*`
}

/*
 * Convierte <del>/<s> a texto tachado Markdown (~~texto~~).
 */
function convertStrikethrough(content: string): string {
  return `~~${normalizeWhitespace(content)}~~`
}

/*
 * Convierte <code> (código inline) a Markdown con backticks simples.
 */
function convertInlineCode(content: string): string {
  return `\`${normalizeWhitespace(content)}\``
}

/*
 * Convierte <pre> (bloque de código) a un code fence de Markdown de 3 backticks,
 * usando el texto plano del elemento para no perder saltos de línea internos.
 */
function convertPre(element: HTMLElement): string {
  return `\n\n\`\`\`\n${element.textContent?.trim() ?? ''}\n\`\`\`\n\n`
}

/*
 * Convierte <blockquote> a cita Markdown, anteponiendo "> " a cada línea del contenido.
 */
function convertBlockquote(content: string): string {
  return `\n\n${normalizeWhitespace(content)
    .split('\n')
    .map((line) => `> ${line.trim()}`)
    .join('\n')}\n\n`
}

/*
 * Convierte <a> a enlace Markdown [texto](url). Si no hay href o no hay texto,
 * devuelve solo el texto plano.
 */
function convertLink(element: HTMLElement, content: string): string {
  const href = (element as HTMLAnchorElement).href
  const text = normalizeWhitespace(content)
  return href && text ? `[${text}](${href})` : text
}

/*
 * Convierte <img> a imagen Markdown ![alt](src), usando currentSrc si está disponible
 * (por ejemplo en <picture> o imágenes responsive) y si no, src.
 */
function convertImage(element: HTMLElement): string {
  const image = element as HTMLImageElement
  const source = image.currentSrc || image.src
  return source ? `![${image.alt.trim()}](${source})` : ''
}

/*
 * Convierte <ul> a lista Markdown sin numerar, tomando solo los <li> hijos directos.
 */
function convertUnorderedList(element: HTMLElement): string {
  return `\n\n${Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map((child) => `- ${normalizeWhitespace(convertChildren(child))}`)
    .join('\n')}\n\n`
}

/*
 * Convierte <ol> a lista Markdown numerada, tomando solo los <li> hijos directos.
 */
function convertOrderedList(element: HTMLElement): string {
  return `\n\n${Array.from(element.children)
    .filter((child) => child.tagName.toLowerCase() === 'li')
    .map(
      (child, index) =>
        `${index + 1}. ${normalizeWhitespace(convertChildren(child))}`,
    )
    .join('\n')}\n\n`
}

/*
 * Convierte una fila <tr> de una tabla a una línea Markdown "| celda | celda |",
 * escapando el carácter "|" dentro de cada celda, e indica si la fila contiene <th>
 * (fila de encabezado) para decidir si corresponde agregar la línea separadora.
 */
function convertTableRow(row: HTMLElement): {
  line: string
  isHeader: boolean
} {
  const cells = Array.from(row.children).filter((child) =>
    ['th', 'td'].includes(child.tagName.toLowerCase()),
  )

  const cellContents = cells.map((cell) =>
    normalizeWhitespace(convertChildren(cell)).replace(/\|/g, '\\|'),
  )

  const isHeader = cells.some((cell) => cell.tagName.toLowerCase() === 'th')

  return {
    line: `| ${cellContents.join(' | ')} |`,
    isHeader,
  }
}

/*
 * Convierte <table> a tabla Markdown: recorre todas las <tr> (con o sin thead/tbody),
 * arma cada fila con convertTableRow, y agrega la línea separadora "|---|---|"
 * después de la primera fila (si es de encabezado, o si hay más de una fila).
 */
function convertTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr'))

  if (rows.length === 0) {
    return ''
  }

  const lines: string[] = []

  rows.forEach((row, index) => {
    const { line, isHeader } = convertTableRow(row)
    lines.push(line)

    const isFirstRow = index === 0
    const shouldAddSeparator = isFirstRow && (isHeader || rows.length > 1)

    if (shouldAddSeparator) {
      const columnCount = row.children.length
      const separator = `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`
      lines.push(separator)
    }
  })

  return `\n\n${lines.join('\n')}\n\n`
}

/*
 * Convierte contenedores de bloque genéricos (<div>, <section>, <article>, <main>)
 * a su contenido rodeado de un salto de línea, sin agregar sintaxis Markdown propia.
 */
function convertBlockContainer(content: string): string {
  return `\n${content}\n`
}

/*
 * Punto de entrada de la conversión: recibe un nodo del DOM y devuelve su equivalente
 * en Markdown, delegando en la función específica según el tipo de nodo o tag.
 */
function convertNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeText(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()

  if (element.classList.contains('console')) {
    const converted = convertConsoleBlock(element)
    if (converted) {
      return converted
    }
  }

  if (tag === 'lll-ui-console') {
    const converted = convertLllUiConsole(element)
    if (converted) {
      return converted
    }
  }

  if (tag === 'lll-ui-console-line') {
    return normalizeWhitespace(element.textContent ?? '')
  }

  if (tag === 'table') {
    return convertTable(element)
  }

  const content = convertChildren(element)

  switch (tag) {
    case 'h1':
      return convertHeading(1, content)
    case 'h2':
      return convertHeading(2, content)
    case 'h3':
      return convertHeading(3, content)
    case 'h4':
      return convertHeading(4, content)
    case 'h5':
      return convertHeading(5, content)
    case 'h6':
      return convertHeading(6, content)
    case 'p':
      return convertParagraph(content)
    case 'strong':
    case 'b':
      return convertBold(content)
    case 'em':
    case 'i':
      return convertItalic(content)
    case 'del':
    case 's':
      return convertStrikethrough(content)
    case 'code':
      return convertInlineCode(content)
    case 'pre':
      return convertPre(element)
    case 'blockquote':
      return convertBlockquote(content)
    case 'br':
      return '\n'
    case 'hr':
      return '\n\n---\n\n'
    case 'a':
      return convertLink(element, content)
    case 'img':
      return convertImage(element)
    case 'ul':
      return convertUnorderedList(element)
    case 'ol':
      return convertOrderedList(element)
    case 'li':
      return content
    case 'div':
    case 'section':
    case 'article':
    case 'main':
      return convertBlockContainer(content)
    default:
      return content
  }
}

/*
 * Función pública: convierte un elemento del DOM completo a Markdown,
 * limpiando espacios sobrantes al final del proceso (espacios antes de saltos de línea,
 * espacios al inicio de línea, y más de 2 saltos de línea consecutivos).
 */
export function htmlToMarkdown(element: HTMLElement): string {
  return convertChildren(element)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
