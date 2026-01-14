import React from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { AppRoutes } from './routes'
import { OfflineIndicator } from './components/common/OfflineIndicator'

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <Toaster position="top-right" />
          <OfflineIndicator />
          <AppRoutes />
        </div>
      </DataProvider>
    </AuthProvider>
  )
}

export default App