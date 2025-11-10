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
    passengerCount: z.number().min(1).max(50).optional(), // Made optional since it's now in step1
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

    // Validate passenger count (use from step1Data if available, otherwise from step4Data)
    const passengerCount = step1Data.passengerCount || step4Data.passengerCount;
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
    const hasTransportation = (step3Data.transportSegments && step3Data.transportSegments.length > 0) ||
                              (step2Data.transportBookings && step2Data.transportBookings.length > 0);

    // Save everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create UmrahVisaBooking directly with partyId (group visa, always hotel, status = voucher)
      const booking = await tx.umrahVisaBooking.create({
        data: {
          partyId: partyId,
          submittedAt: new Date(),
          groupNumber: step1Data.groupNumber,
          groupName: step1Data.groupName,
          hasGroupNumber: true,
          passengerCount: step1Data.passengerCount,
          umrahVisaProviderId: step1Data.umrahVisaProviderId || null,
          status: 'voucher',
          visaType: 'group_visa',
          accommodationType: 'hotel',
          hasTransportation,
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

      // 6. Create UmrahTransportBooking (from step3 transportSegments or step2 transportBookings)
      const transportBookings = [
        ...(step3Data.transportSegments || []),
        ...(step2Data.transportBookings || []),
      ];

      // Convert ziyaraths to transport segments
      if (step3Data.ziyaraths && step3Data.ziyaraths.length > 0) {
        // Get all hotel bookings from step2Data (hotels are validated in step2)
        const hotelBookingsData = step2Data.hotelBookings || [];
        
        // Fetch all location masters for ziyaraths and hotels
        const ziyarathLocationIds = step3Data.ziyaraths.map((z: any) => z.ziyarathId);
        const hotelLocationIds = hotelBookingsData.map((h: any) => h.hotelId);
        const allLocationIds = [...ziyarathLocationIds, ...hotelLocationIds];
        
        const locationMasters = await tx.locationMaster.findMany({
          where: { id: { in: allLocationIds } },
          include: { cityMaster: true },
        });

        // Create a map of ziyarath location -> city
        const ziyarathCityMap = new Map<string, string>();
        step3Data.ziyaraths.forEach((ziyarath: any) => {
          const ziyarathLoc = locationMasters.find(lm => lm.id === ziyarath.ziyarathId);
          if (ziyarathLoc) {
            const cityName = (ziyarathLoc.city || ziyarathLoc.cityMaster?.name || '').toLowerCase().trim();
            ziyarathCityMap.set(ziyarath.ziyarathId, cityName);
          }
        });

        // Find hotel for each ziyarath (hotel in same city)
        // Use for...of loop to handle async operations
        for (const ziyarath of step3Data.ziyaraths as any[]) {
          const ziyarathCity = ziyarathCityMap.get(ziyarath.ziyarathId);
          if (!ziyarathCity) continue;

          // Find hotel booking in the same city
          const hotelBooking = hotelBookingsData.find((hb: any) => {
            const hotelLoc = locationMasters.find(lm => lm.id === hb.hotelId);
            if (!hotelLoc) return false;
            const hotelCity = (hotelLoc.city || hotelLoc.cityMaster?.name || '').toLowerCase().trim();
            return hotelCity === ziyarathCity;
          });

          if (!hotelBooking) continue;

          // Get city location ID (from hotel's city)
          const hotelLoc = locationMasters.find(lm => lm.id === hotelBooking.hotelId);
          if (!hotelLoc || !hotelLoc.cityId) continue;

          // Find the LocationMaster that represents the city itself
          // Cities are typically stored as LocationMaster entries with the same cityId
          // Try to find any LocationMaster with the same cityId (could be OTHERS type or any type)
          const cityLocationMaster = await tx.locationMaster.findFirst({
            where: {
              cityId: hotelLoc.cityId,
              isActive: true,
            },
            orderBy: {
              locationType: 'asc', // Prefer specific types first
            },
          });

          if (!cityLocationMaster) {
            console.warn(`[create-group-booking] City LocationMaster not found for cityId: ${hotelLoc.cityId}`);
            continue;
          }

          // Convert ziyarath to transport segment
          transportBookings.push({
            fromLocationId: cityLocationMaster.id, // City LocationMaster ID
            toLocationId: cityLocationMaster.id,   // Same city (ziyarath is within city)
            fromHotelId: hotelBooking.hotelId, // Hotel LocationMaster ID
            toHotelId: ziyarath.ziyarathId,    // Ziyarath LocationMaster ID
            vehicleType: '',                   // Ziyarath doesn't require vehicle type
            paxCount: 0,                       // Will be set based on passenger count
            price: 0,                          // Ziyarath is typically included
            travelDate: ziyarath.date,
            travelTime: ziyarath.time,
          } as any);
        }
      }

      if (transportBookings.length > 0) {
        // First, collect all location IDs that need to be resolved
        const allLocationIds = new Set<string>();
        transportBookings.forEach((transport: any) => {
          if (transport.fromLocationId) allLocationIds.add(transport.fromLocationId);
          if (transport.toLocationId) allLocationIds.add(transport.toLocationId);
        });

        // Check which ones are LocationMaster IDs and which might be CityMaster IDs
        const locationIdsArray = Array.from(allLocationIds);
        const existingLocationMasters = await tx.locationMaster.findMany({
          where: { id: { in: locationIdsArray } },
          select: { id: true },
        });

        const existingLocationMasterIds = new Set(existingLocationMasters.map(lm => lm.id));
        const potentialCityMasterIds = locationIdsArray.filter(id => !existingLocationMasterIds.has(id));

        // For potential CityMaster IDs, find corresponding LocationMaster entries
        const cityToLocationMasterMap = new Map<string, string>();
        if (potentialCityMasterIds.length > 0) {
          // Find LocationMaster entries that have these cityIds
          const cityLocationMasters = await tx.locationMaster.findMany({
            where: {
              cityId: { in: potentialCityMasterIds },
              isActive: true,
            },
            select: { id: true, cityId: true },
            orderBy: {
              locationType: 'asc', // Prefer OTHERS type
            },
          });

          // Group by cityId and take the first one for each city
          const cityIdToLocationMaster = new Map<string, string>();
          cityLocationMasters.forEach((lm) => {
            if (!cityIdToLocationMaster.has(lm.cityId)) {
              cityIdToLocationMaster.set(lm.cityId, lm.id);
            }
          });

          // For each potential CityMaster ID, map to LocationMaster ID
          potentialCityMasterIds.forEach((cityId) => {
            const locationMasterId = cityIdToLocationMaster.get(cityId);
            if (locationMasterId) {
              cityToLocationMasterMap.set(cityId, locationMasterId);
            }
          });
        }

        await Promise.all(
          transportBookings.map((transport: any) => {
            // Resolve fromLocationId
            let fromLocationId = transport.fromLocationId;
            if (fromLocationId && !existingLocationMasterIds.has(fromLocationId)) {
              const resolvedId = cityToLocationMasterMap.get(fromLocationId);
              if (resolvedId) {
                fromLocationId = resolvedId;
              } else {
                // If still not found, throw error
                throw new Error(`Invalid fromLocationId: ${transport.fromLocationId}. Not found in LocationMaster or CityMaster.`);
              }
            }

            // Resolve toLocationId
            let toLocationId = transport.toLocationId;
            if (toLocationId && !existingLocationMasterIds.has(toLocationId)) {
              const resolvedId = cityToLocationMasterMap.get(toLocationId);
              if (resolvedId) {
                toLocationId = resolvedId;
              } else {
                // If still not found, throw error
                throw new Error(`Invalid toLocationId: ${transport.toLocationId}. Not found in LocationMaster or CityMaster.`);
              }
            }

            // Combine travel date and time into datetime before storing
            const travelDateTime = transport.travelDate && transport.travelTime
              ? combineDateTime(transport.travelDate, transport.travelTime)
              : undefined;

            return tx.umrahTransportBooking.create({
              data: {
                bookingId: booking.id,
                fromLocationId: fromLocationId,
                toLocationId: toLocationId,
                fromSpecificLocationId: transport.fromHotelId || null,
                toSpecificLocationId: transport.toHotelId || null,
                vehicleType: transport.vehicleType || '',
                paxCount: transport.paxCount || passengerCount || 1,
                price: transport.price || 0,
                travelDateTime,
              },
            });
          })
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

      // 9. Create TripInfo
      const tripInfo = await tx.tripInfo.create({
        data: {
          bookingId: booking.id,
          groupNumber: booking.groupNumber,
          groupName: booking.groupName,
          partyName: party?.partyName || '',
          arrivalDate: travelDetails.arrivalDateTime,
          departureDate: travelDetails.departureDateTime,
          updatedBy: user.id,
          status: 'voucher',
        },
      });

      // 10. Create BookingStatusHistory
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          oldStatus: null,
          newStatus: 'voucher',
          changedBy: user.id,
          reason: 'Group booking created',
        },
      });

      return { booking, travelDetails, passengers: passengerRecords, tripInfo };
    });

    res.status(201).json({
      message: 'Group Umrah visa booking completed successfully',
      data: {
        bookingId: result.booking.id,
        passengerCount: passengerCount,
        passengers: result.passengers,
        tripInfo: result.tripInfo,
        status: 'voucher',
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

