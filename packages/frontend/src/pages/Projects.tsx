import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../lib/api'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export function Projects() {
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })

  const projects = data?.projects || []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingProject(null)
            setShowModal(true)
          }}
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No projects yet. Create your first project to start finding opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => (
            <div key={project.id} className="card hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate">{project.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600"
                    onClick={() => {
                      setEditingProject(project)
                      setShowModal(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-600"
                    onClick={() => {
                      if (confirm(`Delete project "${project.name}"?`)) {
                        deleteMutation.mutate(project.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm">
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
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => setShowModal(false)}
          onSave={(data: any) => {
            if (editingProject) {
              projectsApi.update(editingProject.id, data).then(() => {
                queryClient.invalidateQueries({ queryKey: ['projects'] })
                setShowModal(false)
              })
            } else {
              createMutation.mutate(data)
            }
          }}
        />
      )}
    </div>
  )
}

function ProjectModal({ project, onClose, onSave }: { project: any; onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    config: project?.config || {
      keywords: [],
      intentPhrases: [],
      negativeKeywords: [],
      minScore: 30,
    },
  })

  const [keywordInput, setKeywordInput] = useState('')
  const [intentInput, setIntentInput] = useState('')
  const [negativeInput, setNegativeInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Keywords</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Add keyword"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && keywordInput.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        keywords: [...formData.config.keywords, keywordInput.trim()],
                      },
                    })
                    setKeywordInput('')
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.config.keywords.map((kw: string, i: number) => (
                <span key={i} className="badge badge-blue">
                  {kw}
                  <button
                    type="button"
                    className="ml-1 text-blue-800 hover:text-blue-900"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          keywords: formData.config.keywords.filter((_: string, j: number) => j !== i),
                        },
                      })
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Intent Phrases</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Add intent phrase"
                value={intentInput}
                onChange={(e) => setIntentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && intentInput.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        intentPhrases: [...formData.config.intentPhrases, intentInput.trim()],
                      },
                    })
                    setIntentInput('')
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.config.intentPhrases.map((ip: string, i: number) => (
                <span key={i} className="badge badge-green">
                  {ip}
                  <button
                    type="button"
                    className="ml-1 text-green-800 hover:text-green-900"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          intentPhrases: formData.config.intentPhrases.filter((_: string, j: number) => j !== i),
                        },
                      })
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Negative Keywords</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Add negative keyword"
                value={negativeInput}
                onChange={(e) => setNegativeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && negativeInput.trim()) {
                    e.preventDefault()
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        negativeKeywords: [...(formData.config.negativeKeywords || []), negativeInput.trim()],
                      },
                    })
                    setNegativeInput('')
                  }
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.config.negativeKeywords || []).map((nk: string, i: number) => (
                <span key={i} className="badge badge-gray">
                  {nk}
                  <button
                    type="button"
                    className="ml-1 text-gray-800 hover:text-gray-900"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          negativeKeywords: (formData.config.negativeKeywords || []).filter(
                            (_: string, j: number) => j !== i
                          ),
                        },
                      })
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Score</label>
            <input
              type="number"
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2"
              value={formData.config.minScore || 30}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    minScore: parseInt(e.target.value) || 0,
                  },
                })
              }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}