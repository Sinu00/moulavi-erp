import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from './umrahVisa/shared';
import { ensureTripInfoExists, syncBookingAndTripInfoStatus, syncBookingAndTripInfoStatusInTx } from '../services/statusSyncService';
import { generateVoucherNumber, generateRouteNumbers, formatTime, formatDate } from '../services/voucherService';

const router = Router();

// POST /api/umrah-visa/:bookingId/add-group-data - Add group data (Admin/Staff only)
router.post('/:bookingId/add-group-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can add group data
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can add group data' });
    }

    const { groupNumber, groupName } = req.body;

    if (!groupNumber || !groupName) {
      return res.status(400).json({ error: 'Group number and group name are required' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'documents_downloaded') {
      return res.status(400).json({ error: 'Group data can only be added when status is documents_downloaded' });
    }

    // Determine next status based on accommodation type
    let nextStatus: 'group_assigned' | 'voucher';
    if (booking.accommodationType === 'iqama') {
      nextStatus = 'group_assigned';
    } else if (booking.accommodationType === 'hotel') {
      nextStatus = 'voucher';
    } else {
      return res.status(400).json({ error: 'Accommodation type not set for this booking' });
    }

    // Update booking and trip info - use sync function to ensure status consistency
    const [updatedBooking, updatedTripInfo] = await prisma.$transaction([
      prisma.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          groupNumber,
          groupName,
          hasGroupNumber: true,
        },
      }),
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          groupNumber,
          groupName,
          updatedBy: user.id,
        },
      }),
    ]);

    // Sync status separately (handles both booking and tripInfo status + history)
    await syncBookingAndTripInfoStatus(bookingId, nextStatus, user.id, 'Group data added');
    
    // Re-fetch updated records
    const finalBooking = await prisma.umrahVisaBooking.findUnique({ where: { id: bookingId } });
    const finalTripInfo = await prisma.tripInfo.findUnique({ where: { bookingId } });

    res.json({
      message: 'Group data added successfully',
      data: {
        booking: finalBooking,
        tripInfo: finalTripInfo,
      },
    });
  } catch (error) {
    console.error('Error adding group data:', error);
    res.status(500).json({ error: 'Failed to add group data' });
  }
});

// POST /api/umrah-visa/:bookingId/download-documents - Download documents and track
router.post('/:bookingId/download-documents', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can download documents
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can download documents' });
    }

    // Get booking with all passenger documents
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        tripInfo: true,
        passengers: {
          include: {
            documents: {
              where: { isDeleted: false },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Documents can only be downloaded when status is pending',
        currentStatus: booking.tripInfo.status 
      });
    }

    // Check if documents have already been downloaded
    if (booking.tripInfo.documentsDownloadCount > 0) {
      return res.status(400).json({ 
        error: 'Documents have already been downloaded. Please request admin permission for re-download.',
        downloadCount: booking.tripInfo.documentsDownloadCount,
        lastDownloadedAt: booking.tripInfo.documentsDownloadedAt,
        lastDownloadedBy: booking.tripInfo.documentsDownloadedBy,
      });
    }

    // Collect all documents
    const allDocuments = booking.passengers.flatMap(p => p.documents);

    // For testing: Skip document check
    // if (allDocuments.length === 0) {
    //   return res.status(400).json({ error: 'No documents found for this booking' });
    // }

    // Update trip info - mark as downloaded
    const updatedTripInfo = await prisma.$transaction([
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          documentsDownloadCount: { increment: 1 },
          documentsDownloadedAt: new Date(),
          documentsDownloadedBy: user.id,
          updatedBy: user.id,
        },
      }),
    ]);

    // Sync status separately (handles both booking and tripInfo status + history)
    await syncBookingAndTripInfoStatus(bookingId, 'documents_downloaded', user.id, 'Documents downloaded');
    
    // Re-fetch updated tripInfo
    const finalTripInfo = await prisma.tripInfo.findUnique({ where: { bookingId } });

    res.json({
      message: 'Documents download tracked successfully',
      data: {
        documents: allDocuments,
        tripInfo: finalTripInfo,
      },
    });
  } catch (error) {
    console.error('Error tracking document download:', error);
    res.status(500).json({ error: 'Failed to track document download' });
  }
});

