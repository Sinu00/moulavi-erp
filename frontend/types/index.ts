// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Party Types
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
  created_at: string;
  updated_at: string;
}

export interface CreatePartyRequest {
  party_name: string;
  email: string;
  contact_number?: string;
  whatsapp_number?: string;
  address?: string;
  gst_number?: string;
  customer_type: 'direct' | 'b2b';
  account_currency: 'SAR' | 'INR' | 'AED';
  is_supplier?: boolean;
  is_customer?: boolean;
  login_required?: boolean;
}

// Service Types
export interface Service {
  id: string;
  service_type: string;
  party_id: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  submitted_at: string;
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UmrahVisaDetails {
  full_name: string;
  passport_number: string;
  nationality: string;
  travel_date_from: string;
  travel_date_to: string;
  passport_expiry: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  phone_number?: string;
}

// Document Types
export interface Document {
  id: string;
  service_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalParties: number;
  totalServices: number;
  pendingServices: number;
  completedServices?: number;
}

// API Error
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
