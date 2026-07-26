import { RawContent, CrawlerPlugin } from '../types'

export class LobstersPlugin implements CrawlerPlugin {
  name = 'Lobsters'
  sourceType = 'lobsters'
  enabled = true

  private baseUrl = 'https://lobste.rs'

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running Lobsters health check...')
      const response = await fetch(`${this.baseUrl}/rss`)
      return response.ok
    } catch {
      return false
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    try {
      console.log('📡 Fetching Lobsters RSS feed...')
      
      const response = await fetch(`${this.baseUrl}/rss`)
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch Lobsters: ${response.status}`)
        return posts
      }

      const xml = await response.text()
      const parsedPosts = this.parseRSS(xml)
      posts.push(...parsedPosts)

      console.log(`✅ Processed ${parsedPosts.length} posts from Lobsters`)
    } catch (error) {
      console.error('❌ Error fetching Lobsters:', error)
    }

    console.log(`📊 Total posts fetched from Lobsters: ${posts.length}`)
    return posts
  }

  private parseRSS(xml: string): RawContent[] {
    const posts: RawContent[] = []
    
    try {
      const itemRegex = /<item>([\s\S]*?)<\/item>/g
      const titleRegex = /<title>(.*?)<\/title>/
      const linkRegex = /<link>(.*?)<\/link>/
      const descriptionRegex = /<description>(.*?)<\/description>/
      const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/
      const authorRegex = /<author>(.*?)<\/author>/

      let match
      while ((match = itemRegex.exec(xml)) !== null) {
        const item = match[1]
        
        const titleMatch = item.match(titleRegex)
        const linkMatch = item.match(linkRegex)
        const descriptionMatch = item.match(descriptionRegex)
        const pubDateMatch = item.match(pubDateRegex)
        const authorMatch = item.match(authorRegex)

        if (titleMatch && linkMatch) {
          const id = `lobsters_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          
          posts.push({
            id: id,
            source: 'lobsters',
            title: this.cleanText(titleMatch[1]),
            content: descriptionMatch ? this.cleanText(descriptionMatch[1]) : '',
            url: linkMatch[1],
            author: authorMatch ? this.cleanText(authorMatch[1]) : 'unknown',
            createdAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
            language: 'en',
            metadata: {}
          })
        }
      }
    } catch (error) {
      console.error('Error parsing RSS:', error)
    }

    return posts
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim()
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}