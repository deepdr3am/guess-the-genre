const axios = require('axios');

class SpotifyService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
        this.clientId = process.env.SPOTIFY_CLIENT_ID;
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    }

    // 獲取 Spotify Access Token
    async getAccessToken() {
        // 如果 token 還未過期，直接返回
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            console.log('🎵 獲取 Spotify Access Token...');
            
            const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            
            const response = await axios.post('https://accounts.spotify.com/api/token', 
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            this.accessToken = response.data.access_token;
            // Token 通常有效期 1 小時，我們提前 5 分鐘更新
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
            
            console.log('✅ Spotify Token 獲取成功');
            return this.accessToken;
            
        } catch (error) {
            console.error('❌ Spotify Token 獲取失敗:', error.message);
            
            if (error.response) {
                console.error('   HTTP 狀態碼:', error.response.status);
                console.error('   錯誤詳情:', error.response.data);
                
                if (error.response.status === 400) {
                    console.error('   🔍 可能原因:');
                    console.error('      1. Client ID 或 Client Secret 不正確');
                    console.error('      2. 憑證格式有問題（包含多餘的空白或特殊字元）');
                    console.error('      3. Spotify 應用程式設定有誤');
                }
            } else if (error.code === 'ENOTFOUND') {
                console.error('   🌐 網路連線問題，無法連接到 Spotify API');
            } else {
                console.error('   💡 請檢查 .env 檔案中的 SPOTIFY_CLIENT_ID 和 SPOTIFY_CLIENT_SECRET');
            }
            
            return null;
        }
    }

    // 搜尋歌曲並獲取專輯封面
    async getAlbumCover(songName, artistName) {
        try {
            const token = await this.getAccessToken();
            if (!token) {
                console.log('⚠️ 沒有 Spotify Token，無法獲取專輯封面');
                return null;
            }

            // 清理搜尋關鍵字
            const cleanSongName = this.cleanSearchQuery(songName);
            const cleanArtistName = this.cleanSearchQuery(artistName);
            
            // 構建搜尋查詢
            const queries = [
                `track:"${cleanSongName}" artist:"${cleanArtistName}"`, // 精確搜尋
                `"${cleanSongName}" "${cleanArtistName}"`, // 一般搜尋
                `${cleanSongName} ${cleanArtistName}`, // 基本搜尋
                `artist:"${cleanArtistName}"` // 只搜尋藝人（備用）
            ];

            for (const query of queries) {
                console.log(`🔍 Spotify 搜尋: ${query}`);
                
                const response = await axios.get('https://api.spotify.com/v1/search', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    params: {
                        q: query,
                        type: 'track',
                        limit: 5
                    },
                    timeout: 10000
                });

                const tracks = response.data.tracks.items;
                
                if (tracks && tracks.length > 0) {
                    // 找到最佳匹配的曲目
                    const bestMatch = this.findBestMatch(tracks, cleanSongName, cleanArtistName);
                    
                    if (bestMatch && bestMatch.album && bestMatch.album.images) {
                        const images = bestMatch.album.images;
                        // 選擇最適合的圖片尺寸（優先選擇中等大小）
                        const albumCoverUrl = images.find(img => img.height >= 300)?.url || 
                                            images.find(img => img.height >= 200)?.url || 
                                            images[0]?.url;

                        console.log('✅ 找到專輯封面:', bestMatch.name, 'by', bestMatch.artists[0]?.name);
                        console.log('   專輯:', bestMatch.album.name);
                        console.log('   封面URL:', albumCoverUrl);
                        return albumCoverUrl;
                    }
                }
            }

            console.log('⚠️ 未找到匹配的專輯封面');
            return null;

        } catch (error) {
            console.error('❌ Spotify 搜尋錯誤:', error.message);
            return null;
        }
    }

    // 清理搜尋關鍵字
    cleanSearchQuery(text) {
        if (!text) return '';
        
        return text
            .replace(/["""'']/g, '') // 移除引號
            .replace(/\s*\([^)]*\)/g, '') // 移除括號內容
            .replace(/\s*\[[^\]]*\]/g, '') // 移除方括號內容
            .replace(/\s*feat\.?\s*.*/i, '') // 移除 feat. 部分
            .replace(/\s*ft\.?\s*.*/i, '') // 移除 ft. 部分
            .replace(/\s*remix.*$/i, '') // 移除 remix 部分
            .replace(/[^\w\s\u4e00-\u9fff]/g, ' ') // 保留字母、數字、中文和空格
            .replace(/\s+/g, ' ') // 合併多個空格
            .trim();
    }

    // 找到最佳匹配的曲目
    findBestMatch(tracks, targetSong, targetArtist) {
        let bestMatch = null;
        let bestScore = 0;

        for (const track of tracks) {
            const trackName = track.name.toLowerCase();
            const artistNames = track.artists.map(a => a.name.toLowerCase()).join(' ');
            
            // 計算相似度分數
            let score = 0;
            
            // 歌曲名相似度
            if (targetSong && trackName.includes(targetSong.toLowerCase())) {
                score += 3;
            }
            
            // 藝人名相似度
            if (targetArtist && artistNames.includes(targetArtist.toLowerCase())) {
                score += 2;
            }

            // 完全匹配加分
            if (targetSong && trackName === targetSong.toLowerCase()) {
                score += 5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = track;
            }
        }

        return bestMatch;
    }

    // 獲取預設封面（備用）
    getDefaultAlbumCover() {
        return {
            large: 'https://via.placeholder.com/640x640/667eea/ffffff?text=🎵',
            medium: 'https://via.placeholder.com/300x300/667eea/ffffff?text=🎵',
            small: 'https://via.placeholder.com/150x150/667eea/ffffff?text=🎵',
            albumName: '未知專輯',
            spotifyUrl: null,
            previewUrl: null
        };
    }
}

module.exports = SpotifyService;
