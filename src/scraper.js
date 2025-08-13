const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

class MusicGenreScraper {
    constructor() {
        this.browser = null;
        this.genres = [];
        this.baseUrl = 'https://everynoise.com';
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    // 清理資源（定期清理瀏覽器實例）
    async cleanup() {
        if (this.browser) {
            const pages = await this.browser.pages();
            if (pages.length > 10) { // 如果頁面太多，重啟瀏覽器
                await this.close();
                await this.init();
            }
        }
    }

    // 從 everynoise.com 獲取所有音樂類型 (使用正確的選擇器)
    async scrapeGenres() {
        try {
            console.log('🔍 使用 Puppeteer 從 everynoise.com 獲取 genres...');
            
            if (!this.browser) {
                await this.init();
            }
            
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            console.log('📍 訪問 everynoise.com...');
            await page.goto(`${this.baseUrl}/engenremap.html`, { 
                waitUntil: 'domcontentloaded', 
                timeout: 20000 
            });
            
            // 等待頁面完全載入
            console.log('⏰ 等待頁面載入完成...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 使用正確的選擇器獲取 genre 元素
            const genres = await page.evaluate(() => {
                console.log('🔍 尋找 class="genre scanme" 的元素...');
                
                // 選擇所有具有 "genre scanme" class 的元素
                const genreElements = Array.from(document.querySelectorAll('.genre.scanme'));
                console.log(`找到 ${genreElements.length} 個 genre 元素`);
                
                const foundGenres = [];
                
                genreElements.forEach((el, index) => {
                    const text = el.textContent?.trim() || '';
                    const previewUrl = el.getAttribute('preview_url') || '';
                    const onclick = el.getAttribute('onclick') || '';
                    const title = el.getAttribute('title') || '';
                    const navLink = el.querySelector('a.navlink');
                    const genrePageUrl = navLink ? navLink.getAttribute('href') : '';
                    
                    // 移除導航符號 "»" 
                    const cleanText = text.replace(/»\s*$/, '').trim();
                    
                    if (cleanText && cleanText.length > 0) {
                        foundGenres.push({
                            name: cleanText,
                            previewUrl: previewUrl,
                            title: title, // 懸浮文字，包含歌曲資訊
                            onclick: onclick,
                            genrePageUrl: genrePageUrl,
                            element: 'div.genre.scanme'
                        });
                        
                        // 只顯示前 5 個作為調試
                        if (index < 5) {
                            console.log(`Genre ${index + 1}: "${cleanText}"`);
                            console.log(`  預覽URL: ${previewUrl}`);
                            console.log(`  懸浮文字: ${title}`);
                            console.log(`  頁面連結: ${genrePageUrl}`);
                        }
                    }
                });
                
                return foundGenres;
            });
            
            await page.close();
            
            console.log(`✅ 成功獲取 ${genres.length} 個真正的 genre`);
            
            if (genres.length > 0) {
                // 取前 50 個並打亂順序
                const shuffledGenres = genres
                    .slice(0, 50)
                    .sort(() => 0.5 - Math.random());
                
                this.genres = shuffledGenres;
                
                console.log('📋 前 10 個 genres:');
                this.genres.slice(0, 10).forEach((genre, index) => {
                    console.log(`  ${index + 1}. "${genre.name}" ${genre.previewUrl ? '🎵' : '❌'}`);
                });
                
                return this.genres;
            } else {
                console.log('⚠️ 沒有找到 .genre.scanme 元素，使用備用方案...');
                return this.getFallbackGenres();
            }
            
        } catch (error) {
            console.error('❌ 獲取 genres 時出錯:', error.message);
            console.log('🔄 嘗試備用方案...');
            return this.getFallbackGenres();
        }
    }

    // 預設類型列表（當爬蟲失敗時使用）
    getFallbackGenres() {
        const fallbackGenres = [
            'pop', 'rock', 'hip hop', 'electronic', 'jazz', 'classical', 'country', 'r&b',
            'folk', 'blues', 'reggae', 'punk', 'metal', 'indie', 'alternative', 'funk',
            'soul', 'disco', 'techno', 'house', 'trance', 'dubstep', 'trap', 'lo-fi'
        ];

        this.genres = fallbackGenres.map(genre => ({
            name: genre,
            url: `${this.baseUrl}/engenremap-${encodeURIComponent(genre)}.html`
        }));

        return this.genres;
    }

    // 實現兩階段流程：主頁面選genre → 跳轉genre頁面 → 選擇歌手
    async getGenrePreview(genreName) {
        try {
            console.log(`🎵 開始兩階段流程獲取: ${genreName}`);
            
            // 尋找對應的 genre 資料（包含 genrePageUrl）
            const genre = this.genres.find(g => g.name.toLowerCase() === genreName.toLowerCase());
            
            if (!genre || !genre.genrePageUrl) {
                console.log(`❌ 沒有找到 ${genreName} 的頁面連結`);
                return null;
            }
            
            if (!this.browser) {
                await this.init();
            }
            
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 攔截音頻請求
            const audioUrls = [];
            page.on('request', request => {
                const url = request.url();
                if (url.includes('p.scdn.co/mp3-preview/') || url.includes('.mp3') || url.includes('.m4a')) {
                    audioUrls.push(url);
                    console.log(`🎧 攔截到音頻請求: ${url}`);
                }
            });
            
            // 階段1: 跳轉到 genre 詳細頁面
            const genrePageUrl = `${this.baseUrl}/${genre.genrePageUrl}`;
            console.log(`📍 階段1: 跳轉到 genre 頁面 - ${genrePageUrl}`);
            
            await page.goto(genrePageUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });
            
            console.log('⏰ 等待 genre 頁面載入完成...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 階段2: 分析該 genre 頁面的歌手元素
            const artistResult = await page.evaluate(() => {
                console.log('🎤 分析 genre 頁面中的歌手元素...');
                
                // 在 genre 頁面尋找歌手元素，使用相同的 .genre.scanme 選擇器
                const artistElements = Array.from(document.querySelectorAll('.genre.scanme'));
                console.log(`找到 ${artistElements.length} 個歌手元素 (.genre.scanme)`);
                
                const artists = [];
                
                artistElements.forEach((el, index) => {
                    const text = el.textContent?.trim() || '';
                    const previewUrl = el.getAttribute('preview_url') || '';
                    const onclick = el.getAttribute('onclick') || '';
                    const title = el.getAttribute('title') || '';
                    const navLink = el.querySelector('a.navlink');
                    
                    // 移除導航符號 "»" 
                    const cleanText = text.replace(/»\s*$/, '').trim();
                    
                    if (cleanText && cleanText.length > 0) {
                        artists.push({
                            name: cleanText,
                            previewUrl: previewUrl,
                            title: title, // 懸浮文字，包含歌曲資訊
                            onclick: onclick,
                            hasPreviewUrl: !!previewUrl,
                            element: el
                        });
                        
                        // 只顯示前 5 個作為調試
                        if (index < 5) {
                            console.log(`歌手 ${index + 1}: "${cleanText}"`);
                            console.log(`  預覽URL: ${previewUrl ? '✅' : '❌'}`);
                            console.log(`  懸浮文字: ${title || '無'}`);
                        }
                    }
                });
                
                if (artists.length === 0) {
                    console.log('❌ 沒有找到歌手元素');
                    return { success: false };
                }
                
                // 優先選擇有 preview_url 的歌手
                const artistsWithPreview = artists.filter(artist => artist.hasPreviewUrl);
                const selectedArtists = artistsWithPreview.length > 0 ? artistsWithPreview : artists;
                
                // 隨機選擇一個歌手
                const randomIndex = Math.floor(Math.random() * selectedArtists.length);
                const selectedArtist = selectedArtists[randomIndex];
                
                console.log(`🎯 隨機選擇歌手: ${selectedArtist.name}`);
                console.log(`  有音頻: ${selectedArtist.hasPreviewUrl ? '✅' : '❌'}`);
                console.log(`  懸浮文字: ${selectedArtist.title || '無'}`);
                
                // 懸浮在歌手上（如果有懸浮文字的話）
                if (selectedArtist.title) {
                    try {
                        const mouseoverEvent = new MouseEvent('mouseover', {
                            view: window,
                            bubbles: true,
                            cancelable: true,
                        });
                        selectedArtist.element.dispatchEvent(mouseoverEvent);
                    } catch (e) {
                        console.log('懸浮事件失敗:', e.message);
                    }
                }
                
                // 點擊歌手播放音樂
                try {
                    selectedArtist.element.click();
                    console.log(`🖱️ 點擊播放歌手: ${selectedArtist.name}`);
                } catch (e) {
                    console.log('點擊事件失敗:', e.message);
                }
                
                return {
                    success: true,
                    artistName: selectedArtist.name,
                    hoverInfo: selectedArtist.title,
                    previewUrl: selectedArtist.previewUrl,
                    totalArtists: artists.length,
                    hasPreviewUrl: selectedArtist.hasPreviewUrl
                };
            });
            
            if (!artistResult.success) {
                console.log('❌ 無法在 genre 頁面找到歌手');
                await page.close();
                return null;
            }
            
            console.log(`✅ 歌手資訊: ${artistResult.artistName}`);
            console.log(`📝 懸浮資訊: ${artistResult.hoverInfo || '無'}`);
            console.log(`👥 該 genre 共有 ${artistResult.totalArtists} 個歌手`);
            console.log(`🎧 歌手有預覽音頻: ${artistResult.hasPreviewUrl ? '是' : '否'}`);
            
            // 等待音頻載入
            console.log('⏰ 等待音頻載入...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            await page.close();
            
            // 決定最終的音頻 URL（優先使用歌手的 preview_url，否則使用攔截到的）
            const finalAudioUrl = artistResult.previewUrl || (audioUrls.length > 0 ? audioUrls[0] : null);
            
            console.log(`🎵 最終音頻來源: ${artistResult.previewUrl ? '歌手預覽URL' : (audioUrls.length > 0 ? '攔截請求' : '無音頻')}`);
            
            // 回傳結果
            const result = {
                audioUrl: finalAudioUrl,
                artistName: artistResult.artistName,
                hoverInfo: artistResult.hoverInfo,
                genreName: genreName,
                totalArtists: artistResult.totalArtists
            };
            
            console.log(`🎉 兩階段流程完成:`, {
                ...result,
                audioUrl: result.audioUrl ? `${result.audioUrl.substring(0, 50)}...` : '無音頻'
            });
            
            return result;
            
        } catch (error) {
            console.error(`❌ 兩階段流程錯誤:`, error.message);
            return null;
        }
    }
    
    // 使用 Puppeteer 獲取音樂預覽
    async getGenrePreviewWithPuppeteer(genreName) {
        try {
            if (!this.browser) {
                await this.init();
            }
            
            console.log(`Using Puppeteer for ${genreName}`);
            const page = await this.browser.newPage();
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // 監聽網路請求中的音頻文件
            const audioRequests = [];
            page.on('request', request => {
                const url = request.url();
                if (url.includes('.mp3') || url.includes('.m4a') || url.includes('.wav')) {
                    audioRequests.push(url);
                    console.log(`Intercepted audio request: ${url}`);
                }
            });
            
            await page.goto(this.baseUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 10000 
            });
            
            // 尋找並點擊類型元素
            const clicked = await page.evaluate((targetGenre) => {
                const divs = Array.from(document.querySelectorAll('div'));
                const genreDiv = divs.find(div => 
                    div.textContent.trim().toLowerCase() === targetGenre.toLowerCase() &&
                    div.style.color
                );
                
                if (genreDiv) {
                    genreDiv.click();
                    return true;
                }
                return false;
            }, genreName);
            
            if (clicked) {
                // 等待音頻載入
                await page.waitForTimeout(3000);
                
                // 如果有攔截到音頻請求，返回第一個
                if (audioRequests.length > 0) {
                    await page.close();
                    return audioRequests[0];
                }
            }
            
            await page.close();
            return null;
            
        } catch (error) {
            console.error(`Puppeteer error for ${genreName}:`, error.message);
            return null;
        }
    }

    // 替代方法獲取類型預覽
    async getAlternativeGenrePreview(genreName) {
        try {
            console.log(`Trying alternative approach for ${genreName}`);
            
            if (!this.browser) {
                await this.init();
            }
            
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // 嘗試訪問主頁面
            await page.goto(this.baseUrl, { 
                waitUntil: 'domcontentloaded', 
                timeout: 15000 
            });
            
            // 等待頁面完全載入
            await page.waitForTimeout(3000);
            
            // 尋找並點擊類型
            const audioUrl = await page.evaluate(async (targetGenre) => {
                // 尋找所有包含類型名稱的元素
                const allDivs = Array.from(document.querySelectorAll('div'));
                const genreElement = allDivs.find(el => 
                    el.textContent.trim().toLowerCase() === targetGenre.toLowerCase() &&
                    el.style.color && 
                    !el.textContent.includes('»') &&
                    !el.textContent.includes('←') &&
                    !el.textContent.includes('→')
                );
                
                if (genreElement) {
                    console.log(`Found genre element for: ${targetGenre}`);
                    
                    // 模擬點擊
                    genreElement.click();
                    
                    // 等待音頻載入
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // 尋找播放的音頻
                    const audioElements = document.querySelectorAll('audio');
                    if (audioElements.length > 0) {
                        for (let audio of audioElements) {
                            if (audio.src) {
                                console.log(`Found audio: ${audio.src}`);
                                return audio.src;
                            }
                        }
                    }
                    
                    // 尋找可能的音頻連結
                    const scripts = document.querySelectorAll('script');
                    for (let script of scripts) {
                        const content = script.textContent || script.innerHTML;
                        if (content.includes('.mp3') || content.includes('.wav') || content.includes('.m4a')) {
                            const audioMatch = content.match(/(https?:\/\/[^\s'"]+\.(mp3|wav|m4a))/i);
                            if (audioMatch) {
                                console.log(`Found audio URL in script: ${audioMatch[1]}`);
                                return audioMatch[1];
                            }
                        }
                    }
                    
                    // 檢查是否有內嵌的播放器
                    const embedElements = document.querySelectorAll('embed, object, iframe');
                    for (let embed of embedElements) {
                        const src = embed.src || embed.data;
                        if (src && (src.includes('.mp3') || src.includes('.wav') || src.includes('.m4a'))) {
                            console.log(`Found embedded audio: ${src}`);
                            return src;
                        }
                    }
                }
                
                return null;
            }, genreName);
            
            await page.close();
            
            if (audioUrl) {
                console.log(`Successfully found audio for ${genreName}: ${audioUrl}`);
                return audioUrl.startsWith('http') ? audioUrl : `${this.baseUrl}/${audioUrl}`;
            }
            
            return null;
            
        } catch (error) {
            console.error(`Error in alternative approach for ${genreName}:`, error);
            return null;
        }
    }
    async getMainPageGenrePreview(genreName) {
        try {
            if (!this.browser) {
                await this.init();
            }
            
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            await page.goto(this.baseUrl, { 
                waitUntil: 'networkidle2', 
                timeout: 10000 
            });
            
            // 尋找對應的類型元素並點擊
            const audioUrl = await page.evaluate((targetGenre) => {
                // 尋找包含目標類型名稱的元素
                const genreElements = Array.from(document.querySelectorAll('div')).filter(el => 
                    el.textContent.trim().toLowerCase() === targetGenre.toLowerCase()
                );
                
                if (genreElements.length > 0) {
                    // 模擬點擊並嘗試獲取播放的音頻
                    const genreElement = genreElements[0];
                    genreElement.click();
                    
                    // 等待一下看是否有音頻元素出現
                    setTimeout(() => {
                        const audioElements = document.querySelectorAll('audio');
                        if (audioElements.length > 0) {
                            return audioElements[0].src;
                        }
                    }, 1000);
                }
                
                return null;
            }, genreName);
            
            await page.close();
            return audioUrl;
            
        } catch (error) {
            console.error(`Error getting main page preview for ${genreName}:`, error);
            return null;
        }
    }
    async getGenreSongs(genreName) {
        try {
            // 擴展的歌曲列表對應不同類型
            const genreSongs = {
                'pop': [
                    { song: 'Shape of You', artist: 'Ed Sheeran' },
                    { song: 'Blinding Lights', artist: 'The Weeknd' },
                    { song: 'Watermelon Sugar', artist: 'Harry Styles' },
                    { song: 'Levitating', artist: 'Dua Lipa' },
                    { song: 'Anti-Hero', artist: 'Taylor Swift' },
                    { song: 'As It Was', artist: 'Harry Styles' },
                    { song: 'Good 4 U', artist: 'Olivia Rodrigo' }
                ],
                'rock': [
                    { song: 'Bohemian Rhapsody', artist: 'Queen' },
                    { song: 'Stairway to Heaven', artist: 'Led Zeppelin' },
                    { song: 'Hotel California', artist: 'Eagles' },
                    { song: 'Sweet Child O Mine', artist: 'Guns N Roses' },
                    { song: 'Thunderstruck', artist: 'AC/DC' },
                    { song: 'Don\'t Stop Believin\'', artist: 'Journey' },
                    { song: 'We Will Rock You', artist: 'Queen' }
                ],
                'hip hop': [
                    { song: 'God\'s Plan', artist: 'Drake' },
                    { song: 'HUMBLE.', artist: 'Kendrick Lamar' },
                    { song: 'Sicko Mode', artist: 'Travis Scott' },
                    { song: 'Lose Yourself', artist: 'Eminem' },
                    { song: 'Empire State of Mind', artist: 'Jay-Z' },
                    { song: 'Old Town Road', artist: 'Lil Nas X' },
                    { song: 'Industry Baby', artist: 'Lil Nas X' }
                ],
                'electronic': [
                    { song: 'One More Time', artist: 'Daft Punk' },
                    { song: 'Bangarang', artist: 'Skrillex' },
                    { song: 'Levels', artist: 'Avicii' },
                    { song: 'Strobe', artist: 'Deadmau5' },
                    { song: 'Closer', artist: 'The Chainsmokers' },
                    { song: 'Scary Monsters', artist: 'Skrillex' },
                    { song: 'Ghosts \'n\' Stuff', artist: 'Deadmau5' }
                ],
                'jazz': [
                    { song: 'Take Five', artist: 'Dave Brubeck' },
                    { song: 'So What', artist: 'Miles Davis' },
                    { song: 'A Love Supreme', artist: 'John Coltrane' },
                    { song: 'What a Wonderful World', artist: 'Louis Armstrong' },
                    { song: 'Summertime', artist: 'Ella Fitzgerald' },
                    { song: 'Kind of Blue', artist: 'Miles Davis' },
                    { song: 'Fly Me to the Moon', artist: 'Frank Sinatra' }
                ],
                'classical': [
                    { song: 'Symphony No. 9', artist: 'Beethoven' },
                    { song: 'The Four Seasons', artist: 'Vivaldi' },
                    { song: 'Eine kleine Nachtmusik', artist: 'Mozart' },
                    { song: 'Canon in D', artist: 'Pachelbel' },
                    { song: 'Clair de Lune', artist: 'Debussy' },
                    { song: 'Für Elise', artist: 'Beethoven' },
                    { song: 'Ave Maria', artist: 'Schubert' }
                ],
                'trap': [
                    { song: 'Mask Off', artist: 'Future' },
                    { song: 'XO TOUR Llif3', artist: 'Lil Uzi Vert' },
                    { song: 'Tunnel Vision', artist: 'Kodak Black' },
                    { song: 'Bad and Boujee', artist: 'Migos' },
                    { song: 'HUMBLE.', artist: 'Kendrick Lamar' },
                    { song: 'DNA.', artist: 'Kendrick Lamar' },
                    { song: 'Rockstar', artist: 'Post Malone' }
                ],
                'indie': [
                    { song: 'Do I Wanna Know?', artist: 'Arctic Monkeys' },
                    { song: 'Last Nite', artist: 'The Strokes' },
                    { song: 'A-Punk', artist: 'Vampire Weekend' },
                    { song: 'Feels Like We Only Go Backwards', artist: 'Tame Impala' },
                    { song: 'Chamber of Reflection', artist: 'Mac DeMarco' },
                    { song: 'Somebody Else', artist: 'The 1975' },
                    { song: 'Electric Feel', artist: 'MGMT' }
                ],
                'country': [
                    { song: 'Ring of Fire', artist: 'Johnny Cash' },
                    { song: 'Friends in Low Places', artist: 'Garth Brooks' },
                    { song: 'Before He Cheats', artist: 'Carrie Underwood' },
                    { song: 'The Gambler', artist: 'Kenny Rogers' },
                    { song: 'Jolene', artist: 'Dolly Parton' },
                    { song: 'Sweet Caroline', artist: 'Neil Diamond' },
                    { song: 'Wagon Wheel', artist: 'Darius Rucker' }
                ],
                'alternative': [
                    { song: 'Smells Like Teen Spirit', artist: 'Nirvana' },
                    { song: 'Creep', artist: 'Radiohead' },
                    { song: 'Mr. Brightside', artist: 'The Killers' },
                    { song: 'Seven Nation Army', artist: 'The White Stripes' },
                    { song: 'Zombie', artist: 'The Cranberries' },
                    { song: 'Basket Case', artist: 'Green Day' },
                    { song: 'Wonderwall', artist: 'Oasis' }
                ],
                'funk': [
                    { song: 'Superstition', artist: 'Stevie Wonder' },
                    { song: 'Give Up the Funk', artist: 'Parliament' },
                    { song: 'Flash Light', artist: 'Parliament' },
                    { song: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars' },
                    { song: 'I Got You (I Feel Good)', artist: 'James Brown' },
                    { song: 'Le Freak', artist: 'Chic' },
                    { song: 'Play That Funky Music', artist: 'Wild Cherry' }
                ],
                'metal': [
                    { song: 'Master of Puppets', artist: 'Metallica' },
                    { song: 'The Number of the Beast', artist: 'Iron Maiden' },
                    { song: 'Paranoid', artist: 'Black Sabbath' },
                    { song: 'Breaking the Law', artist: 'Judas Priest' },
                    { song: 'Raining Blood', artist: 'Slayer' },
                    { song: 'Enter Sandman', artist: 'Metallica' },
                    { song: 'Run to the Hills', artist: 'Iron Maiden' }
                ]
            };

            // 先檢查精確匹配
            let songs = genreSongs[genreName.toLowerCase()];
            
            if (!songs) {
                // 如果沒有精確匹配，嘗試部分匹配
                const partialMatch = Object.keys(genreSongs).find(key => 
                    key.includes(genreName.toLowerCase()) || genreName.toLowerCase().includes(key)
                );
                
                if (partialMatch) {
                    songs = genreSongs[partialMatch];
                    console.log(`Using partial match "${partialMatch}" for genre "${genreName}"`);
                } else {
                    // 如果還是找不到，使用通用的流行音樂
                    console.log(`No match found for genre "${genreName}", using pop songs`);
                    songs = genreSongs['pop'];
                }
            }
            
            return songs;
        } catch (error) {
            console.error(`Error fetching songs for ${genreName}:`, error);
            // 出錯時返回預設的流行歌曲
            return [
                { song: 'Shape of You', artist: 'Ed Sheeran' },
                { song: 'Blinding Lights', artist: 'The Weeknd' }
            ];
        }
    }

    // 獲取歌曲資訊（簡化版，不重複執行兩階段流程）
    async getSongInfo(songName, artistName, genreName, isRealSong = false, previewUrl = null) {
        try {
            console.log(`🎵 整理歌曲資訊: ${genreName}`);
            
            // 生成封面圖片
            const randomCover = `https://via.placeholder.com/300x300/667eea/ffffff?text=${encodeURIComponent(artistName)}`;
            
            return {
                songName: songName,
                artistName: artistName,
                albumCover: randomCover,
                previewUrl: previewUrl, // 直接使用傳入的 URL，不重複獲取
                genreName: genreName
            };
            
        } catch (error) {
            console.error(`❌ 獲取歌曲資訊錯誤:`, error);
            return {
                songName: songName,
                artistName: artistName,
                albumCover: 'https://via.placeholder.com/300x300?text=No+Cover',
                previewUrl: null,
                genreName: genreName
            };
        }
    }

    // 生成隨機的音樂類型問題（使用兩階段流程）
    async getRandomGenreQuestion() {
        try {
            // 如果還沒有獲取類型列表，先獲取
            if (this.genres.length === 0) {
                await this.scrapeGenres();
            }

            if (this.genres.length < 3) {
                throw new Error('Not enough genres available');
            }

            // 隨機選擇一個正確答案
            const correctGenre = this.genres[Math.floor(Math.random() * this.genres.length)];
            
            // 隨機選擇兩個錯誤選項
            const wrongOptions = [];
            while (wrongOptions.length < 2) {
                const randomGenre = this.genres[Math.floor(Math.random() * this.genres.length)];
                if (randomGenre.name !== correctGenre.name && 
                    !wrongOptions.find(option => option.name === randomGenre.name)) {
                    wrongOptions.push(randomGenre);
                }
            }

            console.log(`🎯 選擇的正確類型: ${correctGenre.name}`);
            console.log(`🔗 genre 頁面連結: ${correctGenre.genrePageUrl || '無'}`);
            
            // 執行兩階段流程：跳轉到 genre 頁面並選擇歌手
            const artistData = await this.getGenrePreview(correctGenre.name);
            
            let songName, artistName;
            
            if (artistData) {
                // 解析從 genre 頁面獲得的歌手資訊
                console.log(`✅ 從 genre 頁面獲得歌手: ${artistData.artistName}`);
                
                if (artistData.hoverInfo) {
                    console.log(`📝 解析歌手懸浮文字: ${artistData.hoverInfo}`);
                    
                    // 嘗試解析不同的格式：'e.g. Artist "Song Title"'
                    const match = artistData.hoverInfo.match(/e\.g\.?\s*([^"]+)[""]([^"""]+)["'"]/i);
                    if (match) {
                        artistName = match[1].trim();
                        songName = match[2].trim();
                        console.log(`✅ 解析成功 - 歌曲: "${songName}", 藝人: ${artistName}`);
                    } else {
                        // 如果無法解析，使用歌手名稱
                        artistName = artistData.artistName;
                        songName = `${correctGenre.name} 音樂樣本`;
                        console.log(`⚠️ 無法解析懸浮文字，使用歌手名稱: ${artistName}`);
                    }
                } else {
                    // 如果沒有懸浮文字，使用歌手名稱
                    artistName = artistData.artistName;
                    songName = `${correctGenre.name} 音樂樣本`;
                    console.log(`📝 使用歌手名稱: ${artistName}`);
                }
                
                console.log(`👥 該 genre 共有 ${artistData.totalArtists} 個歌手可選擇`);
            } else {
                // 如果兩階段流程失敗，使用原始 genre 的懸浮文字
                console.log(`⚠️ 兩階段流程失敗，使用原始 genre 資訊`);
                
                if (correctGenre.title) {
                    const match = correctGenre.title.match(/e\.g\.?\s*([^"]+)[""]([^"""]+)["'"]/i);
                    if (match) {
                        artistName = match[1].trim();
                        songName = match[2].trim();
                    } else {
                        songName = `${correctGenre.name} 音樂樣本`;
                        artistName = '來自 Every Noise at Once';
                    }
                } else {
                    songName = `${correctGenre.name} 音樂樣本`;
                    artistName = '來自 Every Noise at Once';
                }
            }

            // 打亂選項順序
            const options = [correctGenre, ...wrongOptions];
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }

            return {
                correctGenre: correctGenre.name,
                songName: songName,
                artistName: artistName,
                genreName: correctGenre.name,
                options: options.map(option => option.name),
                correctIndex: options.findIndex(option => option.name === correctGenre.name),
                isRealSong: artistData ? true : false, // 如果成功獲取歌手資料就是真實歌曲
                previewUrl: artistData ? artistData.audioUrl : (correctGenre.previewUrl || null)
            };
        } catch (error) {
            console.error('Error generating random genre question:', error);
            throw error;
        }
    }
}

module.exports = new MusicGenreScraper();
