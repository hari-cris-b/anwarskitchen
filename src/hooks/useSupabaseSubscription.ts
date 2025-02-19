import { useEffect } from 'react';
import { realtimeManager } from '../lib/realtimeManager';

import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type PostgresEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface PostgresChanges<T> {
  new: T | null;
  old: T | null;
  eventType: PostgresEventType;
  table: string;
  schema: string;
}

function transformPayload<T extends Record<string, any>>(
  payload: RealtimePostgresChangesPayload<T>
): PostgresChanges<T> {
  return {
    new: payload.new as T | null,
    old: payload.old as T | null,
    eventType: determineEventType(payload),
    table: payload.table,
    schema: payload.schema
  };
}

function determineEventType(payload: any): PostgresEventType {
  if ('type' in payload) return payload.type;
  if (payload.new && payload.old) return 'UPDATE';
  if (payload.new) return 'INSERT';
  return 'DELETE';
}

export type SubscriptionCallback<T> = (payload: PostgresChanges<T>) => void;

export interface SubscriptionConfig {
  table: string;
  schema?: string;
  event?: PostgresEventType | '*';
  filter?: string;
}

export function useSupabaseSubscription<T extends Record<string, any>>(
  config: SubscriptionConfig | null,
  callback: SubscriptionCallback<T>
) {
  useEffect(() => {
    // Don't set up subscription if config is null
    if (!config) return;

    let subscriptionId: string;
    let retryTimeout: NodeJS.Timeout;
    let isMounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const setupSubscription = async () => {
      if (!isMounted) return;
      
      try {
        const subId = await realtimeManager.subscribe({
          table: config.table,
          event: config.event,
          filter: config.filter,
          callback: (payload: RealtimePostgresChangesPayload<T>) => {
            if (!isMounted) return;
            try {
              const transformed = transformPayload(payload);
              callback(transformed);
            } catch (err) {
              console.error('Error processing realtime update:', err);
            }
          }
        });
        
        if (isMounted) {
          subscriptionId = subId;
          retryCount = 0; // Reset retry count on success
        } else {
          // Clean up if component unmounted during setup
          void realtimeManager.unsubscribe(subId);
        }
      } catch (err) {
        console.error('Error setting up subscription:', err);
        
        // Retry setup if not max retries and still mounted
        if (retryCount < MAX_RETRIES && isMounted) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          retryTimeout = setTimeout(setupSubscription, delay);
        }
      }
    };

    // Setup subscription
    void setupSubscription();

    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      const currentSubId = subscriptionId;
      if (currentSubId) {
        void realtimeManager.unsubscribe(currentSubId).catch(err => {
          console.warn('Error cleaning up subscription:', err);
        });
      }
    };
  }, [config?.table, config?.schema, config?.event, config?.filter, callback, config]);
}
