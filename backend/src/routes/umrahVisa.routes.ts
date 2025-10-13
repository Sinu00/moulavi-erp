import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest, CreateUmrahVisaBookingRequest, TransportPricingRequest } from '../types';
import { prisma } from '../config/database';
import { sendServiceConfirmationEmail } from '../services/emailService';
import { AuditService } from '../services/auditService';
import { ConflictService } from '../services/conflictService';
import { TransportPricingService } from '../services/transportPricingService';
import { PartyLimitsService } from '../services/partyLimitsService';
import { CacheService } from '../services/cacheService';
import { 
  VALIDATION_RULES, 
  requiresTransport, 
  validatePassengerCount, 
  validateTravelDates,
  getTransportPrice,
  TRANSPORT_PRICING
} from '../config/umrahConfig';

const router = Router();

// Validation for Umrah visa booking
const umrahVisaBookingValidation = [
  body('party_id').isUUID(),
  body('booking_mode').isIn(['group_number', 'travel_documents']),
  body('group_number').optional().isString().trim(),
  body('group_name').optional().isString().trim(),
  body('flight_number').isString().notEmpty().trim(),
  body('arrival_date').isISO8601().toDate(),
  body('departure_date').isISO8601().toDate(),
  body('arrival_airport').isString().notEmpty().trim(),
  body('transport_route').optional().isString().trim(),
  body('transport_type').optional().isString().trim(),
  body('transport_pax').optional().isInt({ min: 1 }),
  body('accommodation_type').isIn(['hotel', 'iqama']),
  body('makkah_checkin').optional().isISO8601().toDate(),
  body('makkah_checkout').optional().isISO8601().toDate(),
  body('madina_checkin').optional().isISO8601().toDate(),
  body('madina_checkout').optional().isISO8601().toDate(),
  body('iqama_number').optional().isString().trim(),
  body('iqama_name').optional().isString().trim(),
  body('iqama_dob').optional().isISO8601().toDate(),
  body('iqama_mobile').optional().isString().trim(),
  body('passenger_count').isInt({ min: 1, max: 50 }),
  body('passengers').isArray({ min: 1 }),
  body('passengers.*.is_lead_passenger').isBoolean(),
  body('passengers.*.full_name').isString().notEmpty().trim(),
  body('passengers.*.passport_number').isString().notEmpty().trim(),
  body('passengers.*.nationality').isString().notEmpty().trim(),
  body('passengers.*.passport_expiry').isISO8601().toDate(),
  body('passengers.*.date_of_birth').isISO8601().toDate(),
  body('passengers.*.gender').isIn(['male', 'female']),
  body('passengers.*.phone_number').optional().isString().trim(),
];

