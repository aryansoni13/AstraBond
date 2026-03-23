'use client';

import { useState } from 'react';
import { 
  collection, addDoc, updateDoc, doc, arrayUnion, 
  query, where, getDocs 
} from 'firebase/firestore';
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
export default function LogModal({ user, userData, coupleData, today, onClose, onLogged }) {
  const [selectedType, setSelectedType] = useState(null);
  const [duration, setDuration]         = useState(60);
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  
  // Default startTime to (now - duration)
  const [startTime, setStartTime] = useState(() => {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() - duration);
    
    // Format for datetime-local input: YYYY-MM-DDTHH:mm (MUST BE LOCAL TIME)
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  });

  // Custom activity type creation state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customLabel, setCustomLabel]       = useState('');
  const [customEmoji, setCustomEmoji]       = useState('✨');

  // Merge static types with custom types from coupleData
  const allTypes = [...ACTIVITY_TYPES, ...(coupleData?.customActivityTypes || [])];

  const handleAddCustomType = async () => {
    if (!customLabel.trim()) return;
    setSubmitting(true);
    try {
      const newType = {
        id: `custom-${Date.now()}`,
        label: customLabel.trim(),
        emoji: customEmoji,
        desc: 'Custom activity'
      };
      await updateDoc(doc(db, 'couples', userData.coupleId), {
        customActivityTypes: arrayUnion(newType)
      });
      setSelectedType(newType.id);
      setIsAddingCustom(false);
      setCustomLabel('');
    } catch (err) {
      console.error('Failed to add custom type:', err);
      setError('Failed to add custom type.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) { setError('Please select an activity type.'); return; }
    if (!user || !userData?.coupleId) return;
    setError('');
    setSubmitting(true);
    try {
      const myStart = new Date(startTime).getTime();
      const myEnd = myStart + duration * 60000;
      const partnerId = coupleData?.members?.find(m => m !== user.uid);
      
      let isParallel = false;
      if (partnerId) {
        // Query for partner's activities today to check for overlap
        const q = query(
          collection(db, 'activities'),
          where('coupleId', '==', userData.coupleId),
          where('userId', '==', partnerId),
          where('date', '==', today)
        );
        const snap = await getDocs(q);
        snap.forEach(d => {
          const p = d.data();
          if (p.startTime) {
            const pStart = new Date(p.startTime).getTime();
            const pEnd = pStart + p.duration * 60000;
            // Overlap condition: (StartA < EndB) && (EndA > StartB)
            if (myStart < pEnd && myEnd > pStart) {
              isParallel = true;
            }
          }
        });
      }

      const newActId = (await addDoc(collection(db, 'activities'), {
        userId:       user.uid,
        coupleId:     userData.coupleId,
        type:         selectedType,
        duration,
        notes:        notes.trim(),
        date:         today,
        startTime:    new Date(startTime).toISOString(),
        isParallel,
        userName:     userData.displayName || 'You',
        userColor:    userData.color || 'cyan',
        userTimezone: userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        createdAt:    new Date().toISOString(),
      })).id;

      // --- CHECK FOR BLIND CHALLENGE COMPLETION ---
      const challengesQuery = query(
        collection(db, 'challenges'),
        where('coupleId', '==', userData.coupleId),
        where('targetId', '==', user.uid),
        where('status', '==', 'active'),
        where('type', '==', selectedType)
      );
      const challengeSnap = await getDocs(challengesQuery);
      
      for (const cDoc of challengeSnap.docs) {
        const challenge = cDoc.data();
        
        // Sum all activities of this type for this user since challenge was created
        const allActsQuery = query(
          collection(db, 'activities'),
          where('coupleId', '==', userData.coupleId),
          where('userId', '==', user.uid),
          where('type', '==', selectedType)
        );
        const allActsSnap = await getDocs(allActsQuery);
        
        // Start with the current activity we just logged
        let totalMinutes = duration;
        
        // Fallback for creation date: server timestamp or ISO fallback
        const challengeCreatedDate = challenge.createdAt?.toDate() || 
                                     (challenge.createdAtISO ? new Date(challenge.createdAtISO) : new Date(0));
        
        // Safety: subtract 10 seconds to account for minor clock drift
        const comparisonDate = new Date(challengeCreatedDate.getTime() - 10000);
        
        allActsSnap.forEach(aDoc => {
          // Don't count the current activity twice if it's already in the query result
          if (aDoc.id === newActId) return;

          const act = aDoc.data();
          const actCreated = new Date(act.createdAt);
          if (actCreated >= comparisonDate) {
            totalMinutes += act.duration;
          }
        });

        if (totalMinutes >= challenge.targetMinutes) {
          await updateDoc(doc(db, 'challenges', cDoc.id), {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
        }
      }
      // --------------------------------------------

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
            {allTypes.map((t) => (
              <button
                key={t.id}
                type="button"
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

            {/* Add Custom Button */}
            {!isAddingCustom ? (
              <button
                type="button"
                onClick={() => setIsAddingCustom(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'Syne, sans-serif',
                }}
              >
                <span>➕</span>
                <span>Add Custom...</span>
              </button>
            ) : (
              <div style={{
                gridColumn: 'span 2',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '16px',
                padding: '16px',
                marginTop: '4px'
              }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <input 
                    className="input-field" 
                    placeholder="Emoji" 
                    value={customEmoji} 
                    onChange={e => setCustomEmoji(e.target.value)}
                    style={{ width: '60px', textAlign: 'center' }}
                  />
                  <input 
                    className="input-field" 
                    placeholder="Activity Name (e.g. Gaming)" 
                    value={customLabel} 
                    onChange={e => setCustomLabel(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-ghost" style={{ flex: 1, height: '36px', fontSize: '12px' }} onClick={() => setIsAddingCustom(false)}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 2, height: '36px', fontSize: '12px' }} onClick={handleAddCustomType} disabled={!customLabel.trim()}>Create Type</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Duration & Start Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif' }}>
                Duration
              </label>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--cyan)', fontFamily: 'Syne, sans-serif' }}>
                {formatDuration(duration)}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="480"
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="duration-slider"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif', marginBottom: '10px' }}>
              Start Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input-field"
              style={{ padding: '10px 14px', fontSize: '12px', height: '42px' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-18px', marginBottom: '20px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>5 min</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>8 hrs</span>
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
