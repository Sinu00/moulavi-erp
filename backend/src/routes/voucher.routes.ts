import { Router, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { generateVoucherNumber } from '../services/voucherService';
import { sendMovementUpdateEmail } from '../services/emailService';
import { sendMovementUpdateWhatsApp } from '../services/whatsappService';

const router = Router();

// Get all vouchers with pagination and filters
router.get(
  '/',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '10', search = '' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { voucherNumber: { contains: search as string, mode: 'insensitive' } },
        { guestName: { contains: search as string, mode: 'insensitive' } },
        { guestMobile: { contains: search as string, mode: 'insensitive' } },
        { groupCode: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [vouchers, total] = await Promise.all([
      prisma.voucher.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          generatedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          booking: {
            select: {
              id: true,
              party: {
                select: {
                  id: true,
                  partyName: true,
                  email: true,
                  contactNumber: true,
                  whatsappNumber: true,
                },
              },
            },
          },
        },
      }),
      prisma.voucher.count({ where }),
    ]);

    res.json({
      vouchers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get voucher stats
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalVouchers, todayMovements, tomorrowMovements] = await Promise.all([
      prisma.voucher.count(),
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM vouchers v
        CROSS JOIN LATERAL jsonb_array_elements(v.movement_details) AS movement
        WHERE (movement->>'date')::date = CURRENT_DATE
      `,
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::int as count
        FROM vouchers v
        CROSS JOIN LATERAL jsonb_array_elements(v.movement_details) AS movement
        WHERE (movement->>'date')::date = CURRENT_DATE + INTERVAL '1 day'
      `,
    ]);

    res.json({
      totalVouchers,
      todayMovements: Number(todayMovements[0]?.count || 0),
      tomorrowMovements: Number(tomorrowMovements[0]?.count || 0),
    });
  })
);

// Get today's movements
router.get(
  '/movements/today',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const vouchers = await prisma.voucher.findMany({
      include: {
        booking: {
          select: {
            id: true,
            party: {
              select: {
                partyName: true,
                email: true,
                contactNumber: true,
                whatsappNumber: true,
              },
            },
          },
        },
      },
    });

    const movements: any[] = [];
    vouchers.forEach((voucher) => {
      const movementDetails = voucher.movementDetails as any[];
      if (Array.isArray(movementDetails)) {
        movementDetails.forEach((movement, index) => {
          const movementDate = new Date(movement.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const movementDateOnly = new Date(movementDate);
          movementDateOnly.setHours(0, 0, 0, 0);

          if (movementDateOnly.getTime() === today.getTime()) {
            movements.push({
              voucherId: voucher.id,
              voucherNumber: voucher.voucherNumber,
              movementIndex: index,
              routeNumber: movement.route || '',
              date: movement.date,
              time: movement.time || '',
              agentName: voucher.booking.party.partyName,
              guestName: voucher.guestName,
              mobile: voucher.guestMobile || '',
              pax: voucher.paxCount,
              fromLocation: movement.fromLocation || '',
              toLocation: movement.toLocation || '',
              driverDetails1: movement.driverDetails1 || '',
              driverDetails2: movement.driverDetails2 || '',
              vehicleNumber: movement.vehicleNumber || '',
              partyEmail: voucher.booking.party.email,
              partyWhatsApp: voucher.booking.party.whatsappNumber || voucher.booking.party.contactNumber || '',
            });
          }
        });
      }
    });

    res.json({ movements });
  })
);

// Get tomorrow's movements
router.get(
  '/movements/tomorrow',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const vouchers = await prisma.voucher.findMany({
      include: {
        booking: {
          select: {
            id: true,
            party: {
              select: {
                partyName: true,
                email: true,
                contactNumber: true,
                whatsappNumber: true,
              },
            },
          },
        },
      },
    });

    const movements: any[] = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    vouchers.forEach((voucher) => {
      const movementDetails = voucher.movementDetails as any[];
      if (Array.isArray(movementDetails)) {
        movementDetails.forEach((movement, index) => {
          const movementDate = new Date(movement.date);
          const movementDateOnly = new Date(movementDate);
          movementDateOnly.setHours(0, 0, 0, 0);

          if (movementDateOnly.getTime() === tomorrow.getTime()) {
            movements.push({
              voucherId: voucher.id,
              voucherNumber: voucher.voucherNumber,
              movementIndex: index,
              routeNumber: movement.route || '',
              date: movement.date,
              time: movement.time || '',
              agentName: voucher.booking.party.partyName,
              guestName: voucher.guestName,
              mobile: voucher.guestMobile || '',
              pax: voucher.paxCount,
              fromLocation: movement.fromLocation || '',
              toLocation: movement.toLocation || '',
              driverDetails1: movement.driverDetails1 || '',
              driverDetails2: movement.driverDetails2 || '',
              vehicleNumber: movement.vehicleNumber || '',
              partyEmail: voucher.booking.party.email,
              partyWhatsApp: voucher.booking.party.whatsappNumber || voucher.booking.party.contactNumber || '',
            });
          }
        });
      }
    });

    res.json({ movements });
  })
);

