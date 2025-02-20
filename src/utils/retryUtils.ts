import { AuthorizationError, DatabaseError } from '../types/errors';

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  maxDelayMs: 5000,
  shouldRetry: (error) => {
    if (error instanceof AuthorizationError) {
      // Always retry auth errors as they might be temporary
      console.debug('Authorization error, will retry', error);
      return true;
    }
    if (error instanceof DatabaseError) {
      // Only retry certain database errors
      const shouldRetry = error.message.includes('permission') ||
                        error.message.includes('deadlock') ||
                        error.message.includes('timeout');
      console.debug('Database error, retry decision:', { shouldRetry, error });
      return shouldRetry;
    }
    return false;
  }
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;
  let retryCount = 0;

  while (retryCount < opts.maxRetries) {
    try {
      if (retryCount > 0) {
        // Add exponential backoff delay
        const delay = Math.min(
          opts.delayMs * Math.pow(2, retryCount - 1),
          opts.maxDelayMs
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      console.debug('Operation failed, checking retry:', {
        attempt: retryCount + 1,
        maxRetries: opts.maxRetries,
        error: lastError.message
      });

      if (!opts.shouldRetry(lastError)) {
        console.debug('Error not retryable, throwing');
        throw lastError;
      }

      retryCount++;

      if (retryCount === opts.maxRetries) {
        console.debug('Max retries reached, throwing last error');
        throw lastError;
      }
    }
  }

  throw lastError!;
}