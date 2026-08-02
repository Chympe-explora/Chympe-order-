// Service worker: app-shell caching for installability/offline fallback,
// plus Firebase Cloud Messaging background push handling.

const CACHE_NAME = "krem-chympe-v1";
const APP_SHELL = [
  "./index.html",
  "./order.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for Firestore/Firebase calls (never cache live data),
  // cache-first fallback for the static app shell only.
  if (event.request.method !== "GET") return;
  const url = event.request.url;
  if (url.includes("googleapis.com") || url.includes("firebaseio.com") || url.includes("firestore")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => cached)
      );
    })
  );
});

// ---- Firebase Cloud Messaging (background notifications) ----
// Requires firebase-messaging-sw compat script + your config so the
// service worker (which runs with no access to ES module imports from
// the page) can decode background push payloads.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// NOTE: keep this config in sync with firebase-init.js
firebase.initializeApp({
  apiKey: "AIzaSyDbOBVeuvVqdhVoe8KNm3KZFdhL3XrwOCU",
  authDomain: "chympe-order.firebaseapp.com",
  projectId: "chympe-order",
  storageBucket: "chympe-order.firebasestorage.app",
  messagingSenderId: "1050322285326",
  appId: "1:1050322285326:web:27ba64c29990610350dd5f"
});

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || "Krem Chympe Waterfall";
    const options = {
      body: (payload.notification && payload.notification.body) || "You have a new update.",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      vibrate: [200, 100, 200]
    };
    self.registration.showNotification(title, options);
  });
} catch (e) {
  // Messaging not configured yet — safe to ignore until firebaseConfig is filled in.
}
