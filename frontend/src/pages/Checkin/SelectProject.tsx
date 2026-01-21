import React, { useState, useMemo } from 'react'
import { ArrowLeft, Plus, Folder, ChevronRight, MapPin } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { Card } from '../../components/ui/Card'
import { SearchBar } from '../../components/ui/SearchBar'
import { Button } from '../../components/ui/Button'
import { Screen, Project } from '../../types/mobile'
import { useGeoLocation } from '../../hooks/useGeoLocation'
import toast from 'react-hot-toast'

interface SelectProjectScreenProps {
  onNavigate: (screen: Screen) => void
  onSelectProject: (project: Project) => void
}

export const SelectProjectScreen = ({ onNavigate, onSelectProject }: SelectProjectScreenProps) => {
  const { user, isAdmin } = useAuth()
  const { projects } = useData()
  const { getCurrentLocation } = useGeoLocation()
  const [searchTerm, setSearchTerm] = useState('')

  const handleRequestLocation = async () => {
    try {
      toast('Solicitando localização...', { icon: '📍' })
      await getCurrentLocation()
      toast.success('Localização autorizada!')
    } catch (e) {
      toast.error('Permissão de localização negada ou indisponível.')
    }
  }

  const filteredProjects = useMemo(() => {
    // Backend already filters projects based on user role (responsible or contributor)
    // So we can just use the projects list directly
    const base = projects
    if (!searchTerm.trim()) return base
    const term = searchTerm.toLowerCase()
    return base.filter(p => 
      p.name.toLowerCase().includes(term) ||
      (p.client && p.client.toLowerCase().includes(term))
    )
  }, [projects, searchTerm])

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('dashboard')} className="p-2 hover:bg-slate-200 rounded-full no-print">
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Selecionar Projeto</h1>
            {user && !isAdmin && (
              <p className="text-xs text-slate-500">Seus projetos atribuídos</p>
            )}
          </div>
        </div>
        <button
          onClick={handleRequestLocation}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <MapPin size={20} />
          <span className="hidden sm:inline">Solicitar localização</span>
        </button>
      </header>

      <div className="flex-1 space-y-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Buscar por nome ou cliente..." />
        {isAdmin && (
          <Button 
            variant="outline" 
            onClick={() => onNavigate('addProject')} 
            icon={Plus} 
            className="border-dashed border-2 no-print"
          >
            Adicionar Novo Projeto
          </Button>
        )}
        
        <div className="space-y-3 mt-6">
          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Folder size={48} className="mx-auto mb-4 opacity-50" />
              <p>Nenhum projeto disponível</p>
            </div>
          )}
          
          {filteredProjects.map(p => (
            <Card key={p.id} onClick={() => onSelectProject(p)} className="p-5 flex items-center justify-between group">
              <div>
                <h3 className="font-bold text-slate-800">{p.name}</h3>
                <p className="text-sm text-slate-500">{p.client}</p>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-blue-900" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
