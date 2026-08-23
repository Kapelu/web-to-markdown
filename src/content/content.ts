import { htmlToMarkdown } from '../lib/markdown'
import type { PageData } from '../types'
import type { SelectionData } from '../types'

const MAIN_SELECTORS = ['article', 'main', '[role="main"]']

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'template',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]'
]

function getMainContent(): HTMLElement {
  for (const selector of MAIN_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element) {
      return element.cloneNode(true) as HTMLElement
    }
  }

  return document.body.cloneNode(true) as HTMLElement
}

function cleanContent(element: HTMLElement): HTMLElement {
  for (const selector of REMOVE_SELECTORS) {
    element.querySelectorAll(selector).forEach((node) => node.remove())
  }

  return element
}

function getAncestorElement(node: Node | null, selector: string): HTMLElement | null {
  let current: Node | null = node

  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as HTMLElement

      if (element.matches(selector)) {
        return element
      }
    }

    if (current.parentNode) {
      current = current.parentNode
      continue
    }

    const root = current.getRootNode()

    if (root instanceof ShadowRoot) {
      current = root.host
      continue
    }

    break
  }

  return null
}

function getSelectedConsoleContent(selection: Selection): string | null {
  const anchorBody = getAncestorElement(selection.anchorNode, '.console-body')
  const focusBody = getAncestorElement(selection.focusNode, '.console-body')

  if (!anchorBody || anchorBody !== focusBody) {
    return null
  }

  const selectedText = selection.toString().trim()

  if (!selectedText) {
    return null
  }

  return selectedText.replace(/\r\n?/g, '\n')
}

function getSelectionData(): SelectionData {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    throw new Error('No hay texto seleccionado.')
  }

  const range = selection.getRangeAt(0)
  const container = document.createElement('div')
  container.appendChild(range.cloneContents())

  cleanContent(container)

  const selectedConsoleContent = getSelectedConsoleContent(selection)
  const consoleElements = container.querySelectorAll<HTMLElement>('.console')

  if (selectedConsoleContent && consoleElements.length > 0) {
    consoleElements.forEach((consoleElement) => {
      consoleElement.setAttribute(
        'data-console-content',
        selectedConsoleContent
      )
    })
  }

  if (!container.textContent?.trim() && !selectedConsoleContent) {
    throw new Error('La selección no contiene contenido.')
  }

  return {
    title: document.title.trim() || 'Selección web',
    url: window.location.href,
    content: htmlToMarkdown(container),
  }
}

function getPageData(): PageData {
  const content = cleanContent(getMainContent())

  return {
    title: document.title.trim() || 'Página web',
    url: window.location.href,
    content: htmlToMarkdown(content)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message)
  ) {
    return
  }

  if (message.type === 'GET_PAGE_DATA') {
    try {
      sendResponse({ success: true, data: getPageData() })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo extraer el contenido.'
      })
    }

    return
  }

  if (message.type === 'GET_SELECTION_DATA') {
    try {
      sendResponse({ success: true, data: getSelectionData() })
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'No se pudo extraer la selección.'
      })
    }
  }
})
