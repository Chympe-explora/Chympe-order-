// ============================================================
// FIREBASE INITIALIZATION — Krem Chympe Waterfall Food Ordering
// ============================================================
// Everything below can be set up entirely from the Firebase console in a
// phone browser — no CLI, no computer required. See README.md for the
// full step-by-step.
//
// 1. Go to https://console.firebase.google.com -> your project
//    -> Project settings -> General -> "Your apps" -> Web app.
// 2. Copy the firebaseConfig object shown there and paste it below,
//    replacing the placeholder values.
// 3. Enable in the Firebase console:
//      - Authentication -> Sign-in method -> Email/Password
//      - Firestore Database (production mode)
//      - Storage
// 4. Create the restaurant staff login user — USE A REAL EMAIL YOU CAN
//    READ (not a fake @...local address). This lets the super admin send
//    a real "reset your password" email from the dashboard with no
//    server/Cloud Function needed:
//      Authentication -> Users -> Add user
//      email:    (a real inbox, e.g. your own Gmail)
//      password: (choose a strong password, give it to restaurant staff)
//    Then update RESTAURANT_LOGIN_EMAIL below to match.
// 5. Create the super admin user (a separate account, also a real email):
//      Authentication -> Users -> Add user
//      email:    (a real inbox only you check)
//      password: (choose a strong password, keep this private)
//    Then update ADMIN_EMAIL near the top of admin-11a24a22.html to match.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDbOBVeuvVqdhVoe8KNm3KZFdhL3XrwOCU",
  authDomain: "chympe-order.firebaseapp.com",
  projectId: "chympe-order",
  storageBucket: "chympe-order.firebasestorage.app",
  messagingSenderId: "1050322285326",
  appId: "1:1050322285326:web:27ba64c29990610350dd5f"
};

// Public web push key from Firebase console -> Project settings ->
// Cloud Messaging -> Web configuration -> Web Push certificates.
// (Not filled in yet — push notifications will silently no-op until you
// paste your VAPID key here. Everything else works without it.)
export const VAPID_KEY = "REPLACE_WITH_YOUR_VAPID_KEY";

// CHANGE THIS to the real email you created the staff Auth account with.
export const RESTAURANT_LOGIN_EMAIL = "REPLACE_WITH_YOUR_STAFF_EMAIL";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const firebaseApp = app;
export { firebaseConfig };
