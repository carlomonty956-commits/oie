import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function setupDashboardRoutes(app: FastifyInstance) {
  // Dashboard overview
  app.get('/api/dashboard/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = app.db
    
    // Get overall stats
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_opportunities,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'good_lead' THEN 1 ELSE 0 END) as good_lead,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score
      FROM opportunities
    `)
    
    // Get project stats
    const projectResult = await db.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(o.id) as opportunity_count,
        AVG(o.score) as avg_score,
        SUM(CASE WHEN o.status = 'converted' THEN 1 ELSE 0 END) as converted
      FROM projects p
      LEFT JOIN opportunities o ON p.id = o.project_id
      WHERE p.status = 'active'
      GROUP BY p.id, p.name
      ORDER BY opportunity_count DESC
    `)
    
    // Get source stats
    const sourceResult = await db.query(`
      SELECT 
        source_identifier as source,
        COUNT(*) as count
      FROM raw_content
      GROUP BY source_identifier
      ORDER BY count DESC
    `)
    
    // Get recent activity (last 24 hours)
    const recentResult = await db.query(`
      SELECT 
        COUNT(*) as last_24h,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_24h,
        SUM(CASE WHEN status = 'good_lead' THEN 1 ELSE 0 END) as good_lead_24h
      FROM opportunities
      WHERE created_at > datetime('now', '-24 hours')
    `)
    
    return {
      overview: statsResult.rows[0],
      projects: projectResult.rows,
      sources: sourceResult.rows,
      recent: recentResult.rows[0]
    }
  })

  // Dashboard trends
  app.get('/api/dashboard/trends', async (request: FastifyRequest, reply: FastifyReply) => {
    const { days = 7 } = request.query as { days?: string }
    const db = app.db
    
    const result = await db.query(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new,
        SUM(CASE WHEN status = 'good_lead' THEN 1 ELSE 0 END) as good_lead,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
        AVG(score) as avg_score
      FROM opportunities
      WHERE created_at > date('now', '-' || $1 || ' days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `, [days])
    
    return { trends: result.rows }
  })

  // Top opportunities
  app.get('/api/dashboard/top-opportunities', async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = 10 } = request.query as { limit?: string }
    const db = app.db
    
    const result = await db.query(`
      SELECT 
        o.id,
        o.title,
        o.score,
        o.status,
        o.matched_keywords,
        o.matched_intent,
        p.name as project_name,
        r.source_identifier as source,
        r.url,
        r.author
      FROM opportunities o
      JOIN projects p ON o.project_id = p.id
      JOIN raw_content r ON o.raw_content_id = r.id
      WHERE o.status IN ('new', 'good_lead')
      ORDER BY o.score DESC
      LIMIT $1
    `, [limit])
    
    return { opportunities: result.rows }
  })

  // Source performance
  app.get('/api/dashboard/source-performance', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = app.db
    
    const result = await db.query(`
      SELECT 
        r.source_identifier as source,
        COUNT(r.id) as raw_count,
        COUNT(o.id) as opportunity_count,
        AVG(o.score) as avg_score,
        SUM(CASE WHEN o.status = 'converted' THEN 1 ELSE 0 END) as converted_count
      FROM raw_content r
      LEFT JOIN opportunities o ON r.id = o.raw_content_id
      GROUP BY r.source_identifier
      ORDER BY opportunity_count DESC
    `)
    
    return { sources: result.rows }
  })

  // Real-time dashboard stream (for WebSocket or polling)
  app.get('/api/dashboard/live', async (request: FastifyRequest, reply: FastifyReply) => {
    const db = app.db
    
    // Get latest 10 opportunities
    const latestResult = await db.query(`
      SELECT 
        o.id,
        o.title,
        o.score,
        o.status,
        p.name as project_name,
        r.source_identifier as source,
        strftime('%s', o.created_at) as timestamp
      FROM opportunities o
      JOIN projects p ON o.project_id = p.id
      JOIN raw_content r ON o.raw_content_id = r.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `)
    
    // Get last 5 feedback actions
    const feedbackResult = await db.query(`
      SELECT 
        f.action,
        f.comment,
        f.created_at,
        o.title as opportunity_title,
        o.id as opportunity_id
      FROM feedback f
      JOIN opportunities o ON f.opportunity_id = o.id
      ORDER BY f.created_at DESC
      LIMIT 5
    `)
    
    return {
      latest: latestResult.rows,
      recentFeedback: feedbackResult.rows,
      timestamp: Date.now()
    }
  })
}