import { Notification, NotificationChannel } from '../types'

export class TelegramChannel implements NotificationChannel {
  private botToken: string | undefined
  private chatId: string | undefined

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN
    this.chatId = process.env.TELEGRAM_CHAT_ID
  }

  async send(notification: Notification): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.log('⚠️ Telegram not configured, skipping notification')
      return false
    }

    try {
      const message = this.formatMessage(notification)
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })

      if (!response.ok) {
        console.error('Telegram send failed:', await response.text())
        return false
      }

      console.log(`✅ Telegram notification sent: ${notification.title}`)
      return true
    } catch (error) {
      console.error('Telegram send error:', error)
      return false
    }
  }

  private formatMessage(notification: Notification): string {
    const emojis: Record<string, string> = {
      high_score: '🔥',
      new_opportunity: '📢',
      feedback_reminder: '💡',
      conversion: '🎉'
    }
    
    const emoji = emojis[notification.type] || '🔔'
    
    let message = `${emoji} <b>${notification.title}</b>\n\n`
    message += `${notification.message}\n\n`
    
    // Add action buttons
    if (notification.opportunityId) {
      message += `<a href="http://localhost:3000/opportunities/${notification.opportunityId}">🔗 View Opportunity</a>`
    }
    
    return message
  }
}

export class ConsoleChannel implements NotificationChannel {
  async send(notification: Notification): Promise<boolean> {
    console.log('📨 NOTIFICATION:', JSON.stringify(notification, null, 2))
    return true
  }
}