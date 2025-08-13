function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const startTime = Date.now();

    console.log('🚀 模擬優化版本載入效果');
    console.log('=' .repeat(50));

    // 模擬初始化時間（包含網路連接）
    console.log('📋 階段 1: 服務初始化');
    await sleep(2000);
    console.log('✅ 連接到 everynoise.com (2000ms)');

    // 模擬背景預載入時間
    console.log('📋 階段 2: 背景預載入熱門類型');
    await sleep(8000);
    console.log('✅ 預載入 10 個熱門類型 (8000ms)');

    const initTime = Date.now() - startTime;
    console.log(`🏁 初始化總時間: ${initTime}ms\n`);

    console.log('💡 此時使用者看到："載入完成，點擊開始遊戏"');
    console.log('-' .repeat(50));

    // 模擬快速問題生成（從快取）
    console.log('⚡ 使用者點擊開始 → 快速問題生成');
    for (let i = 1; i <= 5; i++) {
        const questionStart = Date.now();
        
        // 模擬從快取獲取問題（非常快）
        await sleep(Math.random() * 50);
        
        const questionTime = Date.now() - questionStart;
        console.log(`  問題 ${i}: ${questionTime}ms ⚡`);
    }

    console.log('\n📊 優化效果總結:');
    console.log('=' .repeat(50));
    console.log('🐌 原始版本: 每題 10-30 秒');
    console.log('⚡ 優化版本: 初始化 10 秒，之後每題 <100ms');
    console.log('📈 改善比例: 100-300 倍速度提升');
    console.log('');
    console.log('🎮 使用者體驗:');
    console.log('  1️⃣ 首次開啟: 看到載入畫面 10 秒');
    console.log('  2️⃣ 載入完成: 立即可以開始遊戲');
    console.log('  3️⃣ 遊戲過程: 每題切換幾乎瞬間');
    console.log('  4️⃣ 長期使用: 背景自動補充，始終快速');
}

main().catch(console.error);
