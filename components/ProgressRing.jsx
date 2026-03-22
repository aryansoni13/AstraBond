'use client';

export default function ProgressRing({
  value = 0,
  max = 240,
  size = 120,
  strokeWidth = 8,
  color = '#00d4ff',
  label = '',
  sublabel = '',
  emoji = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference - pct * circumference;
  const cx = size / 2;
  const cy = size / 2;

  // Format value in hours / minutes
  const displayHours = Math.floor(value / 60);
  const displayMins = value % 60;
  const displayStr = displayHours > 0
    ? `${displayHours}h${displayMins > 0 ? ` ${displayMins}m` : ''}`
    : `${displayMins}m`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {emoji && <div style={{ fontSize: '16px', marginBottom: '2px' }}>{emoji}</div>}
          <div style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: size > 100 ? '18px' : '14px',
            color: value > 0 ? color : 'var(--text-muted)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}>
            {value > 0 ? displayStr : '—'}
          </div>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            fontWeight: 500,
            marginTop: '2px',
          }}>
            {Math.round(pct * 100)}%
          </div>
        </div>
      </div>

      {label && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
