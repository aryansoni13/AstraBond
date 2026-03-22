'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export default function AuthPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && userData) {
      if (userData.coupleId) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, userData, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!form.name.trim()) throw new Error('Please enter your name.');
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(cred.user, { displayName: form.name.trim() });
        await setDoc(doc(db, 'users', cred.user.uid), {
          displayName: form.name.trim(),
          email: form.email,
          coupleId: null,
          color: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
        const snap = await getDoc(doc(db, 'users', cred.user.uid));
        if (snap.exists() && snap.data().coupleId) {
          router.replace('/dashboard');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (err) {
      const msg = err.code === 'auth/user-not-found' ? 'No account with that email.'
        : err.code === 'auth/wrong-password' ? 'Incorrect password.'
        : err.code === 'auth/email-already-in-use' ? 'Email already in use.'
        : err.code === 'auth/weak-password' ? 'Password must be at least 6 characters.'
        : err.code === 'auth/invalid-email' ? 'Please enter a valid email.'
        : err.message || 'Something went wrong.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="aurora-container">
          <div className="aurora-blob aurora-1" />
          <div className="aurora-blob aurora-2" />
        </div>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      {/* Aurora Background */}
      <div className="aurora-container">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
      </div>

      {/* Star field */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() > 0.8 ? '2px' : '1px',
              height: Math.random() > 0.8 ? '2px' : '1px',
              background: 'rgba(255,255,255,0.6)',
              borderRadius: '50%',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        {/* Logo / Hero */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(255,107,107,0.15))',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px',
          }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 30C18 30 6 22.5 6 13.5C6 10.1863 8.68629 7.5 12 7.5C14.1217 7.5 15.9957 8.57812 17.0918 10.2054L18 11.5L18.9082 10.2054C20.0043 8.57812 21.8783 7.5 24 7.5C27.3137 7.5 30 10.1863 30 13.5C30 22.5 18 30 18 30Z"
                fill="url(#heartGrad)" />
              <defs>
                <linearGradient id="heartGrad" x1="6" y1="7.5" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00d4ff" />
                  <stop offset="1" stopColor="#ff6b6b" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="heading-xl shimmer-text" style={{ fontSize: '36px', marginBottom: '10px' }}>
            Bond Tracker
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
            Track your daily wins. Grow together.
          </p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: '24px', padding: '32px' }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '28px',
          }}>
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className="font-display"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: mode === m ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                  textTransform: 'capitalize',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'signup' && (
                <div className="animate-fade-up">
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Your Name
                  </label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="e.g. Alex"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Email
                </label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <input
                  className="input-field"
                  type="password"
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(255,100,100,0.1)',
                  border: '1px solid rgba(255,100,100,0.25)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#ff8888',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {submitting ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'spinRing 0.8s linear infinite' }} />
                    {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  mode === 'signup' ? 'Create Account' : 'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          Your data is private. Only you and your partner can see your combined progress.
        </p>
      </div>
    </div>
  );
}
