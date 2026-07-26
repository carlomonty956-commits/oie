export interface Notification {
  id: string
  userId: string
  opportunityId: string
  type: 'high_score' | 'new_opportunity' | 'feedback_reminder' | 'conversion'
  title: string
  message: string
  read: boolean
  sentAt: string
  createdAt: string
}

export interface NotificationConfig {
  minScore: number // Send notification when score >= this
  channels: {
    telegram?: {
      enabled: boolean
      botToken?: string
      chatId?: string
    }
    email?: {
      enabled: boolean
    }
  }
}

export interface NotificationChannel {
  send(notification: Notification): Promise<boolean>
}