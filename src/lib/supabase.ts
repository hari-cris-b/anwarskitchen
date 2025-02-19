import { createClient, type SupabaseClient, type SupabaseClientOptions, type PostgrestError } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

// Environment validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Request configuration constants
export const REQUEST_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_TIMEOUT: 10000,    // 10 seconds initial
  AUTH_TIMEOUT: 60000,       // 60 seconds for auth (increased)
  DB_TIMEOUT: 45000,         // 45 seconds for DB operations (increased)
  MAX_POOL_SIZE: 5,         // Reduced pool size to prevent connection exhaustion
  INITIAL_BACKOFF: 500,     // 500ms initial delay (reduced)
  MAX_BACKOFF: 5000,        // 5 second maximum backoff (reduced)
  CONNECTION_IDLE_TIMEOUT: 60000  // 60 seconds idle timeout
} as const;

// Error handling
export interface RetryableError extends Error {
  status?: number;
  code?: string;
  details?: string;
  hint?: string;
}

export class SupabaseError extends Error implements RetryableError {
  status?: number;
  code?: string;
  details?: string;
  hint?: string;

  constructor(message: string, error?: PostgrestError | Error | unknown) {
    super(message);
    this.name = 'SupabaseError';

    if (error instanceof Error) {
      this.stack = error.stack;
      if ('status' in error) this.status = error.status as number;
      if ('code' in error) this.code = error.code as string;
      if ('details' in error) this.details = error.details as string;
      if ('hint' in error) this.hint = error.hint as string;
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      hint: this.hint
    };
  }
}

// Client options
const defaultOptions: SupabaseClientOptions<"public"> = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'pos_auth',
    storage: {
      getItem: (key) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (err) {
          console.warn('Failed to persist auth state:', err);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (err) {
          console.warn('Failed to remove auth state:', err);
        }
      }
    }
  },
  global: {
    headers: {
      'x-client-info': 'pos-client',
      'x-connection-pool': REQUEST_CONFIG.MAX_POOL_SIZE.toString()
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 1
    },
    reconnectAfterMs: (retries: number) => {
      // Start with 1s, max 15s, with exponential backoff and jitter
      const baseDelay = Math.min(1000 * Math.pow(2, retries), 15000);
      const jitter = Math.random() * 1000;
      return baseDelay + jitter;
    },
    timeout: 30000, // Increase timeout to 30s
    heartbeatIntervalMs: 15000 // Send heartbeat every 15s
  }
};

// Create Supabase clients
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    ...defaultOptions,
    global: {
      ...defaultOptions.global,
      fetch: (url, options) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, REQUEST_CONFIG.INITIAL_TIMEOUT);

        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      }
    }
  }
);

export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey ?? supabaseAnonKey,
  {
    ...defaultOptions,
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      ...defaultOptions.global,
      headers: {
        ...defaultOptions.global?.headers,
        'x-client-info': 'pos-admin-client'
      }
    }
  }
);

// Error checking helpers
export const isResourceConstraintError = (error: unknown): boolean => {
  if (!error) return false;

  const err = error as RetryableError;
  const msg = err.message?.toLowerCase() ?? '';
  const code = err.code?.toLowerCase() ?? '';
  const status = err.status;

  return (
    msg.includes('insufficient_resources') ||
    msg.includes('err_insufficient_resources') ||
    msg.includes('too many connections') ||
    code.includes('54') || // PostgreSQL connection limit
    code.includes('57014') || // Query cancelled
    status === 429 || // Too many requests
    status === 503 // Service unavailable
  );
};

export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;

  const err = error as RetryableError;
  const msg = err.message?.toLowerCase() ?? '';
  const status = err.status;

  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('abort') ||
    msg.includes('timeout') ||
    status === 408 || // Request timeout
    status === 502 || // Bad gateway
    status === 504 // Gateway timeout
  );
};

// Progressive retry with exponential backoff
const calculateBackoff = (attempt: number): number => {
  const baseDelay = REQUEST_CONFIG.INITIAL_BACKOFF;
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay;
  return Math.min(exponentialDelay + jitter, REQUEST_CONFIG.MAX_BACKOFF);
};

// Request helpers with improved timeout handling
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = REQUEST_CONFIG.DB_TIMEOUT,
  isAuth: boolean = false
): Promise<T> => {
  const actualTimeout = isAuth ? REQUEST_CONFIG.AUTH_TIMEOUT : timeoutMs;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), actualTimeout);

  try {
    const result = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new SupabaseError('Request timeout'));
        });
      })
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && (
      error.message === 'Request timeout' ||
      error.message.includes('aborted')
    )) {
      throw new SupabaseError('The request timed out. Please try again.');
    }
    throw error;
  }
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeoutMs?: number;
    isAuth?: boolean;
  } = {}
): Promise<T> => {
  const {
    maxRetries = REQUEST_CONFIG.MAX_RETRIES,
    timeoutMs = REQUEST_CONFIG.DB_TIMEOUT,
    isAuth = false
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await withTimeout(operation(), timeoutMs, isAuth);
    } catch (error) {
      const isRetryable = isResourceConstraintError(error) || isNetworkError(error);
      lastError = new SupabaseError(
        error instanceof Error ? error.message : 'Unknown error',
        error
      );

      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError;
      }

      const waitTime = calculateBackoff(attempt);
      console.warn(
        `Attempt ${attempt + 1} failed:`,
        lastError.message,
        `Retrying in ${Math.round(waitTime/1000)}s...`
      );

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError || new Error('Retry failed');
};

// Type helpers
export type DbSchema = Database['public'];
export type DbTables = DbSchema['Tables'];
export type TableName = keyof DbTables;
export type TablesRow<T extends TableName> = DbTables[T]['Row'];
export type TablesInsert<T extends TableName> = DbTables[T]['Insert'];
export type TablesUpdate<T extends TableName> = DbTables[T]['Update'];
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never;