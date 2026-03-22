'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = still loading
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userDocUnsub = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any previous user-doc listener
      if (userDocUnsub) {
        userDocUnsub();
        userDocUnsub = null;
      }

      if (firebaseUser) {
        setUser(firebaseUser);
        const docRef = doc(db, 'users', firebaseUser.uid);

        // Real-time listener on the user's own doc
        userDocUnsub = onSnapshot(docRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            // Create user doc if it doesn't exist yet
            const newUserData = {
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              email: firebaseUser.email,
              coupleId: null,
              color: null,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
              createdAt: new Date().toISOString(),
            };
            await setDoc(docRef, newUserData);
            setUserData(newUserData);
          }
          setLoading(false);
        }, (err) => {
          console.error('Error listening to user data:', err);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (userDocUnsub) userDocUnsub();
    };
  }, []);

  // refreshUserData kept for compatibility but onSnapshot makes it a no-op
  const refreshUserData = () => {};

  return { user, userData, loading, refreshUserData };
}
