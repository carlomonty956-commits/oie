import { Notification, NotificationChannel, NotificationConfig } from './types'
import { TelegramChannel, ConsoleChannel } from './channels/telegram'

export class NotificationManager {
  private db: any
  private channels: NotificationChannel[]
  private config: NotificationConfig
  private processedOpportunities: Set<string> = new Set()

  constructor(db: any) {
    this.db = db
    this.channels = [
      new ConsoleChannel(),
      new TelegramChannel()
    ]
    this.config = {
      minScore: 80,
      channels: {
        telegram: {
          enabled: !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID
        }
      }
    }
  }

  async checkAndSendNotifications(): Promise<void> {
    console.log('🔍 Checking for notifications...')
    
    // Check for high-scoring new opportunities
    await this.checkHighScoreOpportunities()
    
    // Check for opportunities without feedback
    await this.checkFeedbackReminders()
    
    // Check for conversions
    await this.checkConversions()
  }

  private async checkHighScoreOpportunities(): Promise<void> {
    const result = await this.db.query(`
      SELECT 
        o.id,
        o.title,
        o.score,
        o.created_at,
        p.name as project_name,
        r.source_identifier as source
      FROM opportunities o
      JOIN projects p ON o.project_id = p.id
      JOIN raw_content r ON o.raw_content_id = r.id
      WHERE o.score >= $1
        AND o.status = 'new'
        AND o.created_at > datetime('now', '-10 minutes')
      ORDER BY o.score DESC
    `, [this.config.minScore])

    for (const row of result.rows) {
      if (!this.processedOpportunities.has(row.id)) {
        this.processedOpportunities.add(row.id)
        
        const notification: Notification = {
          id: `notif_${Date.now()}_${row.id}`,
          userId: 'default-user',
          opportunityId: row.id,
          type: 'high_score',
          title: `🔥 High Score Opportunity!`,
          message: `${row.title}\n\nScore: ${row.score}/100\nSource: ${row.source}\nProject: ${row.project_name}\n\nThis matches your criteria with a high score. Check it out!`,
          read: false,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }

        await this.sendToAllChannels(notification)
      }
    }
  }

  private async checkFeedbackReminders(): Promise<void> {
    const result = await this.db.query(`
      SELECT 
        o.id,
        o.title,
        o.created_at,
        p.name as project_name
      FROM opportunities o
      JOIN projects p ON o.project_id = p.id
      WHERE o.status = 'good_lead'
        AND o.created_at < datetime('now', '-1 day')
        AND NOT EXISTS (
          SELECT 1 FROM feedback f 
          WHERE f.opportunity_id = o.id
        )
    `)

    for (const row of result.rows) {
      const notification: Notification = {
        id: `notif_${Date.now()}_${row.id}`,
        userId: 'default-user',
        opportunityId: row.id,
        type: 'feedback_reminder',
        title: `💡 Feedback Reminder`,
        message: `${row.title}\n\nProject: ${row.project_name}\n\nThis opportunity was marked as a good lead but hasn't been followed up. Check in on it!`,
        read: false,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }

      await this.sendToAllChannels(notification)
    }
  }

  private async checkConversions(): Promise<void> {
    const result = await this.db.query(`
      SELECT 
        o.id,
        o.title,
        o.updated_at,
        p.name as project_name
      FROM opportunities o
      JOIN projects p ON o.project_id = p.id
      WHERE o.status = 'converted'
        AND o.updated_at > datetime('now', '-10 minutes')
    `)

    for (const row of result.rows) {
      const notification: Notification = {
        id: `notif_${Date.now()}_${row.id}`,
        userId: 'default-user',
        opportunityId: row.id,
        type: 'conversion',
        title: `🎉 Conversion!`,
        message: `${row.title}\n\nProject: ${row.project_name}\n\nGreat job! This opportunity has been converted.`,
        read: false,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }

      await this.sendToAllChannels(notification)
    }
  }

  private async sendToAllChannels(notification: Notification): Promise<void> {
    // Store notification in database
    await this.db.query(
      `INSERT INTO notifications 
       (id, user_id, opportunity_id, type, title, message, read, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        notification.id,
        notification.userId,
        notification.opportunityId,
        notification.type,
        notification.title,
        notification.message,
        false,
        notification.sentAt
      ]
    )

    // Send through all enabled channels
    for (const channel of this.channels) {
      try {
        await channel.send(notification)
      } catch (error) {
        console.error('Channel send error:', error)
      }
    }
  }

  async getNotifications(userId: string, options: { limit?: number; unreadOnly?: boolean } = {}) {
    const { limit = 50, unreadOnly = false } = options
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1'
    const params: any[] = [userId]
    
    if (unreadOnly) {
      query += ' AND read = false'
    }
    
    query += ' ORDER BY created_at DESC LIMIT $2'
    params.push(limit)
    
    const result = await this.db.query(query, params)
    return result.rows
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.db.query(
      'UPDATE notifications SET read = true WHERE id = $1',
      [notificationId]
    )
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE notifications SET read = true WHERE user_id = $1',
      [userId]
    )
  }
}