import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

const router = Router();

const createTransportMasterValidation = [
  body('vehicleRoute').isString().notEmpty().trim(),
  body('vehicleType').isString().notEmpty().trim(),
  body('pax').isInt({ min: 1 }),
  body('price').isDecimal({ decimal_digits: '0,2' }),
];

const updateTransportMasterValidation = [
  body('vehicleRoute').optional().isString().notEmpty().trim(),
  body('vehicleType').optional().isString().notEmpty().trim(),
  body('pax').optional().isInt({ min: 1 }),
  body('price').optional().isDecimal({ decimal_digits: '0,2' }),
  body('isActive').optional().isBoolean(),
];

// Create transport master
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createTransportMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { vehicleRoute, vehicleType, pax, price } = req.body;
    
    // Check if combination already exists
    const existingTransport = await prisma.transportMaster.findUnique({
      where: {
        vehicleRoute_vehicleType_pax: {
          vehicleRoute,
          vehicleType,
          pax
        }
      }
    });
    
    if (existingTransport) {
      return res.status(400).json({ 
        error: 'Transport combination already exists',
        details: 'A transport with this route, type, and PAX already exists'
      });
    }
    
    const transportMaster = await prisma.transportMaster.create({
      data: {
        vehicleRoute,
        vehicleType,
        pax,
        price: parseFloat(price)
      }
    });
    
    res.status(201).json({ transportMaster });
  })
);

// Get all transport masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, vehicleRoute, vehicleType, isActive } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { vehicleRoute: { contains: search, mode: 'insensitive' } },
        { vehicleType: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (vehicleRoute) {
      where.vehicleRoute = vehicleRoute;
    }
    
    if (vehicleType) {
      where.vehicleType = vehicleType;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const [transportMasters, total] = await Promise.all([
      prisma.transportMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { vehicleRoute: 'asc' },
          { vehicleType: 'asc' },
          { pax: 'asc' }
        ]
      }),
      prisma.transportMaster.count({ where })
    ]);
    
    res.json({
      transportMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get transport masters by route
router.get(
  '/by-route/:route',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { route } = req.params;
    
    const transportMasters = await prisma.transportMaster.findMany({
      where: {
        vehicleRoute: route,
        isActive: true
      },
      orderBy: [
        { vehicleType: 'asc' },
        { pax: 'asc' }
      ]
    });
    
    res.json({ transportMasters });
  })
);

// Get transport pricing
router.get(
  '/pricing',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { route, vehicleType, pax } = req.query;
    
    if (!route || !vehicleType || !pax) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        details: 'route, vehicleType, and pax are required'
      });
    }
    
    const transportMaster = await prisma.transportMaster.findUnique({
      where: {
        vehicleRoute_vehicleType_pax: {
          vehicleRoute: route as string,
          vehicleType: vehicleType as string,
          pax: parseInt(pax as string)
        }
      }
    });
    
    if (!transportMaster) {
      return res.status(404).json({ 
        error: 'Transport pricing not found',
        details: `No pricing found for ${vehicleType} with ${pax} PAX on route ${route}`
      });
    }
    
    res.json({ 
      price: transportMaster.price,
      transportMaster 
    });
  })
);

// Get transport master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const transportMaster = await prisma.transportMaster.findUnique({
      where: { id }
    });
    
    if (!transportMaster) {
      return res.status(404).json({ error: 'Transport master not found' });
    }
    
    res.json({ transportMaster });
  })
);

// Update transport master
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateTransportMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if transport master exists
    const existingTransport = await prisma.transportMaster.findUnique({
      where: { id }
    });
    
    if (!existingTransport) {
      return res.status(404).json({ error: 'Transport master not found' });
    }
    
    // If updating unique combination, check for conflicts
    if (updateData.vehicleRoute || updateData.vehicleType || updateData.pax) {
      const vehicleRoute = updateData.vehicleRoute || existingTransport.vehicleRoute;
      const vehicleType = updateData.vehicleType || existingTransport.vehicleType;
      const pax = updateData.pax || existingTransport.pax;
      
      const conflictingTransport = await prisma.transportMaster.findFirst({
        where: {
          vehicleRoute,
          vehicleType,
          pax,
          id: { not: id }
        }
      });
      
      if (conflictingTransport) {
        return res.status(400).json({ 
          error: 'Transport combination already exists',
          details: 'A transport with this route, type, and PAX already exists'
        });
      }
    }
    
    // Convert price to decimal if provided
    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
    }
    
    const transportMaster = await prisma.transportMaster.update({
      where: { id },
      data: updateData
    });
    
    res.json({ transportMaster });
  })
);

// Delete transport master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const transportMaster = await prisma.transportMaster.findUnique({
      where: { id }
    });
    
    if (!transportMaster) {
      return res.status(404).json({ error: 'Transport master not found' });
    }
    
    await prisma.transportMaster.delete({
      where: { id }
    });
    
    res.json({ message: 'Transport master deleted successfully' });
  })
);

// Toggle transport master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const transportMaster = await prisma.transportMaster.findUnique({
      where: { id }
    });
    
    if (!transportMaster) {
      return res.status(404).json({ error: 'Transport master not found' });
    }
    
    const updatedTransportMaster = await prisma.transportMaster.update({
      where: { id },
      data: { isActive: !transportMaster.isActive }
    });
    
    res.json({ transportMaster: updatedTransportMaster });
  })
);

export default router;
