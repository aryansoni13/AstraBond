'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, query, where, onSnapshot,
  doc, deleteDoc, addDoc, updateDoc, getDoc, increment,
  serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db, messaging } from '@/lib/firebase';
import { getMessaging, getToken } from 'firebase/messaging';
import ActivityPieChart from '@/components/ActivityPieChart';
import ActivityCalendar from '@/components/ActivityCalendar';
import TimezoneOverlap from '@/components/TimezoneOverlap';
import { useAuth } from '@/hooks/useAuth';
import { useTodayDate, getTodayInTimezone, getLastNDatesInTimezone } from '@/hooks/useTodayDate';
import { format, formatDistanceToNow } from 'date-fns';

import Navbar from '@/components/Navbar';
import ProgressRing from '@/components/ProgressRing';
import ActivityFeed from '@/components/ActivityFeed';
import WeeklyChart from '@/components/WeeklyChart';
import LogModal from '@/components/LogModal';
import GoalModal from '@/components/GoalModal';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

const TYPE_META = {
  work:     { emoji: '💼', label: 'Work',      color: '#00d4ff' },
  exercise: { emoji: '🏋️', label: 'Exercise',  color: '#00ff9d' },
  reading:  { emoji: '📚', label: 'Learning',  color: '#a78bfa' },
  creative: { emoji: '🎨', label: 'Creative',  color: '#fb923c' },
  selfcare: { emoji: '🧘', label: 'Self-care', color: '#f472b6' },
  social:   { emoji: '👥', label: 'Social',    color: '#fbbf24' },
  chores:   { emoji: '🏠', label: 'Chores',    color: '#94a3b8' },
  other:    { emoji: '✨', label: 'Other',      color: '#e2e8f0' },
};

