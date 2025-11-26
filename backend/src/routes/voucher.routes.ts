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
          movements: {
            orderBy: {
              sr: 'asc',
            },
          },
          hotels: {
            orderBy: {
              number: 'asc',
            },
          },
          flights: {
            orderBy: {
              date: 'asc',
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
      prisma.voucherMovement.count({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.voucherMovement.count({
        where: {
          date: {
            gte: tomorrow,
            lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalVouchers,
      todayMovements,
      tomorrowMovements,
    });
  })
);

// Get today's movements
router.get(
  '/movements/today',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const movementsData = await prisma.voucherMovement.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        voucher: {
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
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get all movements with their sr numbers to calculate index
    const movementsByVoucher = new Map<string, any[]>();
    movementsData.forEach((movement) => {
      if (!movementsByVoucher.has(movement.voucherId)) {
        movementsByVoucher.set(movement.voucherId, []);
      }
      movementsByVoucher.get(movement.voucherId)!.push(movement);
    });

    // Sort by sr to get correct index
    movementsByVoucher.forEach((movements) => {
      movements.sort((a, b) => a.sr - b.sr);
    });

    const movements = movementsData.map((movement) => {
      const voucherMovements = movementsByVoucher.get(movement.voucherId) || [];
      const movementIndex = voucherMovements.findIndex((m) => m.id === movement.id);

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.booking.party.partyName,
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: movement.voucher.paxCount,
        fromLocation: movement.fromLocation || '',
        toLocation: movement.toLocation || '',
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
        partyEmail: movement.voucher.booking.party.email,
        partyWhatsApp: movement.voucher.booking.party.whatsappNumber || movement.voucher.booking.party.contactNumber || '',
      };
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const movementsData = await prisma.voucherMovement.findMany({
      where: {
        date: {
          gte: tomorrow,
          lt: dayAfterTomorrow,
        },
      },
      include: {
        voucher: {
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
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get all movements with their sr numbers to calculate index
    const movementsByVoucher = new Map<string, any[]>();
    movementsData.forEach((movement) => {
      if (!movementsByVoucher.has(movement.voucherId)) {
        movementsByVoucher.set(movement.voucherId, []);
      }
      movementsByVoucher.get(movement.voucherId)!.push(movement);
    });

    // Sort by sr to get correct index
    movementsByVoucher.forEach((movements) => {
      movements.sort((a, b) => a.sr - b.sr);
    });

    const movements = movementsData.map((movement) => {
      const voucherMovements = movementsByVoucher.get(movement.voucherId) || [];
      const movementIndex = voucherMovements.findIndex((m) => m.id === movement.id);

      return {
        voucherId: movement.voucherId,
        voucherNumber: movement.voucher.voucherNumber,
        movementIndex,
        movementId: movement.id,
        routeNumber: movement.route || '',
        date: movement.date.toISOString().split('T')[0],
        time: movement.time || '',
        agentName: movement.voucher.booking.party.partyName,
        guestName: movement.voucher.guestName,
        mobile: movement.voucher.guestMobile || '',
        pax: movement.voucher.paxCount,
        fromLocation: movement.fromLocation || '',
        toLocation: movement.toLocation || '',
        driverDetails1: movement.driverDetails1 || '',
        driverDetails2: movement.driverDetails2 || '',
        vehicleNumber: movement.vehicleNumber || '',
        partyEmail: movement.voucher.booking.party.email,
        partyWhatsApp: movement.voucher.booking.party.whatsappNumber || movement.voucher.booking.party.contactNumber || '',
      };
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
        movements: {
          orderBy: {
            sr: 'asc',
          },
        },
        hotels: {
          orderBy: {
            number: 'asc',
          },
        },
        flights: {
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Transform normalized data to match frontend expectations (for backward compatibility)
    const voucherResponse = {
      ...voucher,
      movementDetails: voucher.movements.map((m) => ({
        sr: m.sr,
        route: m.route || '',
        date: m.date.toISOString().split('T')[0],
        time: m.time,
        from: m.from,
        fromLocation: m.fromLocation,
        fromLocationId: m.fromLocationId,
        to: m.to,
        toLocation: m.toLocation,
        toLocationId: m.toLocationId,
        driverDetails1: m.driverDetails1,
        driverDetails2: m.driverDetails2,
        vehicleNumber: m.vehicleNumber,
        paxCount: m.paxCount,
        price: m.price,
        vehicleType: m.vehicleType,
      })),
      hotelSchedules: voucher.hotels.map((h) => ({
        number: h.number,
        location: h.location,
        hotelName: h.hotelName,
        checkIn: h.checkIn.toISOString().split('T')[0],
        checkOut: h.checkOut.toISOString().split('T')[0],
        days: h.days,
        brn: h.brn,
      })),
      flightDetails: voucher.flights.map((f) => ({
        type: f.type,
        carrier: f.carrier,
        number: f.number,
        date: f.date.toISOString().split('T')[0],
        from: f.from,
        to: f.to,
        etd: f.etd,
        eta: f.eta,
      })),
    };

    res.json({ voucher: voucherResponse });
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

    if (!bookingId) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

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

    const voucherNumber = await generateVoucherNumber();

    const voucher = await prisma.$transaction(async (tx) => {
      // Create voucher
      const newVoucher = await tx.voucher.create({
        data: {
          bookingId,
          voucherNumber,
          reservationDate: reservationDate ? new Date(reservationDate) : new Date(),
          guestName,
          guestMobile: guestMobile || null,
          groupCode: groupCode || null,
          paxCount,
          generatedBy: user.id,
        },
      });

      // Create movements
      if (movementDetails && Array.isArray(movementDetails)) {
        await Promise.all(
          movementDetails.map((movement: any) =>
            tx.voucherMovement.create({
              data: {
                voucherId: newVoucher.id,
                sr: movement.sr || 0,
                route: movement.route || null,
                date: new Date(movement.date),
                time: movement.time || '',
                from: movement.from || '',
                fromLocation: movement.fromLocation || '',
                fromLocationId: movement.fromLocationId || null,
                to: movement.to || '',
                toLocation: movement.toLocation || '',
                toLocationId: movement.toLocationId || null,
                driverDetails1: movement.driverDetails1 || null,
                driverDetails2: movement.driverDetails2 || null,
                vehicleNumber: movement.vehicleNumber || null,
                paxCount: movement.paxCount || null,
                price: movement.price ? parseFloat(movement.price) : null,
                vehicleType: movement.vehicleType || null,
              },
            })
          )
        );
      }

      // Create hotels
      if (hotelSchedules && Array.isArray(hotelSchedules)) {
        await Promise.all(
          hotelSchedules.map((hotel: any) => {
            // Handle BRN: convert array to comma-separated string if needed
            let brnValue: string | null = null;
            if (hotel.brn) {
              if (Array.isArray(hotel.brn)) {
                brnValue = hotel.brn.length > 0 ? hotel.brn.join(', ') : null;
              } else if (typeof hotel.brn === 'string') {
                brnValue = hotel.brn;
              }
            }
            
            return tx.voucherHotel.create({
              data: {
                voucherId: newVoucher.id,
                number: hotel.number || 0,
                location: hotel.location || '',
                hotelName: hotel.hotelName || '',
                checkIn: new Date(hotel.checkIn),
                checkOut: new Date(hotel.checkOut),
                days: hotel.days || 0,
                brn: brnValue,
              },
            });
          })
        );
      }

      // Create flights
      if (flightDetails && Array.isArray(flightDetails)) {
        await Promise.all(
          flightDetails.map((flight: any) =>
            tx.voucherFlight.create({
              data: {
                voucherId: newVoucher.id,
                type: flight.type || 'AA',
                carrier: flight.carrier || '',
                number: flight.number || '',
                date: new Date(flight.date),
                from: flight.from || '',
                to: flight.to || '',
                etd: flight.etd || null,
                eta: flight.eta || null,
              },
            })
          )
        );
      }

      return newVoucher;
    });

    res.status(201).json({ voucher });
  })
);

// Update voucher
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      guestName,
      guestMobile,
      groupCode,
      paxCount,
      reservationDate,
      hotelSchedules,
      movementDetails,
      flightDetails,
    } = req.body;

    const voucher = await prisma.voucher.findUnique({
      where: { id },
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const updatedVoucher = await prisma.$transaction(async (tx) => {
      // Update voucher basic fields
      const updated = await tx.voucher.update({
        where: { id },
        data: {
          ...(guestName !== undefined && { guestName }),
          ...(guestMobile !== undefined && { guestMobile: guestMobile || null }),
          ...(groupCode !== undefined && { groupCode: groupCode || null }),
          ...(paxCount !== undefined && { paxCount }),
          ...(reservationDate !== undefined && { reservationDate: new Date(reservationDate) }),
          version: voucher.version + 1,
        },
      });

      // Update movements if provided
      if (movementDetails !== undefined && Array.isArray(movementDetails)) {
        // Delete existing movements
        await tx.voucherMovement.deleteMany({ where: { voucherId: id } });
        // Create new movements
        await Promise.all(
          movementDetails.map((movement: any) =>
            tx.voucherMovement.create({
              data: {
                voucherId: id,
                sr: movement.sr || 0,
                route: movement.route || null,
                date: new Date(movement.date),
                time: movement.time || '',
                from: movement.from || '',
                fromLocation: movement.fromLocation || '',
                fromLocationId: movement.fromLocationId || null,
                to: movement.to || '',
                toLocation: movement.toLocation || '',
                toLocationId: movement.toLocationId || null,
                driverDetails1: movement.driverDetails1 || null,
                driverDetails2: movement.driverDetails2 || null,
                vehicleNumber: movement.vehicleNumber || null,
                paxCount: movement.paxCount || null,
                price: movement.price ? parseFloat(movement.price) : null,
                vehicleType: movement.vehicleType || null,
              },
            })
          )
        );
      }

      // Update hotels if provided
      if (hotelSchedules !== undefined && Array.isArray(hotelSchedules)) {
        // Delete existing hotels
        await tx.voucherHotel.deleteMany({ where: { voucherId: id } });
        // Create new hotels
        await Promise.all(
          hotelSchedules.map((hotel: any) => {
            // Handle BRN: convert array to comma-separated string if needed
            let brnValue: string | null = null;
            if (hotel.brn) {
              if (Array.isArray(hotel.brn)) {
                brnValue = hotel.brn.length > 0 ? hotel.brn.join(', ') : null;
              } else if (typeof hotel.brn === 'string') {
                brnValue = hotel.brn;
              }
            }
            
            return tx.voucherHotel.create({
              data: {
                voucherId: id,
                number: hotel.number || 0,
                location: hotel.location || '',
                hotelName: hotel.hotelName || '',
                checkIn: new Date(hotel.checkIn),
                checkOut: new Date(hotel.checkOut),
                days: hotel.days || 0,
                brn: brnValue,
              },
            });
          })
        );
      }

      // Update flights if provided
      if (flightDetails !== undefined && Array.isArray(flightDetails)) {
        // Delete existing flights
        await tx.voucherFlight.deleteMany({ where: { voucherId: id } });
        // Create new flights
        await Promise.all(
          flightDetails.map((flight: any) =>
            tx.voucherFlight.create({
              data: {
                voucherId: id,
                type: flight.type || 'AA',
                carrier: flight.carrier || '',
                number: flight.number || '',
                date: new Date(flight.date),
                from: flight.from || '',
                to: flight.to || '',
                etd: flight.etd || null,
                eta: flight.eta || null,
              },
            })
          )
        );
      }

      return updated;
    });

    res.json({ voucher: updatedVoucher });
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
        movements: {
          orderBy: {
            sr: 'asc',
          },
        },
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

    const index = parseInt(movementIndex, 10);
    const movement = voucher.movements[index];

    if (!movement) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

    // Update the specific movement record
    const updatedMovement = await prisma.voucherMovement.update({
      where: { id: movement.id },
      data: {
        driverDetails1: driverDetails1 !== undefined ? driverDetails1 : movement.driverDetails1,
        driverDetails2: driverDetails2 !== undefined ? driverDetails2 : movement.driverDetails2,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : movement.vehicleNumber,
      },
    });

    // Update voucher version
    await prisma.voucher.update({
      where: { id },
      data: {
        version: voucher.version + 1,
      },
    });

    res.json({ voucher: { ...voucher, movements: voucher.movements.map(m => m.id === movement.id ? updatedMovement : m) } });
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
        movements: {
          orderBy: {
            sr: 'asc',
          },
        },
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

    const index = parseInt(movementIndex, 10);
    const movement = voucher.movements[index];

    if (!movement) {
      return res.status(400).json({ error: 'Invalid movement index' });
    }

    const party = voucher.booking.party;

    // Send email
    if (party.email) {
      try {
        await sendMovementUpdateEmail(
          party.email,
          party.partyName,
          voucher.voucherNumber,
          {
            date: movement.date.toISOString().split('T')[0],
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
            date: movement.date.toISOString().split('T')[0],
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

