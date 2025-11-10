import { Router, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest, CreateTransportMasterRequest, UpdateTransportMasterRequest } from '../types';

const router = Router();

const createTransportMasterValidation = [
  body('routeId').isUUID().notEmpty(),
  body('vehicleTypeId').isUUID().notEmpty(),
  body('price').isFloat({ min: 0 }),
  body('isActive').isBoolean().optional(),
];

const updateTransportMasterValidation = [
  body('routeId').isUUID().optional(),
  body('vehicleTypeId').isUUID().optional(),
  body('price').isFloat({ min: 0 }).optional(),
  body('isActive').isBoolean().optional(),
];

// Create Transport Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createTransportMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { routeId, vehicleTypeId, price, isActive } = req.body as CreateTransportMasterRequest;

    // Check if transport with same route and vehicle type already exists
    const existingTransport = await prisma.transportMaster.findUnique({
      where: {
        routeId_vehicleTypeId: {
          routeId,
          vehicleTypeId,
        },
      },
    });

    if (existingTransport) {
      return res.status(400).json({ 
        error: 'Transport with this route and vehicle type already exists' 
      });
    }

    // Verify route exists
    const route = await prisma.transportRouteMaster.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return res.status(400).json({ error: 'Invalid route ID' });
    }

    // Verify vehicle type exists
    const vehicleType = await prisma.vehicleTypeMaster.findUnique({
      where: { id: vehicleTypeId },
    });

    if (!vehicleType) {
      return res.status(400).json({ error: 'Invalid vehicle type ID' });
    }

    const transportMaster = await prisma.transportMaster.create({
      data: {
        routeId,
        vehicleTypeId,
        price,
        isActive: isActive ?? true,
      },
      include: {
        route: {
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
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          },
        },
      },
    });

    res.status(201).json({ transportMaster });
  })
);

// Get all Transport Masters with pagination and filters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string || '';
    const routeId = req.query.routeId as string;
    const vehicleTypeId = req.query.vehicleTypeId as string;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { route: { city1: { name: { contains: search, mode: 'insensitive' } } } },
        { route: { city2: { name: { contains: search, mode: 'insensitive' } } } },
        { vehicleType: { vehicleName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (routeId) {
      where.routeId = routeId;
    }

    if (vehicleTypeId) {
      where.vehicleTypeId = vehicleTypeId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [transportMasters, total] = await Promise.all([
      prisma.transportMaster.findMany({
        where,
        skip,
        take: limit,
        include: {
          route: {
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
          },
          vehicleType: {
            select: {
              id: true,
              vehicleName: true,
              paxCount: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.transportMaster.count({ where }),
    ]);

    res.json({
      transportMasters,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get active Transport Masters only
router.get(
  '/active',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const transportMasters = await prisma.transportMaster.findMany({
      where: {
        isActive: true,
      },
      include: {
        route: {
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
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ transportMasters });
  })
);

// Get Transport Masters by Route ID
router.get(
  '/by-route/:routeId',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { routeId } = req.params;

    const transportMasters = await prisma.transportMaster.findMany({
      where: {
        routeId,
        isActive: true,
      },
      include: {
        route: {
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
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          },
        },
      },
      orderBy: {
        vehicleType: {
          vehicleName: 'asc',
        },
      },
    });

    res.json({ transportMasters });
  })
);

// Get Transport Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transportMaster = await prisma.transportMaster.findUnique({
      where: { id },
      include: {
        route: {
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
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          },
        },
      },
    });

    if (!transportMaster) {
      return res.status(404).json({ error: 'Transport master not found' });
    }

    res.json({ transportMaster });
  })
);

// Update Transport Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateTransportMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { id } = req.params;
    const updateData = req.body as UpdateTransportMasterRequest;

    const existingTransport = await prisma.transportMaster.findUnique({
      where: { id },
    });

    if (!existingTransport) {
      return res.status(404).json({ error: 'Transport master not found' });
    }

    // Check for unique constraint violation if routeId or vehicleTypeId is being updated
    if (updateData.routeId || updateData.vehicleTypeId) {
      const newRouteId = updateData.routeId || existingTransport.routeId;
      const newVehicleTypeId = updateData.vehicleTypeId || existingTransport.vehicleTypeId;

      const conflictingTransport = await prisma.transportMaster.findUnique({
        where: {
          routeId_vehicleTypeId: {
            routeId: newRouteId,
            vehicleTypeId: newVehicleTypeId,
          },
        },
      });

      if (conflictingTransport && conflictingTransport.id !== id) {
        return res.status(400).json({ 
          error: 'Transport with this route and vehicle type already exists' 
        });
      }
    }

    // Verify route exists if provided
    if (updateData.routeId) {
      const route = await prisma.transportRouteMaster.findUnique({
        where: { id: updateData.routeId },
      });
      if (!route) {
        return res.status(400).json({ error: 'Invalid route ID' });
      }
    }

    // Verify vehicle type exists if provided
    if (updateData.vehicleTypeId) {
      const vehicleType = await prisma.vehicleTypeMaster.findUnique({
        where: { id: updateData.vehicleTypeId },
      });
      if (!vehicleType) {
        return res.status(400).json({ error: 'Invalid vehicle type ID' });
      }
    }

    const transportMaster = await prisma.transportMaster.update({
      where: { id },
      data: {
        ...(updateData.routeId && { routeId: updateData.routeId }),
        ...(updateData.vehicleTypeId && { vehicleTypeId: updateData.vehicleTypeId }),
        ...(updateData.price !== undefined && { price: updateData.price }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
      },
      include: {
        route: {
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
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          },
        },
      },
    });

    res.json({ transportMaster });
  })
);

// Delete Transport Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transportMaster = await prisma.transportMaster.findUnique({
      where: { id },
    });

    if (!transportMaster) {
      return res.status(404).json({ error: 'Transport master not found' });
    }

    await prisma.transportMaster.delete({
      where: { id },
    });

    res.json({ message: 'Transport master deleted successfully' });
  })
);

// Toggle Transport Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const transportMaster = await prisma.transportMaster.findUnique({
      where: { id },
    });

    if (!transportMaster) {
      return res.status(404).json({ error: 'Transport master not found' });
    }

    const updatedTransportMaster = await prisma.transportMaster.update({
      where: { id },
      data: { isActive: !transportMaster.isActive },
      include: {
        route: {
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
        },
        vehicleType: {
          select: {
            id: true,
            vehicleName: true,
            paxCount: true,
          },
        },
      },
    });

    res.json({ transportMaster: updatedTransportMaster });
  })
);

export default router;

