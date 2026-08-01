<div align="center">

# 猜數字

### Number Signal

一款以深色宇宙與全息玻璃介面為基準，打造的純前端猜數字遊戲。

<p>
  <strong>1–100</strong>
  <span> · </span>
  <strong>純前端</strong>
  <span> · </span>
  <strong>無後端</strong>
  <span> · </span>
  <strong>GitHub Pages Ready</strong>
</p>

</div>

---

## ✦ 遊戲概念

在藍紫色宇宙訊號中，找出系統隨機產生的 1～100 整數。
每次猜測都會得到清楚、克制的方向回饋；猜中時以成功浮層與粒子特效完成這一局。

> 專注於猜測本身；每次合法猜測後顯示目前可能區間，不顯示猜測歷史或任何提前暗示。

## ✦ 功能亮點

| 體驗 | 內容 |
| --- | --- |
| **沉浸式介面** | 深色宇宙背景、動態漸層、星光與玻璃擬態卡片 |
| **雙輸入模式** | 支援實體鍵盤與畫面數字鍵盤 |
| **完整互動回饋** | 太大、太小、錯誤震動、成功浮層與 Canvas 粒子 |
| **長期統計** | 完成局數、累計有效猜測次數與最佳紀錄 |
| **穩定的鍵盤操作** | 數字輸入、退格、清除、送出與方向鍵增減 |
| **純靜態部署** | 不需要伺服器、資料庫、建置工具或第三方框架 |

## ✦ 快速開始

### 本機啟動

本專案不需要安裝執行期套件。請在專案資料夾開啟 PowerShell 或 Windows Terminal：

```powershell
python -m http.server 4173
```

接著開啟：

```text
http://127.0.0.1:4173/
```

> 使用本機伺服器是必要的，因為遊戲使用 ES Modules；直接雙擊 `index.html` 可能受到瀏覽器檔案權限限制。

### 執行測試

測試使用 Node.js 內建 `node:test`，不需要安裝測試框架或第三方相依套件：

```powershell
npm test
npm run test:syntax
```

## ✦ 操作方式

| 操作 | 實體鍵盤 | 畫面鍵盤 |
| --- | --- | --- |
| 輸入數字 | `0`～`9` | 數字按鈕 |
| 刪除一位 | `Backspace` | 退格 |
| 清除輸入 | `Escape` | 清除 |
| 提交猜測 | `Enter` | 送出 |
| 增加數值 | `ArrowUp` | ↑ |
| 減少數值 | `ArrowDown` | ↓ |
| 調整鍵盤尺寸 | — | ＋／－ |

方向鍵與畫面上的增減按鈕都支援長按連續調整，數值會限制在 1～100。

## ✦ 遊戲規則與統計

- 答案是 1～100 的隨機整數，猜測次數不限。
- 合法猜測必須是 1～100 之間、尚未猜過的整數。
- 猜錯時顯示「太大」或「太小」，並更新目前可能的數字區間。
- 可能區間會從 1～100 開始，依每次合法猜測逐步縮小。
- 空白、非數字、小數、超出範圍與重複猜測不會計次。
- 中途返回首頁會放棄本局，但不會回退已累計的有效猜測。
- 統計資料保存於瀏覽器 `localStorage`：`numberGuessGame.stats.v1`。
- 完成局數只在猜中時增加；最佳紀錄是最少猜測次數。
- 不提供重設統計按鈕，也沒有音效或計時功能。

## ✦ 專案結構

```text
.
├─ index.html          # 單頁應用結構與語意化 UI
├─ styles.css          # 設計系統、響應式版面與動畫
├─ src/
│  ├─ app.js           # DOM 互動、畫面狀態與事件管理
│  ├─ game.js          # 可獨立測試的猜數字核心邏輯
│  ├─ particles.js     # Canvas 成功粒子效果
│  └─ storage.js       # localStorage 安全讀寫與資料正規化
├─ tests/
│  └─ game.test.js     # 核心規則與統計資料測試
├─ package.json
├─ .gitignore
└─ README.md
```

## ✦ 設計與技術

- 原生 HTML、CSS、JavaScript，使用 ES Modules。
- 不使用 React、Vue、jQuery、Tailwind 或大型 UI 套件。
- 背景裝飾與互動內容分離，避免阻擋滑鼠或鍵盤操作。
- 成功粒子使用原生 Canvas，並在動畫完成後清理資源。
- 使用自訂對話框、焦點管理與 `focus-visible` 狀態。
- 支援最新版 Chrome 與 Edge，並可直接部署至 GitHub Pages。

## ✦ GitHub Pages 部署

1. 將專案推送至 GitHub Repository 的 `main` 分支。
2. 開啟 Repository → `Settings` → `Pages`。
3. 在 `Build and deployment` 選擇 `Deploy from a branch`。
4. Branch 選擇 `main`，資料夾選擇 `/(root)`，按下 `Save`。
5. 等待部署完成後，使用 GitHub Pages 顯示的網站網址開啟遊戲。

每次更新後執行：

```powershell
git add .
git commit -m "Update game"
git push
```

## ✦ 發布前驗收

<details>
<summary>展開完整驗收清單</summary>

### 首頁與統計

- [ ] 標題、玩法說明與開始按鈕正常顯示。
- [ ] 開始遊戲不重新載入頁面，轉場後焦點位於輸入區。
- [ ] 統計面板可展開與收合，收合時內容不可 Tab 聚焦。
- [ ] 統計數字在完成遊戲後即時更新，最佳紀錄空狀態為「—」。

### 輸入與遊戲規則

- [ ] 實體數字鍵、畫面數字鍵、Backspace、Escape、Enter 可用。
- [ ] ArrowUp／ArrowDown 可增減並限制在 1～100；長按可連續變動。
- [ ] 增加、減少、清除、退格、送出按鈕可用，長按放開後停止。
- [ ] 空值、0、101、負數、小數、字母、混合文字與重複猜測會顯示錯誤且不計次。
- [ ] 答案較大顯示「太小」，答案較小顯示「太大」，並顯示可能數字區間。
- [ ] 猜中只結算一次，成功浮層顯示答案與本局次數。
- [ ] 再玩一次會清空本局並保留長期統計。

### 覆蓋層與保存

- [ ] 返回首頁會開啟自訂確認視窗。
- [ ] 繼續遊戲與 Escape 會關閉確認視窗並把焦點還給返回按鈕。
- [ ] 確認返回會放棄本局，不增加完成局數。
- [ ] 成功浮層開啟時，背景數字鍵不可修改本局。
- [ ] 小、中、大鍵盤尺寸可切換，邊界按鈕正確 disabled。
- [ ] 重新整理後統計保留，鍵盤回到中型。

### 發布環境

- [ ] Chrome 與 Edge 沒有水平溢出、文字裁切或 404。
- [ ] 開發者工具沒有 JavaScript 錯誤。
- [ ] 粒子動畫結束後停止，快速操作不會殘留動畫。
- [ ] 沒有混合內容或失效外部資源。

</details>

<div align="center">

<sub>Built with HTML · CSS · JavaScript</sub>

</div>
