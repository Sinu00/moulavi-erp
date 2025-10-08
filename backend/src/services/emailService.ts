import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const sendCredentialsEmail = async (
  to: string,
  name: string,
  email: string,
  password: string
): Promise<void> => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const mailOptions = {
    from: `"Moulavi ERP System" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your Moulavi ERP Account Credentials',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #4F46E5; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Moulavi ERP</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Your account has been created successfully. Below are your login credentials:</p>
            
            <div class="credentials">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${password}</p>
            </p>
            
            <p>⚠️ <strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            
            <a href="${frontendUrl}/party-auth" class="button">Login to Your Account</a>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2025 Moulavi ERP System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Credentials email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send credentials email');
  }
};

export const sendServiceConfirmationEmail = async (
  to: string,
  name: string,
  serviceType: string,
  serviceId: string
): Promise<void> => {
  const mailOptions = {
    from: `"Moulavi ERP System" <${process.env.SMTP_USER}>`,
    to,
    subject: `${serviceType} Service Request Confirmation`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Service Request Received</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Your <strong>${serviceType}</strong> service request has been successfully submitted.</p>
            <p><strong>Request ID:</strong> ${serviceId}</p>
            <p>We will process your request and get back to you shortly.</p>
            <p>Thank you for choosing Moulavi ERP.</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Moulavi ERP System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
  
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
};

