// Date utilities for consistent US Eastern Time formatting

export function formatDateToEasternTime(date: Date | string, options?: {
  includeTime?: boolean;
  format?: 'short' | 'long' | 'numeric';
}): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const easternTimeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: options?.format === 'long' ? 'long' : options?.format === 'short' ? 'short' : '2-digit',
    day: '2-digit',
  };

  if (options?.includeTime) {
    easternTimeOptions.hour = '2-digit';
    easternTimeOptions.minute = '2-digit';
    easternTimeOptions.hour12 = true;
  }

  return dateObj.toLocaleDateString('en-US', easternTimeOptions);
}

export function formatWorkDate(date: Date | string): string {
  return formatDateToEasternTime(date, { format: 'short' });
}

export function formatRegistrationDate(date: Date | string): string {
  return formatDateToEasternTime(date, { format: 'short' });
}

export function formatGroupId(groupId: string): string {
  // Extract date from group ID format: YYMMDD-XYZ
  if (groupId.length >= 6) {
    const datePart = groupId.substring(0, 6);
    const year = parseInt('20' + datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    
    const date = new Date(year, month - 1, day);
    const formattedDate = formatDateToEasternTime(date, { format: 'short' });
    
    // Return formatted as: "Group ID: [formatted date] - [suffix]"
    const suffix = groupId.substring(7) || '';
    return `${formattedDate}${suffix ? ' - ' + suffix : ''}`;
  }
  
  return groupId;
}

export function getCurrentEasternDate(): Date {
  const now = new Date();
  // Convert current time to Eastern Time
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  return easternTime;
}

export function formatCustomerId(customerId: string): string {
  // Extract date from customer ID format: YYMMDD-ProgramType-Number
  if (customerId.length >= 6) {
    const datePart = customerId.substring(0, 6);
    const year = parseInt('20' + datePart.substring(0, 2));
    const month = parseInt(datePart.substring(2, 4));
    const day = parseInt(datePart.substring(4, 6));
    
    const date = new Date(year, month - 1, day);
    const formattedDate = formatDateToEasternTime(date, { format: 'numeric' });
    
    // Return the full customer ID as-is, but with context
    return customerId;
  }
  
  return customerId;
}

export function formatDateForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  // Format for HTML date input (YYYY-MM-DD) in Eastern Time
  const easternDate = new Date(dateObj.toLocaleString("en-US", {timeZone: "America/New_York"}));
  return easternDate.toISOString().split('T')[0];
}