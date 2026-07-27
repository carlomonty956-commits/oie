import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { OpportunityManager } from '../../opportunity-engine'

export async function setupContactRoutes(app: FastifyInstance) {
  const opportunityManager = new OpportunityManager(app.db)

  // GET contact info
  app.get('/api/opportunities/:id/contact', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    
    try {
      const opportunity = await opportunityManager.getOpportunity(id)
      if (!opportunity) {
        reply.status(404)
        return { error: 'Opportunity not found' }
      }

      const contactInfo = await opportunityManager.extractContactInfo(id)
      const history = await opportunityManager.getContactHistory(id)
      const template = await opportunityManager.generateMessageTemplate(id)

      return { 
        contact: contactInfo,
        history,
        template,
        platform: opportunity.source || 'unknown'
      }
    } catch (error) {
      console.error('Error in contact route:', error)
      reply.status(500)
      return { error: 'Internal server error' }
    }
  })

  // POST - Mark as contacted
  app.post('/api/opportunities/:id/contact', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const { method, message, followUpAt, notes } = body

    if (!message) {
      reply.status(400)
      return { error: 'Message is required' }
    }

    try {
      await opportunityManager.markContacted(id, { 
        method: method || 'external', 
        message, 
        followUpAt, 
        notes 
      })
      return { success: true }
    } catch (error) {
      console.error('Error marking contacted:', error)
      reply.status(500)
      return { error: 'Internal server error' }
    }
  })

  // GET message template
  app.get('/api/opportunities/:id/template', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    
    try {
      const template = await opportunityManager.generateMessageTemplate(id)
      return { template }
    } catch (error) {
      console.error('Error generating template:', error)
      reply.status(500)
      return { error: 'Failed to generate template' }
    }
  })
}