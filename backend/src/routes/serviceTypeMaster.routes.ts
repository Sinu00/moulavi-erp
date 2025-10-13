import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateServiceTypeMasterRequest, UpdateServiceTypeMasterRequest } from '../types';

const router = Router();

const createServiceTypeMasterValidation = [
  body('serviceCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }),
  body('serviceName').isString().notEmpty().trim(),
  body('category').isString().notEmpty().trim(),
];

const updateServiceTypeMasterValidation = [
  body('serviceCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }).optional(),
  body('serviceName').isString().notEmpty().trim().optional(),
  body('category').isString().notEmpty().trim().optional(),
  body('description').isString().optional(),
  body('isActive').isBoolean().optional(),
];

// Create Service Type Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createServiceTypeMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { serviceCode, serviceName, category, description } = req.body as CreateServiceTypeMasterRequest;

    const existingServiceType = await prisma.serviceTypeMaster.findUnique({
      where: { serviceCode },
    });

    if (existingServiceType) {
      return res.status(400).json({ error: 'Service type with this code already exists' });
    }

    const serviceTypeMaster = await prisma.serviceTypeMaster.create({
      data: {
        serviceCode,
        serviceName,
        category,
        description,
      },
    });

    res.status(201).json({ serviceTypeMaster });
  })
);

// Get all Service Type Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive, category } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { serviceName: { contains: search, mode: 'insensitive' } },
        { serviceCode: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (category) {
      where.category = category;
    }

    const [serviceTypeMasters, total] = await Promise.all([
      prisma.serviceTypeMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { serviceName: 'asc' },
      }),
      prisma.serviceTypeMaster.count({ where }),
    ]);

    res.json({
      serviceTypeMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active service types for dropdowns
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category } = req.query;

    const where: any = { isActive: true };
    if (category) {
      where.category = category;
    }

    const serviceTypeMasters = await prisma.serviceTypeMaster.findMany({
      where,
      orderBy: { serviceName: 'asc' },
      select: {
        id: true,
        serviceCode: true,
        serviceName: true,
        category: true,
      },
    });

    res.json({ serviceTypeMasters });
  })
);

// Get Service Type Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const serviceTypeMaster = await prisma.serviceTypeMaster.findUnique({
      where: { id },
    });

    if (!serviceTypeMaster) {
      return res.status(404).json({ error: 'Service Type Master not found' });
    }

    res.json({ serviceTypeMaster });
  })
);

// Update Service Type Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateServiceTypeMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { serviceCode, serviceName, category, description, isActive } = req.body as UpdateServiceTypeMasterRequest;

    const serviceTypeMaster = await prisma.serviceTypeMaster.update({
      where: { id },
      data: {
        serviceCode,
        serviceName,
        category,
        description,
        isActive,
      },
    });

    res.json({ serviceTypeMaster });
  })
);

// Toggle Service Type Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const serviceTypeMaster = await prisma.serviceTypeMaster.findUnique({
      where: { id },
    });

    if (!serviceTypeMaster) {
      return res.status(404).json({ error: 'Service Type Master not found' });
    }

    const updatedServiceTypeMaster = await prisma.serviceTypeMaster.update({
      where: { id },
      data: { isActive: !serviceTypeMaster.isActive },
    });

    res.json({ serviceTypeMaster: updatedServiceTypeMaster });
  })
);

// Delete Service Type Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.serviceTypeMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;
