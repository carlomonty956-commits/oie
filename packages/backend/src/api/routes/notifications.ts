import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function setupNotificationRoutes(app: FastifyInstance) {
  // Get unread count
  app.get('/api/notifications/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers['x-user-id'] || 'default-user'
      const db = app.db
      
      // Check if table exists first
      const tableCheck = await db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='notifications'"
      )
      
      if (tableCheck.rows.length === 0) {
        return { unread: 0 }
      }
      
      const result = await db.query(
        'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND read = 0',
        [userId]
      )
      
      return { unread: parseInt(result.rows[0]?.unread || 0) }
    } catch (error) {
      console.error('Error getting unread count:', error)
      return { unread: 0 }
    }
  })

  // Get notifications
  app.get('/api/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit = 50, unreadOnly } = request.query as any
      const userId = request.headers['x-user-id'] || 'default-user'
      const db = app.db
      
      let query = 'SELECT * FROM notifications WHERE user_id = ?'
      const params: any[] = [userId]

      if (unreadOnly === 'true') {
        query += ' AND read = 0'
      }
      
      query += ' ORDER BY created_at DESC LIMIT ?'
      params.push(parseInt(limit))
      
      const result = await db.query(query, params)
      return { notifications: result.rows }
    } catch (error) {
      console.error('Error getting notifications:', error)
      return { notifications: [] }
    }
  })

  // Mark as read
  app.patch('/api/notifications/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const db = app.db
      
      await db.query(
        'UPDATE notifications SET read = 1 WHERE id = ?',
        [id]
      )
      
      return { success: true }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      reply.status(500)
      return { error: 'Failed to mark as read' }
    }
  })

  // Mark all as read
  app.patch('/api/notifications/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers['x-user-id'] || 'default-user'
      const db = app.db
      
      await db.query(
        'UPDATE notifications SET read = 1 WHERE user_id = ?',
        [userId]
      )
      
      return { success: true }
    } catch (error) {
      console.error('Error marking all as read:', error)
      reply.status(500)
      return { error: 'Failed to mark all as read' }
    }
  })

  // Create a test notification
  app.post('/api/notifications/test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.headers['x-user-id'] || 'default-user'
      const db = app.db
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
      
      await db.query(
        `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, userId, 'test', 'Test Notification', 'This is a test notification from OIE', 0]
      )
      
      return { success: true, message: 'Test notification created' }
    } catch (error) {
      console.error('Error creating test notification:', error)
      reply.status(500)
      return { error: 'Failed to create test notification' }
    }
  })
}