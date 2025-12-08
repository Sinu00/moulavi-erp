import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration constants
const EMAIL_CONFIG = {
  from: '"Moulavi ERP System" <info@moulavi.in>',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
} as const;

// Email enabled flag (defaults to true for backward compatibility)
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

// SMTP transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  // Mandrill specific configuration
  ...(process.env.SMTP_HOST === 'smtp.mandrillapp.com' && {
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5,
  }),
});

// Email templates
const EMAIL_TEMPLATES = {
  credentials: (name: string, email: string, password: string, frontendUrl: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Credentials - Moulavi ERP</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); opacity: 0.1; }
        .logo { font-size: 28px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1; }
        .tagline { font-size: 14px; opacity: 0.9; position: relative; z-index: 1; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
        .message { font-size: 16px; margin-bottom: 30px; color: #555; }
        .credentials-box { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #E3000F; padding: 25px; margin: 25px 0; border-radius: 12px; position: relative; }
        .credentials-box::before { content: '🔐'; position: absolute; top: -15px; left: 20px; background: #E3000F; color: white; padding: 8px 12px; border-radius: 50%; font-size: 16px; }
        .credential-item { margin: 12px 0; font-size: 16px; }
        .credential-label { font-weight: 600; color: #E3000F; display: inline-block; min-width: 80px; }
        .credential-value { font-family: 'Courier New', monospace; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #dee2e6; margin-left: 10px; }
        .warning-box { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 5px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .warning-icon { color: #856404; font-size: 18px; margin-right: 8px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 25px 0; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(227, 0, 15, 0.3); }
        .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(227, 0, 15, 0.4); }
        .support-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center; }
        .footer { background: #2c3e50; color: #bdc3c7; padding: 30px; text-align: center; }
        .footer-logo { font-size: 20px; font-weight: 700; color: #E3000F; margin-bottom: 10px; }
        .footer-text { font-size: 14px; margin: 5px 0; }
        .social-links { margin: 20px 0; }
        .social-link { display: inline-block; margin: 0 10px; color: #bdc3c7; text-decoration: none; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #E3000F, transparent); margin: 30px 0; }
        @media (max-width: 600px) {
          .email-container { margin: 0; box-shadow: none; }
          .header, .content, .footer { padding: 20px; }
          .logo { font-size: 24px; }
          .cta-button { display: block; text-align: center; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">MOULAVI ERP</div>
          <div class="tagline">Professional Business Solutions</div>
        </div>
        
        <div class="content">
          <div class="greeting">Dear ${name},</div>
          
          <div class="message">
            Welcome to Moulavi ERP! Your account has been successfully created and is ready for use. 
            Below are your login credentials to access your personalized dashboard.
          </div>
          
          <div class="credentials-box">
            <div class="credential-item">
              <span class="credential-label">Email:</span>
              <span class="credential-value">${email}</span>
            </div>
            <div class="credential-item">
              <span class="credential-label">Password:</span>
              <span class="credential-value">${password}</span>
            </div>
          </div>
          
          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <strong>Security Notice:</strong> For your account security, please change your password immediately after your first login.
          </div>
          
          <div style="text-align: center;">
            <a href="${frontendUrl}/party-auth" class="cta-button">Access Your Account</a>
          </div>
          
          <div class="divider"></div>
          
          <div class="support-info">
            <p><strong>Need Help?</strong></p>
            <p>Our support team is available 24/7 to assist you with any questions or technical issues.</p>
            <p>📧 Email: support@moulavi.in | 📞 Phone: +91-XXX-XXX-XXXX</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">MOULAVI ERP</div>
          <div class="footer-text">Professional Business Solutions</div>
          <div class="social-links">
            <a href="#" class="social-link">LinkedIn</a>
            <a href="#" class="social-link">Twitter</a>
            <a href="#" class="social-link">Facebook</a>
          </div>
          <div class="footer-text">© 2025 Moulavi ERP System. All rights reserved.</div>
          <div class="footer-text">This is an automated email. Please do not reply to this message.</div>
        </div>
      </div>
    </body>
    </html>
  `,

  serviceConfirmation: (name: string, serviceType: string, bookingId: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Service Request Confirmation - Moulavi ERP</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .email-container { max-width: 650px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 40px 30px; text-align: center; position: relative; }
        .header::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>'); opacity: 0.1; }
        .logo { font-size: 28px; font-weight: 700; margin-bottom: 10px; position: relative; z-index: 1; }
        .tagline { font-size: 14px; opacity: 0.9; position: relative; z-index: 1; }
        .success-icon { font-size: 48px; margin-bottom: 20px; position: relative; z-index: 1; }
        .content { padding: 40px 30px; background-color: #ffffff; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
        .message { font-size: 16px; margin-bottom: 30px; color: #555; }
        .service-details { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px solid #E3000F; padding: 25px; margin: 25px 0; border-radius: 12px; position: relative; }
        .service-details::before { content: '📋'; position: absolute; top: -15px; left: 20px; background: #E3000F; color: white; padding: 8px 12px; border-radius: 50%; font-size: 16px; }
        .detail-item { margin: 12px 0; font-size: 16px; }
        .detail-label { font-weight: 600; color: #E3000F; display: inline-block; min-width: 120px; }
        .detail-value { background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #dee2e6; margin-left: 10px; }
        .status-box { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-left: 5px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .status-icon { color: #155724; font-size: 18px; margin-right: 8px; }
        .next-steps { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; }
        .step-item { margin: 10px 0; padding-left: 25px; position: relative; }
        .step-item::before { content: '✓'; position: absolute; left: 0; color: #E3000F; font-weight: bold; }
        .footer { background: #2c3e50; color: #bdc3c7; padding: 30px; text-align: center; }
        .footer-logo { font-size: 20px; font-weight: 700; color: #E3000F; margin-bottom: 10px; }
        .footer-text { font-size: 14px; margin: 5px 0; }
        .social-links { margin: 20px 0; }
        .social-link { display: inline-block; margin: 0 10px; color: #bdc3c7; text-decoration: none; }
        .divider { height: 2px; background: linear-gradient(90deg, transparent, #E3000F, transparent); margin: 30px 0; }
        @media (max-width: 600px) {
          .email-container { margin: 0; box-shadow: none; }
          .header, .content, .footer { padding: 20px; }
          .logo { font-size: 24px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">MOULAVI ERP</div>
          <div class="tagline">Professional Business Solutions</div>
          <div class="success-icon">✅</div>
        </div>
        
        <div class="content">
          <div class="greeting">Dear ${name},</div>
          
          <div class="message">
            Thank you for choosing Moulavi ERP! Your service request has been successfully submitted and is now being processed by our team.
          </div>
          
          <div class="service-details">
            <div class="detail-item">
              <span class="detail-label">Service Type:</span>
              <span class="detail-value">${serviceType}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Booking ID:</span>
              <span class="detail-value">${bookingId}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Submitted:</span>
              <span class="detail-value">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          <div class="status-box">
            <span class="status-icon">📋</span>
            <strong>Status:</strong> Your request is currently under review. Our team will process it within 24-48 hours and keep you updated on the progress.
          </div>
          
          <div class="next-steps">
            <h3 style="color: #E3000F; margin-bottom: 15px;">What happens next?</h3>
            <div class="step-item">Our team will review your request and verify all submitted documents</div>
            <div class="step-item">You will receive updates via email at each processing stage</div>
            <div class="step-item">Once approved, you'll receive your service confirmation</div>
            <div class="step-item">Our support team will be available throughout the process</div>
          </div>
          
          <div class="divider"></div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
            <p><strong>Questions or Concerns?</strong></p>
            <p>Our dedicated support team is here to help you every step of the way.</p>
            <p>📧 Email: support@moulavi.in | 📞 Phone: +91-XXX-XXX-XXXX</p>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-logo">MOULAVI ERP</div>
          <div class="footer-text">Professional Business Solutions</div>
          <div class="social-links">
            <a href="#" class="social-link">LinkedIn</a>
            <a href="#" class="social-link">Twitter</a>
            <a href="#" class="social-link">Facebook</a>
          </div>
          <div class="footer-text">© 2025 Moulavi ERP System. All rights reserved.</div>
          <div class="footer-text">This is an automated email. Please do not reply to this message.</div>
        </div>
      </div>
    </body>
    </html>
  `,
} as const;

// Utility function to send email with error handling
const sendEmail = async (mailOptions: nodemailer.SendMailOptions): Promise<void> => {
  const logPrefix = '[EMAIL]';
  
  // Check if email is enabled
  if (!EMAIL_ENABLED) {
    console.log(`${logPrefix} ⚠️ Email sending is disabled (EMAIL_ENABLED=false). Skipping email.`);
    console.log(`${logPrefix} To: ${mailOptions.to || 'null'}`);
    console.log(`${logPrefix} Subject: ${mailOptions.subject || 'null'}`);
    console.log(`${logPrefix} ========== END: Email Skipped (Disabled) ==========`);
    return;
  }

  const startTime = Date.now();
  
  console.log(`${logPrefix} ========== START: Sending Email ==========`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} To: ${mailOptions.to || 'null'}`);
  console.log(`${logPrefix} Subject: ${mailOptions.subject || 'null'}`);
  console.log(`${logPrefix} From: ${mailOptions.from || EMAIL_CONFIG.from}`);
  console.log(`${logPrefix} CC: ${mailOptions.cc || 'none'}`);
  console.log(`${logPrefix} BCC: ${mailOptions.bcc || 'none'}`);
  console.log(`${logPrefix} Has Attachments: ${mailOptions.attachments ? mailOptions.attachments.length : 0}`);
  
  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    mailOptions.attachments.forEach((att, idx) => {
      console.log(`${logPrefix}   Attachment ${idx + 1}: ${att.filename || 'unnamed'} (${att.content ? 'Buffer' : 'path'})`);
    });
  }

  // Log SMTP configuration (masked)
  console.log(`${logPrefix} SMTP Configuration:`);
  const smtpOptions = transporter.options as any;
  console.log(`${logPrefix}   Host: ${smtpOptions.host || process.env.SMTP_HOST || 'not set'}`);
  console.log(`${logPrefix}   Port: ${smtpOptions.port || process.env.SMTP_PORT || 'not set'}`);
  console.log(`${logPrefix}   Secure: ${smtpOptions.secure || process.env.SMTP_SECURE === 'true' || false}`);
  const authUser = smtpOptions.auth?.user || process.env.SMTP_USER;
  console.log(`${logPrefix}   User: ${authUser ? `${authUser.substring(0, 3)}***` : 'not set'}`);

  try {
    // Verify SMTP connection (helps catch configuration issues early)
    console.log(`${logPrefix} Verifying SMTP connection...`);
    const verifyStartTime = Date.now();
    try {
      await transporter.verify();
      const verifyDuration = Date.now() - verifyStartTime;
      console.log(`${logPrefix} ✓ SMTP connection verified successfully in ${verifyDuration}ms`);
    } catch (verifyError: any) {
      console.error(`${logPrefix} ⚠️ SMTP verification failed (will still attempt to send):`, verifyError?.message);
      // Don't throw here - some SMTP servers don't support verify but still work
      // We'll catch the actual send error if it fails
    }
    
    console.log(`${logPrefix} Sending email via SMTP...`);
    const sendStartTime = Date.now();
    const result = await transporter.sendMail(mailOptions);
    const sendDuration = Date.now() - sendStartTime;
    const totalDuration = Date.now() - startTime;
    
    console.log(`${logPrefix} ✅ SUCCESS: Email sent successfully`);
    console.log(`${logPrefix} Message ID: ${result.messageId || 'N/A'}`);
    console.log(`${logPrefix} Response: ${result.response || 'N/A'}`);
    console.log(`${logPrefix} Accepted: ${result.accepted?.join(', ') || 'N/A'}`);
    console.log(`${logPrefix} Rejected: ${result.rejected?.join(', ') || 'none'}`);
    console.log(`${logPrefix} Send Duration: ${sendDuration}ms`);
    console.log(`${logPrefix} Total Duration: ${totalDuration}ms`);
    console.log(`${logPrefix} ========== END: Email Sent Successfully ==========`);
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`${logPrefix} ❌ EXCEPTION: Error sending email`);
    console.error(`${logPrefix} Duration before error: ${totalDuration}ms`);
    console.error(`${logPrefix} Error Type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`${logPrefix} Error Message: ${error?.message || 'Unknown error'}`);
    console.error(`${logPrefix} Error Code: ${error?.code || 'Unknown code'}`);
    console.error(`${logPrefix} Error Stack:`, error?.stack || 'No stack trace available');
    
    if (error?.command) {
      console.error(`${logPrefix} SMTP Command: ${error.command}`);
    }
    
    if (error?.response) {
      console.error(`${logPrefix} SMTP Response: ${error.response}`);
    }
    
    if (error?.responseCode) {
      console.error(`${logPrefix} SMTP Response Code: ${error.responseCode}`);
    }
    
    console.error(`${logPrefix} To: ${mailOptions.to || 'null'}`);
    console.error(`${logPrefix} Subject: ${mailOptions.subject || 'null'}`);
    console.error(`${logPrefix} ========== END: Exception ==========`);
    throw new Error(`Failed to send email: ${error?.message || 'Unknown error'}`);
  }
};

// Send credentials email
export const sendCredentialsEmail = async (
  to: string,
  name: string,
  email: string,
  password: string,
  phoneNumber?: string
): Promise<void> => {
  console.log('[EMAIL] ========== sendCredentialsEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    name: name || 'null',
    email: email || 'null',
    password: password ? '***masked***' : 'null',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'not provided',
  });
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: 'Your Moulavi ERP Account Credentials',
    html: EMAIL_TEMPLATES.credentials(name, email, password, EMAIL_CONFIG.frontendUrl),
  };
  
  console.log('[EMAIL] Email template generated');
  const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
  console.log('[EMAIL] HTML length:', htmlLength);
  
  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
      console.log('[EMAIL] ✅ sendCredentialsEmail email sent successfully');
    }
    
    // Send WhatsApp message if phone number is provided (always attempt, regardless of email status)
    if (phoneNumber) {
      console.log('[EMAIL] Attempting to send WhatsApp credentials...');
      try {
        const { sendCredentialsWhatsApp } = await import('./whatsappService');
        await sendCredentialsWhatsApp(phoneNumber, name, email, password);
        console.log('[EMAIL] ✅ WhatsApp credentials sent successfully');
      } catch (error: any) {
        console.error('[EMAIL] ❌ Failed to send WhatsApp credentials:', error?.message || 'Unknown error');
        console.error('[EMAIL] Error details:', error);
        // Don't throw error to avoid breaking flow
      }
    } else {
      console.log('[EMAIL] No phone number provided, skipping WhatsApp');
    }
    
    console.log('[EMAIL] ✅ sendCredentialsEmail completed successfully');
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendCredentialsEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    // If email is disabled, we still want to proceed with WhatsApp
    if (EMAIL_ENABLED) {
      throw error;
    }
  }
};

// Send service confirmation email
export const sendServiceConfirmationEmail = async (
  to: string,
  name: string,
  serviceType: string,
  bookingId: string,
  phoneNumber?: string
): Promise<void> => {
  console.log('[EMAIL] ========== sendServiceConfirmationEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    name: name || 'null',
    serviceType: serviceType || 'null',
    bookingId: bookingId || 'null',
    phoneNumber: phoneNumber ? `${phoneNumber.substring(0, 3)}***${phoneNumber.substring(phoneNumber.length - 2)}` : 'not provided',
  });
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: `${serviceType} Service Request Confirmation`,
    html: EMAIL_TEMPLATES.serviceConfirmation(name, serviceType, bookingId),
  };
  
  console.log('[EMAIL] Email template generated');
  const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
  console.log('[EMAIL] HTML length:', htmlLength);
  
  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
      console.log('[EMAIL] ✅ sendServiceConfirmationEmail email sent successfully');
    }
    
    // Send WhatsApp message if phone number is provided (always attempt, regardless of email status)
    if (phoneNumber) {
      console.log('[EMAIL] Attempting to send WhatsApp service confirmation...');
      try {
        const { sendServiceConfirmationWhatsApp } = await import('./whatsappService');
        await sendServiceConfirmationWhatsApp(phoneNumber, name, serviceType, bookingId);
        console.log('[EMAIL] ✅ WhatsApp service confirmation sent successfully');
      } catch (error: any) {
        console.error('[EMAIL] ❌ Failed to send WhatsApp service confirmation:', error?.message || 'Unknown error');
        console.error('[EMAIL] Error details:', error);
        // Don't throw error to avoid breaking flow
      }
    } else {
      console.log('[EMAIL] No phone number provided, skipping WhatsApp');
    }
    
    console.log('[EMAIL] ✅ sendServiceConfirmationEmail completed successfully');
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendServiceConfirmationEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    // If email is disabled, we still want to proceed with WhatsApp
    if (EMAIL_ENABLED) {
      throw error;
    }
  }
};

