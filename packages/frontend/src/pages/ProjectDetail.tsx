import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { projectsApi } from '../lib/api'
import { ArrowLeft } from 'lucide-react'

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  })

  const { data: opportunities, isLoading: oppsLoading } = useQuery({
    queryKey: ['project-opportunities', id],
    queryFn: () => projectsApi.getOpportunities(id!, { limit: 100 }),
    enabled: !!id,
  })

  const { data: feedbackStats } = useQuery({
    queryKey: ['project-feedback', id],
    queryFn: () => projectsApi.getFeedbackStats(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const project = data?.project
  if (!project) {
    return <div className="text-center py-12 text-red-600">Project not found</div>
  }

  const opps = opportunities?.opportunities || []
  const stats = feedbackStats?.stats || {}

  return (
    <div>
      <Link to="/projects" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <p className="text-gray-600 mt-1">{project.description}</p>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className={`badge ${
            project.status === 'active' ? 'badge-green' : 'badge-gray'
          }`}>
            {project.status}
          </span>
          <span className="text-gray-500">
            Created: {new Date(project.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="card">
          <p className="text-sm text-gray-500">Opportunities</p>
          <p className="text-2xl font-bold">{opps.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Good Leads</p>
          <p className="text-2xl font-bold text-green-600">{stats.good || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Converted</p>
          <p className="text-2xl font-bold text-purple-600">{stats.converted || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-medium text-gray-700 mb-4">Project Configuration</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Keywords:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {(project.config?.keywords || []).map((kw: string, i: number) => (
                <span key={i} className="badge badge-blue">{kw}</span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium">Intent Phrases:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {(project.config?.intentPhrases || []).map((ip: string, i: number) => (
                <span key={i} className="badge badge-green">{ip}</span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium">Negative Keywords:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {(project.config?.negativeKeywords || []).map((nk: string, i: number) => (
                <span key={i} className="badge badge-gray">{nk}</span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium">Minimum Score:</span>
            <span className="ml-2">{project.config?.minScore || 30}</span>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-medium text-gray-700 mb-4">Recent Opportunities</h3>
        {oppsLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : opps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No opportunities found for this project</div>
        ) : (
          <div className="space-y-3">
            {opps.slice(0, 10).map((opp: any) => (
              <Link
                key={opp.id}
                to={`/opportunities/${opp.id}`}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{opp.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${
                      opp.status === 'converted' ? 'badge-green' :
                      opp.status === 'good_lead' ? 'badge-green' :
                      opp.status === 'new' ? 'badge-blue' :
                      'badge-gray'
                    }`}>
                      {opp.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(opp.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary-600">{opp.score}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}