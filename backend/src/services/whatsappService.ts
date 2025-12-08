import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// WhatsApp configuration constants
const WHATSAPP_CONFIG = {
  apiUrl: 'https://wa.smsidea.com/api/v1/sendMessage',
  apiKey: process.env.WHATSAPP_API_KEY,
  instanceId: process.env.WHATSAPP_INSTANCE_ID,
} as const;

// WhatsApp message templates
const WHATSAPP_TEMPLATES = {
  credentials: (name: string, email: string, password: string, frontendUrl: string) => `
🔐 *MOULAVI ERP - Account Credentials*

Dear ${name},

Welcome to Moulavi ERP! Your account has been successfully created.

📧 *Email:* ${email}
🔑 *Password:* ${password}

⚠️ *Security Notice:* Please change your password after your first login.

🌐 *Login Link:* ${frontendUrl}/party-auth

📞 *Support:* support@moulavi.in
📱 *Phone:* +91-XXX-XXX-XXXX

Thank you for choosing Moulavi ERP!
  `.trim(),

  serviceConfirmation: (name: string, serviceType: string, bookingId: string) => `
✅ *MOULAVI ERP - Service Request Confirmation*

Dear ${name},

Your ${serviceType} service request has been successfully submitted!

📋 *Booking ID:* ${bookingId}
📅 *Submitted:* ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}

📊 *Status:* Under Review
⏰ *Processing Time:* 24-48 hours

🔄 *What happens next?*
✓ Document verification
✓ Processing updates
✓ Final confirmation
✓ Support assistance

📞 *Need Help?*
📧 Email: support@moulavi.in
📱 Phone: +91-XXX-XXX-XXXX

Thank you for choosing Moulavi ERP!
  `.trim(),

  iqamaConfirmation: (name: string) => `
🌙 Greetings from Umra Company, Saudi Arabia 🇸🇦

👨‍👩‍👧 Your family has applied for an Umrah visa through our Indian agent.

✅ Kindly log in to your Absher account and approve the request at the earliest convenience.

🔎 For your reference, please check under "Qabul Services" in your Absher account to view and approve the request.

📞 If you need any assistance, please feel free to contact us anytime.

---

✅ *How to Check Qabul Services in Absher*

1. Log in to [Absher.sa](https://www.absher.sa) → Individual account

2. Go to My Services (خدماتي) → *Inquiries (الاستعلامات)

3. Select General Services (الخدمات العامة)

4. Click Qabul Services (قبول الخدمات)

5. View or Accept (قبول) / Reject (رفض) any pending requests
  `.trim(),
} as const;

// Utility function to format phone number
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present (assuming India +91)
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  
  // If already has country code, return as is
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }
  
  // Return cleaned number
  return cleaned;
};

// Utility function to send WhatsApp message with error handling
const sendWhatsAppMessage = async (to: string, message: string): Promise<void> => {
  const startTime = Date.now();
  const logPrefix = '[WHATSAPP]';
  
  console.log(`${logPrefix} ========== START: Sending WhatsApp Message ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Original Phone Number: ${to}`);
  console.log(`${logPrefix} Message Length: ${message.length} characters`);
  console.log(`${logPrefix} Message Preview: ${message.substring(0, 150)}${message.length > 150 ? '...' : ''}`);

  // Configuration validation
  console.log(`${logPrefix} Checking configuration...`);
  if (!WHATSAPP_CONFIG.apiKey) {
    console.error(`${logPrefix} ❌ ERROR: WhatsApp API key not configured`);
    console.error(`${logPrefix} Environment variable WHATSAPP_API_KEY is missing or empty`);
    throw new Error('WhatsApp API key not configured');
  }
  console.log(`${logPrefix} ✓ API Key: ${WHATSAPP_CONFIG.apiKey.substring(0, 10)}...${WHATSAPP_CONFIG.apiKey.substring(WHATSAPP_CONFIG.apiKey.length - 4)} (masked)`);

  if (!WHATSAPP_CONFIG.instanceId) {
    console.error(`${logPrefix} ❌ ERROR: WhatsApp Instance ID not configured`);
    console.error(`${logPrefix} Environment variable WHATSAPP_INSTANCE_ID is missing or empty`);
    throw new Error('WhatsApp Instance ID not configured');
  }
  console.log(`${logPrefix} ✓ Instance ID: ${WHATSAPP_CONFIG.instanceId}`);

  const formattedNumber = formatPhoneNumber(to);
  console.log(`${logPrefix} Formatted Phone Number: ${formattedNumber}`);
  
  const payload = {
    key: WHATSAPP_CONFIG.apiKey,
    to: formattedNumber,
    message: message,
    IsUrgent: false,
    isGroupMsg: false,
    IsFailMessage: false,
    SendingMessageType: '1' // 1 for WhatsApp
  };

  console.log(`${logPrefix} API URL: ${WHATSAPP_CONFIG.apiUrl}`);
  console.log(`${logPrefix} Payload (without API key):`, {
    to: payload.to,
    message: `${message.substring(0, 50)}...`,
    IsUrgent: payload.IsUrgent,
    isGroupMsg: payload.isGroupMsg,
    IsFailMessage: payload.IsFailMessage,
    SendingMessageType: payload.SendingMessageType,
  });

  try {
    console.log(`${logPrefix} Making API request...`);
    const requestStartTime = Date.now();
    
    const response = await axios.post(WHATSAPP_CONFIG.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    const requestDuration = Date.now() - requestStartTime;
    console.log(`${logPrefix} ✓ API Request completed in ${requestDuration}ms`);
    console.log(`${logPrefix} Response Status: ${response.status} ${response.statusText}`);
    console.log(`${logPrefix} Response Headers:`, JSON.stringify(response.headers, null, 2));
    console.log(`${logPrefix} Response Data:`, JSON.stringify(response.data, null, 2));

    // Check if message was sent successfully
    if (response.data.status === 'success' || response.data.ErrorCode === '000') {
      const totalDuration = Date.now() - startTime;
      console.log(`${logPrefix} ✅ SUCCESS: WhatsApp message sent successfully to ${formattedNumber}`);
      console.log(`${logPrefix} Total Duration: ${totalDuration}ms`);
      console.log(`${logPrefix} ========== END: Message Sent Successfully ==========`);
    } else {
      const errorMessage = response.data.ErrorMessage || response.data.message || 'Unknown error';
      console.error(`${logPrefix} ❌ API ERROR: ${errorMessage}`);
      console.error(`${logPrefix} Full Response:`, JSON.stringify(response.data, null, 2));
      console.error(`${logPrefix} ========== END: API Error ==========`);
      throw new Error(`WhatsApp API Error: ${errorMessage}`);
    }
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error sending WhatsApp message`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.response) {
      console.error(`${logPrefix} HTTP Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`${logPrefix} Response Data:`, JSON.stringify(error.response.data, null, 2));
      console.error(`${logPrefix} Response Headers:`, JSON.stringify(error.response.headers, null, 2));
    }
    
    if (error?.request) {
      console.error(`${logPrefix} Request was made but no response received`);
      console.error(`${logPrefix} Request Config:`, {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout,
      });
    }
    
    if (error?.code) {
      console.error(`${logPrefix} Error Code: ${error.code}`);
    }
    
    console.error(`${logPrefix} Formatted Number: ${formattedNumber}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to send WhatsApp message: ${error?.message || 'Unknown error'}`);
  }
};

