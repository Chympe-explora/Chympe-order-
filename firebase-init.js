// ============================================================
// FIREBASE INITIALIZATION — Krem Chympe Waterfall Food Ordering
// ============================================================
// 1. Go to https://console.firebase.google.com -> your project
//    -> Project settings -> General -> "Your apps" -> Web app.
// 2. Copy the firebaseConfig object shown there and paste it below,
//    replacing the placeholder values.
// 3. Enable in the Firebase console:
//      - Authentication -> Sign-in method -> Email/Password
//      - Firestore Database (production mode)
//      - Storage
//      - Cloud Messaging (for push notifications)
// 4. Create the restaurant staff login user:
//      Authentication -> Users -> Add user
//      email:    staff@krem-chympe.local
//      password: (choose a strong password, give it to restaurant staff)
// 5. Create the super admin user (separate account):
//      Authentication -> Users -> Add user
//      email:    superadmin@krem-chympe.local
//      password: (choose a strong password, keep this private)
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

export const RESTAURANT_LOGIN_EMAIL = "staff@krem-chympe.local";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const firebaseApp = app;
export { firebaseConfig };
