import { htmlToMarkdown } from '../lib/markdown'
import type { PageData } from '../types'

const MAIN_SELECTORS = ['article', 'main', '[role="main"]']

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'template',
  /* 'svg',
  'nav',
  'header',
  'footer',
  'aside',
  'form', */
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
    !('type' in message) ||
    message.type !== 'GET_PAGE_DATA'
  ) {
    return
  }

  try {
    sendResponse({ success: true, data: getPageData() })
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'No se pudo extraer el contenido.'
    })
  }
})
