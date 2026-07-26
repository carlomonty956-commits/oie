import { RawContent, CrawlerPlugin } from '../types'

export class IndieHackersPlugin implements CrawlerPlugin {
  name = 'IndieHackers'
  sourceType = 'indiehackers'
  enabled = true

  private baseUrl = 'https://www.indiehackers.com'

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running Indie Hackers health check...')
      
      // Try multiple endpoints
      const endpoints = [
        `${this.baseUrl}/feed.xml`,
        `${this.baseUrl}/posts/rss.xml`,
        `${this.baseUrl}/?format=rss`
      ]

      for (const url of endpoints) {
        try {
          const response = await fetch(url, {
            headers: this.getHeaders(),
            signal: AbortSignal.timeout(10000)
          })
          if (response.ok) {
            console.log(`✅ Indie Hackers health check passed (${url})`)
            return true
          }
        } catch (e) {
          continue
        }
      }

      console.log('❌ Indie Hackers health check failed - all endpoints unreachable')
      return false
    } catch (error) {
      console.log('❌ Indie Hackers health check error:', error)
      return false
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    // Try multiple RSS endpoints
    const endpoints = [
      { url: `${this.baseUrl}/feed.xml`, name: 'main' },
      { url: `${this.baseUrl}/posts/rss.xml`, name: 'posts' },
      { url: `${this.baseUrl}/?format=rss`, name: 'format' }
    ]

    let success = false

    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Fetching Indie Hackers RSS feed (${endpoint.name})...`)
        
        const response = await fetch(endpoint.url, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(15000)
        })
        
        if (!response.ok) {
          console.log(`⚠️ Endpoint ${endpoint.name} returned: ${response.status}`)
          continue
        }

        const xml = await response.text()
        const parsedPosts = this.parseRSS(xml)
        posts.push(...parsedPosts)
        success = true
        console.log(`✅ Processed ${parsedPosts.length} posts from Indie Hackers (${endpoint.name})`)
        break // If one endpoint works, stop trying others
      } catch (error) {
        console.log(`⚠️ Endpoint ${endpoint.name} failed:`, error)
        await this.delay(2000)
      }
    }

    // If all RSS endpoints fail, try the alternative: fetch the main page and parse
    if (!success) {
      console.log('📡 Trying alternative: fetching main page...')
      try {
        const response = await fetch(`${this.baseUrl}/`, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(15000)
        })

        if (response.ok) {
          const html = await response.text()
          const parsedPosts = this.parseHTML(html)
          posts.push(...parsedPosts)
          console.log(`✅ Processed ${parsedPosts.length} posts from Indie Hackers main page`)
        }
      } catch (error) {
        console.error('❌ Alternative fetch also failed:', error)
      }
    }

    console.log(`📊 Total posts fetched from Indie Hackers: ${posts.length}`)
    return posts
  }

  private parseHTML(html: string): RawContent[] {
    const posts: RawContent[] = []
    
    try {
      // Look for post links in the HTML
      const linkRegex = /<a[^>]*href="\/(?:posts|p)\/([^"]*)"[^>]*>([^<]*)<\/a>/g
      let match
      const titles: string[] = []
      const links: string[] = []

      while ((match = linkRegex.exec(html)) !== null) {
        if (match[2] && match[2].length > 20) {
          titles.push(match[2])
          links.push(`https://www.indiehackers.com/posts/${match[1]}`)
        }
      }

      // Limit to 20 posts
      const count = Math.min(titles.length, 20)
      for (let i = 0; i < count; i++) {
        const id = `indiehackers_${Date.now()}_${i}`
        posts.push({
          id: id,
          source: 'indiehackers',
          title: titles[i] || 'Unknown post',
          content: titles[i] || '',
          url: links[i] || '',
          author: 'indiehackers',
          createdAt: new Date().toISOString(),
          language: 'en',
          metadata: {}
        })
      }
    } catch (error) {
      console.error('Error parsing HTML:', error)
    }

    return posts
  }

  private parseRSS(xml: string): RawContent[] {
    const posts: RawContent[] = []
    
    try {
      // Try Atom format first
      let entryRegex = /<entry>([\s\S]*?)<\/entry>/g
      let match
      let found = false

      while ((match = entryRegex.exec(xml)) !== null) {
        const entry = match[1]
        const titleMatch = entry.match(/<title>(.*?)<\/title>/)
        const linkMatch = entry.match(/<link href="(.*?)"/)
        const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/)
        const updatedMatch = entry.match(/<updated>(.*?)<\/updated>/)
        const authorMatch = entry.match(/<author>.*?<name>(.*?)<\/name>.*?<\/author>/)

        if (titleMatch && linkMatch) {
          const id = `indiehackers_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
          posts.push({
            id: id,
            source: 'indiehackers',
            title: this.cleanText(titleMatch[1]),
            content: summaryMatch ? this.cleanText(summaryMatch[1]) : '',
            url: linkMatch[1],
            author: authorMatch ? this.cleanText(authorMatch[1]) : 'indiehackers',
            createdAt: updatedMatch ? new Date(updatedMatch[1]).toISOString() : new Date().toISOString(),
            language: 'en',
            metadata: {}
          })
          found = true
        }
      }

      // If Atom format didn't work, try RSS format
      if (!found) {
        const rssItemRegex = /<item>([\s\S]*?)<\/item>/g
        while ((match = rssItemRegex.exec(xml)) !== null) {
          const item = match[1]
          const titleMatch = item.match(/<title>(.*?)<\/title>/)
          const linkMatch = item.match(/<link>(.*?)<\/link>/)
          const descriptionMatch = item.match(/<description>(.*?)<\/description>/)
          const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/)
          const authorMatch = item.match(/<author>(.*?)<\/author>/)

          if (titleMatch && linkMatch) {
            const id = `indiehackers_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
            posts.push({
              id: id,
              source: 'indiehackers',
              title: this.cleanText(titleMatch[1]),
              content: descriptionMatch ? this.cleanText(descriptionMatch[1]) : '',
              url: linkMatch[1],
              author: authorMatch ? this.cleanText(authorMatch[1]) : 'indiehackers',
              createdAt: pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : new Date().toISOString(),
              language: 'en',
              metadata: {}
            })
          }
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
      .replace(/\[CDATA\[/g, '')
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