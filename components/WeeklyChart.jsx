'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f0f1e',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px 16px',
      fontFamily: 'Syne, sans-serif',
    }}>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.fill }} />
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>
            {p.name}: <strong style={{ color: p.fill }}>{p.value}h</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

export default function WeeklyChart({ activities, memberColors = {}, memberNames = {} }) {
  // Build 7-day data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: i === 6 ? 'Today' : format(d, 'EEE'),
    };
  });

  // Get unique user IDs
  const userIds = Object.keys(memberColors);

  const data = days.map(({ date, label }) => {
    const entry = { date: label };
    userIds.forEach((uid) => {
      const total = activities
        .filter((a) => a.userId === uid && a.date === date)
        .reduce((sum, a) => sum + a.duration, 0);
      entry[uid] = parseFloat((total / 60).toFixed(1));
    });
    return entry;
  });

  const colorMap = { cyan: '#00d4ff', coral: '#ff6b6b' };

  if (userIds.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} barGap={4} barSize={18}>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'Syne, sans-serif', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Syne, sans-serif' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}h`}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }} />
        {userIds.map((uid) => {
          const color = colorMap[memberColors[uid]] || '#00d4ff';
          const name = memberNames[uid] || uid;
          return (
            <Bar
              key={uid}
              dataKey={uid}
              name={name}
              fill={color}
              radius={[6, 6, 2, 2]}
              style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
