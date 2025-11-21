import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { z } from 'zod';
import multer from 'multer';
import {
  prisma,
  validateDateRange,
  step2Schema,
  groupStep1Schema,
  groupStep3Schema,
  upload,
} from './umrahVisa/shared';
import { combineDateTime } from '../utils/datetime';
import { syncBookingStatusInTx } from '../services/statusSyncService';

const router = Router();

// Complete group booking schema
const completeGroupBookingSchema = z.object({
  partyId: z.string().uuid(),
  step1: groupStep1Schema,
  step2: step2Schema,
  step3: groupStep3Schema,
  step4: z.object({
    // passengerCount removed - now in step2Data
    passengers: z.array(z.object({
      fullName: z.string().min(1).max(255).optional(), // Made optional - not required for group bookings with ZIP
      isLeadPassenger: z.boolean().default(false),
      panCardPhoto: z.any().optional(),
    })).optional(), // Made optional - only ZIP file is required
  }),
});

// POST /api/umrah-visa/group/step1 - Group Step 1: Validation Only (No DB writes)
router.post('/group/step1', authenticate, async (req, res) => {
  try {
    const { partyId, ...step1Data } = req.body;
    
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Validate only step1 data (without partyId)
    const validatedData = groupStep1Schema.parse(step1Data);

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 1 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 1 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 1' });
  }
});

