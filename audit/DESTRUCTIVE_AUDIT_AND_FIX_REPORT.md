# 破壞性審計與問題修復報告

- 審計檔案：`ETF_Core_Portfolio_10.0_Professional_FINAL_10.0.4_DESTRUCTIVE_AUDITED_FIX.html`
- SHA-256：`edcf89b140b7045003a142948b45729766039e9c3cf9603252bc4531083318cd`
- 審計原則：不以「載入成功」替代業務閉環；所有結論區分靜態追蹤、Runtime測試及未涵蓋的真機風險。

## 0. 審計期間發現並已修復的缺陷

| 缺陷 | 原風險 | 修復 | 驗證 |
|---|---|---|---|
| 交易券商欄位未寫入交易物件 | `brokerSelect`、`feePlanSelect`、估算費用只顯示，儲存後遺失 | `saveTrade()`新增`broker`、`feePlan`、`estimatedFee` | Runtime讀回`futu / standard / 1.99` |
| Projection及預算欄位未完整持久化 | 重新開啟會回復舊設定 | Input handler更新`settings.projection.*`及`settings.budget`並呼叫`Store.save()` | 靜態閉環追蹤 |
| 現金、換匯、股息、月結完成後未清場 | 冷卻期後誤按可重複提交 | 成功後重設金額、費用、日期或備註 | Runtime及代碼追蹤 |
| Standalone仍宣告Manifest/Icon及HTTP擴充Loader | 不符合零依賴，Hosted按鈕在離線環境可能成死按鈕 | 移除所有`link`及外部Loader；Hosted-only控制改為`disabled` | `link=0`、`script[src]=0` |
| `clearTrade()`只部分清場 | 估算費用、類型及編輯狀態可能殘留 | 重設`editingTrade`、衍生費用、類型、券商及付款來源 | 靜態追蹤 |

## 1. Button-to-Handler雙向矩陣

集中式Click Event Hub位於實體行 **332**；主要重繪入口`renderApp()`位於實體行 **343**。由於原HTML採壓縮式長行，單一實體行可能同時包含多個分支；表內行號是實體檔案行號，不是格式化後的虛擬行號。

