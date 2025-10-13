import { Router, Response } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';
import { sendServiceConfirmationEmail } from '../services/emailService';

const router = Router();

// Validation for Umrah visa service
const umrahVisaValidation = [
  body('party_id').isUUID(),
  body('full_name').isString().notEmpty().trim(),
  body('passport_number').isString().notEmpty().trim(),
  body('nationality').isString().notEmpty().trim(),
  body('travel_date_from').isDate(),
  body('travel_date_to').isDate(),
  body('passport_expiry').isDate(),
  body('date_of_birth').isDate(),
  body('gender').isIn(['male', 'female']),
  body('phone_number').optional().isString(),
];

// Create Umrah Visa service
router.post(
  '/umrah-visa',
  authenticate,
  umrahVisaValidation,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      party_id,
      full_name,
      passport_number,
      nationality,
      travel_date_from,
      travel_date_to,
      passport_expiry,
      date_of_birth,
      gender,
      phone_number,
    } = req.body;
    
    // Verify party exists
    const party = await prisma.party.findUnique({
      where: { id: party_id },
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
      
      if (!userParty || userParty.id !== party_id) {
        return res.status(403).json({ error: 'You can only create services for your own account' });
      }
    }
    
    // Create service and visa details in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create service
      const service = await tx.service.create({
        data: {
          serviceType: 'umrah_visa',
          partyId: party_id,
          status: 'pending'
        }
      });
      
      // Create Umrah visa booking
      const visaBooking = await tx.umrahVisaBooking.create({
        data: {
          serviceId: service.id,
          bookingMode: 'group_number',
          groupNumber: `GRP-${Date.now()}`,
          flightNumber: 'TBD',
          arrivalDate: new Date(travel_date_from),
          departureDate: new Date(travel_date_to),
          arrivalAirport: 'TBD',
          accommodationType: 'hotel',
          passengerCount: 1,
          status: 'pending'
        }
      });

      // Create passenger for the booking
      const passenger = await tx.umrahPassenger.create({
        data: {
          bookingId: visaBooking.id,
          isLeadPassenger: true,
          fullName: full_name,
          passportNumber: passport_number,
          nationality,
          passportExpiry: new Date(passport_expiry),
          dateOfBirth: new Date(date_of_birth),
          gender: gender as any,
          phoneNumber: phone_number
        }
      });
      
      return { service, visaBooking, passenger };
    });
    
    // Send confirmation email
    try {
      await sendServiceConfirmationEmail(
        party.email,
        party.partyName,
        'Umrah Visa',
        result.service.id
      );
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }
    
    res.status(201).json({
      service: result.service,
      booking: result.visaBooking,
      passenger: result.passenger,
      message: 'Umrah visa service created successfully',
    });
  })
);

// Get all Umrah visa requests with party information (admin/staff only) - MUST come before /:id route
router.get(
  '/umrah-visa',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {
      service: {
        serviceType: 'umrah_visa'
      }
    };
    
    if (status) {
      where.status = status;
    }
    
    const [umrahVisas, total] = await Promise.all([
      prisma.umrahVisaBooking.findMany({
        where: {
          service: {
            serviceType: 'umrah_visa'
          }
        },
        include: {
          service: {
            include: {
              party: {
                select: {
                  email: true,
                  contactNumber: true,
                  whatsappNumber: true
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
            serviceType: 'umrah_visa'
          }
        }
      })
    ]);
    
    // Transform the data to match the expected format
    const transformedVisas = umrahVisas.map((visa: any) => ({
      ...visa,
      service_id: visa.service.id,
      service_status: visa.service.status,
      submitted_at: visa.service.submittedAt,
      service_created_at: visa.service.createdAt,
      party_email: visa.service.party.email,
      contact_number: visa.service.party.contactNumber,
      whatsapp_number: visa.service.party.whatsappNumber,
      passengers: visa.passengers
    }));
    
    res.json({
      umrahVisas: transformedVisas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get all services (admin/staff view all, party view their own)
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, service_type, page = '1', limit = '10' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const where: any = {};
    
    // If party role, only show their services
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty) {
        return res.json({ services: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      }
      
      where.partyId = userParty.id;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (service_type) {
      where.serviceType = service_type;
    }
    
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          party: {
            select: {
              partyName: true,
              email: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { submittedAt: 'desc' }
      }),
      prisma.service.count({ where })
    ]);
    
    // Transform the data to match the expected format
    const transformedServices = services.map(service => ({
      ...service,
      party_name: service.party.partyName,
      party_email: service.party.email
    }));
    
    res.json({
      services: transformedServices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get party's services with Umrah visa details (for party dashboard) - MUST come before /:id route
router.get(
  '/party-services',
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
      return res.json({ services: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
    }
    
    // Get services with Umrah visa booking
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: { partyId: userParty.id },
        include: {
          umrahVisaBooking: true,
          documents: {
            select: {
              id: true,
              documentType: true,
              fileName: true,
              uploadedAt: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { submittedAt: 'desc' }
      }),
      prisma.service.count({ where: { partyId: userParty.id } })
    ]);
    
    // Transform the data to include Umrah visa status
    const transformedServices = services.map(service => {
      const umrahVisaBooking = service.umrahVisaBooking; // Get Umrah visa booking
      
      return {
        ...service,
        // Include Umrah visa status if available
        umrahVisaStatus: umrahVisaBooking?.status || service.status,
        umrahVisaBooking: umrahVisaBooking || null,
        documents: service.documents
      };
    });
    
    res.json({
      services: transformedServices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  })
);

// Get service by ID with details
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        party: {
          select: {
            partyName: true,
            email: true,
            contactNumber: true
          }
        },
        umrahVisaBooking: true,
        documents: true
      }
    });
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Check authorization for party role
    if (req.user!.role === 'party') {
      const userParty = await prisma.party.findUnique({
        where: { userId: req.user!.id },
        select: { id: true }
      });
      
      if (!userParty || userParty.id !== service.partyId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Transform the data to match the expected format
    const transformedService = {
      ...service,
      party_name: service.party.partyName,
      party_email: service.party.email,
      contact_number: service.party.contactNumber
    };
    
    // Get service-specific details
    let details = null;
    if (service.serviceType === 'umrah_visa' && service.umrahVisaBooking) {
      details = service.umrahVisaBooking;
    }
    
    res.json({
      service: transformedService,
      details,
      documents: service.documents,
    });
  })
);

// Update Umrah visa status (admin/staff only)
router.patch(
  '/umrah-visa/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'processing', 'approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const umrahVisa = await prisma.umrahVisaBooking.update({
      where: { id },
      data: { status: status as any }
    });
    
    res.json({ umrahVisa });
  })
);

// Update service status (admin/staff only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const service = await prisma.service.update({
      where: { id },
      data: { status: status as any }
    });
    
    res.json({ service });
  })
);

export default router;

