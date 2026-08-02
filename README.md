# Krem Chympe — QR / Login / Admin Setup

## How it's split

| Who | Entry point | Auth |
|---|---|---|
| Visitors | Scan QR → `index.html` | None — open access |
| Restaurant | Visit `staff-login.html` directly | Password only (Firebase Auth) |
| You (super admin) | Visit `admin-x9f4k2.html` (rename this!) | Separate password, own account |

## Why Firebase Auth instead of a JS password check

GitHub Pages only serves static files — there's no server to hide a secret on.
Any password check written in plain JavaScript (`if (pw === "mango123")`) is
visible to anyone who opens dev tools, no matter how it's obfuscated. Firebase
Auth solves this properly: passwords are verified against Google's servers,
hashed and salted, and the browser never sees the real one. This is what makes
this actually secure rather than security theater.

## One-time setup

1. **Create a Firebase project** at console.firebase.google.com (free tier is fine).
2. **Enable Authentication → Email/Password.**
3. **Create two users** under Authentication → Users:
   - `restaurant@krem-chympe.local` — the password the restaurant will use daily.
   - `superadmin@krem-chympe.local` — a strong password only you know.
4. **Enable Firestore** (even if unused today — future order/menu data goes here).
5. **Upgrade to the Blaze (pay-as-you-go) plan** — required to deploy Cloud
   Functions. The free-tier usage for a small waterfall stall will stay
   effectively $0/month, but Google requires billing to be enabled for
   Functions specifically.
6. Copy your config values into `public/firebase-init.js` (the six fields at
   the top).
7. Install the Firebase CLI and deploy the function:
   ```
   npm install -g firebase-tools
   firebase login
   firebase init functions   # point it at the functions/ folder
   firebase deploy --only functions
   ```

## Secret admin page

The admin page is named `admin-11a24a22.html` — a random slug so it can't be
guessed. Don't link to it from anywhere on the public site; only you should
know this URL. If you'd rather pick your own slug, just rename the file and
you're done (it has no other dependencies on its filename).

## Deploying to GitHub Pages

Push these files to the ROOT of your repo (`chympe-explora/Chympe-order-`) —
not inside a `public/` subfolder:

```
index.html
staff-login.html
staff-dashboard.html
firebase-init.js
admin-11a24a22.html
functions/index.js       (not served by Pages — only used by Firebase CLI)
functions/package.json   (not served by Pages — only used by Firebase CLI)
README.md
```

Enable Pages in repo Settings → Pages → source: root of `main` branch.
Your live URLs will be:

```
https://chympe-explora.github.io/Chympe-order-/index.html
https://chympe-explora.github.io/Chympe-order-/staff-login.html
https://chympe-explora.github.io/Chympe-order-/admin-11a24a22.html
```

`qr-generator.html` is deliberately kept OUT of this list — it's a local
tool for you, not something to publish. Open it by double-clicking on your
own computer (no server needed), it's prefilled with your visitor URL,
generate and download the QR PNG to print.

## About "no notification" on password change

Firebase Auth does not send an email or push notification when a password is
reset via the Admin SDK (which is what the Cloud Function uses) — only the
client-side "forgot password" flow sends an email, and this setup never uses
that flow. So a reset from the admin dashboard is silent by default, exactly
as you asked, with no extra suppression logic needed.

## What's still a placeholder

This delivers the **access/auth layer** you asked for. The dish
grid, cart, order flow, live tracking, and full restaurant order dashboard
from your original spec are UI shells here — happy to build those out next
(they'd connect to the `orders` and `menu` Firestore collections).
