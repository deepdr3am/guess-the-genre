class GuessTheGenreGame {
    constructor() {
        this.score = 0;
        this.currentQuestion = null;
        this.selectedOption = null;
        this.gameStarted = false;
        this.serviceReady = false;
        this.loadingStatus = null;
        
        this.initElements();
        this.bindEvents();
        this.startGame();
    }

    initElements() {
        this.elements = {
            loading: document.getElementById('loading'),
            loadingStatus: document.getElementById('loading-status'),
            loadingProgress: document.getElementById('loading-progress'),
            gameArea: document.getElementById('game-area'),
            score: document.getElementById('score'),
            songName: document.getElementById('song-name'),
            artistName: document.getElementById('artist-name'),
            correctGenre: document.getElementById('correct-genre'),
            albumCover: document.getElementById('album-cover'),
            playBtn: document.getElementById('play-btn'),
            audioPlayer: document.getElementById('audio-player'),
            audioSource: document.getElementById('audio-source'),
            optionButtons: document.querySelectorAll('.option-btn'),
            nextBtn: document.getElementById('next-btn'),
            result: document.getElementById('result'),
            resultTitle: document.getElementById('result-title'),
            resultMessage: document.getElementById('result-message'),
            revealSection: document.getElementById('reveal-section')
        };
    }

    bindEvents() {
        // 綁定選項按鈕事件
        this.elements.optionButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => this.selectOption(index));
        });

        // 綁定下一題按鈕事件
        this.elements.nextBtn.addEventListener('click', () => this.nextQuestion());

        // 綁定播放按鈕事件
        this.elements.playBtn.addEventListener('click', () => this.togglePlay());

        // 綁定音頻播放器事件
        this.elements.audioPlayer.addEventListener('loadeddata', () => {
            console.log('Audio loaded successfully');
        });

        this.elements.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio loading error:', e);
            this.elements.playBtn.textContent = '❌';
        });

        this.elements.audioPlayer.addEventListener('play', () => {
            this.elements.playBtn.textContent = '⏸️';
        });

        this.elements.audioPlayer.addEventListener('pause', () => {
            this.elements.playBtn.textContent = '▶️';
        });

        this.elements.audioPlayer.addEventListener('ended', () => {
            this.elements.playBtn.textContent = '▶️';
        });

        // 綁定結果彈窗點擊事件
        this.elements.result.addEventListener('click', (e) => {
            if (e.target === this.elements.result) {
                this.hideResult();
            }
        });
    }

    async startGame() {
        await this.checkServiceStatus();
        if (this.serviceReady) {
            await this.loadNewQuestion();
        } else {
            this.waitForService();
        }
    }

    // 檢查服務狀態
    async checkServiceStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            this.serviceReady = status.ready;
            this.loadingStatus = status;
            
            this.updateLoadingDisplay(status);
            
            return status;
        } catch (error) {
            console.error('Failed to check service status:', error);
            this.updateLoadingDisplay({ 
                ready: false, 
                message: '連接服務失敗，請重新整理頁面' 
            });
            return null;
        }
    }

    // 更新載入顯示
    updateLoadingDisplay(status) {
        if (!this.elements.loadingStatus) return;
        
        let message = status.message || '載入中...';
        let progressText = '';
        
        if (status.cachedQuestions !== undefined) {
            progressText = `已準備 ${status.cachedQuestions} 個問題`;
        }
        
        if (status.availableGenres !== undefined) {
            progressText += ` | 載入 ${status.availableGenres} 個音樂類型`;
        }
        
        this.elements.loadingStatus.innerHTML = `
            <div class="loading-message">${message}</div>
            ${progressText ? `<div class="loading-progress">${progressText}</div>` : ''}
        `;
        
        // 如果服務準備就緒，更新按鈕
        if (status.ready) {
            this.elements.loadingStatus.innerHTML += `
                <button onclick="game.loadNewQuestion()" class="ready-btn">
                    🎵 開始遊戲
                </button>
            `;
        }
    }

    // 等待服務準備就緒
    async waitForService() {
        this.showLoading();
        
        const checkInterval = setInterval(async () => {
            const status = await this.checkServiceStatus();
            
            if (status && status.ready) {
                clearInterval(checkInterval);
                this.serviceReady = true;
                setTimeout(() => {
                    this.loadNewQuestion();
                }, 1000);
            }
        }, 2000); // 每 2 秒檢查一次
        
        // 10 分鐘後停止檢查
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!this.serviceReady) {
                this.updateLoadingDisplay({
                    ready: false,
                    message: '服務載入超時，請重新整理頁面重試'
                });
            }
        }, 10 * 60 * 1000);
    }

    showLoading() {
        this.elements.loading.classList.remove('hidden');
        this.elements.gameArea.classList.add('hidden');
    }

    hideLoading() {
        this.elements.loading.classList.add('hidden');
        this.elements.gameArea.classList.remove('hidden');
    }

    async loadNewQuestion() {
        try {
            // 顯示快速載入狀態
            this.showQuickLoading();
            
            const startTime = Date.now();
            const response = await fetch('/api/random-genre');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.currentQuestion = await response.json();
            const loadTime = Date.now() - startTime;
            
            console.log(`⚡ 問題載入完成 (${loadTime}ms)`, {
                genre: this.currentQuestion.correctGenre,
                fromCache: this.currentQuestion._meta?.cached,
                cacheStatus: this.currentQuestion._meta?.cacheStatus
            });
            
            // 顯示載入時間（如果很快就不顯示）
            if (loadTime > 1000) {
                this.showNotification(`載入時間: ${loadTime}ms`, 'info');
            }
            
            this.displayQuestion();
            this.resetSelections();
            this.hideLoading();
            
        } catch (error) {
            console.error('Failed to load question:', error);
            this.showNotification(`載入問題失敗: ${error.message}`, 'error');
            
            // 如果是首次載入失敗，重新檢查服務狀態
            if (!this.gameStarted) {
                await this.checkServiceStatus();
                if (!this.serviceReady) {
                    this.waitForService();
                }
            }
        }
    }

    // 快速載入狀態（用於問題切換時的短暫載入）
    showQuickLoading() {
        const quickLoader = document.createElement('div');
        quickLoader.className = 'quick-loader';
        quickLoader.innerHTML = '🎵 載入下一題...';
        quickLoader.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
        `;
        
        document.body.appendChild(quickLoader);
        
        setTimeout(() => {
            if (document.body.contains(quickLoader)) {
                document.body.removeChild(quickLoader);
            }
        }, 3000);
    }

    // 通知系統
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            error: '#f44336',
            warning: '#FF9800'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 24px;
            border-radius: 5px;
            z-index: 1001;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(-50%) translateY(-20px)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    displayQuestion() {
        if (!this.currentQuestion) return;

        // 更新分數
        this.elements.score.textContent = this.score;

        // 解析歌曲資訊
        const { cleanSongName, cleanArtistName } = this.parseSongInfo(
            this.currentQuestion.songName, 
            this.currentQuestion.artistName
        );

        // 設置歌曲資訊
        this.elements.songName.textContent = cleanSongName;
        this.elements.artistName.textContent = cleanArtistName;

        // 載入專輯封面（非同步）
        this.loadAlbumCover(cleanSongName, cleanArtistName);

        // 設置選項
        this.elements.optionButtons.forEach((btn, index) => {
            if (index < this.currentQuestion.options.length) {
                btn.textContent = this.currentQuestion.options[index];
                btn.style.display = 'block';
                btn.disabled = false;
                btn.classList.remove('selected', 'correct', 'incorrect');
            } else {
                btn.style.display = 'none';
            }
        });

        // 設置音頻
        if (this.currentQuestion.previewUrl) {
            this.elements.audioSource.src = this.currentQuestion.previewUrl;
            this.elements.audioPlayer.load();
            this.elements.playBtn.textContent = '▶️';
            this.elements.playBtn.disabled = false;
            this.elements.playBtn.title = '播放音樂預覽';
        } else {
            this.elements.audioSource.src = '';
            this.elements.playBtn.textContent = '❌';
            this.elements.playBtn.disabled = true;
            this.elements.playBtn.title = '此題目沒有音頻預覽';
        }

        // 隱藏下一題按鈕和結果
        this.elements.nextBtn.classList.add('hidden');
        this.elements.nextBtn.disabled = true;
        this.elements.revealSection.classList.add('hidden');

        this.gameStarted = true;
    }

    // 新增：解析歌曲資訊的方法
    parseSongInfo(songName, artistName) {
        let cleanSongName = songName;
        let cleanArtistName = artistName;

        // 如果歌曲名稱包含 "e.g." 等標記，需要進行解析
        if (songName && (songName.includes('e.g.') || songName.includes('·') || songName.includes('by'))) {
            console.log('解析歌曲資訊:', songName);
            
            // 各種解析模式
            const patterns = [
                // 模式1: "e.g. Song Name by Artist Name"
                /e\.g\.\s*([^·]+?)\s+by\s+(.+)/i,
                // 模式2: "e.g. Song Name · Artist Name"
                /e\.g\.\s*([^·]+?)\s*·\s*(.+)/i,
                // 模式3: "Song Name by Artist Name"
                /^([^·]+?)\s+by\s+(.+)/i,
                // 模式4: "Song Name · Artist Name"  
                /^([^·]+?)\s*·\s*(.+)/i,
                // 模式5: "Song Name (Artist Name)"
                /^([^(]+?)\s*\(([^)]+)\)/,
                // 模式6: "Artist Name - Song Name"
                /^([^-]+?)\s*-\s*(.+)/
            ];

            for (const pattern of patterns) {
                const match = songName.match(pattern);
                if (match) {
                    // 根據模式決定哪個是歌曲名、哪個是藝人名
                    if (pattern === patterns[5]) { // "Artist Name - Song Name" 格式
                        cleanArtistName = match[1].trim();
                        cleanSongName = match[2].trim();
                    } else { // 其他格式都是 "Song Name ... Artist Name"
                        cleanSongName = match[1].trim();
                        cleanArtistName = match[2].trim();
                    }
                    
                    console.log('解析結果:', { 
                        original: songName, 
                        song: cleanSongName, 
                        artist: cleanArtistName 
                    });
                    break;
                }
            }

            // 如果還沒解析出來，嘗試更簡單的方法
            if (cleanSongName === songName && songName.includes('e.g.')) {
                cleanSongName = songName.replace(/^e\.g\.\s*/, '').trim();
                
                // 如果包含藝人資訊，嘗試分離
                if (cleanSongName.includes(' by ')) {
                    const parts = cleanSongName.split(' by ');
                    cleanSongName = parts[0].trim();
                    cleanArtistName = parts[1].trim();
                }
            }
        }

        // 清理特殊字符和多餘空白
        cleanSongName = cleanSongName.replace(/["""'']/g, '"').replace(/\s+/g, ' ').trim();
        cleanArtistName = cleanArtistName.replace(/["""'']/g, '"').replace(/\s+/g, ' ').trim();

        // 如果歌曲名為空，使用預設
        if (!cleanSongName || cleanSongName.length < 2) {
            cleanSongName = `${cleanArtistName} 的歌曲`;
        }

        return { cleanSongName, cleanArtistName };
    }

    // 新增：載入專輯封面
    async loadAlbumCover(songName, artistName) {
        const albumCoverImg = document.getElementById('album-cover');
        
        if (!albumCoverImg) return;
        
        // 顯示載入狀態
        albumCoverImg.src = '';
        albumCoverImg.alt = '載入專輯封面中...';
        albumCoverImg.style.opacity = '0.5';
        
        try {
            console.log(`載入專輯封面: "${songName}" by "${artistName}"`);
            
            const response = await fetch(`/api/album-cover/${encodeURIComponent(songName)}/${encodeURIComponent(artistName)}`);
            const result = await response.json();
            
            if (result.success && result.cover) {
                // 如果 result.cover 是物件，使用 large 尺寸的 URL
                let coverUrl;
                if (typeof result.cover === 'object' && result.cover.large) {
                    coverUrl = result.cover.large || result.cover.medium || result.cover.small;
                } else if (typeof result.cover === 'string') {
                    coverUrl = result.cover;
                } else {
                    throw new Error('Invalid cover format');
                }
                
                albumCoverImg.src = coverUrl;
                albumCoverImg.alt = `${songName} - ${artistName} 專輯封面`;
                albumCoverImg.style.opacity = '1';
                console.log(`✅ 專輯封面載入成功 (${result.responseTime}ms)`);
            } else {
                // 使用預設封面
                let defaultCover = result.cover;
                if (typeof result.cover === 'object' && result.cover.large) {
                    defaultCover = result.cover.large || result.cover.medium || result.cover.small;
                } else if (!defaultCover) {
                    defaultCover = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f0f0f0"/><text x="150" y="150" text-anchor="middle" dy=".3em" font-family="Arial" font-size="60" fill="%23999">🎵</text></svg>';
                }
                
                albumCoverImg.src = defaultCover;
                albumCoverImg.alt = '預設專輯封面';
                albumCoverImg.style.opacity = '1';
                console.log(`⚠️ 使用預設專輯封面: ${result.message || '未找到專輯封面'}`);
            }
        } catch (error) {
            console.error('載入專輯封面失敗:', error);
            // 顯示預設封面
            albumCoverImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23f0f0f0"/><text x="150" y="150" text-anchor="middle" dy=".3em" font-family="Arial" font-size="60" fill="%23999">❌</text></svg>';
            albumCoverImg.alt = '載入失敗';
            albumCoverImg.style.opacity = '1';
        }
    }

    selectOption(index) {
        if (this.selectedOption !== null) return;

        this.selectedOption = index;
        const selectedBtn = this.elements.optionButtons[index];
        selectedBtn.classList.add('selected');

        // 顯示結果
        this.showResult();
        
        // 禁用所有選項按鈕
        this.elements.optionButtons.forEach(btn => {
            btn.disabled = true;
        });

        // 高亮正確答案
        this.elements.optionButtons[this.currentQuestion.correctIndex].classList.add('correct');

        // 如果選錯了，也要高亮錯誤選項
        if (index !== this.currentQuestion.correctIndex) {
            selectedBtn.classList.add('incorrect');
        }

        // 顯示正確答案和下一題按鈕
        this.elements.correctGenre.textContent = this.currentQuestion.correctGenre;
        this.elements.revealSection.classList.remove('hidden');
        this.elements.nextBtn.classList.remove('hidden');
        this.elements.nextBtn.disabled = false; // 確保按鈕可以點擊

        // 更新分數
        if (index === this.currentQuestion.correctIndex) {
            this.score++;
            this.elements.score.textContent = this.score;
        }
    }

    showResult() {
        const isCorrect = this.selectedOption === this.currentQuestion.correctIndex;
        
        this.elements.resultTitle.textContent = isCorrect ? '🎉 答對了!' : '😅 答錯了!';
        this.elements.resultMessage.innerHTML = isCorrect 
            ? `恭喜你！正確答案確實是「<strong>${this.currentQuestion.correctGenre}</strong>」`
            : `正確答案是「<strong>${this.currentQuestion.correctGenre}</strong>」，繼續加油！`;
        
        this.elements.result.classList.remove('hidden');
    }

    hideResult() {
        this.elements.result.classList.add('hidden');
    }

    async nextQuestion() {
        this.resetSelections();
        this.hideResult();
        await this.loadNewQuestion();
    }

    resetSelections() {
        this.selectedOption = null;
        this.elements.optionButtons.forEach(btn => {
            btn.classList.remove('selected', 'correct', 'incorrect');
            btn.disabled = false;
        });
        
        // 停止音頻播放
        this.elements.audioPlayer.pause();
        this.elements.audioPlayer.currentTime = 0;
        this.elements.playBtn.textContent = '▶️';
    }

    togglePlay() {
        if (this.elements.audioPlayer.paused) {
            this.elements.audioPlayer.play().catch(error => {
                console.error('Audio play error:', error);
                this.elements.playBtn.textContent = '❌';
            });
        } else {
            this.elements.audioPlayer.pause();
        }
    }
}

// 啟動遊戲
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GuessTheGenreGame();
});
