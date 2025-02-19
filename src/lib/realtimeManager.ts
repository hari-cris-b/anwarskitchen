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

const CHANNEL_NAME = 'db-changes';
const MAX_RETRY_ATTEMPTS = 5; // Increased from 3
const INITIAL_RETRY_DELAY = 500; // Reduced initial delay

// Connection configuration
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay (reduced from 60s)
const SETUP_TIMEOUT = 30000; // 30 seconds timeout (increased from 15s)
const RESOURCE_CONSTRAINT_DELAY = 5000; // 5 second delay (reduced from 10s)
const MAX_CONCURRENT_SUBSCRIPTIONS = 5; // Increased from 3

const MIN_RECONNECT_INTERVAL = 2000; // Reduced from 5s for faster recovery
const CHANNEL_SETUP_DELAY = 500; // Increased from 100ms for better stability

class RealtimeManager {
  private static instance: RealtimeManager;
  private channel: RealtimeChannel | null = null;
  private subscriptions = new Map<string, Subscription>();
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isInitializing = false;
  private lastConnectedTime: number = 0;
  private readonly channelConfig = { schema: 'public' };
  private connectionPromise: Promise<void> | null = null;
  
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private lastError: Error | null = null;
  private resourceConstraintDetected = false;

  private onNetworkStateChange = () => {
    if (navigator.onLine) {
      console.log('Network connection restored, attempting to reconnect...');
      // Reset connection state
      this.connectionState = 'disconnected';
      this.reconnectAttempts = 0;
      void this.initializeChannel();
    } else {
      console.warn('Network connection lost');
      this.connectionState = 'disconnected';
      void this.cleanupChannel();
    }
  };

  private constructor() {
    // Add network state listeners
    window.addEventListener('online', this.onNetworkStateChange);
    window.addEventListener('offline', this.onNetworkStateChange);

    // Initialize channel
    if (navigator.onLine) {
      this.initializeChannel().catch(this.handleInitError);
    } else {
      console.warn('No network connectivity, waiting for network...');
    }
  }

  public async cleanup() {
    // Remove network listeners
    window.removeEventListener('online', this.onNetworkStateChange);
    window.removeEventListener('offline', this.onNetworkStateChange);
    
    // Cleanup channel and subscriptions
    await this.cleanupChannel();
    this.subscriptions.clear();
    this.connectionState = 'disconnected';
    this.connected = false;
  }

  static getInstance(): RealtimeManager {
    return RealtimeManager.instance ??= new RealtimeManager();
  }

  private handleInitError = (error: Error) => {
    this.lastError = error;
    console.error('Failed to initialize channel:', error);
    if (this.subscriptions.size > 0) {
      this.scheduleReconnect();
    }
  };

  private getRetryDelay(): number {
    return Math.min(
      INITIAL_RETRY_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RETRY_DELAY
    );
  }

  private async handleResourceConstraint() {
    this.resourceConstraintDetected = true;
    this.reconnectAttempts = Math.max(3, this.reconnectAttempts);
    await new Promise(resolve => setTimeout(resolve, RESOURCE_CONSTRAINT_DELAY));
    this.resourceConstraintDetected = false;
  }

