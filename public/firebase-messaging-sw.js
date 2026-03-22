importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Use your Firebase config here
// Note: In public/ script, we can't use process.env easy, so usually we hardcode or template.
// But for now, I'll put placeholders that they can fill if needed, or I'll try to automate.
firebase.initializeApp({
  apiKey: "AIzaSyABQ0qSiCa4Riwlkt2oCJ7fxWrhmj_HK9w",
  authDomain: "astralbond.firebaseapp.com",
  projectId: "astralbond",
  storageBucket: "astralbond.firebasestorage.app",
  messagingSenderId: "839077496069",
  appId: "1:839077496069:web:5d1dbef19aaadb2971a36c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo.png', // Fallback icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
