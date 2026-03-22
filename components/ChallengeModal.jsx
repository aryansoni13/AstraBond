'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ACTIVITY_TYPES = [
  { id: 'work',     label: 'Work',        emoji: '💼' },
  { id: 'exercise', label: 'Exercise',    emoji: '🏋️' },
  { id: 'reading',  label: 'Learning',    emoji: '📚' },
  { id: 'creative', label: 'Creative',    emoji: '🎨' },
  { id: 'selfcare', label: 'Self-care',   emoji: '🧘' },
  { id: 'social',   label: 'Social',      emoji: '👥' },
  { id: 'chores',   label: 'Chores',      emoji: '🏠' },
  { id: 'other',    label: 'Other',       emoji: '✨' },
];

export default function ChallengeModal({ user, userData, coupleData, onClose, onCreated }) {
  const [selectedType, setSelectedType] = useState('work');
  const [targetHours, setTargetHours]   = useState(2);
  const [deadline, setDeadline]         = useState(() => {
    const nextSunday = new Date();
    nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()) % 7);
    return nextSunday.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');

  const allTypes = [...ACTIVITY_TYPES, ...(coupleData?.customActivityTypes || [])];

  const handleSubmit = async () => {
    if (!user || !userData?.coupleId) return;
    setSubmitting(true);
    setError('');

    try {
      const partnerId = coupleData?.members?.find(m => m !== user.uid);
      if (!partnerId) {
        setError('You need a partner to set challenges! Invite them first.');
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'challenges'), {
        coupleId: userData.coupleId,
        creatorId: user.uid,
        targetId: partnerId,
        type: selectedType,
        targetMinutes: targetHours * 60,
        deadline,
        status: 'active',
        isRevealed: false,
        createdAt: serverTimestamp(),
        createdAtISO: new Date().toISOString(),
      });

      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        setError('Firestore permission denied. Please deploy updated security rules.');
      } else {
        setError('Failed to create challenge. Check your connection.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: '20px', fontWeight: 700 }}>Secret Challenge</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Set a goal for your partner.</p>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
            What should they do?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {allTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  border: selectedType === t.id ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.06)',
                  background: selectedType === t.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '20px',
                  transition: 'all 0.2s'
                }}
                title={t.label}
              >
                {t.emoji}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              TARGET (HOURS)
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={targetHours}
              onChange={e => setTargetHours(parseFloat(e.target.value))}
              className="input-field"
              style={{ padding: '10px' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
              COMPLETE BY
            </label>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="input-field"
              style={{ padding: '10px' }}
            />
          </div>
        </div>

        {error && <p style={{ color: '#ff4d4d', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>{error}</p>}

        <button
          className="btn-primary"
          style={{ width: '100%', height: '48px', fontSize: '15px' }}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? 'Creating...' : 'Send Blind Challenge 🤫'}
        </button>
      </div>
    </div>
  );
}
