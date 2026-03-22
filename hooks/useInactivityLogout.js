'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS     =  2 * 60 * 1000; // warn 2 min before logout (at 13 min)

const ACTIVITY_EVENTS = [
  'mousemove', 'mousedown', 'keydown',
  'touchstart', 'scroll', 'click',
];

/**
 * Auto-signs the user out after INACTIVITY_TIMEOUT_MS of no activity.
 * @param {Function} onWarn  - Called when 2 minutes remain. Receives secondsLeft.
 * @param {Function} onLogout - Called just before signing out.
 */
export function useInactivityLogout({ onWarn, onLogout } = {}) {
  const router      = useRouter();
  const logoutTimer = useRef(null);
  const warnTimer   = useRef(null);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warnTimer.current)   clearTimeout(warnTimer.current);
  }, []);

  const scheduleLogout = useCallback(() => {
    clearTimers();

    // Warn 2 minutes before
    warnTimer.current = setTimeout(() => {
      onWarn?.();
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Sign out at 15 minutes
    logoutTimer.current = setTimeout(async () => {
      onLogout?.();
      await signOut(auth);
      router.replace('/');
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearTimers, onWarn, onLogout, router]);

  const resetTimer = useCallback(() => {
    scheduleLogout();
  }, [scheduleLogout]);

  useEffect(() => {
    // Start the timer immediately
    scheduleLogout();

    // Reset on any user interaction
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, resetTimer)
      );
    };
  }, [scheduleLogout, resetTimer, clearTimers]);
}
