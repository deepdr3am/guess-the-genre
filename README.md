# 🎵 猜音樂類型遊戲

一個基於 Web 的音樂類型猜測遊戲，透過爬蟲技術從 [Every Noise at Once](https://everynoiseatonce.com) 獲取音樂類型和藝人資訊。

## ✨ 功能特點

- 🎲 隨機生成音樂類型問題（三選一選擇題）
- 🎨 顯示藝人圖片和相關資訊  
- 📊 即時計分系統
- 📱 響應式設計，支援各種裝置
- 🕷️ 智慧爬蟲技術獲取最新音樂資料

## 🚀 快速開始

### 安裝依賴
```bash
npm install
```

### 開發模式運行
```bash
npm run dev
```

### 生產環境運行
```bash
npm start
```

訪問 http://localhost:3000 開始遊戲！

## 🛠️ 技術棧

- **後端**: Node.js + Express
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **爬蟲**: Puppeteer + Cheerio + Axios
- **資料來源**: everynoiseatonce.com

## 📁 專案結構

```
guess-the-genre/
├── src/
│   └── scraper.js          # 爬蟲模組
├── public/
│   ├── index.html          # 主頁面
│   ├── styles.css          # 樣式檔案
│   └── script.js           # 前端邏輯
├── server.js               # Express 伺服器
├── package.json            # 專案配置
└── README.md              # 說明文件
```

## 🎮 遊戲玩法

1. 系統隨機選擇一個音樂類型和對應的藝人
2. 顯示藝人資訊和圖片
3. 提供三個音樂類型選項供選擇
4. 選擇正確答案可獲得 10 分
5. 點擊「下一題」繼續遊戲

## 🔧 API 端點

- `GET /` - 遊戲主頁面
- `GET /api/random-genre` - 獲取隨機音樂類型問題
- `GET /api/artist/:name` - 獲取藝人資訊和圖片

## 📝 開發注意事項

- 爬蟲功能需要穩定的網路連線
- 首次載入可能需要較長時間來獲取音樂類型資料
- 建議在生產環境中實作快取機制以提升效能
- 可以考慮整合真實的音樂 API（如 Spotify API）以獲得更豐富的資料

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request 來改善這個專案！

## 📄 授權

ISC License

## 🙏 致謝

感謝 [Every Noise at Once](https://everynoiseatonce.com) 提供豐富的音樂類型資料。
