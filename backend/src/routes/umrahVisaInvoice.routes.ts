import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from './umrahVisa/shared';
import { fetchSheetData } from '../config/googleSheets';
import { parseDateDDMMYYYY } from '../utils/dateParser';

const router = Router();

interface SheetRow {
  groupNumber: string;
  groupName: string;
  mutamerName: string;
  mutamerNationality: string;
  passportNumber: string;
  entryDate: string;
  exitDate: string;
  visaNumber: string;
  mofaNumber: string;
}

interface ValidationResult {
  groupNumber: string;
  groupName: string;
  totalPassengers: number;
  updatedPassengers: number;
  pendingPassengers: number;
  isReady: boolean;
  bookingId: string | null;
}

/**
 * Parse sheet row data
 * Expected columns: groupnumber, groupname, mutamer name, mutamer nationality, 
 * passportnumber, entrydate, exitdate, visannumber, mofanumber
 */
function parseSheetRow(row: any[], headers: string[]): SheetRow | null {
  try {
    // Find column indices
    const groupNumberIdx = headers.findIndex(h => h.toLowerCase().includes('groupnumber') || h.toLowerCase().includes('group number'));
    const groupNameIdx = headers.findIndex(h => h.toLowerCase().includes('groupname') || h.toLowerCase().includes('group name'));
    // Prioritize "mutamer name" over generic "name" to avoid matching groupname
    const mutamerNameIdx = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('mutamer name') || (lower.includes('name') && !lower.includes('group'));
    });
    const nationalityIdx = headers.findIndex(h => h.toLowerCase().includes('nationality'));
    const passportIdx = headers.findIndex(h => h.toLowerCase().includes('passport'));
    const entryDateIdx = headers.findIndex(h => h.toLowerCase().includes('entrydate') || h.toLowerCase().includes('entry date'));
    const exitDateIdx = headers.findIndex(h => h.toLowerCase().includes('exitdate') || h.toLowerCase().includes('exit date'));
    const visaNumberIdx = headers.findIndex(h => h.toLowerCase().includes('visannumber') || h.toLowerCase().includes('visa number'));
    const mofaNumberIdx = headers.findIndex(h => h.toLowerCase().includes('mofanumber') || h.toLowerCase().includes('mofa number'));

    // Validate required columns
    if (groupNumberIdx === -1) {
      return null;
    }

    const groupNumber = row[groupNumberIdx]?.toString().trim();
    if (!groupNumber) {
      return null;
    }

    return {
      groupNumber,
      groupName: row[groupNameIdx]?.toString().trim() || '',
      mutamerName: row[mutamerNameIdx]?.toString().trim() || '',
      mutamerNationality: row[nationalityIdx]?.toString().trim() || '',
      passportNumber: row[passportIdx]?.toString().trim() || '',
      entryDate: row[entryDateIdx]?.toString().trim() || '',
      exitDate: row[exitDateIdx]?.toString().trim() || '',
      visaNumber: row[visaNumberIdx]?.toString().trim() || '',
      mofaNumber: row[mofaNumberIdx]?.toString().trim() || '',
    };
  } catch (error) {
    console.error('Error parsing sheet row:', error);
    return null;
  }
}

/**
 * POST /api/umrah-visa/invoice/fetch-from-sheet
 * Fetch data from Google Sheet and update UmrahPassenger records
 */
