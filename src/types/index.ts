export interface PageData {
  title: string
  url: string
  content: string
}

export interface GetPageDataMessage {
  type: 'GET_PAGE_DATA'
}

export interface DownloadMarkdownMessage {
  type: 'DOWNLOAD_MARKDOWN'
  payload: {
    content: string
    filename: string
  }
}

export type ExtensionMessage =
  | GetPageDataMessage
  | DownloadMarkdownMessage
