import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function setupHealthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    }
  })

  app.get('/health/db', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check if db exists on app
      if (!app.db) {
        reply.status(503)
        return {
          status: 'error',
          connected: false,
          error: 'Database not initialized'
        }
      }

      // Try to query the database
      const result = await app.db.query('SELECT 1 as connected')
      
      return {
        status: 'ok',
        connected: true,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      reply.status(503)
      return {
        status: 'error',
        connected: false,
        error: error instanceof Error ? error.message : 'Database connection failed'
      }
    }
  })
}