import type { DownloadMarkdownMessage } from '../types'

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (
      typeof message !== 'object' ||
      message === null ||
      !('type' in message) ||
      message.type !== 'DOWNLOAD_MARKDOWN'
    ) {
      return
    }

    const downloadMessage = message as DownloadMarkdownMessage
    const { content, filename } = downloadMessage.payload

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

        sendResponse({ success: true })
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'No se pudo descargar el archivo.'
        })
      }
    }

    reader.readAsDataURL(blob)

    return true
  }
)