// Get single voucher by ID
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        generatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            party: {
              select: {
                id: true,
                partyName: true,
                email: true,
                contactNumber: true,
                whatsappNumber: true,
              },
            },
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.json({ voucher });
  })
);

// Create quick voucher
router.post(
  '/quick',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = req.user!;
    const {
      guestName,
      guestMobile,
      groupCode,
      paxCount,
      reservationDate,
      hotelSchedules,
      movementDetails,
      flightDetails,
      bookingId,
    } = req.body;

    if (!guestName || !paxCount) {
      return res.status(400).json({ error: 'Guest name and passenger count are required' });
    }

    const voucherNumber = await generateVoucherNumber();

    // If bookingId is provided, link to existing booking, otherwise create standalone voucher
    let voucher;
    if (bookingId) {
      // Check if booking exists
      const booking = await prisma.umrahVisaBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Check if voucher already exists for this booking
      const existingVoucher = await prisma.voucher.findUnique({
        where: { bookingId },
      });

      if (existingVoucher) {
        return res.status(400).json({ error: 'Voucher already exists for this booking' });
      }

      voucher = await prisma.voucher.create({
        data: {
          bookingId,
          voucherNumber,
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          guestName,
          guestMobile: guestMobile || null,
          groupCode: groupCode || null,
          paxCount,
          hotelSchedules: hotelSchedules || [],
          movementDetails: movementDetails || [],
          flightDetails: flightDetails || [],
          generatedBy: user.id,
        },
      });
    } else {
      // Create standalone voucher without booking (if your schema allows)
      // For now, we'll require a bookingId
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    res.status(201).json({ voucher });
  })
);

// Update movement driver/vehicle details
router.put(
  '/:id/movement/:movementIndex',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, movementIndex } = req.params;
    const { driverDetails1, driverDetails2, vehicleNumber } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            party: {
              select: {
                email: true,
                whatsappNumber: true,
                contactNumber: true,
              },
            },
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const movementDetails = voucher.movementDetails as any[];
    const index = parseInt(movementIndex, 10);

    if (!Array.isArray(movementDetails) || index < 0 || index >= movementDetails.length) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

    // Update the movement details
    movementDetails[index] = {
      ...movementDetails[index],
      driverDetails1: driverDetails1 || movementDetails[index].driverDetails1 || '',
      driverDetails2: driverDetails2 || movementDetails[index].driverDetails2 || '',
      vehicleNumber: vehicleNumber || movementDetails[index].vehicleNumber || '',
    };

    const updatedVoucher = await prisma.voucher.update({
      where: { id },
      data: {
        movementDetails,
        version: voucher.version + 1,
      },
    });

    res.json({ voucher: updatedVoucher });
  })
);

// Send notification for movement update
router.post(
  '/:id/movement/:movementIndex/notify',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, movementIndex } = req.params;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            party: {
              select: {
                partyName: true,
                email: true,
                whatsappNumber: true,
                contactNumber: true,
              },
            },
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const movementDetails = voucher.movementDetails as any[];
    const index = parseInt(movementIndex, 10);

    if (!Array.isArray(movementDetails) || index < 0 || index >= movementDetails.length) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

    const movement = movementDetails[index];
    const party = voucher.booking.party;

    // Send email
    if (party.email) {
      try {
        await sendMovementUpdateEmail(
          party.email,
          party.partyName,
          voucher.voucherNumber,
          {
            date: movement.date || '',
            time: movement.time || '',
            fromLocation: movement.fromLocation || '',
            toLocation: movement.toLocation || '',
            driverDetails1: movement.driverDetails1 || '',
            driverDetails2: movement.driverDetails2 || '',
            vehicleNumber: movement.vehicleNumber || '',
          }
        );
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    // Send WhatsApp
    const phoneNumber = party.whatsappNumber || party.contactNumber;
    if (phoneNumber) {
      try {
        await sendMovementUpdateWhatsApp(
          phoneNumber,
          party.partyName,
          voucher.voucherNumber,
          {
            date: movement.date || '',
            time: movement.time || '',
            fromLocation: movement.fromLocation || '',
            toLocation: movement.toLocation || '',
            driverDetails1: movement.driverDetails1 || '',
            driverDetails2: movement.driverDetails2 || '',
            vehicleNumber: movement.vehicleNumber || '',
          }
        );
      } catch (error) {
        console.error('Failed to send WhatsApp:', error);
      }
    }

    res.json({ message: 'Notifications sent successfully' });
  })
);

export default router;

