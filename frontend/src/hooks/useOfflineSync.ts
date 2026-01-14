import { useState, useEffect } from 'react';
import { syncService } from '@/services/sync.service';
import { toast } from 'react-hot-toast';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Você está online! Sincronizando dados...');
      syncService.syncPendingRequests()
        .then(() => toast.success('Dados sincronizados com sucesso!'))
        .catch(() => toast.error('Erro ao sincronizar dados.'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Você está offline. Os dados serão salvos localmente.', {
        icon: '📡',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine) {
        syncService.syncPendingRequests();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};
