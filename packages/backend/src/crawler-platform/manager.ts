import { CrawlerPlugin, RawContent } from './types'
import { OpportunityProcessor } from '../opportunity-engine'

export class CrawlerManager {
  private plugins: Map<string, CrawlerPlugin> = new Map()
  private db: any
  private opportunityProcessor: OpportunityProcessor

  constructor(db: any) {
    this.db = db
    this.opportunityProcessor = new OpportunityProcessor(db)
  }

  register(plugin: CrawlerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`⚠️ Plugin ${plugin.name} already registered, overwriting...`)
    }
    this.plugins.set(plugin.name, plugin)
    console.log(`✅ Registered crawler: ${plugin.name}`)
  }

  async runCrawler(name: string): Promise<RawContent[]> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      throw new Error(`Crawler ${name} not found`)
    }

    if (!plugin.enabled) {
      console.log(`⏭️ Crawler ${name} is disabled, skipping...`)
      return []
    }

    try {
      console.log(`🔄 Running crawler: ${name}`)
      const startTime = Date.now()

      const content = await plugin.fetch()
      console.log(`📥 Raw content fetched: ${content.length} items`)

      if (content.length === 0) {
        console.log(`⚠️ No content returned from ${name}`)
        return []
      }

      let storedCount = 0
      let opportunityCount = 0

      for (const item of content) {
        try {
          const hash = this.generateHash(item.content)
          
          // Store raw content
          await this.db.query(
            `INSERT INTO raw_content 
             (id, source_identifier, title, content, url, author, language, metadata, content_hash, fetched_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(content_hash) DO NOTHING`,
            [
              item.id,
              item.source,
              item.title,
              item.content,
              item.url,
              item.author || null,
              item.language || 'en',
              JSON.stringify(item.metadata || {}),
              hash
            ]
          )
          storedCount++

          // Process for opportunities
          const opportunities = await this.opportunityProcessor.processRawContent({
            id: item.id,
            title: item.title,
            content: item.content,
            url: item.url,
            source: item.source,
            author: item.author || 'unknown',
            createdAt: item.createdAt,
            metadata: item.metadata
          })
          opportunityCount += opportunities.length

        } catch (error) {
          console.error(`Error storing item ${item.id}:`, error)
        }
      }

      const duration = Date.now() - startTime
      console.log(`✅ Crawler ${name} completed: ${storedCount} items stored, ${opportunityCount} opportunities created in ${duration}ms`)

      return content
    } catch (error) {
      console.error(`❌ Crawler ${name} failed:`, error)
      throw error
    }
  }

  // ... rest of the class remains the same
  async runAllCrawlers(): Promise<void> {
    console.log('🔄 Running all crawlers...')
    
    for (const [name, plugin] of this.plugins) {
      if (plugin.enabled) {
        try {
          await this.runCrawler(name)
        } catch (error) {
          console.error(`Error running crawler ${name}:`, error)
        }
      }
    }
    
    console.log('✅ All crawlers completed')
  }

  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    
    for (const [name, plugin] of this.plugins) {
      try {
        results[name] = await plugin.healthCheck()
      } catch {
        results[name] = false
      }
    }
    
    return results
  }

  getPlugins(): string[] {
    return Array.from(this.plugins.keys())
  }

  private generateHash(text: string): string {
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }
}