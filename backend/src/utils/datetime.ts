/**
 * Utility functions for combining and splitting date and time
 */

/**
 * Combines a date string (YYYY-MM-DD) and time string (HH:mm) into a single Date object
 * @param dateString - Date in YYYY-MM-DD format
 * @param timeString - Time in HH:mm format
 * @returns Combined Date object, or undefined if either input is invalid
 */
export function combineDateTime(
  dateString: string | Date | null | undefined,
  timeString: string | Date | null | undefined
): Date | undefined {
  if (!dateString || !timeString) {
    return undefined;
  }

  // Handle date
  let date: Date;
  if (dateString instanceof Date) {
    date = new Date(dateString);
  } else {
    date = new Date(dateString);
  }

  if (isNaN(date.getTime())) {
    return undefined;
  }

  // Handle time
  let hours = 0;
  let minutes = 0;

  if (timeString instanceof Date) {
    hours = timeString.getHours();
    minutes = timeString.getMinutes();
  } else if (typeof timeString === 'string' && timeString.includes(':')) {
    const [h, m] = timeString.split(':');
    hours = parseInt(h, 10);
    minutes = parseInt(m, 10);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return undefined;
    }
  } else {
    // Try to parse as ISO string
    const timeDate = new Date(timeString);
    if (!isNaN(timeDate.getTime())) {
      hours = timeDate.getHours();
      minutes = timeDate.getMinutes();
    } else {
      return undefined;
    }
  }

  // Combine date and time
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  
  return combined;
}

/**
 * Splits a Date object into date string (YYYY-MM-DD) and time string (HH:mm)
 * @param dateTime - Date object to split
 * @returns Object with date and time strings, or undefined if input is invalid
 */
export function splitDateTime(
  dateTime: Date | string | null | undefined
): { date: string; time: string } | undefined {
  if (!dateTime) {
    return undefined;
  }

  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  
  if (isNaN(date.getTime())) {
    return undefined;
  }

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Formats a Date object to time string (HH:mm)
 * @param dateTime - Date object
 * @returns Time string in HH:mm format, or empty string if invalid
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
 * Formats a Date object to date string (YYYY-MM-DD)
 * @param dateTime - Date object
 * @returns Date string in YYYY-MM-DD format, or empty string if invalid
 */
export function formatDate(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '';
  
  const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