// POST /api/umrah-visa/group/step2 - Group Step 2: Validation Only (No DB writes)
router.post('/group/step2', authenticate, async (req, res) => {
  try {
    const validatedData = step2Schema.parse(req.body);

    // Validate date range (80 days max) - convert strings to Date objects
    const arrivalDateObj = new Date(validatedData.arrivalDate);
    const departureDateObj = new Date(validatedData.departureDate);
    if (!validateDateRange(arrivalDateObj, departureDateObj)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 2 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 2 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 2' });
  }
});

// POST /api/umrah-visa/group/step3 - Group Step 3: Validation Only (No DB writes)
router.post('/group/step3', authenticate, async (req, res) => {
  try {
    const validatedData = groupStep3Schema.parse(req.body);

    // Only validate - no database writes
    // Data will be saved only when all steps are completed in create-group-booking endpoint
    res.status(200).json({
      message: 'Group booking step 3 validation successful',
      valid: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error in group booking step 3 validation:', error);
    res.status(500).json({ error: 'Failed to validate step 3' });
  }
});

// POST /api/umrah-visa/group/create-booking - Create complete group booking (all steps in one transaction)
router.post('/group/create-booking', authenticate, upload.single('panCardZipFile'), async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Parse JSON strings from FormData
    let step1Data, step2Data, step3Data, step4Data, partyId;
    
    if (req.body.step1) {
      // FormData mode - parse JSON strings
      partyId = req.body.partyId;
      step1Data = JSON.parse(req.body.step1);
      step2Data = JSON.parse(req.body.step2);
      step3Data = JSON.parse(req.body.step3);
      step4Data = JSON.parse(req.body.step4);
      
      // Keep date and time as strings - they will be combined before storing
      // No conversion needed here
      
      // Convert date strings to Date objects for step2Data hotel bookings
      if (step2Data.hotelBookings && Array.isArray(step2Data.hotelBookings)) {
        step2Data.hotelBookings = step2Data.hotelBookings.map((hotel: any) => ({
          ...hotel,
          checkInDate: hotel.checkInDate ? new Date(hotel.checkInDate) : hotel.checkInDate,
          checkOutDate: hotel.checkOutDate ? new Date(hotel.checkOutDate) : hotel.checkOutDate,
        }));
      }
      
      // Keep travel date and time as strings - they will be combined before storing
      // No conversion needed here
      
      // Convert date strings to Date objects for step3Data ziyaraths
      if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths)) {
        step3Data.ziyaraths = step3Data.ziyaraths.map((ziyarath: any) => ({
          ...ziyarath,
          date: ziyarath.date ? new Date(ziyarath.date) : ziyarath.date,
        }));
      }
    } else {
      // JSON mode (backward compatibility)
      const validatedData = completeGroupBookingSchema.parse(req.body);
      partyId = validatedData.partyId;
      step1Data = validatedData.step1;
      step2Data = validatedData.step2;
      step3Data = validatedData.step3;
      step4Data = validatedData.step4;
    }

    // Validate required fields
    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

    // Validate date range - convert strings to Date objects
    const arrivalDateObj = new Date(step2Data.arrivalDate);
    const departureDateObj = new Date(step2Data.departureDate);
    if (!validateDateRange(arrivalDateObj, departureDateObj)) {
      return res.status(400).json({ error: 'Travel duration cannot exceed 80 days' });
    }

    // Validate passenger count (now from step2Data to match individual bookings)
    const passengerCount = step2Data.passengerCount;
    if (!passengerCount || passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    // Validate ZIP file upload for group bookings (ONLY requirement)
    const zipFile = req.file; // Multer provides the uploaded file
    if (!zipFile) {
      return res.status(400).json({ 
        error: 'PAN card ZIP file is required. Please upload a ZIP file containing all PAN cards for the group.' 
      });
    }

    // Validate ZIP file type
    const isValidZip = zipFile.mimetype === 'application/zip' || 
                       zipFile.mimetype === 'application/x-zip-compressed' ||
                       zipFile.originalname.toLowerCase().endsWith('.zip');
    if (!isValidZip) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a ZIP file (.zip)' });
    }

    // Create passengers array from passengerCount (no individual names required)
    const passengers = Array(passengerCount).fill(null).map((_, index) => ({
      fullName: step1Data.groupName || `Passenger ${index + 1}`, // Use group name or default
      isLeadPassenger: index === 0,
    }));

    // Calculate hasTransportation
    // Check for both single transport selection and multiple transport selection (for fulltrip routes)
    const hasTransportation = !!(step4Data.selectedTransport || 
      (step4Data.selectedTransports && step4Data.selectedTransports.length > 0));

    // PRE-FETCH: Collect all unique IDs needed for LocationMaster lookups
    const allLocationIds = new Set<string>();
    const allCityIds = new Set<string>();
    const hotelBookingsData = step2Data.hotelBookings || [];

    // Collect hotel IDs
    hotelBookingsData.forEach((hotel: any) => {
      if (hotel.hotelId) allLocationIds.add(hotel.hotelId);
      if (hotel.locationId) {
        // Could be LocationMaster ID or City ID - we'll check both
        allLocationIds.add(hotel.locationId);
        allCityIds.add(hotel.locationId);
      }
    });

    // Collect airport IDs
    if (step2Data.arrivalAirportId) allLocationIds.add(step2Data.arrivalAirportId);
    if (step2Data.departureAirportId) allLocationIds.add(step2Data.departureAirportId);

    // Collect transport segment IDs
    if (step3Data.transportSegments && Array.isArray(step3Data.transportSegments)) {
      step3Data.transportSegments.forEach((segment: any) => {
        if (segment.fromHotelId) allLocationIds.add(segment.fromHotelId);
        if (segment.toHotelId) allLocationIds.add(segment.toHotelId);
        if (segment.fromLocationId) {
          allLocationIds.add(segment.fromLocationId);
          allCityIds.add(segment.fromLocationId);
        }
        if (segment.toLocationId) {
          allLocationIds.add(segment.toLocationId);
          allCityIds.add(segment.toLocationId);
        }
      });
    }

    // Collect ziyarath IDs
    if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths)) {
      step3Data.ziyaraths.forEach((ziyarath: any) => {
        if (ziyarath.ziyarathId) allLocationIds.add(ziyarath.ziyarathId);
      });
    }

    // Batch query to fetch all LocationMasters before transaction
    const allLocationMasters = await prisma.locationMaster.findMany({
      where: {
        OR: [
          { id: { in: Array.from(allLocationIds) } },
          { cityId: { in: Array.from(allCityIds) } },
        ],
      },
      select: { id: true, cityId: true, locationType: true },
    });

    // Create lookup maps
    const locationMap = new Map<string, typeof allLocationMasters[0]>();
    const cityToLocationMap = new Map<string, typeof allLocationMasters[0][]>();

    allLocationMasters.forEach((lm) => {
      // Map by ID
      locationMap.set(lm.id, lm);

      // Map by cityId (group locations by city)
      if (lm.cityId) {
        if (!cityToLocationMap.has(lm.cityId)) {
          cityToLocationMap.set(lm.cityId, []);
        }
        cityToLocationMap.get(lm.cityId)!.push(lm);
      }
    });

    // Helper function to resolve location ID (works with both LocationMaster IDs and City IDs)
    const resolveLocationId = (id: string, preferType?: string): string | null => {
      // First, check if it's a LocationMaster ID
      if (locationMap.has(id)) {
        return id;
      }

      // If not found, check if it's a City ID
      const cityLocations = cityToLocationMap.get(id);
      if (cityLocations && cityLocations.length > 0) {
        // Prefer specific type if provided, otherwise use first one
        if (preferType) {
          const preferred = cityLocations.find((l) => l.locationType === preferType);
          if (preferred) return preferred.id;
        }
        return cityLocations[0].id;
      }

      return null;
    };

    // Save everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create UmrahVisaBooking directly with partyId (group visa, always hotel, status = group_assigned)
      const booking = await tx.umrahVisaBooking.create({
        data: {
          partyId: partyId,
          submittedAt: new Date(),
          groupNumber: step1Data.groupNumber,
          groupName: step1Data.groupName,
          hasGroupNumber: true,
          passengerCount: step2Data.passengerCount,
          umrahVisaProviderId: step1Data.umrahVisaProviderId || null,
          status: 'group_assigned',
          visaType: 'group_visa',
          accommodationType: 'hotel',
          hasTransportation,
          lastUpdatedBy: user.id,
        },
      });

      // 3. Create UmrahTravelDetails - combine date and time before storing
      const arrivalDateTime = combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime);
      const departureDateTime = combineDateTime(step2Data.departureDate, step2Data.departureTime);
      
      if (!arrivalDateTime || !departureDateTime) {
        throw new Error('Invalid arrival or departure date/time');
      }

      const travelDetails = await tx.umrahTravelDetails.create({
        data: {
          bookingId: booking.id,
          arrivalDateTime,
          arrivalAirportId: step2Data.arrivalAirportId,
          arrivalFlightNumber: step2Data.arrivalFlightNumber,
          departureDateTime,
          departureAirportId: step2Data.departureAirportId,
          departureFlightNumber: step2Data.departureFlightNumber,
        },
      });

      // 4. Create UmrahHotelBooking (from step2Data for group bookings - always hotel for group)
      if (hotelBookingsData.length > 0) {
        const createdHotelBookings = await Promise.all(
          hotelBookingsData.map(async (hotel: any) => {
            // Validate required fields
            if (!hotel.hotelId) {
              throw new Error(`Missing hotelId in hotel booking`);
            }
            if (!hotel.checkInDate) {
              throw new Error(`Missing checkInDate in hotel booking`);
            }
            if (!hotel.checkOutDate) {
              throw new Error(`Missing checkOutDate in hotel booking`);
            }

            // Get hotel's LocationMaster to find its cityId
            const hotelLocation = locationMap.get(hotel.hotelId);
            if (!hotelLocation) {
              throw new Error(`Invalid hotelId ${hotel.hotelId} - hotel LocationMaster not found`);
            }

            // Resolve locationId using pre-fetched maps
            let locationMasterId: string | null = null;

            // First, try to resolve hotel.locationId (could be LocationMaster ID or City ID)
            if (hotel.locationId) {
              locationMasterId = resolveLocationId(hotel.locationId, 'OTHERS');
            }

            // If not resolved, use hotel's city to find a LocationMaster
            if (!locationMasterId && hotelLocation.cityId) {
              locationMasterId = resolveLocationId(hotelLocation.cityId, 'OTHERS');
            }

            // If still not found, throw error
            if (!locationMasterId) {
              throw new Error(`No LocationMaster found for hotel booking. Hotel: ${hotel.hotelId}, Location: ${hotel.locationId}`);
            }

            // Ensure dates are Date objects
            const checkInDate = hotel.checkInDate instanceof Date 
              ? hotel.checkInDate 
              : new Date(hotel.checkInDate);
            const checkOutDate = hotel.checkOutDate instanceof Date 
              ? hotel.checkOutDate 
              : new Date(hotel.checkOutDate);
            
            // Validate dates
            if (isNaN(checkInDate.getTime())) {
              throw new Error(`Invalid checkInDate: ${hotel.checkInDate}`);
            }
            if (isNaN(checkOutDate.getTime())) {
              throw new Error(`Invalid checkOutDate: ${hotel.checkOutDate}`);
            }

            return tx.umrahHotelBooking.create({
              data: {
                bookingId: booking.id,
                locationId: locationMasterId,
                hotelId: hotel.hotelId,
                checkInDate,
                checkOutDate,
                brn: hotel.brn && Array.isArray(hotel.brn) && hotel.brn.length > 0 
                  ? hotel.brn 
                  : null,
              },
            });
          })
        );
      }

      // 6. Create UmrahTransportBooking (from step4 selectedTransport or selectedTransports)
      if (step4Data.selectedTransport) {
        const { transportId } = step4Data.selectedTransport;
        
        // Combine arrival date and time for travelDateTime
        const travelDateTime = step2Data.arrivalDate && step2Data.arrivalTime
          ? combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime)
              : undefined;

        // Store transportMasterId and travelDateTime - all other data (route, vehicle, price) comes from TransportMaster
        await tx.umrahTransportBooking.create({
          data: {
            bookingId: booking.id,
            transportMasterId: transportId, // This is the TransportMaster ID
            travelDateTime,
          },
        });
      } else if (step4Data.selectedTransports && step4Data.selectedTransports.length > 0) {
        // Handle multiple transport selections (for fulltrip routes)
        // Combine arrival date and time for travelDateTime
        const travelDateTime = step2Data.arrivalDate && step2Data.arrivalTime
          ? combineDateTime(step2Data.arrivalDate, step2Data.arrivalTime)
              : undefined;

        // Create transport bookings for each selected transport with quantity
        for (const transport of step4Data.selectedTransports) {
          // Create one booking per quantity
          for (let i = 0; i < (transport.quantity || 1); i++) {
            await tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                transportMasterId: transport.transportId, // This is the TransportMaster ID
                travelDateTime,
              },
            });
          }
        }
      }

      // 6.5. Create UmrahMovementDetail entries from step3Data (transportSegments and ziyaraths)
      const movementDetailsToCreate: Array<{
        bookingId: string;
        travelDateTime: Date;
        fromCityId: string;
        fromLocationId: string;
        toCityId: string;
        toLocationId: string;
      }> = [];

      // Process transportSegments
      // Frontend sends: fromLocationId/toLocationId = City IDs, fromHotelId/toHotelId = LocationMaster IDs
      // Database needs: fromCityId/toCityId = City IDs, fromLocationId/toLocationId = LocationMaster IDs
      if (step3Data.transportSegments && Array.isArray(step3Data.transportSegments)) {
        for (const segment of step3Data.transportSegments) {
          // Map frontend data to database structure
          let fromCityId: string;
          let fromLocationId: string;
          let toCityId: string;
          let toLocationId: string;

          // Handle "from" location using pre-fetched maps
          if (segment.fromHotelId) {
            // fromHotelId is the LocationMaster ID (specific hotel/airport)
            const fromLocation = locationMap.get(segment.fromHotelId);
            if (!fromLocation) {
              throw new Error(`Invalid fromHotelId in transport segment: ${segment.fromHotelId}`);
            }
            fromLocationId = fromLocation.id; // LocationMaster ID
            fromCityId = fromLocation.cityId; // City ID from LocationMaster
          } else if (segment.fromLocationId) {
            // fromLocationId could be a City ID or LocationMaster ID
            const resolvedLocationId = resolveLocationId(segment.fromLocationId);
            if (!resolvedLocationId) {
              throw new Error(`No LocationMaster found for fromLocationId: ${segment.fromLocationId}`);
            }
            const fromLocation = locationMap.get(resolvedLocationId);
            if (!fromLocation) {
              throw new Error(`Invalid fromLocationId in transport segment: ${segment.fromLocationId}`);
            }
            fromCityId = fromLocation.cityId;
            fromLocationId = fromLocation.id;
          } else {
            throw new Error(`Missing from location in transport segment`);
          }

          // Handle "to" location using pre-fetched maps
          if (segment.toHotelId) {
            // toHotelId is the LocationMaster ID (specific hotel/airport)
            const toLocation = locationMap.get(segment.toHotelId);
            if (!toLocation) {
              throw new Error(`Invalid toHotelId in transport segment: ${segment.toHotelId}`);
            }
            toLocationId = toLocation.id; // LocationMaster ID
            toCityId = toLocation.cityId; // City ID from LocationMaster
          } else if (segment.toLocationId) {
            // toLocationId could be a City ID or LocationMaster ID
            const resolvedLocationId = resolveLocationId(segment.toLocationId);
            if (!resolvedLocationId) {
              throw new Error(`No LocationMaster found for toLocationId: ${segment.toLocationId}`);
            }
            const toLocation = locationMap.get(resolvedLocationId);
            if (!toLocation) {
              throw new Error(`Invalid toLocationId in transport segment: ${segment.toLocationId}`);
            }
            toCityId = toLocation.cityId;
            toLocationId = toLocation.id;
          } else {
            throw new Error(`Missing to location in transport segment`);
          }

          // Combine travelDate and travelTime into travelDateTime
          // If time is missing or empty, default to 12:00 PM (noon)
          const timeToUse = segment.travelTime && segment.travelTime.trim() !== '' 
            ? segment.travelTime 
            : '12:00'; // Default to noon if time is not provided

          if (!segment.travelDate) {
            throw new Error(`Missing travel date for transport segment from ${fromLocationId} to ${toLocationId}`);
          }

          const travelDateTime = combineDateTime(segment.travelDate, timeToUse);

          if (!travelDateTime) {
            throw new Error(`Invalid travel date/time for transport segment from ${fromLocationId} to ${toLocationId}. Date: ${segment.travelDate}, Time: ${timeToUse}`);
          }

          movementDetailsToCreate.push({
            bookingId: booking.id,
            travelDateTime,
            fromCityId,
            fromLocationId,
            toCityId,
            toLocationId,
          });
        }
      }

      // Process ziyaraths
      if (step3Data.ziyaraths && Array.isArray(step3Data.ziyaraths) && step3Data.ziyaraths.length > 0) {
        // Create a combined list of all movements (transport segments + ziyaraths) for sorting
        const transportMovements = movementDetailsToCreate.map((md) => ({
          type: 'transport' as const,
          travelDateTime: md.travelDateTime,
          data: md,
        }));

        const ziyarathMovements = step3Data.ziyaraths.map((z: { id: string; ziyarathId: string; date: Date | string; time: string }) => ({
          type: 'ziyarath' as const,
          travelDateTime: combineDateTime(
            z.date instanceof Date ? z.date.toISOString().split('T')[0] : z.date,
            z.time
          ),
          data: z,
        }));

        // Sort all movements by date/time
        const allMovements = [...transportMovements, ...ziyarathMovements]
          .filter((m) => m.travelDateTime !== null)
          .sort((a, b) => {
            const dateA = a.travelDateTime as Date;
            const dateB = b.travelDateTime as Date;
            return dateA.getTime() - dateB.getTime();
          });

        // Process ziyaraths in chronological order
        // Track current location as we iterate (simpler than nested loops)
        let currentCityId: string | null = null;
        let currentLocationId: string | null = null;

        // Initialize current location from last hotel booking if available
        if (hotelBookingsData.length > 0) {
          const lastHotel = hotelBookingsData[hotelBookingsData.length - 1];
          const lastHotelLocation = locationMap.get(lastHotel.hotelId);
          if (lastHotelLocation) {
            currentCityId = lastHotelLocation.cityId;
            currentLocationId = lastHotelLocation.id;
          }
        }

        for (const movement of allMovements) {
          if (movement.type === 'transport') {
            // Update current location to transport segment's destination
            const transportData = movement.data as any;
            currentCityId = transportData.toCityId;
            currentLocationId = transportData.toLocationId;
          } else if (movement.type === 'ziyarath') {
            const ziyarath = movement.data as any;

            // Get ziyarath's LocationMaster using pre-fetched map
            const ziyarathLocation = locationMap.get(ziyarath.ziyarathId);
            if (!ziyarathLocation) {
              throw new Error(`Invalid ziyarath location ID: ${ziyarath.ziyarathId}`);
            }

            // Use current location as "from" location
            if (!currentCityId || !currentLocationId) {
              throw new Error(`Cannot determine 'from' location for ziyarath ${ziyarath.ziyarathId}. No previous movement found.`);
            }

            // travelDateTime was already calculated during sorting
            const travelDateTime = movement.travelDateTime as Date;

            const ziyarathMovement = {
              bookingId: booking.id,
              travelDateTime,
              fromCityId: currentCityId,
              fromLocationId: currentLocationId,
              toCityId: ziyarathLocation.cityId,
              toLocationId: ziyarath.ziyarathId,
            };

            movementDetailsToCreate.push(ziyarathMovement);

            // Update current location to ziyarath's location
            currentCityId = ziyarathLocation.cityId;
            currentLocationId = ziyarath.ziyarathId;
          }
        }
      }

      // Create all movement details
      if (movementDetailsToCreate.length > 0) {
        await Promise.all(
          movementDetailsToCreate.map((movement) =>
            tx.umrahMovementDetail.create({
              data: movement,
            })
          )
        );
      }

      // 7. Create UmrahPassenger (all passengers) - using generated passengers from passengerCount
      const passengerRecords = await Promise.all(
        passengers.map((passenger: any) =>
          tx.umrahPassenger.create({
            data: {
              bookingId: booking.id,
              fullName: passenger.fullName.trim(),
              isLeadPassenger: passenger.isLeadPassenger,
            },
          })
        )
      );

      // 7.5. Save ZIP file as Document (linked to booking, not individual passenger)
      if (zipFile) {
        await tx.document.create({
          data: {
            bookingId: booking.id,
            documentType: 'pan_card_zip',
            fileName: zipFile.originalname,
            filePath: zipFile.path,
            fileSize: zipFile.size,
            mimeType: zipFile.mimetype,
          },
        });
      }

      // 8. Get party name
      const party = await tx.party.findUnique({
        where: { id: partyId },
        select: { partyName: true },
      });

      // 9. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: 'group_assigned',
          changedBy: user.id,
          reason: 'Group booking created',
        },
      });

      return { booking, travelDetails, passengers: passengerRecords };
    }, {
      maxWait: 10000,  // 10 seconds max wait
      timeout: 30000,  // 30 seconds timeout
    });

    res.status(201).json({
      message: 'Group Umrah visa booking completed successfully',
      data: {
        bookingId: result.booking.id,
        passengerCount: passengerCount,
        passengers: result.passengers,
        status: 'group_assigned',
      },
    });
  } catch (error) {
    // Handle multer errors
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 50MB limit. Please compress your files.' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return res.status(400).json({ error: 'Invalid JSON data in request' });
    }
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    
    console.error('❌ Error creating group booking:', error);
    res.status(500).json({ error: 'Failed to create group booking' });
  }
});

