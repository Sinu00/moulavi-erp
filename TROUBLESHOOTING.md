# 🔧 Troubleshooting Guide - Moulavi ERP

Common issues and their solutions during development and testing.

---

## 🚨 Common Development Issues

### 1. **"Too Many Requests" Error (429)**

**Symptoms:**
- Browser console shows: `Request failed with status code 429`
- Error message: "Too many requests from this IP"

**Cause:**
- Rate limiter is blocking requests (was set to 100 requests per 15 minutes)

**Solution:**
✅ **FIXED** - Rate limiting is now disabled in development mode
- Restart your backend server
- The fix skips rate limiting when `NODE_ENV=development`

**To verify the fix worked:**
```bash
# Check backend logs when server starts
# Should see: 📝 Environment: development
```

---

### 2. **Login Shows "Invalid Credentials" (Password Issue)**

**Symptoms:**
- Correct password doesn't work
- Database has plain text password instead of hash

**Cause:**
- Password stored as plain text "Admin@123" instead of bcrypt hash

**Solution:**
Run this SQL in pgAdmin:
```sql
UPDATE users 
SET password = '$2b$10$S1x8ktNmWU9haxuUHE2V6.jXkSCUDDT/YMN9H4XtAcTxVfa7gwEla' 
WHERE email = 'admin@moulavi.com';
```

**Correct credentials:**
- Email: `admin@moulavi.com`
- Password: `Admin@123`

---

### 3. **Login Successful But Stays on Login Page**

**Symptoms:**
- Toast shows "Welcome back, System Admin!"
- But doesn't redirect to dashboard

**Cause:**
- Middleware checking cookies instead of localStorage
- Browser cached old middleware

**Solution:**
✅ **FIXED** - Middleware updated to not block navigation
- Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Clear browser cache if needed

---

### 4. **CORS Errors**

**Symptoms:**
- Console shows: `CORS policy: No 'Access-Control-Allow-Origin' header`
- API requests fail

**Cause:**
- Frontend URL doesn't match backend CORS config

**Solution:**
1. Check backend `.env`:
   ```env
   FRONTEND_URL=http://localhost:3000
   ```

2. Check frontend `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

3. Restart both servers

---

### 5. **Database Connection Failed**

**Symptoms:**
- Backend shows: "Cannot connect to database"
- Migration fails

**Cause:**
- PostgreSQL not running
- Wrong credentials in `.env`

**Solution:**
1. Start PostgreSQL service
2. Verify credentials:
   ```bash
   psql -U postgres -d moulavi_erp
   ```
3. Check `.env` file matches your PostgreSQL password

---

### 6. **TypeScript Compilation Errors**

**Symptoms:**
- `TSError: Unable to compile TypeScript`
- Backend won't start

**Common TypeScript Issues:**

**Issue A: Parameter 'res' has 'any' type**
✅ **FIXED** - All route handlers now have proper `Response` typing

**Issue B: JWT expiresIn type error**
✅ **FIXED** - Using `as any` type assertion for JWT options

**If you see new TypeScript errors:**
1. Check if you modified any files
2. Ensure imports are correct
3. Run: `cd backend && npm install` to reinstall dependencies

---

### 7. **Port Already in Use**

**Symptoms:**
- `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**

**Windows:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual number)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9
```

**Or change port:**
In `backend/.env`:
```env
PORT=5001
```

Then update frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

---

### 8. **Frontend Build Errors**

**Symptoms:**
- `Module not found`
- `Cannot find module`

**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json .next
npm install
npm run dev
```

---

### 9. **Email Not Sending**

**Symptoms:**
- Party created but no email received
- Console shows email error

**Cause:**
- SMTP credentials not configured
- Gmail App Password not generated

**Solution:**

**For Gmail:**
1. Enable 2-Step Verification
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update `.env`:
   ```env
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

**Note:** Email is optional for development. You can:
- Manually share credentials with parties
- Skip email functionality during testing

---

### 10. **Hot Reload Not Working**

**Symptoms:**
- Changes don't reflect automatically
- Need to manually restart server

**Solution:**

**Backend:**
- Nodemon should auto-restart
- Check `nodemon.json` is present
- Restart manually: `rs` in terminal

**Frontend:**
- Next.js should auto-reload
- Hard refresh: `Ctrl + Shift + R`
- Check terminal for compilation errors

---

## 🔍 How to Debug Issues

### Check Browser Console (F12)
- **Console tab**: JavaScript errors
- **Network tab**: API request/response
- **Application tab**: localStorage, cookies

### Check Backend Logs
Look for:
```
🚀 Server is running on port 5000
📝 Environment: development
🌐 Frontend URL: http://localhost:3000
```

### Check Database
```sql
-- Verify admin user exists
SELECT * FROM users WHERE email = 'admin@moulavi.com';

-- Check password is hashed (starts with $2b$)
-- Should see: $2b$10$S1x8ktNmWU9haxuUHE2V6...
```

### Common Error Patterns

| Error Message | Location | Likely Cause |
|--------------|----------|--------------|
| `429 Too Many Requests` | Console | Rate limiting (FIXED) |
| `401 Unauthorized` | Console | Invalid token or expired |
| `CORS error` | Console | Wrong frontend URL in backend |
| `Invalid credentials` | Login page | Wrong password or not hashed |
| `Cannot read property 'id'` | Dashboard | Not authenticated properly |
| `Module not found` | Terminal | Missing dependencies |

---

## ✅ Quick Fixes Checklist

When something goes wrong:

- [ ] Hard refresh browser (`Ctrl + Shift + R`)
- [ ] Check both servers are running
- [ ] Check browser console for errors
- [ ] Check backend terminal for errors
- [ ] Verify `.env` files are configured
- [ ] Restart both servers
- [ ] Clear browser cache/localStorage
- [ ] Re-run database migrations if needed

---

## 🆘 Still Having Issues?

1. **Check file versions**: Ensure all fixes have been applied
2. **Review logs**: Backend terminal and browser console
3. **Test API directly**: Use Postman or curl
4. **Database check**: Verify data with pgAdmin
5. **Start fresh**: 
   ```bash
   # Backend
   cd backend
   rm -rf node_modules
   npm install
   
   # Frontend  
   cd frontend
   rm -rf node_modules .next
   npm install
   ```

---

## 📝 Development Best Practices

### Always Check:
1. ✅ PostgreSQL is running
2. ✅ Both .env files are configured
3. ✅ Backend server is on port 5000
4. ✅ Frontend server is on port 3000
5. ✅ No port conflicts

### Before Testing Features:
1. Check browser console (F12)
2. Check network requests
3. Verify database state
4. Check backend logs

### After Making Changes:
1. Save all files
2. Wait for auto-reload
3. Hard refresh browser
4. Test the feature
5. Check for errors

---

**Remember:** Most issues during development are due to:
- Cached data (clear and refresh)
- Configuration mismatches (.env files)
- Servers not running
- Database state issues

Stay calm and debug systematically! 🐛➡️✅

