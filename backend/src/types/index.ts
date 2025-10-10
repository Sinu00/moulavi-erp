import { Request } from 'express';
import { 
  User, 
  Party, 
  Service, 
  UmrahVisaDetail, 
  Document, 
  RefreshToken,
  UserRole,
  CustomerType,
  AccountCurrency,
  ServiceStatus,
  UmrahVisaStatus,
  Gender
} from '@prisma/client';

// Re-export Prisma types for convenience
export type { 
  User, 
  Party, 
  Service, 
  UmrahVisaDetail, 
  Document, 
  RefreshToken,
  UserRole,
  CustomerType,
  AccountCurrency,
  ServiceStatus,
  UmrahVisaStatus,
  Gender
};

// Legacy type aliases for backward compatibility
export type UmrahVisaDetails = UmrahVisaDetail;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
}

// User Management Types
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  is_active?: boolean;
}

