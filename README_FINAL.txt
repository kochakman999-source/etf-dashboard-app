ETF Core Portfolio v7.2 Cloud Status Fixed
Build: 2026-09-02

Cloud status fixes
- Login no longer remains indefinitely at "正在同步".
- Initial Firestore read has a 15-second status timeout.
- Missing cloud document shows "已登入，等待首次上載".
- Permission, unavailable and authentication errors are shown clearly.
- Manual upload and download have independent working, success and failure states.
- Local-save autosync uses "等候同步" then "正在上載雲端".
- Google login uses popup directly inside the click handler.

Upload all five files to the GitHub Pages root. If the old version remains visible, remove old site data or installed PWA before reloading.
