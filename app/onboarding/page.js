'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, doc, setDoc, getDoc, updateDoc, query,
  where, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export default function OnboardingPage() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState('choose'); // 'choose' | 'create' | 'join'
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/'); return; }
    if (userData?.coupleId) { router.replace('/dashboard'); return; }
  }, [user, userData, loading, router]);

  const handleCreateCouple = async () => {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      const code = generateInviteCode();
      const coupleRef = doc(collection(db, 'couples'));
      await setDoc(coupleRef, {
        inviteCode: code,
        members: [user.uid],
        memberNames: { [user.uid]: userData?.displayName || 'You' },
        memberColors: { [user.uid]: 'cyan' },
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });
      await updateDoc(doc(db, 'users', user.uid), {
        coupleId: coupleRef.id,
        color: 'cyan',
      });
      setGeneratedCode(code);
      setInviteCode(code);
      setStep('created');
    } catch (err) {
      setError(err.message || 'Failed to create couple.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinCouple = async () => {
    if (!user || !joinCode.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const code = joinCode.trim().toUpperCase();
      const q = query(collection(db, 'couples'), where('inviteCode', '==', code));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('Invalid invite code. Please check and try again.');
        setSubmitting(false);
        return;
      }

      const coupleDoc = snapshot.docs[0];
      const coupleData = coupleDoc.data();

      if (coupleData.members.includes(user.uid)) {
        setError("You're already in this couple!");
        setSubmitting(false);
        return;
      }

      if (coupleData.members.length >= 2) {
        setError('This couple already has 2 members.');
        setSubmitting(false);
        return;
      }

      const newMembers = [...coupleData.members, user.uid];
      const newNames = { ...coupleData.memberNames, [user.uid]: userData?.displayName || 'Partner' };
      const newColors = { ...coupleData.memberColors, [user.uid]: 'coral' };

      await updateDoc(doc(db, 'couples', coupleDoc.id), {
        members: newMembers,
        memberNames: newNames,
        memberColors: newColors,
      });

      await updateDoc(doc(db, 'users', user.uid), {
        coupleId: coupleDoc.id,
        color: 'coral',
      });

      await refreshUserData();
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to join couple.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToDashboard = async () => {
    await refreshUserData();
    router.replace('/dashboard');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="aurora-container"><div className="aurora-blob aurora-1" /><div className="aurora-blob aurora-2" /></div>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="aurora-container">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '460px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            display: 'inline-flex',
            gap: '8px',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '100px',
            padding: '6px 14px 6px 10px',
            marginBottom: '20px',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', fontFamily: 'Syne, sans-serif' }}>
              Welcome, {userData?.displayName?.split(' ')[0] || 'there'}
            </span>
          </div>

          <h1 className="heading-xl" style={{ fontSize: '32px', marginBottom: '10px' }}>
            {step === 'created' ? '🎉 Your couple is ready!' : 'Connect with your partner'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
            {step === 'created'
              ? 'Share this code with your partner so they can join.'
              : 'Create a couple space or join your partner with their invite code.'}
          </p>
        </div>

        {/* Content Card */}
        <div className="glass" style={{ borderRadius: '24px', padding: '32px' }}>

          {/* === CHOOSE STEP === */}
          {step === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button
                onClick={() => { setStep('create'); setError(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: '16px',
                  background: 'rgba(0,212,255,0.06)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>
                    Create a new couple
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Generate an invite code to share with your partner
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setStep('join'); setError(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: '16px',
                  background: 'rgba(255,107,107,0.06)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.06)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,107,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M14 12H3" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>
                    Join with invite code
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Enter the code your partner shared with you
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* === CREATE STEP === */}
          {step === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.15)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  You'll be the <strong style={{ color: 'var(--cyan)' }}>cyan</strong> partner. Your partner gets <strong style={{ color: 'var(--coral)' }}>coral</strong>.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #00d4ff, #009fc2)', boxShadow: '0 0 12px rgba(0,212,255,0.4)' }} />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                    <path d="M17 8l4 4-4 4M7 8l-4 4 4 4" />
                  </svg>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b6b, #c94444)', boxShadow: '0 0 12px rgba(255,107,107,0.4)' }} />
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#ff8888' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-ghost" onClick={() => setStep('choose')} style={{ flex: 1 }}>
                  Back
                </button>
                <button className="btn-primary" onClick={handleCreateCouple} disabled={submitting} style={{ flex: 2 }}>
                  {submitting ? 'Creating...' : 'Create My Couple'}
                </button>
              </div>
            </div>
          )}

          {/* === CREATED STEP === */}
          {step === 'created' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              <div style={{
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.25)',
                borderRadius: '20px',
                padding: '28px 32px',
                width: '100%',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif', marginBottom: '12px' }}>
                  Your Invite Code
                </p>
                <div className="invite-code">{generatedCode}</div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px' }}>
                  Share this with your partner so they can join
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="btn-ghost"
                style={{ width: '100%' }}
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>

              <div className="divider" style={{ width: '100%' }} />

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                You can start tracking now and your partner can join later.
              </p>

              <button className="btn-primary" onClick={handleContinueToDashboard} style={{ width: '100%' }}>
                Go to Dashboard →
              </button>
            </div>
          )}

          {/* === JOIN STEP === */}
          {step === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Partner's Invite Code
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="e.g. ABCD1234"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, textAlign: 'center' }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.25)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#ff8888' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-ghost" onClick={() => { setStep('choose'); setError(''); }} style={{ flex: 1 }}>
                  Back
                </button>
                <button
                  className="btn-primary btn-coral"
                  onClick={handleJoinCouple}
                  disabled={submitting || joinCode.length < 6}
                  style={{ flex: 2 }}
                >
                  {submitting ? 'Joining...' : 'Join Couple'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
