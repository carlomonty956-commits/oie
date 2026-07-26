import { Opportunity, ScoreBreakdown, Feedback } from '../types'

export class OpportunityManager {
  private db: any

  constructor(db: any) {
    this.db = db
  }

  async createOpportunity(params: {
    projectId: string
    rawContentId: string
    title: string
    content: string
    url: string
    score: number
    scoreBreakdown: ScoreBreakdown
    matchedKeywords: string[]
    matchedIntent: string[]
  }): Promise<Opportunity> {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
    
    const result = await this.db.query(
      `INSERT INTO opportunities 
       (id, project_id, raw_content_id, title, content, url, score, score_breakdown, 
        matched_keywords, matched_intent, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        id,
        params.projectId,
        params.rawContentId,
        params.title,
        params.content,
        params.url,
        params.score,
        JSON.stringify(params.scoreBreakdown),
        JSON.stringify(params.matchedKeywords),
        JSON.stringify(params.matchedIntent),
        'new'
      ]
    )

    return this.mapOpportunity(result.rows[0])
  }

  async getOpportunity(id: string): Promise<Opportunity | null> {
    const result = await this.db.query(
      'SELECT * FROM opportunities WHERE id = ?',
      [id]
    )
    if (result.rows.length === 0) return null
    return this.mapOpportunity(result.rows[0])
  }

  async getOpportunitiesByProject(
    projectId: string, 
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<Opportunity[]> {
    const { limit = 50, offset = 0, status } = options
    
    let query = 'SELECT * FROM opportunities WHERE project_id = ?'
    const params: any[] = [projectId]
    let paramIndex = 2

    if (status) {
      query += ` AND status = ?`
      params.push(status)
      paramIndex++
    }

    query += ` ORDER BY score DESC, created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const result = await this.db.query(query, params)
    return result.rows.map((row: any) => this.mapOpportunity(row))
  }

  async updateStatus(id: string, status: Opportunity['status']): Promise<void> {
    await this.db.query(
      `UPDATE opportunities 
       SET status = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, id]
    )
  }

  async addFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
    
    const result = await this.db.query(
      `INSERT INTO feedback (id, opportunity_id, user_id, action, comment, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, feedback.opportunityId, feedback.userId, feedback.action, feedback.comment || null]
    )

    const row = result.rows[0]
    if (row.action === 'converted') {
      await this.updateStatus(feedback.opportunityId, 'converted')
    } else if (row.action === 'spam' || row.action === 'bad') {
      await this.updateStatus(feedback.opportunityId, 'rejected')
    } else if (row.action === 'excellent' || row.action === 'good') {
      await this.updateStatus(feedback.opportunityId, 'good_lead')
    }

    return {
      id: row.id,
      opportunityId: row.opportunity_id,
      userId: row.user_id,
      action: row.action,
      comment: row.comment,
      createdAt: row.created_at
    }
  }

  async getFeedbackStats(projectId: string): Promise<Record<string, number>> {
    const result = await this.db.query(
      `SELECT f.action, COUNT(*) as count
       FROM feedback f
       JOIN opportunities o ON f.opportunity_id = o.id
       WHERE o.project_id = ?
       GROUP BY f.action`,
      [projectId]
    )

    const stats: Record<string, number> = {}
    result.rows.forEach((row: any) => {
      stats[row.action] = parseInt(row.count)
    })
    return stats
  }

  // ============ CONTACT METHODS ============

  async getContactInfo(opportunityId: string): Promise<any | null> {
    try {
      console.log(`🔍 Getting contact info for: ${opportunityId}`)
      
      // First get the opportunity
      const oppResult = await this.db.query(
        `SELECT * FROM opportunities WHERE id = ?`,
        [opportunityId]
      )

      if (oppResult.rows.length === 0) {
        console.log(`❌ Opportunity not found: ${opportunityId}`)
        return null
      }

      const opp = oppResult.rows[0]
      console.log(`📡 Found opportunity: ${opp.id}, rawContentId: ${opp.raw_content_id}`)

      // Try to get raw content by both id and source_identifier
      let rawContent = null
      if (opp.raw_content_id) {
        const rawResult = await this.db.query(
          `SELECT * FROM raw_content WHERE id = ? OR source_identifier = ?`,
          [opp.raw_content_id, opp.raw_content_id]
        )
        if (rawResult.rows.length > 0) {
          rawContent = rawResult.rows[0]
          console.log(`📡 Found raw content: ${rawContent.id}`)
        } else {
          console.log(`⚠️ Raw content not found for: ${opp.raw_content_id}`)
        }
      }

      // Return combined data
      return {
        id: opp.id,
        title: opp.title || '',
        url: opp.url || '',
        author: rawContent?.author || opp.author || 'unknown',
        source: rawContent?.source_identifier || 'unknown',
        content: rawContent?.content || opp.content || '',
        contact_status: opp.contact_status || 'not_contacted',
        contact_method: opp.contact_method,
        contact_message: opp.contact_message,
        contacted_at: opp.contacted_at,
        follow_up_at: opp.follow_up_at,
        notes: opp.notes
      }
    } catch (error) {
      console.error('Error in getContactInfo:', error)
      return null
    }
  }

  async getContactHistory(opportunityId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM contact_history 
         WHERE opportunity_id = ? 
         ORDER BY contacted_at DESC`,
        [opportunityId]
      )
      return result.rows
    } catch (error) {
      console.error('Error in getContactHistory:', error)
      return []
    }
  }

  async markContacted(opportunityId: string, data: {
    method: string
    message: string
    followUpAt?: string
    notes?: string
  }): Promise<void> {
    try {
      const userId = 'default-user'
      const id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()
      
      console.log(`📝 Marking contacted for: ${opportunityId}`)
      
      await this.db.query(
        `INSERT INTO contact_history (id, opportunity_id, user_id, method, message, contacted_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, opportunityId, userId, data.method, data.message]
      )

      const notesUpdate = data.notes ? `[${new Date().toISOString()}] ${data.notes}\n` : ''
      await this.db.query(
        `UPDATE opportunities 
         SET 
          contact_status = 'contacted',
          contact_method = ?,
          contact_message = ?,
          contacted_at = CURRENT_TIMESTAMP,
          follow_up_at = ?,
          notes = COALESCE(notes || '', '') || ?,
          status = 'good_lead',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [data.method, data.message, data.followUpAt || null, notesUpdate, opportunityId]
      )
      
      console.log(`✅ Contact recorded for: ${opportunityId}`)
    } catch (error) {
      console.error('Error in markContacted:', error)
      throw error
    }
  }

  async markResponseReceived(opportunityId: string, responseText: string): Promise<void> {
    try {
      console.log(`📝 Marking response for: ${opportunityId}`)
      
      const result = await this.db.query(
        `SELECT id FROM contact_history 
         WHERE opportunity_id = ? 
         ORDER BY contacted_at DESC 
         LIMIT 1`,
        [opportunityId]
      )

      if (result.rows.length > 0) {
        await this.db.query(
          `UPDATE contact_history 
           SET response_received = 1, response_text = ? 
           WHERE id = ?`,
          [responseText, result.rows[0].id]
        )
      }

      await this.db.query(
        `UPDATE opportunities 
         SET notes = COALESCE(notes || '', '') || ?
         WHERE id = ?`,
        [`[${new Date().toISOString()}] Response received: ${responseText}\n`, opportunityId]
      )
      
      console.log(`✅ Response recorded for: ${opportunityId}`)
    } catch (error) {
      console.error('Error in markResponseReceived:', error)
      throw error
    }
  }

  async generateMessageTemplate(opportunityId: string): Promise<string> {
    try {
      const info = await this.getContactInfo(opportunityId)
      if (!info) {
        return 'Unable to generate template - opportunity not found.'
      }

      const author = info.author || 'there'
      const source = info.source || 'the platform'
      const title = info.title || 'your post'
      const url = info.url || ''

      return `Hi ${author},

I came across your post on ${source} about "${title}".

${url ? `Here's a link to your original post: ${url}\n` : ''}

I'd love to help with this. Can we connect to discuss further?

Looking forward to hearing from you!`
    } catch (error) {
      console.error('Error generating template:', error)
      return 'Error generating template. Please write your message manually.'
    }
  }

  private mapOpportunity(row: any): Opportunity {
    return {
      id: row.id,
      projectId: row.project_id,
      rawContentId: row.raw_content_id,
      title: row.title,
      content: row.content,
      url: row.url,
      score: row.score,
      scoreBreakdown: typeof row.score_breakdown === 'string' 
        ? JSON.parse(row.score_breakdown) 
        : row.score_breakdown,
      status: row.status,
      matchedKeywords: typeof row.matched_keywords === 'string' 
        ? JSON.parse(row.matched_keywords) 
        : row.matched_keywords || [],
      matchedIntent: typeof row.matched_intent === 'string' 
        ? JSON.parse(row.matched_intent) 
        : row.matched_intent || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}