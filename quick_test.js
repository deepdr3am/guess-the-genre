const scraper = require('./src/scraper');

async function quickTest() {
    console.log('⚡ 快速測試腳本');
    console.log('='.repeat(40));
    
    try {
        const startTime = Date.now();
        
        // 測試瀏覽器啟動
        console.log('🚀 啟動瀏覽器...');
        await scraper.init();
        console.log('✅ 瀏覽器啟動成功');
        
        // 測試 genres 抓取（設定更短的超時）
        console.log('📋 測試 genre 抓取（30秒超時）...');
        
        // 設定超時處理
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('30秒超時')), 30000);
        });
        
        const genresPromise = scraper.scrapeGenres();
        
        try {
            const genres = await Promise.race([genresPromise, timeout]);
            
            console.log(`✅ 成功獲取 ${genres.length} 個 genres`);
            
            if (genres.length > 0) {
                console.log('\n📋 前 5 個 genres:');
                genres.slice(0, 5).forEach((genre, index) => {
                    console.log(`  ${index + 1}. "${genre.name}"`);
                    console.log(`     預覽 URL: ${genre.previewUrl ? '有' : '無'}`);
                    console.log(`     頁面連結: ${genre.genrePageUrl ? '有' : '無'}`);
                    console.log(`     懸浮文字: ${genre.title ? '有' : '無'}`);
                });
            }
            
        } catch (timeoutError) {
            console.log('⚠️ genre 抓取超時，跳過詳細測試');
        }
        
        await scraper.close();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`\n⏱️ 總耗時: ${duration} 秒`);
        console.log('🏁 快速測試完成');
        
    } catch (error) {
        console.error('❌ 測試失敗:', error.message);
        await scraper.close();
    }
}

quickTest();
