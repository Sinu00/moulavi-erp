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
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// User Management Types (using existing User model)
export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'party';
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'staff' | 'party';
  is_active?: boolean;
}

// Party Types
export interface Party {
  id: string;
  partyName: string;
  email: string;
  contactNumber?: string;
  whatsappNumber?: string;
  address?: string;
  gstNumber?: string;
  customerType: 'direct' | 'b2b';
  accountCurrency: 'SAR' | 'INR' | 'AED';
  isSupplier: boolean;
  isCustomer: boolean;
  loginRequired: boolean;
  userId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  serviceType: string;
  partyId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  submittedAt: string;
  details: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Additional fields for party services
  umrahVisaStatus?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  umrahVisaDetail?: UmrahVisaDetails | null;
  documents?: Document[];
}

export interface UmrahVisaDetails {
  id?: string;
  serviceId?: string;
  fullName: string;
  passportNumber: string;
  nationality: string;
  travelDateFrom: string;
  travelDateTo: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  status?: 'pending' | 'processing' | 'approved' | 'rejected' | 'completed';
  partyName?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Document Types
export interface Document {
  id: string;
  serviceId: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
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
