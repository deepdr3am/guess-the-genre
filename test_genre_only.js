const scraper = require('./src/scraper');

async function testGenreDetectionOnly() {
    console.log('🧪 測試改進的 genre 偵測邏輯');
    console.log('='.repeat(50));
    
    try {
        await scraper.init();
        
        console.log('📋 執行 scrapeGenres()...');
        const startTime = Date.now();
        
        const genres = await scraper.scrapeGenres();
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log(`\n✅ 完成！耗時: ${duration} 秒`);
        console.log(`📊 結果: 找到 ${genres.length} 個 genres`);
        
        if (genres.length > 0) {
            console.log('\n🎵 前 15 個 genres:');
            genres.slice(0, 15).forEach((genre, index) => {
                console.log(`  ${index + 1}. "${genre.name}" (元素: ${genre.element || '未知'})`);
            });
        } else {
            console.log('❌ 沒有找到任何 genres');
        }
        
        await scraper.close();
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        await scraper.close();
    }
}

testGenreDetectionOnly();
