# WhatsApp Testing - Corrected cURL Commands

## Issue Fixed
The original command had two problems:
1. **Authorization header** - Missing `Authorization:` prefix
2. **Smart quotes** - Using curly quotes (`"` and `"`) instead of straight quotes (`"`)

## Corrected Command

```bash
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg1NWQ3MzRjLWE2Y2YtNGJmNC05YjViLTc1YzEzNjhlYWZiNyIsImVtYWlsIjoiYWRtaW5AbW91bGF2aS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjczNDQwMTUsImV4cCI6MTc2NzM0NzYxNX0.PAF-a4qws0uNtdbkaJsv4xxMrFQ14whath2AbJM0a8s" \
  -d '{"phoneNumber": "919778355402", "message": "Test from production"}'
```

## Key Changes

1. **Authorization Header:**
   - ❌ Wrong: `-H "Bearer <token>"`
   - ✅ Correct: `-H "Authorization: Bearer <token>"`

2. **JSON Quotes:**
   - ❌ Wrong: `"phoneNumber": "919778355402"` (curly quotes)
   - ✅ Correct: `"phoneNumber": "919778355402"` (straight quotes)

## All Test Endpoints

### 1. Simple Custom Message
```bash
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "message": "Test from production"}'
```

### 2. Test Specific Template
```bash
# Credentials
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "testType": "credentials"}'

# Service Confirmation
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "testType": "service-confirmation"}'

# Movement Update
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "testType": "movement-update"}'

# Iqama Confirmation
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "testType": "iqama-confirmation"}'
```

### 3. Test All Message Types
```bash
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp-all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402"}'
```

### 4. Test Image
```bash
# Basic image test (required fields only)
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "imageUrl": "https://example.com/image.jpg"}'

# Image with caption and filename
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "imageUrl": "https://example.com/image.jpg", "caption": "Test image caption", "filename": "test-image.jpg"}'

# Using a real publicly accessible image (for testing)
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919778355402", "imageUrl": "https://picsum.photos/800/600", "caption": "Random test image from Picsum"}'
```

### 5. Test Bulk Messages
```bash
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp-bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messages": [{"phoneNumber": "919778355402", "message": "Test 1"}, {"phoneNumber": "919778355403", "message": "Test 2"}], "delayBetweenMessages": 2000}'
```

## Single Line Commands (No Line Breaks)

If you prefer single-line commands:

```bash
curl -X POST https://erp.moulavi.in/api/auth/test-whatsapp -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" -d '{"phoneNumber": "919778355402", "message": "Test from production"}'
```

## Common Mistakes to Avoid

1. ❌ `-H "Bearer TOKEN"` → ✅ `-H "Authorization: Bearer TOKEN"`
2. ❌ Using curly quotes `"` → ✅ Use straight quotes `"`
3. ❌ Missing `Content-Type` header → ✅ Always include it
4. ❌ Phone number without country code → ✅ Use `91XXXXXXXXXX` format

## Phone Number Format

- ✅ Correct: `"919778355402"` (91 + 10 digits)
- ✅ Correct: `"9778355402"` (will auto-add 91)
- ❌ Wrong: `"+91 977 835 5402"` (spaces/special chars - will be cleaned automatically)

## Getting Your Token

1. Login to your app at `https://erp.moulavi.in`
2. Open browser DevTools (F12)
3. Go to Application → Local Storage
4. Copy the `accessToken` value
5. Replace `YOUR_TOKEN` in the commands above

