'use client';

import { X, Heart, MessageCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState } from 'react';

export default function WindDownBanner({ checkin, partnerName }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!checkin || !isVisible) return null;

  const handleDismiss = async () => {
    try {
      // Mark as seen in Firestore
      const docRef = doc(db, 'checkins', checkin.id);
      await updateDoc(docRef, { seenByPartner: true });
      setIsVisible(false);
    } catch (err) {
      console.error('Failed to dismiss checkin:', err);
      setIsVisible(false); // Hide locally anyway
    }
  };

  return (
    <div className="mb-8 relative overflow-hidden group">
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative bg-[#0f172a]/80 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-start gap-4 shadow-xl">
        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl">
          {checkin.moodEmoji}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest">Nightly Note</span>
            <span className="text-white/20">•</span>
            <span className="text-sm text-white/40">{partnerName}'s reflection</span>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Heart 
                  key={star} 
                  size={14} 
                  className={star <= checkin.rating ? 'fill-indigo-500 text-indigo-500' : 'text-white/10'} 
                />
              ))}
            </div>
          </div>

          {checkin.message ? (
            <p className="text-white/80 italic leading-relaxed">
              "{checkin.message}"
            </p>
          ) : (
            <p className="text-white/40 italic">
              Left a {checkin.rating}/5 rating and felt {checkin.moodEmoji}
            </p>
          )}
        </div>

        <button 
          onClick={handleDismiss}
          className="flex-shrink-0 p-2 text-white/20 hover:text-white/60 hover:bg-white/5 rounded-full transition-all"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
