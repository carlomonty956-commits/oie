import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../lib/api'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

export function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 60000,
  })

  const { data: trends } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: () => dashboardApi.getTrends(7),
    refetchInterval: 60000,
  })

  const { data: topOpportunities } = useQuery({
    queryKey: ['top-opportunities'],
    queryFn: () => dashboardApi.getTopOpportunities(10),
    refetchInterval: 60000,
  })

  const { data: sourcePerformance } = useQuery({
    queryKey: ['source-performance'],
    queryFn: dashboardApi.getSourcePerformance,
    refetchInterval: 60000,
  })

  if (overviewLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  const stats = overview?.overview || {}
  const sources = sourcePerformance?.sources || []

  const statCards = [
    {
      label: 'Total Opportunities',
      value: stats.total_opportunities || 0,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'New',
      value: stats.new || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Converted',
      value: stats.converted || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Rejected',
      value: stats.rejected || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div className={`rounded-full p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{stat.label}</p>
            {stat.label === 'Total Opportunities' && stats.avg_score && (
              <p className="text-xs text-gray-400">Avg Score: {Math.round(stats.avg_score)}/100</p>
            )}
          </div>
        ))}
      </div>

      {/* Trends chart */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Opportunity Trends (7 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends?.trends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} />
              <Line type="monotone" dataKey="good_lead" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="converted" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source performance */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Source Performance</h3>
          <div className="space-y-3">
            {sources.map((source: any) => (
              <div key={source.source}>
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{source.source}</span>
                  <span className="font-medium">{source.opportunity_count || 0}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ 
                      width: source.opportunity_count 
                        ? `${Math.min((source.opportunity_count / 100) * 100, 100)}%` 
                        : '0%' 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top opportunities */}
        <div className="card">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Top Opportunities</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {(topOpportunities?.opportunities || []).map((opp: any) => (
              <div key={opp.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{opp.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 capitalize">{opp.source}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{opp.project_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${
                    opp.status === 'good_lead' ? 'badge-green' :
                    opp.status === 'new' ? 'badge-blue' :
                    'badge-gray'
                  }`}>
                    {opp.status}
                  </span>
                  <span className="text-sm font-bold text-primary-600">{opp.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-4">Recent Activity</h3>
        <div className="text-sm text-gray-500">
          Last 24 hours: {overview?.recent?.last_24h || 0} new opportunities
          {overview?.recent?.good_lead_24h > 0 && (
            <span className="ml-2 text-green-600">
              ({overview.recent.good_lead_24h} good leads)
            </span>
          )}
        </div>
      </div>
    </div>
  )
}