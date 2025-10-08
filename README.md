# Moulavi ERP System - Umrah Visa Booking Management

A comprehensive Enterprise Resource Planning (ERP) system designed for managing Umrah visa bookings, party (client) management, and service requests with role-based access control.

## 🎯 Features

- **Multi-Role Authentication**
  - Admin & Staff login
  - Party (client) login
  - JWT-based authentication with refresh tokens
  - Role-based access control

- **Party Management**
  - Create and manage client profiles
  - B2B and Direct customer types
  - Multi-currency support (SAR, INR, AED)
  - Automatic login credential generation
  - Email notifications

- **Service Management**
  - Umrah visa application processing
  - Document upload and management
  - Status tracking (Pending, Processing, Completed, Cancelled)
  - Service request history

- **Security**
  - Password hashing with bcrypt
  - JWT access and refresh tokens
  - Rate limiting
  - Helmet.js security headers
  - CORS configuration
  - Input validation and sanitization

## 📋 Tech Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Email**: Nodemailer
- **File Upload**: Multer
- **Validation**: express-validator
- **Security**: Helmet.js, CORS, express-rate-limit

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Form Handling**: react-hook-form + zod
- **HTTP Client**: Axios
- **Notifications**: Sonner

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your configuration**
   ```env
   # Server
   PORT=5000
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=moulavi_erp
   DB_USER=postgres
   DB_PASSWORD=your_password

   # JWT
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_change_this_in_production
   JWT_EXPIRES_IN=1h
   JWT_REFRESH_EXPIRES_IN=7d

   # Email
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

5. **Create PostgreSQL database**
   ```bash
   createdb moulavi_erp
   ```

6. **Run database migrations**
   ```bash
   npm run migrate
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Edit `.env.local` file**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## 📝 Default Credentials

After running the database migration, a default admin account is created:

- **Email**: `admin@moulavi.com`
- **Password**: `Admin@123`

⚠️ **Important**: Change these credentials in production!

## 🗄️ Database Schema

### Users Table
- Stores all user accounts (admin, staff, party)
- Password hashing with bcrypt
- Role-based access control

### Parties Table
- Client/customer information
- Linked to user accounts (if login required)
- Multi-currency and customer type support

### Services Table
- Service requests (Umrah visa, etc.)
- Status tracking
- Linked to parties

### Umrah Visa Details Table
- Detailed information for Umrah visa applications
- Personal, passport, and travel information

### Documents Table
- File uploads for services
- Document type classification

### Refresh Tokens Table
- JWT refresh token management
- Token expiry tracking

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout
- `GET /me` - Get current user

### Party Management (`/api/parties`)
- `POST /` - Create new party (Admin/Staff only)
- `GET /` - Get all parties with filters (Admin/Staff only)
- `GET /:id` - Get party by ID (Admin/Staff only)
- `PUT /:id` - Update party (Admin/Staff only)
- `DELETE /:id` - Delete party (Admin only)

### Service Management (`/api/services`)
- `POST /umrah-visa` - Create Umrah visa request
- `GET /` - Get all services (filtered by role)
- `GET /:id` - Get service details
- `PATCH /:id/status` - Update service status (Admin/Staff only)

### File Upload (`/api/upload`)
- `POST /service/:serviceId` - Upload document for service
- `GET /:documentId` - Download document
- `DELETE /:documentId` - Delete document

## 🎨 Frontend Routes

### Public Routes
- `/` - Home page
- `/auth` - Admin & Staff login
- `/party-auth` - Party login

### Admin/Staff Routes (Protected)
- `/dashboard` - Admin/Staff dashboard with party management

### Party Routes (Protected)
- `/party/dashboard` - Party dashboard with services
- `/party/umrah-visa` - Umrah visa application form

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Password Policy**: Enforce strong passwords
3. **JWT Secrets**: Use strong, random secrets in production
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Configured to prevent abuse
6. **Input Validation**: All inputs are validated and sanitized
7. **SQL Injection**: Using parameterized queries
8. **CORS**: Properly configured for frontend domain

## 📧 Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `SMTP_PASSWORD`

## 🧪 Testing the System

1. **Start both backend and frontend**
2. **Login as admin** using default credentials
3. **Create a party** with login enabled
4. **Check email** for party credentials
5. **Login as party** and submit an Umrah visa request
6. **View request** in admin dashboard

## 📦 Project Structure

```
moulavi-erp/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── database/       # SQL schemas and migrations
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic (email, etc.)
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # Helper functions (JWT, password)
│   │   └── server.ts       # Main application entry
│   ├── uploads/            # File upload storage
│   └── package.json
├── frontend/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utilities (API client, auth)
│   └── package.json
├── context.txt           # Project specifications
└── README.md            # This file
```

## 🛠️ Development Scripts

### Backend
```bash
npm run dev      # Start development server with nodemon
npm run build    # Compile TypeScript to JavaScript
npm start        # Run production server
npm run migrate  # Run database migrations
```

### Frontend
```bash
npm run dev      # Start Next.js development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## 🚢 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper SMTP settings
4. Enable HTTPS
5. Set up proper CORS origins
6. Use a process manager (PM2)

### Frontend
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or similar
3. Update `NEXT_PUBLIC_API_URL` to production API

### Database
1. Use managed PostgreSQL (AWS RDS, Digital Ocean, etc.)
2. Enable SSL connections
3. Regular backups
4. Proper indexing for performance

## 📄 License

This project is proprietary software developed for Moulavi ERP System.

## 🤝 Support

For support and questions, please contact your system administrator.

---

**Built with ❤️ using Next.js, Express.js, and PostgreSQL**