// POST /api/umrah-visa/:bookingId/upload-confirmation - Upload confirmation image
router.post('/:bookingId/upload-confirmation', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can upload confirmation
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can upload confirmation' });
    }

    const { confirmationImagePath } = req.body;

    if (!confirmationImagePath) {
      return res.status(400).json({ error: 'Confirmation image path is required' });
    }

    // Check if booking exists
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    if (booking.tripInfo.status !== 'group_assigned') {
      return res.status(400).json({ 
        error: 'Confirmation can only be uploaded when status is group_assigned',
        currentStatus: booking.tripInfo.status 
      });
    }

    // Determine next status based on hasTransportation
    let nextStatus: 'voucher' | 'bill';
    if (booking.hasTransportation) {
      nextStatus = 'voucher';
    } else {
      nextStatus = 'bill';
    }

    // Update trip info with confirmation image
    const [updatedTripInfo] = await prisma.$transaction([
      prisma.tripInfo.update({
        where: { bookingId },
        data: {
          confirmationImagePath,
          confirmationUploadedAt: new Date(),
          updatedBy: user.id,
        },
      }),
    ]);

    // Sync status separately (handles both booking and tripInfo status + history)
    await syncBookingAndTripInfoStatus(bookingId, nextStatus, user.id, 'Confirmation image uploaded');
    
    // Re-fetch updated tripInfo
    const finalTripInfo = await prisma.tripInfo.findUnique({ where: { bookingId } });

    res.json({
      message: 'Confirmation uploaded successfully',
      data: {
        tripInfo: finalTripInfo,
      },
    });
  } catch (error) {
    console.error('Error uploading confirmation:', error);
    res.status(500).json({ error: 'Failed to upload confirmation' });
  }
});

