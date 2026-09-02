ETF Core Portfolio v8.2 Complete Final
Build: 2026-09-02

Header fix
- Single 68px mobile header row.
- Page title, privacy, theme and Cloud Login stay aligned horizontally.
- Privacy and theme icons are visible, with no empty boxes.
- Cloud Login opens the existing modal and Google sign-in uses popup directly from its click event.

Whole-app checks include all ten pages, ETF buy/sell and cash linkage, cash deposit/withdraw/exchange, strategy, budgets, market data, monthly snapshots, projection, performance, dividends, goals, import/export, privacy/theme, Firebase Auth, Firestore paths, service worker, JavaScript syntax, ZIP integrity and local HTTP serving.

Actual Google/Firebase authorization requires the GitHub Pages hostname in Firebase Authorized domains and suitable Firestore Security Rules.
