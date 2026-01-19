import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Play, StopCircle, CheckCircle, Clock } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Screen, Project, Checkin } from '../types/mobile'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { ACTIVITY_TAGS } from '../constants'
import { useNavigate, useParams } from 'react-router-dom'
import { useProject } from '../hooks/useProjects'
import { useStartCheckin, useStopCheckin } from '../hooks/useCheckins'
import { sprintService } from '../services/sprint.service'
import { SprintTask } from '../types/sprint.types'
import toast from 'react-hot-toast'

interface WorkflowScreenProps {
  selectedProject?: Project | null
  onNavigate: (screen: Screen) => void
  workflowStep?: 'idle' | 'arrived' | 'working' | 'checkout'
  setWorkflowStep?: (step: 'idle' | 'arrived' | 'working' | 'checkout') => void
}

export const WorkflowScreen = ({ 
  selectedProject: propProject,
  onNavigate,
  workflowStep: propStep,
  setWorkflowStep: propSetStep
}: WorkflowScreenProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activeCheckin, refreshData } = useData()
  
  const { projectId } = useParams<{ projectId: string }>()
  const { data: fetchedProject, isLoading } = useProject(projectId || '')
  
  const selectedProject = fetchedProject || propProject

  // Internal state if props are not provided
  const [internalStep, setInternalStep] = useState<'idle' | 'arrived' | 'working' | 'checkout'>('idle')
  
  const workflowStep = propStep || internalStep
  const setWorkflowStep = propSetStep || setInternalStep
  
  const [timestamps, setTimestamps] = useState<{arrival?: string, start?: string, end?: string}>({})
  const [checkoutData, setCheckoutData] = useState({ activities: [] as string[], other: '', obs: '' })
  const [suggestedTasks, setSuggestedTasks] = useState<SprintTask[]>([])

  // Mutations
  const startCheckinMutation = useStartCheckin()
  const stopCheckinMutation = useStopCheckin()

  // Restore state from active checkin or local storage
  useEffect(() => {
    // 1. Check backend active checkin (Working state)
    if (activeCheckin && selectedProject && activeCheckin.projectId === selectedProject.id) {
      setWorkflowStep('working')
      
      // Try to recover arrival time from local storage if backend doesn't provide it (or provides same as start)
      const savedState = localStorage.getItem(`workflow_state_${selectedProject?.id}`)
      let arrivalTime = activeCheckin.arrivalTime

      if (savedState) {
        try {
          const parsed = JSON.parse(savedState)
          if (parsed.arrival) {
             arrivalTime = parsed.arrival
          }
        } catch (e) {
          // ignore
        }
      }

      setTimestamps(prev => ({
        ...prev,
        start: activeCheckin.startTime,
        arrival: arrivalTime
      }))
      return
    }

    // 2. Check local storage for Arrival state (Pre-backend)
    const savedState = localStorage.getItem(`workflow_state_${selectedProject?.id}`)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        // Only restore if it's recent (e.g., less than 24h)
        const arrivalTime = new Date(parsed.arrival)
        if (Date.now() - arrivalTime.getTime() < 24 * 60 * 60 * 1000) {
          setTimestamps(prev => ({ ...prev, arrival: parsed.arrival }))
          setWorkflowStep('arrived')
        } else {
          localStorage.removeItem(`workflow_state_${selectedProject?.id}`)
        }
      } catch (e) {
        console.error('Failed to parse saved workflow state', e)
      }
    }
  }, [activeCheckin, selectedProject, setWorkflowStep])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!selectedProject) return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-bold text-slate-600">Projeto não encontrado</h2>
      <Button onClick={() => onNavigate('dashboard')} className="mt-4">Voltar</Button>
    </div>
  )
  
  const formatTime = (iso?: string) => {
    if (!iso) return '--:--'
    // Ensure we treat the string as UTC if it doesn't have timezone info
    // If backend sends "2023-12-03T12:29:00+00:00", new Date() handles it correctly.
    // If backend sends "2023-12-03T12:29:00", we append Z to force UTC.
    const dateStr = iso.endsWith('Z') || iso.includes('+') || iso.includes('-') ? iso : iso + 'Z'
    return new Date(dateStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }

  const handleWorkflowAction = async (action: 'arrival' | 'start' | 'end') => {
    const now = new Date().toISOString()
    if (action === 'arrival') {
      setTimestamps({ ...timestamps, arrival: now })
      setWorkflowStep('arrived')
      // Save local state
      localStorage.setItem(`workflow_state_${selectedProject.id}`, JSON.stringify({
        arrival: now,
        step: 'arrived'
      }))
    } else if (action === 'start') {
      try {
        await startCheckinMutation.mutateAsync({
          project_id: Number(selectedProject.id),
          start_time: now,
          arrival_time: timestamps.arrival
        })
        setTimestamps({ ...timestamps, start: now })
        setWorkflowStep('working')
        // Do NOT clear local state yet, we need arrival time for display
        // localStorage.removeItem(`workflow_state_${selectedProject.id}`)
        toast.success('Check-in iniciado!')
      } catch (error) {
        toast.error('Erro ao iniciar check-in')
      }
    } else if (action === 'end') {
      setTimestamps({ ...timestamps, end: now })
      setWorkflowStep('checkout')
    }
  }
// Fetch active sprint tasks when entering checkout
  useEffect(() => {
    if (workflowStep === 'checkout' && selectedProject?.id) {
      const fetchSprintTasks = async () => {
        try {
          const sprints = await sprintService.getAll(Number(selectedProject.id), 'in_progress')
          if (sprints && sprints.length > 0) {
            // Get pending tasks from the first active sprint
            const tasks = sprints[0].tasks.filter(t => !t.is_completed)
            setSuggestedTasks(tasks)
          }
        } catch (error) {
          console.error('Failed to fetch sprint tasks', error)
        }
      }
      fetchSprintTasks()
    }
  }, [workflowStep, selectedProject?.id])

  
  const finishCheckin = async () => {
    if (!selectedProject || !timestamps.start || !timestamps.end) return
    
    if (!activeCheckin) {
      // Fallback for offline/local flow if needed, or error
      toast.error('Nenhum check-in ativo encontrado para finalizar.')
      return
    }

    try {
      const allActivities = [...checkoutData.activities]
      if (checkoutData.other) allActivities.push(checkoutData.other)

      await stopCheckinMutation.mutateAsync({
        id: Number(activeCheckin.id),
        data: {
          end_time: timestamps.end,
          activities: allActivities,
          observations: checkoutData.obs
        }
      })
      
      // Now we can clear the local state
      localStorage.removeItem(`workflow_state_${selectedProject.id}`)
      
      toast.success('Check-in finalizado com sucesso!')
      await refreshData() // Refresh history
      navigate('/menu')
    } catch (error) {
      toast.error('Erro ao finalizar check-in')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen flex flex-col">
      <header className="flex items-center gap-4 mb-6">
        <button onClick={() => onNavigate('selectProject')} className="p-2 hover:bg-slate-200 rounded-full"><ArrowLeft /></button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{selectedProject.name}</h1>
          <p className="text-sm text-slate-500">{selectedProject.client}</p>
        </div>
      </header>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className={`p-4 rounded-xl border ${timestamps.arrival ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Chegada</p>
          <p className="text-2xl font-mono font-bold text-slate-800">{formatTime(timestamps.arrival)}</p>
        </div>
        <div className={`p-4 rounded-xl border ${timestamps.start ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Início</p>
          <p className="text-2xl font-mono font-bold text-slate-800">{formatTime(timestamps.start)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        {workflowStep === 'idle' && (
          <Button onClick={() => handleWorkflowAction('arrival')} icon={MapPin}>
            Chegada no Cliente
          </Button>
        )}
        
        {workflowStep === 'arrived' && (
          <Button onClick={() => handleWorkflowAction('start')} variant="success" icon={Play} disabled={startCheckinMutation.isLoading}>
            {s
              {/* Sprint Tasks Suggestion */}
              {suggestedTasks.length > 0 && (
                <div>
                   <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Tarefas do Sprint
                   </h3>
                   <div className="flex flex-col gap-2">
                    {suggestedTasks.map(task => (
                      <button
                        key={task.id}
                        onClick={() => {
                          const isSelected = checkoutData.activities.includes(task.description)
                          const newActivities = isSelected 
                            ? checkoutData.activities.filter(a => a !== task.description)
                            : [...checkoutData.activities, task.description]
                          setCheckoutData({...checkoutData, activities: newActivities})
                        }}
                        className={`text-left p-3 rounded-lg text-sm border transition-all ${
                          checkoutData.activities.includes(task.description)
                            ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                        }`}
                      >
                         <div className="flex items-start gap-3">
                           <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-none ${
                             checkoutData.activities.includes(task.description) ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                           }`}>
                             {checkoutData.activities.includes(task.description) && <CheckCircle size={10} className="text-white" />}
                           </div>
                           <span>{task.description}</span>
                         </div>
                      </button>
                    ))}
                   </div>
                </div>
              )}

              tartCheckinMutation.isLoading ? 'Iniciando...' : 'Iniciar Serviço'}
          </Button>
        )}

        {workflowStep === 'working' && (
          <div className="space-y-4 animate-pulse">
            <div className="text-center py-8">
              <p className="text-slate-500 mb-2">Serviço em andamento...</p>
              <Clock className="w-12 h-12 text-blue-900 mx-auto animate-spin-slow" />
              {timestamps.start && <Timer startTime={timestamps.start} />}
            </div>
            <Button onClick={() => handleWorkflowAction('end')} variant="danger" icon={StopCircle}>
              Check-out / Finalizar
            </Button>
          </div>
        )}

        {workflowStep === 'checkout' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="font-bold text-slate-800 mb-3">Atividades Realizadas</h3>
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const newTags = checkoutData.activities.includes(tag) 
                          ? checkoutData.activities.filter((t: string) => t !== tag)
                          : [...checkoutData.activities, tag]
                        setCheckoutData({...checkoutData, activities: newTags})
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        checkoutData.activities.includes(tag)
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
                placeholder="Descreva se necessário..." 
                value={checkoutData.other} 
                onChange={(e) => setCheckoutData({...checkoutData, other: e.target.value})} 
              />
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">Observações Gerais</label>
                <textarea 
                  className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900 outline-none"
                  rows={3}
                  value={checkoutData.obs}
                  onChange={(e) => setCheckoutData({...checkoutData, obs: e.target.value})}
                />
              </div>
            </Card>
            <Button onClick={finishCheckin} variant="success" icon={CheckCircle} disabled={stopCheckinMutation.isLoading}>
              {stopCheckinMutation.isLoading ? 'Finalizando...' : 'Finalizar Apontamento'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

const Timer = ({ startTime }: { startTime: string }) => {
  const [elapsed, setElapsed] = useState<string>('00:00:00')

  useEffect(() => {
    const updateTimer = () => {
      // Ensure startTime is treated as UTC if missing timezone info
      const dateStr = startTime.endsWith('Z') || startTime.includes('+') || startTime.includes('-') ? startTime : startTime + 'Z'
      const start = new Date(dateStr).getTime()
      const now = Date.now()
      const diff = now - start
      
      if (diff < 0) {
        // If diff is negative, it might be due to clock skew or timezone issues.
        // But if we force UTC, it should be correct assuming client clock is correct.
        // Let's show 00:00:00 instead of negative.
        setElapsed('00:00:00')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  return <p className="text-3xl font-mono font-bold text-slate-800 mt-2">{elapsed}</p>
}
