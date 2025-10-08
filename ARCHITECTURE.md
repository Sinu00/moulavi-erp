# Moulavi ERP - System Architecture

## Overview

The Moulavi ERP system follows a modern client-server architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Public Pages │  │ Admin Pages  │  │ Party Pages  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │   API Client    │                        │
│                   │   (Axios)       │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼──────────────────────────────────┘
                             │
                    HTTP/REST API (JSON)
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                   Backend (Express.js)                         │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                  Middleware Layer                     │    │
│  │  • CORS  • Helmet  • Rate Limiting  • Auth (JWT)     │    │
│  └──────────────────────────────────────────────────────┘    │
│                             │                                 │
│  ┌──────────────────────────┴──────────────────────────┐    │
│  │                   API Routes                         │    │
│  │  • /auth  • /parties  • /services  • /upload        │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                                 │
│  ┌──────────────────────────┴──────────────────────────┐    │
│  │                Business Logic Layer                  │    │
│  │  • Validation  • Authorization  • Email Service     │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                                 │
│  ┌──────────────────────────┴──────────────────────────┐    │
│  │              Database Access Layer                   │    │
│  │         (pg - PostgreSQL Driver)                     │    │
│  └──────────────────────────┬──────────────────────────┘    │
└─────────────────────────────┼─────────────────────────────────┘
                              │
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                    PostgreSQL Database                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Users   │  │ Parties  │  │ Services │  │Documents │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└───────────────────────────────────────────────────────────────┘
```

## Technology Stack Details

### Frontend Layer

**Next.js 14 (App Router)**
- Server and client components
- File-based routing
- Middleware for route protection
- API route handlers for server-side logic

**UI & Styling**
- shadcn/ui: Reusable, accessible components
- Tailwind CSS: Utility-first styling
- Radix UI: Headless UI primitives

**State Management**
- React hooks for local state
- Axios interceptors for global auth state
- LocalStorage for token persistence

**Form Handling**
- react-hook-form: Performance-optimized forms
- zod: Schema validation
- Type-safe form data

### Backend Layer

**Express.js Framework**
- RESTful API design
- Middleware-based architecture
- Async/await error handling

**Security Middleware**
- Helmet.js: Security headers
- CORS: Cross-origin resource sharing
- express-rate-limit: DDoS protection
- express-validator: Input validation

**Authentication & Authorization**
- JWT: Stateless authentication
- Refresh tokens: Extended sessions
- Role-based access control (RBAC)
- bcrypt: Password hashing

**File Management**
- Multer: File upload handling
- Type validation and size limits
- Organized file storage

### Database Layer

**PostgreSQL**
- ACID compliance
- Referential integrity
- Full-text search capabilities
- JSONB for flexible data

**Schema Design**
- Normalized tables
- Foreign key constraints
- Indexes for performance
- Triggers for auto-updates

## Data Flow

### User Authentication Flow

```
1. User enters credentials
   ↓
2. Frontend validates input (zod)
   ↓
3. API request to /auth/login
   ↓
4. Backend validates credentials
   ↓
5. bcrypt compares password hash
   ↓
6. Generate JWT tokens (access + refresh)
   ↓
7. Store refresh token in database
   ↓
8. Return tokens to client
   ↓
9. Frontend stores in localStorage
   ↓
10. Redirect to dashboard
```

### Service Request Flow

```
1. Party fills Umrah visa form
   ↓
2. Frontend validates (react-hook-form + zod)
   ↓
3. API request to /services/umrah-visa
   ↓
4. Backend validates JWT token
   ↓
5. Check user permissions
   ↓
6. Validate form data (express-validator)
   ↓
7. Create service record in database
   ↓
8. Create umrah_visa_details record
   ↓
9. Upload documents (if any)
   ↓
10. Send confirmation email
   ↓
11. Return success response
   ↓
12. Frontend shows success toast
   ↓