// Send credentials WhatsApp message
export const sendCredentialsWhatsApp = async (
  phoneNumber: string,
  name: string,
  email: string,
  password: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendCredentialsWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    name: name || 'null',
    email: email || 'null',
    password: password ? '***masked***' : 'null',
  });
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  console.log('[WHATSAPP] Frontend URL:', frontendUrl);
  
  const message = WHATSAPP_TEMPLATES.credentials(name, email, password, frontendUrl);
  console.log('[WHATSAPP] Message template generated, length:', message.length);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendCredentialsWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendCredentialsWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Send service confirmation WhatsApp message
export const sendServiceConfirmationWhatsApp = async (
  phoneNumber: string,
  name: string,
  serviceType: string,
  bookingId: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendServiceConfirmationWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    name: name || 'null',
    serviceType: serviceType || 'null',
    bookingId: bookingId || 'null',
  });
  
  const message = WHATSAPP_TEMPLATES.serviceConfirmation(name, serviceType, bookingId);
  console.log('[WHATSAPP] Message template generated, length:', message.length);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendServiceConfirmationWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendServiceConfirmationWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Send custom WhatsApp message
export const sendCustomWhatsApp = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendCustomWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    messageLength: message?.length || 0,
  });
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendCustomWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendCustomWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Export utility functions
// Send movement update WhatsApp message
export const sendMovementUpdateWhatsApp = async (
  phoneNumber: string,
  partyName: string,
  voucherNumber: string,
  movementDetails: {
    date: string;
    time: string;
    fromLocation: string;
    toLocation: string;
    driverDetails1: string;
    driverDetails2: string;
    vehicleNumber: string;
  }
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendMovementUpdateWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    partyName: partyName || 'null',
    voucherNumber: voucherNumber || 'null',
    movementDetails: {
      date: movementDetails.date || 'null',
      time: movementDetails.time || 'null',
      fromLocation: movementDetails.fromLocation || 'null',
      toLocation: movementDetails.toLocation || 'null',
      driverDetails1: movementDetails.driverDetails1 || 'null',
      driverDetails2: movementDetails.driverDetails2 || 'null',
      vehicleNumber: movementDetails.vehicleNumber || 'null',
    },
  });
  
  const message = `🚗 *Movement Update - Voucher ${voucherNumber}*

Dear ${partyName},

Your movement details have been updated:

📅 *Date:* ${movementDetails.date}
⏰ *Time:* ${movementDetails.time || 'N/A'}
📍 *From:* ${movementDetails.fromLocation || 'N/A'}
📍 *To:* ${movementDetails.toLocation || 'N/A'}
👤 *Driver 1:* ${movementDetails.driverDetails1 || 'N/A'}
👤 *Driver 2:* ${movementDetails.driverDetails2 || 'N/A'}
🚗 *Vehicle Number:* ${movementDetails.vehicleNumber || 'N/A'}

Thank you for choosing our services!`;

  console.log('[WHATSAPP] Message template generated, length:', message.length);
  
  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendMovementUpdateWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendMovementUpdateWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

// Send iqama confirmation WhatsApp message
export const sendIqamaConfirmationWhatsApp = async (
  phoneNumber: string,
  name: string
): Promise<void> => {
  console.log('[WHATSAPP] ========== sendIqamaConfirmationWhatsApp called ==========');
  console.log('[WHATSAPP] Parameters:', {
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'null',
    name: name || 'null',
  });

  const message = WHATSAPP_TEMPLATES.iqamaConfirmation(name);
  console.log('[WHATSAPP] Message template generated, length:', message.length);

  try {
    await sendWhatsAppMessage(phoneNumber, message);
    console.log('[WHATSAPP] ✅ sendIqamaConfirmationWhatsApp completed successfully');
  } catch (error: any) {
    console.error('[WHATSAPP] ❌ sendIqamaConfirmationWhatsApp failed:', error?.message || 'Unknown error');
    throw error;
  }
};

export { sendWhatsAppMessage, formatPhoneNumber };
