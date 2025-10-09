import { Router, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { query } from '../config/database';
import { sendServiceConfirmationEmail } from '../services/emailService';

const router = Router();

// Validation for Umrah visa service
const umrahVisaValidation = [
  body('party_id').isUUID(),
  body('full_name').isString().notEmpty().trim(),
  body('passport_number').isString().notEmpty().trim(),
  body('nationality').isString().notEmpty().trim(),
  body('travel_date_from').isDate(),
  body('travel_date_to').isDate(),
  body('passport_expiry').isDate(),
  body('date_of_birth').isDate(),
  body('gender').isIn(['male', 'female']),
  body('phone_number').optional().isString(),
];

// Create Umrah Visa service
router.post(
  '/umrah-visa',
  authenticate,
  umrahVisaValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      party_id,
      full_name,
      passport_number,
      nationality,
      travel_date_from,
      travel_date_to,
      passport_expiry,
      date_of_birth,
      gender,
      phone_number,
    } = req.body;
    
    // Verify party exists
    const partyResult = await query(
      'SELECT id, party_name, email FROM parties WHERE id = $1',
      [party_id]
    );
    
    if (partyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    const party = partyResult.rows[0];
    
    // For party role, ensure they can only create services for themselves
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (
        userPartyResult.rows.length === 0 ||
        userPartyResult.rows[0].id !== party_id
      ) {
        return res.status(403).json({ error: 'You can only create services for your own account' });
      }
    }
    
    // Create service
    const serviceResult = await query(
      `INSERT INTO services (service_type, party_id, status) 
       VALUES ('umrah_visa', $1, 'pending') 
       RETURNING *`,
      [party_id]
    );
    
    const service = serviceResult.rows[0];
    
    // Create Umrah visa details
    const visaDetailsResult = await query(
      `INSERT INTO umrah_visa_details (
        service_id, full_name, passport_number, nationality,
        travel_date_from, travel_date_to, passport_expiry,
        date_of_birth, gender, phone_number, status, party_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        service.id,
        full_name,
        passport_number,
        nationality,
        travel_date_from,
        travel_date_to,
        passport_expiry,
        date_of_birth,
        gender,
        phone_number,
        'pending', // Default status
        party.party_name, // Party name from the party record
      ]
    );
    
    // Send confirmation email
    try {
      await sendServiceConfirmationEmail(
        party.email,
        party.party_name,
        'Umrah Visa',
        service.id
      );
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
    
    res.status(201).json({
      service,
      details: visaDetailsResult.rows[0],
      message: 'Umrah visa service created successfully',
    });
  })
);

// Get all Umrah visa requests with party information (admin/staff only) - MUST come before /:id route
router.get(
  '/umrah-visa',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, page = '1', limit = '10' } = req.query;
    
    let queryText = `
      SELECT 
        uvd.*,
        s.id as service_id,
        s.status as service_status,
        s.submitted_at,
        s.created_at as service_created_at,
        p.email as party_email,
        p.contact_number,
        p.whatsapp_number
      FROM umrah_visa_details uvd
      JOIN services s ON uvd.service_id = s.id
      JOIN parties p ON s.party_id = p.id
      WHERE s.service_type = 'umrah_visa'
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      queryText += ` AND uvd.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    queryText += ' ORDER BY uvd.created_at DESC';
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit as string), offset);
    
    const result = await query(queryText, queryParams);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM umrah_visa_details uvd
      JOIN services s ON uvd.service_id = s.id
      WHERE s.service_type = 'umrah_visa'
    `;
    const countParams: any[] = [];
    let countIndex = 1;
    
    if (status) {
      countQuery += ` AND uvd.status = $${countIndex}`;
      countParams.push(status);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      umrahVisas: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

// Get all services (admin/staff view all, party view their own)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, service_type, page = '1', limit = '10' } = req.query;
    
    let queryText = `
      SELECT s.*, p.party_name, p.email as party_email 
      FROM services s 
      JOIN parties p ON s.party_id = p.id 
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;
    
    // If party role, only show their services
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (userPartyResult.rows.length === 0) {
        return res.json({ services: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      }
      
      queryText += ` AND s.party_id = $${paramIndex}`;
      queryParams.push(userPartyResult.rows[0].id);
      paramIndex++;
    }
    
    if (status) {
      queryText += ` AND s.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }
    
    if (service_type) {
      queryText += ` AND s.service_type = $${paramIndex}`;
      queryParams.push(service_type);
      paramIndex++;
    }
    
    queryText += ' ORDER BY s.submitted_at DESC';
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit as string), offset);
    
    const result = await query(queryText, queryParams);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM services s WHERE 1=1';
    const countParams: any[] = [];
    let countIndex = 1;
    
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (userPartyResult.rows.length > 0) {
        countQuery += ` AND s.party_id = $${countIndex}`;
        countParams.push(userPartyResult.rows[0].id);
        countIndex++;
      }
    }
    
    if (status) {
      countQuery += ` AND s.status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }
    
    if (service_type) {
      countQuery += ` AND s.service_type = $${countIndex}`;
      countParams.push(service_type);
    }
    
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      services: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

// Get service by ID with details
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const serviceResult = await query(
      `SELECT s.*, p.party_name, p.email as party_email, p.contact_number 
       FROM services s 
       JOIN parties p ON s.party_id = p.id 
       WHERE s.id = $1`,
      [id]
    );
    
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const service = serviceResult.rows[0];
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userPartyResult = await query(
        'SELECT id FROM parties WHERE user_id = $1',
        [req.user!.id]
      );
      
      if (
        userPartyResult.rows.length === 0 ||
        userPartyResult.rows[0].id !== service.party_id
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Get service-specific details
    let details = null;
    
    if (service.service_type === 'umrah_visa') {
      const visaResult = await query(
        'SELECT * FROM umrah_visa_details WHERE service_id = $1',
        [id]
      );
      details = visaResult.rows[0] || null;
    }
    
    // Get documents
    const documentsResult = await query(
      'SELECT * FROM documents WHERE service_id = $1',
      [id]
    );
    
    res.json({
      service,
      details,
      documents: documentsResult.rows,
    });
  })
);

// Update Umrah visa status (admin/staff only)
router.patch(
  '/umrah-visa/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'processing', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await query(
      'UPDATE umrah_visa_details SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Umrah visa request not found' });
    }
    
    res.json({ umrahVisa: result.rows[0] });
  })
);

// Update service status (admin/staff only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await query(
      'UPDATE services SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json({ service: result.rows[0] });
  })
);

export default router;

