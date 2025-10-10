# Cursor AI Documentation - Moulavi ERP System

## Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema & Data Access](#database-schema--data-access)
3. [Backend API Patterns](#backend-api-patterns)
4. [Frontend Architecture](#frontend-architecture)
5. [Step-by-Step Implementation Guides](#step-by-step-implementation-guides)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Code Conventions & Best Practices](#code-conventions--best-practices)
8. [Testing & Debugging](#testing--debugging)
9. [Quick Reference](#quick-reference)

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

**Uploads:**
- `POST /api/upload/service/:id` - Upload document
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

---

This documentation provides a comprehensive guide for AI assistants to understand and work with the Moulavi ERP codebase efficiently. It covers all major aspects of the system, common patterns, best practices, and step-by-step implementation guides for common tasks.
