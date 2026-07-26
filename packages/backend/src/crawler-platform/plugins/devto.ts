import { RawContent, CrawlerPlugin } from '../types'

export class DevToPlugin implements CrawlerPlugin {
  name = 'DevTo'
  sourceType = 'devto'
  enabled = true

  private tags: string[] = [
    'webdev',
    'javascript',
    'react',
    'startup',
    'career',
    'opensource'
  ]

  private baseUrl = 'https://dev.to/api'

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running Dev.to health check...')
      const response = await fetch(`${this.baseUrl}/articles?per_page=1`)
      return response.ok
    } catch {
      return false
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    console.log(`🔍 Fetching from Dev.to...`)

    for (const tag of this.tags) {
      try {
        await this.delay(1000)
        
        const url = `${this.baseUrl}/articles?tag=${tag}&per_page=10`
        console.log(`📡 Fetching Dev.to tag: ${tag}...`)
        
        const response = await fetch(url)
        
        if (!response.ok) {
          console.error(`❌ Failed to fetch Dev.to tag ${tag}: ${response.status}`)
          continue
        }

        const articles = await response.json()

        for (const article of articles) {
          if (article && article.title) {
            posts.push({
              id: `devto_${article.id}`,
              source: 'devto',
              title: article.title || '',
              content: article.description || article.title || '',
              url: article.url || '',
              author: article.user?.username || 'unknown',
              createdAt: article.published_at || new Date().toISOString(),
              language: 'en',
              metadata: {
                tag: tag,
                comments_count: article.comments_count || 0,
                positive_reactions_count: article.positive_reactions_count || 0,
                reading_time_minutes: article.reading_time_minutes || 0
              }
            })
          }
        }

        console.log(`✅ Processed ${articles.length} posts from Dev.to tag ${tag}`)
      } catch (error) {
        console.error(`❌ Error fetching Dev.to tag ${tag}:`, error)
      }
    }

    console.log(`📊 Total posts fetched from Dev.to: ${posts.length}`)
    return posts
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}