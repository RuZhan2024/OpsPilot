export const AUTH_TOKEN_KEY = 'opspilot.accessToken';

export type UserRole = 'ADMIN' | 'EVENT_MANAGER' | 'ANALYST' | 'VIEWER';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
};
