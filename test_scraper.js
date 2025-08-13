const scraper = require('./src/scraper');

async function testScraper() {
    try {
        console.log('🔄 Initializing browser...');
        await scraper.init();
        
        console.log('🔄 Testing genre scraping...');
        const genres = await scraper.scrapeGenres();
        console.log(`✅ Found ${genres.length} genres`);
        console.log('📋 First 3 genres:', genres.slice(0, 3));
        
        if (genres.length > 0) {
            const testGenre = genres[0].name;
            console.log(`🔄 Testing audio extraction for: ${testGenre}`);
            
            const audioUrl = await scraper.getGenrePreview(testGenre);
            console.log(`🎵 Audio URL: ${audioUrl}`);
            
            if (audioUrl) {
                console.log('✅ Audio extraction successful!');
            } else {
                console.log('❌ No audio URL found');
                
                console.log('🔄 Trying alternative method...');
                const altAudioUrl = await scraper.getAlternativeGenrePreview(testGenre);
                console.log(`🎵 Alternative Audio URL: ${altAudioUrl}`);
            }
        }
        
        console.log('🔄 Testing random question generation...');
        const question = await scraper.getRandomGenreQuestion();
        console.log('📋 Random question:', question);
        
        console.log('🔄 Testing song info retrieval...');
        const songInfo = await scraper.getSongInfo(question.songName, question.artistName, question.genreName);
        console.log('🎵 Song info:', songInfo);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        console.log('🔄 Closing browser...');
        await scraper.close();
        console.log('✅ Test completed');
    }
}

testScraper();
