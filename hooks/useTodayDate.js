'use client';

import { useState, useEffect } from 'react';

/**
 * Returns today's local date string as 'yyyy-MM-dd'.
 * Automatically updates at midnight so a long-open tab never shows stale data.
 */
export function useTodayDate() {
  const [today, setToday] = useState(() => getLocalDateStr());

  useEffect(() => {
    // Check every 1 minute if the date string has changed.
    // This makes it completely resilient to manual OS clock changes (e.g. testing streaks)
    // because setTimeout measures absolute elapsed time, not calendar time.
    const interval = setInterval(() => {
      const currentRealToday = getLocalDateStr();
      setToday(prev => {
        if (prev !== currentRealToday) return currentRealToday;
        return prev;
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return today;
}

/** Returns today's local date string as 'yyyy-MM-dd' */
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date string in the given IANA timezone.
 * Useful for long-distance couples — get a partner's "today" in their timezone.
 * Falls back to local date if timezone is unknown or invalid.
 *
 * @param {string} timezone  e.g. "Asia/Kolkata" or "America/New_York"
 */
export function getTodayInTimezone(timezone) {
  if (!timezone) return getLocalDateStr();
  try {
    // en-CA locale formats date as 'yyyy-MM-dd' natively
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return getLocalDateStr();
  }
}

/**
 * Returns the last N dates as 'yyyy-MM-dd' strings, in the given timezone.
 * Used for week stats.
 */
export function getLastNDatesInTimezone(n, timezone) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (timezone) {
      try {
        result.push(new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d));
        continue;
      } catch {}
    }
    result.push(getLocalDateStr(d));
  }
  return result;
}
