const puppeteer = require('puppeteer');

class OptimizedMusicGenreScraper {
    constructor() {
        this.browser = null;
        this.genres = [];
        this.baseUrl = 'https://everynoise.com';
        this.genreCache = new Map(); // 快取已載入的 genre 頁面資料
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-images', // 停用圖片載入
                '--disable-javascript', // 對靜態內容停用 JS
                '--disable-plugins',
                '--disable-extensions'
            ]
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    // 優化版本：使用智能等待替代固定延遲
    async scrapeGenresOptimized() {
        try {
            console.log('🚀 使用優化策略獲取 genres...');
            
            if (!this.browser) {
                await this.init();
            }
            
            const page = await this.browser.newPage();
            
            // 優化網路設定
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            await page.setViewport({ width: 1280, height: 720 });
            
            // 攔截不必要的資源
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const resourceType = request.resourceType();
                if (['image', 'stylesheet', 'font'].includes(resourceType)) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
            
            console.log('📍 訪問 everynoise.com...');
            await page.goto(`${this.baseUrl}/engenremap.html`, { 
                waitUntil: 'domcontentloaded',
                timeout: 15000 
            });
            
            // 智能等待：等到元素出現，而不是固定時間
            console.log('⏰ 等待 genre 元素載入...');
            await page.waitForSelector('.genre.scanme', { timeout: 10000 });
            
            // 確保所有 genre 元素都載入完成
            await page.waitForFunction(() => {
                return document.querySelectorAll('.genre.scanme').length > 100;
            }, { timeout: 8000 });
            
            const genres = await page.evaluate(() => {
                const genreElements = Array.from(document.querySelectorAll('.genre.scanme'));
                console.log(`找到 ${genreElements.length} 個 genre 元素`);
                
                return genreElements.map(el => {
                    const text = el.textContent?.trim().replace(/»\s*$/, '').trim() || '';
                    const previewUrl = el.getAttribute('preview_url') || '';
                    const title = el.getAttribute('title') || '';
                    const navLink = el.querySelector('a.navlink');
                    const genrePageUrl = navLink ? navLink.getAttribute('href') : '';
                    
                    return {
                        name: text,
                        previewUrl: previewUrl,
                        title: title,
                        genrePageUrl: genrePageUrl,
                        hasAudio: !!previewUrl
                    };
                }).filter(genre => genre.name && genre.name.length > 0);
            });
            
            await page.close();
            
            console.log(`✅ 優化載入完成：${genres.length} 個 genres（耗時更少）`);
            
            // 取前 50 個並打亂順序
            this.genres = genres.slice(0, 50).sort(() => 0.5 - Math.random());
            return this.genres;
            
        } catch (error) {
            console.error('❌ 優化載入失敗:', error.message);
            return this.getFallbackGenres();
        }
    }

    // 預載入策略：一次性載入多個熱門 genre 的藝人資料
    async preloadPopularGenres(genreNames = []) {
        console.log('🔄 預載入熱門 genres...');
        
        const popularGenres = genreNames.slice(0, 10); // 只預載入前 10 個
        const preloadPromises = popularGenres.map(async (genreName) => {
            try {
                const result = await this.getGenrePreviewFast(genreName);
                if (result) {
                    this.genreCache.set(genreName, result);
                }
                return { genre: genreName, success: !!result };
            } catch (error) {
                console.log(`預載入 ${genreName} 失敗:`, error.message);
                return { genre: genreName, success: false };
            }
        });
        
        const results = await Promise.allSettled(preloadPromises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        console.log(`✅ 預載入完成：${successful}/${popularGenres.length} 個 genres`);
    }

    // 快速版本：優先使用快取，減少頁面載入
    async getGenrePreviewFast(genreName) {
        // 先檢查快取
        if (this.genreCache.has(genreName)) {
            console.log(`⚡ 從快取獲取 ${genreName}`);
            return this.genreCache.get(genreName);
        }
        
        try {
            console.log(`🎵 快速載入: ${genreName}`);
            
            const genre = this.genres.find(g => g.name.toLowerCase() === genreName.toLowerCase());
            
            if (!genre || !genre.genrePageUrl) {
                console.log(`❌ 沒有找到 ${genreName} 的頁面連結`);
                return null;
            }
            
            if (!this.browser) {
                await this.init();
            }
            
            const page = await this.browser.newPage();
            
            // 更激進的優化設定
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const resourceType = request.resourceType();
                const url = request.url();
                
                // 只允許 HTML 和 必要的 JS
                if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                    request.abort();
                } else if (url.includes('p.scdn.co/mp3-preview/')) {
                    // 允許音頻預覽
                    request.continue();
                } else {
                    request.continue();
                }
            });
            
