import { Bell, BellOff } from 'lucide-react'
import { useNotification } from '@/hooks/useNotification'
import { toast } from 'react-hot-toast'

interface NotificationToggleProps {
  className?: string
  variant?: 'light' | 'dark'
}

export function NotificationToggle({ className = '', variant = 'dark' }: NotificationToggleProps) {
  const { permission, requestPermission } = useNotification()

  const handleToggle = async () => {
    if (permission === 'granted') {
      toast.success('Notificações já estão ativas!')
      return
    }

    const granted = await requestPermission()
    if (granted) {
      toast.success('Notificações ativadas com sucesso!')
      new Notification('VRD Solution', { body: 'Notificações ativadas!' })
    } else {
      toast.error('Permissão para notificações negada.')
    }
  }

  const isGranted = permission === 'granted'
  
  const baseClasses = "p-2 rounded-lg transition-colors"
  
  const darkClasses = isGranted 
    ? 'bg-vrd-blue/20 text-vrd-blue hover:bg-vrd-blue/30' 
    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'

  const lightClasses = isGranted 
    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
    : 'bg-slate-200 text-slate-500 hover:bg-slate-300'

  const handleTest = (e: React.MouseEvent) => {
    e.stopPropagation()
    new Notification('🔔 Teste de Notificação', {
      body: 'Se você está vendo isso, suas notificações estão funcionando corretamente!',
    })
    toast.success('Notificação de teste enviada!')
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleToggle}
        className={`${baseClasses} ${variant === 'dark' ? darkClasses : lightClasses} ${className}`}
        title={isGranted ? "Notificações ativas" : "Ativar notificações de check-out"}
      >
        {isGranted ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
      </button>
      
      {isGranted && (
        <button
          onClick={handleTest}
          className={`${baseClasses} ${variant === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-slate-200 text-slate-600'} hover:opacity-80`}
          title="Testar envio de notificação agora"
        >
          <span className="text-xs font-bold px-1">TESTAR</span>
        </button>
      )}
    </div>
  )
}
