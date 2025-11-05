import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest, CreateFullTripMasterRequest, UpdateFullTripMasterRequest } from '../types';
import { prisma } from '../config/database';

const router = Router();

const createFullTripMasterValidation = [
  body('fromCityId').isUUID().notEmpty(),
  body('toCityIds').isArray({ min: 1 }).withMessage('At least one destination city is required'),
  body('toCityIds.*').isUUID().withMessage('All city IDs must be valid UUIDs'),
  body('vehicleTypeId').isUUID().notEmpty(),
  body('price').isDecimal({ decimal_digits: '0,2' }),
  body('isActive').isBoolean().optional(),
];

const updateFullTripMasterValidation = [
  body('fromCityId').optional().isUUID(),
  body('toCityIds').optional().isArray({ min: 1 }),
  body('toCityIds.*').optional().isUUID(),
  body('vehicleTypeId').optional().isUUID(),
  body('price').optional().isDecimal({ decimal_digits: '0,2' }),
  body('isActive').optional().isBoolean(),
];

// Helper function to check for duplicate trip
async function checkDuplicateTrip(
  fromCityId: string,
  toCityIds: string[],
  vehicleTypeId: string,
  excludeId?: string
): Promise<boolean> {
  // Find all trips with same fromCity and vehicleType
  const trips = await prisma.fullTripMaster.findMany({
    where: {
      fromCityId,
      vehicleTypeId,
      ...(excludeId && { id: { not: excludeId } }),
    },
    include: {
      toCities: {
        orderBy: { sequenceOrder: 'asc' },
      },
    },
  });

    // Check if any trip has the exact same sequence of toCities
  for (const trip of trips) {
    const tripToCityIds = trip.toCities.map((tc) => tc.cityId);
    if (
      tripToCityIds.length === toCityIds.length &&
      tripToCityIds.every((id, index) => id === toCityIds[index])
    ) {
      return true; // Duplicate found
    }
  }

  return false;
}

