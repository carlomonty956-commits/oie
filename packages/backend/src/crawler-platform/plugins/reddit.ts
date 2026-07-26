import { RawContent, CrawlerPlugin } from '../types'

export class RedditPlugin implements CrawlerPlugin {
  name = 'Reddit'
  sourceType = 'reddit'
  enabled = true

  private subreddits: string[] = [
    'all',
    'forhire',
    'entrepreneur',
    'startups',
    'smallbusiness',
    'freelance',
    'webdev'
  ]

  private baseUrl = 'https://www.reddit.com'
  private sessionCookie: string
  private userAgent: string

  constructor() {
    this.sessionCookie = process.env.REDDIT_SESSION_COOKIE || ''
    this.userAgent = process.env.REDDIT_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running Reddit health check...')
      
      if (!this.sessionCookie) {
        console.log('❌ No Reddit session cookie found in .env')
        return false
      }

      const response = await fetch(`${this.baseUrl}/r/all.json?limit=1`, {
        headers: this.getHeaders()
      })
      
      if (response.ok) {
        console.log('✅ Reddit health check passed')
        return true
      } else {
        console.log(`❌ Reddit health check failed: ${response.status}`)
        return false
      }
    } catch (error) {
      console.error('❌ Reddit health check error:', error)
      return false
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Cookie': `reddit_session=${this.sessionCookie}`,
      'User-Agent': this.userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://www.reddit.com/',
      'Origin': 'https://www.reddit.com',
      'Connection': 'keep-alive',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    if (!this.sessionCookie) {
      console.error('❌ No Reddit session cookie found. Please set REDDIT_SESSION_COOKIE in .env')
      return posts
    }

    console.log(`🔍 Fetching from ${this.subreddits.length} subreddits using authenticated session...`)

    for (const subreddit of this.subreddits) {
      try {
        await this.delay(2000)
        
        const url = `${this.baseUrl}/r/${subreddit}/new.json?limit=10`
        console.log(`📡 Fetching r/${subreddit}...`)
        
        const response = await fetch(url, {
          headers: this.getHeaders()
        })

        console.log(`📡 Response status for r/${subreddit}: ${response.status}`)

        if (response.status === 429) {
          console.log(`⏳ Rate limited for r/${subreddit}, waiting 10 seconds...`)
          await this.delay(10000)
          continue
        }

        if (!response.ok) {
          console.error(`❌ Failed to fetch r/${subreddit}: ${response.status}`)
          const text = await response.text()
          console.log(`📡 Response preview: ${text.substring(0, 300)}`)
          continue
        }

        const data = await response.json()
        
        // Safe logging - check if data is an object
        if (data && typeof data === 'object') {
          console.log(`📡 Data keys: ${Object.keys(data).join(', ')}`)
        } else {
          console.log(`📡 Data is not an object: ${typeof data}`)
        }
        
        const parsedPosts = this.parseJSON(data, subreddit)
        console.log(`📡 Parsed ${parsedPosts.length} posts from r/${subreddit}`)
        posts.push(...parsedPosts)

        console.log(`✅ Processed ${parsedPosts.length} posts from r/${subreddit}`)
      } catch (error) {
        console.error(`❌ Error fetching r/${subreddit}:`, error)
      }
    }

    console.log(`📊 Total posts fetched: ${posts.length}`)
    return posts
  }

  private parseJSON(data: any, subreddit: string): RawContent[] {
    const posts: RawContent[] = []
    
    try {
      console.log(`📡 Parsing JSON for r/${subreddit}...`)
      
      // Check if data has the expected structure
      if (!data || typeof data !== 'object') {
        console.log(`❌ Invalid data type: ${typeof data}`)
        return posts
      }
      
      console.log(`📡 Data kind: ${data.kind || 'unknown'}`)
      console.log(`📡 Has data property: ${!!data.data}`)
      
      const children = data.data?.children || []
      console.log(`📡 Children count: ${children.length}`)
      
      for (const child of children) {
        const post = child?.data
        
        if (post && post.title) {
          console.log(`📡 Found post: ${post.title.substring(0, 50)}...`)
          posts.push({
            id: `reddit_${post.id}`,
            source: 'reddit',
            title: post.title || '',
            content: post.selftext || post.title || '',
            url: post.permalink ? `https://reddit.com${post.permalink}` : post.url,
            author: post.author || 'unknown',
            createdAt: new Date(post.created_utc * 1000).toISOString(),
            language: 'en',
            metadata: {
              subreddit: subreddit,
              score: post.score || 0,
              num_comments: post.num_comments || 0,
              original_id: post.id || ''
            }
          })
        }
      }
    } catch (error) {
      console.error('Error parsing JSON:', error)
    }

    return posts
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}