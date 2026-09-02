ETF Core Portfolio v9.0 Auto Cloud Final
Build: 2026-09-02

Cloud behavior
- No direct bank variable access exists in cloud-sync.js.
- Cloud download applies the complete state through window.ETFProApp.setState().
- On login, cloud and local update times are compared. The newer state wins.
- If the cloud document is absent, the local state is uploaded automatically.
- Every etf-local-save event is uploaded in the background after 900 ms.
- Multiple saves are coalesced and the latest pending state is uploaded next.
- Upload and Download buttons are hidden. Signed-in users see sync status and Logout.
- Cloud application creates an automatic pre-download local backup.

Actual Firebase access still requires the GitHub Pages hostname in Firebase Authentication Authorized domains and suitable Firestore Security Rules.
