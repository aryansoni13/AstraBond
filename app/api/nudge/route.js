import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (!serviceAccount.project_id) {
      console.error('FIREBASE_SERVICE_ACCOUNT is missing or invalid in environment variables.');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

export async function POST(request) {
  try {
    const { token, senderName } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const message = {
      notification: {
        title: 'Nudge! 👀',
        body: `${senderName} is nudging you to log an activity!`,
      },
      token: token,
      webpush: {
        fcm_options: {
          link: '/dashboard'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
