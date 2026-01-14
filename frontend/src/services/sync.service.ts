import { db, OfflineRequest } from './db';
import { api } from './api';
import { toast } from 'react-hot-toast'; // Assuming toast is available or I should use console/custom

class SyncService {
  async queueRequest(request: Omit<OfflineRequest, 'id' | 'timestamp' | 'synced'>) {
    try {
      await db.offlineRequests.add({
        ...request,
        timestamp: Date.now(),
        synced: false
      });
      console.log('Request queued for offline sync:', request);
      // You might want to trigger a UI update here
    } catch (error) {
      console.error('Failed to queue offline request:', error);
      throw error;
    }
  }

  async syncPendingRequests() {
    const pendingRequests = await db.offlineRequests
      .filter(req => !req.synced)
      .sortBy('timestamp');

    if (pendingRequests.length === 0) return;

    console.log(`Syncing ${pendingRequests.length} offline requests...`);
    const toastId = 'sync-toast'; 

    for (const req of pendingRequests) {
      try {
        // Remove token from headers if it was stored? 
        // We usually don't store headers, relying on the current auth state interceptor.
        // Assuming the current user is valid when back online.
        
        await api.request({
          method: req.method,
          url: req.url,
          data: req.data,
        });

        await db.offlineRequests.delete(req.id!);
        console.log(`Synced request ${req.id}`);
      } catch (error) {
        console.error(`Failed to sync request ${req.id}:`, error);
        // Should we keep it? Or move to a fail queue? 
        // For now, leave it. Or maybe implement retry count.
      }
    }
  }
}

export const syncService = new SyncService();
