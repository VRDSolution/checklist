import React, { useState, useEffect } from 'react'
import { ArrowLeft, AlertCircle, Plus } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Autocomplete, AutocompleteOption } from '../components/ui/Autocomplete'
import { ClientFormModal } from '../components/modals/ClientFormModal'
import { Screen, Project } from '../types/mobile'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { clientService, userService } from '../services/api'
import { useParams } from 'react-router-dom'
import { useProject } from '../hooks/useProjects'

interface ProjectFormScreenProps {
  onNavigate: (screen: Screen) => void
  onProjectSaved?: (project: Project) => void
  initialData?: Project | null
  mode?: 'add' | 'edit'
}

export const ProjectFormScreen = ({ 
  onNavigate, 
  onProjectSaved,
  initialData,
  mode = 'add'
}: ProjectFormScreenProps) => {
  const { user } = useAuth()
  const isAdmin = (user as any)?.isAdmin === true || user?.role === 'admin'
  const { addProject, updateProject } = useData()
  const { id } = useParams<{ id: string }>()
  const { data: fetchedProject, isLoading } = useProject(id || '')

  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Project>>(
    initialData || {
      name: '',
      client: '',
      clientId: undefined,
      responsible: '',
      responsibleId: undefined,
      responsibleEmail: '',
      startDate: '',
      endDate: '',
      observations: '',
      status: 'Em Andamento'
    }
  )

  useEffect(() => {
    if (fetchedProject && mode === 'edit') {
      setFormData(fetchedProject)
    }
  }, [fetchedProject, mode])

  if (mode === 'edit' && isLoading && !initialData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  const [errors, setErrors] = useState<{name?: string; client?: string; responsibleEmail?: string}>({})

  const validateForm = () => {
    const newErrors: typeof errors = {}
    
    if (!formData.name || formData.name.trim() === '') {
      newErrors.name = 'Nome do projeto é obrigatório'
    }
    
    if (!formData.client || formData.client.trim() === '') {
      newErrors.client = 'Cliente é obrigatório'
    }

    if (!formData.responsibleEmail || !formData.responsibleEmail.includes('@')) {
      newErrors.responsibleEmail = 'E-mail válido é obrigatório'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleClientSearch = async (query: string): Promise<AutocompleteOption[]> => {
    console.log('[CLIENT SEARCH] Starting search with query:', query)
    try {
      // Client service already returns { id, label, subLabel }
      const options = await clientService.search(query)
      console.log('[CLIENT SEARCH] Options:', options)
      return options as unknown as AutocompleteOption[]
    } catch (error) {
      console.error('[CLIENT SEARCH] Error searching clients:', error)
      return []
    }
  }

  const handleUserSearch = async (query: string): Promise<AutocompleteOption[]> => {
    console.log('[USER SEARCH] Starting search with query:', query)
    try {
      // User service returns { id, label: name, subLabel: email }
      const options = await userService.search(query)
      console.log('[USER SEARCH] Options:', options)
      return options as unknown as AutocompleteOption[]
    } catch (error) {
      console.error('[USER SEARCH] Error searching users:', error)
      return []
    }
  }

  // Removida lógica de autopreenchimento para simplificar UX; e-mail agora é editável manualmente.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (mode === 'add') {
        const newProject: Project = {
            id: Date.now().toString(),
            name: formData.name!,
            client: formData.client!,
            clientId: formData.clientId,
            responsible: formData.responsible || 'Técnico',
            responsibleId: formData.responsibleId,
            responsibleEmail: formData.responsibleEmail!,
            startDate: formData.startDate || new Date().toISOString().split('T')[0],
            status: formData.status || 'Em Andamento',
            endDate: formData.endDate,
            observations: formData.observations
        }
        
        const createdProject = await addProject(newProject)
        
        if (createdProject) {
            if (onProjectSaved) {
                onProjectSaved(createdProject)
            } else {
                onNavigate('selectProject')
            }
        }
    } else {
        if (initialData && initialData.id) {
             const updatedProject = { ...initialData, ...formData } as Project
             updateProject(updatedProject)
             if (onProjectSaved) {
                 onProjectSaved(updatedProject)
             } else {
                 onNavigate('projectDetail')
             }
        }
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => onNavigate(mode === 'edit' ? 'projectDetail' : 'selectProject')} className="p-2 hover:bg-slate-200 rounded-full">
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-slate-800">{mode === 'edit' ? 'Editar Projeto' : 'Novo Projeto'}</h1>
      </header>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input 
              label="Nome do Projeto *" 
              placeholder="Ex: Instalação Fibra" 
              value={formData.name || ''} 
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
              disabled={mode === 'edit' && !isAdmin}
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Autocomplete
                  label="Cliente *"
                  placeholder="Buscar cliente..."
                  onSearch={handleClientSearch}
                  onSelect={(option) => {
                    setFormData({
                      ...formData,
                      client: option.label,
                      clientId: Number(option.id)
                    })
                  }}
                  initialValue={formData.client ? { id: formData.clientId || 0, label: formData.client } : null}
                />
              </div>
              <button 
                type="button"
                className="w-10 h-10 mb-[2px] flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all"
                onClick={() => setIsClientModalOpen(true)}
                title="Novo Cliente"
              >
                <Plus size={20} />
              </button>
            </div>
            {errors.client && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.client}
              </p>
            )}
          </div>

          <div>
            <Autocomplete
              label="Responsável"
              placeholder="Buscar técnico..."
              onSearch={handleUserSearch}
              onSelect={(option: AutocompleteOption) => {
                setFormData(prev => ({
                  ...prev,
                  responsible: option.label,
                  responsibleId: Number(option.id),
                  // Se vier e-mail do serviço, pré-preenche; caso contrário mantém valor atual
                  responsibleEmail: option.subLabel || prev.responsibleEmail
                }))
              }}
              initialValue={formData.responsible ? { id: formData.responsibleId || 0, label: formData.responsible } : null}
            />
          </div>

          <div>
            <Input 
              label="E-mail do Responsável *" 
              type="email"
              placeholder="tecnico@vrdsolution.com" 
              value={formData.responsibleEmail || ''} 
              onChange={(e) => setFormData({...formData, responsibleEmail: e.target.value})}
              required
            />
            {errors.responsibleEmail && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle size={14} />
                {errors.responsibleEmail}
              </p>
            )}
          </div>
          
          <Select
            label="Status"
            value={formData.status || 'Em Andamento'}
            onChange={(e) => setFormData({...formData, status: e.target.value as any})}
          >
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Pausado">Pausado</option>
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="date" 
              label="Data Início" 
              value={formData.startDate || ''} 
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
            />
            <Input 
              type="date" 
              label="Data Fim" 
              value={formData.endDate || ''} 
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Observações</label>
            <textarea
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all"
              rows={3}
              value={formData.observations || ''}
              onChange={(e) => setFormData({...formData, observations: e.target.value})}
              placeholder="Detalhes adicionais..."
            />
          </div>

          <div className="pt-4">
            <Button type="submit" variant="success">
              {mode === 'edit' ? 'Salvar Alterações' : 'Salvar e Iniciar'}
            </Button>
          </div>
        </form>
      </Card>

      <ClientFormModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(client) => {
          setFormData({
            ...formData,
            client: client.name,
            clientId: client.id
          })
          setIsClientModalOpen(false)
        }}
      />
    </div>
  )
}
