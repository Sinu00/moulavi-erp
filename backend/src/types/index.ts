import { Request } from 'express';

export type UserRole = 'admin' | 'staff' | 'party';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Party {
  id: string;
  party_name: string;
  email: string;
  contact_number?: string;
  whatsapp_number?: string;
  address?: string;
  gst_number?: string;
  customer_type: 'direct' | 'b2b';
  account_currency: 'SAR' | 'INR' | 'AED';
  is_supplier: boolean;
  is_customer: boolean;
  login_required: boolean;
  user_id?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: string;
  service_type: string;
  party_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  submitted_at: Date;
  details?: any;
  created_at: Date;
  updated_at: Date;
}

export interface UmrahVisaDetails {
  id: string;
  service_id: string;
  full_name: string;
  passport_number: string;
  nationality: string;
  travel_date_from: Date;
  travel_date_to: Date;
  passport_expiry: Date;
  date_of_birth: Date;
  gender: 'male' | 'female';
  phone_number?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  service_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

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

