import React, { useState, useMemo } from 'react'
import { ArrowLeft, Folder, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { SearchBar } from '../components/ui/SearchBar'
import { Screen, Project } from '../types/mobile'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'

interface HistoryScreenProps {
  onNavigate: (screen: Screen) => void
  onSelectProject: (project: Project) => void
}

export const HistoryScreen = ({ 
  onNavigate, 
  onSelectProject
}: HistoryScreenProps) => {
  const { user } = useAuth()
  const { projects, checkins, deleteProject } = useData()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const canManageProjects = React.useMemo(() => {
    if (!user) return false
    const role = String((user as any).role || '').toLowerCase()
    return (user as any).isAdmin === true || role === 'admin' || role === 'supervisor'
  }, [user])

  const filteredProjects = useMemo(() => {
    let result = projects
    
    // Status Filter
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter)
    }

    // Search Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.client && p.client.toLowerCase().includes(term))
      )
    }
    return result
  }, [projects, searchTerm, statusFilter])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft /></button>
            <h1 className="text-xl font-bold text-slate-800">Histórico & Projetos</h1>
        </div>
        {canManageProjects && (
          <button 
              onClick={() => onNavigate('addProject')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Projeto</span>
          </button>
        )}
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar projetos..." className="flex-1" />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 min-w-[200px]"
        >
          <option value="">Todos os Status</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Pausado">Pausado</option>
          <option value="Concluído">Concluído</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map(p => (
          <Card key={p.id} onClick={() => { onSelectProject(p); onNavigate('projectDetail') }} className="p-6 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-900">
                <Folder size={20} />
              </div>
              <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-bold ${
                p.status === 'Em Andamento' ? 'bg-emerald-100 text-emerald-700' : 
                p.status === 'Pausado' ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {p.status}
              </span>
              {((user as any)?.isAdmin === true || (user as any)?.role === 'admin') && (
                <button
                  className="text-red-500 hover:bg-red-50 p-2 rounded"
                  title="Excluir projeto"
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = window.confirm('Tem certeza que deseja excluir este projeto?')
                    if (!ok) return
                    if (deleteProject) {
                      await deleteProject(p.id)
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
              </div>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{p.name}</h3>
            <p className="text-sm text-slate-500 mb-1">{p.client}</p>
            <p className="text-xs text-slate-400 mb-4">Responsável: {p.responsible}</p>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm text-slate-500">
              <span>{checkins.filter(c => c.projectId === p.id).length} check-ins</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