13. Redirect to dashboard
```

## Security Architecture

### Authentication Security

1. **Password Security**
   - bcrypt hashing (10 rounds)
   - Salting for uniqueness
   - Never store plain text

2. **Token Security**
   - Short-lived access tokens (1 hour)
   - Long-lived refresh tokens (7 days)
   - Refresh token rotation
   - Token blacklisting on logout

3. **Request Security**
   - HTTPS enforcement (production)
   - CSRF protection
   - Rate limiting (100 req/15min)
   - Input sanitization

### Authorization Model

**Role Hierarchy:**
```
Admin
  ├─ Full system access
  ├─ Manage parties
  ├─ Manage services
  ├─ Delete operations
  └─ View all data

Staff
  ├─ Manage parties (create, read, update)
  ├─ Manage services (read, update)
  └─ View assigned data

Party
  ├─ View own data only
  ├─ Create service requests
  └─ Upload documents
```

### Database Security

1. **Connection Security**
   - SSL/TLS for connections
   - Connection pooling
   - Timeout configurations

2. **Query Security**
   - Parameterized queries (prevent SQL injection)
   - Input validation
   - Type checking

3. **Data Security**
   - Foreign key constraints
   - Check constraints
   - Unique constraints

## Scalability Considerations

### Current Architecture

- **Vertical Scaling**: Increase server resources
- **Connection Pooling**: Efficient database connections
- **Stateless API**: Horizontal scaling ready

### Future Enhancements

1. **Caching Layer**
   - Redis for session management
   - Cache frequent queries
   - API response caching

2. **Load Balancing**
   - Multiple backend instances
   - Nginx reverse proxy
   - Session affinity

3. **Database Optimization**
   - Read replicas
   - Query optimization
   - Materialized views

4. **File Storage**
   - Move to S3/Cloud Storage
   - CDN for static assets
   - Image optimization

## API Design Principles

### RESTful Conventions

- **GET**: Retrieve resources
- **POST**: Create resources
- **PUT**: Update entire resource
- **PATCH**: Partial update
- **DELETE**: Remove resource

### Response Format

**Success Response:**
```json
{
  "data": {...},
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "details": {...}
}
```

### Status Codes

- **200**: OK
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Server Error

## Monitoring & Logging

### Application Logs

- Request/Response logging
- Error tracking
- Performance metrics

### Database Monitoring

- Query performance
- Connection pool stats
- Slow query log

### Security Monitoring

- Failed login attempts
- Token refresh patterns
- Unusual activity detection

## Deployment Architecture

### Development
```
Local Machine
├── Backend: http://localhost:5000
├── Frontend: http://localhost:3000
└── Database: localhost:5432
```

### Production (Recommended)
```
Cloud Infrastructure
├── Backend: AWS EC2 / Digital Ocean
│   ├── PM2 process manager
│   ├── Nginx reverse proxy
│   └── SSL certificate
├── Frontend: Vercel / Netlify
│   └── CDN distribution
└── Database: AWS RDS / Managed PostgreSQL
    ├── Automated backups
    ├── Multi-AZ deployment
    └── Read replicas
```

## Performance Optimization

### Backend

1. **Database Queries**
   - Use indexes effectively
   - Limit result sets
   - Avoid N+1 queries
   - Use connection pooling

2. **Response Optimization**
   - Compression (gzip)
   - Pagination
   - Field selection
   - Caching headers

### Frontend

1. **Code Splitting**
   - Route-based splitting
   - Component lazy loading
   - Dynamic imports

2. **Asset Optimization**
   - Image optimization
   - Minification
   - Tree shaking
   - Bundle analysis

3. **Performance Features**
   - Server-side rendering (SSR)
   - Static generation (SSG)
   - Incremental static regeneration (ISR)

## Testing Strategy

### Backend Testing
- Unit tests for utilities
- Integration tests for API
- Database migration tests

### Frontend Testing
- Component tests
- Integration tests
- E2E tests (Playwright/Cypress)

### Security Testing
- Penetration testing
- Vulnerability scanning
- Dependency auditing

---

This architecture provides a solid foundation for a scalable, secure, and maintainable ERP system.

