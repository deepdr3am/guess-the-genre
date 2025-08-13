# Spotify API 設定指引

## 快速設定步驟

# 🎵 Spotify API 設定指引

## 📋 快速設定步驟

### 1️⃣ 申請 Spotify Developer 帳號
1. 前往：**https://developer.spotify.com/dashboard**
2. 使用 Spotify 帳號登入（沒有帳號可以免費註冊）
3. 點擊綠色的 **"Create App"** 按鈕

### 2️⃣ 創建應用程式
填寫以下資訊：
- **App name**: `音樂類型猜測遊戲` （或任何您喜歡的名稱）
- **App description**: `A web app for guessing music genres`
- **Website**: `http://localhost:3000`
- **Redirect URI**: `http://localhost:3000`
- **Which API/SDKs are you planning to use**: 勾選 **"Web API"**

點擊 **"Save"** 創建應用程式。

### 3️⃣ 獲取 API 憑證
1. 創建成功後，會自動進入應用程式的 Dashboard
2. 在 **"Settings"** 頁面中找到：
   - **Client ID**: 直接可見，點擊複製
   - **Client secret**: 點擊 **"View client secret"**，然後複製

### 4️⃣ 設定環境變數
編輯專案根目錄的 `.env` 檔案，將預設值替換為真實憑證：

```bash
# 將下面的預設值替換為您的真實憑證
SPOTIFY_CLIENT_ID=你複製的Client_ID
SPOTIFY_CLIENT_SECRET=你複製的Client_Secret
PORT=3000
```

**⚠️ 重要提醒**：
- 請確保刪除 `請在這裡填入您的Client ID` 等預設文字
- 憑證是長串的英文數字組合，類似：`a1b2c3d4e5f6g7h8i9j0`
- 不要包含額外的空格或引號

### 5️⃣ 重新啟動服務器
設定完成後，重新啟動開發服務器：
```bash
npm run dev
```

如果設定正確，您會看到：
```
✅ Spotify 服務初始化完成
```

如果還有問題，會看到詳細的錯誤訊息和建議。

## 沒有 Spotify 憑證會怎樣？

- 遊戲仍然可以正常運行
- 只是不會顯示專輯封面
- 會顯示預設的音樂圖示

## 憑證安全

- `.env` 檔案已加入 `.gitignore`，不會被上傳到 Git
- 請勿將憑證分享給他人
- 這些憑證只用於專輯封面功能

## 故障排除

如果專輯封面不顯示，檢查：
1. `.env` 檔案是否正確設定
2. 伺服器啟動時是否看到 "Spotify 服務初始化完成"
3. 瀏覽器開發者工具是否有錯誤訊息
