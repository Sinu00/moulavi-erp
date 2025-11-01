import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

const router = Router();

const createTransportMasterValidation = [
  body('fromLocationId').isUUID().notEmpty(),
  body('toLocationId').isUUID().notEmpty(),
  body('vehicleTypeId').isUUID().notEmpty(),
  body('price').isDecimal({ decimal_digits: '0,2' }),
  body('isActive').isBoolean().optional(),
];

const updateTransportMasterValidation = [
  body('fromLocationId').optional().isUUID(),
  body('toLocationId').optional().isUUID(),
  body('vehicleTypeId').optional().isUUID(),
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
    const { fromLocationId, toLocationId, vehicleTypeId, price, isActive } = req.body;
    
    // Check if combination already exists
    const existingTransport = await prisma.transportMaster.findUnique({
      where: {
        fromLocationId_toLocationId_vehicleTypeId: {
          fromLocationId,
          toLocationId,
          vehicleTypeId
        }
      }
    });
    
    if (existingTransport) {
      return res.status(400).json({ 
        error: 'Transport combination already exists',
        details: 'A transport with this route and vehicle type already exists'
      });
    }
    
    const transportMaster = await prisma.transportMaster.create({
      data: {
        fromLocationId,
        toLocationId,
        vehicleTypeId,
        price: parseFloat(price),
        isActive: isActive ?? true
      },
      include: {
        fromLocation: true,
        toLocation: true,
        vehicleType: true
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
    const { page = '1', limit = '10', search, fromLocationId, toLocationId, vehicleTypeId, isActive } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { vehicleType: { vehicleName: { contains: search, mode: 'insensitive' } } },
        { fromLocation: { name: { contains: search, mode: 'insensitive' } } },
        { toLocation: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    if (fromLocationId) {
      where.fromLocationId = fromLocationId;
    }
    
    if (toLocationId) {
      where.toLocationId = toLocationId;
    }
    
    if (vehicleTypeId) {
      where.vehicleTypeId = vehicleTypeId;
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
          { fromLocation: { name: 'asc' } },
          { toLocation: { name: 'asc' } },
          { vehicleType: { vehicleName: 'asc' } }
        ],
        include: {
          fromLocation: true,
          toLocation: true,
          vehicleType: true
        }
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

// Get transport masters by location route
router.get(
  '/by-locations/:fromLocationId/:toLocationId',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fromLocationId, toLocationId } = req.params;
    
    const transportMasters = await prisma.transportMaster.findMany({
      where: {
        fromLocationId,
        toLocationId,
        isActive: true
      },
      include: {
        fromLocation: true,
        toLocation: true,
        vehicleType: true
      },
      orderBy: [
        { vehicleType: { vehicleName: 'asc' } }
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
    
    // This endpoint is deprecated due to schema changes
    return res.status(400).json({
      error: 'Endpoint deprecated',
      message: 'Please use /by-locations/:fromLocationId/:toLocationId endpoint instead',
      details: 'The transport system now uses location-based routing'
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
      where: { id },
      include: {
        fromLocation: true,
        toLocation: true,
        vehicleType: true
      }
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
    if (updateData.fromLocationId || updateData.toLocationId || updateData.vehicleTypeId) {
      const fromLocationId = updateData.fromLocationId || existingTransport.fromLocationId;
      const toLocationId = updateData.toLocationId || existingTransport.toLocationId;
      const vehicleTypeId = updateData.vehicleTypeId || existingTransport.vehicleTypeId;
      
      const conflictingTransport = await prisma.transportMaster.findFirst({
        where: {
          fromLocationId,
          toLocationId,
          vehicleTypeId,
          id: { not: id }
        }
      });
      
      if (conflictingTransport) {
        return res.status(400).json({ 
          error: 'Transport combination already exists',
          details: 'A transport with this route and vehicle type already exists'
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
