import { Project, ProjectConfig } from '../types'

export class ProjectMatcher {
  private db: any

  constructor(db: any) {
    this.db = db
  }

  async matchContent(content: string, projectId: string): Promise<{
    matched: boolean
    matchedKeywords: string[]
    matchedIntent: string[]
    score: number
  }> {
    const project = await this.getProject(projectId)
    if (!project) {
      return { matched: false, matchedKeywords: [], matchedIntent: [], score: 0 }
    }

    const config = project.config
    const lowerContent = content.toLowerCase()

    // Check for negative keywords first (immediate disqualification)
    if (config.negativeKeywords && config.negativeKeywords.length > 0) {
      for (const neg of config.negativeKeywords) {
        if (lowerContent.includes(neg.toLowerCase())) {
          return { matched: false, matchedKeywords: [], matchedIntent: [], score: 0 }
        }
      }
    }

    // Find matching keywords
    const matchedKeywords: string[] = []
    for (const keyword of config.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword)
      }
    }

    // Find matching intent phrases
    const matchedIntent: string[] = []
    for (const intent of config.intentPhrases) {
      if (lowerContent.includes(intent.toLowerCase())) {
        matchedIntent.push(intent)
      }
    }

    // Calculate score
    const keywordScore = Math.min(matchedKeywords.length * 5, 40)
    const intentScore = Math.min(matchedIntent.length * 10, 40)
    const totalScore = keywordScore + intentScore

    const matched = matchedKeywords.length > 0 || matchedIntent.length > 0

    return {
      matched,
      matchedKeywords,
      matchedIntent,
      score: Math.min(totalScore, 100)
    }
  }

  async getProject(projectId: string): Promise<Project | null> {
    const result = await this.db.query(
      'SELECT * FROM projects WHERE id = $1 AND status = $2',
      [projectId, 'active']
    )
    if (result.rows.length === 0) return null
    
    const project = result.rows[0]
    project.config = typeof project.config === 'string' 
      ? JSON.parse(project.config) 
      : project.config
    
    return project
  }

  async getAllActiveProjects(): Promise<Project[]> {
    const result = await this.db.query(
      'SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC',
      ['active']
    )
    
    return result.rows.map((row: any) => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
    }))
  }
}