// Create Umrah Visa Booking
router.post(
  '/booking',
  authenticate,
  umrahVisaBookingValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const bookingData: CreateUmrahVisaBookingRequest = req.body;
    
    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: bookingData.party_id },
      select: { id: true, partyName: true, email: true }
    });
    
    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }
    
    // For party role, ensure they can only create services for themselves
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== bookingData.party_id) {
        return res.status(403).json({ error: 'You can only create services for your own account' });
      }
    }
    
    // Validate booking mode specific requirements
    if (bookingData.booking_mode === 'group_number') {
      if (!bookingData.group_number || !bookingData.group_name) {
        return res.status(400).json({ 
          error: 'Group number and group name are required for group booking mode' 
        });
      }
    }
    
    // Validate travel dates against party limits
    const arrivalDate = new Date(bookingData.arrival_date);
    const departureDate = new Date(bookingData.departure_date);
    
    const travelDurationValidation = await PartyLimitsService.validateTravelDuration(
      bookingData.party_id,
      arrivalDate,
      departureDate
    );
    
    if (!travelDurationValidation.isValid) {
      return res.status(400).json({ 
        error: travelDurationValidation.message || 'Travel duration validation failed' 
      });
    }
    
    // Validate passenger count against party limits
    const passengerValidation = await PartyLimitsService.validatePassengerCount(
      bookingData.party_id,
      bookingData.passenger_count,
      bookingData.accommodation_type
    );
    
    if (!passengerValidation.isValid) {
      return res.status(400).json({ 
        error: passengerValidation.message || 'Passenger count validation failed' 
      });
    }
    
    // Validate transport requirements for Jeddah routes
    if (requiresTransport(bookingData.arrival_airport)) {
      if (!bookingData.transport_route || !bookingData.transport_type || !bookingData.transport_pax) {
        return res.status(400).json({ 
          error: 'Transport details are required for Jeddah routes' 
        });
      }
      
      // Calculate transport price using dynamic pricing service
      const transportPricingResult = await TransportPricingService.getTransportPrice({
        routeId: bookingData.transport_route,
        transportType: bookingData.transport_type,
        paxCount: bookingData.transport_pax,
        date: new Date(bookingData.arrival_date)
      });
      
      if (!transportPricingResult.isValid) {
        return res.status(400).json({ 
          error: transportPricingResult.message || 'Invalid transport configuration' 
        });
      }
      
      bookingData.transport_price = transportPricingResult.price || 0;
    }
    
    // Validate accommodation type specific requirements
    if (bookingData.accommodation_type === 'hotel') {
      if (!bookingData.makkah_checkin || !bookingData.makkah_checkout || 
          !bookingData.madina_checkin || !bookingData.madina_checkout) {
        return res.status(400).json({ 
          error: 'Hotel check-in and check-out dates are required' 
        });
      }
    } else if (bookingData.accommodation_type === 'iqama') {
      if (!bookingData.iqama_number || !bookingData.iqama_name || 
          !bookingData.iqama_dob || !bookingData.iqama_mobile) {
        return res.status(400).json({ 
          error: 'Iqama details are required' 
        });
      }
    }
    
    // Validate passengers array length matches passenger count
    if (bookingData.passengers.length !== bookingData.passenger_count) {
      return res.status(400).json({ 
        error: 'Passengers array length must match passenger count' 
      });
    }
    
    // Validate only one lead passenger
    const leadPassengers = bookingData.passengers.filter(p => p.is_lead_passenger);
    if (leadPassengers.length !== 1) {
      return res.status(400).json({ 
        error: 'Exactly one lead passenger is required' 
      });
    }

    // Check for duplicate passengers
    const duplicatePassengerConflict = await ConflictService.checkDuplicatePassengers(bookingData.passengers);
    if (duplicatePassengerConflict) {
      return res.status(400).json({
        error: duplicatePassengerConflict.message,
        conflicts: [duplicatePassengerConflict]
      });
    }

    // Check for booking conflicts
    const conflictResult = await ConflictService.checkBookingConflicts(bookingData);
    if (conflictResult.hasConflict) {
      const { resolved, unresolved } = await ConflictService.resolveConflicts(conflictResult.conflicts, bookingData);
      
      if (unresolved.length > 0) {
        return res.status(409).json({
          error: 'Booking conflicts detected',
          conflicts: unresolved,
          resolved: resolved
        });
      }
    }
    
    // Create service and booking in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create service
      const service = await tx.service.create({
        data: {
          serviceType: 'umrah_visa',
          partyId: bookingData.party_id,
          status: 'pending'
        }
      });
      
      // Create Umrah visa booking
      const booking = await tx.umrahVisaBooking.create({
        data: {
          serviceId: service.id,
          bookingMode: bookingData.booking_mode,
          groupNumber: bookingData.group_number,
          groupName: bookingData.group_name,
          flightNumber: bookingData.flight_number,
          arrivalDate: arrivalDate,
          departureDate: departureDate,
          arrivalAirport: bookingData.arrival_airport,
          transportRoute: bookingData.transport_route,
          transportType: bookingData.transport_type,
          transportPax: bookingData.transport_pax,
          transportPrice: bookingData.transport_price,
          accommodationType: bookingData.accommodation_type,
          makkahCheckIn: bookingData.makkah_checkin ? new Date(bookingData.makkah_checkin) : null,
          makkahCheckOut: bookingData.makkah_checkout ? new Date(bookingData.makkah_checkout) : null,
          madinaCheckIn: bookingData.madina_checkin ? new Date(bookingData.madina_checkin) : null,
          madinaCheckOut: bookingData.madina_checkout ? new Date(bookingData.madina_checkout) : null,
          iqamaNumber: bookingData.iqama_number,
          iqamaName: bookingData.iqama_name,
          iqamaDob: bookingData.iqama_dob ? new Date(bookingData.iqama_dob) : null,
          iqamaMobile: bookingData.iqama_mobile,
          passengerCount: bookingData.passenger_count,
          status: 'pending'
        }
      });
      
      // Create passengers
      const passengers = await Promise.all(
        bookingData.passengers.map(passenger => 
          tx.umrahPassenger.create({
            data: {
              bookingId: booking.id,
              isLeadPassenger: passenger.is_lead_passenger,
              fullName: passenger.full_name,
              passportNumber: passenger.passport_number,
              nationality: passenger.nationality,
              passportExpiry: new Date(passenger.passport_expiry),
              dateOfBirth: new Date(passenger.date_of_birth),
              gender: passenger.gender as any,
              phoneNumber: passenger.phone_number
            }
          })
        )
      );
      
      return { service, booking, passengers };
    });
    
    // Log audit trail
    await AuditService.logBookingCreation(
      result.booking.id,
      req.user!.id,
      {
        bookingMode: result.booking.bookingMode,
        passengerCount: result.booking.passengerCount,
        accommodationType: result.booking.accommodationType,
        arrivalDate: result.booking.arrivalDate,
        departureDate: result.booking.departureDate,
      },
      req
    );

    // Log passenger creation
    for (const passenger of result.passengers) {
      await AuditService.logPassengerCreation(
        passenger.id,
        req.user!.id,
        {
          fullName: passenger.fullName,
          passportNumber: passenger.passportNumber,
          isLeadPassenger: passenger.isLeadPassenger,
        },
        req
      );
    }

    // Invalidate relevant caches
    CacheService.invalidateBookingCache();
    CacheService.invalidatePartyCache(bookingData.party_id);

    // Send confirmation email
    try {
      await sendServiceConfirmationEmail(
        party.email,
        party.partyName,
        'Umrah Visa Booking',
        result.service.id
      );
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
    
    res.status(201).json({
      service: result.service,
      booking: result.booking,
      passengers: result.passengers,
      message: 'Umrah visa booking created successfully',
    });
  })
);

