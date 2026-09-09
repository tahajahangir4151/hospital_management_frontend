export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface AdminLoginSuccessResponse {
  success: true;
  message: string;
  data: {
    user: AuthUser;
    session: AuthSession;
  };
}

export interface AdminLoginErrorResponse {
  success: false;
  message: string;
}

export type AdminLoginResponse = AdminLoginSuccessResponse | AdminLoginErrorResponse;

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}