            // 攔截音頻 URL
            const audioUrls = [];
            page.on('request', request => {
                const url = request.url();
                if (url.includes('p.scdn.co/mp3-preview/')) {
                    audioUrls.push(url);
                }
            });
            
            const genrePageUrl = `${this.baseUrl}/${genre.genrePageUrl}`;
            console.log(`📍 快速載入 genre 頁面...`);
            
            await page.goto(genrePageUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 10000 
            });
            
            // 智能等待藝人元素
            await page.waitForSelector('.genre.scanme', { timeout: 5000 });
            
            const artistResult = await page.evaluate(() => {
                const artistElements = Array.from(document.querySelectorAll('.genre.scanme'));
                
                if (artistElements.length === 0) {
                    return { success: false };
                }
                
                const artists = artistElements.map(el => {
                    const text = el.textContent?.trim().replace(/»\s*$/, '').trim() || '';
                    const previewUrl = el.getAttribute('preview_url') || '';
                    const title = el.getAttribute('title') || '';
                    
                    return {
                        name: text,
                        previewUrl: previewUrl,
                        title: title,
                        hasPreviewUrl: !!previewUrl
                    };
                }).filter(artist => artist.name);
                
                // 優先選擇有音頻的藝人
                const artistsWithAudio = artists.filter(artist => artist.hasPreviewUrl);
                const finalArtists = artistsWithAudio.length > 0 ? artistsWithAudio : artists;
                
                if (finalArtists.length === 0) {
                    return { success: false };
                }
                
                // 隨機選擇
                const selected = finalArtists[Math.floor(Math.random() * finalArtists.length)];
                
                return {
                    success: true,
                    artistName: selected.name,
                    hoverInfo: selected.title,
                    previewUrl: selected.previewUrl,
                    totalArtists: artists.length,
                    hasPreviewUrl: selected.hasPreviewUrl
                };
            });
            
            await page.close();
            
            if (!artistResult.success) {
                return null;
            }
            
            const result = {
                ...artistResult,
                audioUrl: artistResult.previewUrl || (audioUrls.length > 0 ? audioUrls[0] : null),
                genre: genreName,
                timestamp: Date.now()
            };
            
            // 加入快取（5分鐘有效期）
            this.genreCache.set(genreName, result);
            setTimeout(() => {
                this.genreCache.delete(genreName);
            }, 5 * 60 * 1000);
            
            console.log(`✅ ${genreName} 快速載入完成`);
            return result;
            
        } catch (error) {
            console.error(`❌ 快速載入 ${genreName} 失敗:`, error.message);
            return null;
        }
    }

    // 生成問題（優化版本）
    async getRandomGenreQuestionOptimized() {
        try {
            if (this.genres.length === 0) {
                await this.scrapeGenresOptimized();
            }
            
            // 隨機選擇一個 genre
            const randomGenre = this.genres[Math.floor(Math.random() * this.genres.length)];
            console.log(`🎯 選擇音樂類型: ${randomGenre.name}`);
            
            // 使用快速載入
            const genreInfo = await this.getGenrePreviewFast(randomGenre.name);
            
            if (!genreInfo) {
                console.log('⚠️ 快速載入失敗，使用備用資料');
                return this.getFallbackQuestion(randomGenre);
            }
            
            // 生成干擾選項
            const wrongOptions = this.genres
                .filter(g => g.name !== randomGenre.name)
                .sort(() => 0.5 - Math.random())
                .slice(0, 2)
                .map(g => g.name);
            
            const options = [randomGenre.name, ...wrongOptions].sort(() => 0.5 - Math.random());
            const correctIndex = options.indexOf(randomGenre.name);
            
            // 改進的歌曲資訊處理
            let finalSongName = this.extractSongName(genreInfo.hoverInfo);
            let finalArtistName = this.extractArtistName(genreInfo.hoverInfo) || genreInfo.artistName;
            
            // 如果從 hoverInfo 沒有提取到合適的資訊，使用預設格式
            if (!finalSongName) {
                if (genreInfo.hoverInfo) {
                    // 如果有 hoverInfo，但無法解析，直接使用（讓前端去解析）
                    finalSongName = genreInfo.hoverInfo;
                } else {
                    // 沒有 hoverInfo，使用預設格式
                    finalSongName = `${genreInfo.artistName} 的歌曲`;
                }
            }
            
            console.log('歌曲資訊處理結果:', {
                originalHoverInfo: genreInfo.hoverInfo,
                extractedSongName: finalSongName,
                extractedArtistName: finalArtistName,
                originalArtistName: genreInfo.artistName
            });
            
            return {
                correctGenre: randomGenre.name,
                songName: finalSongName,
                artistName: finalArtistName,
                options: options,
                correctIndex: correctIndex,
                previewUrl: genreInfo.audioUrl,
                isRealSong: !!genreInfo.hoverInfo,
                originalHoverInfo: genreInfo.hoverInfo // 供調試用
            };
            
        } catch (error) {
            console.error('❌ 生成問題失敗:', error);
            throw error;
        }
    }

    extractSongName(hoverInfo) {
        if (!hoverInfo) return null;
        
        console.log('原始 hoverInfo:', hoverInfo);
        
        // 嘗試從懸浮資訊中提取歌曲名稱
        const patterns = [
            // 模式1: "e.g. Song Name by Artist Name"
            /e\.g\.\s*([^·]+?)\s+by\s+(.+)/i,
            // 模式2: "e.g. Song Name · Artist Name"  
            /e\.g\.\s*([^·]+?)\s*·\s*(.+)/i,
            // 模式3: "Song Name by Artist Name"
            /^([^·]+?)\s+by\s+(.+)/i,
            // 模式4: "Song Name · Artist Name"
            /^([^·]+?)\s*·\s*(.+)/i,
            // 模式5: 雙引號內的內容
            /"([^"]+)"/,
            // 模式6: 第一個括號之前的內容
            /^([^(]+)/
        ];
        
        for (const pattern of patterns) {
            const match = hoverInfo.match(pattern);
            if (match && match[1] && match[1].trim().length > 2) {
                const extracted = match[1].trim();
                console.log('提取的歌曲名稱:', extracted);
                return extracted;
            }
        }
        
        // 如果都沒匹配到，嘗試清理 e.g. 前綴
        const cleaned = hoverInfo.replace(/^e\.g\.\s*/, '').trim();
        if (cleaned.length > 2) {
            console.log('清理後的內容:', cleaned);
            return cleaned;
        }
        
        return null;
    }

    // 新增：提取藝人名稱的方法
    extractArtistName(hoverInfo) {
        if (!hoverInfo) return null;
        
        // 嘗試從懸浮資訊中提取藝人名稱
        const patterns = [
            // 模式1: "e.g. Song Name by Artist Name"
            /e\.g\.\s*([^·]+?)\s+by\s+(.+)/i,
            // 模式2: "e.g. Song Name · Artist Name"
            /e\.g\.\s*([^·]+?)\s*·\s*(.+)/i,
            // 模式3: "Song Name by Artist Name"
            /^([^·]+?)\s+by\s+(.+)/i,
            // 模式4: "Song Name · Artist Name"
            /^([^·]+?)\s*·\s*(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = hoverInfo.match(pattern);
            if (match && match[2] && match[2].trim().length > 1) {
                return match[2].trim();
            }
        }
        
        return null;
    }

    getFallbackQuestion(genre) {
        return {
            correctGenre: genre.name,
            songName: `${genre.name} 風格音樂`,
            artistName: '範例藝人',
            options: [genre.name, 'pop', 'rock'],
            correctIndex: 0,
            previewUrl: genre.previewUrl || null,
            isRealSong: false
        };
    }

    getFallbackGenres() {
        const fallbackGenres = [
            'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical', 'country', 'r&b',
            'folk', 'blues', 'reggae', 'punk', 'metal', 'indie', 'alternative', 'funk'
        ];

        return fallbackGenres.map(genre => ({
            name: genre,
            genrePageUrl: `engenremap-${genre}.html`,
            previewUrl: null,
            hasAudio: false
        }));
    }
}

module.exports = OptimizedMusicGenreScraper;
