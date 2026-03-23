# 💜 Bond Tracker

A sleek, aesthetic couples productivity tracker built with **Next.js 14** and **Firebase**.  
Log your daily activities, track each other's progress, and grow together — privately, beautifully.

---

## ✨ Features

- **Couple-only privacy** — only you and your partner see each other's data
- **Real-time sync** — activities appear instantly across both devices
- **Daily Wind-Down Check-In** — evening prompt to rate your day, set a mood emoji, and leave a love note
- **Relationship Data Export** — download your entire history as a CSV or a beautiful PDF report
- **Timezone Intelligence** — accurate "today" and streak tracking for long-distance partners
- **Responsive Mobile Layout** — seamless experience on phones with adaptive fluid grids and modals
- **Daily progress rings** — animated circular trackers for each partner
- **7-day bar chart** — side-by-side weekly overview
- **Activity types** — Work, Exercise, Learning, Creative, Self-care, Social, Chores, Other
- **Duration slider** — log 15 min → 8 hrs with a smooth slider
- **Streak counter** — 🔥 tracks your daily consistency
- **Partner status panel** — see what your partner logged today
- **Today's mix breakdown** — percentage bars per activity category
- **Invite system** — share an 8-character code to connect couples
- **Multiple couples supported** — each couple only sees their own data
- **Nudges** — instantly ping your partner with an FCM push notification and toast

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Enable **Firestore Database** → Start in production mode
5. Go to **Project Settings** → **General** → scroll to **Your apps** → Add a **Web app**
6. Copy the config values

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your Firebase values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Deploy Firestore rules & indexes

Install Firebase CLI if you haven't:
```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
```

Deploy rules and indexes (this is required for Check-ins and Export!):
```bash
firebase deploy --only firestore
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure

```
bond-tracker/
├── app/
│   ├── globals.css          # Design system — aurora, glass, buttons
│   ├── layout.js            # Root layout + Google Fonts + Viewport Ext
│   ├── page.js              # Auth page (Login / Sign Up)
│   ├── onboarding/
│   │   └── page.js          # Create or join a couple
│   └── dashboard/
│       └── page.js          # Main dashboard (real-time)
├── components/
│   ├── Navbar.jsx            # Top nav + Export Tools
│   ├── ProgressRing.jsx      # Animated SVG ring for daily goal
│   ├── ActivityFeed.jsx      # Scrollable activity list
│   ├── WeeklyChart.jsx       # Recharts bar chart (7 days)
│   ├── LogModal.jsx          # Bottom-sheet activity logger
│   ├── WindDownModal.jsx     # Evening check-in form
│   └── WindDownBanner.jsx    # Unread partner check-in display
├── hooks/
│   ├── useAuth.js            # Firebase auth + user data hook
│   └── useTodayDate.js       # Timezone-aware date calculations
├── lib/
│   ├── firebase.js           # Firebase app API initialization
│   └── exportUtils.js        # CSV & PDF generation logic
├── firestore.rules           # Security rules (couple-scoped & checkins)
├── firestore.indexes.json    # Composite indexes for queries
├── firebase.json             # Firebase project config
├── .env.local.example        # Environment variable template
└── README.md
```

---

## 🔐 How Privacy Works

Each couple gets a unique `coupleId`. All activities include this ID.  
Firestore security rules ensure:

- Users can only read/write **their own** user profile
- Couple documents can only be read/updated by **current members**
- Activities and Check-ins are only readable by members of the **same couple**
- No cross-couple data leakage — even if 100 couples use the app

---

## 🎨 Design System

| Token         | Value              | Use                        |
|---------------|--------------------|----------------------------|
| `--cyan`      | `#00d4ff`          | Primary partner color       |
| `--coral`     | `#ff6b6b`          | Secondary partner color     |
| `--gold`      | `#ffd166`          | Streak / celebration        |
| `--bg`        | `#030308`          | Page background             |
| `--card`      | `#0f0f1e`          | Glass card base             |
| Font Display  | Syne 700–800       | Headings, numbers, labels   |
| Font Body     | Manrope 400–600    | Paragraphs, inputs, UI      |

---

## 🌐 Deploying to Vercel

```bash
# Push to GitHub, then import in Vercel dashboard
# Add all NEXT_PUBLIC_FIREBASE_* environment variables in Vercel settings
# Deploy!
```

Or with CLI:
```bash
npm i -g vercel
vercel --prod
```

---

## 📦 Tech Stack

| Layer      | Tech                        |
|------------|-----------------------------|
| Framework  | Next.js 14 (App Router)     |
| Auth & DB  | Firebase v10 (Auth + Firestore) |
| Charts     | Recharts                    |
| Styling    | Tailwind CSS + custom CSS   |
| Icons      | Lucide React + inline SVG   |
| Fonts      | Google Fonts (Syne, Manrope)|
| Deploy     | Vercel (recommended)        |

---

## 💡 Tips

- The **first person** to create a couple gets **cyan** color
- The **partner who joins** gets **coral** color
- The invite code is **8 characters**, alphanumeric
- Daily goal is set to **4 hours (240 min)** — you can change `DAILY_GOAL_MINUTES` in `dashboard/page.js`
- The streak counts days where you logged **any** activity

---

Made with 💙🧡 for couples who grow together.
