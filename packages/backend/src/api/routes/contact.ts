import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { OpportunityManager } from '../../opportunity-engine'

export async function setupContactRoutes(app: FastifyInstance) {
  // Test route (keep this)
  app.get('/api/contact-test', async (request: FastifyRequest, reply: FastifyReply) => {
    return { message: 'Contact routes are loaded!' }
  })

  // Get contact info for an opportunity
  app.get('/api/opportunities/:id/contact', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    
    console.log(`📡 Contact route called for opportunity: ${id}`)
    
    try {
      const opportunityManager = new OpportunityManager(app.db)
      const info = await opportunityManager.getContactInfo(id)
      
      console.log(`📡 Contact info:`, info)
      
      if (!info) {
        reply.status(404)
        return { error: 'Opportunity not found' }
      }

      const history = await opportunityManager.getContactHistory(id)
      const template = await opportunityManager.generateMessageTemplate(id)

      return { 
        contact: info, 
        history,
        template 
      }
    } catch (error) {
      console.error('Error in contact route:', error)
      reply.status(500)
      return { error: 'Internal server error' }
    }
  })

  // Mark as contacted
  app.post('/api/opportunities/:id/contact', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const { method, message, followUpAt, notes } = request.body as {
      method: string
      message: string
      followUpAt?: string
      notes?: string
    }

    if (!method || !message) {
      reply.status(400)
      return { error: 'Method and message are required' }
    }

    try {
      const opportunityManager = new OpportunityManager(app.db)
      await opportunityManager.markContacted(id, { method, message, followUpAt, notes })
      return { success: true }
    } catch (error) {
      console.error('Error marking contacted:', error)
      reply.status(500)
      return { error: 'Internal server error' }
    }
  })

  // Mark response received
  app.post('/api/opportunities/:id/response', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const { responseText } = request.body as { responseText: string }

    if (!responseText) {
      reply.status(400)
      return { error: 'Response text is required' }
    }

    try {
      const opportunityManager = new OpportunityManager(app.db)
      await opportunityManager.markResponseReceived(id, responseText)
      return { success: true }
    } catch (error) {
      console.error('Error logging response:', error)
      reply.status(500)
      return { error: 'Internal server error' }
    }
  })

  // Get message template
  app.get('/api/opportunities/:id/template', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    
    try {
      const opportunityManager = new OpportunityManager(app.db)
      const template = await opportunityManager.generateMessageTemplate(id)
      return { template }
    } catch (error) {
      console.error('Error generating template:', error)
      reply.status(500)
      return { error: 'Internal server error' }
    }
  })
}