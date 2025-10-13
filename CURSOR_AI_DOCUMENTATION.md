# Cursor AI Documentation - Moulavi ERP System

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema & Data Access](#database-schema--data-access)
3. [Backend API Patterns](#backend-api-patterns)
4. [Frontend Architecture](#frontend-architecture)
5. [Step-by-Step Implementation Guides](#step-by-step-implementation-guides)
6. [Umrah Visa Booking System](#umrah-visa-booking-system)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Code Conventions & Best Practices](#code-conventions--best-practices)
9. [Testing & Debugging](#testing--debugging)
10. [Quick Reference](#quick-reference)

---

## System Overview

### Architecture Summary
The Moulavi ERP system is a full-stack web application built with modern technologies, following a client-server architecture with clear separation of concerns.

**Technology Stack:**
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens
- **File Storage**: Local file system (with uploads directory)

### Folder Structure
```
moulavi-erp/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic (email, WhatsApp)
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions (JWT, password)
│   ├── prisma/             # Database schema and migrations
│   └── uploads/             # File uploads storage
├── frontend/               # Next.js application
│   ├── app/                # App Router pages
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Admin/staff dashboard
│   │   └── party/          # Party user dashboard
│   ├── components/          # Reusable React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   └── types/              # TypeScript type definitions
└── docs/                   # Documentation files
```

### Key Design Patterns
1. **Role-Based Access Control (RBAC)**: Admin, Staff, Party roles with different permissions
2. **Repository Pattern**: Prisma ORM for database access
3. **Middleware Pattern**: Authentication, authorization, error handling
4. **Hook Pattern**: Custom React hooks for data fetching and state management
5. **Component Composition**: Reusable UI components with shadcn/ui

---

## Database Schema & Data Access

### Prisma Schema Overview
The database uses PostgreSQL with Prisma ORM. Key models include:

**Core Models:**
- `User`: System users (admin, staff, party)
- `Party`: Clients/customers with business information
- `Service`: Service requests (Umrah visa, etc.)
- `UmrahVisaDetail`: Specific visa application details
- `Document`: File uploads linked to services
- `RefreshToken`: JWT refresh token management

### Database Relationships
```typescript
User (1) ←→ (0..1) Party          // User can have one party account
Party (1) ←→ (0..*) Service        // Party can have multiple services
Service (1) ←→ (0..*) UmrahVisaDetail  // Service can have visa details
Service (1) ←→ (0..*) Document     // Service can have multiple documents
User (1) ←→ (0..*) RefreshToken    // User can have multiple refresh tokens
```

### Query Patterns & Best Practices

**1. Always use Prisma client, not raw queries:**
```typescript
// ✅ Good
const parties = await prisma.party.findMany({
  where: { isCustomer: true },
  include: { user: true }
});

// ❌ Avoid raw queries
const parties = await query('SELECT * FROM parties WHERE is_customer = true');
```

**2. Use proper error handling:**
```typescript
try {
  const party = await prisma.party.findUnique({
    where: { id: partyId }
  });
  
  if (!party) {
    return res.status(404).json({ error: 'Party not found' });
  }
  
  return res.json({ party });
} catch (error) {
  console.error('Database error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
```

**3. Use transactions for related operations:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  const service = await tx.service.create({
    data: { serviceType: 'umrah_visa', partyId }
  });
  
  const visaDetails = await tx.umrahVisaDetail.create({
    data: { serviceId: service.id, ...visaData }
  });
  
  return { service, visaDetails };
});
```

### Common Database Pitfalls
1. **Creating Duplicate Tables**: ALWAYS check existing schema before creating new tables
2. **N+1 Query Problem**: Use `include` to fetch related data in one query
3. **Missing Indexes**: Add indexes for frequently queried fields
4. **Transaction Deadlocks**: Keep transactions short and simple
5. **Memory Leaks**: Use `select` to limit returned fields

---

## Backend API Patterns

### Route Structure & Conventions
Routes are organized by feature in separate files:

```typescript
// backend/src/routes/party.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/parties - Get all parties
router.get('/', 
  authenticate, 
  authorize('admin', 'staff'), 
  asyncHandler(async (req, res) => {
    // Implementation
  })
);

export default router;
```

### Authentication & Authorization Flow
1. **JWT Token Validation**: `authenticate` middleware validates access token
2. **Role-Based Authorization**: `authorize` middleware checks user roles
3. **Request Context**: `req.user` contains authenticated user info

```typescript
// Authentication middleware
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.substring(7);
  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
};

// Authorization middleware
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### Request/Response Patterns

**Standard Response Format:**
```typescript
// Success response
res.status(201).json({
  party: createdParty,
  message: 'Party created successfully'
});

// Error response
res.status(400).json({
  error: 'Validation failed',
  details: validationErrors
});
```

**Pagination Pattern:**
```typescript
const { page = '1', limit = '10' } = req.query;
const pageNum = parseInt(page as string);
const limitNum = parseInt(limit as string);
const skip = (pageNum - 1) * limitNum;

const [data, total] = await Promise.all([
  prisma.model.findMany({ skip, take: limitNum }),
  prisma.model.count()
]);

res.json({
  data,
  pagination: {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum)
  }
});
```

### Validation Patterns
Use `express-validator` for input validation:

```typescript
import { body } from 'express-validator';

const createPartyValidation = [
  body('party_name').isString().notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('customer_type').isIn(['direct', 'b2b']),
  body('account_currency').isIn(['SAR', 'INR', 'AED'])
];

router.post('/', 
  authenticate,
  authorize('admin', 'staff'),
  createPartyValidation,
  asyncHandler(async (req, res) => {
    // Validation passed, proceed with logic
  })
);
```

### Error Handling
Use `asyncHandler` wrapper to catch async errors:

```typescript
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

---

## Frontend Architecture

### Component Structure
Components follow a hierarchical structure:

```
components/
├── ui/                     # shadcn/ui base components
│   ├── button.tsx
│   ├── input.tsx
│   └── ...
├── PartyTable.tsx          # Feature-specific components
├── CreatePartyDialog.tsx
└── Sidebar.tsx             # Layout components
```

### Page Routing with Next.js App Router
Pages are organized by feature and user role:

```
app/
├── auth/                   # Public authentication
│   └── page.tsx
├── dashboard/              # Admin/staff dashboard
│   ├── page.tsx
│   ├── masters/           # Master data management
│   │   └── party/
│   │       └── page.tsx
│   └── services/          # Service management
│       └── umrah-visa/
│           └── page.tsx
└── party/                  # Party user dashboard
    ├── dashboard/
    │   └── page.tsx
    └── umrah-visa/
        └── page.tsx
```

### State Management Patterns
Use custom hooks for data fetching and state management:

```typescript
// hooks/useParties.ts
export function useParties() {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const loadParties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await partyAPI.getAll({ search });
      setParties(response.data.parties);
    } catch (error) {
      setParties([]);
    } finally {
      setLoading(false);
    }
  }, [search]);
  
  useEffect(() => {
    loadParties();
  }, [loadParties]);
  
  return { parties, loading, search, setSearch, loadParties };
}
```

### API Integration Patterns
Use Axios with interceptors for API calls:

```typescript
// lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh
    }
    return Promise.reject(error);
  }
);
```

### Authentication Flow
Client-side authentication uses localStorage:

```typescript
// lib/auth.ts
export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const hasRole = (role: string | string[]): boolean => {
  const user = getUser();
  if (!user) return false;
  
  if (Array.isArray(role)) {
    return role.includes(user.role);
  }
  
  return user.role === role;
};
```

---

## Step-by-Step Implementation Guides

### A. Adding a New Tab/Page

#### Step 1: Update Sidebar Navigation
Add the new tab to the sidebar in `frontend/components/Sidebar.tsx`:

```typescript
// Add to masterItems array
const masterItems = [
  { name: 'Country Master', icon: MapPin, path: '/dashboard/masters/country' },
  { name: 'User Master', icon: Users, path: '/dashboard/masters/user' }, // New tab
  // ... other items
];

