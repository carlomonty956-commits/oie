import { ProjectMatcher } from './project-matcher'
import { OpportunityScorer } from './opportunity-scorer'
import { OpportunityManager } from './opportunity-manager'
import { IntentDetector } from './intent-detector'
import { LearningEngine } from './learning-engine'
import { Project, Opportunity } from '../types'

export class OpportunityProcessor {
  private matcher: ProjectMatcher
  private scorer: OpportunityScorer
  private manager: OpportunityManager
  private intentDetector: IntentDetector
  private learningEngine: LearningEngine
  private db: any

  constructor(db: any) {
    this.db = db
    this.matcher = new ProjectMatcher(db)
    this.scorer = new OpportunityScorer()
    this.manager = new OpportunityManager(db)
    this.intentDetector = new IntentDetector()
    this.learningEngine = new LearningEngine(db)
  }

  async processRawContent(
    rawContent: {
      id: string
      title: string
      content: string
      url: string
      source: string
      author: string
      createdAt: string
      metadata?: any
    }
  ): Promise<Opportunity[]> {
    const createdOpportunities: Opportunity[] = []
    const text = `${rawContent.title} ${rawContent.content}`

    // Get all active projects
    const projects = await this.matcher.getAllActiveProjects()
    
    if (projects.length === 0) {
      console.log('📋 No active projects found')
      return []
    }

    for (const project of projects) {
      try {
        // Get learned keyword weights for this project
        const weights = await this.learningEngine.getKeywordWeights(project.id)
        this.scorer.setLearnedWeights(weights)

        // Check if content matches this project
        const match = await this.matcher.matchContent(text, project.id)
        
        if (!match.matched) {
          continue
        }

        // Calculate score with learned weights
        const { total, breakdown } = this.scorer.calculateScore({
          keywordScore: match.score,
          intentScore: this.intentDetector.calculateIntentScore(text),
          content: text,
          source: rawContent.source,
          createdAt: rawContent.createdAt,
          hasNegative: false,
          matchedKeywords: match.matchedKeywords
        })

        // Check if score meets threshold
        if (!this.scorer.isOpportunityValuable(total, project.config)) {
          continue
        }

        // Check if raw content exists in database
        const rawCheck = await this.db.query(
          'SELECT id FROM raw_content WHERE id = ?',
          [rawContent.id]
        )

        if (rawCheck.rows.length === 0) {
          continue
        }

        // Create opportunity
        const opportunity = await this.manager.createOpportunity({
          projectId: project.id,
          rawContentId: rawContent.id,
          title: rawContent.title,
          content: rawContent.content,
          url: rawContent.url,
          score: total,
          scoreBreakdown: breakdown,
          matchedKeywords: match.matchedKeywords,
          matchedIntent: match.matchedIntent
        })

        createdOpportunities.push(opportunity)
        console.log(`✅ Created opportunity for project "${project.name}" with score ${total}`)
      } catch (error) {
        console.error(`❌ Error processing project ${project.id}:`, error)
      }
    }

    return createdOpportunities
  }
}