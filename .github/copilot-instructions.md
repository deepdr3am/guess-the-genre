<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# 音樂類型猜測遊戲 - Copilot 指示

這是一個基於 Web 的音樂類型猜測遊戲專案，具有以下特點：

## 專案架構
- **後端**: Node.js + Express
- **前端**: 純 HTML/CSS/JavaScript
- **爬蟲**: Puppeteer + Cheerio + Axios
- **資料來源**: everynoiseatonce.com

## 主要功能
1. 從 everynoiseatonce.com 爬取音樂類型和藝人資訊
2. 隨機生成音樂類型問題（三選一）
3. 顯示藝人圖片和資訊
4. 計分系統
5. 響應式設計

## 程式碼風格指南
- 使用現代 ES6+ JavaScript 語法
- 採用類別導向程式設計
- 使用 async/await 處理非同步操作
- 適當的錯誤處理和使用者體驗
- 中文介面和註解

## API 端點
- `GET /`: 主頁面
- `GET /api/random-genre`: 獲取隨機音樂類型問題
- `GET /api/artist/:name`: 獲取藝人資訊和圖片

## 開發注意事項
- 爬蟲需要適當的錯誤處理和速率限制
- 前端需要載入狀態和錯誤處理
- 確保響應式設計在各種裝置上正常運作
- 使用 HTTPS 和適當的 CORS 設定
