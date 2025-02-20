export class FranchiseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'FranchiseError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Custom error type guards
export const isFranchiseError = (error: unknown): error is FranchiseError => {
  return error instanceof FranchiseError;
};

export const isAuthorizationError = (error: unknown): error is AuthorizationError => {
  return error instanceof AuthorizationError;
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isDatabaseError = (error: unknown): error is DatabaseError => {
  return error instanceof DatabaseError;
};

// PostgreSQL error codes
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  CHECK_VIOLATION: '23514',
  NOT_NULL_VIOLATION: '23502',
  PERMISSION_DENIED: '42501',
  INVALID_PARAMETER_VALUE: '22023',
  UNDEFINED_COLUMN: '42703',
  UNDEFINED_TABLE: '42P01',
  DUPLICATE_KEY_VALUE: '23505',
  CONNECTION_FAILURE: '08006'
} as const;

// Error handler helper
export const handleDatabaseError = (error: unknown): never => {
  if (typeof error === 'object' && error !== null) {
    const anyError = error as any;
    const errorCode = anyError.code;
    const errorMessage = anyError.message || 'Unknown database error';

    // Authorization errors
    if (errorCode === PG_ERROR_CODES.PERMISSION_DENIED || 
        errorMessage.includes('Access denied') ||
        errorMessage.includes('permission denied')) {
      throw new AuthorizationError(
        'You do not have permission to perform this action'
      );
    }

    // Validation errors
    if (errorCode === PG_ERROR_CODES.UNIQUE_VIOLATION || 
        errorCode === PG_ERROR_CODES.DUPLICATE_KEY_VALUE) {
      throw new ValidationError('A record with this value already exists');
    }

    if (errorCode === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
      throw new ValidationError('Referenced record does not exist');
    }

    if (errorCode === PG_ERROR_CODES.CHECK_VIOLATION) {
      throw new ValidationError('Value does not meet requirements');
    }

    if (errorCode === PG_ERROR_CODES.NOT_NULL_VIOLATION) {
      throw new ValidationError('Required field is missing');
    }

    if (errorCode === PG_ERROR_CODES.INVALID_PARAMETER_VALUE) {
      throw new ValidationError('Invalid parameter value provided');
    }

    // Schema errors
    if (errorCode === PG_ERROR_CODES.UNDEFINED_COLUMN ||
        errorCode === PG_ERROR_CODES.UNDEFINED_TABLE) {
      throw new DatabaseError('Database schema error', error);
    }

    // Connection errors
    if (errorCode === PG_ERROR_CODES.CONNECTION_FAILURE) {
      throw new DatabaseError('Database connection failed', error);
    }

    // Generic validation
    if (errorMessage.includes('validation')) {
      throw new ValidationError(errorMessage);
    }
  }

  // Generic database error
  throw new DatabaseError('An unexpected database error occurred', error);
};