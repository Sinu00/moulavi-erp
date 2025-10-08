# Changelog

All notable changes to the Moulavi ERP system will be documented in this file.

## [1.0.0] - 2025-10-08

### Added

#### Backend
- **Authentication System**
  - JWT-based authentication with access and refresh tokens
  - Password hashing with bcrypt
  - Role-based access control (Admin, Staff, Party)
  - Login, logout, and token refresh endpoints

- **Party Management**
  - Create, read, update, and delete parties
  - Multi-currency support (SAR, INR, AED)
  - Customer type classification (Direct, B2B)
  - Automatic user account creation with email credentials
  - Search and filter capabilities
  - Pagination support

- **Service Management**
  - Umrah visa application processing
  - Service status tracking (Pending, Processing, Completed, Cancelled)
  - Party-specific service access
  - Detailed visa information storage

- **Document Management**
  - File upload for services (images, PDFs)
  - Document type classification
  - Download and delete functionality
  - File size and type validation

- **Email Service**
  - Automated credential delivery for new parties
  - Service confirmation emails
  - Nodemailer integration with SMTP

- **Security Features**
  - Helmet.js for secure HTTP headers
  - CORS configuration
  - Rate limiting (100 requests per 15 minutes)
  - Input validation and sanitization
  - SQL injection prevention with parameterized queries

- **Database**
  - PostgreSQL schema with normalized tables
  - Foreign key constraints
  - Indexes for performance
  - Automated timestamp updates
  - Migration scripts

#### Frontend
- **UI Components**
  - shadcn/ui component library integration
  - Responsive design with Tailwind CSS
  - Modern, professional interface
  - Toast notifications with Sonner

- **Authentication Pages**
  - Separate login pages for Admin/Staff and Party
  - Form validation with zod
  - Token management
  - Auto-redirect on authentication

- **Admin/Staff Dashboard**
  - Statistics overview (parties, services)
  - Party management interface
  - Party creation with modal dialog
  - Search and filter functionality
  - Pagination

- **Party Dashboard**
  - Service statistics overview
  - Available services display
  - Service request history
  - Status tracking

- **Umrah Visa Application**
  - Comprehensive form with validation
  - Personal information section
  - Passport information section
  - Travel information section
  - Document upload capability

- **Navigation**
  - Responsive navbar with user info
  - Role-based navigation
  - Logout functionality

#### Documentation
- Comprehensive README with setup instructions
- Detailed SETUP_GUIDE with step-by-step instructions
- ARCHITECTURE documentation
- Backend and Frontend specific READs
- API documentation
- Database schema documentation

### Security
- Password hashing with bcrypt (10 rounds)
- JWT token expiration (1 hour for access, 7 days for refresh)
- Secure token storage
- Protected routes with middleware
- HTTPS-ready configuration

### Performance
- Database connection pooling
- Optimized queries with indexes
- Pagination for large datasets
- Debounced search inputs
- Code splitting in frontend

## Future Enhancements

### Planned Features
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication (2FA)
- [ ] Advanced search filters
- [ ] Export data to Excel/PDF
- [ ] Dashboard analytics and charts
- [ ] Notification system
- [ ] Audit logging
- [ ] Payment integration
- [ ] Multi-language support
- [ ] Mobile app

### Technical Improvements
- [ ] Redis caching
- [ ] WebSocket for real-time updates
- [ ] GraphQL API option
- [ ] Automated testing suite
- [ ] CI/CD pipeline
- [ ] Docker containerization
- [ ] Kubernetes orchestration
- [ ] Monitoring with Prometheus/Grafana

---

**Note**: This project follows [Semantic Versioning](https://semver.org/).

