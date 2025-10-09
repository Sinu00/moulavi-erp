import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// WhatsApp configuration constants
const WHATSAPP_CONFIG = {
  apiUrl: 'https://wa.smsidea.com/api/v1/SendUserInitiatedmsg',
  apiKey: 'da568fa8f9a04c55a7c0338be5fee29f',
  instanceId: process.env.WHATSAPP_INSTANCE_ID || '343551-49824',
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

  serviceConfirmation: (name: string, serviceType: string, serviceId: string) => `
✅ *MOULAVI ERP - Service Request Confirmation*

Dear ${name},

Your ${serviceType} service request has been successfully submitted!

📋 *Request ID:* ${serviceId}
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
  if (!WHATSAPP_CONFIG.apiKey) {
    throw new Error('WhatsApp API key not configured');
  }

  if (!WHATSAPP_CONFIG.instanceId) {
    throw new Error('WhatsApp Instance ID not configured');
  }

  const formattedNumber = formatPhoneNumber(to);
  
  const payload = {
    key: WHATSAPP_CONFIG.apiKey,
    to: formattedNumber,
    type: 'text',
    text: {
      preview_url: 'false',
      body: message
    }
  };

  try {
    console.log('Sending WhatsApp message to:', formattedNumber);
    console.log('Message preview:', message.substring(0, 100) + '...');
    console.log('Payload:', payload);

    const response = await axios.post(WHATSAPP_CONFIG.apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('WhatsApp API Response:', response.data);

    // Check if message was sent successfully
    if (response.data.status === 'success' || response.data.ErrorCode === '000') {
      console.log('WhatsApp message sent successfully to', formattedNumber);
    } else {
      console.error('WhatsApp API Error:', response.data.ErrorMessage || response.data.message || response.data);
      throw new Error(`WhatsApp API Error: ${response.data.ErrorMessage || response.data.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', {
      to: formattedNumber,
      error: error?.message || 'Unknown error',
      response: error?.response?.data,
    });
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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const message = WHATSAPP_TEMPLATES.credentials(name, email, password, frontendUrl);
  
  await sendWhatsAppMessage(phoneNumber, message);
};

// Send service confirmation WhatsApp message
export const sendServiceConfirmationWhatsApp = async (
  phoneNumber: string,
  name: string,
  serviceType: string,
  serviceId: string
): Promise<void> => {
  const message = WHATSAPP_TEMPLATES.serviceConfirmation(name, serviceType, serviceId);
  
  await sendWhatsAppMessage(phoneNumber, message);
};

// Send custom WhatsApp message
export const sendCustomWhatsApp = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  await sendWhatsAppMessage(phoneNumber, message);
};

// Export utility functions
export { sendWhatsAppMessage, formatPhoneNumber };
