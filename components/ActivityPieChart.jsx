'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const TYPE_COLORS = {
  work:     '#00d4ff',
  exercise: '#00ff9d',
  reading:  '#a78bfa',
  creative: '#fb923c',
  selfcare: '#f472b6',
  social:   '#fbbf24',
  other:    '#94a3b8'
};

const INSIGHTS = {
  work:     "You're big on the hustle! Don't forget to take a breather. ☕",
  exercise: "Look at those gains! You two are staying super healthy. 💪",
  reading:  "Expanding those horizons together. Knowledge is power! 📚",
  creative: "The world needs your art. Keep that spark alive! 🎨",
  selfcare: "Loving the focus on wellness. Mental health is wealth! 🧘",
  social:   "Social butterflies! Love seeing you connect with others. 👥",
  other:    "A little bit of everything. Balance is key! ✨"
};

export default function ActivityPieChart({ activities }) {
  // Process activities into chart data
  const dataMap = {};
  activities.forEach(a => {
    const type = a.type || 'other';
    dataMap[type] = (dataMap[type] || 0) + a.duration;
  });

  const data = Object.keys(dataMap).map(type => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: dataMap[type],
    id: type
  })).sort((a, b) => b.value - a.value);

  const totalMinutes = data.reduce((sum, entry) => sum + entry.value, 0);
  const dominant = data[0]?.id || 'other';

  if (totalMinutes === 0) {
    return (
      <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
        No activities logged yet to show a breakdown.
      </div>
    );
  }

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
        Activity Breakdown
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Where you both spent your time this week.
      </p>

      <div style={{ flex: 1, minHeight: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.id] || TYPE_COLORS.other} stroke="none" />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => `${Math.round(value / 60)}h ${value % 60}m`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px 16px', 
        background: 'rgba(255,255,255,0.02)', 
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600, fontFamily: 'Syne, sans-serif' }}>
          {INSIGHTS[dominant]}
        </p>
      </div>
    </div>
  );
}
