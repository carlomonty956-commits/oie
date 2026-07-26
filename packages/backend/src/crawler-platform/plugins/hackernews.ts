import { RawContent, CrawlerPlugin } from '../types'

interface HackerNewsStory {
  id: number
  title: string
  text?: string
  url?: string
  by?: string
  time: number
  score?: number
  descendants?: number
  type?: string
  deleted?: boolean
}

export class HackerNewsPlugin implements CrawlerPlugin {
  name = 'HackerNews'
  sourceType = 'hackernews'
  enabled = true

  private baseUrl = 'https://hacker-news.firebaseio.com/v0'
  private topStoriesCount = 30
  private maxItemsPerRun = 15

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running HackerNews health check...')
      const response = await fetch(`${this.baseUrl}/maxitem.json`)
      return response.ok
    } catch {
      return false
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    try {
      console.log('📡 Fetching top stories from Hacker News...')
      
      const response = await fetch(`${this.baseUrl}/topstories.json`)
      if (!response.ok) {
        console.error(`❌ Failed to fetch top stories: ${response.status}`)
        return posts
      }
      
      const storyIds = await response.json() as number[]
      console.log(`📡 Found ${storyIds.length} top stories`)
      
      const storiesToFetch = storyIds.slice(0, this.topStoriesCount)
      let fetchedCount = 0
      
      for (const id of storiesToFetch) {
        if (fetchedCount >= this.maxItemsPerRun) break
        
        try {
          await this.delay(200)
          
          const storyResponse = await fetch(`${this.baseUrl}/item/${id}.json`)
          if (!storyResponse.ok) continue
          
          const story = await storyResponse.json() as HackerNewsStory
          
          if (!story || story.deleted || !story.title) continue
          
          posts.push({
            id: `hn_${story.id}`,
            source: 'hackernews',
            title: story.title || '',
            content: story.text || story.title || '',
            url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
            author: story.by || 'unknown',
            createdAt: new Date(story.time * 1000).toISOString(),
            language: 'en',
            metadata: {
              score: story.score || 0,
              descendants: story.descendants || 0,
              type: story.type || 'story'
            }
          })
          
          fetchedCount++
        } catch (error) {
          console.error(`❌ Error fetching story ${id}:`, error)
        }
      }
      
      console.log(`✅ Processed ${posts.length} stories from Hacker News`)
    } catch (error) {
      console.error('❌ Error fetching Hacker News:', error)
    }

    console.log(`📊 Total posts fetched from HackerNews: ${posts.length}`)
    return posts
  }

  normalize(data: RawContent): RawContent {
    return data
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}