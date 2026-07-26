import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { OpportunityManager } from '../../opportunity-engine'
import { LearningEngine } from '../../opportunity-engine/services/learning-engine'

export async function setupOpportunityRoutes(app: FastifyInstance) {
  const opportunityManager = new OpportunityManager(app.db)
  const learningEngine = new LearningEngine(app.db)

  // Get opportunities for a project
  app.get('/api/projects/:projectId/opportunities', async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string }
    const { limit = 50, offset = 0, status } = request.query as any

    try {
      const opportunities = await opportunityManager.getOpportunitiesByProject(projectId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      })

      return { opportunities, total: opportunities.length }
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      reply.status(500)
      return { error: 'Failed to fetch opportunities' }
    }
  })

  // Get opportunity details
  app.get('/api/opportunities/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    
    try {
      const opportunity = await opportunityManager.getOpportunity(id)

      if (!opportunity) {
        reply.status(404)
        return { error: 'Opportunity not found' }
      }

      return { opportunity }
    } catch (error) {
      console.error('Error fetching opportunity:', error)
      reply.status(500)
      return { error: 'Failed to fetch opportunity' }
    }
  })

  // Update opportunity status
  app.patch('/api/opportunities/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    const validStatuses = ['new', 'reviewed', 'good_lead', 'converted', 'rejected']
    if (!validStatuses.includes(status)) {
      reply.status(400)
      return { error: 'Invalid status' }
    }

    try {
      const db = app.db
      const result = await db.run(
        'UPDATE opportunities SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      )

      if (result.changes === 0) {
        reply.status(404)
        return { error: 'Opportunity not found' }
      }

      return { success: true, status }
    } catch (error) {
      console.error('Error updating status:', error)
      reply.status(500)
      return { error: 'Failed to update status' }
    }
  })

  // Submit feedback for an opportunity
  app.post('/api/opportunities/:id/feedback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const { action, comment } = request.body as { action: string, comment?: string }
    const userId = request.headers['x-user-id'] || 'default-user'

    const validActions = ['excellent', 'good', 'bad', 'spam', 'converted', 'ignored']
    if (!validActions.includes(action)) {
      reply.status(400)
      return { error: 'Invalid feedback action' }
    }

    try {
      const feedback = await opportunityManager.addFeedback({
        opportunityId: id,
        userId: userId as string,
        action: action as any,
        comment
      })

      // Process learning from feedback
      await learningEngine.processFeedback(id, action)

      return { feedback }
    } catch (error) {
      console.error('Error adding feedback:', error)
      reply.status(500)
      return { error: 'Failed to add feedback' }
    }
  })

  // Get feedback stats for a project
  app.get('/api/projects/:projectId/feedback-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string }
    
    try {
      const stats = await opportunityManager.getFeedbackStats(projectId)
      return { stats }
    } catch (error) {
      console.error('Error fetching feedback stats:', error)
      reply.status(500)
      return { error: 'Failed to fetch feedback stats' }
    }
  })

  // Get opportunities summary
  app.get('/api/opportunities/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const db = app.db
      
      const result = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
          SUM(CASE WHEN status = 'good_lead' THEN 1 ELSE 0 END) as good_lead,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          AVG(score) as avg_score
        FROM opportunities
      `)

      return { summary: result.rows[0] || { total: 0, new: 0, good_lead: 0, converted: 0, rejected: 0, avg_score: 0 } }
    } catch (error) {
      console.error('Error fetching summary:', error)
      reply.status(500)
      return { error: 'Failed to fetch summary' }
    }
  })
}