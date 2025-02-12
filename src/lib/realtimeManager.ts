import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface Subscription {
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

type RealtimePostgresChangesFilter = {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | undefined;
  schema: string;
  table: string;
  filter?: string;
};

class RealtimeManager {
  private static instance: RealtimeManager;
  private channel: RealtimeChannel | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isInitializing = false;

  private constructor() {
    this.initializeChannel();
  }

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private async cleanupChannel() {
    if (this.channel) {
      try {
        await this.channel.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from channel:', error);
      }
      this.channel = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async initializeChannel() {
    if (this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      await this.cleanupChannel();

      // Initialize channel
      this.channel = supabase.channel('db-changes');

      // Set up listeners for each subscription
      this.subscriptions.forEach((sub) => {
        if (this.channel) {
          this.channel.on<RealtimePostgresChangesPayload<any>>(
            'system',
            {
              event: sub.event === '*' ? undefined : sub.event,
              schema: 'public',
              table: sub.table,
              filter: sub.filter,
            },
            sub.callback
          );
        }
      });

      // Subscribe to the channel
      await new Promise<void>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error('Channel is null'));
          return;
        }

        this.channel.subscribe(async (status, err) => {
          if (status === 'SUBSCRIBED') {
            this.connected = true;
            this.reconnectAttempts = 0;
            resolve();
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.connected = false;
            console.error('Channel error:', status, err);
            
            if (this.subscriptions.size > 0) {
              const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
              this.reconnectAttempts++;
              this.reconnectTimer = setTimeout(() => {
                this.initializeChannel();
              }, backoffDelay);
            }
            
            reject(new Error(`Channel ${status}: ${err?.message || 'Unknown error'}`));
          }
        });
      });
    } catch (error) {
      console.error('Error initializing channel:', error);
      this.connected = false;
    } finally {
      this.isInitializing = false;
    }
  }

  async subscribe(subscription: Subscription): Promise<string> {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscriptions.set(id, subscription);

    try {
      if (!this.channel || !this.connected) {
        await this.initializeChannel();
      }

      if (this.channel) {
        this.channel.on<RealtimePostgresChangesPayload<any>>(
          'system',
          {
            event: subscription.event === '*' ? undefined : subscription.event,
            schema: 'public',
            table: subscription.table,
            filter: subscription.filter,
          },
          subscription.callback
        );
      }
    } catch (error) {
      console.error('Error setting up subscription:', error);
      // Keep the subscription in the map so it will be retried on reconnect
    }

    return id;
  }

  async unsubscribe(id: string) {
    this.subscriptions.delete(id);

    if (this.subscriptions.size === 0) {
      await this.cleanupChannel();
      this.connected = false;
      this.reconnectAttempts = 0;
    } else if (this.channel && this.connected) {
      // Reinitialize channel with remaining subscriptions
      await this.initializeChannel();
    }
  }
}

export const realtimeManager = RealtimeManager.getInstance();