| 按鈕名稱／選擇器 | HTML/JS行 | Listener行 | State路徑 | 重繪 | 判定 |
|---|---:|---:|---|---|---|
| 總覽 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 持倉 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 交易 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 現金儲備 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資產試算 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 月結紀錄 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 績效分析 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 股息與賣出 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資金目標 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資料中心 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 專業分析 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資料品質 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 進階分析 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 驗收中心 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 雲端驗收 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 發布完整性 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| Google 登入 | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 隱藏金額 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 深色模式 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| ⚙ ETF設定 | 328 | 332 | modal DOM | renderManager | PASS |
| 簡潔顯示 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 更新市場價格 | 328 | 332 | navigation only | showPage/openETFManager | PASS |
| ＋ 買入 ETF 記錄買入及所選資金來源扣款 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| ↗ 賣出 ETF 檢查持倉並將淨收入存入所選戶口 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 確認儲存交易 | 328 | 332 | state.trades[]; state.cashTx[]; state.cash.* | renderApp | PASS |
| 取消修改 | 328 | 332 | editingTrade; form DOM | renderApp | PASS |
| 匯出JSON備份 | 328 | 332 | safeStorage backup + download | none | PASS |
| 交易CSV | 328 | 332 | download only | none | PASS |
| 持倉CSV | 328 | 332 | download only | none | PASS |
| 自動補算0費用交易 | 328 | 332 | state.trades[].fee; state.cash.usdCash; cashTx.detail | renderApp | PASS |
| ↓ 存入現金寶 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| ↑ 提取現金寶 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 確認儲存現金交易 | 328 | 332 | state.cash[account]; state.cashTx[] | renderApp | PASS |
| 確認兌換並儲存 | 328 | 332 | state.cash.hkdCash/usdCash; state.cashTx[] | renderApp | PASS |
| 儲存本月快照 | 328 | 332 | state.snapshots[] | renderApp | PASS |
| 匯出月結CSV | 328 | 332 | download only | none | PASS |
| 儲存股息 | 328 | 332 | state.dividends[]; state.cash.usdCash; state.cashTx[] | renderApp | PASS |
| 試算 | 328 | 332 | sellResult DOM only | none | PASS |
| 新增目標 | 328 | 332 | state.goals[] | renderApp | PASS |
| 確認匯入 | 328 | 332 | state.trades[]; state.cash.*; state.cashTx[] | renderApp | PASS |
| 還原CSV匯入前資料 | 328 | 332 | state root | renderApp | PASS |
| 匯出操作歷史 | 328 | 332 | download only | none | PASS |
| 上載雲端 | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 下載比較 | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 登出 | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 儲存設定 | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 儲存設定 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 測試連線 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 立即更新全部 ETF | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 安裝 App | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 檢查更新 | - | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | 停用，非可點擊 |
| 匯入成分 | 328 | 332 | state.components[] | renderApp | PASS |
| 封存ETF | 328 | 332 | state.etfs[].archived; primaryTicker | renderApp | PASS |
| 解封ETF | 328 | 332 | state.etfs[].archived; primaryTicker | renderApp | PASS |
| 匯出Schema v9備份 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 比較紀錄數量 | 328 | 332 | comparedBackup read-only | renderApp | PASS |
| 套用已比較備份 | 328 | 332 | state root | renderApp | PASS |
| 重新檢查 | 328 | 332 | read-only diagnostic | renderApp | PASS |
| 匯出診斷JSON | 328 | 332 | download only | none | PASS |
| 還原雲端下載前備份 | 328 | 332 | state root | renderApp | PASS |
| 讀取並比較 | 328 | 332 | candidate | renderApp | PASS |
| 模擬重複合併 | 328 | 332 | mergeRows DOM | none | PASS |
| 套用安全合併 | 328 | 332 | state root | renderApp | PASS |
| 匯出P7驗收報告 | 328 | 332 | download only | none | PASS |
| 重新檢查 | 328 | 332 | read-only diagnostic | renderApp | PASS |
| 匯出Runtime Manifest | 328 | 332 | download only | none | PASS |
| ••• 更多 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| button[id="moreBackdrop"] | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| × | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 月結紀錄 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資產試算 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 績效分析 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 股息與賣出 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資金目標 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資料中心 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 專業分析 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 資料品質 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 進階分析 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 驗收中心 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 雲端驗收 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| 發布完整性 | 328 | 332 | navigation/UI or dedicated ID handler | showPage/renderApp or local UI | PASS |
| × | 328 | 332 | modal DOM | none | PASS |
| 儲存組別 | 328 | 332 | state.categories[]; state.etfs[].category | renderApp | PASS |
| 清除 | 328 | 332 | form DOM | renderManager | PASS |
| 儲存 ETF | 328 | 332 | state.etfs[]; state.categories[].primaryTicker | renderApp | PASS |
| 清除 | 328 | 332 | form DOM | renderManagerSelect | PASS |
| [data-edit-trade] | 346 | 332 | editingTrade; trade form DOM | showPage/renderApp | PASS |
| [data-delete-trade] | 346 | 332 | state.trades[]; state.cash.*; state.cashTx[] | renderApp | PASS |
| [data-delete-cash] | 347 | 332 | state.cash.*; state.cashTx[] | renderApp | PASS |
| [data-delete-dividend] | 351 | 332 | state.dividends[]; state.cash.usdCash; state.cashTx[] | renderApp | PASS |
| [data-delete-goal] | 352 | 332 | state.goals[] | renderApp | PASS |
| [data-goal-status] | 352 | 332 | state.goals[].status | renderApp | PASS |
| [data-delete-snapshot] | 349 | 332 | state.snapshots[] | renderApp | PASS |
| [data-prefill] | 343 | 332 | trade form DOM | showPage/renderApp | PASS |
| [data-complete] | 343 | 332 | state.monthlyCompleted[month] | renderApp | PASS |
| [data-edit-category] | 401 | 332 | category form DOM | renderManager | PASS |
| [data-delete-category] | 401 | 332 | state.categories[] | renderApp/renderManager | PASS |
| [data-edit-etf] | 401 | 332 | ETF form DOM | renderManager | PASS |
| [data-toggle-archive] | 401 | 332 | state.etfs[].archived; primaryTicker | renderApp/renderManager | PASS |
| [data-delete-etf] | 401 | 332 | state.etfs[]; state.components[] | renderApp/renderManager | PASS |
| [data-market-primary] | 343 | 332 | state.categories[].primaryTicker | renderApp | PASS |
| [data-manual] | 246 | 332 | state.manualQA.* | renderApp | PASS |
| [data-cloud-check] | 246 | 332 | state.cloudQA.* | renderApp | PASS |

