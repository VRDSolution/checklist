import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { LogOut, Settings, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { NotificationToggle } from '@/components/common/NotificationToggle'

export function Layout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    toast.success('Logout realizado com sucesso!')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-vrd-darker">
      {/* Header */}
      <header className="bg-vrd-dark border-b border-gray-600">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">
              VRD <span className="text-vrd-blue">SOLUTION</span>
            </h1>
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <NotificationToggle />

            {/* Theme toggle */}
            <button className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>

            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-white font-medium">{user?.name}</span>
                <span className="text-xs bg-vrd-blue px-2 py-1 rounded-full text-white">
                  {user?.role?.toUpperCase()}
                </span>
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}