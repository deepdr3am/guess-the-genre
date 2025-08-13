const scraper = require('./src/scraper');

async function debugCurrentQuestionFlow() {
    try {
        console.log('🔍 Debug: 測試目前的抓取題目流程...');
        console.log('=' .repeat(60));
        
        await scraper.init();
        
        console.log('\n📋 步驟 1: 獲取音樂類型列表');
        const genres = await scraper.scrapeGenres();
        console.log(`✅ 找到 ${genres.length} 個音樂類型`);
        console.log('前 5 個類型:', genres.slice(0, 5).map(g => g.name));
        
        console.log('\n📋 步驟 2: 生成完整問題（包含兩階段流程）');
        const question = await scraper.getRandomGenreQuestion();
        console.log('✅ 問題生成完成:');
        console.log('  - 正確答案:', question.correctGenre);
        console.log('  - 歌曲名稱:', question.songName);
        console.log('  - 藝人名稱:', question.artistName);
        console.log('  - 選項:', question.options);
        console.log('  - 正確選項索引:', question.correctIndex);
        console.log('  - 是否真實歌曲:', question.isRealSong);
        console.log('  - 音頻 URL:', question.previewUrl ? `${question.previewUrl.substring(0, 50)}...` : '無音頻');
        
        await scraper.close();
        
        console.log('\n' + '=' .repeat(60));
        console.log('📊 完整流程總結:');
        console.log('=' .repeat(60));
        console.log(`1️⃣ 類型抓取: ✅ (${genres.length} 個類型)`);
        console.log(`2️⃣ 問題生成: ✅ (${question.correctGenre} 類型)`);
        console.log(`3️⃣ 音頻獲取: ${question.previewUrl ? '✅' : '❌'} ${question.previewUrl ? `(${question.previewUrl.substring(0, 50)}...)` : '(無音頻)'}`);
        console.log(`4️⃣ 歌曲資訊: ✅ (${question.songName})`);
        
        console.log('\n🎮 遊戲體驗:');
        console.log(`  - 玩家看到: "${question.songName}" by "${question.artistName}"`);
        console.log(`  - 實際播放: ${question.previewUrl ? 'everynoise.com 的音頻樣本' : '無音頻'}`);
        console.log(`  - 答案選項: ${question.options.join(', ')}`);
        console.log(`  - 正確答案: ${question.correctGenre}`);
        console.log(`  - 資料來源: ${question.isRealSong ? '真實歌手頁面' : '主頁面 genre'}`);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        await scraper.close();
    }
}

debugCurrentQuestionFlow();
