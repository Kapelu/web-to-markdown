import type { DownloadMarkdownMessage, SelectionData } from '../types'

interface SelectionDataResponse {
  success: boolean
  data?: SelectionData
  error?: string
}

function downloadMarkdown(content: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([content], {
      type: 'text/markdown;charset=utf-8'
    })

    const reader = new FileReader()

    reader.onloadend = async () => {
      try {
        if (typeof reader.result !== 'string') {
          throw new Error('No se pudo preparar el archivo Markdown.')
        }

        await chrome.downloads.download({
          url: reader.result,
          filename,
          saveAs: true
        })

        resolve()
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('No se pudo preparar el archivo Markdown.'))
    }

    reader.readAsDataURL(blob)
  })
}

function isDownloadMarkdownMessage(
  message: unknown
): message is DownloadMarkdownMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'DOWNLOAD_MARKDOWN'
  )
}

function createContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'web-to-markdown-save-selection',
      title: 'Web to Markdown → Guardar selección',
      contexts: ['selection']
    })
  })
}

chrome.runtime.onInstalled.addListener(createContextMenu)
chrome.runtime.onStartup.addListener(createContextMenu)

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'web-to-markdown-save-selection' || !tab?.id) {
    return
  }

  const tabId = tab.id

  try {
    const response = (await chrome.tabs.sendMessage(tabId, {
      type: 'GET_SELECTION_DATA'
    })) as SelectionDataResponse

    if (!response?.success || !response.data) {
      throw new Error(response?.error ?? 'No se pudo extraer la selección.')
    }

    const { title, url, content } = response.data

    const markdown = [
      '---',
      `title: "${title.replace(/"/g, '\\"')}"`,
      `url: ${url}`,
      `date: ${new Date().toISOString().slice(0, 10)}`,
      '---',
      '',
      content,
    ].join('\n')

    const normalizedTitle = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()

    await downloadMarkdown(
      markdown,
      `${normalizedTitle || 'seleccion-web'}.md`
    )
  } catch (error) {
    console.error(
      'Web to Markdown: no se pudo guardar la selección.',
      error
    )
  }
})

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (!isDownloadMarkdownMessage(message)) {
      return
    }

    const { content, filename } = message.payload

    downloadMarkdown(content, filename)
      .then(() => {
        sendResponse({ success: true })
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo descargar el archivo.'
        })
      })

    return true
  }
)
