# 09: PWA App Shell Caching, Offline Banner & Production Polish

**What to build:**
Final production hardening and Progressive Web App configuration. Configures web app manifest and service worker to cache App Shell resources, enabling instant app launching and an "Add to Home Screen" native mobile experience on iOS and Android. Incorporates an offline network status indicator that displays a non-intrusive alert when internet connectivity drops, ensuring users are informed before attempting mutations. Conducts end-to-end smoke verification and prepares the repository for Vercel deployment.

**Blocked by:** 08: Monthly Summary Report (A4 Landscape Print & Dual Signature)

**Status:** ready-for-agent

- [ ] PWA manifest configuration (`manifest.json`) with app title, theme color, display mode `standalone`, and high-resolution icons
- [ ] Service worker registration caching App Shell static assets (HTML, CSS, JS bundles, and icons) for instant launch
- [ ] Apple touch icon and iOS meta tags configured for home screen bookmarking
- [ ] Real-time online/offline detector component displaying a top banner when device loses network connectivity
- [ ] End-to-end smoke test validating core workflows across user submission, room booking, asset checkout, and admin reporting
- [ ] Production build optimization (`npm run build`) ensuring zero bundle errors and readiness for Vercel Free Tier deployment
