import { ScoreBreakdown } from '../types'

export class OpportunityScorer {
  private sourceQualityMap: Map<string, number> = new Map([
    ['reddit', 90],
    ['hackernews', 85],
    ['github', 70],
    ['rss', 60],
    ['devto', 80],
    ['lobsters', 75]
  ])

  private learnedKeywordWeights: Record<string, number> = {}

  setLearnedWeights(weights: Record<string, number>) {
    this.learnedKeywordWeights = weights
  }

  calculateScore(params: {
    keywordScore: number
    intentScore: number
    content: string
    source: string
    createdAt: string
    hasNegative: boolean
    matchedKeywords?: string[]
  }): { total: number; breakdown: ScoreBreakdown } {
    const { keywordScore, intentScore, content, source, createdAt, hasNegative, matchedKeywords = [] } = params

    // Adjust keyword score based on learned weights
    let adjustedKeywordScore = keywordScore
    if (matchedKeywords.length > 0 && Object.keys(this.learnedKeywordWeights).length > 0) {
      let weightMultiplier = 1
      for (const keyword of matchedKeywords) {
        if (this.learnedKeywordWeights[keyword]) {
          // Positive weights increase score, negative weights decrease it
          const weight = this.learnedKeywordWeights[keyword]
          weightMultiplier += weight * 0.05 // Each weight point adds/subtracts 5%
        }
      }
      adjustedKeywordScore = Math.min(100, Math.round(keywordScore * weightMultiplier))
    }

    // Freshness score: 0-20 based on how recent
    const freshnessScore = this.calculateFreshness(createdAt)

    // Source score: 0-15 based on source quality
    const sourceScore = this.sourceQualityMap.get(source) || 50
    const normalizedSourceScore = Math.round((sourceScore / 100) * 15)

    // Negative penalty
    const negativePenalty = hasNegative ? -30 : 0

    // Calculate total
    let total = adjustedKeywordScore + intentScore + freshnessScore + normalizedSourceScore + negativePenalty
    total = Math.max(0, Math.min(100, total))

    const breakdown: ScoreBreakdown = {
      keywordScore: adjustedKeywordScore,
      intentScore,
      freshnessScore,
      sourceScore: normalizedSourceScore,
      negativePenalty,
      total: Math.round(total)
    }

    return { total: Math.round(total), breakdown }
  }

  private calculateFreshness(createdAt: string): number {
    const created = new Date(createdAt)
    const now = new Date()
    const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60)

    if (hoursDiff < 1) return 20
    if (hoursDiff < 2) return 18
    if (hoursDiff < 4) return 15
    if (hoursDiff < 8) return 12
    if (hoursDiff < 12) return 8
    if (hoursDiff < 24) return 5
    return 0
  }

  getThresholdScore(projectConfig: any): number {
    return projectConfig.minScore || 30
  }

  isOpportunityValuable(score: number, projectConfig: any): boolean {
    const threshold = this.getThresholdScore(projectConfig)
    return score >= threshold
  }
}