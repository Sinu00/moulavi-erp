import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateTransportRouteMasterRequest, UpdateTransportRouteMasterRequest, RouteType } from '../types';

const router = Router();

const createTransportRouteMasterValidation = [
  body('city1Id').isUUID().notEmpty(),
  body('city2Id').isUUID().notEmpty(),
  body('city3Id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }).withMessage('city3Id must be a valid UUID or null'),
  body('city4Id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }).withMessage('city4Id must be a valid UUID or null'),
  body('routeType').isIn(['citytocity', 'airporttocity', 'citytoairport', 'tripandtour', 'fulltrip']),
  body('isActive').isBoolean().optional(),
];

const updateTransportRouteMasterValidation = [
  body('city1Id').isUUID().optional(),
  body('city2Id').isUUID().optional(),
  body('city3Id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }).withMessage('city3Id must be a valid UUID or null'),
  body('city4Id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }).withMessage('city4Id must be a valid UUID or null'),
  body('routeType').isIn(['citytocity', 'airporttocity', 'citytoairport', 'tripandtour', 'fulltrip']).optional(),
  body('isActive').isBoolean().optional(),
];

// Create Transport Route Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createTransportRouteMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { city1Id, city2Id, city3Id, city4Id, routeType, isActive } = req.body as CreateTransportRouteMasterRequest;

    // Verify cities exist
    const [city1, city2, city3, city4] = await Promise.all([
      prisma.cityMaster.findUnique({ where: { id: city1Id } }),
      prisma.cityMaster.findUnique({ where: { id: city2Id } }),
      city3Id ? prisma.cityMaster.findUnique({ where: { id: city3Id } }) : null,
      city4Id ? prisma.cityMaster.findUnique({ where: { id: city4Id } }) : null,
    ]);

    if (!city1) {
      return res.status(400).json({ error: 'Invalid city1 ID' });
    }
    if (!city2) {
      return res.status(400).json({ error: 'Invalid city2 ID' });
    }
    if (city3Id && !city3) {
      return res.status(400).json({ error: 'Invalid city3 ID' });
    }
    if (city4Id && !city4) {
      return res.status(400).json({ error: 'Invalid city4 ID' });
    }

    const transportRouteMaster = await prisma.transportRouteMaster.create({
      data: {
        city1Id,
        city2Id,
        city3Id: city3Id || null,
        city4Id: city4Id || null,
        routeType: routeType as RouteType,
        isActive: isActive ?? true,
      },
      include: {
        city1: {
          select: {
            id: true,
            name: true,
          },
        },
        city2: {
          select: {
            id: true,
            name: true,
          },
        },
        city3: {
          select: {
            id: true,
            name: true,
          },
        },
        city4: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ transportRouteMaster });
  })
);

// Get all Transport Route Masters with pagination and filters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string || '';
    const routeType = req.query.routeType as string;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { city1: { name: { contains: search, mode: 'insensitive' } } },
        { city2: { name: { contains: search, mode: 'insensitive' } } },
        { city3: { name: { contains: search, mode: 'insensitive' } } },
        { city4: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (routeType) {
      where.routeType = routeType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [transportRouteMasters, total] = await Promise.all([
      prisma.transportRouteMaster.findMany({
        where,
        skip,
        take: limit,
        include: {
          city1: {
            select: {
              id: true,
              name: true,
            },
          },
          city2: {
            select: {
              id: true,
              name: true,
            },
          },
          city3: {
            select: {
              id: true,
              name: true,
            },
          },
          city4: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.transportRouteMaster.count({ where }),
    ]);

    res.json({
      transportRouteMasters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get active Transport Route Masters only
router.get(
  '/active',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const transportRouteMasters = await prisma.transportRouteMaster.findMany({
      where: {
        isActive: true,
      },
      include: {
        city1: {
          select: {
            id: true,
            name: true,
          },
        },
        city2: {
          select: {
            id: true,
            name: true,
          },
        },
        city3: {
          select: {
            id: true,
            name: true,
          },
        },
        city4: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ transportRouteMasters });
  })
);

// Get Transport Route Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transportRouteMaster = await prisma.transportRouteMaster.findUnique({
      where: { id },
      include: {
        city1: {
          select: {
            id: true,
            name: true,
          },
        },
        city2: {
          select: {
            id: true,
            name: true,
          },
        },
        city3: {
          select: {
            id: true,
            name: true,
          },
        },
        city4: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transportRouteMaster) {
      return res.status(404).json({ error: 'Transport route master not found' });
    }

    res.json({ transportRouteMaster });
  })
);

// Update Transport Route Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateTransportRouteMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const updateData = req.body as UpdateTransportRouteMasterRequest;

    const existingRoute = await prisma.transportRouteMaster.findUnique({
      where: { id },
    });

    if (!existingRoute) {
      return res.status(404).json({ error: 'Transport route master not found' });
    }

    // Verify cities exist if provided
    if (updateData.city1Id) {
      const city1 = await prisma.cityMaster.findUnique({ where: { id: updateData.city1Id } });
      if (!city1) {
        return res.status(400).json({ error: 'Invalid city1 ID' });
      }
    }
    if (updateData.city2Id) {
      const city2 = await prisma.cityMaster.findUnique({ where: { id: updateData.city2Id } });
      if (!city2) {
        return res.status(400).json({ error: 'Invalid city2 ID' });
      }
    }
    if (updateData.city3Id) {
      const city3 = await prisma.cityMaster.findUnique({ where: { id: updateData.city3Id } });
      if (!city3) {
        return res.status(400).json({ error: 'Invalid city3 ID' });
      }
    }
    if (updateData.city4Id) {
      const city4 = await prisma.cityMaster.findUnique({ where: { id: updateData.city4Id } });
      if (!city4) {
        return res.status(400).json({ error: 'Invalid city4 ID' });
      }
    }

    const transportRouteMaster = await prisma.transportRouteMaster.update({
      where: { id },
      data: {
        ...(updateData.city1Id && { city1Id: updateData.city1Id }),
        ...(updateData.city2Id && { city2Id: updateData.city2Id }),
        ...(updateData.city3Id !== undefined && { city3Id: updateData.city3Id || null }),
        ...(updateData.city4Id !== undefined && { city4Id: updateData.city4Id || null }),
        ...(updateData.routeType && { routeType: updateData.routeType as RouteType }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
      include: {
        city1: {
          select: {
            id: true,
            name: true,
          },
        },
        city2: {
          select: {
            id: true,
            name: true,
          },
        },
        city3: {
          select: {
            id: true,
            name: true,
          },
        },
        city4: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ transportRouteMaster });
  })
);

// Delete Transport Route Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transportRouteMaster = await prisma.transportRouteMaster.findUnique({
      where: { id },
    });

    if (!transportRouteMaster) {
      return res.status(404).json({ error: 'Transport route master not found' });
    }

    await prisma.transportRouteMaster.delete({
      where: { id },
    });

    res.json({ message: 'Transport route master deleted successfully' });
  })
);

// Toggle Transport Route Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transportRouteMaster = await prisma.transportRouteMaster.findUnique({
      where: { id },
    });

    if (!transportRouteMaster) {
      return res.status(404).json({ error: 'Transport route master not found' });
    }

    const updatedTransportRouteMaster = await prisma.transportRouteMaster.update({
      where: { id },
      data: { isActive: !transportRouteMaster.isActive },
      include: {
        city1: {
          select: {
            id: true,
            name: true,
          },
        },
        city2: {
          select: {
            id: true,
            name: true,
          },
        },
        city3: {
          select: {
            id: true,
            name: true,
          },
        },
        city4: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ transportRouteMaster: updatedTransportRouteMaster });
  })
);

export default router;

