import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { prisma } from '../config/database';
import { AuthRequest } from '../types';

const router = Router();

const createAirportRouteMasterValidation = [
  body('routeCode').isString().notEmpty().trim().isLength({ min: 2, max: 20 }),
  body('routeName').isString().notEmpty().trim(),
  body('fromAirport').isString().notEmpty().trim(),
  body('toAirport').isString().notEmpty().trim(),
  body('fromDestinationId').optional().isUUID(),
  body('toDestinationId').optional().isUUID(),
  body('description').optional().isString().trim(),
  body('isActive').optional().isBoolean(),
];

const updateAirportRouteMasterValidation = [
  body('routeCode').optional().isString().notEmpty().trim().isLength({ min: 2, max: 20 }),
  body('routeName').optional().isString().notEmpty().trim(),
  body('fromAirport').optional().isString().notEmpty().trim(),
  body('toAirport').optional().isString().notEmpty().trim(),
  body('fromDestinationId').optional().isUUID(),
  body('toDestinationId').optional().isUUID(),
  body('description').optional().isString().trim(),
  body('isActive').optional().isBoolean(),
];

// Create Airport Route Master
router.post(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  createAirportRouteMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { routeCode, routeName, fromAirport, toAirport, fromDestinationId, toDestinationId, description, isActive } = req.body;

    const existingRoute = await prisma.airportRouteMaster.findUnique({
      where: { routeCode },
    });

    if (existingRoute) {
      return res.status(400).json({ error: 'Airport route with this code already exists' });
    }

    // Verify destinations exist if provided
    if (fromDestinationId) {
      const fromDest = await prisma.locationMaster.findFirst({
        where: {
          id: fromDestinationId,
          locationType: 'DESTINATION',
        },
      });
      if (!fromDest) {
        return res.status(400).json({ error: 'From destination not found' });
      }
    }

    if (toDestinationId) {
      const toDest = await prisma.locationMaster.findFirst({
        where: {
          id: toDestinationId,
          locationType: 'DESTINATION',
        },
      });
      if (!toDest) {
        return res.status(400).json({ error: 'To destination not found' });
      }
    }

    const airportRouteMaster = await prisma.airportRouteMaster.create({
      data: {
        routeCode,
        routeName,
        fromAirport,
        toAirport,
        fromDestinationId: fromDestinationId || null,
        toDestinationId: toDestinationId || null,
        description: description || null,
        isActive: isActive ?? true,
      },
      include: {
        fromDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        },
        toDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({ airportRouteMaster });
  })
);

// Get all Airport Route Masters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search, isActive, fromDestinationId, toDestinationId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { routeName: { contains: search, mode: 'insensitive' } },
        { routeCode: { contains: search, mode: 'insensitive' } },
        { fromAirport: { contains: search, mode: 'insensitive' } },
        { toAirport: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.isActive = String(isActive).toLowerCase() === 'true';
    }
    if (fromDestinationId) {
      where.fromDestinationId = fromDestinationId;
    }
    if (toDestinationId) {
      where.toDestinationId = toDestinationId;
    }

    const [airportRouteMasters, total] = await Promise.all([
      prisma.airportRouteMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { routeName: 'asc' },
        include: {
          fromDestination: {
            select: {
              id: true,
              name: true,
              city: true,
              country: {
                select: {
                  countryName: true
                }
              }
            }
          },
          toDestination: {
            select: {
              id: true,
              name: true,
              city: true,
              country: {
                select: {
                  countryName: true
                }
              }
            }
          }
        }
      }),
      prisma.airportRouteMaster.count({ where }),
    ]);

    res.json({
      airportRouteMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get active Airport Route Masters
router.get(
  '/active',
  authenticate,
  authorize('admin', 'staff', 'party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fromDestinationId, toDestinationId } = req.query;

    const where: any = { isActive: true };
    if (fromDestinationId) {
      where.fromDestinationId = fromDestinationId;
    }
    if (toDestinationId) {
      where.toDestinationId = toDestinationId;
    }

    const airportRouteMasters = await prisma.airportRouteMaster.findMany({
      where,
      orderBy: { routeName: 'asc' },
      include: {
        fromDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        },
        toDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        }
      }
    });

    res.json({ airportRouteMasters });
  })
);

// Get Airport Route Master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const airportRouteMaster = await prisma.airportRouteMaster.findUnique({
      where: { id },
      include: {
        fromDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        },
        toDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        }
      }
    });

    if (!airportRouteMaster) {
      return res.status(404).json({ error: 'Airport Route Master not found' });
    }

    res.json({ airportRouteMaster });
  })
);

// Update Airport Route Master
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  updateAirportRouteMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { routeCode, routeName, fromAirport, toAirport, fromDestinationId, toDestinationId, description, isActive } = req.body;

    // Check if route exists
    const existingRoute = await prisma.airportRouteMaster.findUnique({
      where: { id },
    });

    if (!existingRoute) {
      return res.status(404).json({ error: 'Airport Route Master not found' });
    }

    // Check if routeCode is being changed and if new code already exists
    if (routeCode && routeCode !== existingRoute.routeCode) {
      const codeExists = await prisma.airportRouteMaster.findUnique({
        where: { routeCode },
      });
      if (codeExists) {
        return res.status(400).json({ error: 'Airport route with this code already exists' });
      }
    }

    // Verify destinations exist if provided
    if (fromDestinationId) {
      const fromDest = await prisma.locationMaster.findFirst({
        where: {
          id: fromDestinationId,
          locationType: 'DESTINATION',
        },
      });
      if (!fromDest) {
        return res.status(400).json({ error: 'From destination not found' });
      }
    }

    if (toDestinationId) {
      const toDest = await prisma.locationMaster.findFirst({
        where: {
          id: toDestinationId,
          locationType: 'DESTINATION',
        },
      });
      if (!toDest) {
        return res.status(400).json({ error: 'To destination not found' });
      }
    }

    const airportRouteMaster = await prisma.airportRouteMaster.update({
      where: { id },
      data: {
        routeCode,
        routeName,
        fromAirport,
        toAirport,
        fromDestinationId: fromDestinationId !== undefined ? (fromDestinationId || null) : undefined,
        toDestinationId: toDestinationId !== undefined ? (toDestinationId || null) : undefined,
        description: description !== undefined ? (description || null) : undefined,
        isActive,
      },
      include: {
        fromDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        },
        toDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        }
      }
    });

    res.json({ airportRouteMaster });
  })
);

// Toggle Airport Route Master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const airportRouteMaster = await prisma.airportRouteMaster.findUnique({
      where: { id },
    });

    if (!airportRouteMaster) {
      return res.status(404).json({ error: 'Airport Route Master not found' });
    }

    const updatedAirportRouteMaster = await prisma.airportRouteMaster.update({
      where: { id },
      data: { isActive: !airportRouteMaster.isActive },
      include: {
        fromDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        },
        toDestination: {
          select: {
            id: true,
            name: true,
            city: true,
            country: {
              select: {
                countryName: true
              }
            }
          }
        }
      }
    });

    res.json({ airportRouteMaster: updatedAirportRouteMaster });
  })
);

// Delete Airport Route Master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await prisma.airportRouteMaster.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  })
);

export default router;