// GET /api/umrah-visa/:bookingId/voucher-data - Get all data needed for voucher preview
router.get('/:bookingId/voucher-data', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Only admin/staff can access voucher data
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can access voucher data' });
    }

    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        party: {
          select: {
            partyName: true,
            contactNumber: true,
            whatsappNumber: true,
          },
        },
        umrahVisaProvider: {
          select: {
            id: true,
            partyName: true,
            address: true,
            contactNumber: true,
            whatsappNumber: true,
            email: true,
          },
        },
        tripInfo: true,
        voucher: {
          select: {
            voucherNumber: true,
          },
        },
        travelDetails: {
          include: {
            arrivalAirport: true,
            departureAirport: true,
          },
        },
        hotelBookings: {
          include: {
            hotel: true,
            location: true,
          },
          orderBy: {
            checkInDate: 'asc',
          },
        },
        sponsorIqamaDetails: true,
        transportBookings: {
          include: {
            fromLocation: true,
            toLocation: true,
            fromSpecificLocation: true,
            toSpecificLocation: true,
          },
          orderBy: {
            travelDateTime: 'asc',
          },
        },
        passengers: {
          where: {
            isDeleted: false,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Auto-create TripInfo if missing (for group visas that might not have completed Step 4)
    let tripInfo = booking.tripInfo;
    if (!tripInfo) {
      try {
        tripInfo = await ensureTripInfoExists(bookingId, user.id);
        // Re-fetch booking to get updated tripInfo
        const updatedBooking = await prisma.umrahVisaBooking.findUnique({
          where: { id: bookingId },
          include: { tripInfo: true },
        });
        tripInfo = updatedBooking?.tripInfo || tripInfo;
      } catch (error: any) {
        console.error('Error creating TripInfo:', error);
        return res.status(400).json({ 
          error: 'Cannot create trip info. Missing required data: ' + error.message 
        });
      }
    }

    // Get the total count of all transport bookings EXCEPT the current booking's
    // This ensures route numbers continue sequentially across all bookings
    const totalTransportBookings = await prisma.umrahTransportBooking.count({
      where: {
        bookingId: { not: bookingId },
      },
    });
    const baseRouteNumber = totalTransportBookings;

    // Format data for voucher preview
    const voucherData = {
      bookingId: booking.id,
      reservationDate: booking.createdAt,
      reservationNumber: booking.voucher?.voucherNumber || '', // Use voucher number as reservation number (empty if voucher not generated yet)
      guestName: booking.party.partyName,
      guestMobile: booking.party.contactNumber || booking.party.whatsappNumber || '',
      groupCode: booking.groupNumber || tripInfo.groupNumber || '',
      groupName: booking.groupName || tripInfo.groupName || '',
      paxCount: booking.passengerCount,
      // Umrah Visa Provider details (for header section)
      umrahVisaProvider: booking.umrahVisaProvider ? {
        partyName: booking.umrahVisaProvider.partyName,
        address: booking.umrahVisaProvider.address || '',
        contactNumber: booking.umrahVisaProvider.contactNumber || '',
        whatsappNumber: booking.umrahVisaProvider.whatsappNumber || '',
        email: booking.umrahVisaProvider.email || '',
      } : null,
      hotelSchedules: booking.hotelBookings?.map((hb: any, idx: number) => ({
        number: idx + 1,
        location: hb.location.name,
        hotelName: hb.hotel.name,
        checkIn: hb.checkInDate,
        checkOut: hb.checkOutDate,
        days: Math.ceil((new Date(hb.checkOutDate).getTime() - new Date(hb.checkInDate).getTime()) / (1000 * 60 * 60 * 24)),
        brn: hb.brn && Array.isArray(hb.brn) ? hb.brn : null, // Include BRN if available
      })) || [],
      movementDetails: booking.transportBookings.map((tb: any, idx: number) => {
        // Generate route numbers starting from (totalTransportBookings + 1), incrementing for each transport
        // Format as 5-digit zero-padded number (00001, 00002, etc.)
        // This ensures route numbers continue sequentially across all bookings
        const routeNumber = (baseRouteNumber + idx + 1).toString().padStart(5, '0');
        
        return {
          sr: idx + 1,
          route: routeNumber, // Sequential route number continuing from previous bookings
          date: tb.travelDateTime ? formatDate(tb.travelDateTime) : '', // DD-MM-YYYY format
          time: tb.travelDateTime ? formatTime(tb.travelDateTime) : '', // HH:MM format
          from: tb.fromLocation?.name || '', // City name from LocationMaster
          fromLocation: tb.fromSpecificLocation?.name || '', // Specific location name (Airport, Hotel, Ziyarat)
          fromLocationId: tb.fromLocationId,
          fromSpecificLocationId: tb.fromSpecificLocationId,
          to: tb.toLocation?.name || '', // City name from LocationMaster
          toLocation: tb.toSpecificLocation?.name || '', // Specific location name (Airport, Hotel, Ziyarat)
          toLocationId: tb.toLocationId,
          toSpecificLocationId: tb.toSpecificLocationId,
          vehicleType: tb.vehicleType || '',
          paxCount: tb.paxCount || 0,
          price: tb.price ? Number(tb.price) : 0,
        };
      }),
      flightDetails: booking.travelDetails ? [
        {
          type: 'AA', // Arrival
          date: booking.travelDetails.arrivalDateTime ? formatDate(booking.travelDetails.arrivalDateTime) : '',
          carrier: booking.travelDetails.arrivalFlightNumber?.split('-')[0] || '',
          number: booking.travelDetails.arrivalFlightNumber?.split('-')[1] || '',
          from: booking.travelDetails.arrivalAirport.code,
          to: 'JED',
          etd: '',
          eta: booking.travelDetails.arrivalDateTime ? formatTime(booking.travelDetails.arrivalDateTime) : '',
        },
        {
          type: 'AD', // Departure
          date: booking.travelDetails.departureDateTime ? formatDate(booking.travelDetails.departureDateTime) : '',
          carrier: booking.travelDetails.departureFlightNumber?.split('-')[0] || '',
          number: booking.travelDetails.departureFlightNumber?.split('-')[1] || '',
          from: 'JED',
          to: booking.travelDetails.departureAirport.code,
          etd: booking.travelDetails.departureDateTime ? formatTime(booking.travelDetails.departureDateTime) : '',
          eta: '',
        },
      ] : [],
    };

    res.json(voucherData);
  } catch (error) {
    console.error('Error fetching voucher data:', error);
    res.status(500).json({ error: 'Failed to fetch voucher data' });
  }
});

