import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate next sequential voucher number starting from "001" for the current year
 * Format: "001", "002", "003", etc.
 * Resets to "001" on January 1st of each year
 */
export async function generateVoucherNumber(): Promise<string> {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get the start of the current year (January 1st, 00:00:00)
    const yearStart = new Date(currentYear, 0, 1);
    
    // Find the highest voucher number for vouchers generated this year
    const lastVoucher = await prisma.voucher.findFirst({
      where: {
        generatedAt: {
          gte: yearStart,
        },
      },
      orderBy: {
        voucherNumber: 'desc',
      },
      select: {
        voucherNumber: true,
      },
    });

    if (!lastVoucher) {
      return '001';
    }

    // Extract numeric part and increment
    const lastNumber = parseInt(lastVoucher.voucherNumber, 10);
    if (isNaN(lastNumber)) {
      return '001';
    }
    
    const nextNumber = lastNumber + 1;
    
    // Format as 3-digit string with leading zeros
    return nextNumber.toString().padStart(3, '0');
  } catch (error) {
    console.error('Error generating voucher number:', error);
    throw new Error('Failed to generate voucher number');
  }
}

/**
 * Generate sequential route numbers for movement details
 * Starting from base number (e.g., 16469), increment by 1 for each movement
 * @param baseRouteNumber - Base route number to start from (default: 16469)
 * @param count - Number of routes to generate
 */
export function generateRouteNumbers(baseRouteNumber: number = 16469, count: number): string[] {
  const routes: string[] = [];
  for (let i = 0; i < count; i++) {
    routes.push((baseRouteNumber + i).toString());
  }
  return routes;
}

/**
 * Calculate number of days between two dates
 */
export function calculateDaysDifference(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format time from DateTime to HH:MM string
 */
export function formatTime(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '';
  
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return '';
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date to DD-MM-YYYY
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Assign route numbers to movement details for a booking
 * Route numbers are 5-digit, global across all bookings, sequential
 * @param bookingId - Booking ID to assign route numbers to
 * @returns Array of movement details with assigned route numbers
 */
export async function assignRouteNumbersToMovementDetails(bookingId: string): Promise<void> {
  try {
    // Get all movement details for this booking that don't have route numbers yet
    const movementDetails = await prisma.umrahMovementDetail.findMany({
      where: {
        bookingId,
        routeNumber: null,
      },
      orderBy: {
        travelDateTime: 'asc',
      },
    });

    if (movementDetails.length === 0) {
      return; // No movement details to assign route numbers to
    }

    // Get the highest route number across all bookings
    const lastMovement = await prisma.umrahMovementDetail.findFirst({
      where: {
        routeNumber: { not: null },
      },
      orderBy: {
        routeNumber: 'desc',
      },
      select: {
        routeNumber: true,
      },
    });

    // Start from 00001 if no route numbers exist, otherwise increment from the highest
    let nextRouteNumber = 1;
    if (lastMovement?.routeNumber) {
      const lastNumber = parseInt(lastMovement.routeNumber, 10);
      if (!isNaN(lastNumber)) {
        nextRouteNumber = lastNumber + 1;
      }
    }

    // Assign route numbers sequentially
    await Promise.all(
      movementDetails.map((movement, index) =>
        prisma.umrahMovementDetail.update({
          where: { id: movement.id },
          data: {
            routeNumber: (nextRouteNumber + index).toString().padStart(5, '0'),
          },
        })
      )
    );
  } catch (error) {
    console.error('Error assigning route numbers to movement details:', error);
    throw new Error('Failed to assign route numbers to movement details');
  }
}

