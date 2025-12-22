import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// VAPID key for web push (from Firebase Console > Project Settings > Cloud Messaging)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize messaging (only in browser with service worker support)
let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.log('Firebase Messaging not supported:', e);
  }
}

// Check if running as installed PWA
export const isInstalledPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    throw new Error('Le notifiche non sono supportate su questo browser');
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  // Check if running as PWA on iOS
  if (isIOS && !isInstalledPWA()) {
    throw new Error('Su iPhone devi prima installare l\'app: Condividi → Aggiungi a Home, poi riapri l\'app dalla home screen');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  if (permission === 'denied') {
    throw new Error('Permesso notifiche negato. Vai in Impostazioni → Notifiche per abilitarle');
  }
  if (permission !== 'granted') {
    throw new Error('Permesso notifiche non concesso');
  }

  try {
    // Register service worker
    let registration;
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);
    } catch (swError) {
      console.error('SW registration error:', swError);
      throw new Error('Errore registrazione Service Worker: ' + swError.message);
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('Service Worker ready');

    // On iOS, FCM doesn't work well - use native Web Push subscription
    if (isIOS) {
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
        });
        console.log('iOS Push subscription:', subscription);
        // Return the full subscription as JSON string (will be parsed on backend)
        return JSON.stringify({
          type: 'webpush',
          subscription: subscription.toJSON()
        });
      } catch (pushError) {
        console.error('iOS push subscription failed:', pushError);
        throw new Error('Errore attivazione notifiche iOS: ' + pushError.message);
      }
    }

    // For non-iOS, use FCM
    if (!messaging) {
      throw new Error('Firebase Messaging non disponibile');
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      throw new Error('Impossibile ottenere il token FCM');
    }

    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting notification token:', error);
    throw error;
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Listen for foreground messages
export const onForegroundMessage = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

export default app;
