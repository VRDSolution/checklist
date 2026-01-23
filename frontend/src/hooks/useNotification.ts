import { useEffect, useState } from 'react'
import { useActiveCheckin } from './useCheckins'
import { logger } from '@/utils/logger'

export const useNotification = () => {
  const { data: activeCheckin } = useActiveCheckin()
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      logger.warn('This browser does not support desktop notification')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    const result = await Notification.requestPermission()
    setPermission(result)
    return result === 'granted'
  }

  const sendNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === 'granted') {
      new Notification(title, options)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (activeCheckin && activeCheckin.startTime && permission === 'granted') {
      const checkinStartTime = activeCheckin.startTime
      // Check every minute
      interval = setInterval(() => {
        const startTime = new Date(checkinStartTime).getTime()
        const now = new Date().getTime()
        const hoursElapsed = (now - startTime) / (1000 * 60 * 60)

         // Notify after 4 hours and 8 hours
         // Note: In a real app we might want to store "lastNotified" to avoid spamming
         // For now, let's keep it simple or maybe check for "crossing the threshold"

         // Simple logic: If it's close to 4h or 8h (within 1 min window) or just periodically remind
         // Let's remind every hour after 4 hours? Or just specific milestones.
         
         // Let's do: Warn at 4h, 8h, 9h, 10h...
         // To avoid spam, we can't just check > 8. 
         // But `setInterval` runs every minute. 
         // We can use a simple modulo check for exact minutes, or rely on state.
         
         // Simplified approach for the user request: "Notification appearing the time"
         // Maybe they want a persistent notification? No, web notifications disappear.
         
         if (hoursElapsed >= 8) {
             const minutes = Math.floor((now - startTime) / 60000 % 60);
             // Notify every 30 minutes after 8 hours
             if (minutes % 30 === 0) {
                 sendNotification("⚠️ Check-out Pendente", {
                     body: `Você está trabalhando há ${hoursElapsed.toFixed(1)} horas. Não esqueça do check-out!`,
                     icon: "/vite.svg" // using vite logo as placeholder
                 })
             }
         }
      }, 60000)
    }

    return () => clearInterval(interval)
  }, [activeCheckin, permission])

  const notifyCheckin = (clientName: string) => {
    sendNotification('✅ Check-in Realizado!', {
      body: `Você iniciou o atendimento em: ${clientName}`,
      icon: '/logo.png', // Fallback icon
      tag: 'checkin-start'
    })
  }

  const notifyCheckout = (hours: string) => {
    sendNotification('👋 Check-out Concluído', {
      body: `Atendimento finalizado. Duração total: ${hours}`,
      icon: '/logo.png',
      tag: 'checkin-end'
    })
  }

  return {
    permission,
    requestPermission,
    sendNotification,
    notifyCheckin,
    notifyCheckout
  }
}
