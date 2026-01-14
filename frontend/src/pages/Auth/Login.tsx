import React, { useState } from 'react'
import { Briefcase, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export const LoginScreen = () => {
  const { login, error: authError, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (!email || !password) {
      setLocalError('Preencha todos os campos')
      return
    }

    try {
      await login(email.trim(), password)
    } catch (err) {
      // Error handled by context
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Card className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-900 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-blue-900/20">
            <Briefcase className="text-white w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">VRD Field Service</h1>
          <p className="text-slate-500">Portal do Técnico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            type="email"
            placeholder="E-mail corporativo" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
          <Input 
            type="password" 
            placeholder="Senha" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />

          {(localError || authError) && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle size={18} className="text-red-600" />
              <span className="text-sm text-red-700">{localError || authError}</span>
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="text-xs text-slate-400 text-center space-y-1">
          </div>
        </form>
      </Card>
    </div>
  )
}
