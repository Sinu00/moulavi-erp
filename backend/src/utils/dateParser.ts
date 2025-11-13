/**
 * Parse date string in DD-MM-YYYY format to Date object
 * @param dateString - Date string in DD-MM-YYYY format
 * @returns Date object or null if parsing fails
 */
export function parseDateDDMMYYYY(dateString: string | null | undefined): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }

  // Remove any whitespace
  const cleaned = dateString.trim();
  
  // Handle empty strings
  if (cleaned === '' || cleaned === '-') {
    return null;
  }

  // Try to parse DD-MM-YYYY format
  const parts = cleaned.split('-');
  if (parts.length !== 3) {
    // Try alternative separators
    const altParts = cleaned.split('/');
    if (altParts.length === 3) {
      const day = parseInt(altParts[0], 10);
      const month = parseInt(altParts[1], 10);
      const year = parseInt(altParts[2], 10);
      
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return date;
        }
      }
    }
    return null;
  }

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  // Validate parsed values
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  // Create date object (month is 0-indexed in JavaScript)
  const date = new Date(year, month - 1, day);

  // Validate the date (check if it's a valid date)
  if (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  ) {
    return date;
  }

  return null;
}