  private scheduleReconnect() {
    if (this.connectionState === 'reconnecting') return;

    // Enforce minimum time between reconnection attempts
    const timeSinceLastConnect = Date.now() - this.lastConnectedTime;
    const extraDelay = Math.max(0, MIN_RECONNECT_INTERVAL - timeSinceLastConnect);
    
    this.connectionState = 'reconnecting';
    let delay = this.getRetryDelay() + extraDelay;
    
    if (this.resourceConstraintDetected) {
      delay = Math.max(delay, RESOURCE_CONSTRAINT_DELAY);
    }
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      void this.initializeChannel();
    }, delay);
  }

  private async onSubscribed() {
    try {
      this.connected = true;
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.lastConnectedTime = Date.now();
      this.lastError = null;
      this.resetTimers();

      if (this.channel && this.subscriptions.size > 0) {
        await Promise.all(
          Array.from(this.subscriptions.entries()).map(([id, subscription]) =>
            this.setupSubscription(id, subscription).catch(err => {
              console.warn(`Failed to reinitialize subscription ${id}:`, err);
            })
          )
        );
      }
    } catch (error) {
      console.error('Error in onSubscribed handler:', error);
      this.connected = false;
      this.connectionState = 'disconnected';
      throw error;
    }
  }

  private async cleanupChannel() {
    this.resetTimers();
    
    if (this.channel) {
      const currentChannel = this.channel;
      
      this.channel = null;
      this.connected = false;
      this.connectionState = 'disconnected';
      
      try {
        if (currentChannel.state !== 'closed') {
          await currentChannel.unsubscribe();
        }
      } catch (error) {
        console.warn('Channel cleanup warning:', error);
      }
    }
  }

  private resetTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setupSubscriptionHandlers(channel: RealtimeChannel) {
    if (!channel || channel.state === 'closed') {
      return Promise.resolve();
    }

    const handlers = Array.from(this.subscriptions.entries()).map(([_, sub]) => ({
      table: sub.table,
      event: sub.event === '*' ? undefined : sub.event,
      filter: sub.filter,
      callback: this.wrapCallback(sub.callback)
    }));

    handlers.forEach(({ table, event, filter, callback }) => {
      channel.on<RealtimePostgresChangesPayload<any>>(
        'system',
        {
          ...this.channelConfig,
          event,
          table,
          filter,
        },
        callback
      );
    });
  }

  private wrapCallback(callback: (payload: RealtimePostgresChangesPayload<any>) => void) {
    return (payload: RealtimePostgresChangesPayload<any>) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('Error in subscription callback:', err);
      }
    };
  }

  private async initializeChannel(): Promise<void> {
    if (this.isInitializing) {
      return this.connectionPromise || Promise.resolve();
    }

    this.isInitializing = true;
    this.connectionPromise = this._initializeChannelImpl().finally(() => {
      this.isInitializing = false;
      this.connectionPromise = null;
    });

    return this.connectionPromise;
  }

  private async _initializeChannelImpl() {
    await this.cleanupChannel();
    
    // Add delay before creating new channel to prevent rapid reconnects
    if (this.lastConnectedTime > 0) {
      const timeSinceLastConnect = Date.now() - this.lastConnectedTime;
      if (timeSinceLastConnect < MIN_RECONNECT_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_RECONNECT_INTERVAL - timeSinceLastConnect));
      }
    }

    const newChannel = supabase.channel(CHANNEL_NAME);
    let connectTimeout: NodeJS.Timeout;
    
    return new Promise<void>((resolve, reject) => {
      const setupTimeout = setTimeout(() => {
        reject(new Error('Channel setup timeout'));
      }, SETUP_TIMEOUT);

      // Pre-connection validation
      if (!navigator.onLine) {
        clearTimeout(setupTimeout);
        reject(new Error('No network connectivity'));
        return;
      }

      const cleanup = () => {
        clearTimeout(setupTimeout);
        clearTimeout(connectTimeout);
      };

      newChannel.subscribe(async (status, err) => {
        if (status === 'SUBSCRIBED') {
          cleanup();
          this.channel = newChannel;
          this.setupSubscriptionHandlers(newChannel);
          await this.onSubscribed();
          resolve();
          return;
        }

        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          cleanup();
          
          // Enhanced error classification
          if (err?.message?.toLowerCase().includes('websocket')) {
            console.warn('WebSocket specific error:', err.message);
            // Add small delay for WebSocket errors
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          // Handle resource constraint errors specifically
          if (err?.message?.includes('insufficient_resources') ||
              err?.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
            console.warn('Resource constraint detected, increasing retry delay');
            await this.handleResourceConstraint();
          }
          
          const shouldRetry = await this.handleDisconnect(status, err);
          if (!shouldRetry) {
            reject(new Error(`Channel ${status}: ${err?.message || 'Unknown error'}`));
          }
        }
      });

      // Set connect timeout
      connectTimeout = setTimeout(() => {
        if (newChannel.state !== 'joined') {
          cleanup();
          reject(new Error('Connection establishment timeout'));
        }
      }, SETUP_TIMEOUT / 2); // Use half the setup timeout for connection
    });
  }

  private async handleDisconnect(status: string, err?: Error): Promise<boolean> {
    this.connected = false;
    this.connectionState = 'disconnected';
    this.lastError = err || new Error(status);

    const RESET_THRESHOLD = 30000; // 30 seconds
    if (Date.now() - this.lastConnectedTime > RESET_THRESHOLD) {
      this.reconnectAttempts = 0;
    }

    if (this.subscriptions.size === 0) {
      return false;
    }

    if (this.reconnectAttempts >= MAX_RETRY_ATTEMPTS) {
      console.error(`Channel ${status}: Max reconnection attempts (${MAX_RETRY_ATTEMPTS}) exceeded`);
      return false;
    }

    this.scheduleReconnect();
    return true;
  }

  private generateSubscriptionId(): string {
    return `sub_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async setupSubscription(id: string, subscription: Subscription): Promise<void> {
    if (!this.channel || !this.connected) {
      await this.initializeChannel();
    }

    if (!this.channel) {
      console.warn('No valid channel available for subscription');
      return;
    }

    const existingCallback = this.subscriptions.get(id)?.callback;
    if (!existingCallback) return;

    this.channel.on<RealtimePostgresChangesPayload<any>>(
      'system',
      {
        ...this.channelConfig,
        event: subscription.event === '*' ? undefined : subscription.event,
        table: subscription.table,
        filter: subscription.filter,
      },
      existingCallback
    );
  }

  async subscribe(subscription: Subscription): Promise<string> {
    const id = this.generateSubscriptionId();
    this.subscriptions.set(id, subscription);
    
    // Prevent too many concurrent subscriptions
    if (this.subscriptions.size > MAX_CONCURRENT_SUBSCRIPTIONS) {
      console.warn('Too many concurrent subscriptions, waiting for cleanup...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
      await this.setupSubscription(id, subscription);
      return id;
    } catch (error) {
      this.subscriptions.delete(id);
      console.error('Error setting up subscription:', error);
      throw error;
    }
  }

  async unsubscribe(id: string): Promise<void> {
    this.subscriptions.delete(id);

    // Reset resource constraint flag if no subscriptions
    if (this.subscriptions.size === 0) {
      this.resourceConstraintDetected = false;
      this.reconnectAttempts = 0;
    }
    
    if (this.subscriptions.size === 0) {
      // Add small delay before cleanup to prevent rapid reconnects
      await new Promise(resolve => setTimeout(resolve, 100));
      this.connectionState = 'disconnected';
      this.connected = false;
      await this.cleanupChannel();
    }
  }
}

export const realtimeManager = RealtimeManager.getInstance();
