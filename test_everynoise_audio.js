const puppeteer = require('puppeteer');

async function testEverynoise() {
    console.log('🚀 啟動瀏覽器測試 everynoise.com...');
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 監聽所有網路請求
    page.on('request', request => {
        const url = request.url();
        if (url.includes('audio') || url.includes('.mp3') || url.includes('.m4a') || 
            url.includes('spotify') || url.includes('preview') || url.includes('track')) {
            console.log('🎵 攔截到相關請求:', url);
        }
    });
    
    // 監聽網路回應
    page.on('response', response => {
        const url = response.url();
        if (url.includes('audio') || url.includes('.mp3') || url.includes('.m4a') ||
            url.includes('preview') || url.includes('track')) {
            console.log('📥 收到音頻回應:', url, 'Status:', response.status());
        }
    });
    
    // 監聽控制台訊息
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('audio') || text.includes('play') || text.includes('click')) {
            console.log('📢 控制台:', text);
        }
    });
    
    console.log('🌐 訪問 everynoise.com...');
    await page.goto('https://everynoise.com/engenremap.html', { 
        waitUntil: 'networkidle0', 
        timeout: 30000 
    });
    
    console.log('⏳ 等待頁面完全載入...');
    await page.waitForTimeout(3000);
    
    // 檢查頁面上是否有音頻元素
    const initialAudioInfo = await page.evaluate(() => {
        const audioElements = document.querySelectorAll('audio');
        const scripts = Array.from(document.querySelectorAll('script'));
        
        return {
            audioElementCount: audioElements.length,
            audioElements: Array.from(audioElements).map(a => ({
                src: a.src,
                id: a.id,
                className: a.className,
                paused: a.paused
            })),
            hasSpotifyInScripts: scripts.some(s => s.textContent.includes('spotify')),
            hasAudioInScripts: scripts.some(s => s.textContent.includes('audio') || s.textContent.includes('play')),
            totalScripts: scripts.length
        };
    });
    
    console.log('🔍 初始音頻狀況:', JSON.stringify(initialAudioInfo, null, 2));
    
    // 嘗試點擊一個類型 - 先嘗試找 'pop'
    console.log('🎯 尋找並點擊類型...');
    const clickResult = await page.evaluate(() => {
        // 尋找所有可能的類型元素
        const allElements = Array.from(document.querySelectorAll('*'));
        let targetElement = null;
        let foundGenres = [];
        
        // 先收集所有可能的類型元素
        for (let el of allElements) {
            const text = el.textContent?.trim() || '';
            const style = el.getAttribute('style') || '';
            
            if (text && text.length > 0 && text.length < 30 && 
                style.includes('color') && 
                (style.includes('top') || style.includes('position'))) {
                
                foundGenres.push({
                    text: text,
                    style: style.substring(0, 100)
                });
                
                // 嘗試找一些常見的類型
                if (['pop', 'rock', 'hip hop', 'electronic', 'jazz'].includes(text.toLowerCase())) {
                    targetElement = el;
                    console.log(`找到目標類型: ${text}`);
                    break;
                }
            }
        }
        
        if (targetElement) {
            console.log(`點擊類型: ${targetElement.textContent}`);
            targetElement.click();
            return {
                success: true,
                clickedGenre: targetElement.textContent,
                foundGenresCount: foundGenres.length,
                firstFewGenres: foundGenres.slice(0, 5)
            };
        } else {
            // 如果沒找到預設的，就點擊第一個找到的
            const firstGenreEl = allElements.find(el => {
                const text = el.textContent?.trim() || '';
                const style = el.getAttribute('style') || '';
                return text && text.length > 0 && text.length < 30 && 
                       style.includes('color') && 
                       (style.includes('top') || style.includes('position')) &&
                       !text.includes('»') && !text.includes('←') && !text.includes('→');
            });
            
            if (firstGenreEl) {
                console.log(`點擊第一個找到的類型: ${firstGenreEl.textContent}`);
                firstGenreEl.click();
                return {
                    success: true,
                    clickedGenre: firstGenreEl.textContent,
                    foundGenresCount: foundGenres.length,
                    firstFewGenres: foundGenres.slice(0, 5)
                };
            }
        }
        
        return {
            success: false,
            foundGenresCount: foundGenres.length,
            firstFewGenres: foundGenres.slice(0, 5)
        };
    });
    
    console.log('🎯 點擊結果:', JSON.stringify(clickResult, null, 2));
    
    if (clickResult.success) {
        console.log(`✅ 成功點擊類型: ${clickResult.clickedGenre}`);
        console.log('⏳ 等待音頻載入...');
        await page.waitForTimeout(5000);
        
        // 再次檢查音頻狀況
        const audioAfterClick = await page.evaluate(() => {
            const audioElements = document.querySelectorAll('audio');
            const playingAudio = Array.from(audioElements).find(a => !a.paused);
            
            return {
                audioElementCount: audioElements.length,
                audioElements: Array.from(audioElements).map(a => ({
                    src: a.src,
                    paused: a.paused,
                    currentTime: a.currentTime,
                    duration: a.duration,
                    volume: a.volume
                })),
                hasPlayingAudio: !!playingAudio,
                playingAudioSrc: playingAudio?.src || null,
                playingAudioTime: playingAudio?.currentTime || null
            };
        });
        
        console.log('🎵 點擊後音頻狀況:', JSON.stringify(audioAfterClick, null, 2));
        
        if (audioAfterClick.hasPlayingAudio) {
            console.log('🎉 確認有音頻在播放！音頻來源:', audioAfterClick.playingAudioSrc);
        } else if (audioAfterClick.audioElementCount > 0) {
            console.log('⚠️  有音頻元素但沒有播放');
        } else {
            console.log('❌ 點擊後沒有音頻元素');
        }
        
    } else {
        console.log('❌ 找不到可點擊的類型元素');
        console.log(`找到 ${clickResult.foundGenresCount} 個潛在類型`);
    }
    
    console.log('🔍 等待 15 秒供進一步檢查...');
    await page.waitForTimeout(15000);
    
    await browser.close();
    console.log('✅ 測試完成');
}

testEverynoise().catch(console.error);
