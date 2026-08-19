ETF Core Portfolio Stable v2.4.2 Final Checked

Final Check修正：
1. 修正重複HTML id：月供輸入改為 monthlyContribution，月結頁維持 monthly。
2. 加入明確啟動程序：設定交易日期、計算預覽、渲染全部頁面、套用已儲存語言。
3. Firebase下載資料後重新套用現有語言。
4. JavaScript語法、重複id、主要功能入口及ZIP完整性已檢查。

GitHub只需取代index.html及service-worker.js。
不要覆蓋firebase-config.js、cloud-sync.js及firestore.rules。
