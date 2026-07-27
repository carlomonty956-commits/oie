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
    const existing = await this.db.query(
      'SELECT id FROM opportunities WHERE project_id = ? AND raw_content_id = ?',
      [params.projectId, params.rawContentId]
    )

    if (existing.rows.length > 0) {
      return this.mapOpportunity(existing.rows[0])
    }

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

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY score DESC, created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await this.db.query(query, params)
    return result.rows.map((row: any) => this.mapOpportunity(row))
  }

  async updateStatus(id: string, status: Opportunity['status']): Promise<void> {
    const validStatuses = ['new', 'reviewed', 'good_lead', 'converted', 'rejected']
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`)
    }
    
    await this.db.query(
      'UPDATE opportunities SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
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

  async extractContactInfo(opportunityId: string): Promise<{
    email: string | null
    username: string | null
    platform: string
    url: string
    contactInfo: string
  }> {
    try {
      const result = await this.db.query(
        `SELECT o.*, r.source_identifier as source, r.content, r.url, r.author
         FROM opportunities o
         LEFT JOIN raw_content r ON o.raw_content_id = r.id
         WHERE o.id = ?`,
        [opportunityId]
      )

      if (result.rows.length === 0) {
        return { email: null, username: null, platform: 'unknown', url: '', contactInfo: '' }
      }

      const row = result.rows[0]
      const content = row.content || ''
      const author = row.author || ''
      const source = row.source || 'unknown'
      const url = row.url || ''

      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
      const emails = content.match(emailRegex) || []
      const email = emails.length > 0 ? emails[0] : null

      let username = null
      if (source === 'reddit') {
        username = author.startsWith('u/') ? author : `u/${author}`
      } else {
        username = author || null
      }

      let contactInfo = ''
      if (email) contactInfo += `Email: ${email}\n`
      if (username) contactInfo += `Username: ${username}\n`
      if (source) contactInfo += `Platform: ${source}\n`
      if (url) contactInfo += `URL: ${url}\n`

      return {
        email,
        username,
        platform: source,
        url,
        contactInfo
      }
    } catch (error) {
      console.error('Error extracting contact info:', error)
      return { email: null, username: null, platform: 'unknown', url: '', contactInfo: '' }
    }
  }

  async getContactHistory(opportunityId: string): Promise<any[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM contact_history WHERE opportunity_id = ? ORDER BY contacted_at DESC',
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
      const result = await this.db.query(
        'SELECT id FROM contact_history WHERE opportunity_id = ? ORDER BY contacted_at DESC LIMIT 1',
        [opportunityId]
      )

      if (result.rows.length > 0) {
        await this.db.query(
          'UPDATE contact_history SET response_received = 1, response_text = ? WHERE id = ?',
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
      const contactInfo = await this.extractContactInfo(opportunityId)

      let template = `Hi ${author},\n\nI came across your post on ${source} about "${title}".\n\n`
      
      if (contactInfo.email) {
        template += `I noticed your email: ${contactInfo.email}\n`
      }
      if (contactInfo.username) {
        template += `Your username: ${contactInfo.username}\n`
      }
      
      template += `\n${url ? `Here's a link to your original post: ${url}\n\n` : ''}I'd love to help with this. Can we connect to discuss further?\n\nLooking forward to hearing from you!`

      return template
    } catch (error) {
      console.error('Error generating template:', error)
      return 'Error generating template. Please write your message manually.'
    }
  }

  async getContactInfo(opportunityId: string): Promise<any | null> {
    try {
      const result = await this.db.query(
        `SELECT o.id, o.title, o.url, o.author, r.source_identifier as source, r.content,
         o.contact_status, o.contact_method, o.contact_message, o.contacted_at, o.follow_up_at, o.notes
         FROM opportunities o
         LEFT JOIN raw_content r ON o.raw_content_id = r.id
         WHERE o.id = ?`,
        [opportunityId]
      )
      if (result.rows.length === 0) return null
      return result.rows[0]
    } catch (error) {
      console.error('Error in getContactInfo:', error)
      return null
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