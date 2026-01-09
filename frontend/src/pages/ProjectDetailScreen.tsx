import React, { useState } from 'react'
import { ArrowLeft, FileText, Edit, History, Users, Plus, Trash2, FileSpreadsheet, CheckCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Screen, Project, Checkin } from '../types/mobile'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { ACTIVITY_TAGS } from '../constants'
import { useParams } from 'react-router-dom'
import { useProject, useProjectContributors, useAddContributor, useRemoveContributor, useProjectStatus } from '../hooks/useProjects'
import { userService, checkinService } from '../services/api'
import { UserRole } from '../types/auth.types'

// --- PRINT STYLES ---
const PrintStyles = () => (
  <style>{`
    @media print {
      html, body {
        margin: 0;
        padding: 0;
        background: white !important;
        height: auto !important;
        overflow: visible !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      .printable-area {
        display: block !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        flex: none !important;
      }
      
      .print-container {
        display: block !important;
        height: auto !important;
        overflow: visible !important;
        max-height: none !important;
      }
      
      /* Evita quebra de página dentro dos cards */
      .print\\:break-inside-avoid {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      button, input, select, textarea {
        display: none !important;
      }
      
      .rounded-2xl, .rounded-xl {
        border: 1px solid #e2e8f0 !important;
      }
      
      @page {
        size: A4;
        margin: 1cm;
      }
    }
  `}</style>
)

interface ProjectDetailScreenProps {
  selectedProject?: Project | null
  onNavigate: (screen: Screen) => void
}

export const ProjectDetailScreen = ({ 
  selectedProject: propProject, 
  onNavigate
}: ProjectDetailScreenProps) => {
  const { user, isAdmin } = useAuth()
  const { checkins, updateCheckin, refreshData } = useData()
  const [editingCheckin, setEditingCheckin] = useState<Checkin | null>(null)
  
  const { id } = useParams<{ id: string }>()
  const { data: fetchedProject, isLoading, error } = useProject(id || '')
  
  const selectedProject = fetchedProject || propProject

  // Contributors logic
  const { data: contributors, isLoading: isLoadingContributors } = useProjectContributors(selectedProject ? parseInt(selectedProject.id) : 0)
  const addContributor = useAddContributor()
  const removeContributor = useRemoveContributor()
  const [isAddContributorModalOpen, setIsAddContributorModalOpen] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [foundUsers, setFoundUsers] = useState<{id: number, label: string, subLabel: string}[]>([])

  const handleSearchUsers = async (query: string) => {
    setUserSearch(query)
    if (query.length > 2) {
      try {
        const users = await userService.search(query)
        setFoundUsers(users)
      } catch (e) {
        console.error(e)
      }
    } else {
      setFoundUsers([])
    }
  }

  const handleAddContributor = (userId: number) => {
    if (selectedProject) {
      addContributor.mutate({ projectId: parseInt(selectedProject.id), userId })
      setIsAddContributorModalOpen(false)
      setUserSearch('')
      setFoundUsers([])
    }
  }

  // Status logic
  const { start, pause, complete, cancel } = useProjectStatus()
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  const handleStatusUpdate = (action: 'start' | 'pause' | 'complete' | 'cancel') => {
    if (!selectedProject) return
    const pid = parseInt(selectedProject.id)
    if (action === 'start') start.mutate(pid)
    else if (action === 'pause') pause.mutate(pid)
    else if (action === 'complete') complete.mutate({ id: pid })
    else if (action === 'cancel') cancel.mutate({ id: pid })
    setIsStatusModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold text-red-600">Erro ao carregar projeto</h2>
        <Button onClick={() => onNavigate('dashboard')} className="mt-4">Voltar</Button>
      </div>
    )
  }

  if (!selectedProject) return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold text-slate-600">Projeto não encontrado</h2>
      <Button onClick={() => onNavigate('dashboard')} className="mt-4">Voltar</Button>
    </div>
  )
  
  const projectCheckins = (checkins || []).filter(c => c.projectId === selectedProject.id)
  
  // Check if user can edit this project
  const canEdit = isAdmin || user?.role === UserRole.SUPERVISOR || user?.email === selectedProject.responsibleEmail

  const handleExportPDF = () => {
    window.print()
  }
