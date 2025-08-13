const puppeteer = require('puppeteer');

async function debugGenreDetection() {
    console.log('🔍 調試 everynoise.com 的 genre 偵測...');
    console.log('這將開啟瀏覽器讓你看到實際的頁面元素');
    
    const browser = await puppeteer.launch({
        headless: false, // 讓你看到瀏覽器
        devtools: true,  // 開啟開發者工具
        slowMo: 500,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-maximized'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('📍 前往 everynoise.com...');
        await page.goto('https://everynoise.com/engenremap.html', { 
            waitUntil: 'domcontentloaded', 
            timeout: 20000 
        });

        console.log('⏰ 等待頁面完全載入... (5秒)');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 分析頁面的實際 DOM 結構
        console.log('\n🔍 分析頁面中的所有元素...');
        const analysis = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            const elementTypes = {};
            const styledElements = [];
            const potentialGenres = [];
            
            allElements.forEach((el, index) => {
                const tagName = el.tagName.toLowerCase();
                const text = el.textContent?.trim() || '';
                const style = el.getAttribute('style') || '';
                const className = el.className || '';
                
                // 統計元素類型
                elementTypes[tagName] = (elementTypes[tagName] || 0) + 1;
                
                // 收集有樣式的元素（前 50 個）
                if (style && styledElements.length < 50) {
                    styledElements.push({
                        tagName,
                        text: text.substring(0, 50),
                        style: style.substring(0, 100),
                        className,
                        hasColor: style.includes('color'),
                        hasPosition: style.includes('top') || style.includes('left') || style.includes('position'),
                        index
                    });
                }
                
                // 尋找可能的 genre 元素
                if (text && text.length > 0 && text.length < 50 && 
                    style && style.includes('color') && 
                    (style.includes('top') || style.includes('left') || style.includes('position')) &&
                    !text.includes('Every Noise') &&
                    !text.includes('spotify') &&
                    !text.includes('.com') &&
                    !text.includes('»') &&
                    !text.includes('←') &&
                    !text.includes('→')) {
                    
                    potentialGenres.push({
                        text,
                        tagName,
                        style: style.substring(0, 100),
                        className
                    });
                }
            });
            
            return {
                totalElements: allElements.length,
                elementTypes,
                styledElements,
                potentialGenres: potentialGenres.slice(0, 20) // 限制輸出
            };
        });

        console.log('\n📊 頁面元素分析結果:');
        console.log(`總元素數量: ${analysis.totalElements}`);
        console.log('\n元素類型統計:');
        Object.entries(analysis.elementTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([tag, count]) => {
                console.log(`  ${tag}: ${count} 個`);
            });

        console.log('\n🎨 有樣式的元素 (前 20 個):');
        analysis.styledElements.slice(0, 20).forEach((el, i) => {
            console.log(`${i + 1}. <${el.tagName}> "${el.text}" 
   樣式: ${el.style}
   類別: ${el.className}
   有顏色: ${el.hasColor ? '是' : '否'}, 有位置: ${el.hasPosition ? '是' : '否'}`);
        });

        console.log(`\n🎵 可能的 genre 元素 (找到 ${analysis.potentialGenres.length} 個):`);
        analysis.potentialGenres.forEach((genre, i) => {
            console.log(`${i + 1}. "${genre.text}" 
   標籤: <${genre.tagName}> 
   樣式: ${genre.style}
   類別: ${genre.className || '無'}`);
        });

        // 檢查頁面源碼中的特殊結構
        console.log('\n🔍 檢查頁面源碼中的特殊結構...');
        const pageSource = await page.content();
        
        // 檢查是否有特殊的 genre 相關結構
        const checks = {
            hasCanvas: pageSource.includes('<canvas'),
            hasSvg: pageSource.includes('<svg'),
            hasGenreClass: pageSource.includes('genre'),
            hasSpotify: pageSource.includes('spotify'),
            hasScript: pageSource.includes('<script'),
            hasStyle: pageSource.includes('<style')
        };

        console.log('\n📄 頁面結構檢查:');
        Object.entries(checks).forEach(([key, value]) => {
            console.log(`  ${key}: ${value ? '✅' : '❌'}`);
        });

        console.log('\n👀 瀏覽器將保持開啟 60 秒，你可以手動檢查頁面...');
        console.log('請觀察頁面上的 genre 元素並告訴我它們的特徵');
        console.log('你可以右鍵檢查元素來查看它們的 HTML 結構');
        
        await new Promise(resolve => setTimeout(resolve, 60000));

    } catch (error) {
        console.error('❌ 偵測過程中出錯:', error);
    }

    await browser.close();
    console.log('🏁 genre 偵測調試結束');
}

debugGenreDetection();
