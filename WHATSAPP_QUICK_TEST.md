# WhatsApp Testing - Quick Reference

## Quick Test Commands

### 1. Test Custom Message
```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919876543210", "message": "Test message"}'
```

### 2. Test All Message Types
```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp-all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919876543210"}'
```

### 3. Test Specific Template
```bash
# Credentials
curl -X POST https://your-domain.com/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919876543210", "testType": "credentials"}'

# Service Confirmation
curl -X POST https://your-domain.com/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919876543210", "testType": "service-confirmation"}'

# Movement Update
curl -X POST https://your-domain.com/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919876543210", "testType": "movement-update"}'

# Iqama Confirmation
curl -X POST https://your-domain.com/api/auth/test-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "919876543210", "testType": "iqama-confirmation"}'
```

## Environment Variables Required

In Coolify, ensure these are set:
- `WHATSAPP_API_KEY` - Your API key (Required)
- `WHATSAPP_INSTANCE_ID` - Your instance ID (Required)
- `WHATSAPP_API_URL` - (Optional) Default: `https://wa.smsidea.com/api/v1/sendMessage`
- `WHATSAPP_IMAGE_API_URL` - (Optional) Default: `https://wa.smsidea.com/api/v1/sendImage`
- `WHATSAPP_REQUEST_METHOD` - (Optional) `POST` (default) or `GET`
- `FRONTEND_URL` - Your frontend URL

## View Logs in Coolify

1. Go to your backend service in Coolify
2. Click "Logs" tab
3. Filter by `[WHATSAPP]` to see WhatsApp logs
4. Look for ✅ (success) or ❌ (error) indicators

## Phone Number Format

- ✅ Correct: `919876543210` (91 + 10 digits)
- ✅ Correct: `9876543210` (will auto-add 91)
- ❌ Wrong: `+91 98765 43210` (spaces/special chars removed automatically)

## Common Test Types

| testType | Description |
|----------|-------------|
| `custom` | Custom message (default) |
| `credentials` | Account credentials template |
| `service-confirmation` | Service booking confirmation |
| `movement-update` | Voucher movement update |
| `iqama-confirmation` | Iqama approval request |

## Additional Test Endpoints

### Test Image
```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "phoneNumber": "919876543210",
    "imageUrl": "https://example.com/image.jpg",
    "caption": "Test image"
  }'
```

### Test Bulk Messages
```bash
curl -X POST https://your-domain.com/api/auth/test-whatsapp-bulk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [
      {"phoneNumber": "919876543210", "message": "Test 1"},
      {"phoneNumber": "919876543211", "message": "Test 2"}
    ],
    "delayBetweenMessages": 2000
  }'
```

## Debug Log Indicators

- `[WHATSAPP]` - All WhatsApp-related logs
- `[WHATSAPP-CONFIG]` - Configuration check logs
- `[TEST-WHATSAPP]` - Test endpoint logs
- `✅` - Success
- `❌` - Error

## Quick Troubleshooting

1. **"API key not configured"** → Set `WHATSAPP_API_KEY` in Coolify
2. **"No response received"** → Check network/firewall from droplet
3. **"Invalid phone number"** → Use format: `91XXXXXXXXXX` (no spaces/special chars)
4. **Messages not received** → Check API response in logs, verify number has WhatsApp

For detailed guide, see `WHATSAPP_TESTING_GUIDE.md`

