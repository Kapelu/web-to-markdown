import { useState } from 'react'
import { createMarkdownFilename } from '../lib/filename'
import { PageData } from '../types'

interface PageDataResponse {
  success: boolean
  data?: PageData
  error?: string
}

interface DownloadResponse {
  success: boolean
  error?: string
}

export function Popup() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave() {
    setLoading(true)
    setMessage('')

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      })

      if (!tab.id) {
        throw new Error('No se encontró la pestaña activa.')
      }

      const response = (await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_PAGE_DATA',
      })) as PageDataResponse

      if (!response?.success || !response.data) {
        throw new Error(response?.error ?? 'No se pudo extraer la página.')
      }

      const { title, url, content } = response.data

      const markdown = [
      /*  '---',
        `title: "${title.replace(/"/g, '\\"')}"`,
        `url: ${url}`,
        `date: ${new Date().toISOString().slice(0, 10)}`,
        '---', */
        '',
        content,
      ].join('\n')

      const downloadResponse = (await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MARKDOWN',
        payload: {
          /* content: markdown, */
          filename: createMarkdownFilename(title),
        },
      })) as DownloadResponse

      if (!downloadResponse?.success) {
        throw new Error(
          downloadResponse?.error ?? 'No se pudo descargar el archivo.',
        )
      }

      setMessage('Markdown guardado correctamente.')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='popup'>
      <header className='popup__header'>
        <h1>Web to Markdown</h1>
        <p>Guarda la página actual como Markdown.</p>
      </header>

      <button
        type='button'
        className='popup__button'
        onClick={handleSave}
        disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar como Markdown'}
      </button>

      {message && <p className='popup__message'>{message}</p>}
    </main>
  )
}
