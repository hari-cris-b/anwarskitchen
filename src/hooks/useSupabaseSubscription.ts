import { useEffect } from 'react';
import { realtimeManager } from '../lib/realtimeManager';

interface PostgresChanges<T> {
  new: T | null;
  old: T | null;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  commit_timestamp: string;
}

type SubscriptionCallback<T> = (payload: PostgresChanges<T>) => void;

interface SubscriptionConfig {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

export function useSupabaseSubscription<T extends { id: string }>(
  config: SubscriptionConfig,
  callback: SubscriptionCallback<T>
) {
  useEffect(() => {
    const subscriptionId = realtimeManager.subscribe({
      table: config.table,
      event: config.event,
      filter: config.filter,
      callback: (payload) => callback(payload as PostgresChanges<T>)
    });

    return () => {
      realtimeManager.unsubscribe(subscriptionId);
    };
  }, [config.table, config.schema, config.event, config.filter]);
}
