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
    const { partyId } = req.body;
    const validatedData = groupStep1Schema.parse(req.body);

    if (!partyId) {
      return res.status(400).json({ error: 'Party ID is required' });
    }

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
      
      // Convert date strings to Date objects for step3Data hotel bookings
      if (step3Data.hotelBookings && Array.isArray(step3Data.hotelBookings)) {
        step3Data.hotelBookings = step3Data.hotelBookings.map((hotel: any) => ({
          ...hotel,
          checkInDate: hotel.checkInDate ? new Date(hotel.checkInDate) : hotel.checkInDate,
          checkOutDate: hotel.checkOutDate ? new Date(hotel.checkOutDate) : hotel.checkOutDate,
        }));
      }
      
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
    const hasTransportation = step4Data.selectedTransport !== undefined && step4Data.selectedTransport !== null;

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
      const hotelBookingsData = step2Data.hotelBookings || [];
      if (hotelBookingsData.length > 0) {
        // First, resolve locationId: frontend sends CityMaster ID, but we need LocationMaster ID
        // Find LocationMaster entries for hotels to get their cityIds
        const hotelIds = hotelBookingsData.map((h: any) => h.hotelId);
        const hotelLocationMasters = await tx.locationMaster.findMany({
          where: { id: { in: hotelIds } },
          select: { id: true, cityId: true },
        });

        // Create map: hotelId -> cityId
        const hotelCityMap = new Map<string, string>();
        hotelLocationMasters.forEach((lm) => {
          hotelCityMap.set(lm.id, lm.cityId);
        });

        // For each hotel booking, find LocationMaster entry for the city
        // If frontend sent CityMaster ID as locationId, we need to find LocationMaster with matching cityId
        // OR use the hotel's cityId to find/create a LocationMaster entry
        await Promise.all(
          hotelBookingsData.map(async (hotel: any) => {
            // Get cityId from hotel's LocationMaster entry
            const cityId = hotelCityMap.get(hotel.hotelId);
            
            // Find LocationMaster entry for this city (could be DESTINATION, OTHERS, or any type)
            // If not found, we'll use the hotel's cityId to find one, or create logic to handle it
            let locationMasterId: string;
            
            if (cityId) {
              // Try to find a LocationMaster entry for this city
              // Usually there should be one, but if not, we might need to handle it differently
              const cityLocationMaster = await tx.locationMaster.findFirst({
                where: { 
                  cityId: cityId,
                  // Prefer OTHERS type for city location, or any LocationMaster in that city
                  locationType: 'OTHERS',
                },
                select: { id: true },
              });
              
              if (cityLocationMaster) {
                locationMasterId = cityLocationMaster.id;
              } else {
                // If no LocationMaster found for city, use hotel's cityId directly
                // But wait - we need a LocationMaster ID, not CityMaster ID
                // Let's check if the frontend locationId might already be a LocationMaster ID
                // OR we need to use the hotel's city as the location
                // For now, let's check if hotel.locationId is actually a LocationMaster ID
                const testLocationMaster = await tx.locationMaster.findUnique({
                  where: { id: hotel.locationId },
                });
                
                if (testLocationMaster) {
                  // Frontend sent LocationMaster ID after all
                  locationMasterId = hotel.locationId;
                } else {
                  // Use hotel's cityId to find or we need to create/find a LocationMaster
                  // For now, let's use the hotel's city and find any LocationMaster in that city
                  const anyLocationInCity = await tx.locationMaster.findFirst({
                    where: { cityId: cityId },
                    select: { id: true },
                  });
                  
                  if (anyLocationInCity) {
                    locationMasterId = anyLocationInCity.id;
                  } else {
                    throw new Error(`No LocationMaster found for city ${cityId}. Hotel booking requires a LocationMaster entry for the city.`);
                  }
                }
              }
            } else {
              // Fallback: try using hotel.locationId as-is (might be LocationMaster ID)
              const testLocationMaster = await tx.locationMaster.findUnique({
                where: { id: hotel.locationId },
              });
              
              if (testLocationMaster) {
                locationMasterId = hotel.locationId;
              } else {
                throw new Error(`Invalid locationId ${hotel.locationId} for hotel booking`);
              }
            }

            return tx.umrahHotelBooking.create({
              data: {
                bookingId: booking.id,
                locationId: locationMasterId,
                hotelId: hotel.hotelId,
                checkInDate: hotel.checkInDate,
                checkOutDate: hotel.checkOutDate,
                brn: hotel.brn && Array.isArray(hotel.brn) && hotel.brn.length > 0 
                  ? hotel.brn 
                  : null,
              },
            });
          })
        );
      }

      // 6. Create UmrahTransportBooking (from step4 selectedTransport)
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

          // Handle "from" location
          if (segment.fromHotelId) {
            // fromHotelId is the LocationMaster ID (specific hotel/airport)
            const fromLocation = await tx.locationMaster.findUnique({
              where: { id: segment.fromHotelId },
              select: { id: true, cityId: true },
            });
            if (!fromLocation) {
              throw new Error(`Invalid fromHotelId in transport segment: ${segment.fromHotelId}`);
            }
            fromLocationId = fromLocation.id; // LocationMaster ID
            fromCityId = fromLocation.cityId; // City ID from LocationMaster
          } else {
            // fromLocationId is a City ID, we need to find a LocationMaster for that city
            fromCityId = segment.fromLocationId; // This is already a City ID
            const cityLocation = await tx.locationMaster.findFirst({
              where: { cityId: segment.fromLocationId },
              select: { id: true },
            });
            if (!cityLocation) {
              throw new Error(`No LocationMaster found for city ID: ${segment.fromLocationId}`);
            }
            fromLocationId = cityLocation.id; // Use first LocationMaster found for this city
          }

          // Handle "to" location
          if (segment.toHotelId) {
            // toHotelId is the LocationMaster ID (specific hotel/airport)
            const toLocation = await tx.locationMaster.findUnique({
              where: { id: segment.toHotelId },
              select: { id: true, cityId: true },
            });
            if (!toLocation) {
              throw new Error(`Invalid toHotelId in transport segment: ${segment.toHotelId}`);
            }
            toLocationId = toLocation.id; // LocationMaster ID
            toCityId = toLocation.cityId; // City ID from LocationMaster
          } else {
            // toLocationId is a City ID, we need to find a LocationMaster for that city
            toCityId = segment.toLocationId; // This is already a City ID
            const cityLocation = await tx.locationMaster.findFirst({
              where: { cityId: segment.toLocationId },
              select: { id: true },
            });
            if (!cityLocation) {
              throw new Error(`No LocationMaster found for city ID: ${segment.toLocationId}`);
            }
            toLocationId = cityLocation.id; // Use first LocationMaster found for this city
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
        const transportMovements = movementDetailsToCreate.map((md, idx) => ({
          type: 'transport' as const,
          travelDateTime: md.travelDateTime,
          data: md,
          index: idx,
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
        // Track ziyaraths as they're processed so we can reference them
        const processedZiyaraths: Array<{ toCityId: string; toLocationId: string }> = [];
        
        for (const movement of allMovements) {
          if (movement.type === 'ziyarath') {
            const ziyarath = movement.data as any;
            
            // Find previous movement's toCityId and toLocationId
            const currentIndex = allMovements.indexOf(movement);
            let fromCityId: string | null = null;
            let fromLocationId: string | null = null;

            // Look for the previous movement (could be transport or ziyarath)
            for (let i = currentIndex - 1; i >= 0; i--) {
              const prevMovement = allMovements[i];
              if (prevMovement.type === 'transport') {
                const prevData = prevMovement.data as any;
                fromCityId = prevData.toCityId;
                fromLocationId = prevData.toLocationId;
                break;
              } else if (prevMovement.type === 'ziyarath') {
                // If previous is also a ziyarath, find its index in processedZiyaraths
                // Count how many ziyaraths came before this one
                let ziyarathIndex = 0;
                for (let j = 0; j < i; j++) {
                  if (allMovements[j].type === 'ziyarath') {
                    ziyarathIndex++;
                  }
                }
                if (ziyarathIndex < processedZiyaraths.length) {
                  const prevZiyarath = processedZiyaraths[ziyarathIndex];
                  fromCityId = prevZiyarath.toCityId;
                  fromLocationId = prevZiyarath.toLocationId;
                  break;
                }
              }
            }

            // If no previous movement found, use the last hotel booking's location
            if (!fromCityId || !fromLocationId) {
              const lastHotelBooking = hotelBookingsData.length > 0 
                ? hotelBookingsData[hotelBookingsData.length - 1]
                : null;
              
              if (lastHotelBooking) {
                const hotelLocation = await tx.locationMaster.findUnique({
                  where: { id: lastHotelBooking.hotelId },
                  select: { cityId: true, id: true },
                });
                if (hotelLocation) {
                  fromCityId = hotelLocation.cityId;
                  fromLocationId = hotelLocation.id;
                }
              }
            }

            if (!fromCityId || !fromLocationId) {
              throw new Error(`Cannot determine 'from' location for ziyarath ${ziyarath.ziyarathId}. No previous movement found.`);
            }

            // Get ziyarath's LocationMaster to find its city
            const ziyarathLocation = await tx.locationMaster.findUnique({
              where: { id: ziyarath.ziyarathId },
              select: { cityId: true },
            });

            if (!ziyarathLocation) {
              throw new Error(`Invalid ziyarath location ID: ${ziyarath.ziyarathId}`);
            }

            // travelDateTime was already calculated during sorting
            const travelDateTime = movement.travelDateTime as Date;

            const ziyarathMovement = {
              bookingId: booking.id,
              travelDateTime,
              fromCityId,
              fromLocationId,
              toCityId: ziyarathLocation.cityId,
              toLocationId: ziyarath.ziyarathId,
            };

            movementDetailsToCreate.push(ziyarathMovement);
            processedZiyaraths.push({
              toCityId: ziyarathLocation.cityId,
              toLocationId: ziyarath.ziyarathId,
            });
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

export default router;

