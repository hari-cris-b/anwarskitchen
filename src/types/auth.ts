import { Staff, StaffRole } from './staff';

export interface AuthMetadata {
  role: StaffRole;
  email_verified: boolean;
  phone_verified: boolean;
}

export interface AuthSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    aud: string;
    role: string;
    email: string;
    email_confirmed_at: string;
    phone: string | null;
    last_sign_in_at: string;
    app_metadata: {
      provider: string;
      providers: string[];
    };
    user_metadata: AuthMetadata;
    created_at: string;
    updated_at: string;
  };
}

export interface Profile extends Staff {
  auth_session?: AuthSession;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export type AuthError = {
  message: string;
  status?: number;
  code?: string;
};

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdatePasswordRequest {
  new_password: string;
}