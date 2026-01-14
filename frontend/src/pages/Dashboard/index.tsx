import React from 'react'
import { LogOut, User as UserIcon, Play, History, Clock, UserPlus, Calendar, BarChart2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { Card } from '../../components/ui/Card'
import { Screen } from '../../types/mobile'

interface DashboardScreenProps {
  onNavigate: (screen: Screen) => void
}

export const DashboardScreen = ({ onNavigate }: DashboardScreenProps) => {
  const { user, logout } = useAuth()
  const { activeCheckin } = useData()
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Olá, {user?.name || 'Técnico'}</h1>
          <p className="text-slate-500">Bem-vindo ao seu painel</p>
          {/* Debug Info - Remove in production */}
           {/* <p className="text-xs text-slate-400">Role: {user?.role}</p> */}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Sair"
          >
            <LogOut size={18} />
            Sair
          </button>
          <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
            <UserIcon className="text-slate-600" size={20} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card 
          onClick={() => activeCheckin ? navigate(`/workflow/${activeCheckin.projectId}`) : onNavigate('selectProject')} 
          className={`p-8 flex flex-col items-center text-center gap-4 group ${activeCheckin ? 'hover:border-amber-500 border-amber-200 bg-amber-50' : 'hover:border-blue-500'}`}
        >
          {activeCheckin ? (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                <Clock className="text-amber-600 group-hover:text-white w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Check-in em Andamento</h2>
                <p className="text-slate-500">Continuar atendimento em {activeCheckin.projectName}</p>
                <p className="text-xs text-amber-700 mt-2">Iniciado às {new Date(activeCheckin.startTime || '').toLocaleTimeString()}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-900 transition-colors">
                <Play className="text-blue-900 group-hover:text-white w-8 h-8" fill="currentColor" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Novo Check-in</h2>
                <p className="text-slate-500">Iniciar atendimento em cliente</p>
              </div>
            </>
          )}
        </Card>

        <Card onClick={() => onNavigate('history')} className="p-8 flex flex-col items-center text-center gap-4 hover:border-emerald-500 group">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
            <History className="text-emerald-600 group-hover:text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Histórico & Projetos</h2>
            <p className="text-slate-500">Consultar atendimentos realizados</p>
          </div>
        </Card>

        <Card onClick={() => navigate('/sprints')} className="p-8 flex flex-col items-center text-center gap-4 hover:border-indigo-500 group">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
            <Calendar className="text-indigo-600 group-hover:text-white w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Sprints</h2>
            <p className="text-slate-500">Gerenciar tarefas e prazos</p>
          </div>
        </Card>

        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <Card onClick={() => navigate('/admin/analytics')} className="p-8 flex flex-col items-center text-center gap-4 hover:border-violet-500 group">
            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center group-hover:bg-violet-600 transition-colors">
              <BarChart2 className="text-violet-600 group-hover:text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Analytics</h2>
              <p className="text-slate-500">Métricas e produtividade</p>
            </div>
          </Card>
        )}

        {user?.role === 'admin' && (
          <Card onClick={() => onNavigate('addUser')} className="p-8 flex flex-col items-center text-center gap-4 hover:border-purple-500 group">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 transition-colors">
              <UserPlus className="text-purple-600 group-hover:text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cadastrar Usuário</h2>
              <p className="text-slate-500">Adicionar novo membro à equipe</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
