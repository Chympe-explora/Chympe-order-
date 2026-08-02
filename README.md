# Krem Chympe Waterfall — Food Ordering System

A mobile-first PWA food ordering system: customers browse the menu, order
ahead as guests, get real-time order status, and pay by UPI/QR/bank
transfer with receipt upload. Restaurant staff manage everything from a
live dashboard. A hidden super admin page edits site content, payment
settings, and can reset the staff password.

## Why Firebase instead of Node/Express

GitHub Pages (and most simple static hosts) only serve static files — they
cannot run a Node.js/Express server. To keep this genuinely deployable
from a GitHub repo while still having a real backend, database, auth, and
push notifications, this build uses **Firebase** (Firestore + Auth +
Storage + Cloud Functions + Cloud Messaging) instead of a custom
Node/Express API. Every page here is static HTML/JS that talks to
Firebase directly from the browser — no server to host or maintain.

If you specifically need a custom Node/Express backend, you'd deploy that
part separately (e.g. Render, Railway, Fly.io) and host only the frontend
on GitHub Pages — but for this use case Firebase covers the same ground
with far less to maintain.

## What's included

| File | Purpose |
|---|---|
| `index.html` | Customer home — browse, search, cart, checkout |
| `order.html` | Live order tracking, payment, correction requests |
| `staff-login.html` | Restaurant staff login |
| `staff-dashboard.html` | Live orders, menu management, sales reports |
| `admin-11a24a22.html` | Hidden super admin — site content, payment settings, password reset |
| `firebase-init.js` | Shared Firebase config (**you must edit this**) |
| `manifest.json`, `service-worker.js`, `icons/` | PWA install + push support |
| `firestore.rules`, `storage.rules` | Security rules |
| `functions/` | Cloud Functions (password reset, push notifications) |
| `firebase.json` | Hosting/Firestore/Storage/Functions config for the Firebase CLI |

## One-time setup

### 1. Firebase project
In the [Firebase console](https://console.firebase.google.com), for your
project enable:
- **Authentication** → Sign-in method → Email/Password
- **Firestore Database** → Create database (production mode)
- **Storage** → Get started
- **Cloud Messaging** → note the **Web Push certificate (VAPID key)** under
  Project settings → Cloud Messaging

Then Project settings → General → "Your apps" → add a **Web app**, and
copy the `firebaseConfig` object.

### 2. Fill in your config
Edit **`firebase-init.js`**: paste your `firebaseConfig` values and your
VAPID key.

Edit **`service-worker.js`**: paste the *same* `firebaseConfig` values
into the `firebase.initializeApp({...})` block near the bottom (service
workers can't import the shared module, so the config is duplicated
there — keep both in sync).

### 3. Create your two staff accounts
Authentication → Users → Add user, twice:
- `staff@krem-chympe.local` — the restaurant's shared login (give this
  password to whoever runs the counter)
- `superadmin@krem-chympe.local` — your own private super admin login

(You can use real email addresses instead if you prefer — just update
`RESTAURANT_LOGIN_EMAIL` in `firebase-init.js` and `ADMIN_EMAIL` in
`admin-11a24a22.html` / `functions/index.js` to match.)

### 4. Deploy Firestore/Storage rules and Cloud Functions
Install the Firebase CLI once: `npm install -g firebase-tools`

```bash
firebase login
firebase use --add          # pick your project
firebase deploy --only firestore:rules,storage,functions
```

Cloud Functions require the **Blaze (pay-as-you-go)** plan — it has a
generous free tier, but a billing method must be on file.

### 5. Add your first menu items
Log into `staff-dashboard.html` (or `admin-11a24a22.html`) → Menu tab →
add a category (e.g. "Snacks", "Meals", "Drinks") and a few dishes. There
is no seed script — this is the intended way to populate the menu.

### 6. Set your payment details
Open `admin-11a24a22.html` → Payment Settings → add your UPI ID, upload a
QR code image, and/or add bank transfer details. These show to customers
once the restaurant accepts their order.

## Deploying to GitHub Pages

1. Push this folder to a GitHub repository.
2. Repo → Settings → Pages → Deploy from a branch → pick `main` and `/ (root)`.
3. Your site will be live at `https://<username>.github.io/<repo>/`.
4. **Rename the secret admin URL** before going live: rename
   `admin-11a24a22.html` to your own random string
   (e.g. `admin-9f2c7d41ab.html`) so it isn't guessable, and update any
   bookmarks accordingly. Nothing in the app links to it — that's
   intentional, it's meant to be reached only via direct URL.

GitHub Pages serves everything over HTTPS automatically, which satisfies
the "Secure HTTPS" requirement and is required for PWA installability and
push notifications to work.

## How the order flow works

`pending_restaurant → accepted / rejected / changes_requested → payment_pending (customer picks a method + uploads receipt) → payment_uploaded → payment_verified → preparing → ready → completed` (or `cancelled` at any point). Everything updates live on both the customer's `order.html` and the staff dashboard via Firestore real-time listeners — no manual refresh needed.

## Known simplifications (read before assuming 100% parity with the original spec)

- **Security rules are a solid starting point, not bulletproof.** Guests
  write directly to Firestore (no server mediates every write), which is
  necessary for a serverless static-hosting architecture. The rules in
  `firestore.rules` restrict what a guest can change (they can't alter
  totals or item lists after creation, for example), but a determined
  attacker with browser dev tools has more surface than they would with a
  server-validated API. For a small single-location ordering app this is
  a reasonable trade-off; if you later need stricter guarantees, route
  writes through Cloud Functions instead of direct client writes.
- **Push notifications** need the Blaze plan and a real VAPID key/config
  to work end-to-end; until you fill those in, the apps still work fully
  via in-app real-time updates, just without lock-screen push alerts.
- **"Edit every heading/button/section" for the super admin** is
  implemented for the customer-facing header text, pickup notice, menu,
  and payment settings — the highest-value editable content. A fully
  generic visual page-builder (drag-and-drop sections, arbitrary new
  sections) is a much larger project on its own; extending
  `content/site` fields and reading them in `index.html` is the pattern
  to follow if you want to make more text editable.
- **Analytics/exports** cover daily/weekly/monthly revenue totals and a
  CSV export of all orders. Deeper analytics (charts, cohort analysis)
  aren't included.
- Rate limiting and automated backups are best configured at the Firebase
  project level (Firestore has built-in backup/export tools; App Check
  can add abuse protection) rather than in application code — see
  Firebase's documentation for enabling these for your project.
