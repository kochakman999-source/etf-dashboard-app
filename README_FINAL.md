# ETF Core Portfolio System

可直接部署到 GitHub Pages 的私人 ETF 投資組合及 Buy-only 再平衡系統。

## 檔案

- `index.html`：主程式
- `manifest.json`：PWA 設定
- `service-worker.js`：離線快取
- `firebase-config.js`：Firebase 設定
- `cloud-sync.js`：Google 登入、上載、下載及自動同步
- `firestore.rules`：每位使用者只可讀寫自己的資料
- `icon-192.png`、`icon-512.png`：PWA 圖示
- `.nojekyll`：避免 GitHub Pages 進行 Jekyll 處理

## GitHub Pages 部署

1. 解壓 ZIP，將全部檔案放到同一個 GitHub repository 根目錄。
2. Commit 並 Push 到 `main`。
3. 前往 **Settings > Pages**。
4. 在 **Build and deployment** 選擇 **Deploy from a branch**。
5. Branch 選 `main`，Folder 選 `/ (root)`，按 **Save**。
6. 等候 Pages 網址建立後，以該網址開啟。請勿直接以 `file://` 開啟，Service Worker、ES Modules 及 Firebase 需要 HTTPS/網頁伺服器。

## Firebase 雲端同步設定

Firebase 未設定時，App 仍可正常使用本機儲存及 PWA 離線模式，雲端同步會安全停用。

1. 在 Firebase Console 建立 Web App。
2. 啟用 **Authentication > Sign-in method > Google**。
3. 建立 **Cloud Firestore**。
4. 將 Firebase 提供的設定值填入 `firebase-config.js`。
5. 將 GitHub Pages 網域加入 **Authentication > Settings > Authorized domains**。
6. 將 `firestore.rules` 的內容發布為 Firestore Rules。

## 資料位置

- 本機資料：`localStorage`, key 為 `ETF_CORE_PRO_V1`
- 雲端資料：`portfolioData/{uid}/documents/main`

## 更新 PWA

`service-worker.js` 的 cache 名稱已包含主程式雜湊。每次重新產生部署包時會自動改變，有助使用者取得新版。

## 注意

此工具只供個人紀錄及試算，不構成投資建議。券商費用為估算，實際費用以成交單及券商最新收費為準。
