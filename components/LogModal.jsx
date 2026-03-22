'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ACTIVITY_TYPES = [
  { id: 'work',     label: 'Work',        emoji: '💼', desc: 'Deep work, meetings, tasks' },
  { id: 'exercise', label: 'Exercise',    emoji: '🏋️', desc: 'Gym, sports, yoga, walks' },
  { id: 'reading',  label: 'Learning',    emoji: '📚', desc: 'Books, courses, research' },
  { id: 'creative', label: 'Creative',    emoji: '🎨', desc: 'Art, music, writing, design' },
  { id: 'selfcare', label: 'Self-care',   emoji: '🧘', desc: 'Meditation, journaling, rest' },
  { id: 'social',   label: 'Social',      emoji: '👥', desc: 'Family, friends, community' },
  { id: 'chores',   label: 'Chores',      emoji: '🏠', desc: 'Cleaning, cooking, errands' },
  { id: 'other',    label: 'Other',       emoji: '✨', desc: 'Anything else' },
];

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h}h ${m}m`;
}

/**
 * Formats a 'yyyy-MM-dd' string as a human label like "Sunday, March 22".
 * Uses Intl to avoid any timezone parsing issues.
 */
function formatDateLabel(dateStr) {
  try {
    // Parse as local noon to avoid any midnight DST rollover
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * today — passed in from dashboard's useTodayDate() hook.
 * This is the one source of truth for the current date.
 * No date picker — activities always save to the real current day.
 */
export default function LogModal({ user, userData, today, onClose, onLogged }) {
  const [selectedType, setSelectedType] = useState(null);
  const [duration, setDuration]         = useState(60);
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  const handleSubmit = async () => {
    if (!selectedType) { setError('Please select an activity type.'); return; }
    if (!user || !userData?.coupleId) return;
    setError('');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'activities'), {
        userId:       user.uid,
        coupleId:     userData.coupleId,
        type:         selectedType,
        duration,
        notes:        notes.trim(),
        // date is always today in the user's local timezone — sourced from useTodayDate()
        date:         today,
        userName:     userData.displayName || 'You',
        userColor:    userData.color || 'cyan',
        userTimezone: userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        createdAt:    new Date().toISOString(),
      });
      onLogged?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Log Activity
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              What did you work on?
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Date badge — always today, not editable */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(0,212,255,0.08)',
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: '100px',
          padding: '4px 12px',
          marginBottom: '20px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 5px var(--cyan)' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cyan)', fontFamily: 'Syne, sans-serif' }}>
            {formatDateLabel(today)} · Today
          </span>
        </div>

        {/* Activity Type Grid */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif', marginBottom: '10px' }}>
            Activity Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: selectedType === t.id ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.07)',
                  background: selectedType === t.id ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontSize: '20px' }}>{t.emoji}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: selectedType === t.id ? 'var(--cyan)' : 'var(--text)', fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                    {t.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif' }}>
              Duration
            </label>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '16px', color: 'var(--cyan)' }}>
              {formatDuration(duration)}
            </span>
          </div>
          <input
            type="range"
            className="duration-slider"
            min={15}
            max={480}
            step={15}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>15 min</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>8 hrs</span>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif', marginBottom: '8px' }}>
            Notes <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          <textarea
            className="input-field"
            placeholder="What did you accomplish? Any highlights?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.25)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#ff8888', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !selectedType}
            style={{ flex: 2 }}
          >
            {submitting ? 'Saving...' : 'Log Activity ✓'}
          </button>
        </div>

      </div>
    </div>
  );
}
