// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: 'AIzaSyAAiahypBPTGmGZ_q_F-BPKqm56XWsFDec',
  authDomain: 'culturaimmersiva-it.firebaseapp.com',
  projectId: 'culturaimmersiva-it',
  storageBucket: 'culturaimmersiva-it.firebasestorage.app',
  messagingSenderId: '449547817254',
  appId: '1:449547817254:web:20cb7da17aedd449f4b1e7'
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Nuovo messaggio WhatsApp';
  const notificationOptions = {
    body: payload.notification?.body || 'Hai ricevuto un nuovo messaggio',
    icon: '/images/icon-192.png?v=2',
    badge: '/images/icon-192.png?v=2',
    tag: 'whatsapp-message',
    renotify: true,
    requireInteraction: true,
    data: payload.data,
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'close', title: 'Chiudi' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  if (event.action === 'close') return;

  // Open or focus the WhatsApp dashboard
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes('/admin/whatsapp') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow('/admin/whatsapp');
      }
    })
  );
});

// Activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
