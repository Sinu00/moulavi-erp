# Production Email & WhatsApp Setup Guide

## ⚡ QUICK FIX CHECKLIST (Do This First!)

1. **✅ Set Environment Variables in Coolify:**
   - Go to your app in Coolify → Environment Variables
   - Add these **exact** variable names:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_SECURE=false
     SMTP_USER=your-email@gmail.com
     SMTP_PASSWORD=your-gmail-app-password
     WHATSAPP_API_KEY=your-api-key
     WHATSAPP_INSTANCE_ID=your-instance-id
     FRONTEND_URL=https://your-production-domain.com
     ```
   - **Restart the application** after adding variables

2. **✅ Verify Configuration:**
   - Visit: `https://your-api-domain.com/api/debug/services-config`
   - Check if all variables show as "SET" (not "NOT SET")

3. **✅ Check Logs:**
   - In Coolify, check application logs
   - Look for: `[EMAIL]` and `[WHATSAPP]` prefixed messages
   - Check for specific error messages

4. **✅ Test Network Connectivity:**
   - If you have SSH access, test: `nc -zv smtp.gmail.com 587`
   - If this fails, firewall is blocking outbound SMTP

---

## 🔍 Issue Analysis

Your email and WhatsApp services work locally but not in production on Digital Ocean droplet. Here are the most common causes and solutions:

## ✅ Step 1: Verify Environment Variables in Coolify

The code expects these **exact** environment variable names. Make sure they're set in your Coolify deployment:

### Email Service Variables (REQUIRED)
```bash
SMTP_HOST=smtp.gmail.com          # or smtp.mandrillapp.com
SMTP_PORT=587                      # or 465 for SSL
SMTP_SECURE=false                  # true for port 465, false for 587
SMTP_USER=your-email@gmail.com     # Your email address
SMTP_PASSWORD=your-app-password    # Gmail App Password (NOT regular password)
FRONTEND_URL=https://your-domain.com  # Your production frontend URL
```

### WhatsApp Service Variables (REQUIRED)
```bash
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_INSTANCE_ID=your-instance-id-here
```

### How to Set in Coolify:
1. Go to your application in Coolify dashboard
2. Navigate to **Environment Variables** section
3. Add each variable above
4. **Restart the application** after adding variables

---

## ✅ Step 2: Check Gmail App Password (If using Gmail)

If you're using Gmail SMTP, you **MUST** use an App Password, not your regular password:

1. Go to your Google Account settings
2. Enable 2-Step Verification (required for App Passwords)
3. Go to **Security** → **2-Step Verification** → **App passwords**
4. Generate a new app password for "Mail"
5. Use this 16-character password (no spaces) as `SMTP_PASSWORD`

---

## ✅ Step 3: Check Digital Ocean Firewall Rules

Your droplet might be blocking outbound SMTP/HTTPS connections:

### Check if ports are blocked:
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Test SMTP connection (for Gmail)
telnet smtp.gmail.com 587

# Test WhatsApp API connection
curl -v https://wa.smsidea.com/api/v1/sendMessage
```

### If blocked, open ports in Digital Ocean:
1. Go to Digital Ocean Dashboard
2. Navigate to **Networking** → **Firewalls**
3. Create/Edit firewall rules:
   - **Outbound Rules:**
     - Allow TCP port 587 (SMTP)
     - Allow TCP port 465 (SMTP SSL)
     - Allow TCP port 443 (HTTPS for WhatsApp API)
     - Allow TCP port 80 (HTTP)

---

## ✅ Step 4: Test Network Connectivity from Droplet

SSH into your droplet and test connectivity:

```bash
# Test DNS resolution
nslookup smtp.gmail.com
nslookup wa.smsidea.com

# Test SMTP connection
nc -zv smtp.gmail.com 587

