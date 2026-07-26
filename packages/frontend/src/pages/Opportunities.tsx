import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { opportunitiesApi, projectsApi } from '../lib/api'
import { Eye, ThumbsUp, CheckCircle, XCircle, MessageSquare } from 'lucide-react'

export function Opportunities() {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const queryClient = useQueryClient()

  // Get all projects for filter
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  // Get opportunities summary
  const { data: summaryData } = useQuery({
    queryKey: ['opportunities-summary'],
    queryFn: opportunitiesApi.getSummary,
    refetchInterval: 30000,
  })

  // Get opportunities for selected project
  const { data: opportunitiesData, isLoading } = useQuery({
    queryKey: ['opportunities', selectedProject, statusFilter],
    queryFn: () => {
      if (!selectedProject) return { opportunities: [] }
      return projectsApi.getOpportunities(selectedProject, { 
        limit: 100,
        status: statusFilter || undefined
      })
    },
    enabled: !!selectedProject,
  })

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: string; comment?: string }) =>
      opportunitiesApi.addFeedback(id, { action, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-summary'] })
      setFeedbackComment('')
      setSelectedOpportunity(null)
    },
  })

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      opportunitiesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['opportunities-summary'] })
    },
  })

  const summary = summaryData?.summary || {}
  const projects = projectsData?.projects || []
  const opportunities = opportunitiesData?.opportunities || []

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'new', label: 'New' },
    { value: 'good_lead', label: 'Good Lead' },
    { value: 'converted', label: 'Converted' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: 'badge-blue',
      good_lead: 'badge-green',
      converted: 'badge-green',
      rejected: 'badge-gray',
    }
    return map[status] || 'badge-gray'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Opportunities</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{summary.total || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">New</p>
          <p className="text-2xl font-bold text-blue-600">{summary.new || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Good Lead</p>
          <p className="text-2xl font-bold text-green-600">{summary.good_lead || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Converted</p>
          <p className="text-2xl font-bold text-purple-600">{summary.converted || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="text-2xl font-bold text-primary-600">
            {summary.avg_score ? Math.round(summary.avg_score) : 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">Select a project...</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Opportunities list */}
      {!selectedProject ? (
        <div className="card text-center py-12 text-gray-500">
          <p>Select a project to view opportunities</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">Loading opportunities...</div>
      ) : opportunities.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p>No opportunities found for this project</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp: any) => (
            <div key={opp.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`badge ${getStatusBadge(opp.status)}`}>
                      {opp.status}
                    </span>
                    <span className="text-sm font-bold text-primary-600">
                      Score: {opp.score}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mt-1 truncate">{opp.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{opp.content}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {opp.matched_keywords && JSON.parse(opp.matched_keywords).map((kw: string, i: number) => (
                      <span key={i} className="badge badge-blue text-xs">{kw}</span>
                    ))}
                    {opp.matched_intent && JSON.parse(opp.matched_intent).map((intent: string, i: number) => (
                      <span key={i} className="badge badge-green text-xs">{intent}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 ml-4">
                  <button
                    className="btn btn-secondary text-sm py-1 px-3 flex items-center gap-1"
                    onClick={() => setSelectedOpportunity(opp)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Feedback
                  </button>
                  <Link
                    to={`/opportunities/${opp.id}`}
                    className="btn btn-primary text-sm py-1 px-3 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                <button
                  className="btn btn-primary text-sm py-1 px-3"
                  onClick={() => statusMutation.mutate({ id: opp.id, status: 'good_lead' })}
                >
                  <ThumbsUp className="h-3 w-3 inline mr-1" />
                  Good Lead
                </button>
                <button
                  className="btn bg-purple-600 hover:bg-purple-700 text-white text-sm py-1 px-3"
                  onClick={() => statusMutation.mutate({ id: opp.id, status: 'converted' })}
                >
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Converted
                </button>
                <button
                  className="btn bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3"
                  onClick={() => statusMutation.mutate({ id: opp.id, status: 'rejected' })}
                >
                  <XCircle className="h-3 w-3 inline mr-1" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold">Add Feedback</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{selectedOpportunity.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {['excellent', 'good', 'bad', 'spam'].map((action) => (
                  <button
                    key={action}
                    className={`btn ${
                      action === 'excellent' ? 'bg-green-600 hover:bg-green-700 text-white' :
                      action === 'good' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                      action === 'bad' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                      'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                    onClick={() => feedbackMutation.mutate({ 
                      id: selectedOpportunity.id, 
                      action, 
                      comment: feedbackComment 
                    })}
                  >
                    {action}
                  </button>
                ))}
              </div>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                rows={3}
                placeholder="Add a comment..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedOpportunity(null)
                  setFeedbackComment('')
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}