router.post('/invoice/fetch-from-sheet', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;

    // Only admin/staff can fetch from sheet
    if (user.role === 'party') {
      return res.status(403).json({ error: 'Only admin/staff can fetch from sheet' });
    }

    // Fetch data from Google Sheet
    const rows = await fetchSheetData();
    
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No data found in the sheet' });
    }

    // First row is headers
    const headers = rows[0].map((h: any) => h.toString().toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Parse sheet rows
    const sheetData: SheetRow[] = [];
    for (const row of dataRows) {
      const parsed = parseSheetRow(row, headers);
      if (parsed) {
        sheetData.push(parsed);
      }
    }

    // Group by groupNumber
    const groupedByGroupNumber = new Map<string, SheetRow[]>();
    for (const row of sheetData) {
      const groupNum = row.groupNumber.trim();
      if (!groupedByGroupNumber.has(groupNum)) {
        groupedByGroupNumber.set(groupNum, []);
      }
      groupedByGroupNumber.get(groupNum)!.push(row);
    }

    // Get all bookings with groupNumbers from sheet
    const groupNumbers = Array.from(groupedByGroupNumber.keys());
    const bookings = await prisma.umrahVisaBooking.findMany({
      where: {
        groupNumber: {
          in: groupNumbers,
        },
        isDeleted: false,
      },
      select: {
        id: true,
        groupNumber: true,
        groupName: true,
        passengerCount: true,
      },
    });

    const bookingMap = new Map<string, typeof bookings[0]>();
    for (const booking of bookings) {
      if (booking.groupNumber) {
        bookingMap.set(booking.groupNumber.trim(), booking);
      }
    }

    const validationResults: ValidationResult[] = [];
    let totalUpdated = 0;
    let totalIgnored = 0;

    // Process each group
    for (const [groupNumber, sheetRows] of groupedByGroupNumber.entries()) {
      const booking = bookingMap.get(groupNumber);

      if (!booking) {
        // Group number not found in system - ignore
        totalIgnored++;
        continue;
      }

      // Get all passengers for this booking
      const passengers = await prisma.umrahPassenger.findMany({
        where: {
          bookingId: booking.id,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'asc', // Order by creation to match with sheet rows
        },
      });

      const totalPassengers = passengers.length;
      let updatedCount = 0;

      // Update passengers with sheet data (match by order/index)
      for (let i = 0; i < Math.min(passengers.length, sheetRows.length); i++) {
        const passenger = passengers[i];
        const sheetRow = sheetRows[i];

        // Parse dates
        const entryDate = parseDateDDMMYYYY(sheetRow.entryDate);
        const exitDate = parseDateDDMMYYYY(sheetRow.exitDate);

        // Update passenger record
        await prisma.umrahPassenger.update({
          where: { id: passenger.id },
          data: {
            fullName: sheetRow.mutamerName || passenger.fullName,
            nationality: sheetRow.mutamerNationality || passenger.nationality,
            passportNumber: sheetRow.passportNumber || passenger.passportNumber,
            entryDate: entryDate || passenger.entryDate,
            exitDate: exitDate || passenger.exitDate,
            visaNumber: sheetRow.visaNumber || passenger.visaNumber,
            mofaNumber: sheetRow.mofaNumber || passenger.mofaNumber,
          },
        });

        updatedCount++;
        totalUpdated++;
      }

      // Count passengers with visaNumber
      const updatedPassengers = await prisma.umrahPassenger.findMany({
        where: {
          bookingId: booking.id,
          isDeleted: false,
          visaNumber: {
            not: null,
          },
        },
      });

      const pendingCount = totalPassengers - updatedPassengers.length;
      const isReady = pendingCount === 0 && updatedPassengers.length === totalPassengers;

      validationResults.push({
        groupNumber: booking.groupNumber || '',
        groupName: booking.groupName || '',
        totalPassengers,
        updatedPassengers: updatedPassengers.length,
        pendingPassengers: pendingCount,
        isReady,
        bookingId: booking.id,
      });
    }

    res.json({
      success: true,
      message: 'Sheet data fetched and passengers updated successfully',
      summary: {
        totalGroupsProcessed: validationResults.length,
        totalPassengersUpdated: totalUpdated,
        totalGroupsIgnored: totalIgnored,
      },
      results: validationResults,
    });
  } catch (error: any) {
    console.error('Error fetching from sheet:', error);
    res.status(500).json({
      error: 'Failed to fetch from sheet',
      message: error.message,
    });
  }
});

export default router;

