export interface RawContent {
  id: string
  source: string
  title: string
  content: string
  url: string
  author?: string
  createdAt: string
  language?: string
  metadata?: Record<string, any>
}

export interface CrawlerPlugin {
  name: string
  sourceType: string
  enabled: boolean
  fetch(): Promise<RawContent[]>
  normalize(data: any): RawContent
  healthCheck(): Promise<boolean>
}

export interface CrawlerConfig {
  name: string
  enabled: boolean
  schedule: string
  priority: number
  qualityScore: number
  config?: Record<string, any>
}