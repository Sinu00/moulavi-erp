import { Router, Response } from 'express';
import { body, query as validateQuery } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
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
    const existingParty = await prisma.party.findUnique({
      where: { email }
    });
    
    if (existingParty) {
      return res.status(400).json({ error: 'Party with this email already exists' });
    }
    
    let userId = null;
    let generatedPassword = null;
    
    // Create user account if login is required
    if (login_required) {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      
      generatedPassword = generateRandomPassword();
      const hashedPassword = await hashPassword(generatedPassword);
      
      const user = await prisma.user.create({
        data: {
          name: party_name,
          email,
          password: hashedPassword,
          role: 'party'
        }
      });
      
      userId = user.id;
    }
    
    // Create party
    const party = await prisma.party.create({
      data: {
        partyName: party_name,
        email,
        contactNumber: contact_number,
        whatsappNumber: whatsapp_number,
        address,
        gstNumber: gst_number,
        customerType: customer_type,
        accountCurrency: account_currency,
        isSupplier: is_supplier,
        isCustomer: is_customer,
        loginRequired: login_required,
        userId,
        createdBy: req.user!.id
      }
    });
    
    // Send credentials email if login is required
    if (login_required && generatedPassword) {
      try {
        await sendCredentialsEmail(email, party_name, email, generatedPassword, whatsapp_number);
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
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Build where clause
    const where: any = {};
    
    if (customer_type) {
      where.customerType = customer_type;
    }
    
    if (is_supplier !== undefined) {
      where.isSupplier = is_supplier === 'true';
    }
    
    if (is_customer !== undefined) {
      where.isCustomer = is_customer === 'true';
    }
    
    if (search) {
      where.OR = [
        { partyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Get parties with pagination
    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.party.count({ where })
    ]);
    
    res.json({
      parties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get current user's party (for party role) - MUST come before /:id route
router.get(
  '/my-party',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only party role can access this endpoint
    if (req.user!.role !== 'party') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const party = await prisma.party.findUnique({
      where: { userId: req.user!.id }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ party });
  })
);

// Get party by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const party = await prisma.party.findUnique({
      where: { id }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    res.json({ party });
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
    
    const updateData: any = {};
    
    if (party_name !== undefined) updateData.partyName = party_name;
    if (contact_number !== undefined) updateData.contactNumber = contact_number;
    if (whatsapp_number !== undefined) updateData.whatsappNumber = whatsapp_number;
    if (address !== undefined) updateData.address = address;
    if (gst_number !== undefined) updateData.gstNumber = gst_number;
    if (customer_type !== undefined) updateData.customerType = customer_type;
    if (account_currency !== undefined) updateData.accountCurrency = account_currency;
    if (is_supplier !== undefined) updateData.isSupplier = is_supplier;
    if (is_customer !== undefined) updateData.isCustomer = is_customer;
    
    const party = await prisma.party.update({
      where: { id },
      data: updateData
    });
    
    res.json({ party });
  })
);

// Delete party
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    // First get the party to check if it has a user_id
    const party = await prisma.party.findUnique({
      where: { id },
      select: { userId: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    // Delete the party (this will cascade to related records)
    await prisma.party.delete({
      where: { id }
    });
    
    // If the party had a user account, delete it too
    if (party.userId) {
      await prisma.user.delete({
        where: { id: party.userId }
      });
    }
    
    res.json({ message: 'Party deleted successfully' });
  })
);

export default router;

