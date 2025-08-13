class OptimizedGuessTheGenreGame {
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

        // 設置歌曲資訊
        this.elements.songName.textContent = this.currentQuestion.songName;
        this.elements.artistName.textContent = this.currentQuestion.artistName;

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
        this.elements.revealSection.classList.add('hidden');

        this.gameStarted = true;
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
        
        // 添加效能資訊（如果有）
        if (this.currentQuestion._meta) {
            const meta = this.currentQuestion._meta;
            let metaInfo = `<div class="meta-info">載入時間: ${meta.responseTime}ms`;
            if (meta.cached) {
                metaInfo += ' (快取)';
            }
            metaInfo += '</div>';
            this.elements.resultMessage.innerHTML += metaInfo;
        }
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

// 啟動優化版遊戲
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new OptimizedGuessTheGenreGame();
});
