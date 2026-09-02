ETF Core Portfolio v7.5 FINAL VERIFIED

The ETF transaction form permanently includes:
- Buy / Sell direction
- Funding Source: External Funds or Deduct from Cash Fund
- Cash Fund: USD or HKD

Verified behaviors:
- Deposit adds cash; withdrawal subtracts cash.
- External-funds buy does not deduct cash.
- USD/HKD Cash Fund buy creates a linked withdrawal.
- Insufficient balance disables and blocks Save.
- Sell, linked cash reversal, dividend cash linkage, goals and mobile safe-area remain present.

IMPORTANT: Preserve your existing REAL firebase-config.js. The packaged file is a placeholder only.
