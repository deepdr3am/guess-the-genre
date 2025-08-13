const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // 載入環境變數
// 引入優化版本的服務
const CachedMusicGenreService = require('./cached_service');
const SpotifyService = require('./spotify_service');

const app = express();
const PORT = process.env.PORT || 3000;

// 全域服務實例
let musicService = null;
let spotifyService = null;

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 服務初始化
async function initializeService() {
    try {
        console.log('🚀 初始化音樂服務...');
        musicService = new CachedMusicGenreService();
        
        // 檢查 Spotify 環境變數是否設定
        const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
        const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
        
        if (spotifyClientId && spotifyClientSecret && 
            spotifyClientId !== '請在這裡填入您的Client ID' && 
            spotifyClientSecret !== '請在這裡填入您的Client Secret') {
            console.log('🎵 初始化 Spotify 服務...');
            spotifyService = new SpotifyService();
            console.log('✅ Spotify 服務初始化完成');
        } else {
            console.warn('⚠️ Spotify API 憑證未正確設定，專輯封面功能將不可用');
            if (!spotifyClientId || !spotifyClientSecret) {
                console.warn('   📝 請在 .env 檔案中設定 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET');
            } else if (spotifyClientId === '請在這裡填入您的Client ID' || 
                      spotifyClientSecret === '請在這裡填入您的Client Secret') {
                console.warn('   🔧 請將 .env 檔案中的預設值替換為真實的 Spotify API 憑證');
                console.warn('   📖 詳細設定步驟請參考 SPOTIFY_SETUP.md');
            }
            spotifyService = null;
        }
        
        await musicService.init();
        console.log('✅ 音樂服務初始化完成，背景預載入已開始');
    } catch (error) {
        console.error('❌ 服務初始化失敗:', error);
        process.exit(1);
    }
}

// 路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API 路由 - 獲取服務狀態和載入進度
app.get('/api/status', (req, res) => {
    if (!musicService) {
        return res.json({ 
            ready: false, 
            message: '服務尚未初始化' 
        });
    }
    
    const status = musicService.getCacheStatus();
    const isReady = status.cachedQuestions > 0;
    
    res.json({
        ready: isReady,
        ...status,
        message: isReady ? '服務就緒' : '背景載入中，請稍候...'
    });
});

// API 路由 - 快速獲取隨機音樂類型問題
app.get('/api/random-genre', async (req, res) => {
    try {
        if (!musicService) {
            return res.status(503).json({ 
                error: '服務尚未就緒，請稍後再試' 
            });
        }
        
        console.log('API: 快速獲取隨機問題...');
        const startTime = Date.now();
        
        const genreData = await musicService.getQuestionFast();
        
        const responseTime = Date.now() - startTime;
        console.log(`API: 問題生成完成 (${responseTime}ms)`, {
            genre: genreData.correctGenre,
            artist: genreData.artistName,
            hasAudio: !!genreData.previewUrl
        });
        
        // 添加效能資訊到回應
        genreData._meta = {
            responseTime: responseTime,
            cached: responseTime < 200, // 如果很快，可能是從快取來的
            cacheStatus: musicService.getCacheStatus()
        };
        
        res.json(genreData);
    } catch (error) {
        console.error('Error fetching random genre:', error);
        res.status(500).json({ 
            error: 'Failed to fetch genre data',
            details: error.message 
        });
    }
});

//API 路由 - 獲取專輯封面
app.get('/api/album-cover/:songName/:artistName', async (req, res) => {
    try {
        const { songName, artistName } = req.params;
        console.log(`API: 獲取專輯封面 - "${songName}" by "${artistName}"`);
        
        if (!spotifyService) {
            return res.status(503).json({
                error: 'Spotify 服務尚未就緒',
                cover: null
            });
        }

        const startTime = Date.now();
        const albumCover = await spotifyService.getAlbumCover(songName, artistName);
        const responseTime = Date.now() - startTime;
        
        if (albumCover) {
            console.log(`✅ 專輯封面獲取成功 (${responseTime}ms)`);
            res.json({
                success: true,
                cover: albumCover,
                responseTime: responseTime
            });
        } else {
            console.log(`⚠️ 未找到專輯封面，使用預設封面 (${responseTime}ms)`);
            res.json({
                success: false,
                cover: spotifyService.getDefaultAlbumCover(),
                responseTime: responseTime,
                message: '未找到專輯封面，使用預設封面'
            });
        }
    } catch (error) {
        console.error('獲取專輯封面時發生錯誤:', error);
        res.status(500).json({
            success: false,
            error: '獲取專輯封面失敗',
            cover: spotifyService ? spotifyService.getDefaultAlbumCover() : null,
            details: error.message
        });
    }
});

// API 路由 - 獲取歌曲資訊（向後相容）
app.get('/api/song/:songName/:artistName/:genreName', async (req, res) => {
    try {
        console.log(`API: Getting song info for ${req.params.songName} by ${req.params.artistName} (${req.params.genreName})`);
        
        // 由於新的流程已經包含完整資訊，這個端點主要用於向後相容
        // 可以考慮直接回傳基本資訊，或者觸發特定的歌曲查詢
        
        const songData = {
            songName: req.params.songName,
            artistName: req.params.artistName,
            genreName: req.params.genreName,
            previewUrl: null, // 在新流程中，預覽 URL 已經包含在問題中
            albumCoverUrl: null,
            spotifyUrl: null,
            message: '此端點在優化版本中已整合到 /api/random-genre'
        };
        
        res.json(songData);
    } catch (error) {
        console.error('Error fetching song data:', error);
        res.status(500).json({ 
            error: 'Failed to fetch song data',
            details: error.message 
        });
    }
});

// API 路由 - 預熱服務（手動觸發更多預載入）
app.post('/api/warmup', async (req, res) => {
    try {
        if (!musicService) {
            return res.status(503).json({ error: '服務尚未初始化' });
        }
        
        console.log('API: 手動預熱服務...');
        // 可以觸發額外的預載入邏輯
        await musicService.refillQuestionCache();
        
        res.json({ 
            success: true, 
            message: '預熱完成',
            status: musicService.getCacheStatus()
        });
    } catch (error) {
        console.error('Warmup error:', error);
        res.status(500).json({ 
            error: 'Warmup failed',
            details: error.message 
        });
    }
});

// 健康檢查端點
app.get('/health', (req, res) => {
    const health = {
        status: musicService ? 'healthy' : 'initializing',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    };
    
    if (musicService) {
        health.cache = musicService.getCacheStatus();
    }
    
    res.json(health);
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
    });
});

// 404 處理
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        path: req.path 
    });
});

// 優雅關閉
process.on('SIGTERM', async () => {
    console.log('🔄 收到終止信號，正在優雅關閉...');
    if (musicService) {
        await musicService.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🔄 收到中斷信號，正在優雅關閉...');
    if (musicService) {
        await musicService.close();
    }
    process.exit(0);
});

// 啟動服務器
async function startServer() {
    try {
        // 先初始化服務
        await initializeService();
        
        // 再啟動HTTP服務器
        app.listen(PORT, () => {
            console.log('🎵 音樂類型猜測遊戲服務器啟動成功!');
            console.log(`📡 服務器運行在: http://localhost:${PORT}`);
            console.log('⚡ 使用優化版本，大幅提升載入速度');
            console.log('💾 背景預載入已啟動，首次載入後將非常快速');
        });
    } catch (error) {
        console.error('❌ 服務器啟動失敗:', error);
        process.exit(1);
    }
}

// 如果是直接執行此檔案，則啟動服務器
if (require.main === module) {
    startServer();
}

module.exports = app;
