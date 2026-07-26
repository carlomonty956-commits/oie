import { RawContent, CrawlerPlugin } from '../types'

interface RSSItem {
  content: string
  format: 'rss' | 'atom'
}

export class RSSPlugin implements CrawlerPlugin {
  name = 'RSS'
  sourceType = 'rss'
  enabled = true

  private feeds: Array<{ name: string; url: string }> = [
    { name: 'HackerNews Top', url: 'https://hnrss.org/frontpage?points=100' },
    { name: 'Lobsters', url: 'https://lobste.rs/rss' },
    { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
    { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
    { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/' },
    { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/' }
  ]

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running RSS health check...')
      const response = await fetch(this.feeds[0].url, {
        headers: {
          'User-Agent': 'OIE-Crawler/1.0',
          'Accept': 'application/rss+xml, application/xml'
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    console.log(`📡 Fetching from ${this.feeds.length} RSS feeds...`)

    for (const feed of this.feeds) {
      try {
        await this.delay(1000)
        
        console.log(`📡 Fetching RSS feed: ${feed.name}...`)
        
        const response = await fetch(feed.url, {
          headers: {
            'User-Agent': 'OIE-Crawler/1.0',
            'Accept': 'application/rss+xml, application/xml'
          }
        })

        if (!response.ok) {
          console.error(`❌ Failed to fetch ${feed.name}: ${response.status}`)
          continue
        }

        const xml = await response.text()
        const parsedPosts = this.parseRSS(xml, feed.name)
        posts.push(...parsedPosts)

        console.log(`✅ Processed ${parsedPosts.length} posts from ${feed.name}`)
      } catch (error) {
        console.error(`❌ Error fetching ${feed.name}:`, error)
      }
    }

    console.log(`📊 Total posts fetched from RSS: ${posts.length}`)
    return posts
  }

  private parseRSS(xml: string, feedName: string): RawContent[] {
    const posts: RawContent[] = []
    
    try {
      const items: RSSItem[] = []
      
      // RSS 2.0 item extraction
      const rssItemRegex = /<item>([\s\S]*?)<\/item>/g
      let match
      
      while ((match = rssItemRegex.exec(xml)) !== null) {
        items.push({ content: match[1], format: 'rss' })
      }
      
      // If no RSS items found, try Atom
      if (items.length === 0) {
        const atomEntryRegex = /<entry>([\s\S]*?)<\/entry>/g
        while ((match = atomEntryRegex.exec(xml)) !== null) {
          items.push({ content: match[1], format: 'atom' })
        }
      }
      
      for (const item of items) {
        let title = ''
        let link = ''
        let description = ''
        let pubDate = ''
        let author = ''
        
        if (item.format === 'rss') {
          const titleMatch = item.content.match(/<title>(.*?)<\/title>/)
          const linkMatch = item.content.match(/<link>(.*?)<\/link>/)
          const descriptionMatch = item.content.match(/<description>(.*?)<\/description>/)
          const pubDateMatch = item.content.match(/<pubDate>(.*?)<\/pubDate>/)
          const authorMatch = item.content.match(/<author>(.*?)<\/author>/)
          
          title = titleMatch ? this.cleanText(titleMatch[1]) : ''
          link = linkMatch ? this.cleanText(linkMatch[1]) : ''
          description = descriptionMatch ? this.cleanText(descriptionMatch[1]) : ''
          pubDate = pubDateMatch ? this.cleanText(pubDateMatch[1]) : ''
          author = authorMatch ? this.cleanText(authorMatch[1]) : ''
        } else if (item.format === 'atom') {
          const titleMatch = item.content.match(/<title>(.*?)<\/title>/)
          const linkMatch = item.content.match(/<link href="(.*?)"/)
          const summaryMatch = item.content.match(/<summary>(.*?)<\/summary>/)
          const updatedMatch = item.content.match(/<updated>(.*?)<\/updated>/)
          const authorMatch = item.content.match(/<author>.*?<name>(.*?)<\/name>.*?<\/author>/)
          
          title = titleMatch ? this.cleanText(titleMatch[1]) : ''
          link = linkMatch ? this.cleanText(linkMatch[1]) : ''
          description = summaryMatch ? this.cleanText(summaryMatch[1]) : ''
          pubDate = updatedMatch ? this.cleanText(updatedMatch[1]) : ''
          author = authorMatch ? this.cleanText(authorMatch[1]) : ''
        }
        
        if (title && link) {
          const id = `rss_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          
          posts.push({
            id: id,
            source: 'rss',
            title: title,
            content: description || title,
            url: link,
            author: author || 'unknown',
            createdAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            language: 'en',
            metadata: {
              feed: feedName
            }
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
      .replace(/CDATA\[/g, '')
      .replace(/\]\]>/g, '')
      .trim()
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}