// POST /api/umrah-visa/group/add-to-existing-booking - Add new group to existing booking
router.post('/group/add-to-existing-booking', authenticate, upload.single('panCardZipFile'), async (req, res) => {
  try {
    const user = (req as any).user;
    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';
    
    // Parse request body (can be JSON or form-data)
    let existingBookingId: string;
    let newGroupNumber: string;
    let newGroupName: string;
    let passengerCount: number;
    let providedPartyId: string | undefined;

    if (req.body && typeof req.body === 'string') {
      // JSON mode
      const body = JSON.parse(req.body);
      existingBookingId = body.existingBookingId;
      newGroupNumber = body.newGroupNumber;
      newGroupName = body.newGroupName;
      passengerCount = parseInt(body.passengerCount);
      providedPartyId = body.partyId;
    } else {
      // Form-data mode
      existingBookingId = req.body.existingBookingId;
      newGroupNumber = req.body.newGroupNumber;
      newGroupName = req.body.newGroupName;
      passengerCount = parseInt(req.body.passengerCount);
      providedPartyId = req.body.partyId;
    }

    // Determine party ID: admin/staff can provide it, party users must use their own
    let partyId: string;
    
    if (isAdminOrStaff && providedPartyId) {
      // Admin/staff provided partyId - validate it exists
      const party = await prisma.party.findUnique({
        where: { id: providedPartyId },
        select: { id: true },
      });
      
      if (!party) {
        return res.status(404).json({ error: 'Party not found' });
      }
      
      partyId = providedPartyId;
    } else if (user.role === 'party') {
      // Party users must use their own party ID
      if (providedPartyId) {
        return res.status(403).json({ error: 'Party users cannot specify partyId' });
      }
      
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!userParty) {
        return res.status(404).json({ error: 'Party not found for this user' });
      }

      partyId = userParty.id;
    } else {
      // Admin/staff but no partyId provided - try to get from user's party (if exists)
      const userParty = await prisma.party.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      if (!userParty) {
        return res.status(400).json({ error: 'Party ID is required for admin/staff users' });
      }

      partyId = userParty.id;
    }

    // Validate required fields
    if (!existingBookingId || !newGroupNumber || !newGroupName || !passengerCount) {
      return res.status(400).json({ 
        error: 'Missing required fields: existingBookingId, newGroupNumber, newGroupName, passengerCount' 
      });
    }

    if (passengerCount < 1 || passengerCount > 50) {
      return res.status(400).json({ error: 'Passenger count must be between 1 and 50' });
    }

    // Validate ZIP file upload
    const zipFile = req.file;
    if (!zipFile) {
      return res.status(400).json({ 
        error: 'PAN card ZIP file is required. Please upload a ZIP file containing all PAN cards for the group.' 
      });
    }

    // Validate ZIP file type
    const isValidZip = zipFile.mimetype === 'application/zip' || 
                       zipFile.mimetype === 'application/x-zip-compressed' ||
                       zipFile.originalname.toLowerCase().endsWith('.zip');
    if (!isValidZip) {
      return res.status(400).json({ error: 'Invalid file type. Please upload a ZIP file (.zip)' });
    }

    // Check if existing booking exists and belongs to the party
    const existingBooking = await prisma.umrahVisaBooking.findUnique({
      where: { id: existingBookingId },
      include: {
        passengers: true,
        travelDetails: true,
        hotelBookings: true,
        sponsorIqamaDetails: true,
        transportBookings: true,
        movementDetails: true,
      },
    });

    if (!existingBooking) {
      return res.status(404).json({ error: 'Existing booking not found' });
    }

    if (existingBooking.partyId !== partyId) {
      return res.status(403).json({ error: 'You do not have permission to modify this booking' });
    }

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Parse existing multipleGroupDetails or create new array
      let multipleGroupDetails: any[] = [];
      
      if (existingBooking.hasMultipleGroup && existingBooking.multipleGroupDetails) {
        multipleGroupDetails = Array.isArray(existingBooking.multipleGroupDetails) 
          ? existingBooking.multipleGroupDetails 
          : [];
      } else {
        // First time adding a group - move existing group to array
        if (existingBooking.groupNumber && existingBooking.groupName) {
          multipleGroupDetails.push({
            groupNumber: existingBooking.groupNumber,
            groupName: existingBooking.groupName,
            passengerCount: existingBooking.passengerCount,
            documentId: null, // Original booking's document if any
          });
        }
      }

      // Upload ZIP file and create Document record
      const document = await tx.document.create({
        data: {
          bookingId: existingBookingId,
          documentType: 'pan_card_zip',
          fileName: zipFile.originalname,
          filePath: zipFile.path,
          fileSize: zipFile.size,
          mimeType: zipFile.mimetype,
        },
      });

      // Add new group to multipleGroupDetails
      multipleGroupDetails.push({
        groupNumber: newGroupNumber,
        groupName: newGroupName,
        passengerCount: passengerCount,
        documentId: document.id,
      });

      // Calculate total passenger count
      const totalPassengerCount = multipleGroupDetails.reduce(
        (sum, group) => sum + group.passengerCount, 
        0
      );

      // Create comma-separated group numbers and names for display
      const combinedGroupNumbers = multipleGroupDetails
        .map(g => g.groupNumber)
        .join(', ');
      const combinedGroupNames = multipleGroupDetails
        .map(g => g.groupName)
        .join(', ');

      // Create passengers for new group (like group booking)
      const newPassengers = Array(passengerCount).fill(null).map((_, index) => ({
        bookingId: existingBookingId,
        fullName: newGroupName || `Passenger ${index + 1}`,
        isLeadPassenger: index === 0 && existingBooking.passengers.length === 0,
      }));

      // Create passenger records
      await Promise.all(
        newPassengers.map(passenger =>
          tx.umrahPassenger.create({
            data: passenger,
          })
        )
      );

      // Update existing booking
      const updatedBooking = await tx.umrahVisaBooking.update({
        where: { id: existingBookingId },
        data: {
          hasMultipleGroup: true,
          multipleGroupDetails: multipleGroupDetails,
          groupNumber: combinedGroupNumbers,
          groupName: combinedGroupNames,
          passengerCount: totalPassengerCount,
          lastUpdatedBy: user.id,
        },
      });

      // Update status to group_assigned using sync function
      await syncBookingStatusInTx(
        existingBookingId,
        'group_assigned',
        user.id,
        'Group added to existing booking',
        tx
      );

      return { booking: updatedBooking, document };
    });

    res.status(200).json({
      message: 'Group added to existing booking successfully',
      data: {
        bookingId: result.booking.id,
        passengerCount: result.booking.passengerCount,
        status: 'group_assigned',
      },
    });
  } catch (error) {
    // Handle multer errors
    if ((error as any).code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 50MB limit. Please compress your files.' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Error adding group to existing booking:', error);
    res.status(500).json({ error: 'Failed to add group to existing booking' });
  }
});

export default router;

