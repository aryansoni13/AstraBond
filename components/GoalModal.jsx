import { useState } from 'react';

export default function GoalModal({ isOpen, onClose, currentGoal, onSave }) {
  const [goal, setGoal] = useState(currentGoal || 20);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      />
      <div 
        className="glass animate-fade-up"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          padding: '30px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        <h2 className="heading-xl" style={{ fontSize: '24px', marginBottom: '8px' }}>
          Combined Goal
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
          Set a custom weekly target for how much time you want to spend together in total!
        </p>

        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Weekly Target (Hours)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <input
            type="number"
            min="1"
            max="168"
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '14px',
              borderRadius: '12px',
              color: 'var(--text)',
              fontSize: '24px',
              fontWeight: 700,
              fontFamily: 'Syne, sans-serif',
              outline: 'none',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--cyan)' }}>hrs</span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Syne, sans-serif'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(goal);
              onClose();
            }}
            style={{
              flex: 1, padding: '14px', borderRadius: '12px',
              background: 'var(--cyan)',
              border: 'none',
              color: '#000', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif'
            }}
          >
            Save Goal
          </button>
        </div>
      </div>
    </div>
  );
}
