# Krem Chympe Waterfall — Food Ordering System

A mobile-first PWA food ordering system: customers browse the menu, order
ahead as guests, get real-time order status, and pay by UPI/QR/bank
transfer with receipt upload. Restaurant staff manage everything from a
live dashboard. A hidden super admin page edits site content, payment
settings, and can send the restaurant a password-reset email.

**Everything below can be done from a phone browser — no computer, no
command line, no Firebase CLI.** Two websites you'll use the whole time:
`console.firebase.google.com` and `github.com` (or the GitHub app).

## Why Firebase instead of Node/Express

GitHub Pages only serves static files — it can't run a Node/Express
server. This build uses **Firebase** (Firestore + Auth + Storage)
directly from the browser instead, so there's no server to host,
maintain, or deploy. Every page here is static HTML/JS/CSS.

## What's included

| File | Purpose |
|---|---|
| `index.html` | Customer home — browse, search, cart, checkout |
| `order.html` | Live order tracking, payment, correction requests |
| `staff-login.html` | Restaurant staff login |
| `staff-dashboard.html` | Live orders, menu management, sales reports |
| `admin-11a24a22.html` | Hidden super admin — site content, payment settings, password reset |
| `firebase-init.js` | Shared Firebase config (**you must edit this**) |
| `manifest.json`, `service-worker.js`, `icons/` | PWA install support |
| `firestore.rules`, `storage.rules` | Security rules (paste into console — see below) |
| `firebase.json` | Only needed if you later use the Firebase CLI from a computer |

There is no `functions/` folder — restaurant password resets use
Firebase's built-in "send reset email" feature instead of a Cloud
Function, so nothing here needs the Blaze plan or a CLI deploy.

## Step 1 — Firebase console setup (phone browser)

Go to [console.firebase.google.com](https://console.firebase.google.com),
open your project. Tip: switch your mobile browser to "Desktop site" for
an easier time with the console's layout.

1. **Authentication** → Sign-in method → enable **Email/Password**.
2. **Authentication** → Users → **Add user**, twice, using two **real
   email addresses you can actually open** (e.g. two of your own Gmail
   addresses — do not use a fake `@something.local` address, since
   password resets need a real inbox):
   - One for the restaurant counter (give this password to whoever runs
     it)
   - One private one just for you, the super admin
3. **Firestore Database** → Create database → production mode.
4. **Firestore Database** → **Rules** tab → delete what's there → paste
   in the entire contents of `firestore.rules` from this repo → **Publish**.
5. **Storage** → Get started (default bucket).
6. **Storage** → **Rules** tab → paste in the entire contents of
   `storage.rules` → **Publish**.

## Step 2 — Fill in your config (still phone browser, editing on GitHub)

Open **`firebase-init.js`** in this repo and edit two things:
- `RESTAURANT_LOGIN_EMAIL` → the real staff email from step 1.2
- The `firebaseConfig` object is already filled in for you. If you ever
  regenerate it (Project settings → General → Your apps), replace it here.

Open **`admin-11a24a22.html`**, find `const ADMIN_EMAIL = ...` near the
top of the `<script>` block, and set it to your real super-admin email
from step 1.2.

You can make both edits directly on github.com: open the file, tap the
pencil/edit icon, change the line, commit.

## Step 3 — Put it on GitHub Pages

1. On [github.com](https://github.com) (or the GitHub mobile app),
   create a new repository.
2. Upload every file from this project into it: **Add file → Upload
   files**, then select all the files (and the `icons/` folder) from
   your phone's file manager — most phones can select multiple files
   out of an extracted zip at once. Commit.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → pick
   `main` and `/ (root)` → Save.
4. Your site goes live at `https://<username>.github.io/<repo>/` (give
   it a minute or two after the first deploy).
5. **Rename the secret admin page before sharing the link with
   anyone:** rename `admin-11a24a22.html` to your own random string
   (GitHub's file view has a rename option) — e.g.
   `admin-9f2c7d41ab.html`. Nothing in the app links to it on purpose;
   it's meant to be reached only by typing the URL directly.

GitHub Pages serves everything over HTTPS automatically, satisfying the
"Secure HTTPS" requirement and what's needed for PWA installability.

## Step 4 — Add your menu and payment details (on the live site itself)

Open `staff-login.html` (or the renamed admin page) on your deployed
site and log in with the accounts from Step 1.2:

- **Menu tab** → add categories (e.g. Snacks, Meals, Drinks) and dishes
  with photos, prices, and availability. There's no seed data — this is
  the intended way to populate the menu.
- **Admin page → Payment Settings** → add your UPI ID, upload a QR code
  image, and/or bank transfer details. These show to customers once the
  restaurant accepts their order.

That's it — no further setup needed. Everything else (live order sync,
cart, tracking, correction requests, sales reports) works out of the box.

## How the order flow works

`pending_restaurant → accepted / rejected / changes_requested →
payment_pending (customer picks a method + uploads receipt) →
payment_uploaded → payment_verified → preparing → ready → completed` (or
`cancelled` at any point). Everything updates live on both the
customer's `order.html` and the staff dashboard via Firestore real-time
listeners — no manual refresh needed.

## Known simplifications (read before assuming 100% parity with the original spec)

- **Security rules are a solid starting point, not bulletproof.** Guests
  write directly to Firestore (no server mediates every write), which is
  necessary for a serverless static-hosting architecture. The rules
  restrict what a guest can change (they can't alter totals or item
  lists after creation, for example), but a determined attacker with
  browser dev tools has more surface than they would with a
  server-validated API. For a small single-location ordering app this is
  a reasonable trade-off.
- **No push notifications when the browser/app is fully closed.**
  Removing the Cloud Function (so nothing here needs a CLI deploy or the
  Blaze plan) means there's no server to send FCM pushes when a device is
  offline or backgrounded for a long time. Everything still updates
  live, instantly, whenever the customer's or staff's page is open —
  this only affects true background/lock-screen alerts. If you later get
  access to a computer and want that back, restore a Cloud Function like
  the one described in older versions of this project, using the
  `staffDeviceTokens` collection that's already wired up client-side.
- **Restaurant password reset** sends a real email via Firebase Auth —
  it requires the staff account to use a real, checkable email address
  (see Step 1.2), not a fake one.
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
- Rate limiting and automated backups are best configured at the
  Firebase project level (Firestore has built-in backup/export tools;
  App Check can add abuse protection) rather than in application code.
