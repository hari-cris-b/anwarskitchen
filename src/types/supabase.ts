import { PostgrestError, PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import { Database } from './database';

export type FunctionReturn<T extends keyof Database['public']['Functions']> = 
  Database['public']['Functions'][T]['Returns'];

export type FunctionArgs<T extends keyof Database['public']['Functions']> = 
  Database['public']['Functions'][T]['Args'];

export interface DbResult<T> {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
}

// Generic interface for array results
export interface DbArrayResult<T> extends DbResult<T[]> {
  data: T[] | null;
}

// Generic interface for single results
export interface DbSingleResult<T> extends DbResult<T> {
  data: T | null;
}

export interface DbResultOk<T> extends DbResult<T> {
  data: T;
  error: null;
}

export interface DbResultErr extends DbResult<null> {
  data: null;
  error: PostgrestError;
}

export type SupabaseFunctionResponse<T> = Promise<DbResult<T>>;
export type SupabaseQueryResponse<T> = Promise<DbResult<T>>;

// Helper type to extract row type from table name
export type TableRow<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

// Helper type for RPC function results
export type RpcResponse<T> = Promise<DbResult<T>>;

// Convert Supabase array response to our DbArrayResult type
export function toArrayResult<T>(response: PostgrestResponse<T>): DbArrayResult<T> {
  return {
    data: Array.isArray(response.data) ? response.data : null,
    error: response.error,
    count: response.count
  };
}

// Convert Supabase single response to our DbSingleResult type
export function toSingleResult<T>(response: PostgrestSingleResponse<T>): DbSingleResult<T> {
  return {
    data: response.data,
    error: response.error,
    count: null
  };
}

// Specific response types for our functions
export interface StaffCountResponse {
  franchise_id: string;
  staff_count: number;
}

export interface RevenueResponse {
  franchise_id: string;
  total_revenue: number;
}

export interface FranchiseMetrics {
  staff_count: number;
  total_orders: number;
  total_revenue: number;
}

export interface TopPerformer {
  franchise_id: string;
  franchise_name: string;
  total_revenue: number;
  order_count: number;
}

// Type guards
export function isDbResultOk<T>(result: DbResult<T>): result is DbResultOk<T> {
  return !result.error && result.data !== null;
}

export function isDbResultErr(result: DbResult<any>): result is DbResultErr {
  return !!result.error;
}

// Array type guard
export function isArrayResult<T>(result: DbResult<T | T[]>): result is DbArrayResult<T> {
  return Array.isArray(result.data);
}

// Type guard for specific function results
export function isStaffCountResponse(data: unknown): data is StaffCountResponse[] {
  if (!Array.isArray(data)) return false;
  return data.every(item => 
    typeof item === 'object' &&
    item !== null &&
    'franchise_id' in item &&
    'staff_count' in item &&
    typeof item.franchise_id === 'string' &&
    typeof item.staff_count === 'number'
  );
}

export function isRevenueResponse(data: unknown): data is RevenueResponse[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'franchise_id' in item &&
    'total_revenue' in item &&
    typeof item.franchise_id === 'string' &&
    typeof item.total_revenue === 'number'
  );
}

export function isFranchiseMetrics(data: unknown): data is FranchiseMetrics {
  if (typeof data !== 'object' || data === null) return false;
  const metrics = data as Partial<FranchiseMetrics>;
  return (
    typeof metrics.staff_count === 'number' &&
    typeof metrics.total_orders === 'number' &&
    typeof metrics.total_revenue === 'number'
  );
}

export function isTopPerformerResponse(data: unknown): data is TopPerformer[] {
  if (!Array.isArray(data)) return false;
  return data.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'franchise_id' in item &&
    'franchise_name' in item &&
    'total_revenue' in item &&
    'order_count' in item &&
    typeof item.franchise_id === 'string' &&
    typeof item.franchise_name === 'string' &&
    typeof item.total_revenue === 'number' &&
    typeof item.order_count === 'number'
  );
}

// Helper function to assert response types
export function assertResponse<T>(
  result: DbResult<unknown>,
  validator: (data: unknown) => data is T
): asserts result is DbResultOk<T> {
  if (!isDbResultOk(result) || !validator(result.data)) {
    throw new Error('Invalid response type');
  }
}