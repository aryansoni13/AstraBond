'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function TimezoneOverlap({ myTimezone, partnerTimezone, partnerName }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const getTimeInZone = (tz) => {
    try {
      if (!tz) return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return now.toLocaleTimeString([], { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const currentHourInZone = (tz) => {
    if (!tz) return now.getHours();
    return parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now));
  };

  const myHour = currentHourInZone(myTimezone);
  const partnerHour = currentHourInZone(partnerTimezone);

  // Helper to check if an hour is "waking" (8 AM to 11 PM)
  const isWaking = (h) => h >= 8 && h <= 23;

  // Calculate 24-hour overlap array
  const hours = Array.from({ length: 24 }).map((_, i) => i);

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.03)', 
      borderRadius: '24px', 
      padding: '24px', 
      border: '1px solid rgba(255,255,255,0.08)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px', fontFamily: 'Syne, sans-serif' }}>
        Timezone Mirror
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Seeing the world through each other's clocks.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
            Your Time
          </p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>
            {getTimeInZone(myTimezone)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
            {partnerName}'s Time
          </p>
          <p style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>
            {partnerTimezone ? getTimeInZone(partnerTimezone) : 'Syncing...'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
         <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '2px', height: '12px' }}>
              {hours.map(h => {
                const active = h === myHour;
                const waking = isWaking(h);
                return (
                  <div key={h} style={{ 
                    flex: 1, 
                    background: active ? '#fff' : waking ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '2px',
                    boxShadow: active ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                  }} />
                );
              })}
            </div>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>You</p>
         </div>

         <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '2px', height: '12px' }}>
              {hours.map(h => {
                const active = h === partnerHour;
                const waking = isWaking(h);
                return (
                  <div key={h} style={{ 
                    flex: 1, 
                    background: active ? '#fff' : waking ? 'rgba(255,107,107,0.3)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '2px',
                    boxShadow: active ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
                  }} />
                );
              })}
            </div>
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>{partnerName}</p>
         </div>
      </div>

      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        borderRadius: '12px', 
        background: 'rgba(255,255,255,0.02)', 
        border: '1px solid rgba(255,255,255,0.04)',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {isWaking(myHour) && isWaking(partnerHour) 
            ? "✨ You're both awake and likely free! 💬" 
            : isWaking(myHour) ? `${partnerName} might be sleeping 💤` : "You should get some rest! 💤"}
        </p>
      </div>
    </div>
  );
}
