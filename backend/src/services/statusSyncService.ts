import prisma from '../lib/prisma';

/**
 * Updates booking status and lastUpdatedBy (for use inside existing transaction).
 * Pass tx parameter if already inside a transaction, otherwise uses its own transaction.
 */
export async function syncBookingStatusInTx(
  bookingId: string,
  newStatus: string,
  userId: string,
  reason: string,
  tx: any
) {
  // Get current booking status for history
  const currentBooking = await tx.umrahVisaBooking.findUnique({
    where: { id: bookingId },
    select: { status: true },
  });

  if (!currentBooking) {
    throw new Error('Booking not found');
  }

  // Update booking status and lastUpdatedBy
  const updatedBooking = await tx.umrahVisaBooking.update({
    where: { id: bookingId },
    data: {
      status: newStatus as any,
      lastUpdatedBy: userId,
    },
  });

  // Create status history
  await tx.bookingStatusHistory.create({
    data: {
      bookingId,
      oldStatus: currentBooking.status,
      newStatus: newStatus,
      changedBy: userId,
      reason: reason || 'Status updated',
    },
  });

  return { updatedBooking };
}

/**
 * Updates booking status and lastUpdatedBy.
 * Creates its own transaction.
 */
export async function syncBookingStatus(
  bookingId: string,
  newStatus: string,
  userId: string,
  reason?: string
) {
  return await prisma.$transaction(async (tx) => {
    return await syncBookingStatusInTx(bookingId, newStatus, userId, reason || 'Status updated', tx);
  });
}
