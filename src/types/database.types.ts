import { 
  StaffRole,
  ShiftType,
  StatusType
} from './staff';

export interface DatabaseSchema {
  staff: {
    Row: {
      id: string;
      franchise_id: string;
      user_id: string;
      name: string;
      email: string;
      phone?: string;
      role: StaffRole;
      shift: ShiftType;
      hourly_rate: number;
      status: StatusType;
      pin_code?: string;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<DatabaseSchema['staff']['Row'], 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<DatabaseSchema['staff']['Row']>;
  };

  franchises: {
    Row: {
      id: string;
      name: string;
      owner_id: string;
      created_at: string;
      updated_at: string;
      address: string;
      phone: string;
      email: string;
      tax_rate: number;
      currency: string;
      timezone: string;
      active: boolean;
    };
    Insert: Omit<DatabaseSchema['franchises']['Row'], 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<DatabaseSchema['franchises']['Row']>;
  };

  users: {
    Row: {
      id: string;
      email: string;
      created_at: string;
      updated_at: string;
      role: 'owner' | 'staff';
      franchise_id?: string;
    };
    Insert: Omit<DatabaseSchema['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
    Update: Partial<DatabaseSchema['users']['Row']>;
  };
}

// Helper type for table rows
export type TableRow<T extends keyof DatabaseSchema> = DatabaseSchema[T]['Row'];

// Helper type for insert operations
export type TableInsert<T extends keyof DatabaseSchema> = DatabaseSchema[T]['Insert'];

// Helper type for update operations
export type TableUpdate<T extends keyof DatabaseSchema> = DatabaseSchema[T]['Update'];

// Helper type for database query results
export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

// Helper type for database list query results
export type ListQueryResult<T> = {
  data: T[] | null;
  error: Error | null;
};

// Helper type for timestamps
export interface TimestampFields {
  created_at: string;
  updated_at: string;
}

// Export specific table types
export type StaffRow = TableRow<'staff'>;
export type StaffInsert = TableInsert<'staff'>;
export type StaffUpdate = TableUpdate<'staff'>;

export type FranchiseRow = TableRow<'franchises'>;
export type FranchiseInsert = TableInsert<'franchises'>;
export type FranchiseUpdate = TableUpdate<'franchises'>;

export type UserRow = TableRow<'users'>;
export type UserInsert = TableInsert<'users'>;
export type UserUpdate = TableUpdate<'users'>;
