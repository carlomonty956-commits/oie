import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { OpportunityManager } from '../../opportunity-engine'

export async function setupOpportunityRoutes(app: FastifyInstance) {
  const opportunityManager = new OpportunityManager(app.db)

  // Get opportunities for a project
  app.get('/api/projects/:projectId/opportunities', async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string }
    const { limit = 50, offset = 0, status } = request.query as any

    const opportunities = await opportunityManager.getOpportunitiesByProject(projectId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      status
    })

    return { opportunities, total: opportunities.length }
  })

  // Get opportunity details
  app.get('/api/opportunities/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const opportunity = await opportunityManager.getOpportunity(id)

    if (!opportunity) {
      reply.status(404)
      return { error: 'Opportunity not found' }
    }

    return { opportunity }
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

    await opportunityManager.updateStatus(id, status as any)
    return { success: true, status }
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

    const feedback = await opportunityManager.addFeedback({
      opportunityId: id,
      userId: userId as string,
      action: action as any,
      comment
    })

    return { feedback }
  })

  // Get feedback stats for a project
  app.get('/api/projects/:projectId/feedback-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const { projectId } = request.params as { projectId: string }
    const stats = await opportunityManager.getFeedbackStats(projectId)
    return { stats }
  })

  // Get opportunities summary
  app.get('/api/opportunities/summary', async (request: FastifyRequest, reply: FastifyReply) => {
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

    return { summary: result.rows[0] }
  })
}