// Update the onClick handler
onClick={() => {
  if (item.path === '/dashboard/masters/user') {
    router.push(item.path);
  } else {
    toast.info(`${item.name} coming soon`);
  }
}}
```

#### Step 2: Create the Page Component
Create `frontend/app/dashboard/masters/user/page.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { getUser, hasRole } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { Plus, Menu } from 'lucide-react';

export default function UserMasterPage() {
  const router = useRouter();
  const user = getUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // CRITICAL: Always check authentication first
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }
  }, [user, router]);

  if (!user) {
    return null; // Prevent flash of content
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header Bar */}
        <div className="sticky top-0 z-10 bg-white border-b px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-gray-900">User Master</h1>
                <p className="text-xs lg:text-sm text-gray-500 mt-0.5">
                  Manage system users
                </p>
              </div>
            </div>
            <Button 
              onClick={() => toast.info('Add user functionality coming soon')}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              size="sm"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add New User</span>
            </Button>
          </div>
        </div>

        <div className="p-4 lg:p-8 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">User Management</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Manage all system users
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <p className="text-gray-500">User management functionality coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

#### Step 3: Create Data Fetching Hook (Optional)
If you need to fetch data, create a custom hook:

```typescript
// hooks/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '@/lib/api';
import { User } from '@/types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAll({ search });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);
  
  // CRITICAL: Use useCallback to prevent infinite loops
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);
  
  return { users, loading, search, setSearch, loadUsers };
}
```

#### Common Pitfalls & Solutions

**1. Infinite Loading Loop:**
```typescript
// ❌ BAD - Creates infinite loop
useEffect(() => {
  loadUsers();
}, [loadUsers]); // loadUsers changes every render

// ✅ GOOD - Use useCallback
const loadUsers = useCallback(async () => {
  // Implementation
}, [search]); // Only recreate when search changes

useEffect(() => {
  loadUsers();
}, [loadUsers]);
```

**2. Data Not Appearing:**
```typescript
// ❌ BAD - No error handling
const loadUsers = async () => {
  const response = await userAPI.getAll();
  setUsers(response.data.users);
};

// ✅ GOOD - Proper error handling
const loadUsers = async () => {
  try {
    const response = await userAPI.getAll();
    setUsers(response.data.users);
  } catch (error) {
    console.error('Error loading users:', error);
    setUsers([]); // Set empty array on error
  }
};
```

**3. Authentication Issues:**
```typescript
// ❌ BAD - No auth check
export default function UserPage() {
  // Component renders without auth check
}

// ✅ GOOD - Always check auth first
export default function UserPage() {
  const user = getUser();
  
  useEffect(() => {
    if (!user || !hasRole(['admin', 'staff'])) {
      router.push('/auth');
      return;
    }
  }, [user, router]);
  
  if (!user) {
    return null; // Prevent flash of content
  }
  
  // Rest of component
}
```

### B. Adding a New Database Table/Model

#### Step 0: CRITICAL - Check Existing Tables First
**ALWAYS check the existing Prisma schema and database before creating new tables:**

```bash
# Check existing tables in schema
cat backend/prisma/schema.prisma

# Or use Prisma Studio to see existing data
cd backend
npx prisma studio
```

**Common existing tables to check:**
- `User` - System users (admin, staff, party)
- `Party` - Clients/customers
- `Service` - Service requests
- `Document` - File uploads
- `RefreshToken` - JWT tokens

**If a similar table already exists, modify/extend it instead of creating a new one.**

#### Step 1: Update Prisma Schema
Add the new model to `backend/prisma/schema.prisma`:

```prisma
model UserMaster {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @db.VarChar(255)
  email       String   @unique @db.VarChar(255)
  role        UserRole
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamp
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamp

  @@map("user_masters")
  @@index([email])
  @@index([role])
}
```

#### Step 2: Run Migration
```bash
cd backend
npx prisma migrate dev --name add_user_master
```

#### Step 3: Update TypeScript Types
Add types to `backend/src/types/index.ts`:

```typescript
export type { UserMaster } from '@prisma/client';

export interface CreateUserMasterRequest {
  name: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
}
```

And `frontend/types/index.ts`:

```typescript
export interface UserMaster {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### Step 4: Create Backend Route
Create `backend/src/routes/userMaster.routes.ts`:

```typescript
import { Router, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

const router = Router();

const createUserMasterValidation = [
  body('name').isString().notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'staff', 'party']),
];

// Create user master
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createUserMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, email, role, is_active = true } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.userMaster.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const userMaster = await prisma.userMaster.create({
      data: {
        name,
        email,
        role,
        isActive: is_active
      }
    });
    
    res.status(201).json({ userMaster });
  })
);

