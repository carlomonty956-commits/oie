export interface Project {
  id: string
  name: string
  description?: string
  config: ProjectConfig
  status: 'active' | 'paused' | 'archived'
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ProjectConfig {
  keywords: string[]
  intentPhrases: string[]
  negativeKeywords: string[]
  examples?: string[]
  scoringPreferences?: {
    keywordWeight?: number
    intentWeight?: number
    freshnessWeight?: number
    sourceWeight?: number
  }
  minScore?: number
}

export interface Opportunity {
  id: string
  projectId: string
  rawContentId: string
  title: string
  content: string
  url: string
  score: number
  scoreBreakdown: ScoreBreakdown
  status: 'new' | 'reviewed' | 'good_lead' | 'converted' | 'rejected'
  matchedKeywords: string[]
  matchedIntent: string[]
  source?: string  // <-- ADD THIS LINE
  author?: string  // <-- ADD THIS LINE (optional)
  createdAt: string
  updatedAt: string
}

export interface ScoreBreakdown {
  keywordScore: number
  intentScore: number
  freshnessScore: number
  sourceScore: number
  negativePenalty: number
  total: number
}

export interface IntentMatch {
  phrase: string
  score: number
  type: 'buying' | 'problem' | 'request' | 'recommendation'
}

export interface Feedback {
  id: string
  opportunityId: string
  userId: string
  action: 'excellent' | 'good' | 'bad' | 'spam' | 'converted' | 'ignored'
  comment?: string
  createdAt: string
}

export interface LearningData {
  keyword: string
  weight: number
  positiveCount: number
  negativeCount: number
  lastUpdated: string
}