const puppeteer = require('puppeteer');

async function interactiveDebugSession() {
    console.log('🚀 啟動互動式調試會話...');
    console.log('這將開啟一個瀏覽器窗口供你操作');
    console.log('=' .repeat(60));
    
    // 啟動可視化瀏覽器（非無頭模式）
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true, // 自動開啟開發者工具
        slowMo: 100, // 減慢操作速度以便觀察
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-maximized'
        ]
    });
    
    const page = await browser.newPage();
    
    // 設置監控器
    console.log('📡 設置網路監控器...');
    const interceptedRequests = [];
    const interceptedResponses = [];
    
    // 監聽所有網路請求
    page.on('request', request => {
        const url = request.url();
        if (url.includes('p.scdn.co') || 
            url.includes('spotify') || 
            url.includes('audio') || 
            url.includes('.mp3') || 
            url.includes('.m4a') ||
            url.includes('preview')) {
            
            console.log('🔍 攔截請求:', {
                type: request.resourceType(),
                method: request.method(),
                url: url.length > 80 ? url.substring(0, 80) + '...' : url
            });
            interceptedRequests.push({
                type: request.resourceType(),
                method: request.method(),
                url: url,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // 監聽網路回應
    page.on('response', response => {
        const url = response.url();
        if (url.includes('p.scdn.co') || 
            url.includes('spotify') || 
            url.includes('audio') || 
            url.includes('.mp3') || 
            url.includes('.m4a') ||
            url.includes('preview')) {
            
            console.log('📥 收到回應:', {
                status: response.status(),
                type: response.headers()['content-type'] || 'unknown',
                url: url.length > 80 ? url.substring(0, 80) + '...' : url
            });
            interceptedResponses.push({
                status: response.status(),
                headers: response.headers(),
                url: url,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    // 監聽控制台訊息
    page.on('console', msg => {
        if (msg.text().includes('audio') || 
            msg.text().includes('play') || 
            msg.text().includes('click')) {
            console.log('🖥️ 頁面控制台:', msg.text());
        }
    });
    
    // 導航到 everynoise.com
    console.log('🌐 正在載入 everynoise.com...');
    await page.goto('https://everynoise.com/engenremap.html', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    console.log('✅ 頁面已載入！');
    console.log('');
    console.log('📋 操作指引:');
    console.log('1. 在開啟的瀏覽器中找到任一音樂類型（如 pop, rock, hip hop 等）');
    console.log('2. 點擊該類型，觀察是否有音樂播放');
    console.log('3. 嘗試點擊不同的類型來測試');
    console.log('4. 注意開發者工具中的 Network 標籤');
    console.log('5. 完成後回到終端按 Enter 查看結果');
    console.log('');
    
    // 等待用戶操作
    await waitForUserInput();
    
    // 分析結果
    console.log('\n' + '=' .repeat(60));
    console.log('📊 分析結果:');
    console.log('=' .repeat(60));
    
    console.log(`📨 總共攔截 ${interceptedRequests.length} 個相關請求`);
    console.log(`📥 總共收到 ${interceptedResponses.length} 個相關回應`);
    
    if (interceptedRequests.length > 0) {
        console.log('\n🔍 攔截到的音頻請求:');
        interceptedRequests.forEach((req, index) => {
            console.log(`  ${index + 1}. [${req.method}] ${req.url}`);
        });
    }
    
    if (interceptedResponses.length > 0) {
        console.log('\n📥 收到的音頻回應:');
        interceptedResponses.forEach((res, index) => {
            console.log(`  ${index + 1}. [${res.status}] ${res.url}`);
            if (res.url.includes('p.scdn.co/mp3-preview/')) {
                console.log(`      ✅ 這是 Spotify 音頻預覽 URL!`);
            }
        });
    }
    
    // 獲取頁面上的類型元素資訊
    console.log('\n🎵 分析頁面上的音樂類型元素:');
    const genreElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const genres = [];
        
        elements.forEach(el => {
            const text = el.textContent?.trim() || '';
            const style = el.getAttribute('style') || '';
            
            if (text && 
                text.length > 0 && 
                text.length < 30 && 
                style.includes('color') && 
                (style.includes('top') || style.includes('position'))) {
                
                genres.push({
                    text: text,
                    tagName: el.tagName.toLowerCase(),
                    className: el.className || '',
                    id: el.id || '',
                    onclick: el.getAttribute('onclick') || '',
                    style: style.substring(0, 100)
                });
            }
        });
        
        return genres.slice(0, 10); // 只返回前 10 個
    });
    
    console.log(`找到 ${genreElements.length} 個類型元素 (顯示前 10 個):`);
    genreElements.forEach((genre, index) => {
        console.log(`  ${index + 1}. "${genre.text}" (${genre.tagName})`);
        if (genre.onclick) {
            console.log(`      onclick: ${genre.onclick}`);
        }
    });
    
    console.log('\n💡 建議的爬蟲改進方案:');
    if (interceptedRequests.length > 0) {
        console.log('✅ 網路攔截方法有效 - 可以攔截到音頻請求');
        console.log('✅ 建議繼續使用 Puppeteer 的網路攔截功能');
    } else {
        console.log('❌ 沒有攔截到音頻請求');
        console.log('💡 可能需要調整點擊邏輯或等待時間');
    }
    
    // 保持瀏覽器開啟直到用戶確認
    console.log('\n🔧 瀏覽器保持開啟狀態');
    console.log('你可以繼續在瀏覽器中測試，完成後按 Enter 關閉瀏覽器...');
    await waitForUserInput();
    
    await browser.close();
    console.log('✅ 調試會話結束');
}

// 等待用戶輸入的輔助函數
function waitForUserInput() {
    return new Promise((resolve) => {
        process.stdin.once('data', () => {
            resolve();
        });
    });
}

// 啟動互動式會話
interactiveDebugSession().catch(console.error);