// Send bill email with PDF attachment
export const sendBillEmail = async (
  to: string,
  partyName: string,
  groupNumber: string,
  groupName: string,
  pdfBuffer: Buffer
): Promise<void> => {
  console.log('[EMAIL] ========== sendBillEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
    partyName: partyName || 'null',
    groupNumber: groupNumber || 'null',
    groupName: groupName || 'null',
    pdfBufferSize: pdfBuffer ? `${(pdfBuffer.length / 1024).toFixed(2)} KB` : 'null',
  });
  
  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: `Bill for ${groupNumber}, ${groupName} generated`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill Generated</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #E3000F 0%, #C7000A 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #ffffff; }
          .message { font-size: 16px; margin-bottom: 20px; color: #555; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bill Generated</h1>
          </div>
          <div class="content">
            <p class="message">
              Dear ${partyName},
            </p>
            <p class="message">
              The bill for Group ${groupNumber} (${groupName}) has been generated and is attached to this email.
            </p>
            <p class="message">
              Please find the bill PDF attached below.
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from Moulavi ERP System.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `Bill_${groupNumber}_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  };
  
  console.log('[EMAIL] Email template generated with PDF attachment');
  const htmlLength = typeof mailOptions.html === 'string' ? mailOptions.html.length : 0;
  console.log('[EMAIL] HTML length:', htmlLength);
  console.log('[EMAIL] Attachment filename:', mailOptions.attachments?.[0]?.filename || 'N/A');
  
  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
      console.log('[EMAIL] ✅ sendBillEmail completed successfully');
    } else {
      console.log('[EMAIL] ✅ sendBillEmail skipped (email disabled)');
    }
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendBillEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    if (EMAIL_ENABLED) {
      throw error;
    }
  }
};

// Export transporter for testing purposes
// Send movement update email
export const sendMovementUpdateEmail = async (
  to: string,
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
  const emailSubject = `Movement Update - Voucher ${voucherNumber}`;
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Movement Update - Moulavi ERP</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #E3000F;">Movement Details Updated</h2>
        <p>Dear ${partyName},</p>
        <p>Your movement details have been updated for voucher <strong>${voucherNumber}</strong>.</p>
        <h3 style="color: #E3000F; margin-top: 20px;">Movement Details:</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;"><strong>Date:</strong> ${movementDetails.date}</li>
          <li style="margin: 10px 0;"><strong>Time:</strong> ${movementDetails.time || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>From:</strong> ${movementDetails.fromLocation || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>To:</strong> ${movementDetails.toLocation || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>Driver 1:</strong> ${movementDetails.driverDetails1 || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>Driver 2:</strong> ${movementDetails.driverDetails2 || 'N/A'}</li>
          <li style="margin: 10px 0;"><strong>Vehicle Number:</strong> ${movementDetails.vehicleNumber || 'N/A'}</li>
        </ul>
        <p style="margin-top: 20px;">Thank you for choosing our services.</p>
      </div>
    </body>
    </html>
  `;

  const mailOptions: nodemailer.SendMailOptions = {
    from: EMAIL_CONFIG.from,
    to,
    subject: emailSubject,
    html: emailHtml,
  };

  console.log('[EMAIL] ========== sendMovementUpdateEmail called ==========');
  console.log('[EMAIL] Parameters:', {
    to: to || 'null',
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
  console.log('[EMAIL] Email template generated');
  console.log('[EMAIL] HTML length:', emailHtml.length);

  try {
    // Attempt to send email (will be skipped if EMAIL_ENABLED=false)
    await sendEmail(mailOptions);
    if (EMAIL_ENABLED) {
      console.log('[EMAIL] ✅ sendMovementUpdateEmail completed successfully');
    } else {
      console.log('[EMAIL] ✅ sendMovementUpdateEmail skipped (email disabled)');
    }
  } catch (error: any) {
    console.error('[EMAIL] ❌ sendMovementUpdateEmail failed:', error?.message || 'Unknown error');
    // Only throw error if email was enabled and failed
    if (EMAIL_ENABLED) {
      throw error;
    }
  }
};

export { transporter };