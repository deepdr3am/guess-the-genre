const scraper = require('./src/scraper');

async function testNewTwoStageFlow() {
    try {
        console.log('🚀 測試新的兩階段流程');
        console.log('=' .repeat(80));
        
        await scraper.init();
        
        console.log('\n📋 步驟 1: 獲取音樂類型列表');
        const genres = await scraper.scrapeGenres();
        console.log(`✅ 找到 ${genres.length} 個音樂類型`);
        console.log('前 10 個類型:', genres.slice(0, 10).map(g => g.name));
        
        if (genres.length === 0) {
            console.log('❌ 沒有獲取到類型，測試中止');
            return;
        }
        
        // 選擇幾個類型來測試
        const testGenres = genres.slice(0, 3);
        
        for (const genre of testGenres) {
            console.log('\n' + '='.repeat(60));
            console.log(`🎵 測試類型: ${genre.name}`);
            console.log('='.repeat(60));
            
            console.log('\n📍 階段 1 & 2: 執行兩階段流程');
            const genrePreview = await scraper.getGenrePreview(genre.name);
            
            if (genrePreview) {
                console.log('✅ 兩階段流程成功!');
                console.log(`  🎧 音頻 URL: ${genrePreview.audioUrl || '未獲取到音頻'}`);
                console.log(`  🎤 藝人名稱: ${genrePreview.artistName || '未獲取'}`);
                console.log(`  📝 懸浮資訊: ${genrePreview.hoverInfo || '未獲取'}`);
                console.log(`  🎵 類型名稱: ${genrePreview.genreName || '未獲取'}`);
                
                // 解析懸浮文字測試
                if (genrePreview.hoverInfo) {
                    console.log('\n🔍 解析懸浮文字:');
                    
                    // 嘗試不同的解析格式
                    let songName = null;
                    let artistName = null;
                    
                    // 格式 1: 'e.g. Artist "Song Title"'
                    let match = genrePreview.hoverInfo.match(/e\.g\.?\s*([^"]+)[""]([^"""]+)["'"]/i);
                    if (match) {
                        artistName = match[1].trim();
                        songName = match[2].trim();
                        console.log(`  📝 格式 1 匹配: "${songName}" by ${artistName}`);
                    } else {
                        // 格式 2: 'Artist - Song Title'
                        match = genrePreview.hoverInfo.match(/([^-]+)\s*-\s*(.+)/);
                        if (match) {
                            artistName = match[1].trim();
                            songName = match[2].trim();
                            console.log(`  📝 格式 2 匹配: "${songName}" by ${artistName}`);
                        } else {
                            console.log(`  ⚠️ 無法解析懸浮文字: ${genrePreview.hoverInfo}`);
                        }
                    }
                }
            } else {
                console.log('❌ 兩階段流程失敗');
            }
            
            // 稍作休息避免過於頻繁請求
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('🎮 測試完整遊戲流程');
        console.log('='.repeat(80));
        
        console.log('\n📋 生成隨機問題');
        const question = await scraper.getRandomGenreQuestion();
        console.log('✅ 問題生成完成:');
        console.log(`  🎯 正確答案: ${question.correctGenre}`);
        console.log(`  🎵 歌曲名稱: ${question.songName}`);
        console.log(`  🎤 藝人名稱: ${question.artistName}`);
        console.log(`  📊 選項: ${question.options.join(', ')}`);
        console.log(`  ✅ 正確選項索引: ${question.correctIndex}`);
        console.log(`  🎪 是否真實歌曲: ${question.isRealSong ? '是' : '否'}`);
        
        console.log('\n📋 獲取完整歌曲資訊');
        const songInfo = await scraper.getSongInfo(
            question.songName, 
            question.artistName, 
            question.genreName, 
            question.isRealSong
        );
        console.log('✅ 歌曲資訊:');
        console.log(`  🎵 歌曲: ${songInfo.songName}`);
        console.log(`  🎤 藝人: ${songInfo.artistName}`);
        console.log(`  🖼️ 封面: ${songInfo.albumCover}`);
        console.log(`  🎧 預覽 URL: ${songInfo.previewUrl || '無音頻'}`);
        console.log(`  🎭 類型: ${songInfo.genreName}`);
        
        await scraper.close();
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 新流程測試總結');
        console.log('='.repeat(80));
        console.log('✅ 新的兩階段流程已實現:');
        console.log('   1️⃣ 從主頁面選擇 genre');
        console.log('   2️⃣ 進入 genre 頁面選擇藝人');
        console.log('   3️⃣ 獲取懸浮文字中的真實歌曲資訊');
        console.log('   4️⃣ 攔截音頻播放請求');
        console.log(`✅ 最終結果: ${songInfo.previewUrl ? '成功獲取音頻和歌曲資訊' : '獲取歌曲資訊但音頻可能失敗'}`);
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        await scraper.close();
    }
}

testNewTwoStageFlow();
