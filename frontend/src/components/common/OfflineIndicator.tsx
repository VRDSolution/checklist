import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = useOfflineSync();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 border-t border-yellow-400 text-yellow-700 px-4 py-2 text-center text-sm font-medium z-50">
      📡 Você está offline. As alterações serão salvas localmente e enviadas quando a conexão retornar.
    </div>
  );
};