const DAILY_GOAL_MINUTES = 240; // 4 hours default goal

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function calculateStreak(activities, userId, myTimezone) {
  // Collect unique dates the user logged on, using their stored timezone
  const dates = [...new Set(
    activities
      .filter(a => a.userId === userId)
      .map(a => a.date)
  )].sort().reverse();

  if (!dates.length) return 0;

  let streak = 0;
  const now = new Date();

  // Start from 'today' in the user's own timezone
  let currentDateStr = getTodayInTimezone(myTimezone);

  for (let i = 0; i < 365; i++) {
    if (dates.includes(currentDateStr)) {
      streak++;
    } else if (i === 0) {
      // Grace: if nothing logged today yet, check if yesterday keeps the streak alive
      // (don't break yet, just don't count today)
    } else {
      break;
    }
    // Move to previous day
    const parts = currentDateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    currentDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  return streak;
}

function getTypeBreakdown(activities) {
  const breakdown = {};
  activities.forEach(a => {
    breakdown[a.type] = (breakdown[a.type] || 0) + a.duration;
  });
  return Object.entries(breakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
}

export default function DashboardPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  // Reactive today — auto-updates at midnight so stale open tabs get fixed
  const myToday = useTodayDate();

  const [coupleData, setCoupleData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'week' | 'all'
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 min in seconds
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [partnerData, setPartnerData] = useState(null);
  const [lastPartnerHeartCount, setLastPartnerHeartCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const { width, height } = useWindowSize();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Inactivity auto-logout (15 min)
  useInactivityLogout({
    onWarn: () => {
      setInactivityWarning(true);
      setCountdown(120);
    },
    onLogout: () => {
      showToast('Signed out due to inactivity.', 'error');
    },
  });

  // --- NUDGES LOGIC ---
  const handleNudgePartner = async () => {
    console.log('Nudge requested...');
    const partnerId = coupleData?.members?.find(m => m !== user?.uid);
    if (!partnerId || !userData?.coupleId) {
      console.log('Nudge aborted: No partner or coupleId found', { partnerId, coupleId: userData?.coupleId });
      return;
    }
    try {
      console.log('Sending nudge to Firestore...', { toUserId: partnerId });
      await addDoc(collection(db, 'nudges'), {
        toUserId: partnerId,
        fromUserId: user.uid,
        coupleId: userData.coupleId,
        createdAt: new Date().toISOString()
      });
      console.log('Nudge sent successfully!');
      showToast('Nudge sent! 👀', 'success');

      // --- Trigger Push Notification through API ---
      // We already have partnerData in state from our new listener
      const partnerToken = partnerData?.fcmToken;
      if (partnerToken) {
        try {
          fetch('/api/nudge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: partnerToken,
              senderName: userData.name || 'Your partner'
            })
          });
        } catch (err) {
          console.error('Error sending nudge notification:', err);
        }
      }

    } catch (err) {
      console.error('Error sending nudge:', err);
      showToast('Wait, failed to nudge. Check your internet?', 'error');
    }
  };

  // --- PRESENCE HEARTBEAT ---
  useEffect(() => {
    if (!user?.uid) return;
    
    const updatePresence = async () => {
      // Don't update if tab is hidden
      if (document.visibilityState !== 'visible') return;

      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastActive: serverTimestamp()
        });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };

    // Initial update
    updatePresence();

    // Heartbeat every 2 minutes
    const interval = setInterval(updatePresence, 120000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Keep 'now' fresh for online status calculation (every 30s)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user?.uid || !userData?.coupleId) return;

    console.log('Listening for nudges targeting:', user.uid);
    // Listen for nudges sent specifically to me
    const q = query(
      collection(db, 'nudges'),
      where('toUserId', '==', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added') {
          console.log('RECEIVED NUDGE!', change.doc.data());
          showToast('Your partner is nudging you to log an activity! 👀', 'success');
          // Acknowledge and delete the nudge so it doesn't fire again
          deleteDoc(doc(db, 'nudges', change.doc.id)).catch(console.error);
        }
      });
    }, (err) => {
      console.error('Nudge listener error:', err);
    });

    return () => unsub();
  }, [user?.uid, userData?.coupleId]);

  // --- FCM TOKEN REGISTRATION ---
  useEffect(() => {
    if (!user?.uid || !userData?.coupleId) return;

    const setupNotifications = async () => {
      try {
        const m = await messaging();
        if (!m) return;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const token = await getToken(m, {
            vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
          });
          if (token) {
            console.log('FCM Token generated:', token);
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: token
            });
          }
        }
      } catch (err) {
        console.error('Notification setup failed:', err);
      }
    };

    setupNotifications();
  }, [user?.uid, userData?.coupleId]);
  // --------------------

  // Countdown ticker when warning is visible
  useEffect(() => {
    if (!inactivityWarning) return;
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [inactivityWarning]);

  // Dismiss warning on any activity
  useEffect(() => {
    if (!inactivityWarning) return;
    const dismiss = () => setInactivityWarning(false);
    window.addEventListener('mousemove', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('click', dismiss, { once: true });
    return () => {
      window.removeEventListener('mousemove', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('click', dismiss);
    };
  }, [inactivityWarning]);

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/'); return; }
    if (userData && !userData.coupleId) { router.replace('/onboarding'); return; }
  }, [user, userData, loading, router]);

  // Real-time couple data listener — updates instantly when partner joins
  useEffect(() => {
    if (!userData?.coupleId) return;

    const unsub = onSnapshot(doc(db, 'couples', userData.coupleId), (snap) => {
      if (snap.exists()) {
        const newData = { id: snap.id, ...snap.data() };
        
        // --- THINKING OF YOU NOTIFICATION ---
        const partnerId = newData.members?.find(m => m !== user?.uid);
        if (partnerId) {
          const partnerCount = newData.thinkingOfYou?.[partnerId] || 0;
          setLastPartnerHeartCount(prev => {
            if (prev > 0 && partnerCount > prev) {
              const partnerName = newData.memberNames?.[partnerId] || 'Your partner';
              showToast(`❤️ ${partnerName} is thinking of you!`, 'success');
            }
            return partnerCount;
          });
        }
        // ------------------------------------

        setCoupleData(prev => {
          // If partner just joined (members went from 1 → 2), show a toast
          if (prev && prev.members?.length === 1 && newData.members?.length === 2) {
            const partnerId = newData.members.find(m => m !== user?.uid);
            const partnerName = newData.memberNames?.[partnerId] || 'Your partner';
            showToast(`🎉 ${partnerName} just joined!`, 'success');
          }
          return newData;
        });
      }
    });

    return () => unsub();
  }, [userData?.coupleId]);
  
  // Real-time partner profile listener
  useEffect(() => {
    if (!user?.uid || !coupleData?.members) return;
    const partnerId = coupleData.members.find(m => m !== user.uid);
    if (!partnerId) {
      setPartnerData(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', partnerId), (snap) => {
      if (snap.exists()) {
        setPartnerData({ id: snap.id, ...snap.data() });
      } else {
        setPartnerData(null);
      }
    });

    return () => unsub();
  }, [user?.uid, coupleData?.members]);


  // Real-time activities subscription
  // NOTE: No orderBy here — composite index not deployed yet.
  // We sort client-side so the query works without any Firestore indexes.
  useEffect(() => {
    if (!userData?.coupleId) return;

    const q = query(
      collection(db, 'activities'),
      where('coupleId', '==', userData.coupleId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const acts = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        // Sort newest first client-side
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      setActivities(acts);
      setDataLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setDataLoading(false);
    });

    return () => unsub();
  }, [userData?.coupleId]);

  // Ensure we don't return early before hooks run!

  // === Derived Stats ===
  // Each user's 'today' is their OWN timezone — correct for long-distance couples
  const myTimezone  = userData?.timezone  || null;
  const partnerId   = coupleData?.members?.find(m => m !== user?.uid);

  // Determine partner's timezone from their stored activity data or coupleData
  // We look at the most recent partner activity's recorded timezone
  const partnerActivity = activities.find(a => a.userId === partnerId);
  const partnerTimezone = partnerActivity?.userTimezone || null;
  const partnerToday    = getTodayInTimezone(partnerTimezone);

  const myTodayActivities      = activities.filter(a => a.userId === user?.uid   && a.date === myToday);
  const partnerTodayActivities = activities.filter(a => a.userId === partnerId  && a.date === partnerToday);
  // Combined 'today' = union of both partners' today activities
  const todayActivities = [...myTodayActivities, ...partnerTodayActivities];

  const myTodayMinutes      = myTodayActivities.reduce((s, a) => s + a.duration, 0);
  const partnerTodayMinutes = partnerTodayActivities.reduce((s, a) => s + a.duration, 0);
  const combinedTodayMinutes = myTodayMinutes + partnerTodayMinutes;

  const myStreak = calculateStreak(activities, user?.uid, myTimezone);

  // Partner info
  const partnerName     = partnerId ? (coupleData?.memberNames?.[partnerId]  || 'Partner') : 'Partner';
  const partnerColor    = partnerId ? (coupleData?.memberColors?.[partnerId] || 'coral')   : 'coral';
  const partnerColorHex = partnerColor === 'coral' ? '#ff6b6b' : '#00d4ff';
  const myColorHex      = userData?.color === 'coral' ? '#ff6b6b' : '#00d4ff';

  // Week stats — use each person's timezone so their 7-day window is correct
  const myLast7Days      = getLastNDatesInTimezone(7, myTimezone);
  const partnerLast7Days = getLastNDatesInTimezone(7, partnerTimezone);
  const myWeekActivities      = activities.filter(a => a.userId === user?.uid  && myLast7Days.includes(a.date));
  const partnerWeekActivities = activities.filter(a => a.userId === partnerId && partnerLast7Days.includes(a.date));
  const weekActivities   = [...myWeekActivities, ...partnerWeekActivities];
  const myWeekMinutes      = myWeekActivities.reduce((s, a) => s + a.duration, 0);
  const partnerWeekMinutes = partnerWeekActivities.reduce((s, a) => s + a.duration, 0);
  // All last-7-days dates combined for chart
  const last7Days = [...new Set([...myLast7Days, ...partnerLast7Days])];

  // --- WEEKLY GOAL & CONFETTI ---
  const customWeeklyGoalHours = coupleData?.customWeeklyGoal || 20; // Default 20 hours
  const customWeeklyGoalMinutes = customWeeklyGoalHours * 60;
  const combinedWeekMinutes = myWeekMinutes + partnerWeekMinutes;

  useEffect(() => {
    // Drop confetti if they hit or passed the goal this week
    if (combinedWeekMinutes >= customWeeklyGoalMinutes && combinedWeekMinutes > 0 && !showConfetti) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 8000); // 8 sec of confetti
      return () => clearTimeout(timer);
    }
  }, [combinedWeekMinutes, customWeeklyGoalMinutes, showConfetti]);

  const handleSaveGoal = async (hours) => {
    try {
      await updateDoc(doc(db, 'couples', userData.coupleId), {
        customWeeklyGoal: hours
      });
      showToast(`Goal updated to ${hours} hours!`, 'success');
    } catch (err) {
      console.error('Error saving weekly goal:', err);
    }
  };

  const handleThinkingOfYou = async () => {
    if (!user?.uid || !userData?.coupleId) return;
    try {
      await updateDoc(doc(db, 'couples', userData.coupleId), {
        [`thinkingOfYou.${user.uid}`]: increment(1)
      });
      showToast('Sent a heart! ❤️', 'success');
    } catch (err) {
      console.error('Failed to send heart:', err);
    }
  };

  // Type breakdown for today
  const todayBreakdown = getTypeBreakdown(todayActivities);

  // Tab-filtered activities for feed
  const feedActivities = activeTab === 'today'
    ? todayActivities
    : activeTab === 'week'
    ? weekActivities
    : activities;

  // Celebration: both logged 4h+ today
  const isCelebrating = myTodayMinutes >= 240 && partnerTodayMinutes >= 240;

  const colorMap = {};
  const nameMap = {};
  if (coupleData) {
    coupleData.members.forEach(uid => {
      colorMap[uid] = coupleData.memberColors?.[uid] || 'cyan';
      nameMap[uid] = coupleData.memberNames?.[uid] || 'User';
    });
  }

  if (loading || !user || !userData) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="aurora-container"><div className="aurora-blob aurora-1" /><div className="aurora-blob aurora-2" /></div>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading your bond...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Aurora */}
      <div className="aurora-container">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
      </div>

      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          colors={[myColorHex, partnerColorHex, '#FFD700', '#ffffff']}
          recycle={false}
          numberOfPieces={500}
          gravity={0.15}
          style={{ zIndex: 100 }}
        />
      )}

      <Navbar userData={userData} coupleData={coupleData} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 20px 100px' }}>

        {/* === TOP HERO SECTION === */}
        <div className="animate-fade-up" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="heading-xl" style={{ fontSize: 'clamp(26px, 5vw, 38px)', marginBottom: '8px' }}>
                Hey, {userData.displayName?.split(' ')[0]} 👋
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                {format(new Date(myToday + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {myStreak > 0 && (
                <div className="badge badge-gold" style={{ fontSize: '13px', padding: '8px 14px' }}>
                  <span className="flame-icon">🔥</span>
                  {myStreak} day streak
                </div>
              )}
              {isCelebrating && (
                <div className="badge badge-gold" style={{ fontSize: '13px', padding: '8px 14px' }}>
                  🎉 Both crushed it today!
                </div>
              )}
              {coupleData?.members.length === 1 && (
                <div className="badge" style={{ background: 'rgba(255,209,102,0.1)', color: 'var(--gold)', border: '1px solid rgba(255,209,102,0.25)', fontSize: '12px', padding: '8px 14px' }}>
                  ⏳ Waiting for partner · Code: {coupleData.inviteCode}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === PROGRESS RINGS + COMBINED STAT === */}
        <div
          className="glass animate-fade-up animate-fade-up-delay-1 flex flex-col lg:flex-row items-center justify-around gap-8 lg:gap-4 mb-5 p-7"
          style={{ borderRadius: '24px' }}
        >
          {/* My ring */}
          <ProgressRing
            value={myTodayMinutes}
            max={DAILY_GOAL_MINUTES}
            size={130}
            strokeWidth={10}
            color={myColorHex}
            label={userData.displayName?.split(' ')[0] || 'You'}
            sublabel="today"
            emoji=""
          />

          {/* Center - combined */}
          <div style={{ flex: 1, textAlign: 'center', minWidth: '140px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif' }}>
                Together This Week
              </div>
              <button 
                onClick={() => setGoalModalOpen(true)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', opacity: 0.6, transition: 'opacity 0.2s', fontSize: '14px' }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1} 
                onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                title="Set Weekly Goal"
              >
                ✏️
              </button>
            </div>
            <div className="stat-number" style={{ fontSize: 'clamp(32px, 6vw, 52px)', color: combinedWeekMinutes > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
              {combinedWeekMinutes > 0 ? formatDuration(combinedWeekMinutes) : '—'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {combinedWeekMinutes > 0
                ? `${Math.round(combinedWeekMinutes / customWeeklyGoalMinutes * 100)}% of goal (${customWeeklyGoalHours}h)`
                : `Log your first activity! Goal: ${customWeeklyGoalHours}h`}
            </div>

            {/* Mini progress bar */}
            <div style={{ width: '80%', margin: '14px auto 0', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(combinedWeekMinutes / customWeeklyGoalMinutes * 100, 100)}%`,
                background: `linear-gradient(90deg, ${myColorHex}, ${partnerColorHex})`,
                borderRadius: '100px',
                transition: 'width 1s ease',
              }} />
            </div>
          </div>

          {/* Partner ring */}
          <ProgressRing
            value={partnerTodayMinutes}
            max={DAILY_GOAL_MINUTES}
            size={130}
            strokeWidth={10}
            color={partnerColorHex}
            label={partnerName?.split(' ')[0] || 'Partner'}
            sublabel="today"
          />
        </div>

        {/* === WEEKLY STATS ROW === */}
        <div
          className="animate-fade-up animate-fade-up-delay-2 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5"
        >
          {[
            {
              label: 'My This Week',
              value: formatDuration(myWeekMinutes),
              sublabel: `${weekActivities.filter(a => a.userId === user.uid).length} sessions`,
              color: myColorHex,
              icon: '📈',
            },
            {
              label: `${partnerName?.split(' ')[0]}'s Week`,
              value: formatDuration(partnerWeekMinutes),
              sublabel: `${weekActivities.filter(a => a.userId !== user.uid).length} sessions`,
              color: partnerColorHex,
              icon: '📊',
            },
            {
              label: 'Combined Week',
              value: formatDuration(myWeekMinutes + partnerWeekMinutes),
              sublabel: `${weekActivities.length} total sessions`,
              color: 'var(--gold)',
              icon: '⚡',
            },
            {
              label: 'My Streak',
              value: `${myStreak} days`,
              sublabel: myStreak > 0 ? 'Keep going!' : 'Start today',
              color: myStreak > 0 ? 'var(--gold)' : 'var(--text-muted)',
              icon: '🔥',
            },
          ].map((stat, i) => (
            <div key={i} className="glass glass-hover" style={{ borderRadius: '18px', padding: '18px' }}>
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>{stat.icon}</div>
              <div className="stat-number" style={{ fontSize: '22px', color: stat.color, marginBottom: '4px' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', fontFamily: 'Syne, sans-serif', marginBottom: '2px' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {stat.sublabel}
              </div>
            </div>
          ))}
        </div>

        {/* === BOTTOM GRID: Feed + Chart === */}
        <div className="animate-fade-up animate-fade-up-delay-3 flex flex-col lg:grid lg:grid-cols-[1.5fr_1fr] gap-5 items-start">

          {/* Activity Feed */}
          <div className="glass" style={{ borderRadius: '24px', padding: '24px' }}>
            {/* Tab row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 className="font-display" style={{ fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>
                  Relationship Pulse
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Fresh logs from your shared journey.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleThinkingOfYou}
                  style={{
                    height: '42px',
                    padding: '0 18px',
                    borderRadius: '100px',
                    background: 'rgba(255,107,107,0.1)',
                    border: '1px solid rgba(255,107,107,0.25)',
                    color: '#ff6b6b',
                    fontSize: '13px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,107,107,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,107,107,0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Thinking of you</span>
                  <span style={{ fontSize: '16px' }}>❤️</span>
                </button>
                <button
                  onClick={() => setLogModalOpen(true)}
                  className="btn-primary"
                  style={{ height: '42px', padding: '0 20px', borderRadius: '100px', fontSize: '13px' }}
                >
                  Log Activity +
                </button>
              </div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                {['today', 'week', 'all'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'Syne, sans-serif',
                      cursor: 'pointer',
                      background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {dataLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : (
              <ActivityFeed
                activities={feedActivities}
                currentUserId={user.uid}
                limit={15}
              />
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Weekly chart */}
            <div className="glass" style={{ borderRadius: '24px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 className="font-display" style={{ fontWeight: 700, fontSize: '16px' }}>
                  7-Day Overview
                </h2>
                <button
                  onClick={() => setGoalModalOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  Set Goal
                </button>
              </div>
              {coupleData ? (
                <WeeklyChart
                  activities={activities}
                  memberColors={colorMap}
                  memberNames={nameMap}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading chart...
                </div>
              )}
            </div>

            {/* Today's Activity Breakdown */}
            {todayBreakdown.length > 0 && (
              <div className="glass" style={{ borderRadius: '24px', padding: '24px' }}>
                <h2 className="font-display" style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
                  Today's Mix
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {todayBreakdown.map(([type, mins]) => {
                    const meta = TYPE_META[type] || TYPE_META.other;
                    const pct = Math.round((mins / combinedTodayMinutes) * 100);
                    return (
                      <div key={type}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                            <span>{meta.emoji}</span>
                            <span>{meta.label}</span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                            {formatDuration(mins)} · {pct}%
                          </span>
                        </div>
                        <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: meta.color,
                            borderRadius: '100px',
                            transition: 'width 1s ease',
                            boxShadow: `0 0 6px ${meta.color}60`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Partner status */}
            <div className="glass" style={{ borderRadius: '24px', padding: '24px' }}>
              <h2 className="font-display" style={{ fontWeight: 700, fontSize: '16px', marginBottom: '14px' }}>
                Partner Status
              </h2>
              {coupleData?.members?.length === 1 ? (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Invite your partner to start tracking together!
                  </p>
                  <div style={{
                    background: 'rgba(0,212,255,0.06)',
                    border: '1px solid rgba(0,212,255,0.2)',
                    borderRadius: '12px',
                    padding: '14px',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '6px' }}>
                      INVITE CODE
                    </p>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '20px', letterSpacing: '0.25em', color: 'var(--cyan)', marginBottom: '10px' }}>
                      {coupleData.inviteCode}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(coupleData.inviteCode); showToast('Code copied!'); }}
                      className="btn-ghost"
                      style={{ fontSize: '12px', padding: '8px 16px', width: '100%' }}
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: partnerColorHex,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#000',
                      boxShadow: `0 0 12px ${partnerColorHex}60`,
                      flexShrink: 0,
                    }}>
                      {(partnerName || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>
                        {partnerName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(() => {
                          const lastActive = partnerData?.lastActive;
                          let isOnline = false;
                          let lastActiveTime = 0;
                          
                          if (lastActive) {
                            lastActiveTime = lastActive?.toMillis 
                              ? lastActive.toMillis() 
                              : (lastActive?.seconds ? lastActive.seconds * 1000 : new Date(lastActive).getTime());
                            isOnline = (now - lastActiveTime) < 180000; // 3 mins threshold
                          }
                          
                          return (
                            <>
                              <div style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: isOnline ? '#00ff88' : '#666',
                                boxShadow: isOnline ? '0 0 8px #00ff8880' : 'none',
                                animation: isOnline ? 'pulse 2s infinite' : 'none',
                                flexShrink: 0
                              }} />
                              <span>
                                {isOnline ? 'Online' : (lastActiveTime > 0 ? `Seen ${formatDistanceToNow(lastActiveTime)} ago` : 'Offline')}
                              </span>
                              <span>·</span>
                              <span>{formatDuration(partnerTodayMinutes)} today</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Partner's today summary */}
                  {partnerTodayActivities.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {partnerTodayActivities.slice(0, 3).map((a, i) => {
                        const meta = TYPE_META[a.type] || TYPE_META.other;
                        return (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}>
                            <span style={{ fontSize: '14px' }}>{meta.emoji}</span>
                            <span style={{ fontSize: '13px', flex: 1 }}>{meta.label}</span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: partnerColorHex, fontFamily: 'Syne, sans-serif' }}>
                              {formatDuration(a.duration)}
                            </span>
                          </div>
                        );
                      })}
                      {partnerTodayActivities.length > 3 && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                          +{partnerTodayActivities.length - 3} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(255,255,255,0.06)',
                    }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Hasn't logged today yet 💤
                      </p>
                      {partnerId && (
                        <button
                          onClick={handleNudgePartner}
                          style={{
                            marginTop: '12px',
                            padding: '6px 14px',
                            borderRadius: '100px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'var(--text)',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Syne, sans-serif',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                          Nudge Partner 👀
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* === VISUAL INSIGHTS SECTION === */}
      <section style={{
        maxWidth: '1200px',
        margin: '0 auto 60px',
        padding: '0 20px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 800, 
            letterSpacing: '-0.02em',
            fontFamily: 'Syne, sans-serif',
            color: 'var(--text)',
            opacity: 0.8
          }}>
            Relationship Insights
          </h2>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
        }}>
          {/* Top Activities Pie Chart */}
          <div style={{ minHeight: '400px' }}>
            <ActivityPieChart activities={activities} />
          </div>

          {/* Monthly Heatmap */}
          <div style={{ minHeight: '400px' }}>
            <ActivityCalendar 
              activities={activities} 
              userColor={userData?.color} 
              partnerColor={partnerData?.color} 
            />
          </div>

          {/* Timezone Overlap */}
          <div style={{ minHeight: '400px' }}>
            <TimezoneOverlap 
              myTimezone={userData?.timezone} 
              partnerTimezone={partnerData?.timezone} 
              partnerName={partnerData?.displayName || 'Partner'} 
            />
          </div>
        </div>
      </section>

      {/* === DEBUG DATA PILL === */}
      <div style={{
        margin: '0 auto 40px',
        padding: '12px 20px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        maxWidth: '600px',
        textAlign: 'center',
        fontFamily: 'monospace',
        fontSize: '11px',
        color: 'var(--text-muted)'
      }}>
        <strong>Diagnostic Data:</strong> Your saved activity dates are: <br/>
        <span style={{ color: 'var(--cyan)' }}>
          {Array.from(new Set(activities.filter(a => a.userId === user.uid).map(a => a.date))).sort().join(' , ') || 'None'}
        </span>
        <br/>
        (If there is only one date here, your streak is mathematically 1 Day!)
      </div>

      {/* === FAB === */}
      <button
        className="fab"
        onClick={() => setLogModalOpen(true)}
        title="Log Activity"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* === LOG MODAL === */}
      {logModalOpen && (
        <LogModal
          user={user}
          userData={userData}
          coupleData={coupleData}
          today={myToday}
          onClose={() => setLogModalOpen(false)}
          onLogged={() => showToast('Activity logged! 🎉')}
        />
      )}

      {/* === TOAST === */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}

      {/* === INACTIVITY WARNING BANNER === */}
      {inactivityWarning && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 160, 60, 0.12)',
          border: '1px solid rgba(255, 160, 60, 0.4)',
          borderRadius: '16px',
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'fadeUp 0.3s ease',
          maxWidth: '90vw',
        }}>
          <span style={{ fontSize: '20px' }}>⏰</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffa03c', fontFamily: 'Syne, sans-serif' }}>
              Still there? You'll be signed out in {countdown}s
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,160,60,0.7)', marginTop: '2px' }}>
              Move your mouse or press any key to stay signed in.
            </div>
          </div>
        </div>
      )}

      {/* === GOAL MODAL === */}
      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        currentGoal={customWeeklyGoalHours}
        onSave={handleSaveGoal}
      />
    </div>
  );
}