// Get all user masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [userMasters, total] = await Promise.all([
      prisma.userMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.userMaster.count({ where })
    ]);
    
    res.json({
      userMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

export default router;
```

#### Step 5: Register Route in Server
Add to `backend/src/server.ts`:

```typescript
import userMasterRoutes from './routes/userMaster.routes';

// API routes
app.use('/api/user-masters', userMasterRoutes);
```

#### Step 6: Create Frontend API Client
Add to `frontend/lib/api.ts`:

```typescript
// User Master API
export const userMasterAPI = {
  create: (data: any) => api.post('/user-masters', data),
  getAll: (params?: any) => api.get('/user-masters', { params }),
  getById: (id: string) => api.get(`/user-masters/${id}`),
  update: (id: string, data: any) => api.put(`/user-masters/${id}`, data),
  delete: (id: string) => api.delete(`/user-masters/${id}`),
};
```

### C. Adding a New API Endpoint

#### Step 1: Create Route Handler
Add new endpoint to existing route file or create new one:

```typescript
// In backend/src/routes/party.routes.ts
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const [totalParties, directParties, b2bParties] = await Promise.all([
      prisma.party.count(),
      prisma.party.count({ where: { customerType: 'direct' } }),
      prisma.party.count({ where: { customerType: 'b2b' } })
    ]);
    
    res.json({
      stats: {
        total: totalParties,
        direct: directParties,
        b2b: b2bParties
      }
    });
  })
);
```

#### Step 2: Add Frontend API Client
Add to `frontend/lib/api.ts`:

```typescript
// Party API
export const partyAPI = {
  // ... existing methods
  getStats: () => api.get('/parties/stats'),
};
```

#### Step 3: Use in Component
```typescript
const [stats, setStats] = useState(null);

