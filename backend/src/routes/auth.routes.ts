import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { comparePassword } from '../utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';

const router = Router();

// Validation middleware
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

// Login endpoint
router.post('/login', loginValidation, asyncHandler(async (req: AuthRequest, res: Response) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email, password } = req.body;
  
  console.log(`[Auth] Login attempt for email: ${email}`);
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    console.log(`[Auth] User not found for email: ${email}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  console.log(`[Auth] User found: ${user.name} (${user.role}), isActive: ${user.isActive}`);
  
  // Check if user is active
  if (!user.isActive) {
    return res.status(403).json({ error: 'Account is deactivated' });
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  console.log(`[Auth] Password validation result: ${isPasswordValid}`);
  
  if (!isPasswordValid) {
    console.log(`[Auth] Invalid password for user: ${email}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate tokens
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry()
    }
  });
  
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database
    const token = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        expiresAt: {
          gt: new Date()
        }
      }
    });
    
    if (!token) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    // Generate new access token
    const newAccessToken = generateAccessToken({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });
    
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}));

// Logout endpoint
router.post('/logout', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }
  
  res.json({ message: 'Logged out successfully' });
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
}));

// Test email endpoint (for debugging)
router.post(
  '/test-email',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    try {
      const { sendCredentialsEmail } = await import('../services/emailService');
      await sendCredentialsEmail(to, 'Test User', to, 'TestPassword123');
      
      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  })
);

// Test WhatsApp endpoint (for debugging)
router.post(
  '/test-whatsapp',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    try {
      const { sendCustomWhatsApp } = await import('../services/whatsappService');
      const testMessage = message || 'Test message from Moulavi ERP system';
      await sendCustomWhatsApp(phoneNumber, testMessage);
      
      res.json({ message: 'Test WhatsApp message sent successfully' });
    } catch (error) {
      console.error('Test WhatsApp error:', error);
      res.status(500).json({ error: 'Failed to send test WhatsApp message' });
    }
  })
);

export default router;