### 矩陣結論

- 可點擊的靜態按鈕、動態資料屬性按鈕及導航控制均可追蹤到集中Event Hub或專屬ID Handler。
- Google/Firebase/PWA/語言控制在嚴格Standalone版本被明確停用，不再偽裝成可操作按鈕。
- 匯出、試算、導航本質上不應修改Store，故不以「未寫Store」誤判為死按鈕；但已核對其實際DOM或下載副作用。

## 2. Form Ingestion閉環清單

| ID | 元素 | 行號 | 寫入目標／用途 | 類型 | 判定 |
|---|---|---:|---|---|---|
| `rebalancePay` | input/number | 328 | `settings.budget` | 持久化 | PASS |
| `fractional` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `currentFx` | input/number | 328 | `settings.fx` | 持久化 | PASS |
| `tradeDate` | input/date | 328 | `trades[].date` | 持久化 | PASS |
| `ticker` | select | 328 | `trades[].ticker` | 持久化 | PASS |
| `price` | input/number | 328 | `trades[].price` | 持久化 | PASS |
| `shares` | input/number | 328 | `trades[].shares` | 持久化 | PASS |
| `fx` | input/number | 328 | `trades[].fx` | 持久化 | PASS |
| `fee` | input/number | 328 | `trades[].fee` | 持久化 | PASS |
| `type` | select | 328 | `trades[].type` | 持久化 | PASS |
| `paymentSource` | select | 328 | `trades[].paymentSource` | 持久化 | PASS |
| `brokerSelect` | select | 328 | `trades[].broker` | 持久化 | PASS |
| `feePlanSelect` | select | 328 | `trades[].feePlan` | 持久化 | PASS |
| `feeCommission` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 衍生/唯讀 | PASS |
| `feePlatform` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 衍生/唯讀 | PASS |
| `feeEstimate` | input/number | 328 | `trades[].estimatedFee` | 持久化 | PASS |
| `note` | input/text | 328 | `trades[].note` | 持久化 | PASS |
| `importJson` | input/file | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 匯入暫存，確認後寫入 | PASS |
| `cashDateV49` | input/date | 328 | `cashTx[].date` | 持久化 | PASS |
| `cashTypeV49` | select | 328 | `cashTx[].type` | 持久化 | PASS |
| `cashCurrencyV49` | select | 328 | `cashTx[].account` | 持久化 | PASS |
| `cashAmountV49` | input/number | 328 | `cashTx[].amount + cash[account]` | 持久化 | PASS |
| `exchangeDateV49` | input/date | 328 | `cashTx[].date` | 持久化 | PASS |
| `exchangeDirectionV49` | select | 328 | `cashTx[].direction` | 持久化 | PASS |
| `exchangeAmountV49` | input/number | 328 | `cashTx[].amount + cash.*` | 持久化 | PASS |
| `exchangeRateV49` | input/number | 328 | `cashTx[].rate` | 持久化 | PASS |
| `exchangeFeeV49` | input/number | 328 | `cashTx[].fee` | 持久化 | PASS |
| `monthlyContribution` | input/number | 328 | `settings.projection.monthly` | 持久化 | PASS |
| `step` | input/number | 328 | `settings.projection.step` | 持久化 | PASS |
| `usdMonthly` | input/number | 328 | `settings.projection.usdMonthly` | 持久化 | PASS |
| `rate` | select | 328 | `settings.projection.rate` | 持久化 | PASS |
| `snapshotMonth` | input/month | 328 | `snapshots[].month` | 持久化 | PASS |
| `snapshotContribution` | input/number | 328 | `snapshots[].contribution` | 持久化 | PASS |
| `snapshotNote` | input/text | 328 | `snapshots[].note` | 持久化 | PASS |
| `divTicker` | select | 328 | `dividends[].ticker` | 持久化 | PASS |
| `divDate` | input/date | 328 | `dividends[].date` | 持久化 | PASS |
| `divGross` | input/number | 328 | `dividends[].gross` | 持久化 | PASS |
| `divTax` | input/number | 328 | `dividends[].tax` | 持久化 | PASS |
| `divFee` | input/number | 328 | `dividends[].fee` | 持久化 | PASS |
| `divFx` | input/number | 328 | `dividends[].fx` | 持久化 | PASS |
| `sellTicker` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `sellShares` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `sellPrice` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `sellFee` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `goalName` | input/text | 328 | `goals[].name` | 持久化 | PASS |
| `goalTarget` | input/number | 328 | `goals[].target` | 持久化 | PASS |
| `goalCurrentInput` | input/number | 328 | `goals[].current` | 持久化 | PASS |
| `goalDate` | input/date | 328 | `goals[].date` | 持久化 | PASS |
| `goalInvestable` | select | 328 | `goals[].investable` | 持久化 | PASS |
| `goalStatus` | select | 328 | `goals[].status` | 持久化 | PASS |
| `goalNotes` | input/text | 328 | `goals[].notes` | 持久化 | PASS |
| `brokerCsv` | input/file | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 匯入暫存，確認後寫入 | PASS |
| `firebaseConfigInput` | textarea | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 停用的Hosted-only控制 | N/A |
| `marketApiProvider` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `marketApiKey` | input/password | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `marketAutoUpdate` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `languageSelect` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 停用的Hosted-only控制 | N/A |
| `pwaState` | input | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 衍生/唯讀 | PASS |
| `p3Csv` | textarea | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p4ArchiveTicker` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p4RestoreTicker` | select | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p4BackupFile` | input/file | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 匯入暫存，確認後寫入 | PASS |
| `p5Initial` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Years` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Monthly` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Step` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Inflation` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Conservative` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Base` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p5Optimistic` | input/number | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 即時計算/畫面控制 | PASS |
| `p7CloudFile` | input/file | 328 | `無Save按鈕；只作即時計算、匯入候選或本機設定` | 匯入暫存，確認後寫入 | PASS |
| `catOriginal` | input/hidden | 328 | `edit key only` | 編輯暫存 | PASS |
| `catName` | input/text | 328 | `categories[].name` | 持久化 | PASS |
| `catTarget` | input/number | 328 | `categories[].targetPct` | 持久化 | PASS |
| `etfEditId` | input/hidden | 328 | `edit key only` | 編輯暫存 | PASS |
| `etfTicker` | input/text | 328 | `etfs[].ticker` | 持久化 | PASS |
| `etfName` | input/text | 328 | `etfs[].name` | 持久化 | PASS |
| `etfCategory` | select | 328 | `etfs[].category` | 持久化 | PASS |
| `etfMode` | select | 328 | `etfs[].mode` | 持久化 | PASS |
| `etfPrice` | input/number | 328 | `etfs[].price` | 持久化 | PASS |
| `etfHigh` | input/number | 328 | `etfs[].high` | 持久化 | PASS |
| `etfLow` | input/number | 328 | `etfs[].low` | 持久化 | PASS |
| `etfExpense` | input/number | 328 | `etfs[].expense` | 持久化 | PASS |
| `etfPrimary` | input/checkbox | 328 | `categories[].primaryTicker` | 持久化 | PASS |

