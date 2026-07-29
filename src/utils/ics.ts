export type CalendarEvent = {
  title: string;
  description?: string;
  startDate: Date | string;
  endDate?: Date | string;
  location?: string;
  url?: string;
};

/**
 * Format date to YYYYMMDDTHHMMSSZ for iCalendar format
 */
function formatDateToICS(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const validDate = isNaN(date.getTime()) ? new Date() : date;
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return (
    validDate.getUTCFullYear() +
    pad(validDate.getUTCMonth() + 1) +
    pad(validDate.getUTCDate()) +
    'T' +
    pad(validDate.getUTCHours()) +
    pad(validDate.getUTCMinutes()) +
    pad(validDate.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Escape special characters in iCalendar text strings
 */
function escapeICSText(str: string): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Download a single event as a .ics file
 */
export function downloadICSFile(event: CalendarEvent, filename?: string): void {
  if (!event || typeof event !== 'object') return;
  const rawStart = new Date(event.startDate);
  const start = isNaN(rawStart.getTime()) ? new Date() : rawStart;
  const rawEnd = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 30 * 60 * 1000);
  const end = isNaN(rawEnd.getTime()) ? new Date(start.getTime() + 30 * 60 * 1000) : rawEnd;

  const titleText = event.title || 'Reminder';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Workspace CRM//Follow-up Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:event-${Date.now()}@workspace-crm`,
    `DTSTAMP:${formatDateToICS(new Date())}`,
    `DTSTART:${formatDateToICS(start)}`,
    `DTEND:${formatDateToICS(end)}`,
    `SUMMARY:${escapeICSText(titleText)}`,
    event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
    event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${titleText.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_reminder.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download multiple events into a single .ics calendar file
 */
export function downloadBatchICSFile(events: CalendarEvent[], filename?: string): void {
  if (!Array.isArray(events) || !events.length) return;

  const eventBlocks = events.map((event, idx) => {
    const rawStart = new Date(event.startDate);
    const start = isNaN(rawStart.getTime()) ? new Date() : rawStart;
    const rawEnd = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 30 * 60 * 1000);
    const end = isNaN(rawEnd.getTime()) ? new Date(start.getTime() + 30 * 60 * 1000) : rawEnd;
    const titleText = event.title || 'Reminder';

    return [
      'BEGIN:VEVENT',
      `UID:batch-event-${Date.now()}-${idx}@workspace-crm`,
      `DTSTAMP:${formatDateToICS(new Date())}`,
      `DTSTART:${formatDateToICS(start)}`,
      `DTEND:${formatDateToICS(end)}`,
      `SUMMARY:${escapeICSText(titleText)}`,
      event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : '',
      event.location ? `LOCATION:${escapeICSText(event.location)}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Workspace CRM//Follow-up Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `workspace_follow_ups_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar web add link
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  if (!event || typeof event !== 'object') return '#';
  const rawStart = new Date(event.startDate);
  const start = isNaN(rawStart.getTime()) ? new Date() : rawStart;
  const rawEnd = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 30 * 60 * 1000);
  const end = isNaN(rawEnd.getTime()) ? new Date(start.getTime() + 30 * 60 * 1000) : rawEnd;

  const datesParam = `${formatDateToICS(start)}/${formatDateToICS(end)}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Follow-up',
    dates: datesParam,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Web Calendar add link
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  if (!event || typeof event !== 'object') return '#';
  const rawStart = new Date(event.startDate);
  const start = isNaN(rawStart.getTime()) ? new Date() : rawStart;
  const rawEnd = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 30 * 60 * 1000);
  const end = isNaN(rawEnd.getTime()) ? new Date(start.getTime() + 30 * 60 * 1000) : rawEnd;

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title || 'Follow-up',
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
