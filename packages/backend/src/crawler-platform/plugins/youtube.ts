import { RawContent, CrawlerPlugin } from '../types'
import { google } from 'googleapis'

interface YouTubeComment {
  id: string
  text: string
  author: string
  publishedAt: string
  likeCount: number
  videoId: string
  videoTitle: string
  channelId: string
  channelTitle: string
}

export class YouTubePlugin implements CrawlerPlugin {
  name = 'YouTube'
  sourceType = 'youtube'
  enabled = true

  private apiKey: string
  private searchQueries: string[]
  private maxResults: number

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || ''
    this.searchQueries = (process.env.YOUTUBE_SEARCH_QUERIES || 'looking for web developer,hiring developer,need website help,freelance web designer').split(',')
    this.maxResults = parseInt(process.env.YOUTUBE_MAX_RESULTS || '10')
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running YouTube health check...')
      
      if (!this.apiKey) {
        console.log('❌ YouTube API key not configured')
        return false
      }

      const youtube = google.youtube({ version: 'v3', auth: this.apiKey })
      const response = await youtube.search.list({
        part: ['snippet'],
        q: 'test',
        maxResults: 1
      })

      console.log('✅ YouTube health check passed')
      return response.status === 200
    } catch (error) {
      console.error('❌ YouTube health check failed:', error)
      return false
    }
  }

  private getYouTubeClient() {
    return google.youtube({ version: 'v3', auth: this.apiKey })
  }

  private async searchVideos(query: string): Promise<any[]> {
    try {
      const youtube = this.getYouTubeClient()
      const response = await youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        maxResults: this.maxResults,
        order: 'relevance',
        relevanceLanguage: 'en'
      })

      return response.data.items || []
    } catch (error) {
      console.error(`Error searching YouTube for "${query}":`, error)
      return []
    }
  }

  private async getVideoComments(videoId: string): Promise<any[]> {
    try {
      const youtube = this.getYouTubeClient()
      const response = await youtube.commentThreads.list({
        part: ['snippet', 'replies'],
        videoId: videoId,
        maxResults: 20,
        order: 'relevance'
      })

      const comments: any[] = []
      
      for (const thread of response.data.items || []) {
        const topComment = thread.snippet?.topLevelComment?.snippet
        if (topComment) {
          comments.push({
            id: thread.id,
            text: topComment.textDisplay || '',
            author: topComment.authorDisplayName || 'unknown',
            publishedAt: topComment.publishedAt || new Date().toISOString(),
            likeCount: topComment.likeCount || 0,
            totalReplyCount: thread.snippet?.totalReplyCount || 0
          })
        }

        // Get replies if they exist
        if (thread.replies && thread.replies.comments) {
          for (const reply of thread.replies.comments) {
            const replySnippet = reply.snippet
            if (replySnippet) {
              comments.push({
                id: reply.id,
                text: replySnippet.textDisplay || '',
                author: replySnippet.authorDisplayName || 'unknown',
                publishedAt: replySnippet.publishedAt || new Date().toISOString(),
                likeCount: replySnippet.likeCount || 0,
                isReply: true
              })
            }
          }
        }
      }

      return comments
    } catch (error) {
      console.error(`Error fetching comments for video ${videoId}:`, error)
      return []
    }
  }

  private isValidOpportunity(text: string): boolean {
    // Check if the comment contains opportunity-related keywords
    const opportunityKeywords = [
      'looking for', 'hiring', 'need', 'freelance', 'hire',
      'developer', 'designer', 'builder', 'create', 'build',
      'project', 'work', 'contract', 'help', 'assist'
    ]
    
    const lowerText = text.toLowerCase()
    return opportunityKeywords.some(keyword => lowerText.includes(keyword))
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    if (!this.apiKey) {
      console.error('❌ YouTube API key not configured')
      return posts
    }

    console.log(`🔍 Fetching from YouTube...`)

    for (const query of this.searchQueries) {
      try {
        await this.delay(1000)
        console.log(`📡 Searching YouTube for: "${query}"...`)

        const videos = await this.searchVideos(query)
        console.log(`📡 Found ${videos.length} videos for "${query}"`)

        for (const video of videos) {
          try {
            const videoId = video.id?.videoId
            const snippet = video.snippet
            const videoTitle = snippet?.title || ''
            const channelTitle = snippet?.channelTitle || ''

            if (!videoId) continue

            console.log(`📡 Fetching comments for video: ${videoTitle}`)

            const comments = await this.getVideoComments(videoId)

            for (const comment of comments) {
              const text = comment.text || ''
              
              // Only include comments that look like opportunities
              if (!this.isValidOpportunity(text)) continue
              
              // Skip short comments
              if (text.length < 20) continue

              posts.push({
                id: `youtube_${comment.id}`,
                source: 'youtube',
                title: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                content: text,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                author: comment.author || 'unknown',
                createdAt: comment.publishedAt || new Date().toISOString(),
                language: 'en',
                metadata: {
                  videoId: videoId,
                  videoTitle: videoTitle,
                  channelTitle: channelTitle,
                  likeCount: comment.likeCount || 0,
                  isReply: comment.isReply || false,
                  totalReplyCount: comment.totalReplyCount || 0
                }
              })
            }

            // Add a small delay between videos to avoid rate limiting
            await this.delay(500)
          } catch (videoError) {
            console.error(`Error processing video:`, videoError)
          }
        }

        console.log(`✅ Processed ${posts.length} comments from YouTube`)
      } catch (error) {
        console.error(`❌ Error searching YouTube query "${query}":`, error)
      }
    }

    console.log(`📊 Total posts fetched from YouTube: ${posts.length}`)
    return posts
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}