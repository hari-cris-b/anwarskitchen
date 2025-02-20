import { 
  SupabaseClient, 
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
  PostgrestError
} from '@supabase/supabase-js';
import {
  FranchiseError,
  AuthorizationError,
  ValidationError,
  DatabaseError,
  handleDatabaseError
} from '../types/errors';
import {
  DbResult,
  DbResultOk,
  DbArrayResult,
  DbSingleResult,
  toArrayResult,
  toSingleResult,
  isDbResultOk,
  isDbResultErr,
  assertResponse
} from '../types/supabase';

type AnyPromiseLike<T> = PromiseLike<T> | { then(): PromiseLike<T> };

type SupabaseArrayResponse<T> = PostgrestResponse<T> & {
  data: T[];
};

/**
 * Helper to process Supabase responses and standardize error handling
 */

// Convert query to promise if needed
async function resolvePromise<T>(query: AnyPromiseLike<T>): Promise<T> {
  return 'then' in query && typeof query.then === 'function' 
    ? query.then()
    : (query as PromiseLike<T>);
}

// Handle array responses
export async function handleApiArrayResponse<T>(
  query: AnyPromiseLike<SupabaseArrayResponse<T>>,
  context: string
): Promise<T[]> {
  try {
    const response = await resolvePromise(query);
    
    if (response.error) {
      handleDatabaseError(response.error);
    }

    if (!response.data || !Array.isArray(response.data)) {
      throw new FranchiseError(`No data returned from ${context}`);
    }

    return response.data;
  } catch (error) {
    throw new DatabaseError(`Error in ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle single responses
export async function handleApiSingleResponse<T>(
  query: AnyPromiseLike<PostgrestSingleResponse<T>>,
  context: string
): Promise<T> {
  try {
    const response = await resolvePromise(query);
    
    if (response.error) {
      handleDatabaseError(response.error);
    }

    if (!response.data) {
      throw new FranchiseError(`No data returned from ${context}`);
    }

    return response.data;
  } catch (error) {
    throw new DatabaseError(`Error in ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle general API responses
export async function handleApiResponse<T>(
  query: AnyPromiseLike<PostgrestResponse<T> | PostgrestSingleResponse<T> | PostgrestMaybeSingleResponse<T>>,
  context: string
): Promise<T> {
  try {
    const response = await resolvePromise(query);
    
    if (response.error) {
      // Handle specific PostgreSQL error codes
      if (response.error.code === '42501') { // Permission denied
        throw new AuthorizationError('You do not have permission to perform this action');
      }
      if (response.error.code === '23505') { // Unique violation
        throw new ValidationError('A record with this value already exists');
      }
      if (response.error.code?.startsWith('23')) { // Constraint violation
        throw new ValidationError(response.error.message || 'Invalid data provided');
      }
      
      // Handle other database errors
      handleDatabaseError(response.error);
    }

    if (!response.data) {
      throw new FranchiseError(`No data returned from ${context}`);
    }

    if (Array.isArray(response.data)) {
      if (response.data.length === 0) {
        throw new FranchiseError(`No data returned from ${context}`);
      }
      return response.data[0] as T;
    }

    return response.data;
  } catch (error) {
    if (
      error instanceof FranchiseError ||
      error instanceof AuthorizationError ||
      error instanceof ValidationError ||
      error instanceof DatabaseError
    ) {
      throw error;
    }

    // Log unexpected errors
    console.error(`API Error in ${context}:`, error);
    throw new DatabaseError(`An error occurred while ${context}`, error);
  }
}

/**
 * Helper to handle RPC function calls with type checking
 */
export function handleRpcResponse<T>(
  query: AnyPromiseLike<PostgrestResponse<T>>,
  context: string,
  validator?: (data: unknown) => data is T
): Promise<T> {
  return resolvePromise(query).then(response => {
    if (response.error) {
      // Handle RPC specific errors
      if (response.error.message?.includes('function not found')) {
        console.error('RPC Function not found:', { context, error: response.error });
        throw new DatabaseError(`RPC function not found for: ${context}`);
      }
      if (response.error.message?.includes('permission')) {
        console.error('RPC Permission denied:', { context, error: response.error });
        throw new AuthorizationError(`Permission denied for ${context}`);
      }
      if (response.error.message?.includes('super admin')) {
        console.error('Super admin access required:', { context, error: response.error });
        throw new AuthorizationError('Super admin privileges required');
      }
      
      console.error('RPC Error:', { context, error: response.error });
      handleDatabaseError(response.error);
    }

    let data = response.data;
    console.debug('RPC Response data:', { context, data });

    // Handle null/undefined response
    if (data === null || data === undefined) {
      console.debug(`Empty response from RPC call: ${context}`);
      // For array types, return empty array
      if (validator && validator([]) && Array.isArray([])) {
        return [] as T;
      }
      // For number types, return 0
      if (validator && validator(0) && typeof 0 === 'number') {
        return 0 as T;
      }
      // For other types, throw error
      throw new DatabaseError(`No data returned from RPC call: ${context}`);
    }

    // Handle array responses
    if (Array.isArray(data)) {
      // If expecting array and validator passes, return it
      if (validator && validator(data)) {
        return data;
      }
      // If single item expected, get first element
      if (data.length > 0 && validator && validator(data[0])) {
        return data[0];
      }
    }
    // Handle single value
    else if (validator && validator(data)) {
      return data;
    }

    console.error('Invalid RPC response data:', { context, data });
    throw new ValidationError(`Invalid response data from RPC call: ${context}`);
  });
}

/**
 * Helper to validate required parameters
 */
export function validateParams(params: Record<string, any>, requiredParams: string[]): void {
  const missingParams = requiredParams.filter(param => {
    const value = params[param];
    return value === undefined || value === null || value === '';
  });
  
  if (missingParams.length > 0) {
    throw new ValidationError(`Missing required parameters: ${missingParams.join(', ')}`);
  }
}

/**
 * Helper to validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Helper to validate required UUID parameters
 */
export function validateUUID(param: string | undefined | null, paramName: string): void {
  if (!param) {
    throw new ValidationError(`${paramName} is required`);
  }
  if (!isValidUUID(param)) {
    throw new ValidationError(`Invalid ${paramName} format`);
  }
}