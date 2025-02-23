// Staff types
export type { 
  Staff, 
  StaffRole, 
  StaffStatus, 
  StaffPermissions,
  AuthUser
} from './staff';

// Order types
export type { 
  OrderStatus,
  Order,
  OrderItem,
  OrderWithItems,
  OrderSummary
} from './orders';

// Menu types
export type {
  Category,
  MenuItem,
  MenuItemCreate,
  MenuItemUpdate,
  MenuSummary,
  CategoryGroup as MenuCategory
} from './menu';

// Franchise types
export type {
  Franchise,
  FranchiseSettings,
  PrinterConfig,
  NotificationSettings,
  ReceiptTemplate,
  BusinessDetails,
  BusinessHours,
} from './franchise';

// Auth types
export type {
  Profile,
  AuthSession,
  AuthMetadata,
  LoginCredentials,
  RefreshTokenResponse,
  AuthError,
  VerifyEmailResponse,
  ResetPasswordRequest,
  UpdatePasswordRequest
} from './auth';

// Base types for reuse
export interface BaseMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  tax_rate: number;
  franchise_id: string;
}

// Utility types
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type ErrorResponse = {
  message: string;
  code?: string;
  details?: unknown;
};

export type SuccessResponse<T> = {
  data: T;
  message?: string;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
};
