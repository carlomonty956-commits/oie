import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function setupProjectRoutes(app: FastifyInstance) {
  app.get('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = app.db
    const { rows } = await db.query(
      'SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC',
      ['active']
    )
    return { projects: rows }
  })

  app.get('/api/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const db = app.db
    
    const { rows } = await db.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    )
    
    if (rows.length === 0) {
      reply.status(404)
      return { error: 'Project not found' }
    }
    
    return { project: rows[0] }
  })

  app.post('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any
    const { name, description, config } = body
    
    if (!name) {
      reply.status(400)
      return { error: 'Name is required' }
    }

    const db = app.db
    const userId = request.headers['x-user-id'] || 'default-user'
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()

    const { rows } = await db.query(
      `INSERT INTO projects (id, name, description, config, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, description || '', JSON.stringify(config || {}), userId]
    )

    return { project: rows[0] }
  })

  app.put('/api/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const body = request.body as any
    const { name, description, config, status } = body
    const db = app.db

    const { rows } = await db.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           config = COALESCE($3, config),
           status = COALESCE($4, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description, config ? JSON.stringify(config) : null, status, id]
    )

    if (rows.length === 0) {
      reply.status(404)
      return { error: 'Project not found' }
    }

    return { project: rows[0] }
  })

  app.delete('/api/projects/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }
    const db = app.db

    const result = await db.run(
      'DELETE FROM projects WHERE id = $1',
      [id]
    )

    if (result.changes === 0) {
      reply.status(404)
      return { error: 'Project not found' }
    }

    return { success: true }
  })
}