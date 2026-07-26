import { RawContent, CrawlerPlugin } from '../types'

interface GitHubIssue {
  id: number
  title: string
  body: string | null
  html_url: string
  user: {
    login: string
  } | null
  created_at: string
  comments: number
  labels: Array<{ name: string }>
  state: string
  pull_request?: any
}

interface GitHubResponse {
  data?: any
}

export class GitHubPlugin implements CrawlerPlugin {
  name = 'GitHub'
  sourceType = 'github'
  enabled = true

  private repos: string[] = [
    'facebook/react',
    'vercel/next.js',
    'microsoft/vscode',
    'vuejs/core',
    'angular/angular',
    'tailwindlabs/tailwindcss',
    'shadcn-ui/ui',
    'prisma/prisma',
    'nestjs/nest',
    'expressjs/express'
  ]

  private baseUrl = 'https://api.github.com'
  private issuesPerRepo = 5
  private githubToken: string

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN || ''
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running GitHub health check...')
      const response = await fetch(`${this.baseUrl}/zen`, {
        headers: {
          'User-Agent': 'OIE-Crawler/1.0',
          'Accept': 'application/json'
        }
      })
      return response.ok
    } catch {
      return false
    }
  }

  async fetch(): Promise<RawContent[]> {
    const posts: RawContent[] = []

    console.log(`📡 Fetching issues from ${this.repos.length} repositories...`)

    for (const repo of this.repos) {
      try {
        await this.delay(1000)
        
        const url = `${this.baseUrl}/repos/${repo}/issues?state=open&per_page=${this.issuesPerRepo}&sort=updated`
        console.log(`📡 Fetching issues from ${repo}...`)
        
        const headers: Record<string, string> = {
          'User-Agent': 'OIE-Crawler/1.0',
          'Accept': 'application/json'
        }
        
        if (this.githubToken) {
          headers['Authorization'] = `Bearer ${this.githubToken}`
        }
        
        const response = await fetch(url, { headers })

        if (response.status === 403) {
          console.log(`⚠️ Rate limited for ${repo}, skipping...`)
          continue
        }

        if (!response.ok) {
          console.error(`❌ Failed to fetch ${repo}: ${response.status}`)
          continue
        }

        const issues = await response.json() as GitHubIssue[]
        
        // Ensure issues is an array
        if (!Array.isArray(issues)) {
          console.error(`❌ Invalid response from ${repo}: not an array`)
          continue
        }
        
        for (const issue of issues) {
          if (issue.pull_request) continue
          
          if (issue && issue.title) {
            const cleanBody = issue.body 
              ? issue.body.replace(/<[^>]*>/g, '').substring(0, 1000)
              : ''
            
            posts.push({
              id: `github_${issue.id}`,
              source: 'github',
              title: issue.title || '',
              content: cleanBody || issue.title || '',
              url: issue.html_url || '',
              author: issue.user?.login || 'unknown',
              createdAt: issue.created_at || new Date().toISOString(),
              language: 'en',
              metadata: {
                repo: repo,
                comments: issue.comments || 0,
                labels: issue.labels?.map((l: any) => l.name) || [],
                state: issue.state || 'open'
              }
            })
          }
        }

        const validIssues = issues.filter((i: GitHubIssue) => !i.pull_request)
        console.log(`✅ Processed ${validIssues.length} issues from ${repo}`)
      } catch (error) {
        console.error(`❌ Error fetching ${repo}:`, error)
      }
    }

    console.log(`📊 Total posts fetched from GitHub: ${posts.length}`)
    return posts
  }

  normalize(data: RawContent): RawContent {
    return data
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}