const handleExportCSV = () => {
    if (!projectCheckins.length) return

    // CONFIGURAÇÃO: Usar ponto e vírgula para Excel Brasil
    const SEPARATOR = ';' 

    // Headers (Total: 6 colunas)
    const headers = ['Data', 'Chegada', 'Início', 'Fim', 'Total Horas', 'Observações/Atividades']
    
    // Data rows
    const rows = projectCheckins.map(c => {
      const date = new Date(c.date).toLocaleDateString('pt-BR')
      
      const arrivalTime = c.arrivalTime 
        ? new Date(c.arrivalTime.endsWith('Z') || c.arrivalTime.includes('+') || c.arrivalTime.includes('-') ? c.arrivalTime : c.arrivalTime + 'Z').toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
        : ''
        
      const startTime = c.startTime 
        ? new Date(c.startTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
        : ''
        
      const endTime = c.endTime 
        ? new Date(c.endTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
        : ''
        
      // --- CORREÇÃO AQUI ---
      // 1. Pegamos os textos crus
      const rawActivities = (c.activities || []).join(', '); // Proteção caso venha null
      const rawObservations = c.observations || '';

      // 2. Juntamos tudo numa string só (já que você removeu a coluna separada)
      // Exemplo de formato: "Atividades: X, Y. Obs: Z"
      let combinedText = '';
      if (rawActivities) combinedText += `Atividades: ${rawActivities}. `;
      if (rawObservations) combinedText += `Obs: ${rawObservations}`;

      // 3. Limpeza: Escapar aspas duplas (Excel usa "") e remover quebras de linha
      const safeText = combinedText.replace(/"/g, '""').replace(/(\r\n|\n|\r)/gm, " ");
      
      // 4. Envolvemos em aspas para o CSV entender que é um campo de texto único
      const finalColumn = `"${safeText}"`;

      return [
        date,
        arrivalTime,
        startTime,
        endTime,
        c.totalHours || '',
        finalColumn // Agora enviamos apenas 1 coluna final combinada, totalizando 6
      ].join(SEPARATOR)
    })

    // Combine headers and rows
    const csvContent = [headers.join(SEPARATOR), ...rows].join('\n')
    
    // Create blob with BOM for Excel UTF-8 support
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // Create download link
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `relatorio_${(selectedProject.name || 'projeto').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleUpdateCheckin = (checkinData: Partial<Checkin>) => {
    if (!editingCheckin) return

    // Recalculate total hours if times changed
    let totalHours = editingCheckin.totalHours
    if (checkinData.startTime && checkinData.endTime) {
      const start = new Date(checkinData.startTime)
      const end = new Date(checkinData.endTime)
      const diff = (end.getTime() - start.getTime()) / 1000 / 60
      const hours = Math.floor(diff / 60)
      const mins = Math.floor(diff % 60)
      totalHours = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
    }

    const updatedCheckin = { ...editingCheckin, ...checkinData, totalHours } as Checkin
    updateCheckin(updatedCheckin)
    setEditingCheckin(null)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto print:h-auto print:block print-container">
      <PrintStyles />
      
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('history')} className="p-2 hover:bg-slate-200 rounded-full no-print"><ArrowLeft /></button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{selectedProject.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                selectedProject.status === 'Concluído' ? 'bg-green-100 text-green-800' :
                selectedProject.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                selectedProject.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                selectedProject.status === 'Pausado' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedProject.status}
              </span>
              {canEdit && (
                <button onClick={() => setIsStatusModalOpen(true)} className="text-slate-400 hover:text-blue-600 no-print" title="Alterar Status">
                  <Edit size={14} />
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500">Cliente: {selectedProject.client}</p>
            <p className="text-sm text-slate-500">Responsável: {selectedProject.responsible}</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <button 
            onClick={handleExportCSV} 
            className="p-2 hover:bg-green-50 rounded-full"
            title="Exportar CSV (Excel)"
          >
            <FileSpreadsheet className="text-green-700" size={20} />
          </button>
          <button 
            onClick={handleExportPDF} 
            className="p-2 hover:bg-blue-50 rounded-full"
            title="Exportar PDF"
          >
            <FileText className="text-blue-900" size={20} />
          </button>
        </div>
      </header>

      {/* Contributors Section */}
      <Card className="mb-6 p-5 no-print">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} />
            Equipe / Contribuintes
          </h2>
          {canEdit && (
            <button 
              onClick={() => setIsAddContributorModalOpen(true)}
              className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition-colors"
              title="Adicionar Contribuinte"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {isLoadingContributors ? (
          <div className="text-center py-4">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {Array.isArray(contributors) && contributors.length > 0 ? (
              contributors.map((contributor: any) => (
                <div key={contributor.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{contributor.name}</p>
                    <p className="text-xs text-slate-500">{contributor.email}</p>
                  </div>
                  {canEdit && (
                    <button 
                      onClick={() => removeContributor.mutate({ projectId: parseInt(selectedProject!.id), userId: contributor.id })}
                      className="text-red-500 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm italic">Nenhum contribuinte adicional.</p>
            )}
          </div>
        )}
      </Card>

      <div className="printable-area space-y-4 print:flex-none print:overflow-visible print:h-auto">
        {projectCheckins.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <History size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhum apontamento encontrado.</p>
          </div>
        )}
        
        {projectCheckins.map(c => (
          <Card key={c.id} className="p-5 print:break-inside-avoid">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-slate-800">{new Date(c.date).toLocaleDateString()}</p>
                <div className="text-sm text-slate-500">
                  {c.arrivalTime && (
                    <p className="text-xs text-slate-400 mb-0.5">
                      Chegada: {new Date(c.arrivalTime.endsWith('Z') || c.arrivalTime.includes('+') || c.arrivalTime.includes('-') ? c.arrivalTime : c.arrivalTime + 'Z').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                  )}
                  <p>
                    {c.startTime && new Date(c.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {c.endTime && new Date(c.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-mono font-bold text-blue-900">{c.totalHours}h</span>
                <span className="text-xs text-slate-400">Total</span>
              </div>
            </div>
            
            <div className="space-y-4 mt-4">
              {/* Observations Section */}
              {c.observations && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <FileText size={14} /> Observações
                  </h4>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {c.observations}
                  </p>
                </div>
              )}

              {/* Activities Section */}
              {c.activities && c.activities.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} /> Atividades Realizadas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {c.activities.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium border border-blue-100 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(user?.isAdmin || user?.role === 'admin') && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end items-center gap-4 no-print">
                <button 
                   className="text-sm font-bold text-red-600 flex items-center gap-1 hover:underline"
                   onClick={async () => {
                     if (window.confirm('Tem certeza que deseja excluir este registro de histórico?')) {
                       try {
                         await checkinService.delete(c.id)
                         await refreshData()
                       } catch (e) {
                         alert('Erro ao excluir check-in')
                       }
                     }
                   }}
                >
                   <Trash2 size={14} /> Excluir
                </button>
                <button 
                  onClick={() => setEditingCheckin(c)}
                  className="text-sm font-bold text-blue-900 flex items-center gap-1 hover:underline"
                >
                  <Edit size={14} /> Editar
                </button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Add Contributor Modal */}
      <Modal
        isOpen={isAddContributorModalOpen}
        onClose={() => setIsAddContributorModalOpen(false)}
        title="Adicionar Contribuinte"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Buscar Usuário</label>
            <Input 
              value={userSearch}
              onChange={(e) => handleSearchUsers(e.target.value)}
              placeholder="Nome ou email..."
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {foundUsers.map(user => (
              <div key={user.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded border border-slate-100">
                <div>
                  <p className="font-medium">{user.label}</p>
                  <p className="text-xs text-slate-500">{user.subLabel}</p>
                </div>
                <button 
                  className="py-1 px-3 text-sm w-auto bg-white text-slate-700 border-2 border-slate-200 hover:bg-slate-50 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => handleAddContributor(user.id)}
                >
                  Adicionar
                </button>
              </div>
            ))}
            {userSearch.length > 2 && foundUsers.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-2">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Checkin Modal */}
      <EditCheckinModal 
        checkin={editingCheckin}
        onClose={() => setEditingCheckin(null)}
        onSave={handleUpdateCheckin}
      />

      {/* Status Change Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Alterar Status do Projeto"
      >
        <div className="space-y-3">
           <p className="text-sm text-slate-600 mb-4">Selecione o novo status para o projeto:</p>
           
           {(selectedProject.status === 'Planejamento' || selectedProject.status === 'Pausado') && (
             <Button onClick={() => handleStatusUpdate('start')} className="w-full justify-start">
               <CheckCircle className="mr-2 h-4 w-4" /> Iniciar (Em Andamento)
             </Button>
           )}
           
           {selectedProject.status === 'Em Andamento' && (
             <Button onClick={() => handleStatusUpdate('pause')} variant="outline" className="w-full justify-start">
               <History className="mr-2 h-4 w-4" /> Pausar
             </Button>
           )}
           
           {(selectedProject.status === 'Em Andamento' || selectedProject.status === 'Pausado') && (
             <Button onClick={() => handleStatusUpdate('complete')} variant="success" className="w-full justify-start">
               <CheckCircle className="mr-2 h-4 w-4" /> Concluir Projeto
             </Button>
           )}
           
           {selectedProject.status !== 'Cancelado' && selectedProject.status !== 'Concluído' && (
             <Button onClick={() => handleStatusUpdate('cancel')} variant="danger" className="w-full justify-start">
               <Trash2 className="mr-2 h-4 w-4" /> Cancelar Projeto
             </Button>
           )}
        </div>
      </Modal>
    </div>
  )
}

const EditCheckinModal = ({ 
  checkin, 
  onClose, 
  onSave 
}: { 
  checkin: Checkin | null
  onClose: () => void
  onSave: (data: Partial<Checkin>) => void
}) => {
  if (!checkin) return null

  const [formData, setFormData] = useState<Partial<Checkin>>({
    arrivalTime: checkin.arrivalTime,
    startTime: checkin.startTime,
    endTime: checkin.endTime,
    activities: checkin.activities || [],
    otherActivities: checkin.otherActivities || '',
    observations: checkin.observations || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const formatDateTimeLocal = (iso?: string) => {
    if (!iso) return ''
    return new Date(iso).toISOString().slice(0, 16)
  }

  return (
    <Modal isOpen={!!checkin} onClose={onClose}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Editar Check-in</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="datetime-local"
            label="Horário de Chegada"
            value={formatDateTimeLocal(formData.arrivalTime)}
            onChange={(e) => setFormData({...formData, arrivalTime: new Date(e.target.value).toISOString()})}
          />

          <Input
            type="datetime-local"
            label="Horário de Início"
            value={formatDateTimeLocal(formData.startTime)}
            onChange={(e) => setFormData({...formData, startTime: new Date(e.target.value).toISOString()})}
          />

          <Input
            type="datetime-local"
            label="Horário de Término"
            value={formatDateTimeLocal(formData.endTime)}
            onChange={(e) => setFormData({...formData, endTime: new Date(e.target.value).toISOString()})}
          />

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Atividades</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const newTags = formData.activities?.includes(tag) 
                      ? formData.activities.filter(t => t !== tag)
                      : [...(formData.activities || []), tag]
                    setFormData({...formData, activities: newTags})
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    formData.activities?.includes(tag)
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Outras Atividades"
            value={formData.otherActivities || ''}
            onChange={(e) => setFormData({...formData, otherActivities: e.target.value})}
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Observações</label>
            <textarea
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900 focus:border-transparent outline-none transition-all"
              rows={4}
              value={formData.observations || ''}
              onChange={(e) => setFormData({...formData, observations: e.target.value})}
            />
          </div>

          <Button type="submit" variant="success">
            Salvar Alterações
          </Button>
        </form>
      </div>
    </Modal>
  )
}
