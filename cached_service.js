const OptimizedMusicGenreScraper = require('./optimized_scraper');

class CachedMusicGenreService {
    constructor() {
        this.scraper = new OptimizedMusicGenreScraper();
        this.questionCache = []; // 預先生成的問題快取
        this.isPreloading = false;
        this.cacheSize = 10; // 保持 10 個預先生成的問題
    }

    async init() {
        await this.scraper.init();
        
        // 立即開始預載入
        this.startBackgroundPreloading();
    }

    async close() {
        await this.scraper.close();
    }

    // 背景預載入：維持問題庫存
    async startBackgroundPreloading() {
        if (this.isPreloading) return;
        this.isPreloading = true;
        
        console.log('🔄 開始背景預載入問題...');
        
        try {
            // 首先載入 genres
            await this.scraper.scrapeGenresOptimized();
            
            // 預載入熱門 genres
            const popularGenres = this.scraper.genres.slice(0, 15).map(g => g.name);
            await this.scraper.preloadPopularGenres(popularGenres);
            
            // 預先生成問題
            await this.refillQuestionCache();
            
            console.log(`✅ 背景預載入完成，快取 ${this.questionCache.length} 個問題`);
            
            // 設定定期補充快取
            setInterval(() => {
                this.refillQuestionCacheIfNeeded();
            }, 30000); // 每 30 秒檢查一次
            
        } catch (error) {
            console.error('❌ 背景預載入失敗:', error);
        } finally {
            this.isPreloading = false;
        }
    }

    // 補充問題快取
    async refillQuestionCache() {
        const needed = this.cacheSize - this.questionCache.length;
        
        if (needed <= 0) return;
        
        console.log(`🔄 補充問題快取，需要 ${needed} 個問題...`);
        
        const promises = Array.from({ length: needed }, async () => {
            try {
                const question = await this.scraper.getRandomGenreQuestionOptimized();
                return question;
            } catch (error) {
                console.error('生成問題失敗:', error);
                return null;
            }
        });
        
        const results = await Promise.allSettled(promises);
        const newQuestions = results
            .filter(r => r.status === 'fulfilled' && r.value)
            .map(r => r.value);
        
        this.questionCache.push(...newQuestions);
        console.log(`✅ 新增 ${newQuestions.length} 個問題到快取`);
    }

    // 智能補充：只在需要時補充
    async refillQuestionCacheIfNeeded() {
        if (this.questionCache.length <= 3 && !this.isPreloading) {
            await this.refillQuestionCache();
        }
    }

    // 快速獲取問題（從快取）
    async getQuestionFast() {
        // 如果快取有問題，立即回傳
        if (this.questionCache.length > 0) {
            const question = this.questionCache.shift();
            console.log(`⚡ 從快取提供問題：${question.correctGenre}（剩餘 ${this.questionCache.length} 個）`);
            
            // 背景補充快取
            this.refillQuestionCacheIfNeeded();
            
            return question;
        }
        
        // 如果快取空了，即時生成一個
        console.log('⚠️ 快取為空，即時生成問題...');
        const question = await this.scraper.getRandomGenreQuestionOptimized();
        
        // 同時開始補充快取
        this.refillQuestionCacheIfNeeded();
        
        return question;
    }

    // 獲取快取狀態
    getCacheStatus() {
        return {
            cachedQuestions: this.questionCache.length,
            isPreloading: this.isPreloading,
            cachedGenres: this.scraper.genreCache.size,
            availableGenres: this.scraper.genres.length
        };
    }
}

module.exports = CachedMusicGenreService;
