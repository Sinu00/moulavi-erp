import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { combineDateTime } from '../../utils/datetime';

// Export Prisma client instance (shared across all route files)
export const prisma = new PrismaClient();

// Flight number validation regex: 2 letters + dash + up to 4 numbers (e.g., SV-1234)
export const FLIGHT_NUMBER_REGEX = /^[A-Z]{2}-\d{1,4}$/;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/umrah-visa';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for ZIP files
  fileFilter: (req, file, cb) => {
    // Allow ZIP files for group bookings
    if (file.fieldname === 'panCardZipFile') {
      const allowedTypes = /zip|application\/zip|application\/x-zip-compressed/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype || extname || file.originalname.toLowerCase().endsWith('.zip')) {
        return cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for PAN card upload'));
      }
      return;
    }
    
    // For other files, use existing validation
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
    }
  }
});

// Helper function to validate date range (80 days max)
export const validateDateRange = (arrivalDate: Date, departureDate: Date) => {
  const diffTime = Math.abs(departureDate.getTime() - arrivalDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 80;
};

// Helper function to find city by name with spelling variations
export const findCityByName = async (cityName: string) => {
  const cityVariations = [cityName];
  if (cityName === 'Medina') cityVariations.push('Madinah');
  if (cityName === 'Madinah') cityVariations.push('Medina');
  if (cityName === 'Mecca') cityVariations.push('Makkah');
  if (cityName === 'Makkah') cityVariations.push('Mecca');
  
  return await prisma.cityMaster.findFirst({
    where: {
      name: { in: cityVariations },
      isActive: true,
    },
  });
};

// Common Zod schemas used by multiple route files

// Step 2 schema - used by both individual and group
// Note: Date and time are kept as separate strings for UI compatibility
// They will be combined into datetime before storing in the database
export const step2Schema = z.object({
  arrivalDate: z.string(), // YYYY-MM-DD format
  arrivalTime: z.string(), // HH:mm format
  arrivalAirportId: z.string().uuid(),
  arrivalFlightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234'),
  departureDate: z.string(), // YYYY-MM-DD format
  departureTime: z.string(), // HH:mm format
  departureAirportId: z.string().uuid(),
  departureFlightNumber: z.string().regex(FLIGHT_NUMBER_REGEX, 'Flight number must be in format: XX-1234'),
  passengerCount: z.number().min(1).max(50).optional(), // Number of passengers (for individual bookings)
  transportBookings: z.array(z.object({
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    vehicleType: z.string(),
    paxCount: z.number().min(1),
    price: z.number().min(0),
    travelDate: z.string().optional(), // YYYY-MM-DD format
    travelTime: z.string().optional(), // HH:mm format
  })).optional(),
  hotelBookings: z.array(z.object({
    locationId: z.string().uuid(),
    hotelId: z.string().uuid(),
    checkInDate: z.string().transform((str) => new Date(str)),
    checkOutDate: z.string().transform((str) => new Date(str)),
    brn: z.array(z.string()).optional(),
  })).optional(),
});

// Step 3 schema - used by both individual and group
export const step3Schema = z.object({
  accommodationType: z.enum(['hotel', 'iqama']),
  passengerCount: z.number().min(1).max(50).optional(), // Made optional since it comes in Step 4
  iqamaDetails: z.object({
    iqamaNumber: z.string().optional(),
    iqamaName: z.string().optional(),
    iqamaDob: z.string().transform((str) => new Date(str)).optional(),
    iqamaMobile: z.string().optional(),
    iqamaNationalShortAddress: z.string().optional(),
  }).optional(),
  hotelBookings: z.array(z.object({
    locationId: z.string().uuid(),
    hotelId: z.string().uuid(),
    checkInDate: z.string().transform((str) => new Date(str)),
    checkOutDate: z.string().transform((str) => new Date(str)),
    brn: z.array(z.string()).optional(),
  })).optional(),
}).refine((data) => {
  if (data.accommodationType === 'iqama' && data.passengerCount && data.passengerCount > 5) {
    return false;
  }
  return true;
}, {
  message: "Maximum 5 passengers allowed for iqama accommodation",
  path: ["passengerCount"]
});

// Step 4 schema - used by individual only (transport selection)
export const step4Schema = z.object({
  selectedTransport: z.object({
    routeId: z.string().uuid(),
    transportId: z.string().uuid(),
    vehicleTypeId: z.string().uuid(),
    price: z.number(),
  }).optional(),
  // Backward compatibility: support old format with passengers
  passengerCount: z.number().min(1).max(50).optional(),
  passengers: z.array(z.object({
    fullName: z.string().min(1).max(255),
    isLeadPassenger: z.boolean().default(false),
    documents: z.object({
      panCardPhoto: z.any().optional(),
      passportFront: z.any().optional(),
      passportBack: z.any().optional(),
      iqamaPhoto: z.any().optional(),
      hotelBooking: z.any().optional(),
      ticketCopy: z.any().optional(),
    }).optional(),
  })).optional(),
});

// Step 5 schema - used by individual only (passengers and documents)
export const step5Schema = z.object({
  passengerCount: z.number().min(1).max(50),
  passengers: z.array(z.object({
    fullName: z.string().min(1).max(255),
    isLeadPassenger: z.boolean().default(false),
    documents: z.object({
      panCardPhoto: z.any().optional(),
      passportFront: z.any().optional(),
      passportBack: z.any().optional(),
      iqamaPhoto: z.any().optional(),
      hotelBooking: z.any().optional(),
      ticketCopy: z.any().optional(),
    }).optional(),
  })),
});

// Group Step 1 schema
export const groupStep1Schema = z.object({
  groupNumber: z.string().min(1, 'Group number is required'),
  groupName: z.string().min(1, 'Group name is required'),
  passengerCount: z.number().min(1, 'Passenger count must be at least 1').max(50, 'Passenger count cannot exceed 50'),
  umrahVisaProviderId: z.string().uuid('Valid umrah visa provider ID is required').optional(),
});

// Group Step 3 schema - only transport segments and ziyaraths (hotels validated in step2)
export const groupStep3Schema = z.object({
  transportSegments: z.array(z.object({
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    fromHotelId: z.string().uuid().optional(), // LocationMaster ID for specific "from" location
    toHotelId: z.string().uuid().optional(),   // LocationMaster ID for specific "to" location
    vehicleType: z.string().optional(), // Made optional since it's not displayed in UI
    paxCount: z.number().min(0), // Changed to allow 0 (will be updated later)
    price: z.number().min(0),
    travelDate: z.string().optional(), // YYYY-MM-DD format
    travelTime: z.string().optional(), // HH:mm format
  })).optional(),
  ziyaraths: z.array(z.object({
    id: z.string(),
    ziyarathId: z.string().uuid(), // LocationMaster ID of ziyarath
    date: z.string().transform((str) => new Date(str)),
    time: z.string(),
  })).optional(),
});