useEffect(() => {
  const loadStats = async () => {
    try {
      const response = await partyAPI.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  loadStats();
}, []);
```

### D. Adding a New Component

#### Step 1: Create Component File
Create `frontend/components/UserTable.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User, Search, Edit, Trash2 } from 'lucide-react';
import { UserMaster } from '@/types';

interface UserTableProps {
  users: UserMaster[];
  loading: boolean;
  onEdit: (user: UserMaster) => void;
  onDelete: (userId: string) => void;
  onSearch: (search: string) => void;
}

export default function UserTable({ 
  users, 
  loading, 
  onEdit, 
  onDelete, 
  onSearch 
}: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: 'bg-red-100 text-red-800',
      staff: 'bg-blue-100 text-blue-800',
      party: 'bg-green-100 text-green-800',
    };
    
    return (
      <Badge className={`${roleConfig[role as keyof typeof roleConfig]} border-0`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500">No users match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getRoleBadge(user.role)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(user)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(user.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Step 2: Use Component in Page
```typescript
import UserTable from '@/components/UserTable';

export default function UserMasterPage() {
  const { users, loading, setSearch } = useUsers();
  
  const handleEdit = (user: UserMaster) => {
    // Handle edit
  };
  
  const handleDelete = (userId: string) => {
    // Handle delete
  };
  
  return (
    <div>
      <UserTable
        users={users}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSearch={setSearch}
      />
    </div>
  );
}
```

---

## Umrah Visa Booking System

### Overview
The Umrah Visa Booking system is a comprehensive multi-step booking flow that allows party users to submit Umrah visa applications with detailed passenger information, travel arrangements, and document uploads.

### Key Features
- **Dual Booking Modes**: Group number booking or travel documents booking
- **Multi-step Form**: 6-step progressive form with validation
- **Transport Management**: Route-based transport selection with dynamic pricing
- **Accommodation Options**: Hotel bookings or Iqama sponsor details
- **Passenger Management**: Support for 1-50 passengers with lead passenger designation
- **Document Uploads**: Passenger-specific document management
- **Real-time Validation**: Frontend and backend validation with Zod schemas

### Database Schema

#### Core Models
```prisma
enum BookingMode {
  group_number
  travel_documents
}

enum AccommodationType {
  hotel
  iqama
}

model UmrahVisaBooking {
  id                String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId         String              @unique @map("service_id") @db.Uuid
  bookingMode       BookingMode         @map("booking_mode")
  groupNumber       String?             @map("group_number") @db.VarChar(100)
  groupName         String?             @map("group_name") @db.VarChar(255)
  flightNumber      String              @map("flight_number") @db.VarChar(50)
  arrivalDate       DateTime            @map("arrival_date") @db.Date
  departureDate     DateTime            @map("departure_date") @db.Date
  arrivalAirport    String              @map("arrival_airport") @db.VarChar(100)
  transportRoute    String?             @map("transport_route") @db.VarChar(100)
  transportType     String?             @map("transport_type") @db.VarChar(50)
  transportPax      Int?                @map("transport_pax")
  transportPrice    Decimal?            @map("transport_price") @db.Decimal(10, 2)
  accommodationType AccommodationType   @map("accommodation_type")
  makkahCheckIn     DateTime?           @map("makkah_checkin") @db.Date
  makkahCheckOut    DateTime?           @map("makkah_checkout") @db.Date
  madinaCheckIn     DateTime?           @map("madina_checkin") @db.Date
  madinaCheckOut    DateTime?           @map("madina_checkout") @db.Date
  iqamaNumber       String?             @map("iqama_number") @db.VarChar(50)
  iqamaName         String?             @map("iqama_name") @db.VarChar(255)
  iqamaDob          DateTime?           @map("iqama_dob") @db.Date
  iqamaMobile       String?             @map("iqama_mobile") @db.VarChar(20)
  passengerCount    Int                 @map("passenger_count")
  status            UmrahVisaStatus     @default(pending)
  createdAt         DateTime            @default(now()) @map("created_at") @db.Timestamp
  updatedAt         DateTime            @default(now()) @updatedAt @map("updated_at") @db.Timestamp
  
  service           Service             @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  passengers        UmrahPassenger[]
  
  @@map("umrah_visa_bookings")
  @@index([serviceId])
  @@index([status])
}

model UmrahPassenger {
  id                String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  bookingId         String              @map("booking_id") @db.Uuid
  isLeadPassenger   Boolean             @default(false) @map("is_lead_passenger")
  fullName          String              @map("full_name") @db.VarChar(255)
  passportNumber    String              @map("passport_number") @db.VarChar(50)
  nationality       String              @db.VarChar(100)
  passportExpiry    DateTime            @map("passport_expiry") @db.Date
  dateOfBirth       DateTime            @map("date_of_birth") @db.Date
  gender            Gender
  phoneNumber       String?             @map("phone_number") @db.VarChar(20)
  createdAt         DateTime            @default(now()) @map("created_at") @db.Timestamp
  updatedAt         DateTime            @default(now()) @updatedAt @map("updated_at") @db.Timestamp
  
  booking           UmrahVisaBooking    @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  
  @@map("umrah_passengers")
  @@index([bookingId])
  @@index([isLeadPassenger])
}
```

#### Document Model Enhancement
```prisma
model Document {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  serviceId    String   @map("service_id") @db.Uuid
  passengerId  String?  @map("passenger_id") @db.Uuid  // New field for passenger-specific documents
  documentType String   @map("document_type") @db.VarChar(50)
  fileName     String   @map("file_name") @db.VarChar(255)
  filePath     String   @map("file_path") @db.VarChar(500)
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type") @db.VarChar(100)
  uploadedAt   DateTime @default(now()) @map("uploaded_at") @db.Timestamp
  
  service      Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  
  @@map("documents")
  @@index([serviceId])
  @@index([passengerId])  // New index for passenger documents
}
```

### Booking Flow Architecture

#### Step 1: Booking Mode Selection
- **Group Number Mode**: Requires group number and group name
- **Travel Documents Mode**: Requires individual passenger documents

#### Step 2: Travel Details
- Flight number (required)
- Arrival and departure dates (max 80 days apart)
- Arrival airport/route selection

#### Step 3: Transport Details (Conditional)
- Required for Jeddah-based routes
- Optional for other routes
- Dynamic pricing based on route, transport type, and PAX

#### Step 4: Accommodation Details
- **Hotel Option**: Makkah and Madina check-in/check-out dates
- **Iqama Option**: Sponsor details (iqama number, name, DOB, mobile)

#### Step 5: Passenger Information
- Passenger count (max 5 for iqama, unlimited for hotel)
- Individual passenger details for each passenger
- Exactly one lead passenger required

#### Step 6: Document Upload
- **Group Number Mode**: Only PAN card for lead passenger required
- **Travel Documents Mode**: Passport front/back for all passengers + PAN card for lead

### Configuration Files

#### Backend Configuration (`backend/src/config/umrahConfig.ts`)
```typescript
export const ROUTE_OPTIONS: RouteOption[] = [
  { id: 'jeddah_to_jeddah', name: 'Jeddah to Jeddah', requiresTransport: true },
  { id: 'jeddah_to_makkah', name: 'Jeddah to Makkah', requiresTransport: true },
  { id: 'makkah_to_jeddah', name: 'Makkah to Jeddah', requiresTransport: false },
  // ... other routes
];

export const TRANSPORT_OPTIONS: TransportOption[] = [
  { type: 'Lexus ES 250', paxOptions: [3], pricePerPax: { 3: 150 } },
  { type: 'Staria', paxOptions: [8], pricePerPax: { 8: 250 } },
  { type: 'GMC', paxOptions: [7], pricePerPax: { 7: 220 } },
  { type: 'Hiace', paxOptions: [10], pricePerPax: { 10: 350 } },
];

export const VALIDATION_RULES = {
  MAX_TRAVEL_DAYS: 80,
  MAX_PASSENGERS: 50,
  MAX_PASSENGERS_IQAMA: 5,
};
```

#### Frontend Configuration (`frontend/lib/umrahConstants.ts`)
```typescript
export const BOOKING_STEPS = [
  { id: 1, title: 'Booking Mode', description: 'Select booking type' },
  { id: 2, title: 'Travel Details', description: 'Flight and dates' },
  { id: 3, title: 'Transport', description: 'Transport arrangements' },
  { id: 4, title: 'Accommodation', description: 'Hotel or Iqama details' },
  { id: 5, title: 'Passengers', description: 'Passenger information' },
  { id: 6, title: 'Documents', description: 'Upload required documents' },
];
```

### API Endpoints

#### Booking Management
```typescript
// Create Umrah visa booking
POST /api/umrah-visa/booking
{
  "party_id": "uuid",
  "booking_mode": "group_number" | "travel_documents",
  "group_number": "string", // optional
  "group_name": "string", // optional
  "flight_number": "string",
  "arrival_date": "2024-01-01",
  "departure_date": "2024-01-10",
  "arrival_airport": "jeddah_to_makkah",
  "transport_route": "jeddah_to_makkah",
  "transport_type": "staria", // optional
  "transport_pax": 8, // optional
  "transport_price": 250, // optional
  "accommodation_type": "hotel" | "iqama",
  "makkah_checkin": "2024-01-01", // optional
  "makkah_checkout": "2024-01-05", // optional
  "madina_checkin": "2024-01-05", // optional
  "madina_checkout": "2024-01-10", // optional
  "iqama_number": "string", // optional
  "iqama_name": "string", // optional
  "iqama_dob": "2024-01-01", // optional
  "iqama_mobile": "string", // optional
  "passenger_count": 3,
  "passengers": [
    {
      "is_lead_passenger": true,
      "full_name": "John Doe",
      "passport_number": "A1234567",
      "nationality": "Indian",
      "passport_expiry": "2025-01-01",
      "date_of_birth": "1990-01-01",
      "gender": "male",
      "phone_number": "+1234567890"
    }
  ]
}

// Get transport pricing
GET /api/umrah-visa/transport-pricing?route=jeddah_to_makkah&transport_type=staria&pax=8

// Get party bookings
GET /api/umrah-visa/party-bookings?page=1&limit=10

// Get booking by ID
GET /api/umrah-visa/booking/:id

// Update booking status
PATCH /api/umrah-visa/booking/:id/status
{
  "status": "pending" | "processing" | "completed" | "cancelled"
}
```

#### Document Upload
```typescript
// Upload single document
POST /api/upload/service/:serviceId
Content-Type: multipart/form-data
{
  "document": File,
  "document_type": "pan_card" | "passport_front" | "passport_back",
  "passenger_id": "uuid" // optional
}

// Upload multiple passenger documents
POST /api/upload/booking/:bookingId/passenger/:passengerId
Content-Type: multipart/form-data
{
  "documents": File[],
  "document_types": ["passport_front", "passport_back"]
}
```

### Frontend Components

#### Main Booking Page (`frontend/app/party/umrah-visa/page.tsx`)
```typescript
export default function UmrahVisaPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [transportPrice, setTransportPrice] = useState<number | null>(null);
  const [documents, setDocuments] = useState<{ [passengerId: string]: File[] }>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UmrahVisaBookingFormData>({
    resolver: zodResolver(umrahVisaBookingSchema),
    defaultValues: {
      bookingMode: 'group_number',
      accommodationType: 'hotel',
      passengerCount: 1,
      passengers: [{
        isLeadPassenger: true,
        fullName: '',
        passportNumber: '',
        nationality: '',
        passportExpiry: '',
        dateOfBirth: '',
        gender: 'male',
        phoneNumber: ''
      }]
    }
  });

  // Step navigation logic
  const nextStep = () => {
    if (currentStep < BOOKING_STEPS.length) {
      setCurrentStep(currentStep + 1);
      setCompletedSteps([...completedSteps, currentStep]);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Transport price calculation
  const calculateTransportPrice = async (route: string, transportType: string, pax: number) => {
    try {
      const transport = TRANSPORT_OPTIONS.find(t => t.id === transportType);
      if (!transport || !transport.paxOptions.includes(pax)) {
        setTransportPrice(null);
        return;
      }
      
      const response = await umrahVisaAPI.getTransportPricing(route, transportType, pax);
      setTransportPrice(response.data.price);
    } catch (error) {
      console.error('Error calculating transport price:', error);
      setTransportPrice(null);
    }
  };

  // Form submission
  const onSubmit = async (data: UmrahVisaBookingFormData) => {
    try {
      const bookingData: CreateUmrahVisaBookingRequest = {
        party_id: partyId,
        booking_mode: data.bookingMode,
        // ... transform form data
      };

      const response = await umrahVisaAPI.createBooking(bookingData);
      const booking = response.data.booking;

      toast.success('Umrah visa booking submitted successfully!');
      router.push('/party/dashboard');

      // Background document uploads
      setTimeout(async () => {
        // Upload documents for each passenger
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit booking');
    }
  };
}
```

### Validation Schemas

#### Frontend Validation (`frontend/lib/umrahValidation.ts`)
```typescript
export const umrahVisaBookingSchema = z.object({
  // Step 1
  bookingMode: z.enum(['group_number', 'travel_documents']),
  
  // Step 2
  groupNumber: z.string().optional(),
  groupName: z.string().optional(),
  flightNumber: z.string().min(1, 'Flight number is required'),
  arrivalDate: z.string().min(1, 'Arrival date is required'),
  departureDate: z.string().min(1, 'Departure date is required'),
  arrivalAirport: z.string().min(1, 'Please select arrival airport/route'),
  
  // Step 3
  transportType: z.string().optional(),
  transportPax: z.number().optional(),
  transportPrice: z.number().optional(),
  
  // Step 4
  accommodationType: z.enum(['hotel', 'iqama']),
  makkahCheckIn: z.string().optional(),
  makkahCheckOut: z.string().optional(),
  madinaCheckIn: z.string().optional(),
  madinaCheckOut: z.string().optional(),
  iqamaNumber: z.string().optional(),
  iqamaName: z.string().optional(),
  iqamaDob: z.string().optional(),
  iqamaMobile: z.string().optional(),
  
  // Step 5
  passengerCount: z.number().min(1).max(VALIDATION_RULES.MAX_PASSENGERS),
  passengers: z.array(passengerSchema).min(1)
}).refine((data) => {
  // Cross-field validation logic
  if (data.bookingMode === 'group_number') {
    return data.groupNumber && data.groupName;
  }
  return true;
}, {
  message: 'Group number and group name are required for group booking mode',
  path: ['groupNumber']
}).refine((data) => {
  // Date validation
  const arrival = new Date(data.arrivalDate);
  const departure = new Date(data.departureDate);
  const diffTime = departure.getTime() - arrival.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= VALIDATION_RULES.MAX_TRAVEL_DAYS && diffDays > 0;
}, {
  message: `Travel duration cannot exceed ${VALIDATION_RULES.MAX_TRAVEL_DAYS} days`,
  path: ['departureDate']
});
```

### Business Logic

#### Transport Pricing Logic
```typescript
export function getTransportPrice(routeId: string, transportId: string, pax: number): number | null {
  const routePricing = TRANSPORT_PRICING[routeId];
  if (!routePricing) return null;
  
  const transportPricing = routePricing[transportId];
  if (!transportPricing) return null;
  
  return transportPricing[pax] || null;
}

export function requiresTransport(routeId: string): boolean {
  const route = getRouteById(routeId);
  return route?.requiresTransport || false;
}
```

#### Passenger Validation Logic
```typescript
export function validatePassengerCount(count: number, accommodationType: AccommodationType): boolean {
  if (accommodationType === 'iqama') {
    return count <= VALIDATION_RULES.MAX_PASSENGERS_IQAMA;
  }
  return count <= VALIDATION_RULES.MAX_PASSENGERS;
}

export function validateTravelDates(arrival: Date, departure: Date): boolean {
  const diffTime = departure.getTime() - arrival.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= VALIDATION_RULES.MAX_TRAVEL_DAYS && diffDays > 0;
}
```

### Error Handling

#### Common Error Scenarios
1. **Validation Errors**: Form validation failures
2. **Transport Pricing Errors**: Invalid route/transport/pax combinations
3. **Document Upload Errors**: File upload failures
4. **Database Errors**: Transaction failures
5. **Authentication Errors**: Unauthorized access

#### Error Recovery
```typescript
// Frontend error handling
try {
  const response = await umrahVisaAPI.createBooking(bookingData);
  // Success handling
} catch (error: any) {
  if (error.response?.status === 201) {
    // Handle success that was treated as error
    toast.success('Umrah visa booking submitted successfully!');
    router.push('/party/dashboard');
  } else {
    toast.error(error.response?.data?.error || 'Failed to submit booking');
  }
}

// Backend error handling
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({ 
    error: 'Validation failed', 
    details: errors.array() 
  });
}
```

### Performance Optimizations

#### Frontend Optimizations
- **Lazy Loading**: Components loaded on demand
- **Background Uploads**: Non-blocking document uploads
- **Form State Management**: Efficient state updates
- **Validation Caching**: Cached validation results

#### Backend Optimizations
- **Database Transactions**: Atomic operations
- **Indexed Queries**: Optimized database queries
- **Connection Pooling**: Efficient database connections
- **Error Handling**: Graceful error recovery

### Security Considerations

#### Input Validation
- **Frontend**: Zod schema validation
- **Backend**: express-validator middleware
- **Database**: Prisma type safety

#### File Upload Security
- **File Type Validation**: MIME type checking
- **File Size Limits**: Configurable size limits
- **Path Sanitization**: Secure file paths
- **Access Control**: User-based access

#### Data Protection
- **Encryption**: Sensitive data encryption
- **Access Logs**: Audit trail maintenance
- **Role-Based Access**: Permission-based access
- **Input Sanitization**: XSS prevention

### Testing Strategy

#### Unit Tests
- **Validation Logic**: Schema validation tests
- **Business Logic**: Pricing and validation functions
- **API Endpoints**: Route handler tests
- **Database Operations**: Prisma operation tests

#### Integration Tests
- **End-to-End Flow**: Complete booking flow
- **API Integration**: Frontend-backend communication
- **Database Integration**: Transaction testing
- **File Upload Testing**: Document upload flow

#### Manual Testing
- **User Experience**: Step-by-step flow testing
- **Error Scenarios**: Error handling validation
- **Performance Testing**: Load and stress testing
- **Security Testing**: Vulnerability assessment

### Deployment Considerations

#### Environment Configuration
```bash
# Backend environment variables
DATABASE_URL="postgresql://user:password@localhost:5432/moulavi_erp"
JWT_SECRET="your-jwt-secret"
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760" # 10MB

# Frontend environment variables
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
NEXT_PUBLIC_MAX_FILE_SIZE="10485760"
```

#### Database Migrations
```bash
# Run migrations
cd backend
npx prisma migrate dev --name add_umrah_visa_booking
npx prisma generate
npx prisma studio
```

#### File Storage
- **Local Storage**: Development environment
- **Cloud Storage**: Production environment (AWS S3, Google Cloud Storage)
- **Backup Strategy**: Regular backup procedures
- **Cleanup Policies**: Automated file cleanup

### Monitoring and Analytics

#### Key Metrics
- **Booking Success Rate**: Successful vs failed bookings
- **Step Completion Rate**: Drop-off analysis per step
- **Transport Selection**: Popular transport options
- **Document Upload Success**: Upload success rates
- **Performance Metrics**: Response times and error rates

#### Logging
```typescript
// Backend logging
console.log('Umrah visa booking created:', {
  bookingId: booking.id,
  partyId: booking.partyId,
  passengerCount: booking.passengerCount,
  bookingMode: booking.bookingMode
});

// Frontend logging
console.log('Booking step completed:', {
  step: currentStep,
  stepName: BOOKING_STEPS[currentStep - 1].title,
  timestamp: new Date().toISOString()
});
```

### Future Enhancements

#### Planned Features
- **Payment Integration**: Online payment processing
- **SMS Notifications**: Real-time status updates
- **WhatsApp Integration**: Automated messaging
- **Advanced Analytics**: Booking insights and reports
- **Mobile App**: Native mobile application
- **Multi-language Support**: Internationalization
- **API Rate Limiting**: Enhanced security
- **Caching Layer**: Redis integration
- **Real-time Updates**: WebSocket integration

#### Technical Improvements
- **Microservices Architecture**: Service decomposition
- **Event-Driven Architecture**: Asynchronous processing
- **Advanced Caching**: Redis and CDN integration
- **Performance Monitoring**: APM integration
- **Automated Testing**: CI/CD pipeline
- **Containerization**: Docker deployment
- **Load Balancing**: Horizontal scaling
- **Database Optimization**: Query optimization

---

## Common Issues & Solutions

### 1. Infinite Loading Loops

**Problem**: Component keeps re-rendering and making API calls
```typescript
// ❌ BAD - Creates infinite loop
const [users, setUsers] = useState([]);

useEffect(() => {
  const loadUsers = async () => {
    const response = await userAPI.getAll();
    setUsers(response.data.users);
  };
  
  loadUsers();
}, []); // Missing dependencies
```

**Solution**: Use useCallback and proper dependencies
```typescript
// ✅ GOOD - Prevents infinite loop
const [users, setUsers] = useState([]);
const [search, setSearch] = useState('');

const loadUsers = useCallback(async () => {
  try {
    const response = await userAPI.getAll({ search });
    setUsers(response.data.users);
  } catch (error) {
    console.error('Error loading users:', error);
    setUsers([]);
  }
}, [search]); // Only recreate when search changes

useEffect(() => {
  loadUsers();
}, [loadUsers]);
```

### 2. Data Not Appearing After Fetch

**Problem**: API call succeeds but data doesn't show in UI
```typescript
// ❌ BAD - No error handling
const loadUsers = async () => {
  const response = await userAPI.getAll();
  setUsers(response.data.users);
};
```

**Solution**: Add proper error handling and loading states
```typescript
// ✅ GOOD - Proper error handling
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

const loadUsers = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await userAPI.getAll();
    setUsers(response.data.users);
  } catch (error) {
    console.error('Error loading users:', error);
    setError('Failed to load users');
    setUsers([]);
  } finally {
    setLoading(false);
  }
};
```

### 3. Authentication Issues

**Problem**: Users can access pages they shouldn't
```typescript
// ❌ BAD - No auth check
export default function AdminPage() {
  return <div>Admin content</div>;
}
```

**Solution**: Always check authentication and authorization
```typescript
// ✅ GOOD - Proper auth check
export default function AdminPage() {
  const user = getUser();
  const router = useRouter();
  
  useEffect(() => {
    if (!user || !hasRole(['admin'])) {
      router.push('/auth');
      return;
    }
  }, [user, router]);
  
  if (!user) {
    return null; // Prevent flash of content
  }
  
  return <div>Admin content</div>;
}
```

### 4. CORS Problems

**Problem**: Frontend can't access backend API
```typescript
// ❌ BAD - No CORS configuration
const app = express();
```

**Solution**: Configure CORS properly
```typescript
// ✅ GOOD - Proper CORS configuration
import cors from 'cors';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
```

### 5. Type Mismatches

**Problem**: TypeScript errors due to type mismatches
```typescript
// ❌ BAD - Type mismatch
interface User {
  id: string;
  name: string;
}

const user: User = {
  id: 123, // Error: number not assignable to string
  name: 'John'
};
```

**Solution**: Use proper types and type guards
```typescript
// ✅ GOOD - Proper typing
interface User {
  id: string;
  name: string;
}

const user: User = {
  id: '123',
  name: 'John'
};

// Type guard for API responses
const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
};
```

### 6. Database Query Issues

**Problem**: Slow or incorrect database queries
```typescript
// ❌ BAD - N+1 query problem
const users = await prisma.user.findMany();
for (const user of users) {
  const party = await prisma.party.findUnique({
    where: { userId: user.id }
  });
}
```

**Solution**: Use include to fetch related data
```typescript
// ✅ GOOD - Single query with includes
const users = await prisma.user.findMany({
  include: {
    party: true
  }
});
```

---

## Code Conventions & Best Practices

### Naming Conventions

**Files and Directories:**
- Use kebab-case for directories: `user-master/`
- Use PascalCase for React components: `UserTable.tsx`
- Use camelCase for utility files: `apiUtils.ts`

**Variables and Functions:**
- Use camelCase for variables: `userName`, `isLoading`
- Use PascalCase for React components: `UserTable`
- Use UPPER_CASE for constants: `API_BASE_URL`

**Database:**
- Use snake_case for database columns: `user_id`, `created_at`
- Use PascalCase for Prisma models: `UserMaster`
- Use camelCase for Prisma fields: `userId`, `createdAt`

### File Organization

**Component Structure:**
```
components/
├── ui/                 # Base UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   ├── badge.tsx
│   ├── select.tsx
│   ├── sheet.tsx      # Use for dialogs/modals
│   └── label.tsx
├── forms/             # Form components
├── tables/            # Table components
├── dialogs/           # Dialog components (use Sheet for modals)
└── layout/            # Layout components
```

**Page Structure:**
```
app/
├── auth/              # Authentication pages
├── dashboard/         # Admin/staff pages
│   ├── masters/      # Master data pages
│   └── services/     # Service pages
└── party/            # Party user pages
```

### TypeScript Typing

**Interface Definitions:**
```typescript
// Use interfaces for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// Use types for unions and primitives
type UserRole = 'admin' | 'staff' | 'party';
type Status = 'pending' | 'approved' | 'rejected';
```

**API Response Typing:**
```typescript
// Define API response types
interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Error Handling Patterns

**Backend Error Handling:**
```typescript
// Use asyncHandler for route handlers
router.get('/', asyncHandler(async (req, res) => {
  try {
    const data = await prisma.model.findMany();
    res.json({ data });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}));
```

**Frontend Error Handling:**
```typescript
// Use try-catch in async functions
const loadData = async () => {
  try {
    const response = await api.get('/endpoint');
    setData(response.data);
  } catch (error) {
    console.error('API error:', error);
    toast.error('Failed to load data');
  }
};
```

### Security Considerations

**Input Validation:**
```typescript
// Always validate input on backend
const validation = [
  body('email').isEmail().normalizeEmail(),
  body('name').isString().notEmpty().trim(),
];
```

**Authentication Checks:**
```typescript
// Always check authentication
router.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  // Route logic
}));
```

**SQL Injection Prevention:**
```typescript
// Use Prisma ORM, never raw SQL
// ❌ BAD
const users = await query(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ GOOD
const users = await prisma.user.findMany({
  where: { email }
});
```

---

## Testing & Debugging

### Backend API Testing

**Using Postman/Insomnia:**
1. Set up environment variables
2. Create authentication request
3. Save access token
4. Use token in subsequent requests

**Testing Authentication:**
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Use token
curl -X GET http://localhost:5000/api/parties \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Frontend Debugging

**React DevTools:**
- Install React Developer Tools browser extension
- Use Components tab to inspect component state
- Use Profiler tab to identify performance issues

**Console Debugging:**
```typescript
// Add debug logs
console.log('Component rendered with props:', props);
console.log('API response:', response.data);
console.log('Error details:', error);
```

**Network Tab:**
- Check API requests in browser DevTools
- Verify request headers and payloads
- Check response status and data

### Database Query Debugging

**Prisma Studio:**
```bash
cd backend
npx prisma studio
```

**Query Logging:**
```typescript
// Enable query logging in development
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

**Common Query Issues:**
```typescript
// Check for N+1 queries
const users = await prisma.user.findMany({
  include: {
    party: true // This prevents N+1 queries
  }
});

// Use select to limit fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
});
```

### Common Error Messages & Fixes

**"Cannot read property 'map' of undefined"**
```typescript
// ❌ BAD
{users.map(user => <div key={user.id}>{user.name}</div>)}

// ✅ GOOD
{users?.map(user => <div key={user.id}>{user.name}</div>)}
```

**"TypeError: Cannot read property 'data' of undefined"**
```typescript
// ❌ BAD
const data = response.data.users;

// ✅ GOOD
const data = response?.data?.users || [];
```

**"Element type is invalid: expected a string but got: undefined"**
```typescript
// ❌ BAD - Wrong import path
import { Dialog, DialogContent } from '@/components/ui/sheet';

// ✅ GOOD - Correct import path
import { Sheet, SheetContent } from '@/components/ui/sheet';
```

**"PrismaClientKnownRequestError"**
```typescript
// Check database connection
// Verify table exists
// Check field names match schema
// Verify you're not creating duplicate tables
```

**"Table already exists" or "Model already defined"**
```typescript
// ❌ BAD - Creating duplicate table
model UserMaster { ... }  // When User table already exists

// ✅ GOOD - Use existing table
model User { ... }  // Extend existing User model if needed
```

---

## Quick Reference

### API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

**Parties:**
- `GET /api/parties` - Get all parties
- `POST /api/parties` - Create party
- `GET /api/parties/:id` - Get party by ID
- `PUT /api/parties/:id` - Update party
- `DELETE /api/parties/:id` - Delete party

**Services:**
- `GET /api/services` - Get all services
- `POST /api/services/umrah-visa` - Create Umrah visa service
- `GET /api/services/:id` - Get service by ID
- `PATCH /api/services/:id/status` - Update service status

**Umrah Visa Booking:**
- `POST /api/umrah-visa/booking` - Create Umrah visa booking
- `GET /api/umrah-visa/bookings` - Get all bookings (admin/staff)
- `GET /api/umrah-visa/party-bookings` - Get party's bookings
- `GET /api/umrah-visa/booking/:id` - Get booking by ID
- `PATCH /api/umrah-visa/booking/:id/status` - Update booking status
- `GET /api/umrah-visa/transport-pricing` - Get transport pricing

**Uploads:**
- `POST /api/upload/service/:id` - Upload document
- `POST /api/upload/booking/:bookingId/passenger/:passengerId` - Upload passenger documents
- `DELETE /api/upload/:id` - Delete document

### Component Library

**UI Components (shadcn/ui):**
- `Button` - Button component with variants
- `Input` - Input field component
- `Card` - Card container component
- `Badge` - Badge component
- `Select` - Select dropdown component
- `Sheet` - Sidebar/modal component (use for dialogs/modals)
- `Label` - Form label component

**Custom Components:**
- `Sidebar` - Navigation sidebar
- `PartyTable` - Party data table
- `CreatePartyDialog` - Party creation dialog
- `PartyStatsCards` - Statistics cards

### Utility Functions

**Authentication:**
```typescript
getUser() // Get current user from localStorage
setUser(user) // Set user in localStorage
removeUser() // Remove user from localStorage
hasRole(role) // Check if user has specific role
isAuthenticated() // Check if user is logged in
```

**API Client:**
```typescript
authAPI.login(email, password) // Login user
authAPI.logout(refreshToken) // Logout user
authAPI.getMe() // Get current user
partyAPI.getAll(params) // Get all parties
partyAPI.create(data) // Create party
serviceAPI.getUmrahVisas(params) // Get Umrah visas
```

### Type Definitions

**Core Types:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'party';
}

interface Party {
  id: string;
  partyName: string;
  email: string;
  customerType: 'direct' | 'b2b';
  accountCurrency: 'SAR' | 'INR' | 'AED';
}

interface Service {
  id: string;
  serviceType: string;
  partyId: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
}

interface UmrahVisaBooking {
  id: string;
  serviceId: string;
  bookingMode: 'group_number' | 'travel_documents';
  groupNumber?: string;
  groupName?: string;
  flightNumber: string;
  arrivalDate: string;
  departureDate: string;
  arrivalAirport: string;
  transportRoute?: string;
  transportType?: string;
  transportPax?: number;
  transportPrice?: number;
  accommodationType: 'hotel' | 'iqama';
  makkahCheckIn?: string;
  makkahCheckOut?: string;
  madinaCheckIn?: string;
  madinaCheckOut?: string;
  iqamaNumber?: string;
  iqamaName?: string;
  iqamaDob?: string;
  iqamaMobile?: string;
  passengerCount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  passengers: UmrahPassenger[];
}

interface UmrahPassenger {
  id: string;
  bookingId: string;
  isLeadPassenger: boolean;
  fullName: string;
  passportNumber: string;
  nationality: string;
  passportExpiry: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Environment Variables

**Backend (.env):**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/moulavi_erp"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
PORT="5000"
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL="http://localhost:5000/api"
```

### Common Commands

**Backend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npx prisma migrate dev --name migration_name  # Run migration
npx prisma studio    # Open Prisma Studio
npx prisma generate  # Generate Prisma client
```

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Schema Quick Reference

**Users Table:**
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255))
- `email` (VARCHAR(255), Unique)
- `password` (VARCHAR(255))
- `role` (ENUM: admin, staff, party)
- `is_active` (BOOLEAN, Default: true)

