import { format } from 'date-fns';

/**
 * Returns today's date in 'yyyy-MM-dd' format required by DB
 */
export const getTodayFormatted = () => format(new Date(), 'yyyy-MM-dd');

/**
 * Formats a given 'yyyy-MM-dd' string into a friendly display format 'dd MMM yyyy'
 */
export const formatDateDisplay = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
};