// POST /api/umrah-visa/:bookingId/generate-voucher - Generate transport voucher
router.post('/:bookingId/generate-voucher', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;
    const voucherData = req.body; // Voucher data from preview form

    // Only admin/staff can generate voucher
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can generate voucher' });
    }

    // Check if booking exists
    let booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        tripInfo: true,
        umrahVisaProvider: {
          select: {
            id: true,
          },
        },
        party: {
          select: {
            partyName: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Ensure TripInfo exists (auto-create if missing)
    let tripInfo = booking.tripInfo;
    if (!tripInfo) {
      try {
        tripInfo = await ensureTripInfoExists(bookingId, user.id);
        // Re-fetch to get updated booking
        const updatedBooking = await prisma.umrahVisaBooking.findUnique({
          where: { id: bookingId },
          include: { 
            tripInfo: true,
            umrahVisaProvider: {
              select: {
                id: true,
              },
            },
            party: {
              select: {
                partyName: true,
              },
            },
          },
        });
        if (updatedBooking && updatedBooking.tripInfo) {
          tripInfo = updatedBooking.tripInfo;
        }
      } catch (error: any) {
        return res.status(400).json({ 
          error: 'Cannot create trip info. Missing required data: ' + error.message 
        });
      }
    }

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found after creating TripInfo' });
    }

    // Check status - use booking.status as source of truth, but also check tripInfo.status
    if (!tripInfo) {
      return res.status(400).json({ 
        error: 'TripInfo is required to generate voucher'
      });
    }
    const currentStatus = booking.status === 'voucher' ? 'voucher' : tripInfo.status;
    if (currentStatus !== 'voucher') {
      return res.status(400).json({ 
        error: 'Voucher can only be generated when status is voucher',
        currentStatus,
        bookingStatus: booking.status,
        tripInfoStatus: tripInfo.status,
      });
    }

    // Generate voucher number
    const voucherNumber = await generateVoucherNumber();

    // Generate route numbers for movements
    const baseRouteNumber = 16469; // Starting route number
    const routeNumbers = generateRouteNumbers(baseRouteNumber, voucherData.movementDetails?.length || 0);

    // Add route numbers to movement details
    const movementDetailsWithRoutes = (voucherData.movementDetails || []).map((movement: any, idx: number) => ({
      ...movement,
      route: routeNumbers[idx] || movement.route,
    }));

    // Create voucher record
    const voucher = await prisma.$transaction(async (tx) => {
      // Create voucher
      const newVoucher = await tx.voucher.create({
        data: {
          bookingId,
          voucherNumber,
          reservationDate: new Date(voucherData.reservationDate || booking!.createdAt),
          guestName: voucherData.guestName || booking!.party?.partyName || '',
          guestMobile: voucherData.guestMobile || '',
          groupCode: voucherData.groupCode || booking!.groupNumber || (booking!.tripInfo?.groupNumber || ''),
          umrahVisaProviderId: booking!.umrahVisaProviderId || null,
          paxCount: voucherData.paxCount || booking!.passengerCount,
          hotelSchedules: voucherData.hotelSchedules || [],
          movementDetails: movementDetailsWithRoutes,
          flightDetails: voucherData.flightDetails || [],
          generatedBy: user.id,
        },
      });

      // Update booking with voucher metadata
      await tx.umrahVisaBooking.update({
        where: { id: bookingId },
        data: {
          voucherGeneratedAt: new Date(),
          voucherGeneratedBy: user.id,
        },
      });

      // Sync status using helper (updates both booking and tripInfo status in sync)
      await syncBookingAndTripInfoStatusInTx(bookingId, 'bill', user.id, 'Voucher generated', tx);

      return newVoucher;
    });

    res.json({
      message: 'Voucher generated successfully',
      data: {
        voucher,
      },
    });
  } catch (error) {
    console.error('Error generating voucher:', error);
    res.status(500).json({ error: 'Failed to generate voucher' });
  }
});

// GET /api/umrah-visa/:bookingId/available-actions - Get available actions based on status
router.get('/:bookingId/available-actions', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const user = (req as any).user;

    // Get booking with trip info
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: { tripInfo: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (!booking.tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    const status = booking.tripInfo.status;
    const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';

    let availableActions: any[] = [];

    switch (status) {
      case 'pending':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'download_documents',
            label: 'Download Documents',
            description: 'Download passenger documents',
            endpoint: `/api/umrah-visa/${bookingId}/download-documents`,
            method: 'POST',
            warning: booking.tripInfo.documentsDownloadCount > 0 
              ? 'Documents already downloaded. Contact admin for re-download.' 
              : null,
          });
        }
        break;

      case 'documents_downloaded':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'add_group_data',
            label: 'Assign Group',
            description: 'Assign group number and name to this booking',
            endpoint: `/api/umrah-visa/${bookingId}/add-group-data`,
            method: 'POST',
          });
        }
        break;

      case 'group_assigned':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'upload_confirmation',
            label: 'Upload Image',
            description: 'Upload confirmation image',
            endpoint: `/api/umrah-visa/${bookingId}/upload-confirmation`,
            method: 'POST',
          });
        }
        break;

      case 'voucher':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'generate_voucher',
            label: 'Generate Voucher',
            description: 'Generate transport voucher',
            endpoint: `/api/umrah-visa/${bookingId}/generate-voucher`,
            method: 'POST',
          });
        }
        break;

      case 'bill':
        if (isAdminOrStaff) {
          availableActions.push({
            action: 'generate_bill',
            label: 'Generate Bill',
            description: 'Generate bill for this booking (functionality coming soon)',
            endpoint: `/api/umrah-visa/${bookingId}/generate-bill`,
            method: 'POST',
            disabled: true,
          });
        }
        break;

      case 'booking_success':
        // Final success status - no more actions needed
        break;

      case 'cancelled':
        // No actions available for cancelled bookings
        break;
    }

    res.json({
      bookingId,
      currentStatus: status,
      availableActions,
      tripInfo: booking.tripInfo,
    });
  } catch (error) {
    console.error('Error fetching available actions:', error);
    res.status(500).json({ error: 'Failed to fetch available actions' });
  }
});

