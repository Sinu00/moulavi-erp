# 🚀 Quick Start Guide - Moulavi ERP

Get your Moulavi ERP system up and running in minutes!

## ⚡ 5-Minute Setup

### Prerequisites Check
```bash
# Check if you have the required tools
node --version    # Should be v18+
psql --version    # Should be v14+
```

### Step 1: Install Root Dependencies (Optional)
```bash
# From project root - allows running both servers with one command
npm install
```

### Step 2: Database Setup
```bash
# Create database
createdb -U postgres moulavi_erp

# Or using psql
psql -U postgres
CREATE DATABASE moulavi_erp;
\q
```

### Step 3: Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and set your PostgreSQL password
# Minimum required:
# DB_PASSWORD=your_postgres_password

# Run migrations (creates tables and default admin)
npm run migrate

# Start backend
npm run dev
```

You should see: `🚀 Server is running on port 5000`

### Step 4: Frontend Setup
```bash
# Open NEW terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# Start frontend
npm run dev
```

You should see: `ready - started server on 0.0.0.0:3000`

### Step 5: Access the Application

1. **Open browser**: http://localhost:3000
2. **Login as Admin**:
   - Click "Admin Login"
   - Email: `admin@moulavi.com`
   - Password: `Admin@123`

**🎉 Congratulations! Your ERP system is running!**

---

## 📝 Next Steps

### 1. Create Your First Party (Client)
- Click "Add Party" button
- Fill in the details:
  - Party Name: `Test Company`
  - Email: `test@example.com`
  - Contact: `+91 1234567890`
  - Customer Type: `Direct`
  - Currency: `INR`
  - ✓ Check "Create login account for party"
- Click "Create Party"
- ✉️ Check email for party credentials

### 2. Test Party Login
- Logout from admin
- Go to "Party Login"
- Use credentials from email
- Explore party dashboard

### 3. Submit Umrah Visa Request
- Click "Apply Now" on Umrah Visa
- Fill all required fields
- Upload documents (optional)
- Submit application
- View in party dashboard

### 4. Process Request as Admin
- Login as admin again
- View the new service request
- Update status to "Processing"

---

## 🛠️ Common Commands

### Backend Commands
```bash
cd backend

# Development
npm run dev          # Start with auto-reload

# Database
npm run migrate      # Run migrations

# Production
npm run build        # Compile TypeScript
npm start           # Run production server
```

### Frontend Commands
```bash
cd frontend

# Development
npm run dev         # Start dev server

# Production
npm run build       # Build for production
npm start          # Run production build

# Other
npm run lint       # Check for errors
```

### Run Both Servers (from root)
```bash
# If you installed root dependencies
npm run dev        # Runs both backend and frontend
```

---

## 🔧 Configuration

### Minimum .env Configuration (Backend)

```env
# Database (REQUIRED)
DB_PASSWORD=your_postgres_password

# JWT Secrets (REQUIRED for production)
JWT_SECRET=your_long_random_string_min_32_chars
JWT_REFRESH_SECRET=another_long_random_string

# Email (Optional - for sending credentials)
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
```

### Generate JWT Secrets
```bash
# Quick method
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📧 Email Setup (Optional but Recommended)

### For Gmail:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Create password for "Mail"
5. Copy 16-character password
6. Add to `.env`:
   ```env
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

**Without email setup:** Party credentials won't be sent, but you can manually share them.

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Make sure PostgreSQL is running
# Windows: Check Services
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Verify database exists
psql -U postgres -l | grep moulavi_erp
```

### "Port 5000 already in use"
```bash
# Change in backend/.env
PORT=5001

# Update in frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### "Module not found"
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "Migration failed"
```bash
# Drop and recreate database
dropdb -U postgres moulavi_erp
createdb -U postgres moulavi_erp
npm run migrate
```

---

## 📚 Learn More

- **Full Documentation**: See [README.md](README.md)
- **Detailed Setup**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **API Reference**: See [API_REFERENCE.md](API_REFERENCE.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Project Summary**: See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

## 🎯 Default Accounts

### Admin Account
- **Email**: admin@moulavi.com
- **Password**: Admin@123
- **Role**: Admin (full access)

⚠️ **Change this password in production!**

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:3000
- [ ] Can login as admin
- [ ] Can create a party
- [ ] Can login as party (if email configured)
- [ ] Can submit Umrah visa request
- [ ] Can view service in admin dashboard

---

## 💡 Tips

1. **Keep both terminals open** - one for backend, one for frontend
2. **Check console for errors** - both browser and terminals
3. **Use Postman** - to test API directly if needed
4. **Check database** - use `psql` or pgAdmin to view data
5. **Read the logs** - helpful error messages in both servers

---

## 🚀 Ready for Production?

Before deploying to production:

1. **Security**:
   - [ ] Change admin password
   - [ ] Set strong JWT secrets
   - [ ] Configure production SMTP
   - [ ] Enable HTTPS

2. **Database**:
   - [ ] Use managed PostgreSQL
   - [ ] Set up backups
   - [ ] Enable SSL connections

3. **Deployment**:
   - [ ] Build both backend and frontend
   - [ ] Set environment variables
   - [ ] Configure domain and DNS
   - [ ] Set up monitoring

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for production deployment details.

---

## 🆘 Need Help?

- **Check Documentation**: All markdown files in project root
- **Review Code**: Well-commented and organized
- **Check Console**: Error messages are descriptive
- **Database Issues**: Use `psql` to inspect

---

**Happy Building! 🎉**

Your Moulavi ERP system is ready to manage Umrah visa bookings efficiently!

