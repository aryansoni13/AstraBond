'use client';

import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Heart, Star, Send, X, Smile, Frown, Meh, Trash2 } from 'lucide-react';

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🥳', label: 'Celebratory' },
  { emoji: '🫤', label: 'Meh' },
  { emoji: '😔', label: 'Sad' },
  { emoji: '🤯', label: 'Stressed' },
  { emoji: '🫠', label: 'Overwhelmed' },
];

export default function WindDownModal({ user, userData, today, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedMood, setSelectedMood] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please rate your day!');
      return;
    }
    if (!selectedMood) {
      setError('Please pick a mood emoji!');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, 'checkins'), {
        userId: user.uid,
        coupleId: userData.coupleId,
        date: today,
        rating,
        moodEmoji: selectedMood.emoji,
        message: message.trim(),
        seenByPartner: false,
        createdAt: new Date().toISOString(),
      });

      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      console.error('Check-in failed:', err);
      setError('Failed to save check-in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel max-w-md">
        
        {/* Header */}
        <div className="relative px-6 py-8 text-center bg-gradient-to-b from-indigo-500/10 to-transparent">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-4">
            <Smile size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">Daily Wind-Down</h2>
          <p className="text-white/60 mt-1">How was your day today?</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-8">
          
          {/* Rating */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/60 block text-center uppercase tracking-wider">
              Rate your day
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform active:scale-95"
                >
                  <Star 
                    size={36} 
                    className={`transition-colors duration-200 ${
                      (hoverRating || rating) >= star 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-white/10 fill-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Mood Picker */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-white/60 block text-center uppercase tracking-wider">
              Pick your mood
            </label>
            <div className="grid grid-cols-4 gap-3">
              {MOODS.map((mood) => (
                <button
                  key={mood.emoji}
                  type="button"
                  onClick={() => setSelectedMood(mood)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all ${
                    selectedMood?.emoji === mood.emoji
                      ? 'bg-indigo-500/20 border-indigo-500/50 scale-105'
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-[10px] text-white/40 font-medium uppercase">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/60 block uppercase tracking-wider">
              Leave a note (optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a note on the digital fridge..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-24 resize-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                <span>Save Reflection</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
