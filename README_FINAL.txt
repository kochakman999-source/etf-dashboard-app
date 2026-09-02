ETF Core Portfolio v8.3 Compact Dates Final
Build: 2026-09-02

Change in this release
- All date and month controls are compact: 180px wide, 40px high and 14px text.
- On screens at or below 390px, controls are 165px wide.
- Main amount, ETF, direction and funding fields remain full width.
- Dark-mode date and month colors are included.

Cloud behavior
- First successful login: press Upload Local Data once if the cloud contains no portfolio.
- Afterwards, every app save dispatches etf-local-save and automatically uploads after 1.8 seconds.
- Manual Upload remains available as a recovery action.
- Login state uses browserLocalPersistence.
