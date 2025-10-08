import { Router, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { query } from '../config/database';
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
  const { email, password } = req.body;
  
  // Find user
  const userResult = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  
  if (userResult.rows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const user = userResult.rows[0];
  
  // Check if user is active
  if (!user.is_active) {
    return res.status(403).json({ error: 'Account is deactivated' });
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate tokens
  const payload = { id: user.id, email: user.email, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  // Store refresh token
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [user.id, refreshToken, getRefreshTokenExpiry()]
  );
  
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
    const tokenResult = await query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    
    if (tokenResult.rows.length === 0) {
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
    await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
  }
  
  res.json({ message: 'Logged out successfully' });
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userResult = await query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [req.user!.id]
  );
  
  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user: userResult.rows[0] });
}));

export default router;

