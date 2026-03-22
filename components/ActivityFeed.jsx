'use client';

import { format, isToday, isYesterday } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TYPE_META = {
  work:     { emoji: '💼', label: 'Work' },
  exercise: { emoji: '🏋️', label: 'Exercise' },
  reading:  { emoji: '📚', label: 'Learning' },
  creative: { emoji: '🎨', label: 'Creative' },
  selfcare: { emoji: '🧘', label: 'Self-care' },
  social:   { emoji: '👥', label: 'Social' },
  chores:   { emoji: '🏠', label: 'Chores' },
  other:    { emoji: '✨', label: 'Other' },
};

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch { return dateStr; }
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), 'h:mm a');
  } catch { return ''; }
}

export default function ActivityFeed({ activities, currentUserId, limit = 20 }) {
  const displayed = activities.slice(0, limit);

  const handleReaction = async (activity, emoji) => {
    if (!activity.id) return;
    try {
      const activityRef = doc(db, 'activities', activity.id);
      const currentReactions = activity.reactions || {};
      
      const newReactions = { ...currentReactions };
      if (newReactions[currentUserId] === emoji) {
        delete newReactions[currentUserId];
      } else {
        newReactions[currentUserId] = emoji;
      }

      await updateDoc(activityRef, {
        reactions: newReactions
      });
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  if (displayed.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-muted)',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
        <p style={{ fontSize: '14px', fontWeight: 500 }}>No activities yet.</p>
        <p style={{ fontSize: '13px', marginTop: '4px', opacity: 0.7 }}>Log your first activity below!</p>
      </div>
    );
  }

  return (
    <div 
      className="custom-scrollbar"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '8px',
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '6px' // Prevent scrollbar from overlapping content
      }}
    >
      {displayed.map((activity, i) => {
        const meta = TYPE_META[activity.type] || TYPE_META.other;
        const isMe = activity.userId === currentUserId;
        const color = activity.userColor === 'coral' ? 'var(--coral)' : 'var(--cyan)';
        const colorDim = activity.userColor === 'coral' ? 'rgba(255,107,107,0.08)' : 'rgba(0,212,255,0.08)';
        const colorBorder = activity.userColor === 'coral' ? 'rgba(255,107,107,0.2)' : 'rgba(0,212,255,0.2)';

        return (
          <div
            key={activity.id || i}
            className="glass-hover"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: '14px',
              background: colorDim,
              border: `1px solid ${colorBorder}`,
              animation: `fadeInUp 0.4s ease ${i * 0.05}s forwards`,
              opacity: 0,
            }}
          >
            {/* Emoji */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}>
              {meta.emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--text)',
                }}>
                  {meta.label}
                </span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color,
                  fontFamily: 'Syne, sans-serif',
                  background: colorDim,
                  padding: '2px 8px',
                  borderRadius: '100px',
                  border: `1px solid ${colorBorder}`,
                }}>
                  {activity.userName || (isMe ? 'You' : 'Partner')}
                </span>
              </div>
              
              {activity.notes && (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginTop: '0px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {activity.notes}
                </p>
              )}

              {/* Reactions Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                {['❤️', '🔥', '👏'].map(emoji => {
                  const reactionsCount = Object.values(activity.reactions || {}).filter(r => r === emoji).length;
                  const hasReacted = (activity.reactions || {})[currentUserId] === emoji;
                  
                  return (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReaction(activity, emoji);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background: hasReacted ? colorDim : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${hasReacted ? colorBorder : 'rgba(255,255,255,0.06)'}`,
                        fontSize: '12px',
                        color: hasReacted ? color : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'Syne, sans-serif',
                        fontWeight: 600,
                      }}
                      onMouseEnter={e => { if (!hasReacted) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={e => { if (!hasReacted) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    >
                      <span style={{ filter: hasReacted ? 'none' : 'grayscale(100%) opacity(0.6)' }}>
                        {emoji}
                      </span>
                      {reactionsCount > 0 && <span>{reactionsCount}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {activity.isParallel && (
                <div style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: '#ff4d4d',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '4px',
                  animation: 'pulse 2s infinite',
                  fontFamily: 'Syne, sans-serif'
                }}>
                  Parallel 🔥
                </div>
              )}
              <div style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: '15px',
                color,
                letterSpacing: '-0.02em',
              }}>
                {formatDuration(activity.duration)}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {activity.startTime ? formatTime(activity.startTime) : formatDate(activity.date)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
