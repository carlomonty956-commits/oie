import { RawContent, CrawlerPlugin } from '../types'
import { TwitterApi } from 'twitter-api-v2'

export class XPlugin implements CrawlerPlugin {
  name = 'X'
  sourceType = 'x'
  enabled = true

  private client: TwitterApi
  private searchQueries: string[] = [
    '"looking for" web developer',
    '"hiring" web developer',
    '"need" website help',
    '"looking for" Shopify',
    '"hire" freelancer',
    'web developer freelance',
    'Shopify developer hired'
  ]

  constructor() {
    const consumerKey = process.env.X_CONSUMER_KEY || ''
    const consumerSecret = process.env.X_CONSUMER_SECRET || ''
    const accessToken = process.env.X_ACCESS_TOKEN || ''
    const accessSecret = process.env.X_ACCESS_TOKEN_SECRET || ''

    if (consumerKey && consumerSecret && accessToken && accessSecret) {
      this.client = new TwitterApi({
        appKey: consumerKey,
        appSecret: consumerSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      })
      console.log('✅ X: Using OAuth 1.0a authentication')
    } else {
      console.warn('⚠️ X credentials not configured properly. Please check your .env file.')
      this.client = new TwitterApi('dummy')
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running X health check...')
      
      const result = await this.client.v2.search('test', {
        max_results: 1,
      })

      console.log('✅ X health check passed')
      return true
    } catch (error: any) {
      console.log(`❌ X health check failed: ${error.message}`)
      return false
    }
  }

  private parseTweet(tweet: any): RawContent | null {
    try {
      const text = tweet.text || ''
      
      if (text.length < 30) return null
      
      if (tweet.retweeted) return null

      const author = tweet.author_id || 'unknown'
      const createdAt = tweet.created_at || new Date().toISOString()

      return {
        id: `x_${tweet.id}`,
        source: 'x',
        title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        content: text,
        url: `https://twitter.com/user/status/${tweet.id}`,
        author: author,
        createdAt: createdAt,
        language: 'en',
        metadata: {
          conversation_id: tweet.conversation_id,
          reply_count: tweet.reply_count || 0,
          retweet_count: tweet.retweet_count || 0,
          like_count: tweet.like_count || 0,
          quote_count: tweet.quote_count || 0,
          original_id: tweet.id
        }
      }
    } catch (error) {
      console.error('Error parsing tweet:', error)
      return null
    }
  }

  async fetch(): Promise<RawContent[]> {
    const allPosts: RawContent[] = []

    console.log(`🔍 Fetching from X (Twitter) via OAuth 1.0a...`)

    if (!this.client || this.client === new TwitterApi('dummy')) {
      console.error('❌ X client not properly configured. Skipping fetch.')
      return allPosts
    }

    for (const query of this.searchQueries) {
      try {
        await this.delay(3000)
        
        console.log(`📡 Searching X: "${query}"...`)
        
        const result = await this.client.v2.search(query, {
          max_results: 10,
          'tweet.fields': [
            'created_at',
            'author_id',
            'conversation_id',
            'reply_count',
            'retweet_count',
            'like_count',
            'quote_count',
            'source'
          ].join(','),
          expansions: ['author_id'],
          'user.fields': ['username', 'name', 'verified']
        })

        // Extract tweets - result.data is the tweet array
        let tweetList: any[] = []
        
        // result.data is the array of tweets
        if (result && result.data) {
          if (Array.isArray(result.data)) {
            tweetList = result.data
          } else {
            // If it's not an array, try to find the data property
            const dataObj = result.data as any
            if (dataObj && typeof dataObj === 'object') {
              if (Array.isArray(dataObj.data)) {
                tweetList = dataObj.data
              } else if (Array.isArray(dataObj)) {
                tweetList = dataObj
              }
            }
          }
        }

        if (tweetList.length === 0) {
          console.log(`⚠️ No tweets found for: "${query}"`)
          continue
        }

        console.log(`📡 Found ${tweetList.length} tweets for: "${query}"`)

        // Get users data for author names
        const users = result.includes?.users || []
        const userMap: Record<string, any> = {}
        for (const user of users) {
          userMap[user.id] = user
        }

        let parsedCount = 0
        for (const tweet of tweetList) {
          const parsed = this.parseTweet(tweet)
          if (parsed) {
            const user = userMap[tweet.author_id]
            if (user) {
              parsed.author = user.username || user.name || parsed.author
            }
            allPosts.push(parsed)
            parsedCount++
          }
        }

        console.log(`✅ Found ${parsedCount} relevant tweets from X`)
      } catch (error: any) {
        console.error(`❌ Error searching X query "${query}":`, error.message)
        
        if (error.message && error.message.toLowerCase().includes('rate limit')) {
          console.log('⏳ Rate limited, waiting 60 seconds...')
          await this.delay(60000)
        }
        
        if (error.message && error.message.includes('401')) {
          console.error('❌ Unauthorized - Check your X credentials in .env')
          break
        }
        
        if (error.message && error.message.includes('402')) {
          console.error('❌ Payment Required - Add a payment method to your X Developer account')
          break
        }
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