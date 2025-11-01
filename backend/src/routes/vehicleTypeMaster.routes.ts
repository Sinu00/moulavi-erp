import { Router, Response } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import type { AuthRequest } from '../types';

const router = Router();

// Validation middleware for creating vehicle type
const createVehicleTypeValidation = [
  body('vehicleName').isString().notEmpty().trim().withMessage('Vehicle name is required'),
  body('paxCount').isInt({ min: 1 }).withMessage('PAX count must be at least 1'),
  body('isActive').optional().isBoolean(),
];

const updateVehicleTypeValidation = [
  body('vehicleName').optional().isString().notEmpty().trim(),
  body('paxCount').optional().isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
];

// Create new vehicle type
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createVehicleTypeValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { vehicleName, paxCount, isActive } = req.body;

    // Check if vehicle name already exists
    const existingVehicle = await prisma.vehicleTypeMaster.findFirst({
      where: { 
        vehicleName: vehicleName.trim(),
        isActive: true 
      }
    });

    if (existingVehicle) {
      return res.status(400).json({ 
        error: 'Vehicle type with this name already exists' 
      });
    }

    const vehicleType = await prisma.vehicleTypeMaster.create({
      data: {
        vehicleName: vehicleName.trim(),
        paxCount: parseInt(paxCount),
        isActive: isActive ?? true
      }
    });

    res.status(201).json({
      success: true,
      data: { vehicleTypeMaster: vehicleType },
      message: 'Vehicle type created successfully'
    });
  })
);

// Get all vehicle types
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '1000', search, isActive } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { vehicleName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }

    const [vehicleTypes, total] = await Promise.all([
      prisma.vehicleTypeMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { vehicleName: 'asc' }
      }),
      prisma.vehicleTypeMaster.count({ where })
    ]);

    res.json({
      success: true,
      data: { vehicleTypeMasters: vehicleTypes },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  })
);

// Get active vehicle types (public endpoint)
router.get(
  '/active',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const vehicleTypes = await prisma.vehicleTypeMaster.findMany({
      where: { isActive: true },
      orderBy: { vehicleName: 'asc' }
    });

    res.json({
      success: true,
      data: { vehicleTypeMasters: vehicleTypes }
    });
  })
);

// Get vehicle type by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const vehicleType = await prisma.vehicleTypeMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transports: true }
        }
      }
    });

    if (!vehicleType) {
      return res.status(404).json({ error: 'Vehicle type not found' });
    }

    res.json({
      success: true,
      data: { vehicleTypeMaster: vehicleType }
    });
  })
);

// Update vehicle type
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateVehicleTypeValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { vehicleName, paxCount, isActive } = req.body;

    // Check if vehicle type exists
    const existingVehicle = await prisma.vehicleTypeMaster.findUnique({
      where: { id }
    });

    if (!existingVehicle) {
      return res.status(404).json({ error: 'Vehicle type not found' });
    }

    // Check if vehicle name already exists (excluding current vehicle)
    if (vehicleName && vehicleName.trim() !== existingVehicle.vehicleName) {
      const duplicateVehicle = await prisma.vehicleTypeMaster.findFirst({
        where: { 
          vehicleName: vehicleName.trim(),
          isActive: true,
          id: { not: id }
        }
      });

      if (duplicateVehicle) {
        return res.status(400).json({ 
          error: 'Vehicle type with this name already exists' 
        });
      }
    }

    const updatedVehicle = await prisma.vehicleTypeMaster.update({
      where: { id },
      data: {
        vehicleName: vehicleName !== undefined ? vehicleName.trim() : undefined,
        paxCount: paxCount !== undefined ? parseInt(paxCount) : undefined,
        isActive
      }
    });

    res.json({
      success: true,
      data: { vehicleTypeMaster: updatedVehicle },
      message: 'Vehicle type updated successfully'
    });
  })
);

// Toggle vehicle type status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const vehicleType = await prisma.vehicleTypeMaster.findUnique({
      where: { id }
    });

    if (!vehicleType) {
      return res.status(404).json({ error: 'Vehicle type not found' });
    }

    const updatedVehicle = await prisma.vehicleTypeMaster.update({
      where: { id },
      data: { isActive: !vehicleType.isActive }
    });

    res.json({
      success: true,
      data: { vehicleTypeMaster: updatedVehicle },
      message: `Vehicle type ${updatedVehicle.isActive ? 'activated' : 'deactivated'} successfully`
    });
  })
);

// Delete vehicle type
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const vehicleType = await prisma.vehicleTypeMaster.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transports: true }
        }
      }
    });

    if (!vehicleType) {
      return res.status(404).json({ error: 'Vehicle type not found' });
    }

    // Check if vehicle type has related transports
    if (vehicleType._count.transports > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vehicle type',
        message: `This vehicle type has ${vehicleType._count.transports} transport route(s) associated with it. Please remove or reassign all transport routes before deleting the vehicle type.`
      });
    }

    // Hard delete the vehicle type
    await prisma.vehicleTypeMaster.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Vehicle type deleted successfully'
    });
  })
);

export default router;

