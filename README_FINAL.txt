ETF Core Portfolio v7.0 Goals Complete Final
Build date: 2026-09-02

New goals workflow
- Add a goal with name, target, current amount, target date and investable status.
- Mark a goal completed.
- Restore a completed goal to in progress.
- Delete a goal with confirmation.
- Completed status and completedAt timestamp persist in localStorage and cloud state.
- Existing goals are migrated non-destructively with IDs and completed=false.
- Goals sort active first, completed last.
- Mobile goal cards include large action buttons and responsive layout.

Package files
index.html
cloud-sync.js
firebase-config.js
service-worker.js
README_FINAL.txt

Firebase note
The supplied firebase-config.js contains PASTE_ placeholders. Keep your existing configured firebase-config.js when deploying, or replace the placeholders with your real Firebase Web App values. Live Google/Firebase authentication cannot operate with placeholder values.

Deploy all files to the GitHub Pages repository root. If the old PWA remains visible, remove old site data or the installed app and reload.