// Get transport pricing
router.get(
  '/transport-pricing',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { route, transport_type, pax } = req.query;
    
    if (!route || !transport_type || !pax) {
      return res.status(400).json({ 
        error: 'Route, transport_type, and pax are required' 
      });
    }
    
    const pricingResult = await TransportPricingService.getTransportPrice({
      routeId: route as string,
      transportType: transport_type as string,
      paxCount: parseInt(pax as string)
    });
    
    if (!pricingResult.isValid) {
      return res.status(400).json({ 
        error: pricingResult.message || `Invalid transport configuration: No pricing found for route=${route}, transport=${transport_type}, pax=${pax}` 
      });
    }
    
    res.json({
      route,
      transport_type,
      pax: parseInt(pax as string),
      price: pricingResult.price,
      pricingId: pricingResult.pricingId,
      validFrom: pricingResult.validFrom,
      validTo: pricingResult.validTo
    });
  })
);

// Get all Umrah visa bookings (admin/staff only)
router.get(
  '/bookings',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      status, 
      bookingMode, 
      accommodationType,
      arrivalDateFrom,
      arrivalDateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1', 
      limit = '10' 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {
      isDeleted: false
    };
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Filter by booking mode
    if (bookingMode) {
      where.bookingMode = bookingMode;
    }
    
    // Filter by accommodation type
    if (accommodationType) {
      where.accommodationType = accommodationType;
    }
    
    // Filter by arrival date range
    if (arrivalDateFrom || arrivalDateTo) {
      where.arrivalDate = {};
      if (arrivalDateFrom) {
        where.arrivalDate.gte = new Date(arrivalDateFrom as string);
      }
      if (arrivalDateTo) {
        where.arrivalDate.lte = new Date(arrivalDateTo as string);
      }
    }
    
    // Search functionality
    if (search) {
      where.OR = [
        { groupNumber: { contains: search, mode: 'insensitive' } },
        { groupName: { contains: search, mode: 'insensitive' } },
        { flightNumber: { contains: search, mode: 'insensitive' } },
        { iqamaName: { contains: search, mode: 'insensitive' } },
        { iqamaNumber: { contains: search, mode: 'insensitive' } },
        {
          passengers: {
            some: {
              fullName: { contains: search, mode: 'insensitive' }
            }
          }
        },
        {
          service: {
            party: {
              partyName: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ];
    }
    
    // Sort options
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;
    
    const [bookings, total] = await Promise.all([
      prisma.umrahVisaBooking.findMany({
        where,
        include: {
          service: {
            include: {
              party: {
                select: {
                  id: true,
                  partyName: true,
                  email: true,
                  contactNumber: true,
                  whatsappNumber: true,
                  address: true,
                  gstNumber: true,
                  customerType: true,
                  accountCurrency: true
                }
              }
            }
          },
          passengers: {
            where: { isDeleted: false },
            orderBy: { isLeadPassenger: 'desc' }
          }
        },
        skip,
        take: limitNum,
        orderBy
      }),
      prisma.umrahVisaBooking.count({ where })
    ]);
    
    res.json({
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get party's Umrah visa bookings (for party dashboard)
router.get(
  '/party-bookings',
  authenticate,
  authorize('party'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Get the party for the current user
    const userParty = await prisma.party.findUnique({
      where: { userId: req.user!.id },
      select: { id: true }
    });
    
    if (!userParty) {
      return res.json({ bookings: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    }
    
    // Get bookings with passengers and documents
    const [bookings, total] = await Promise.all([
      prisma.umrahVisaBooking.findMany({
        where: {
          service: {
            partyId: userParty.id
          }
        },
        include: {
          service: {
            include: {
              documents: {
                select: {
                  id: true,
                  documentType: true,
                  fileName: true,
                  uploadedAt: true,
                  passengerId: true
                }
              }
            }
          },
          passengers: true
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.umrahVisaBooking.count({
        where: {
          service: {
            partyId: userParty.id
          }
        }
      })
    ]);
    
    res.json({
      bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get booking by ID
router.get(
  '/booking/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            party: {
              select: {
                partyName: true,
                email: true,
                contactNumber: true
              }
            },
            documents: true
          }
        },
        passengers: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== booking.service.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json({ booking });
  })
);

// Update group number (admin/staff only)
router.patch(
  '/booking/:id/group-number',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { groupNumber, groupName } = req.body;
    
    if (!groupNumber || !groupName) {
      return res.status(400).json({ error: 'Group number and group name are required' });
    }
    
    // Get current booking to log old values
    const currentBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id, isDeleted: false },
      select: { groupNumber: true, groupName: true }
    });

    if (!currentBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const booking = await prisma.umrahVisaBooking.update({
      where: { 
        id,
        isDeleted: false
      },
      data: { 
        groupNumber,
        groupName,
        updatedAt: new Date()
      },
      include: {
        service: {
          include: {
            party: {
              select: {
                partyName: true,
                email: true
              }
            }
          }
        },
        passengers: {
          where: { isDeleted: false }
        }
      }
    });

    // Log group number update
    await AuditService.logBookingUpdate(
      id,
      req.user!.id,
      { 
        groupNumber: currentBooking.groupNumber, 
        groupName: currentBooking.groupName 
      },
      { groupNumber, groupName },
      req
    );
    
    // Invalidate cache
    CacheService.invalidateBookingCache();
    
    res.json({ 
      booking,
      message: 'Group number updated successfully' 
    });
  })
);

// Update booking status (admin/staff only)
router.patch(
  '/booking/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!['pending', 'processing', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get current booking to log old status
    const currentBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!currentBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = await prisma.umrahVisaBooking.update({
      where: { 
        id,
        isDeleted: false
      },
      data: { 
        status: status as any,
        updatedAt: new Date()
      },
      include: {
        service: {
          include: {
            party: {
              select: {
                partyName: true,
                email: true
              }
            }
          }
        },
        passengers: {
          where: { isDeleted: false }
        }
      }
    });

    // Log status change
    await AuditService.logBookingStatusChange(
      id,
      req.user!.id,
      currentBooking.status,
      status,
      notes,
      req
    );
    
    // Send notification email if status changed to approved/completed
    if (['approved', 'completed'].includes(status)) {
      try {
        await sendServiceConfirmationEmail(
          booking.service.party.email,
          booking.service.party.partyName,
          'Umrah Visa',
          `Your Umrah visa booking has been ${status}. ${notes || ''}`
        );
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't fail the request if email fails
      }
    }
    
    res.json({ 
      booking,
      message: `Booking status updated to ${status}` 
    });
  })
);

// Soft delete booking (admin/staff only)
router.delete(
  '/booking/:id',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const booking = await prisma.umrahVisaBooking.update({
      where: { 
        id,
        isDeleted: false
      },
      data: { 
        isDeleted: true,
        deletedAt: new Date()
      }
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({ 
      message: 'Booking deleted successfully' 
    });
  })
);

    // Get booking statistics (admin/staff only)
router.get(
  '/stats',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
      arrivalDateFrom,
      arrivalDateTo
    } = req.query;
    
    const dateFrom = arrivalDateFrom ? new Date(arrivalDateFrom as string) : undefined;
    const dateTo = arrivalDateTo ? new Date(arrivalDateTo as string) : undefined;
    
    // Use cached statistics
    const stats = await CacheService.getCachedBookingStats(dateFrom, dateTo);
    
    res.json({ stats });
  })
);

export default router;