// Create full trip master
router.post(
  '/',
  authenticate,
  authorize('admin'),
  createFullTripMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { fromCityId, toCityIds, vehicleTypeId, price, isActive } = req.body as CreateFullTripMasterRequest;

    // Validate that fromCity exists
    const fromCity = await prisma.cityMaster.findUnique({
      where: { id: fromCityId },
    });

    if (!fromCity) {
      return res.status(400).json({ error: 'Invalid from city ID' });
    }

    // Validate that all toCities exist (allow duplicates)
    const uniqueCityIds = [...new Set(toCityIds)]; // Get unique city IDs
    const toCities = await prisma.cityMaster.findMany({
      where: { id: { in: uniqueCityIds } },
    });

    // Check if all unique city IDs exist (allowing duplicates in toCityIds array)
    if (toCities.length !== uniqueCityIds.length) {
      return res.status(400).json({ error: 'One or more destination city IDs are invalid' });
    }

    // Validate vehicle type exists
    const vehicleType = await prisma.vehicleTypeMaster.findUnique({
      where: { id: vehicleTypeId },
    });

    if (!vehicleType) {
      return res.status(400).json({ error: 'Invalid vehicle type ID' });
    }

    // Check for duplicate trip
    const isDuplicate = await checkDuplicateTrip(fromCityId, toCityIds, vehicleTypeId);
    if (isDuplicate) {
      return res.status(400).json({
        error: 'Full trip combination already exists',
        details: 'A full trip with this route sequence and vehicle type already exists',
      });
    }

    // Create full trip master with toCities
    const fullTripMaster = await prisma.fullTripMaster.create({
      data: {
        fromCityId,
        vehicleTypeId,
        price: parseFloat(price.toString()),
        isActive: isActive ?? true,
        toCities: {
          create: toCityIds.map((cityId, index) => ({
            cityId,
            sequenceOrder: index + 1,
          })),
        },
      },
      include: {
        fromCity: {
          include: {
            country: true,
          },
        },
        vehicleType: true,
        toCities: {
          include: {
            city: {
              include: {
                country: true,
              },
            },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    res.status(201).json({ fullTripMaster });
  })
);

// Get all full trip masters (admin/staff can see all, party can see active ones only)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userRole = (req as any).user?.role;
    const { page = '1', limit = '10', search, fromCityId, vehicleTypeId, isActive } = req.query;
    
    // For party users, only show active trips (force isActive=true)
    const effectiveIsActive = (userRole === 'admin' || userRole === 'staff') 
      ? isActive 
      : 'true';

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { vehicleType: { vehicleName: { contains: search as string, mode: 'insensitive' } } },
        { fromCity: { name: { contains: search as string, mode: 'insensitive' } } },
        {
          toCities: {
            some: {
              city: {
                name: { contains: search as string, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    if (fromCityId) {
      where.fromCityId = fromCityId;
    }

    if (vehicleTypeId) {
      where.vehicleTypeId = vehicleTypeId;
    }

    if (effectiveIsActive !== undefined) {
      where.isActive = effectiveIsActive === 'true';
    }

    const [fullTripMasters, total] = await Promise.all([
      prisma.fullTripMaster.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { fromCity: { name: 'asc' } },
          { vehicleType: { vehicleName: 'asc' } },
          { createdAt: 'desc' },
        ],
        include: {
          fromCity: {
            include: {
              country: true,
            },
          },
          vehicleType: true,
          toCities: {
            include: {
              city: {
                include: {
                  country: true,
                },
              },
            },
            orderBy: { sequenceOrder: 'asc' },
          },
        },
      }),
      prisma.fullTripMaster.count({ where }),
    ]);

    res.json({
      fullTripMasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get full trip master by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const fullTripMaster = await prisma.fullTripMaster.findUnique({
      where: { id },
      include: {
        fromCity: {
          include: {
            country: true,
          },
        },
        vehicleType: true,
        toCities: {
          include: {
            city: {
              include: {
                country: true,
              },
            },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    if (!fullTripMaster) {
      return res.status(404).json({ error: 'Full trip master not found' });
    }

    res.json({ fullTripMaster });
  })
);

// Update full trip master
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  updateFullTripMasterValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updateData = req.body as UpdateFullTripMasterRequest;

    // Check if full trip master exists
    const existingTrip = await prisma.fullTripMaster.findUnique({
      where: { id },
      include: {
        toCities: {
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    if (!existingTrip) {
      return res.status(404).json({ error: 'Full trip master not found' });
    }

    // If updating cities or vehicle type, validate
    if (updateData.fromCityId) {
      const fromCity = await prisma.cityMaster.findUnique({
        where: { id: updateData.fromCityId },
      });
      if (!fromCity) {
        return res.status(400).json({ error: 'Invalid from city ID' });
      }
    }

    if (updateData.toCityIds) {
      // Validate that all toCities exist (allow duplicates)
      const uniqueCityIds = [...new Set(updateData.toCityIds)]; // Get unique city IDs
      const toCities = await prisma.cityMaster.findMany({
        where: { id: { in: uniqueCityIds } },
      });
      
      // Check if all unique city IDs exist (allowing duplicates in toCityIds array)
      if (toCities.length !== uniqueCityIds.length) {
        return res.status(400).json({ error: 'One or more destination city IDs are invalid' });
      }
    }

    if (updateData.vehicleTypeId) {
      const vehicleType = await prisma.vehicleTypeMaster.findUnique({
        where: { id: updateData.vehicleTypeId },
      });
      if (!vehicleType) {
        return res.status(400).json({ error: 'Invalid vehicle type ID' });
      }
    }

    // If updating unique combination, check for conflicts
    const fromCityId = updateData.fromCityId || existingTrip.fromCityId;
    const toCityIds = updateData.toCityIds || existingTrip.toCities.map((tc) => tc.cityId);
    const vehicleTypeId = updateData.vehicleTypeId || existingTrip.vehicleTypeId;

    // Only check for duplicates if something that affects uniqueness is changing
    if (
      updateData.fromCityId ||
      updateData.toCityIds ||
      updateData.vehicleTypeId
    ) {
      const isDuplicate = await checkDuplicateTrip(fromCityId, toCityIds, vehicleTypeId, id);
      if (isDuplicate) {
        return res.status(400).json({
          error: 'Full trip combination already exists',
          details: 'A full trip with this route sequence and vehicle type already exists',
        });
      }
    }

    // Convert price to decimal if provided
    const dataToUpdate: any = {};
    if (updateData.price !== undefined) {
      dataToUpdate.price = parseFloat(updateData.price.toString());
    }
    if (updateData.fromCityId !== undefined) {
      dataToUpdate.fromCityId = updateData.fromCityId;
    }
    if (updateData.vehicleTypeId !== undefined) {
      dataToUpdate.vehicleTypeId = updateData.vehicleTypeId;
    }
    if (updateData.isActive !== undefined) {
      dataToUpdate.isActive = updateData.isActive;
    }

    // Update toCities if provided
    if (updateData.toCityIds) {
      // Delete existing toCities
      await prisma.fullTripMasterToCity.deleteMany({
        where: { fullTripMasterId: id },
      });

      // Create new toCities
      dataToUpdate.toCities = {
        create: updateData.toCityIds.map((cityId, index) => ({
          cityId,
          sequenceOrder: index + 1,
        })),
      };
    }

    const fullTripMaster = await prisma.fullTripMaster.update({
      where: { id },
      data: dataToUpdate,
      include: {
        fromCity: {
          include: {
            country: true,
          },
        },
        vehicleType: true,
        toCities: {
          include: {
            city: {
              include: {
                country: true,
              },
            },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    res.json({ fullTripMaster });
  })
);

// Delete full trip master
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const fullTripMaster = await prisma.fullTripMaster.findUnique({
      where: { id },
    });

    if (!fullTripMaster) {
      return res.status(404).json({ error: 'Full trip master not found' });
    }

    // Cascade delete will handle toCities
    await prisma.fullTripMaster.delete({
      where: { id },
    });

    res.json({ message: 'Full trip master deleted successfully' });
  })
);

// Toggle full trip master status
router.patch(
  '/:id/toggle-status',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const fullTripMaster = await prisma.fullTripMaster.findUnique({
      where: { id },
    });

    if (!fullTripMaster) {
      return res.status(404).json({ error: 'Full trip master not found' });
    }

    const updatedFullTripMaster = await (prisma as any).fullTripMaster.update({
      where: { id },
      data: { isActive: !fullTripMaster.isActive },
      include: {
        fromCity: {
          include: {
            country: true,
          },
        },
        vehicleType: true,
        toCities: {
          include: {
            city: {
              include: {
                country: true,
              },
            },
          },
          orderBy: { sequenceOrder: 'asc' },
        },
      },
    });

    res.json({ fullTripMaster: updatedFullTripMaster });
  })
);

export default router;

