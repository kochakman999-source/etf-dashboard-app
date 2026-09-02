ETF Core Portfolio v7.1 Mobile Layout + Cloud Final
Build: 2026-09-02

Fixes
- Rebuilt goal-card layout to prevent amount, progress, status and action overlap.
- Goal amount uses 17px, wrapping and break-all.
- Goal date uses compact 12px text.
- Goal actions have a dedicated responsive row.
- Removed the duplicate Mobile More > Cloud Sync entry. Cloud login remains in the top bar.
- Rebuilt the Home HK$1M value row and USD secondary typography.
- Firebase Auth now uses browserLocalPersistence, getRedirectResult and onAuthStateChanged.
- Mobile/PWA uses redirect sign-in. Desktop uses popup sign-in.

Firebase Console requirements
- Enable Google provider.
- Add the GitHub Pages host to Authorized domains.
- Use authenticated, user-scoped Firestore rules.

Upload all five files to the repository root. If an old version is cached, remove old site data or the installed PWA, then reload.
