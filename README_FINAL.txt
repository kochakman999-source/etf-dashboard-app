ETF Core Portfolio v6.9 Cloud Sync + Mobile Final
=================================================

ZIP files
- index.html
- service-worker.js
- cloud-sync.js
- firebase-config.js
- README_FINAL.txt

Firebase setup
1. In Firebase Console, create/select a project.
2. Add a Web app and copy its configuration into firebase-config.js.
3. Enable Authentication > Sign-in method > Google.
4. Create Firestore Database.
5. Add your GitHub Pages host, for example USERNAME.github.io, to Authentication > Settings > Authorized domains.
6. Upload all five files to the GitHub repository root.
7. Deploy GitHub Pages from main / root.
8. Open the site, choose Cloud Sync, then sign in with Google.

Recommended Firestore rules
Use authenticated user-only access for the users collection. Do not publish a database with unrestricted read/write rules.

Mobile behavior
- Cloud Sync is under More > Cloud Sync.
- Mobile/installed PWA uses Google redirect sign-in.
- Desktop uses the Google popup flow.

Data workflow
- On the device containing the latest portfolio, sign in and choose Upload Local Data.
- On a new device, sign in and choose Download Cloud Data.
- Keep periodic JSON backups even when cloud sync is enabled.

Cache
The service-worker cache is etf-core-v6-9-cloud-mobile-final. If an old app remains visible, remove the old installed app/site data, reload in Safari/Chrome, then add it to the home screen again.
