'use client';

import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday as isTodayFns,
  getDay
} from 'date-fns';

export default function ActivityCalendar({ activities, userColor, partnerColor }) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get weekday of first day (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDayOfWeek = getDay(monthStart);

  // Group activities by date
  const activitiesByDate = {};
  activities.forEach(a => {
    activitiesByDate[a.date] = (activitiesByDate[a.date] || 0) + a.duration;
  });

  const getIntensity = (minutes) => {
    if (!minutes) return 0;
    if (minutes < 60) return 1;
    if (minutes < 180) return 2;
    if (minutes < 300) return 3;
    return 4;
  };

  const getDayColor = (intensity) => {
    if (intensity === 0) return 'rgba(255,255,255,0.05)';
    // Blend with theme color (using user color as primary)
    const baseColor = userColor === 'coral' ? '255, 107, 107' : '0, 212, 255';
    const opacities = [0.1, 0.3, 0.5, 0.7, 0.9];
    return `rgba(${baseColor}, ${opacities[intensity - 1]})`;
  };

  return (
    <div style={{ 
      background: 'rgba(255,255,255,0.03)', 
      borderRadius: '24px', 
      padding: '24px', 
      border: '1px solid rgba(255,255,255,0.08)',
      height: '100%'
    }}>
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px', fontFamily: 'Syne, sans-serif' }}>
        Monthly Activity Heatmap
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Consistency is key! Every block matters.
      </p>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
        {/* Day headers */}
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}

        {/* Padding for first week */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {/* Days of the month */}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const minutes = activitiesByDate[dateStr] || 0;
          const intensity = getIntensity(minutes);
          const isToday = isTodayFns(day);

          return (
            <div
              key={dateStr}
              title={`${format(day, 'MMM do')}: ${Math.floor(minutes/60)}h ${minutes%60}m`}
              style={{
                aspectRatio: '1',
                borderRadius: '4px',
                background: getDayColor(intensity),
                border: isToday ? '1px solid #fff' : '1px solid rgba(255,255,255,0.02)',
                position: 'relative',
                transition: 'all 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.zIndex = 2;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = 1;
              }}
            />
          );
        })}
      </div>

      <div style={{ 
        marginTop: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '6px',
        fontSize: '10px',
        color: 'var(--text-muted)'
      }}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ width: '10px', height: '10px', background: getDayColor(i), borderRadius: '2px' }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
