const puppeteer = require('puppeteer');

async function visualDebugTwoStageFlow() {
    console.log('🚀 啟動可視化兩階段流程調試...');
    console.log('這將開啟一個瀏覽器窗口，你可以看到整個抓取過程');
    
    // 啟動非無頭模式的瀏覽器，這樣你可以看到所有操作
    const browser = await puppeteer.launch({
        headless: false, // 設為 false 讓你看到瀏覽器
        devtools: true,  // 開啟開發者工具
        slowMo: 1000,   // 每個操作間隔 1 秒，方便觀察
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 攔截所有網路請求以便觀察
        const audioUrls = [];
        page.on('request', request => {
            const url = request.url();
            console.log(`📡 請求: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
            
            if (url.includes('p.scdn.co/mp3-preview/') || url.includes('.mp3') || url.includes('.m4a')) {
                audioUrls.push(url);
                console.log(`🎧 *** 音頻請求: ${url}`);
            }
        });

        page.on('response', response => {
            if (response.url().includes('p.scdn.co/mp3-preview/')) {
                console.log(`🎵 *** 音頻回應: ${response.url()} (狀態: ${response.status()})`);
            }
        });

        console.log('\n📍 階段 1: 前往 everynoise.com 主頁面');
        await page.goto('https://everynoise.com/engenremap.html', { 
            waitUntil: 'domcontentloaded', 
            timeout: 20000 
        });

        console.log('⏰ 等待頁面載入... (5秒)');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 顯示所有可用的 genre 元素
        console.log('\n🔍 分析主頁面上的 genre 元素...');
        const genres = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const genreElements = [];
            
            for (let el of allElements) {
                const text = el.textContent?.trim() || '';
                const style = el.getAttribute('style') || '';
                
                if (text && text.length > 0 && text.length < 50 && 
                    style.includes('color') && 
                    (style.includes('top') || style.includes('position')) &&
                    !text.includes('»') && !text.includes('←') && !text.includes('→') &&
                    !text.includes('Every Noise') &&
                    !text.includes('spotify') &&
                    !text.includes('.com')) {
                    genreElements.push({
                        text: text,
                        style: style.substring(0, 100) // 截取部分樣式用於調試
                    });
                }
            }
            
            return genreElements.slice(0, 10); // 只返回前 10 個作為示例
        });

        console.log(`✅ 找到 ${genres.length} 個 genre 元素 (顯示前 10 個):`);
        genres.forEach((genre, index) => {
            console.log(`  ${index + 1}. "${genre.text}" (樣式: ${genre.style})`);
        });

        if (genres.length === 0) {
            console.log('❌ 沒有找到任何 genre 元素!');
            await browser.close();
            return;
        }

        // 選擇第一個 genre 進行測試
        const selectedGenre = genres[0].text;
        console.log(`\n🎯 選擇測試 genre: "${selectedGenre}"`);

        // 點擊選擇的 genre
        console.log('🖱️ 點擊 genre...');
        const clickResult = await page.evaluate((targetGenre) => {
            const allElements = Array.from(document.querySelectorAll('*'));
            
            for (let el of allElements) {
                const text = el.textContent?.trim() || '';
                const style = el.getAttribute('style') || '';
                
                if (text === targetGenre && 
                    style.includes('color') && 
                    (style.includes('top') || style.includes('position'))) {
                    console.log(`點擊 genre: ${text}`);
                    el.click();
                    return { success: true, text: text };
                }
            }
            
            return { success: false };
        }, selectedGenre);

        if (!clickResult.success) {
            console.log('❌ 無法點擊 genre');
            await browser.close();
            return;
        }

        console.log('✅ 已點擊 genre，等待跳轉...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n📍 階段 2: 分析 genre 頁面的藝人元素');
        
        // 取得當前頁面 URL 以確認是否跳轉成功
        const currentUrl = page.url();
        console.log(`📍 當前頁面: ${currentUrl}`);

        // 分析藝人元素
        const artists = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const artistElements = [];
            
            for (let el of allElements) {
                const text = el.textContent?.trim() || '';
                const style = el.getAttribute('style') || '';
                
                if (text && text.length > 0 && text.length < 80 && 
                    style.includes('color') && 
                    (style.includes('top') || style.includes('position')) &&
                    !text.includes('»') && !text.includes('←') && !text.includes('→') &&
                    !text.includes('Every Noise') &&
                    !text.includes('spotify') &&
                    !text.includes('.com')) {
                    artistElements.push({
                        text: text,
                        style: style.substring(0, 100)
                    });
                }
            }
            
            return artistElements.slice(0, 15); // 返回前 15 個
        });

        console.log(`✅ 在 genre 頁面找到 ${artists.length} 個藝人元素:`);
        artists.forEach((artist, index) => {
            console.log(`  ${index + 1}. "${artist.text}"`);
        });

        if (artists.length === 0) {
            console.log('❌ 沒有在 genre 頁面找到藝人元素!');
            await browser.close();
            return;
        }

        // 選擇一個藝人進行測試
        const selectedArtist = artists[0].text;
        console.log(`\n🎤 選擇測試藝人: "${selectedArtist}"`);

        // 先懸浮在藝人上
        console.log('👆 懸浮在藝人上獲取懸浮文字...');
        await page.evaluate((targetArtist) => {
            const allElements = Array.from(document.querySelectorAll('*'));
            
            for (let el of allElements) {
                const text = el.textContent?.trim() || '';
                if (text === targetArtist) {
                    const mouseoverEvent = new MouseEvent('mouseover', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                    });
                    el.dispatchEvent(mouseoverEvent);
                    console.log(`懸浮在: ${text}`);
                    break;
                }
            }
        }, selectedArtist);

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 檢查懸浮文字
        const hoverInfo = await page.evaluate(() => {
            // 尋找可能的懸浮文字元素
            const tooltip = document.querySelector('[title]');
            if (tooltip && tooltip.title) {
                return tooltip.title;
            }
            
            // 尋找其他可能顯示歌曲資訊的元素
            const infoElements = document.querySelectorAll('div, span, p');
            for (let el of infoElements) {
                const text = el.textContent?.trim() || '';
                if (text.includes('e.g.') || text.includes('例如') || 
                    (text.includes('"') && text.includes(' - '))) {
                    return text;
                }
            }
            
            return null;
        });

        if (hoverInfo) {
            console.log(`✅ 獲取到懸浮文字: "${hoverInfo}"`);
            
            // 嘗試解析懸浮文字
            let songName = null;
            let artistName = null;
            
            // 格式 1: 'e.g. Artist "Song Title"'
            let match = hoverInfo.match(/e\.g\.?\s*([^"]+)[""]([^"""]+)["'"]/i);
            if (match) {
                artistName = match[1].trim();
                songName = match[2].trim();
                console.log(`🎵 解析結果 (格式1): "${songName}" by ${artistName}`);
            } else {
                // 格式 2: 'Artist - Song Title'
                match = hoverInfo.match(/([^-]+)\s*-\s*(.+)/);
                if (match) {
                    artistName = match[1].trim();
                    songName = match[2].trim();
                    console.log(`🎵 解析結果 (格式2): "${songName}" by ${artistName}`);
                } else {
                    console.log('⚠️ 無法解析懸浮文字格式');
                }
            }
        } else {
            console.log('⚠️ 沒有獲取到懸浮文字');
        }

        // 點擊藝人播放音樂
        console.log('🖱️ 點擊藝人播放音樂...');
        await page.evaluate((targetArtist) => {
            const allElements = Array.from(document.querySelectorAll('*'));
            
            for (let el of allElements) {
                const text = el.textContent?.trim() || '';
                if (text === targetArtist) {
                    el.click();
                    console.log(`點擊播放: ${text}`);
                    break;
                }
            }
        }, selectedArtist);

        console.log('⏰ 等待音頻載入... (5秒)');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n📊 調試結果總結:');
        console.log(`🎯 選擇的 genre: ${selectedGenre}`);
        console.log(`🎤 選擇的藝人: ${selectedArtist}`);
        console.log(`📝 懸浮文字: ${hoverInfo || '無'}`);
        console.log(`🎧 攔截到的音頻 URLs: ${audioUrls.length} 個`);
        
        if (audioUrls.length > 0) {
            console.log('✅ 音頻 URLs:');
            audioUrls.forEach((url, index) => {
                console.log(`  ${index + 1}. ${url}`);
            });
        } else {
            console.log('❌ 沒有攔截到音頻請求');
        }

        console.log('\n👀 瀏覽器將保持開啟 30 秒供你檢查...');
        console.log('你可以手動操作頁面來測試其他功能');
        await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
        console.error('❌ 調試過程中出錯:', error);
    }

    await browser.close();
    console.log('🏁 可視化調試結束');
}

visualDebugTwoStageFlow();
