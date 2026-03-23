'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { exportRelationshipData, exportToPDF } from '@/lib/exportUtils';
import { Download, LogOut, ChevronDown, Heart } from 'lucide-react';

export default function Navbar({ userData, coupleData }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const [exporting, setExporting] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/');
  };

  const handleExport = async (type = 'csv') => {
    if (!userData?.coupleId || exporting) return;
    setExporting(type);
    try {
      // 1. Fetch ALL activities for the couple
      const actQuery = query(
        collection(db, 'activities'),
        where('coupleId', '==', userData.coupleId)
      );
      const actSnap = await getDocs(actQuery);
      const activities = actSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });

      // 2. Fetch ALL check-ins for the couple
      const checkinQuery = query(
        collection(db, 'checkins'),
        where('coupleId', '==', userData.coupleId)
      );
      const checkinSnap = await getDocs(checkinQuery);
      const checkins = checkinSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        });

      // 3. Attach names to the data
      const getMemberName = (uid) => coupleData?.memberNames?.[uid] || 'Unknown';
      
      const enrichedActivities = activities.map(a => ({
        ...a,
        userName: getMemberName(a.userId)
      }));

      const enrichedCheckins = checkins.map(c => ({
        ...c,
        userName: getMemberName(c.userId)
      }));

      // 4. Trigger export
      const coupleName = coupleData?.name || 'Our Story';
      if (type === 'pdf') {
        exportToPDF(enrichedActivities, enrichedCheckins, coupleName);
      } else {
        await exportRelationshipData(enrichedActivities, enrichedCheckins, coupleName);
      }
      
      setMenuOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export data: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const colorMap = { cyan: '#00d4ff', coral: '#ff6b6b' };
  const myColor = colorMap[userData?.color] || '#00d4ff';

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      borderBottom: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      background: 'rgba(3, 3, 8, 0.85)',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(255,107,107,0.2))',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="url(#navHeartGrad)">
              <path d="M12 21C12 21 4 14.5 4 9C4 6.79 5.79 5 8 5C9.415 5 10.664 5.719 11.394 6.804L12 7.667L12.606 6.804C13.336 5.719 14.585 5 16 5C18.21 5 20 6.79 20 9C20 14.5 12 21 12 21Z" />
              <defs>
                <linearGradient id="navHeartGrad" x1="4" y1="5" x2="20" y2="21" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00d4ff" />
                  <stop offset="1" stopColor="#ff6b6b" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="font-display hidden sm:inline-block" style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>
            Bond Tracker
          </span>
        </div>

        {/* Center - Couple status */}
        {coupleData && coupleData.members.length >= 2 && (
          <div className="hidden md:flex items-center gap-2">
            {coupleData.members.map((uid, i) => (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M12 21C12 21 4 14.5 4 9C4 6.79 5.79 5 8 5C9.415 5 10.664 5.719 11.394 6.804L12 7.667L12.606 6.804C13.336 5.719 14.585 5 16 5C18.21 5 20 6.79 20 9C20 14.5 12 21 12 21Z" /></svg>}
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: colorMap[coupleData.memberColors?.[uid]] || '#00d4ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#000',
                  boxShadow: `0 0 8px ${colorMap[coupleData.memberColors?.[uid]]}60`,
                }}>
                  {(coupleData.memberNames?.[uid] || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Right */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text)',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: myColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: '#000',
              boxShadow: `0 0 8px ${myColor}60`,
            }}>
              {(userData?.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline-block" style={{ fontSize: '13px', fontWeight: 600, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userData?.displayName?.split(' ')[0] || 'You'}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.5 }} />
          </button>

          {menuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 48 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                background: '#0f0f1e',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px',
                padding: '8px',
                minWidth: '180px',
                zIndex: 49,
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}>
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    transition: 'background 0.15s',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {exporting === 'csv' ? (
                    <div className="spinner-small" />
                  ) : (
                    <Download size={16} className="text-indigo-400" />
                  )}
                  {exporting === 'csv' ? 'Exporting...' : 'Export CSV'}
                </button>

                <button
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    transition: 'background 0.15s',
                    marginBottom: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {exporting === 'pdf' ? (
                    <div className="spinner-small" />
                  ) : (
                    <Download size={16} className="text-pink-400" />
                  )}
                  {exporting === 'pdf' ? 'Preparing...' : 'Download PDF'}
                </button>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '9px',
                    background: 'none',
                    border: 'none',
                    color: '#ff8888',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,100,100,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                   <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