# Test HTTPS connection
curl -I https://wa.smsidea.com
```

If these fail, there's a network/firewall issue.

---

## ✅ Step 5: Check Application Logs

In Coolify, check your application logs for specific error messages:

```bash
# Look for these error patterns:
[EMAIL] ❌ EXCEPTION: Error sending email
[WHATSAPP] ❌ EXCEPTION: Error sending WhatsApp message
```

Common errors:
- **"Connection timeout"** → Firewall blocking outbound connections
- **"Authentication failed"** → Wrong SMTP credentials
- **"API key not configured"** → Missing environment variables
- **"ECONNREFUSED"** → Port blocked or wrong host

---

## ✅ Step 6: Verify Environment Variables Are Loaded

Add a test endpoint to verify variables are loaded (temporary, for debugging):

The code already has extensive logging. Check logs for:
- `[EMAIL] SMTP Configuration:` - Should show your SMTP settings
- `[WHATSAPP] ✓ API Key:` - Should show masked API key
- `[WHATSAPP] ✓ Instance ID:` - Should show instance ID

If these show "not set", your environment variables aren't being loaded.

---

## ✅ Step 7: Test with Different SMTP Provider

If Gmail doesn't work, try alternatives:

### Option 1: Mandrill (Mailchimp)
```bash
SMTP_HOST=smtp.mandrillapp.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mandrill-username
SMTP_PASSWORD=your-mandrill-api-key
```

### Option 2: SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### Option 3: Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASSWORD=your-mailgun-password
```

---

## ✅ Step 8: WhatsApp API Specific Issues

### Verify API Credentials:
1. Log into your SMS Idea dashboard
2. Verify your API key and Instance ID are correct
3. Check if your account has sufficient credits
4. Verify the API endpoint is correct: `https://wa.smsidea.com/api/v1/sendMessage`

### Test WhatsApp API directly:
```bash
# From your droplet
curl -X POST https://wa.smsidea.com/api/v1/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "key": "YOUR_API_KEY",
    "to": "91XXXXXXXXXX",
    "message": "Test message",
    "IsUrgent": false,
    "isGroupMsg": false,
    "IsFailMessage": false,
    "SendingMessageType": "1"
  }'
```

---

## ✅ Step 9: Coolify-Specific Configuration

### Ensure Environment Variables Are Set at Correct Level:
1. **Application-level** (not service-level) - Set in your app's environment section
2. **Restart required** - After adding variables, restart the application
3. **No quotes needed** - Don't wrap values in quotes unless they contain spaces

### Check if variables are being read:
In Coolify logs, you should see:
```
[EMAIL] SMTP Configuration:
[EMAIL]   Host: smtp.gmail.com
[EMAIL]   Port: 587
```

If you see "not set", the variables aren't loaded.

---

## ✅ Step 10: Quick Debugging Checklist

Run through this checklist:

- [ ] All environment variables are set in Coolify
- [ ] Application restarted after adding variables
- [ ] Using Gmail App Password (not regular password)
- [ ] Digital Ocean firewall allows outbound SMTP (port 587/465)
- [ ] Digital Ocean firewall allows outbound HTTPS (port 443)
- [ ] WhatsApp API credentials are correct
- [ ] WhatsApp API account has credits
- [ ] Frontend URL is set correctly (production URL, not localhost)
- [ ] Checked application logs for specific error messages
- [ ] Tested network connectivity from droplet

---

## 🔧 Quick Fix Commands

If you have SSH access to your droplet:

```bash
# 1. Check if environment variables are set
env | grep SMTP
env | grep WHATSAPP

# 2. Test SMTP connection
echo "QUIT" | nc smtp.gmail.com 587

# 3. Test WhatsApp API
curl -v https://wa.smsidea.com/api/v1/sendMessage

# 4. Check if Node.js can resolve DNS
node -e "require('dns').resolve('smtp.gmail.com', (err, addr) => console.log(err || addr))"
```

---

## 📞 Still Not Working?

If after all these steps it still doesn't work:

1. **Share the exact error logs** from Coolify (the [EMAIL] and [WHATSAPP] prefixed logs)
2. **Verify network connectivity** from the droplet
3. **Check if your SMTP provider blocks** connections from Digital Ocean IPs (some providers do)
4. **Consider using a dedicated email service** like SendGrid or Mailgun which are more cloud-friendly

---

## 🎯 Most Common Issues (90% of cases)

1. **Environment variables not set in Coolify** → Set them and restart
2. **Using regular Gmail password instead of App Password** → Generate App Password
3. **Firewall blocking outbound connections** → Open ports 587, 465, 443
4. **Wrong environment variable names** → Use exact names: `SMTP_HOST`, `SMTP_USER`, etc.

---

**Good luck! 🚀**

