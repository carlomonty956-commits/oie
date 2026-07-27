import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { opportunitiesApi } from '../lib/api'
import { 
  ArrowLeft, 
  ThumbsUp, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Send,
  Clock
} from 'lucide-react'

export function OpportunityDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [feedbackComment, setFeedbackComment] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  
  // Contact state
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [contactMethod, setContactMethod] = useState('external')
  const [contactNotes, setContactNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [responseText, setResponseText] = useState('')
  const [showResponseModal, setShowResponseModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => opportunitiesApi.get(id!),
    enabled: !!id,
  })

  // Contact data fetch
  const { data: contactData, refetch: refetchContact } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => fetch(`/api/opportunities/${id}/contact`).then(res => res.json()),
    enabled: !!id && showContactModal,
  })

  const feedbackMutation = useMutation({
    mutationFn: ({ action, comment }: { action: string; comment?: string }) =>
      opportunitiesApi.addFeedback(id!, { action, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      setFeedbackComment('')
      setShowFeedback(false)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => opportunitiesApi.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
    },
  })

  // Contact mutation
  const contactMutation = useMutation({
    mutationFn: (data: { method: string; message: string; followUpAt?: string; notes?: string }) =>
      fetch(`/api/opportunities/${id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      setShowContactModal(false)
      setContactMessage('')
      setContactNotes('')
      setFollowUpDate('')
    },
  })

  // Response mutation
  const responseMutation = useMutation({
    mutationFn: (responseText: string) =>
      fetch(`/api/opportunities/${id}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText }),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] })
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      setShowResponseModal(false)
      setResponseText('')
    },
  })

  const generateTemplate = () => {
    if (contactData?.template) {
      setContactMessage(contactData.template)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const opportunity = data?.opportunity
  if (!opportunity) {
    return <div className="text-center py-12 text-red-600">Opportunity not found</div>
  }

  const scoreBreakdown = opportunity.scoreBreakdown || {}
  const matchedKeywords = opportunity.matchedKeywords || []
  const matchedIntent = opportunity.matchedIntent || []

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      new: 'badge-blue',
      good_lead: 'badge-green',
      converted: 'badge-purple',
      rejected: 'badge-gray',
    }
    return map[status] || 'badge-gray'
  }

  const isStatusDisabled = (status: string) => {
    return opportunity.status === status
  }

  return (
    <div>
      <button
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="card">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`badge ${getStatusBadge(opportunity.status)}`}>
                {opportunity.status}
              </span>
              <span className="text-sm font-bold text-primary-600">
                Score: {opportunity.score}/100
              </span>
              <span className="text-sm text-gray-500">
                Source: {opportunity.source || 'Unknown'}
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-2">{opportunity.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span>Author: {opportunity.author || 'Unknown'}</span>
              <span>Created: {new Date(opportunity.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="mt-6 border-t pt-6">
          <h3 className="font-medium text-gray-700 mb-3">Score Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Keywords</p>
              <p className="text-lg font-bold text-blue-600">{scoreBreakdown.keywordScore || 0}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Intent</p>
              <p className="text-lg font-bold text-green-600">{scoreBreakdown.intentScore || 0}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Freshness</p>
              <p className="text-lg font-bold text-yellow-600">{scoreBreakdown.freshnessScore || 0}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Source</p>
              <p className="text-lg font-bold text-purple-600">{scoreBreakdown.sourceScore || 0}</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-primary-600">{scoreBreakdown.total || 0}</p>
            </div>
          </div>
        </div>

        {/* Matched Items */}
        {(matchedKeywords.length > 0 || matchedIntent.length > 0) && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-medium text-gray-700 mb-3">Matched Items</h3>
            <div className="flex flex-wrap gap-2">
              {matchedKeywords.map((kw: string, i: number) => (
                <span key={i} className="badge badge-blue">{kw}</span>
              ))}
              {matchedIntent.map((intent: string, i: number) => (
                <span key={i} className="badge badge-green">{intent}</span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mt-6 border-t pt-6">
          <h3 className="font-medium text-gray-700 mb-3">Content</h3>
          <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm text-gray-700 max-h-64 overflow-y-auto">
            {opportunity.content || 'No content available'}
          </div>
        </div>

        {opportunity.url && (
          <div className="mt-4">
            <a
              href={opportunity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline text-sm"
            >
              View Original →
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 border-t pt-6">
          <h3 className="font-medium text-gray-700 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={() => {
                setShowContactModal(true)
                refetchContact()
              }}
              disabled={opportunity.status === 'converted' || opportunity.status === 'rejected'}
            >
              <Send className="h-4 w-4" />
              Contact
            </button>
            <button
              className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              onClick={() => statusMutation.mutate('good_lead')}
              disabled={isStatusDisabled('good_lead') || isStatusDisabled('converted') || isStatusDisabled('rejected')}
            >
              <ThumbsUp className="h-4 w-4" />
              Good Lead
            </button>
            <button
              className="btn bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              onClick={() => statusMutation.mutate('converted')}
              disabled={isStatusDisabled('converted') || isStatusDisabled('rejected')}
            >
              <CheckCircle className="h-4 w-4" />
              Converted
            </button>
            <button
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              onClick={() => statusMutation.mutate('rejected')}
              disabled={isStatusDisabled('rejected') || isStatusDisabled('converted')}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
            <button
              className="btn bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
            </button>
          </div>
        </div>

        {/* Feedback section */}
        {showFeedback && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium text-gray-700 mb-3">Add Feedback</h4>
            <div className="flex gap-2 flex-wrap mb-3">
              {['excellent', 'good', 'bad', 'spam'].map((action) => (
                <button
                  key={action}
                  className={`btn ${
                    action === 'excellent' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    action === 'good' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                    action === 'bad' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                    'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  onClick={() => feedbackMutation.mutate({ action, comment: feedbackComment })}
                >
                  {action}
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Add a comment..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Send className="h-5 w-5" />
                Contact Opportunity
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Contact {opportunity.author || 'the person who posted this'}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Platform Badge */}
              {contactData?.platform && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">Platform:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {contactData.platform}
                  </span>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
                <h4 className="font-medium text-gray-700">Contact Information</h4>
                
                {/* Email */}
                {contactData?.contact?.email ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">📧 Email:</span>
                    <a href={`mailto:${contactData.contact.email}`} className="text-primary-600 hover:underline text-sm break-all">
                      {contactData.contact.email}
                    </a>
                    <button 
                      onClick={() => navigator.clipboard.writeText(contactData.contact.email)}
                      className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No email found in this post</div>
                )}
                
                {/* Username */}
                {contactData?.contact?.username && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">👤 Username:</span>
                    <span className="text-sm">{contactData.contact.username}</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText(contactData.contact.username)}
                      className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                )}
                
                {/* URL */}
                {contactData?.contact?.url && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">🔗 URL:</span>
                    <a href={contactData.contact.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm truncate max-w-xs">
                      View Original Post
                    </a>
                  </div>
                )}
              </div>

              {/* How to Contact */}
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  💡 <span className="font-medium">How to contact:</span> Copy the email or username above and reach out directly via email or the platform's messaging system.
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Your Message
                  <button
                    className="ml-2 text-xs text-primary-600 hover:underline"
                    onClick={generateTemplate}
                  >
                    Generate Template
                  </button>
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={4}
                  placeholder="Write your message here... This will be saved as a note."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Add any notes about this contact..."
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                />
              </div>

              {/* Contact History */}
              {contactData?.history && contactData.history.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Contact History</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {contactData.history.map((h: any) => (
                      <div key={h.id} className="text-sm bg-gray-50 p-2 rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium">{h.method || 'external'}</span>
                          <span className="text-gray-500">{new Date(h.contacted_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-600 text-xs truncate">{h.message}</p>
                        {h.response_received && (
                          <span className="text-green-600 text-xs">✓ Response received</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowContactModal(false)
                  setContactMessage('')
                }}
              >
                Close
              </button>
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={() => {
                  contactMutation.mutate({
                    method: contactMethod,
                    message: contactMessage,
                    followUpAt: followUpDate || undefined,
                    notes: contactNotes || `Contact info: ${contactData?.contact?.contactInfo || ''}`,
                  })
                }}
                disabled={!contactMessage.trim()}
              >
                <CheckCircle className="h-4 w-4" />
                Mark as Contacted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                Log Response
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Response Text</label>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={4}
                  placeholder="What did they say?"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowResponseModal(false)
                  setResponseText('')
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => responseMutation.mutate(responseText)}
                disabled={!responseText.trim()}
              >
                Log Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}