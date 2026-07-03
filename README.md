# 🔍 區域放大鏡 — Screen Magnifier

一個 Chrome 瀏覽器擴充功能，按下快捷鍵即可在滑鼠位置顯示圓形放大鏡，方便閱讀網頁細節內容。

![Chrome](https://img.shields.io/badge/Chrome-Manifest_V3-blue?logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 功能

- 快捷鍵一鍵開關放大鏡
- 放大鏡圓心精準對齊滑鼠位置
- 可調整放大倍率（1.5x ～ 10x）
- 可調整放大範圍半徑（40px ～ 300px）
- 設定自動儲存，重開瀏覽器後保留

## 操作方式

| 操作 | 功能 |
|------|------|
| `Ctrl+Shift+Y` | 開啟 / 關閉放大鏡 |
| 滾輪上下 | 調整放大倍率 |
| `Shift` + 滾輪 | 調整放大範圍半徑 |
| 點擊擴充功能圖示 | 開啟設定面板 |

> Mac 使用者請改用 `Command+Shift+Y`

快捷鍵可在 `chrome://extensions/shortcuts` 自訂。

## 安裝方式

### 從 GitHub 手動安裝（開發者模式）

1. 下載此專案（Clone 或下載 ZIP 解壓縮）
2. 開啟 Chrome，網址列輸入 `chrome://extensions/`
3. 右上角開啟「**開發人員模式**」
4. 點擊「**載入未封裝項目**」，選擇本專案資料夾
5. 擴充功能列出現放大鏡圖示即安裝完成

## 檔案結構

```
chrome_ext/
├── manifest.json      # 擴充功能設定（Manifest V3）
├── background.js      # Service Worker：處理快捷鍵與截圖
├── content.js         # 放大鏡主邏輯（注入每個頁面）
├── popup.html         # 設定介面 HTML
├── popup.js           # 設定介面邏輯
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 技術說明

- **截圖與繪製分離**：`captureVisibleTab` 只在啟動或捲動頁面時執行，繪製迴圈（60fps rAF）使用快取截圖即時渲染，確保跟手流暢
- **防遞迴截圖**：截圖前以 `display: none` 隱藏 canvas 並等待兩個 animation frame，確保 GPU 合成完成後再擷取，避免放大鏡截到自身
- **GPU 加速定位**：使用 `transform: translate()` 更新位置，由合成器層處理，減少重排開銷

## License

MIT