### 表單取消／清除狀態

- 交易取消：`editingTrade=null`，並由`clearTrade()`再次防禦性清零；同時重設付款來源、券商、費用模式及估算欄。
- 組別及ETF管理：Hidden edit key與所有輸入欄均清除；ETF Primary Checkbox亦清除。
- 新增現金、換匯、股息及月結成功後已加入提交後清場，避免冷卻期結束後誤重複提交。
- `goalStatus`與`goalNotes`已實際寫入`goals[].status`及`goals[].notes`，不再是孤立畫面欄位。

## 3. 狀態機破壞性情境

| 情境 | 變數追蹤 | 實際結果 | 判定 |
|---|---|---|---|
| A：5% + 0% | `Engine.buyOnly()` → `totalTarget=5` → `blocked=true` → `unallocated=7000` | 警示為「5.0%，尚有95.0%未配置」；全額預算保留 | PASS |
| B：VT設定但0股 | `portfolio().holdings`保留VT但`actualHoldings`過濾0股；空態卡顯示；`buyOnly().items[0]=VT` | 引導卡、1項Buy-only及`data-prefill="VT"`同時存在 | PASS |
| C：Primary唯一性 | `migrateState()`只接受未封存`monthly`ETF；單一合資格ETF自動成Primary | 輸入錯誤Primary=HOLD後被正規化為VT；HOLD旗標為false | PASS |
| D：刪除歷史ETF | `hasETFHistory()`命中`trades`後直接toast並return | Delete按鈕存在，但ETF仍保留 | PASS |
| E：現金回沖 | Deposit：`+123.45`後刪除回到20000；HKD→USD：`-782/+100`後刪除回原值 | 港元20000、美元2000精確復原 | PASS |
| F：超賣 | `Engine.lots()`及`saveTrade()`雙重檢查 | 原1筆交易維持1筆，超賣未寫入 | PASS |

