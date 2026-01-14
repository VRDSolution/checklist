import React from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Project } from './types/mobile'

// Pages
import { LoginScreen as Login } from './pages/Auth/Login'
import { DashboardScreen as Dashboard } from './pages/Dashboard'
import { SelectProjectScreen as SelectProject } from './pages/Checkin/SelectProject'
import { ProjectFormScreen as ProjectForm } from './pages/Projects/Form'
import { WorkflowScreen as Workflow } from './pages/Checkin/Workflow'
import { HistoryScreen as History } from './pages/History'
import { ProjectDetailScreen as ProjectDetail } from './pages/Projects/Detail'
import { SuccessScreen as Success } from './pages/Checkin/Success'
import { UserRegistrationScreen } from './pages/admin/UserRegistrationScreen'
import { SprintsScreen } from './pages/sprints/SprintsScreen'
import { AnalyticsDashboard } from './pages/admin/AnalyticsDashboard'

export const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Debug routing
  React.useEffect(() => {
    console.log('[AppRoutes] Current location:', location.pathname);
  }, [location]);


  // Redirect based on auth state
  React.useEffect(() => {
    const isOnAuthRoute = location.pathname === '/login' || location.pathname === '/register'
    if (!isAuthenticated && !isOnAuthRoute) {
      navigate('/login', { replace: true })
    }
    if (isAuthenticated && location.pathname === '/login') {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, location.pathname, navigate])

  const Private = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={(
          <Private>
            <Dashboard onNavigate={(screen) => {
              if (screen === 'selectProject') navigate('/checkin/new')
              else if (screen === 'addProject') navigate('/projects/new')
              else if (screen === 'history') navigate('/history')
              else if (screen === 'addUser') navigate('/admin/users/new')
            }} />
          </Private>
        )}
      />

      <Route
        path="/admin/analytics"
        element={(
          <Private>
            {/* Simple role check could be better in a dedicated Route component */}
            {user?.role === 'admin' || user?.role === 'supervisor' ? (
              <AnalyticsDashboard />
            ) : (
              <Navigate to="/" replace />
            )}
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
              if (screen === 'dashboard') navigate('/')
            }} />
          </Private>
        )}
      />

      <Route
        path="/checkin/new"
        element={(
          <Private>
            <SelectProject
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/')
                if (screen === 'addProject') navigate('/projects/new')
              }}
              onSelectProject={(project: Project) => {
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
            <ProjectForm
              mode="add"
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/')
                if (screen === 'selectProject') navigate('/')
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
            <ProjectForm
              mode="edit"
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/')
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
            <Workflow
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/')
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
            <History
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/')
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
            <ProjectDetail
              onNavigate={(screen) => {
                if (screen === 'dashboard') navigate('/')
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
            <Success onNavigate={(screen) => {
              if (screen === 'dashboard') navigate('/')
            }} />
          </Private>
        )}
      />

      {/* Compatibility redirect */}
      <Route path="/menu" element={<Navigate to="/" replace />} />

      <Route
        path="*"
        element={(
          <div className="p-6 text-center">
            <h1 className="text-xl font-bold">Página não encontrada</h1>
            <button onClick={() => navigate('/')} className="mt-4 text-blue-600 underline">
              Ir para o Início
            </button>
          </div>
        )}
      />
    </Routes>
  )
}
