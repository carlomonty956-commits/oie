import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { LearningEngine } from '../../opportunity-engine/services/learning-engine'

export async function setupLearningRoutes(app: FastifyInstance) {
  const learningEngine = new LearningEngine(app.db)

  // Get keyword weights for a project
  app.get('/api/projects/:projectId/learning/weights', async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string }
    
    try {
      const weights = await learningEngine.getKeywordWeights(projectId)
      return { weights }
    } catch (error) {
      console.error('Error fetching weights:', error)
      reply.status(500)
      return { error: 'Failed to fetch weights' }
    }
  })

  // Get top keywords for a project
  app.get('/api/projects/:projectId/learning/top-keywords', async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string }
    const { limit = '10' } = request.query as { limit?: string }
    
    try {
      const limitNum = parseInt(limit, 10)
      if (isNaN(limitNum) || limitNum < 1) {
        reply.status(400)
        return { error: 'Invalid limit parameter' }
      }
      
      const keywords = await learningEngine.getTopKeywords(projectId, limitNum)
      return { keywords }
    } catch (error) {
      console.error('Error fetching top keywords:', error)
      reply.status(500)
      return { error: 'Failed to fetch top keywords' }
    }
  })

  // Get source quality scores
  app.get('/api/learning/source-quality', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const scores = await learningEngine.getSourceQuality()
      return { scores }
    } catch (error) {
      console.error('Error fetching source quality:', error)
      reply.status(500)
      return { error: 'Failed to fetch source quality' }
    }
  })
}