import { Router, Response } from 'express';
import { body, query as validateQuery } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { query } from '../config/database';
import { hashPassword, generateRandomPassword } from '../utils/password';
import { sendCredentialsEmail } from '../services/emailService';

const router = Router();

// Validation middleware
const createPartyValidation = [
  body('party_name').isString().notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('contact_number').optional().isString(),
  body('whatsapp_number').optional().isString(),
  body('address').optional().isString(),
  body('gst_number').optional().isString(),
  body('customer_type').isIn(['direct', 'b2b']),
  body('account_currency').isIn(['SAR', 'INR', 'AED']),
  body('is_supplier').optional().isBoolean(),
  body('is_customer').optional().isBoolean(),
  body('login_required').optional().isBoolean(),
];

// Create party
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createPartyValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      party_name,
      email,
      contact_number,
      whatsapp_number,
      address,
      gst_number,
      customer_type,
      account_currency,
      is_supplier = false,
      is_customer = true,
      login_required = false,
    } = req.body;
    
    // Check if party email already exists
    const existingParty = await query(
      'SELECT id FROM parties WHERE email = $1',
      [email]
    );
    
    if (existingParty.rows.length > 0) {
      return res.status(400).json({ error: 'Party with this email already exists' });
    }
    
    let userId = null;
    let generatedPassword = null;
    
    // Create user account if login is required
    if (login_required) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      generatedPassword = generateRandomPassword();
      const hashedPassword = await hashPassword(generatedPassword);
      
      const userResult = await query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, 'party') 
         RETURNING id`,
        [party_name, email, hashedPassword]
      );
      
      userId = userResult.rows[0].id;
    }
    
    // Create party
    const partyResult = await query(
      `INSERT INTO parties (
        party_name, email, contact_number, whatsapp_number, address, 
        gst_number, customer_type, account_currency, is_supplier, 
        is_customer, login_required, user_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING *`,
      [
        party_name,
        email,
        contact_number,
        whatsapp_number,
        address,
        gst_number,
        customer_type,
        account_currency,
        is_supplier,
        is_customer,
        login_required,
        userId,
        req.user!.id,
      ]
    );
    
    const party = partyResult.rows[0];
    
    // Send credentials email if login is required
    if (login_required && generatedPassword) {
      try {
        await sendCredentialsEmail(email, party_name, email, generatedPassword);
      } catch (error) {
        console.error('Failed to send credentials email:', error);
        // Don't fail the request if email fails
      }
    }
    
    res.status(201).json({
      party,
      ...(login_required && generatedPassword && {
        message: 'Party created and credentials sent via email',
      }),
    });
  })
);

// Get all parties (with filters and pagination)
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      customer_type, 
      is_supplier, 
      is_customer,
      search,
      page = '1',
      limit = '10'
    } = req.query;
    
    let queryText = 'SELECT * FROM parties WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (customer_type) {
      queryText += ` AND customer_type = $${paramIndex}`;
      queryParams.push(customer_type);
      paramIndex++;
    }
    
    if (is_supplier !== undefined) {
      queryText += ` AND is_supplier = $${paramIndex}`;
      queryParams.push(is_supplier === 'true');
      paramIndex++;
    }
    
    if (is_customer !== undefined) {
      queryText += ` AND is_customer = $${paramIndex}`;
      queryParams.push(is_customer === 'true');
      paramIndex++;
    }
    
    if (search) {
      queryText += ` AND (party_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    // Add pagination
    queryText += ' ORDER BY created_at DESC';
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit as string), offset);
    
    const result = await query(queryText, queryParams);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM parties WHERE 1=1';
    const countParams: any[] = [];
    let countIndex = 1;
    
    if (customer_type) {
      countQuery += ` AND customer_type = $${countIndex}`;
      countParams.push(customer_type);
      countIndex++;
    }
    
    if (is_supplier !== undefined) {
      countQuery += ` AND is_supplier = $${countIndex}`;
      countParams.push(is_supplier === 'true');
      countIndex++;
    }
    
    if (is_customer !== undefined) {
      countQuery += ` AND is_customer = $${countIndex}`;
      countParams.push(is_customer === 'true');
      countIndex++;
    }
    
    if (search) {
      countQuery += ` AND (party_name ILIKE $${countIndex} OR email ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      parties: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

// Get party by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const result = await query('SELECT * FROM parties WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ party: result.rows[0] });
  })
);

// Update party
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      party_name,
      contact_number,
      whatsapp_number,
      address,
      gst_number,
      customer_type,
      account_currency,
      is_supplier,
      is_customer,
    } = req.body;
    
    const result = await query(
      `UPDATE parties SET 
        party_name = COALESCE($1, party_name),
        contact_number = COALESCE($2, contact_number),
        whatsapp_number = COALESCE($3, whatsapp_number),
        address = COALESCE($4, address),
        gst_number = COALESCE($5, gst_number),
        customer_type = COALESCE($6, customer_type),
        account_currency = COALESCE($7, account_currency),
        is_supplier = COALESCE($8, is_supplier),
        is_customer = COALESCE($9, is_customer)
      WHERE id = $10
      RETURNING *`,
      [
        party_name,
        contact_number,
        whatsapp_number,
        address,
        gst_number,
        customer_type,
        account_currency,
        is_supplier,
        is_customer,
        id,
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ party: result.rows[0] });
  })
);

// Delete party
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const result = await query('DELETE FROM parties WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ message: 'Party deleted successfully' });
  })
);

export default router;

