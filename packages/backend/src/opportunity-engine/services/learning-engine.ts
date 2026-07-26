export class LearningEngine {
  private db: any

  constructor(db: any) {
    this.db = db
  }

  async processFeedback(opportunityId: string, action: string): Promise<void> {
    try {
      // Get opportunity details
      const opp = await this.db.query(
        'SELECT project_id, matched_keywords, matched_intent, source FROM opportunities WHERE id = ?',
        [opportunityId]
      )

      if (opp.rows.length === 0) return

      const { project_id, matched_keywords, matched_intent, source } = opp.rows[0]
      
      let keywords: string[] = []
      let intents: string[] = []
      
      try {
        keywords = JSON.parse(matched_keywords || '[]')
        intents = JSON.parse(matched_intent || '[]')
      } catch (e) {
        keywords = []
        intents = []
      }

      // Determine if feedback is positive or negative
      const isPositive = ['excellent', 'good', 'converted'].includes(action)
      const isNegative = ['bad', 'spam', 'rejected', 'ignored'].includes(action)

      if (!isPositive && !isNegative) return

      // Update keyword weights
      for (const keyword of keywords) {
        await this.updateKeywordWeight(project_id, keyword, isPositive)
      }

      // Update intent weights
      for (const intent of intents) {
        await this.updateIntentWeight(project_id, intent, isPositive)
      }

      // Update source quality
      if (source) {
        await this.updateSourceQuality(source, isPositive)
      }

      console.log(`✅ Learning updated for opportunity ${opportunityId}: ${action}`)
    } catch (error) {
      console.error('Error in learning engine:', error)
    }
  }

  private async updateKeywordWeight(projectId: string, keyword: string, isPositive: boolean): Promise<void> {
    try {
      // Check if keyword exists in learning table
      const existing = await this.db.query(
        'SELECT * FROM project_learning WHERE project_id = ? AND keyword = ?',
        [projectId, keyword]
      )

      if (existing.rows.length === 0) {
        // Insert new keyword with initial weight
        const initialWeight = isPositive ? 1 : -1
        await this.db.run(
          `INSERT INTO project_learning (project_id, keyword, weight, positive_count, negative_count, last_updated)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [projectId, keyword, initialWeight, isPositive ? 1 : 0, isPositive ? 0 : 1]
        )
      } else {
        // Update existing keyword
        const current = existing.rows[0]
        const positiveCount = current.positive_count + (isPositive ? 1 : 0)
        const negativeCount = current.negative_count + (isPositive ? 0 : 1)
        const weight = positiveCount - negativeCount

        await this.db.run(
          `UPDATE project_learning 
           SET weight = ?, positive_count = ?, negative_count = ?, last_updated = CURRENT_TIMESTAMP
           WHERE project_id = ? AND keyword = ?`,
          [weight, positiveCount, negativeCount, projectId, keyword]
        )
      }
    } catch (error) {
      console.error('Error updating keyword weight:', error)
    }
  }

  private async updateIntentWeight(projectId: string, intent: string, isPositive: boolean): Promise<void> {
    const keyword = `intent_${intent}`
    await this.updateKeywordWeight(projectId, keyword, isPositive)
  }

  private async updateSourceQuality(source: string, isPositive: boolean): Promise<void> {
    try {
      // Update source quality score
      const existing = await this.db.query(
        'SELECT quality_score FROM crawler_sources WHERE name = ?',
        [source]
      )

      if (existing.rows.length > 0) {
        const currentScore = existing.rows[0].quality_score || 50
        const adjustment = isPositive ? 2 : -2
        const newScore = Math.max(0, Math.min(100, currentScore + adjustment))

        await this.db.run(
          'UPDATE crawler_sources SET quality_score = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
          [newScore, source]
        )
      }
    } catch (error) {
      console.error('Error updating source quality:', error)
    }
  }

  async getKeywordWeights(projectId: string): Promise<Record<string, number>> {
    try {
      const result = await this.db.query(
        'SELECT keyword, weight FROM project_learning WHERE project_id = ?',
        [projectId]
      )

      const weights: Record<string, number> = {}
      for (const row of result.rows) {
        weights[row.keyword] = row.weight
      }
      return weights
    } catch (error) {
      console.error('Error getting keyword weights:', error)
      return {}
    }
  }

  async getTopKeywords(projectId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT keyword, weight, positive_count, negative_count 
         FROM project_learning 
         WHERE project_id = ? 
         ORDER BY weight DESC 
         LIMIT ?`,
        [projectId, limit]
      )
      return result.rows
    } catch (error) {
      console.error('Error getting top keywords:', error)
      return []
    }
  }

  async getSourceQuality(): Promise<Record<string, number>> {
    try {
      const result = await this.db.query(
        'SELECT name, quality_score FROM crawler_sources'
      )
      const scores: Record<string, number> = {}
      for (const row of result.rows) {
        scores[row.name] = row.quality_score || 50
      }
      return scores
    } catch (error) {
      console.error('Error getting source quality:', error)
      return {}
    }
  }
}