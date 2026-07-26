import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function setupCrawlerRoutes(app: FastifyInstance) {
  // Get all crawlers
  app.get('/api/crawlers', async (request: FastifyRequest, reply: FastifyReply) => {
    const crawlerManager = app.crawlerManager
    if (!crawlerManager) {
      reply.status(503)
      return { error: 'Crawler manager not initialized' }
    }

    const plugins = crawlerManager.getPlugins()
    const health = await crawlerManager.healthCheckAll()
    
    return {
      crawlers: plugins.map(name => ({
        name,
        enabled: true,
        healthy: health[name] || false
      }))
    }
  })

  // Run a specific crawler
  app.post('/api/crawlers/:name/run', async (request: FastifyRequest, reply: FastifyReply) => {
    const { name } = request.params as { name: string }
    const crawlerManager = app.crawlerManager
    
    if (!crawlerManager) {
      reply.status(503)
      return { error: 'Crawler manager not initialized' }
    }

    try {
      const results = await crawlerManager.runCrawler(name)
      return {
        success: true,
        name,
        itemsFound: results.length
      }
    } catch (error) {
      reply.status(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Run all crawlers
  app.post('/api/crawlers/run-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const crawlerManager = app.crawlerManager
    
    if (!crawlerManager) {
      reply.status(503)
      return { error: 'Crawler manager not initialized' }
    }

    try {
      await crawlerManager.runAllCrawlers()
      return {
        success: true,
        message: 'All crawlers executed'
      }
    } catch (error) {
      reply.status(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  })

  // Get raw content from database
  app.get('/api/raw-content', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = app.db
    const { limit = 50, offset = 0 } = request.query as any

    const { rows } = await db.query(
      `SELECT * FROM raw_content 
       ORDER BY fetched_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    return {
      items: rows,
      total: rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  })
}