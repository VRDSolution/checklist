import Dexie, { Table } from 'dexie';

export interface OfflineRequest {
  id?: number;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: any;
  timestamp: number;
  type: 'checkin_start' | 'checkin_stop' | 'upload_photo' | 'other';
  synced: boolean;
}

export class ChecklistDatabase extends Dexie {
  offlineRequests!: Table<OfflineRequest>;

  constructor() {
    super('ChecklistDatabase');
    this.version(1).stores({
      offlineRequests: '++id, timestamp, type, synced' // Primary key and indexed props
    });
  }
}

export const db = new ChecklistDatabase();
