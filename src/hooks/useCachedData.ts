import { useState, useEffect } from 'react';

interface CacheConfig {
  key: string;
  ttl: number; // Time to live in milliseconds
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export function useCachedData<T>(
  fetchFn: () => Promise<T>,
  cacheConfig: CacheConfig,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check cache first
        const cachedItem = localStorage.getItem(cacheConfig.key);
        if (cachedItem) {
          const { data: cachedData, timestamp }: CacheItem<T> = JSON.parse(cachedItem);
          const isExpired = Date.now() - timestamp > cacheConfig.ttl;
          
          if (!isExpired) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        }

        // Fetch fresh data
        const freshData = await fetchFn();
        
        // Update cache
        const cacheItem: CacheItem<T> = {
          data: freshData,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheConfig.key, JSON.stringify(cacheItem));
        
        setData(freshData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, loading, error };
}