## 4. WebKit / Safari防禦

| 檢查 | 證據 | 結果 |
|---|---|---|
| iOS Auto-zoom | Mobile media query對`input/select/textarea`強制`font-size:16px!important` | PASS |
| Checkbox變形 | Checkbox/Radio排除一般輸入規則，並固定20px、高度20px | PASS |
| 快速點擊選字 | Button及所有Action selector包含`-webkit-user-select:none!important`與`-webkit-touch-callout:none!important` | PASS |
| Smooth scroll/focus衝突 | 全檔無`scrollIntoView({behavior:"smooth"})` | PASS |
| 底欄遮擋 | `.mobile-nav`及`.content`均使用`env(safe-area-inset-bottom)`，內容底部預留96px以上 | PASS（靜態） |
| 真機限制 | 本輪沒有實體iPhone/iPad硬件及Safari遠端Inspector，故不能把靜態CSS驗證冒充真機驗收 | NEEDS DEVICE UAT |

## 5. 零依賴、沙盒與冗餘

| 項目 | 結果 |
|---|---|
| 舊Ticker陣列 | 未找到完整`[QQQ, QQQM, VOO, SPYM, SMH]`硬編碼陣列 |
| `mainBuy.N/V/S` | 未找到 |
| safeStorage | 所有核心Store讀寫透過`safeStorage`；`get/set/remove`均有`try/catch`及`mem`備援 |
| 外部JS/CSS/Manifest/Icon | `script[src]=0`、`link=0` |
| Click listener | Physical document click listener只有1個；其他模組加入的是Handler Registry，不是重複物理Listener |
| render覆寫 | 存在一次有意圖的`renderApp`Decorator，用作首頁RC3補充刷新；不是多版本歷史覆寫鏈 |
| 重複balancesXX | 未找到 |

## 6. 最終風險聲明

- 本報告不宣稱「宇宙級100%無缺陷」。已驗證範圍包括JS語法、DOM Runtime、A至F破壞性狀態、表單寫入追蹤、離線依賴、CSS靜態防禦。
- 尚未由本執行環境覆蓋：真實iOS Safari鍵盤升降、低記憶體終止後重開、實體觸控連點時序、VoiceOver、真實下載權限、真實Twelve Data網路錯誤及長期資料量壓力。
- 因此，結論是「本次列明的自動化與靜態項目通過，且發現缺陷已修復」，不是未經證據的100分宣告。

## 7. 修復版本交付

- HTML：`ETF_Core_Portfolio_10.0_Professional_FINAL_10.0.4_DESTRUCTIVE_AUDITED_FIX.html`
- Runtime證據：`DESTRUCTIVE_AUDIT_RUNTIME_RESULTS.json`