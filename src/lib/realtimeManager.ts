import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface Subscription {
  callback: (payload: any) => void;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

class RealtimeManager {
  private static instance: RealtimeManager;
  private channel: RealtimeChannel | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private connected = false;

  private constructor() {
    this.initializeChannel();
  }

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  private initializeChannel() {
    if (this.channel) {
      this.channel.unsubscribe();
    }

    this.channel = supabase.channel('db-changes', {
      config: {
        broadcast: { self: true },
        presence: { key: '' },
      },
    });

    this.channel
      .on('broadcast', { event: 'postgres_changes' }, (payload) => {
        if (!payload.payload) return;

        const change = payload.payload;
        // Notify all relevant subscribers
        this.subscriptions.forEach((sub, id) => {
          if (
            sub.table === change.table &&
            (!sub.event || sub.event === '*' || sub.event === change.type) &&
            (!sub.filter || change.filter === sub.filter)
          ) {
            sub.callback(change);
          }
        });
      })
      .subscribe((status) => {
        this.connected = status === 'SUBSCRIBED';
        if (status !== 'SUBSCRIBED') {
          console.error('Failed to subscribe to channel:', status);
          // Attempt to reconnect after a delay
          setTimeout(() => this.initializeChannel(), 5000);
        }
      });
  }

  subscribe(subscription: Subscription): string {
    const id = Math.random().toString(36).substr(2, 9);
    this.subscriptions.set(id, subscription);

    // If channel is not connected, reinitialize it
    if (!this.connected) {
      this.initializeChannel();
    }

    return id;
  }

  unsubscribe(id: string) {
    this.subscriptions.delete(id);

    // If no more subscriptions, cleanup the channel
    if (this.subscriptions.size === 0 && this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
      this.connected = false;
    }
  }
}

export const realtimeManager = RealtimeManager.getInstance();
