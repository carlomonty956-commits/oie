import { RawContent, CrawlerPlugin } from '../types'

export class XPlugin implements CrawlerPlugin {
  name = 'X'
  sourceType = 'x'
  enabled = true

  private authToken: string
  private ct0: string
  private searchQueries: string[] = [
    'looking for web developer',
    'hiring web developer',
    'need website help',
    'Shopify developer hired',
    'freelance web designer'
  ]

  constructor() {
    this.authToken = process.env.X_AUTH_TOKEN || ''
    this.ct0 = process.env.X_CT0 || ''
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running X health check...')
      
      if (!this.authToken || !this.ct0) {
        console.log('❌ X credentials not configured')
        return false
      }

      const response = await fetch('https://x.com/i/api/1.1/account/settings.json', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Cookie': `auth_token=${this.authToken}; ct0=${this.ct0}`,
          'x-csrf-token': this.ct0,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      console.log(`✅ X health check: ${response.status}`)
      return response.ok
    } catch (error) {
      console.log('❌ X health check failed:', error)
      return false
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Cookie': `auth_token=${this.authToken}; ct0=${this.ct0}`,
      'x-csrf-token': this.ct0,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    }
  }

  private parseTweets(data: any): RawContent[] {
    const posts: RawContent[] = []

    try {
      // Parse X's complex JSON response
      const instructions = data?.data?.search_by_raw_query?.search_timeline?.timeline?.instructions || []
      
      for (const instruction of instructions) {
        if (instruction.type === 'TimelineAddEntries') {
          const entries = instruction.entries || []
          
          for (const entry of entries) {
            const content = entry.content?.itemContent?.tweet_results?.result
            if (!content) continue

            const tweet = content.legacy || content.core?.user_results?.result?.legacy
            if (!tweet) continue

            // Skip retweets
            if (tweet.retweeted) continue

            const username = content.core?.user_results?.result?.legacy?.screen_name || 'unknown'
            const text = tweet.full_text || tweet.text || ''

            if (text.length < 30) continue

            posts.push({
              id: `x_${tweet.id_str}`,
              source: 'x',
              title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
              content: text,
              url: `https://twitter.com/${username}/status/${tweet.id_str}`,
              author: username,
              createdAt: new Date(tweet.created_at).toISOString(),
              language: 'en',
              metadata: {
                username: username,
                favorite_count: tweet.favorite_count || 0,
                retweet_count: tweet.retweet_count || 0,
                reply_count: tweet.reply_count || 0,
                original_id: tweet.id_str
              }
            })
          }
        }
      }
    } catch (error) {
      console.error('Error parsing X response:', error)
    }

    return posts
  }

  private cleanQuery(query: string): string {
    return encodeURIComponent(query)
  }

  async fetch(): Promise<RawContent[]> {
    const allPosts: RawContent[] = []

    if (!this.authToken || !this.ct0) {
      console.error('❌ X credentials not configured. Set X_AUTH_TOKEN and X_CT0 in .env')
      return allPosts
    }

    console.log(`🔍 Fetching from X (Twitter) using ${this.searchQueries.length} queries...`)

    for (const query of this.searchQueries) {
      try {
        await this.delay(4000) // 4 second delay between queries
        console.log(`📡 Searching X: "${query}"...`)

        // X GraphQL search endpoint
        const searchUrl = `https://x.com/i/api/graphql/3bwVYBhC6Gg9k1nFfRjf6Q/SearchTimeline?variables=${encodeURIComponent(JSON.stringify({
          rawQuery: query,
          count: 20,
          querySource: 'typed_query',
          product: 'Top'
        }))}`

        const response = await fetch(searchUrl, {
          headers: this.getHeaders()
        })

        if (!response.ok) {
          console.log(`⚠️ X search failed with status: ${response.status}`)
          continue
        }

        const data = await response.json()
        const parsedPosts = this.parseTweets(data)
        allPosts.push(...parsedPosts)

        console.log(`✅ Found ${parsedPosts.length} relevant tweets from X`)
      } catch (error: any) {
        console.error(`❌ Error searching X query "${query}":`, error.message)
      }
    }

    console.log(`📊 Total posts fetched from X: ${allPosts.length}`)
    return allPosts
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}