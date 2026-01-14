import React from 'react'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { DataProvider } from '../contexts/DataContext'
import { Project, Screen } from '../types/mobile'
import { LoginScreen } from './LoginScreen'
import { DashboardScreen } from './Dashboard'
import { SelectProjectScreen } from './SelectProjectScreen'
import { ProjectFormScreen } from './ProjectFormScreen'
import { WorkflowScreen } from './WorkflowScreen'
import { HistoryScreen } from './HistoryScreen'
import { ProjectDetailScreen } from './ProjectDetailScreen'
import { SuccessScreen } from './SuccessScreen'
import { UserRegistrationScreen } from './admin/UserRegistrationScreen'
import { SprintsScreen } from './sprints/SprintsScreen'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'

const MobileAppContent = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect based on auth state and current path
  React.useEffect(() => {
    const isOnAuthRoute = location.pathname === '/login' || location.pathname === '/register'
    if (!isAuthenticated && !isOnAuthRoute) {
      navigate('/login', { replace: true })
    }
    if (isAuthenticated && location.pathname === '/login') {
      navigate('/menu', { replace: true })
    }
  }, [isAuthenticated, location.pathname, navigate])

  // Protected route wrapper
  const Private = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  // Routes mapping to ensure URL reflects the screen
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginScreen />} />

      {/* Private routes */}
      <Route
        path="/menu"
        element={(
          <Private>
            <DashboardScreen onNavigate={(screen: Screen) => {
              // Keep internal navigation via router
              if (screen === 'selectProject') navigate('/checkin/new')
              else if (screen === 'addProject') navigate('/projects/new')
              else if (screen === 'history') navigate('/history')
              else if (screen === 'addUser') navigate('/admin/users/new')
            }} />
          </Private>
        )}
      />

      <Route
        path="/admin/users/new"
        element={(
          <Private>
            <UserRegistrationScreen />
          </Private>
        )}
      />

      <Route
        path="/sprints"
        element={(
          <Private>
            <SprintsScreen onNavigate={(screen) => {
              if (screen === 'dashboard') navigate('/menu')
            }} />
          </Private>
        )}
      />

      <Route
        path="/checkin/new"
        element={(
          <Private>
            <SelectProjectScreen
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/menu')
                if (screen === 'addProject') navigate('/projects/new')
              }}
              onSelectProject={(project: Project) => {
                // go to workflow with project id
                navigate(`/workflow/${project.id}`)
              }}
            />
          </Private>
        )}
      />

      <Route
        path="/projects/new"
        element={(
          <Private>
            <ProjectFormScreen
              mode="add"
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/menu')
                if (screen === 'selectProject') navigate('/menu')
              }}
              onProjectSaved={(project: Project) => {
                navigate(`/workflow/${project.id}`)
              }}
            />
          </Private>
        )}
      />

      <Route
        path="/projects/:id/edit"
        element={(
          <Private>
            <ProjectFormScreen
              mode="edit"
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/menu')
                if (screen === 'projectDetail') navigate(-1)
              }}
            />
          </Private>
        )}
      />

      <Route
        path="/workflow/:projectId"
        element={(
          <Private>
            <WorkflowScreen
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/menu')
                if (screen === 'selectProject') navigate('/checkin/new')
              }}
            />
          </Private>
        )}
      />

      <Route
        path="/history"
        element={(
          <Private>
            <HistoryScreen
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/menu')
                if (screen === 'addProject') navigate('/projects/new')
              }}
              onSelectProject={(project: Project) => {
                navigate(`/projects/${project.id}`)
              }}
            />
          </Private>
        )}
      />

      <Route
        path="/projects/:id"
        element={(
          <Private>
            <ProjectDetailScreen
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/menu')
                if (screen === 'history') navigate('/history')
              }}
            />
          </Private>
        )}
      />

      <Route
        path="/success"
        element={(
          <Private>
            <SuccessScreen onNavigate={(screen) => {
              if (screen === 'dashboard') navigate('/menu')
            }} />
          </Private>
        )}
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/menu" replace />} />

      {/* 404 fallback */}
      <Route
        path="*"
        element={(
          <div className="p-6 text-center">
            <h1 className="text-xl font-bold">Página não encontrada</h1>
            <button onClick={() => navigate('/menu')} className="mt-4 text-blue-600 underline">
              Ir para o Menu
            </button>
          </div>
        )}
      />
    </Routes>
  )
}

export default function MobileApp() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <MobileAppContent />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}
