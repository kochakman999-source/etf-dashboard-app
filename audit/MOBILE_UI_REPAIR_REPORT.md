# ETF Core Portfolio 10.0.5 Mobile UI Repair

## Applied repairs
- Mobile duplicate page titles hidden below 900px.
- Mobile topbar rebuilt with safe-area support and compact account actions.
- Date/month inputs constrained to 44px with WebKit-specific normalization.
- Google/Firebase controls enabled on HTTP(S), disabled gracefully on file://.
- Firebase adapter conditionally loaded only on HTTP(S).
- Missing Firebase Config redirects to Data Center with a friendly toast.
- Existing Store, Engine, cooldown, CSV injection protection, money rounding and cash two-way synchronization preserved.

## Identity
- App version: 10.0.5-FINAL
- Schema: 10
- SHA-256: `75e65abdd99b994ab91808c6f52036064250897111aa468ada72d16b01ba653a`