// GET /api/umrah-visa/:bookingId/trip-info - Get trip info details
router.get('/:bookingId/trip-info', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const tripInfo = await prisma.tripInfo.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: {
            party: true,
          },
        },
        updatedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        documentsDownloadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!tripInfo) {
      return res.status(404).json({ error: 'Trip info not found' });
    }

    res.json(tripInfo);
  } catch (error) {
    console.error('Error fetching trip info:', error);
    res.status(500).json({ error: 'Failed to fetch trip info' });
  }
});

// PATCH /api/umrah-visa/:bookingId/transport-bookings - Bulk update transport rows
router.patch('/:bookingId/transport-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { transportBookings } = req.body || {};
    if (Array.isArray(transportBookings)) {
      for (const t of transportBookings) {
        if (!t?.id) continue;
        
        // Parse travelDateTime if provided
        const travelDateTime = t.travelDateTime 
          ? (t.travelDateTime instanceof Date ? t.travelDateTime : new Date(t.travelDateTime))
          : undefined;
        
        await prisma.umrahTransportBooking.update({
          where: { id: t.id },
          data: {
            travelDateTime,
            vehicleType: t.vehicleType ?? undefined,
            paxCount: t.paxCount ?? undefined,
            price: t.price ?? undefined,
          },
        });
      }
    }

    const refreshed = await prisma.umrahTransportBooking.findMany({
      where: { bookingId },
      include: { fromLocation: true, toLocation: true },
    });
    res.json({ transportBookings: refreshed });
  } catch (error) {
    console.error('Error updating transport bookings:', error);
    res.status(500).json({ error: 'Failed to update transport bookings' });
  }
});

// POST /api/umrah-visa/:bookingId/transport-bookings - create transport row
router.post('/:bookingId/transport-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { fromLocationId, toLocationId, vehicleType, paxCount, price, travelDateTime } = req.body || {};
    
    // Parse travelDateTime if provided
    const parsedDateTime = travelDateTime 
      ? (travelDateTime instanceof Date ? travelDateTime : new Date(travelDateTime))
      : undefined;
    
    const created = await prisma.umrahTransportBooking.create({
      data: {
        bookingId,
        fromLocationId,
        toLocationId,
        vehicleType,
        paxCount,
        price,
        travelDateTime: parsedDateTime,
      },
      include: { fromLocation: true, toLocation: true },
    });
    res.json({ transportBooking: created });
  } catch (error) {
    console.error('Error creating transport booking:', error);
    res.status(500).json({ error: 'Failed to create transport booking' });
  }
});

// DELETE /api/umrah-visa/transport-bookings/:id - delete transport row
router.delete('/transport-bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahTransportBooking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting transport booking:', error);
    res.status(500).json({ error: 'Failed to delete transport booking' });
  }
});

// POST /api/umrah-visa/:bookingId/hotel-bookings - create hotel booking row
router.post('/:bookingId/hotel-bookings', authenticate, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { locationId, hotelId, checkInDate, checkOutDate } = req.body || {};
    
    // Verify booking exists and has hotel accommodation type
    const booking = await prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { accommodationType: true },
    });
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    if (booking.accommodationType !== 'hotel') {
      return res.status(400).json({ error: 'Booking accommodation type is not hotel' });
    }

    const created = await prisma.umrahHotelBooking.create({
      data: {
        bookingId,
        locationId,
        hotelId,
        checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
        checkOutDate: checkOutDate ? new Date(checkOutDate) : new Date(),
      },
      include: { hotel: true, location: true },
    });
    res.json({ hotelBooking: created });
  } catch (error) {
    console.error('Error creating hotel booking:', error);
    res.status(500).json({ error: 'Failed to create hotel booking' });
  }
});

// DELETE /api/umrah-visa/hotel-bookings/:id - delete hotel booking row
router.delete('/hotel-bookings/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.umrahHotelBooking.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting hotel booking:', error);
    res.status(500).json({ error: 'Failed to delete hotel booking' });
  }
});

export default router;

