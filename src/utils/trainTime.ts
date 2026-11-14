/**
 * trainTime.ts
 * Pure utilities for train departure, arrival, duration parsing, formatting, and day offset.
 *
 * Examples / Test cases:
 * parseTimeToMinutes("11:25 AM") -> 685
 * parseTimeToMinutes("06:40 PM") -> 1120
 * parseTimeToMinutes("14:15") -> 855
 * parseTimeToMinutes("00:30") -> 30
 * parseTimeToMinutes("12:15 AM") -> 15
 * parseTimeToMinutes("12:15 PM") -> 735
 *
 * formatTime12h("14:15") -> "2:15 PM"
 * formatTime12h("09:05") -> "9:05 AM"
 * formatTime12h("11:25 AM") -> "11:25 AM"
 *
 * parseDurationMinutes("7h 15m") -> 435
 * parseDurationMinutes("45m") -> 45
 * parseDurationMinutes("08h 30m") -> 510
 *
 * formatDuration(435) -> "7h 15m"
 * formatDuration(45) -> "45m"
 * formatDuration(480) -> "8h 0m"
 *
 * getArrivalDayOffset("11:35 PM", 455) -> 1  (dep 23:35 + 7h35m = next day 07:10 AM)
 * getArrivalDayOffset("11:25 AM", 435) -> 0  (dep 11:25 + 7h15m = same day 06:40 PM)
 * getArrivalDayOffset("22:00", 1600) -> 2  (dep 22:00 + 26h40m = 2 days later)
 */

/**
 * Parses time string (24h "HH:MM" or 12h "hh:mm AM/PM") into total minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const clean = timeStr.trim().toUpperCase();

  // Match 12-hour format: "09:30 AM", "9:30AM", "11:25 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = parseInt(match12[2], 10);
    const period = match12[3].toUpperCase();

    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else if (period === 'PM') {
      if (hours !== 12) hours += 12;
    }
    return hours * 60 + mins;
  }

  // Match 24-hour format: "14:15", "09:25", "14:15:00"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = parseInt(match24[2], 10);
    return (hours % 24) * 60 + mins;
  }

  return 0;
}

/**
 * Formats time string into standard 12-hour display: e.g. "11:25 AM", "6:40 PM".
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const clean = timeStr.trim();

  // If already in "hh:mm AM/PM" format, normalize and return
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    const h = parseInt(match12[1], 10);
    const m = match12[2];
    const period = match12[3].toUpperCase();
    return `${h}:${m} ${period}`;
  }

  // Convert from 24h
  const totalMins = parseTimeToMinutes(clean);
  let hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  if (hours === 0) hours = 12;

  const minsFormatted = mins < 10 ? `0${mins}` : `${mins}`;
  return `${hours}:${minsFormatted} ${period}`;
}

/**
 * Parses duration string into total minutes.
 * Handles "7h 15m", "07h 30m", "45m", "8h", "8.5 hr", "08:35".
 */
export function parseDurationMinutes(durationStr: string): number {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const clean = durationStr.trim().toLowerCase();

  // 1. "7h 15m" or "7h" or "15m"
  let total = 0;
  const hMatch = clean.match(/(\d+)\s*h/);
  const mMatch = clean.match(/(\d+)\s*m/);

  if (hMatch || mMatch) {
    if (hMatch) total += parseInt(hMatch[1], 10) * 60;
    if (mMatch) total += parseInt(mMatch[1], 10);
    return total;
  }

  // 2. "7.5 hr" or "8.25 hr"
  const hrDecimal = clean.match(/(\d+)\.(\d+)\s*hr/);
  if (hrDecimal) {
    const hrs = parseInt(hrDecimal[1], 10);
    const mins = Math.round(parseFloat('0.' + hrDecimal[2]) * 60);
    return hrs * 60 + mins;
  }

  // 3. "08:35" format
  const colonMatch = clean.match(/^(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  return 0;
}

/**
 * Formats duration in minutes to compact string:
 * e.g. 435 -> "7h 15m", 45 -> "45m", 480 -> "8h 0m" (no leading zeros).
 */
export function formatDuration(durationMinutes: number): string {
  if (!durationMinutes || durationMinutes <= 0) return '0m';
  const hours = Math.floor(durationMinutes / 60);
  const mins = Math.round(durationMinutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Calculates arrival day offset (0 = same day, 1 = next day +1, 2 = +2 days, etc.).
 * @param depTimeStr Departure time string in 24h or 12h format.
 * @param durationMinutes Total travel duration in minutes.
 */
export function getArrivalDayOffset(depTimeStr: string, durationMinutes: number): number {
  const depMinutes = parseTimeToMinutes(depTimeStr);
  const totalMins = depMinutes + Math.max(0, durationMinutes);
  return Math.floor(totalMins / 1440);
}

/**
 * Calculates the next running date after fromDate based on weekly runsOn boolean array.
 * @param runsOn 7-element boolean array [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
 * @param fromDate Starting date to search from
 * @returns Next Date when the train runs, or null if it never runs
 *
 * Example:
 * getNextRunningDate([false, true, false, false, false, false, false], new Date('2026-11-14')) // Sat -> next Mon (2026-11-16)
 */
export function getNextRunningDate(
  runsOn: boolean[] = [true, true, true, true, true, true, true],
  fromDate: Date = new Date()
): Date | null {
  if (!runsOn || runsOn.length !== 7 || !runsOn.some(Boolean)) {
    return null;
  }

  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(fromDate.getTime() + offset * 86400000);
    const dayOfWeek = candidate.getDay(); // 0 = Sun .. 6 = Sat
    if (runsOn[dayOfWeek]) {
      return candidate;
    }
  }

  return null;
}

/**
 * Formats time string into standard 24-hour display: e.g. "14:15", "09:05".
 */
export function formatTime24h(timeStr: string): string {
  if (!timeStr || typeof timeStr !== 'string') return '--';
  const clean = timeStr.trim();
  if (clean === '--' || clean === '--:--') return '--';
  const totalMins = parseTimeToMinutes(clean);
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export type ClockPreference = 'auto' | '12h' | '24h';

/**
 * Formats clock time based on user preference and screen auto default.
 * @param timeStr Raw time string (12h or 24h)
 * @param pref User preference ('auto' | '12h' | '24h')
 * @param autoFormat Screen auto default ('12h' for search, '24h' for tracker)
 */
export function formatClock(
  timeStr: string,
  pref: ClockPreference = 'auto',
  autoFormat: '12h' | '24h' = '12h'
): string {
  if (!timeStr || timeStr === '--' || timeStr === '--:--') return '--';
  const effectiveFormat = pref === 'auto' ? autoFormat : pref;
  if (effectiveFormat === '24h') {
    return formatTime24h(timeStr);
  }
  return formatTime12h(timeStr);
}


