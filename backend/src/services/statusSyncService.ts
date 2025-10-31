import prisma from '../lib/prisma';

/**
 * Ensures TripInfo exists for a booking. Creates it if missing with data from booking.
 * This is used when accessing features that require TripInfo but it might not exist yet.
 */
export async function ensureTripInfoExists(bookingId: string, userId: string) {
  // Check if TripInfo exists
  const existingTripInfo = await prisma.tripInfo.findUnique({
    where: { bookingId },
  });

  if (existingTripInfo) {
    return existingTripInfo;
  }

  // Fetch booking with all required relations
  const booking = await prisma.umrahVisaBooking.findUnique({
    where: { id: bookingId },
    include: {
      service: {
        include: {
          party: {
            select: {
              partyName: true,
            },
          },
        },
      },
      travelDetails: true,
      accommodationDetails: true,
    },
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (!booking.travelDetails) {
    throw new Error('Travel details are required');
  }

  // Create TripInfo with data from booking
  const tripInfo = await prisma.tripInfo.create({
    data: {
      bookingId,
      groupNumber: booking.groupNumber,
      groupName: booking.groupName,
      partyName: booking.service.party.partyName,
      arrivalDate: booking.travelDetails.arrivalDate,
      departureDate: booking.travelDetails.departureDate,
      iqamaNumber: booking.accommodationDetails?.iqamaNumber,
      iqamaHolderName: booking.accommodationDetails?.iqamaName,
      iqamaHolderDob: booking.accommodationDetails?.iqamaDob,
      iqamaHolderMobile: booking.accommodationDetails?.iqamaMobile,
      iqamaNationalShortAddress: booking.accommodationDetails?.iqamaNationalShortAddress,
      updatedBy: userId,
      status: booking.status, // Sync with booking status
    },
  });

  return tripInfo;
}

/**
 * Synchronizes TripInfo status with Booking status (for use inside existing transaction).
 * Pass tx parameter if already inside a transaction, otherwise uses its own transaction.
 */
export async function syncBookingAndTripInfoStatusInTx(
  bookingId: string,
  newStatus: string,
  userId: string,
  reason: string,
  tx: any
) {
  // Update booking status
  const updatedBooking = await tx.umrahVisaBooking.update({
    where: { id: bookingId },
    data: {
      status: newStatus as any,
    },
  });

  // Get current TripInfo to check if it exists
  let tripInfo = await tx.tripInfo.findUnique({
    where: { bookingId },
  });

  // If TripInfo doesn't exist, create it
  if (!tripInfo) {
    const booking = await tx.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      include: {
        service: {
          include: {
            party: {
              select: {
                partyName: true,
              },
            },
          },
        },
        travelDetails: true,
        accommodationDetails: true,
      },
    });

    if (!booking || !booking.travelDetails) {
      throw new Error('Cannot create TripInfo: missing required booking data');
    }

    tripInfo = await tx.tripInfo.create({
      data: {
        bookingId,
        groupNumber: booking.groupNumber,
        groupName: booking.groupName,
        partyName: booking.service.party.partyName,
        arrivalDate: booking.travelDetails.arrivalDate,
        departureDate: booking.travelDetails.departureDate,
        iqamaNumber: booking.accommodationDetails?.iqamaNumber,
        iqamaHolderName: booking.accommodationDetails?.iqamaName,
        iqamaHolderDob: booking.accommodationDetails?.iqamaDob,
        iqamaHolderMobile: booking.accommodationDetails?.iqamaMobile,
        iqamaNationalShortAddress: booking.accommodationDetails?.iqamaNationalShortAddress,
        updatedBy: userId,
        status: newStatus as any,
      },
    });
  } else {
    // Update existing TripInfo status
    await tx.tripInfo.update({
      where: { bookingId },
      data: {
        status: newStatus as any,
        updatedBy: userId,
      },
    });
  }

  // Get current TripInfo status for history
  const currentTripInfo = await tx.tripInfo.findUnique({
    where: { bookingId },
    select: { status: true },
  });

  // Create status history
  await tx.bookingStatusHistory.create({
    data: {
      bookingId,
      oldStatus: currentTripInfo?.status || null,
      newStatus: newStatus,
      changedBy: userId,
      reason: reason || 'Status updated',
    },
  });

  return { updatedBooking, tripInfo };
}

/**
 * Synchronizes TripInfo status with Booking status.
 * Ensures both always have the same status value.
 * Creates its own transaction.
 */
export async function syncBookingAndTripInfoStatus(
  bookingId: string,
  newStatus: string,
  userId: string,
  reason?: string
) {
  return await prisma.$transaction(async (tx) => {
    return await syncBookingAndTripInfoStatusInTx(bookingId, newStatus, userId, reason || 'Status updated', tx);
  });
}

/**
 * Validates that TripInfo status matches Booking status.
 * Returns true if they match, false if mismatch detected.
 */
export async function validateStatusSync(bookingId: string): Promise<{
  isSynced: boolean;
  bookingStatus?: string;
  tripInfoStatus?: string;
}> {
  const [booking, tripInfo] = await Promise.all([
    prisma.umrahVisaBooking.findUnique({
      where: { id: bookingId },
      select: { status: true },
    }),
    prisma.tripInfo.findUnique({
      where: { bookingId },
      select: { status: true },
    }),
  ]);

  if (!booking) {
    return { isSynced: false };
  }

  if (!tripInfo) {
    return {
      isSynced: false,
      bookingStatus: booking.status,
      tripInfoStatus: undefined,
    };
  }

  const isSynced = booking.status === tripInfo.status;
  return {
    isSynced,
    bookingStatus: booking.status,
    tripInfoStatus: tripInfo.status,
  };
}

