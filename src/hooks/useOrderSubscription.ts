import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase, withRetry, REQUEST_CONFIG } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { OrderWithItems } from '../services/orderService';

type OrderSubscriptionCallback = (order: OrderWithItems & {
  previousStatus?: string;
  isNewToPreparing?: boolean;
  _updateId?: string;
}) => void;

interface UseOrderSubscriptionProps {
  franchiseId: string;
  onNewOrder?: OrderSubscriptionCallback;
  onOrderUpdate?: OrderSubscriptionCallback;
  onError?: (error: Error) => void;
}

interface SubscriptionState {
  isConnected: boolean;
  lastError: Error | null;
  retryCount: number;
}

const SUBSCRIPTION_RETRY_DELAY = 5000; // 5 seconds
const MAX_SUBSCRIPTION_RETRIES = 3;
const STALE_UPDATE_THRESHOLD = 500; // 100ms - Make updates near real-time

export const useOrderSubscription = ({
  franchiseId,
  onNewOrder,
  onOrderUpdate,
  onError
}: UseOrderSubscriptionProps) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimestampRef = useRef<Record<string, number>>({});
  
  // Track subscription state
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    isConnected: false,
    lastError: null,
    retryCount: 0
  });

  const handleError = useCallback((error: Error) => {
    console.error('Subscription error:', error);
    setSubscriptionState(prev => ({
      ...prev,
      lastError: error,
      isConnected: false
    }));
    onError?.(error);
  }, [onError]);

  const fetchOrder = useCallback(async (orderId: string): Promise<OrderWithItems | null> => {
    try {
      const { data, error } = await withRetry(
        async () => {
          return await supabase
            .from('orders')
            .select(`
              *,
              items:order_items(
                *,
                menu_item:menu_items(*)
              )
            `)
            .eq('id', orderId)
            .single();
        },
        {
          maxRetries: 2,
          timeoutMs: REQUEST_CONFIG.DB_TIMEOUT / 2
        }
      );

      if (error) throw error;
      return data as OrderWithItems;
    } catch (err) {
      handleError(err instanceof Error ? err : new Error(`Failed to fetch order ${orderId}`));
      return null;
    }
  }, [handleError]);

  const shouldProcessUpdate = useCallback((orderId: string): boolean => {
    const now = Date.now();
    const lastUpdate = lastUpdateTimestampRef.current[orderId] || 0;
    
    // Prevent duplicate/stale updates
    if (now - lastUpdate < STALE_UPDATE_THRESHOLD) {
      console.log(`Skipping update for order ${orderId} - too soon after last update`);
      return false;
    }
    
    lastUpdateTimestampRef.current[orderId] = now;
    return true;
  }, []);

  const compareOrderItems = useCallback((items1: OrderWithItems['order_items'] | null | undefined, items2: OrderWithItems['order_items'] | null | undefined): boolean => {
    // Handle null/undefined cases
    if (!items1 && !items2) return false; // No changes if both are null/undefined
    if (!items1 || !items2) return true;  // Changes if one is null/undefined
    if (items1.length !== items2.length) return true;

    const sortedItems1 = [...items1].sort((a, b) => a.id.localeCompare(b.id));
    const sortedItems2 = [...items2].sort((a, b) => a.id.localeCompare(b.id));

    // Check every item for relevant changes
    return sortedItems1.some((item1, index) => {
      const item2 = sortedItems2[index];
      return (
        item1.quantity !== item2.quantity ||
        item1.menu_item_id !== item2.menu_item_id ||
        item1.notes !== item2.notes ||
        item1.price_at_time !== item2.price_at_time
      );
    });
  }, []);

  const handleOrderUpdate = useCallback(async (payload: { new: Partial<OrderWithItems>, old: Partial<OrderWithItems> }) => {
    if (!shouldProcessUpdate(payload.new.id!)) return;
  
    try {
      const order = await fetchOrder(payload.new.id!);
      if (!order) return;

      // Check for status change
      const hasStatusChange = Boolean(
        payload.old.status &&
        payload.new.status &&
        payload.new.status !== payload.old.status
      );

      // Check for item changes if items exist in payload
      const hasItemChanges = Boolean(payload.old.order_items) && compareOrderItems(
        payload.old.order_items,
        order.order_items
      );

      // Determine if this is a significant change we need to handle
      // Always process status changes, and process item changes only for current status
      if (hasStatusChange || (hasItemChanges && order.status === 'preparing')) {
        // Merge the fetched order with the latest payload data
        const updatedOrder: OrderWithItems & {
          previousStatus?: string;
          isNewToPreparing?: boolean;
          _updateId?: string;
        } = {
          ...order,
          status: payload.new.status || order.status,
          order_items: order.order_items, // Use fetched order items
          _updateId: `${order.id}-${Date.now()}`,
          updated_at: new Date().toISOString(),
          previousStatus: payload.old.status,
          isNewToPreparing: payload.new.status === 'preparing' && payload.old.status === 'pending'
        };
        
        // Give the update a moment to propagate
        await new Promise(resolve => setTimeout(resolve, 100));
        onOrderUpdate?.(updatedOrder);
      }
    } catch (err) {
      handleError(err instanceof Error ? err : new Error('Failed to process order update'));
    }
  }, [fetchOrder, handleError, onOrderUpdate, shouldProcessUpdate, compareOrderItems]);

  const setupSubscription = useCallback(async () => {
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      channelRef.current = supabase
        .channel(`franchise-${franchiseId}-orders-${Date.now()}`, {
          config: {
            broadcast: { ack: true },
            presence: { key: '' }
          }
        })
        .on<OrderWithItems>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `franchise_id=eq.${franchiseId}`
          },
          async (payload) => {
            if (!shouldProcessUpdate(payload.new.id)) return;
            const order = await fetchOrder(payload.new.id);
            if (order) onNewOrder?.(order);
          }
        )
        .on<OrderWithItems>(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `franchise_id=eq.${franchiseId}`
          },
          async (payload) => {
            if (payload.old?.status && payload.new?.id) {
              try {
                await handleOrderUpdate({
                  new: payload.new,
                  old: payload.old
                });
              } catch (error) {
                console.error('Error handling order update:', error);
                handleError(error instanceof Error ? error : new Error('Failed to handle order update'));
              }
            }
          }
        );

      const subscriptionPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, REQUEST_CONFIG.DB_TIMEOUT);

        channelRef.current?.subscribe(async (status: string, err?: Error) => {
          clearTimeout(timeoutId);
          if (err) {
            reject(err);
          } else if (status === 'SUBSCRIBED') {
            setSubscriptionState(prev => ({
              ...prev,
              isConnected: true,
              lastError: null
            }));
            resolve();
          }
        });
      });

      await subscriptionPromise;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to setup subscription');
      handleError(error);
      
      if (subscriptionState.retryCount < MAX_SUBSCRIPTION_RETRIES) {
        const nextRetryCount = subscriptionState.retryCount + 1;
        const delay = SUBSCRIPTION_RETRY_DELAY * Math.pow(2, nextRetryCount - 1);
        
        setSubscriptionState(prev => ({
          ...prev,
          retryCount: nextRetryCount
        }));
        
        console.log(`Retrying subscription in ${delay/1000}s... (Attempt ${nextRetryCount})`);
        retryTimeoutRef.current = setTimeout(() => {
          void setupSubscription();
        }, delay);
      }
    }
  }, [franchiseId, onNewOrder, handleOrderUpdate, shouldProcessUpdate, subscriptionState.retryCount, handleError]);

  // Setup subscription on mount and cleanup on unmount
  useEffect(() => {
    void setupSubscription();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      lastUpdateTimestampRef.current = {};
    };
  }, [setupSubscription]);

  // Handle reconnection
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network reconnected, reestablishing subscription...');
      setSubscriptionState(prev => ({
        ...prev,
        retryCount: 0
      }));
      void setupSubscription();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [setupSubscription]);

  return {
    isConnected: subscriptionState.isConnected,
    lastError: subscriptionState.lastError,
    retryCount: subscriptionState.retryCount
  };
};

export default useOrderSubscription;