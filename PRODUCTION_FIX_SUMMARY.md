# Production Email & WhatsApp Fix Summary

## ✅ What I've Done

### 1. **Added Debug Endpoint**
   - **URL**: `GET /api/debug/services-config`
   - **Purpose**: Check if environment variables are loaded correctly
   - **Usage**: Visit this URL in your browser to see configuration status
   - **Shows**: Which variables are set/missing (without exposing sensitive data)

### 2. **Improved Email Service**
   - Now verifies SMTP connection in production (not just development)
   - Better error messages to help diagnose issues
   - More detailed logging

### 3. **Added Startup Validation**
   - Server now logs email/WhatsApp configuration status on startup
   - You'll see warnings if variables are missing
   - Helps catch configuration issues immediately

### 4. **Created Comprehensive Guide**
   - See `PRODUCTION_EMAIL_WHATSAPP_SETUP.md` for detailed troubleshooting

---

## 🚀 What You Need to Do

### Step 1: Set Environment Variables in Coolify

1. Open your Coolify dashboard
2. Navigate to your application
3. Go to **Environment Variables** section
4. Add these variables (use **exact names**):

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
FRONTEND_URL=https://your-production-domain.com

# WhatsApp Configuration  
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_INSTANCE_ID=your-instance-id-here
```

**⚠️ IMPORTANT:**
- For Gmail, you **MUST** use an App Password (not your regular password)
- Generate App Password: Google Account → Security → 2-Step Verification → App passwords
- Don't wrap values in quotes unless they contain spaces

### Step 2: Restart Application

After adding environment variables, **restart your application** in Coolify.

### Step 3: Verify Configuration

1. Visit: `https://your-api-domain.com/api/debug/services-config`
2. Check the response - all variables should show as "SET" (not "NOT SET")
3. If any show "NOT SET", the variable wasn't added correctly

### Step 4: Check Startup Logs

In Coolify logs, you should now see:
```
📧 Email Service: Configured (smtp.gmail.com:587)
💬 WhatsApp Service: Configured
```

If you see warnings instead, variables are missing.

### Step 5: Test Email/WhatsApp

Try sending an email or WhatsApp message and check logs for:
- `[EMAIL] ✅ SUCCESS` - Email sent successfully
- `[WHATSAPP] ✅ SUCCESS` - WhatsApp sent successfully
- `[EMAIL] ❌ EXCEPTION` - Check the error message

---

## 🔧 Common Issues & Solutions

### Issue: Variables show "NOT SET" in debug endpoint
**Solution**: 
- Variables not added in Coolify, or
- Application not restarted after adding variables, or
- Wrong variable names (must be exact: `SMTP_HOST`, not `EMAIL_HOST`)

### Issue: "Connection timeout" or "ECONNREFUSED"
**Solution**: 
- Digital Ocean firewall blocking outbound connections
- Open ports 587, 465, 443 in Digital Ocean firewall
- Or test from droplet: `nc -zv smtp.gmail.com 587`

### Issue: "Authentication failed"
**Solution**: 
- Using regular Gmail password instead of App Password
- Generate App Password from Google Account settings
- Make sure 2-Step Verification is enabled

### Issue: "API key not configured"
**Solution**: 
- `WHATSAPP_API_KEY` or `WHATSAPP_INSTANCE_ID` not set
- Check Coolify environment variables
- Restart application after adding

---

## 📊 Debugging Tools

### 1. Configuration Check
```
GET /api/debug/services-config
```
Shows which environment variables are loaded.

### 2. Application Logs
Check Coolify logs for:
- `[EMAIL]` - Email service logs
- `[WHATSAPP]` - WhatsApp service logs
- Look for `✅ SUCCESS` or `❌ EXCEPTION`

### 3. Network Test (if you have SSH access)
```bash
# Test SMTP connection
nc -zv smtp.gmail.com 587

# Test WhatsApp API
curl -I https://wa.smsidea.com
```

---

## 🎯 Most Likely Issues (90% of cases)

1. **Environment variables not set in Coolify** → Set them and restart
2. **Using regular Gmail password** → Use App Password instead
3. **Firewall blocking connections** → Open ports 587, 465, 443
4. **Wrong variable names** → Use exact names: `SMTP_HOST`, `SMTP_USER`, etc.

---

## 📞 Still Not Working?

1. Check the debug endpoint: `/api/debug/services-config`
2. Share the exact error logs from Coolify (the `[EMAIL]` and `[WHATSAPP]` messages)
3. Verify network connectivity from the droplet
4. Check if your SMTP provider blocks Digital Ocean IPs

---

**After following these steps, your email and WhatsApp services should work in production! 🚀**

