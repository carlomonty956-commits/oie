import fastify from 'fastify'
import dotenv from 'dotenv'
import { setupDatabase } from './database'
import { setupCors } from './api/middleware/cors'
import { setupHelmet } from './api/middleware/helmet'
import { setupRateLimit } from './api/middleware/rate-limit'
import { setupLogging } from './utils/logger'
import { setupHealthRoutes } from './api/routes/health'
import { setupProjectRoutes } from './api/routes/projects'
import { setupOpportunityRoutes } from './api/routes/opportunities'
import { setupCrawlerRoutes } from './api/routes/crawlers'
import { setupDashboardRoutes } from './api/routes/dashboard'
import { setupNotificationRoutes } from './api/routes/notifications'
import { setupContactRoutes } from './api/routes/contact'
import { 
  CrawlerManager, 
  CrawlerScheduler, 
  RedditPlugin,
  HackerNewsPlugin,
  GitHubPlugin,
  RSSPlugin,
  XPlugin,
  DevToPlugin,
  LobstersPlugin,
  IndieHackersPlugin
} from './crawler-platform'

dotenv.config()

const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = process.env.HOST || '0.0.0.0'

const app = fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  } : true
})

let db: any
let crawlerManager: CrawlerManager
let crawlerScheduler: CrawlerScheduler

async function start() {
  try {
    // Connect to database
    db = await setupDatabase()
    app.decorate('db', db)

    // Setup middleware
    await setupCors(app)
    await setupHelmet(app)
    await setupRateLimit(app)
    setupLogging(app)

    // Initialize crawler platform
    console.log('🔄 Initializing crawler platform...')
    
    crawlerManager = new CrawlerManager(db)
    app.decorate('crawlerManager', crawlerManager)
    
    // Register all plugins
    const redditPlugin = new RedditPlugin()
    crawlerManager.register(redditPlugin)
    
    const hackerNewsPlugin = new HackerNewsPlugin()
    crawlerManager.register(hackerNewsPlugin)
    
    const gitHubPlugin = new GitHubPlugin()
    crawlerManager.register(gitHubPlugin)
    
    const rssPlugin = new RSSPlugin()
    crawlerManager.register(rssPlugin)
    
    // Add X plugin (may not work without payment method)
    const xPlugin = new XPlugin()
    crawlerManager.register(xPlugin)
    
    // Add new free crawlers
    const devToPlugin = new DevToPlugin()
    crawlerManager.register(devToPlugin)
    
    const lobstersPlugin = new LobstersPlugin()
    crawlerManager.register(lobstersPlugin)
    
    const indieHackersPlugin = new IndieHackersPlugin()
    crawlerManager.register(indieHackersPlugin)
    
    console.log('✅ All crawlers registered: Reddit, HackerNews, GitHub, RSS, X, DevTo, Lobsters, IndieHackers')

    // Create scheduler
    crawlerScheduler = new CrawlerScheduler(crawlerManager)
    
    // Schedule all crawlers
    await crawlerScheduler.schedule('Reddit', process.env.CRAWLER_INTERVAL_REDDIT || '*/5 * * * *')
    await crawlerScheduler.schedule('HackerNews', process.env.CRAWLER_INTERVAL_HN || '*/5 * * * *')
    await crawlerScheduler.schedule('GitHub', process.env.CRAWLER_INTERVAL_GITHUB || '*/15 * * * *')
    await crawlerScheduler.schedule('RSS', process.env.CRAWLER_INTERVAL_RSS || '0 */30 * * * *')
    await crawlerScheduler.schedule('X', process.env.CRAWLER_INTERVAL_X || '*/10 * * * *')
    await crawlerScheduler.schedule('DevTo', process.env.CRAWLER_INTERVAL_DEVTO || '*/10 * * * *')
    await crawlerScheduler.schedule('Lobsters', process.env.CRAWLER_INTERVAL_LOBSTERS || '*/15 * * * *')
    await crawlerScheduler.schedule('IndieHackers', process.env.CRAWLER_INTERVAL_INDIEHACKERS || '*/20 * * * *')
    
    console.log('✅ Crawler platform initialized')

    // Setup routes
    setupHealthRoutes(app)
    setupProjectRoutes(app)
    setupOpportunityRoutes(app)
    setupCrawlerRoutes(app)
    setupDashboardRoutes(app)
    setupNotificationRoutes(app)
    setupContactRoutes(app)

    // Start server
    await app.listen({ port: PORT, host: HOST })
    
    console.log(`🚀 OIE Backend running on http://${HOST}:${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV}`)
    console.log(`📋 Registered crawlers: ${crawlerManager.getPlugins().join(', ')}`)

  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  if (crawlerScheduler) {
    crawlerScheduler.stopAll()
  }
  await app.close()
  if (db && db.end) {
    await db.end()
  }
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  if (crawlerScheduler) {
    crawlerScheduler.stopAll()
  }
  await app.close()
  if (db && db.end) {
    await db.end()
  }
  process.exit(0)
})

start()

export { app }