**Parties Table:**
- `id` (UUID, Primary Key)
- `party_name` (VARCHAR(255))
- `email` (VARCHAR(255), Unique)
- `contact_number` (VARCHAR(20))
- `whatsapp_number` (VARCHAR(20))
- `customer_type` (ENUM: direct, b2b)
- `account_currency` (ENUM: SAR, INR, AED)
- `is_supplier` (BOOLEAN, Default: false)
- `is_customer` (BOOLEAN, Default: true)

**Services Table:**
- `id` (UUID, Primary Key)
- `service_type` (VARCHAR(50))
- `party_id` (UUID, Foreign Key)
- `status` (ENUM: pending, processing, completed, cancelled)
- `submitted_at` (TIMESTAMP)

**Umrah Visa Bookings Table:**
- `id` (UUID, Primary Key)
- `service_id` (UUID, Foreign Key, Unique)
- `booking_mode` (ENUM: group_number, travel_documents)
- `group_number` (VARCHAR(100), Optional)
- `group_name` (VARCHAR(255), Optional)
- `flight_number` (VARCHAR(50))
- `arrival_date` (DATE)
- `departure_date` (DATE)
- `arrival_airport` (VARCHAR(100))
- `transport_route` (VARCHAR(100), Optional)
- `transport_type` (VARCHAR(50), Optional)
- `transport_pax` (INT, Optional)
- `transport_price` (DECIMAL(10,2), Optional)
- `accommodation_type` (ENUM: hotel, iqama)
- `makkah_checkin` (DATE, Optional)
- `makkah_checkout` (DATE, Optional)
- `madina_checkin` (DATE, Optional)
- `madina_checkout` (DATE, Optional)
- `iqama_number` (VARCHAR(50), Optional)
- `iqama_name` (VARCHAR(255), Optional)
- `iqama_dob` (DATE, Optional)
- `iqama_mobile` (VARCHAR(20), Optional)
- `passenger_count` (INT)
- `status` (ENUM: pending, processing, completed, cancelled)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Umrah Passengers Table:**
- `id` (UUID, Primary Key)
- `booking_id` (UUID, Foreign Key)
- `is_lead_passenger` (BOOLEAN, Default: false)
- `full_name` (VARCHAR(255))
- `passport_number` (VARCHAR(50))
- `nationality` (VARCHAR(100))
- `passport_expiry` (DATE)
- `date_of_birth` (DATE)
- `gender` (ENUM: male, female)
- `phone_number` (VARCHAR(20), Optional)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

---

This documentation provides a comprehensive guide for AI assistants to understand and work with the Moulavi ERP codebase efficiently. It covers all major aspects of the system, common patterns, best practices, and step-by-step implementation guides for common tasks.
