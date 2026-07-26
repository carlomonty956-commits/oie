import { IntentMatch } from '../types'

export class IntentDetector {
  private intentPatterns: Map<string, { score: number; type: IntentMatch['type'] }>

  constructor() {
    this.intentPatterns = new Map([
      // Strong buying signals
      ['need', { score: 25, type: 'buying' }],
      ['looking for', { score: 25, type: 'buying' }],
      ['hire', { score: 30, type: 'buying' }],
      ['recommend', { score: 15, type: 'recommendation' }],
      ['recommendation', { score: 15, type: 'recommendation' }],
      ['suggest', { score: 10, type: 'recommendation' }],
      
      // Problem statements
      ['problem', { score: 20, type: 'problem' }],
      ['issue', { score: 15, type: 'problem' }],
      ['struggling', { score: 20, type: 'problem' }],
      ['help', { score: 20, type: 'request' }],
      ['assist', { score: 15, type: 'request' }],
      
      // Specific buying intent
      ['price', { score: 10, type: 'buying' }],
      ['cost', { score: 10, type: 'buying' }],
      ['budget', { score: 15, type: 'buying' }],
      ['quote', { score: 20, type: 'buying' }],
      ['estimate', { score: 15, type: 'buying' }],
      
      // Service requests
      ['build', { score: 20, type: 'request' }],
      ['create', { score: 15, type: 'request' }],
      ['develop', { score: 20, type: 'request' }],
      ['design', { score: 15, type: 'request' }],
      ['implement', { score: 15, type: 'request' }],
      
      // Time-sensitive
      ['urgent', { score: 20, type: 'request' }],
      ['asap', { score: 20, type: 'request' }],
      ['immediately', { score: 25, type: 'request' }],
      ['quick', { score: 10, type: 'request' }],
      
      // Contract language
      ['contract', { score: 15, type: 'buying' }],
      ['project', { score: 10, type: 'buying' }],
      ['freelance', { score: 15, type: 'buying' }],
      ['gig', { score: 15, type: 'buying' }]
    ])
  }

  detect(text: string): IntentMatch[] {
    const matches: IntentMatch[] = []
    const lowerText = text.toLowerCase()

    for (const [phrase, config] of this.intentPatterns) {
      if (lowerText.includes(phrase)) {
        matches.push({
          phrase: phrase,
          score: config.score,
          type: config.type
        })
      }
    }

    // Sort by score descending and remove duplicates
    const uniqueMatches = matches.filter((match, index, self) => 
      index === self.findIndex(m => m.phrase === match.phrase)
    )
    
    return uniqueMatches.sort((a, b) => b.score - a.score)
  }

  getTopIntent(text: string): IntentMatch | null {
    const matches = this.detect(text)
    return matches.length > 0 ? matches[0] : null
  }

  calculateIntentScore(text: string): number {
    const matches = this.detect(text)
    let totalScore = 0
    // Use unique intents, cap at 100
    const uniqueScores = new Set(matches.map(m => m.score))
    for (const score of uniqueScores) {
      totalScore += score
    }
    return Math.min(totalScore, 100)
  }

  getIntentSummary(text: string): string {
    const matches = this.detect(text)
    if (matches.length === 0) return 'No intent detected'
    
    const topMatches = matches.slice(0, 3)
    return topMatches.map(m => `${m.phrase} (${m.type})`).join(', ')
  }
}