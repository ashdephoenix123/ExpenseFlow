import { format } from 'date-fns';

/**
 * Returns today's date in 'yyyy-MM-dd' format required by DB
 */
export const getTodayFormatted = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Formats a given 'yyyy-MM-dd' string into a friendly display format 'EEE, MMMM do, yyyy'
 * e.g. Mon, October 12th, 2026
 */
export const formatDateDisplay = (dateStr: string) => {
  try {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return format(d, 'EEE, MMMM do, yyyy');
    }
    return format(new Date(dateStr), 'EEE, MMMM do, yyyy');
  } catch {
    return dateStr;
  }
};

/**
 * Formats an ISO date/timestamp into 'hh:mm a' (e.g. '08:42 PM')
 */
export const formatTimeDisplay = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'hh:mm a');
  } catch {
    return '';
  }
};
