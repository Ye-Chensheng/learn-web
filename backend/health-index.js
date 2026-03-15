/**
 * 健康指数计算引擎
 * vibe-healing v3.2
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db/data.json');

// ==================== 数据库操作 ====================

function loadDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            users: [],
            daily_health_records: [],
            water_records: [],
            food_records: [],
            sleep_records: [],
            exercise_records: [],
            health_index_history: [],
            userGoals: [],
            dailyLogs: [],
            chatSummaries: [],
            userTags: [],
            weeklyPlans: [],
            aiSuggestions: []
        };
    }
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ==================== 评分标准 ====================

// 喝水评分
function calculateWaterScore(amountMl, user) {
    // 建议饮水量：男 35ml/kg, 女 30ml/kg
    const recommendedMl = user.gender === '男' ? user.weight_kg * 35 : user.weight_kg * 30;
    const ratio = amountMl / recommendedMl;
    
    if (ratio >= 1.0) return 100;
    if (ratio >= 0.8) return 90;
    if (ratio >= 0.6) return 80;
    if (ratio >= 0.4) return 70;
    if (ratio >= 0.2) return 60;
    return 50;
}

// 饮食评分
function calculateFoodScore(foodType) {
    const scores = {
        '健康减脂': 90,
        '低卡/节食': 80,
        '常规饮食': 70,
        '吃太多啦': 50
    };
    return scores[foodType] || 70;
}

// 睡眠评分
function calculateSleepScore(hours) {
    if (hours < 6) return 50;
    if (hours < 7) return 70;
    if (hours < 8) return 85;
    if (hours <= 10) return 95;
    return 80; // > 10h
}

// 运动评分
function calculateExerciseScore(minutes) {
    if (minutes < 30) return 60;
    if (minutes < 60) return 80;
    if (minutes <= 120) return 95;
    return 85; // > 2h
}

// ==================== 每日健康指数计算 ====================

function calculateDailyIndex(userId, date) {
    const db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    
    // 获取当日记录
    const waterRecords = db.water_records.filter(r => r.user_id === userId && r.record_date === date);
    const foodRecords = db.food_records.filter(r => r.user_id === userId && r.record_date === date);
    const sleepRecords = db.sleep_records.filter(r => r.user_id === userId && r.record_date === date);
    const exerciseRecords = db.exercise_records.filter(r => r.user_id === userId && r.record_date === date);
    
    // 喝水评分
    const totalWaterMl = waterRecords.reduce((sum, r) => sum + (r.amount_ml || 0), 0);
    const waterScore = totalWaterMl > 0 ? calculateWaterScore(totalWaterMl, user) : 0;
    
    // 饮食评分 (三餐平均)
    let foodScore = 0;
    if (foodRecords.length > 0) {
        const mealScores = foodRecords.map(r => calculateFoodScore(r.food_type));
        foodScore = mealScores.reduce((a, b) => a + b, 0) / mealScores.length;
    }
    
    // 睡眠评分
    let sleepScore = 0;
    if (sleepRecords.length > 0) {
        const totalHours = sleepRecords.reduce((sum, r) => sum + (r.sleep_hours || 0), 0);
        sleepScore = calculateSleepScore(totalHours);
    }
    
    // 运动评分
    let exerciseScore = 0;
    if (exerciseRecords.length > 0) {
        const totalMinutes = exerciseRecords.reduce((sum, r) => sum + (r.duration_min || 0), 0);
        exerciseScore = calculateExerciseScore(totalMinutes);
    }
    
    // 综合健康指数 (权重：喝水 25%, 饮食 30%, 睡眠 25%, 运动 20%)
    let healthIndex = 0;
    let validCount = 0;
    
    if (waterScore > 0) { healthIndex += waterScore * 0.25; validCount++; }
    if (foodScore > 0) { healthIndex += foodScore * 0.30; validCount++; }
    if (sleepScore > 0) { healthIndex += sleepScore * 0.25; validCount++; }
    if (exerciseScore > 0) { healthIndex += exerciseScore * 0.20; validCount++; }
    
    // 如果有数据，计算加权平均
    if (validCount > 0) {
        healthIndex = Math.round(healthIndex / (0.25 * (waterScore > 0 ? 1 : 0) + 
                                                  0.30 * (foodScore > 0 ? 1 : 0) + 
                                                  0.25 * (sleepScore > 0 ? 1 : 0) + 
                                                  0.20 * (exerciseScore > 0 ? 1 : 0)) * 10) / 10;
    }
    
    return {
        date,
        waterScore,
        foodScore,
        sleepScore,
        exerciseScore,
        healthIndex: Math.round(healthIndex * 10) / 10,
        waterMl: totalWaterMl,
        foodCount: foodRecords.length,
        sleepHours: sleepRecords.reduce((sum, r) => sum + (r.sleep_hours || 0), 0),
        exerciseMinutes: exerciseRecords.reduce((sum, r) => sum + (r.duration_min || 0), 0)
    };
}

// ==================== 时间维度指数计算 ====================

function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

function calculateTimeDimensionIndex(userId, days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const records = [];
    for (let i = 0; i < days; i++) {
        const date = getDateDaysAgo(i);
        const dailyIndex = calculateDailyIndex(userId, date);
        if (dailyIndex && dailyIndex.healthIndex > 0) {
            records.push(dailyIndex.healthIndex);
        }
    }
    
    if (records.length === 0) return 0;
    const avg = records.reduce((a, b) => a + b, 0) / records.length;
    return Math.round(avg * 10) / 10;
}

// ==================== 最终健康指数计算 ====================

function calculateFinalHealthIndex(userId) {
    // 计算各时间维度指数
    const index1d = calculateTimeDimensionIndex(userId, 1);
    const index3d = calculateTimeDimensionIndex(userId, 3);
    const index7d = calculateTimeDimensionIndex(userId, 7);
    const index30d = calculateTimeDimensionIndex(userId, 30);
    
    // 时间权重：1 天 40%, 3 天 30%, 7 天 20%, 30 天 10%
    const weights = {
        '1d': 0.40,
        '3d': 0.30,
        '7d': 0.20,
        '30d': 0.10
    };
    
    const indices = {
        '1d': index1d,
        '3d': index3d,
        '7d': index7d,
        '30d': index30d
    };
    
    // 计算有效权重 (只计算有数据的维度)
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const [key, value] of Object.entries(indices)) {
        if (value > 0) {
            weightedSum += value * weights[key];
            totalWeight += weights[key];
        }
    }
    
    // 如果没有数据，返回 0
    if (totalWeight === 0) return 0;
    
    // 计算最终指数
    const finalIndex = Math.round((weightedSum / totalWeight) * 10) / 10;
    
    return {
        index1d,
        index3d,
        index7d,
        index30d,
        finalIndex,
        calcDate: new Date().toISOString().split('T')[0]
    };
}

// ==================== 保存健康指数历史 ====================

function saveHealthIndexHistory(userId, indexData) {
    const db = loadDB();
    
    // 检查是否已存在今日记录
    const existingIndex = db.health_index_history.find(
        r => r.user_id === userId && r.calc_date === indexData.calcDate
    );
    
    if (existingIndex) {
        // 更新现有记录
        existingIndex.index_1d = indexData.index1d;
        existingIndex.index_3d = indexData.index3d;
        existingIndex.index_7d = indexData.index7d;
        existingIndex.index_30d = indexData.index30d;
        existingIndex.final_index = indexData.finalIndex;
        existingIndex.updated_at = new Date().toISOString();
    } else {
        // 创建新记录
        db.health_index_history.push({
            id: Date.now(),
            user_id: userId,
            calc_date: indexData.calcDate,
            index_1d: indexData.index1d,
            index_3d: indexData.index3d,
            index_7d: indexData.index7d,
            index_30d: indexData.index30d,
            final_index: indexData.finalIndex,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    }
    
    saveDB(db);
}

// ==================== 记录健康数据 ====================

function recordWater(userId, amountMl, timePeriod) {
    const db = loadDB();
    const record = {
        id: Date.now(),
        user_id: userId,
        record_date: new Date().toISOString().split('T')[0],
        record_time: new Date().toISOString(),
        amount_ml: amountMl,
        time_period: timePeriod || '默认',
        created_at: new Date().toISOString()
    };
    
    db.water_records.push(record);
    saveDB(db);
    
    // 重新计算健康指数
    const indexData = calculateFinalHealthIndex(userId);
    saveHealthIndexHistory(userId, indexData);
    
    return { success: true, record, healthIndex: indexData.finalIndex };
}

function recordFood(userId, foodType, mealType) {
    const db = loadDB();
    const record = {
        id: Date.now(),
        user_id: userId,
        record_date: new Date().toISOString().split('T')[0],
        record_time: new Date().toISOString(),
        food_type: foodType,
        meal_type: mealType || '默认',
        created_at: new Date().toISOString()
    };
    
    db.food_records.push(record);
    saveDB(db);
    
    const indexData = calculateFinalHealthIndex(userId);
    saveHealthIndexHistory(userId, indexData);
    
    return { success: true, record, healthIndex: indexData.finalIndex };
}

function recordSleep(userId, sleepHours, sleepQuality, timePeriod) {
    const db = loadDB();
    const record = {
        id: Date.now(),
        user_id: userId,
        record_date: new Date().toISOString().split('T')[0],
        record_time: new Date().toISOString(),
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality || 5,
        time_period: timePeriod || '昨晚',
        created_at: new Date().toISOString()
    };
    
    db.sleep_records.push(record);
    saveDB(db);
    
    const indexData = calculateFinalHealthIndex(userId);
    saveHealthIndexHistory(userId, indexData);
    
    return { success: true, record, healthIndex: indexData.finalIndex };
}

function recordExercise(userId, durationMin, exerciseType, timePeriod) {
    const db = loadDB();
    const record = {
        id: Date.now(),
        user_id: userId,
        record_date: new Date().toISOString().split('T')[0],
        record_time: new Date().toISOString(),
        duration_min: durationMin,
        exercise_type: exerciseType || '其他',
        time_period: timePeriod || '默认',
        created_at: new Date().toISOString()
    };
    
    db.exercise_records.push(record);
    saveDB(db);
    
    const indexData = calculateFinalHealthIndex(userId);
    saveHealthIndexHistory(userId, indexData);
    
    return { success: true, record, healthIndex: indexData.finalIndex };
}

// ==================== 查询接口 ====================

function getHealthIndexHistory(userId, days = 30) {
    const db = loadDB();
    const startDate = getDateDaysAgo(days);
    
    return db.health_index_history
        .filter(r => r.user_id === userId && r.calc_date >= startDate)
        .sort((a, b) => new Date(b.calc_date) - new Date(a.calc_date));
}

function getDailyRecords(userId, date) {
    const db = loadDB();
    
    return {
        water: db.water_records.filter(r => r.user_id === userId && r.record_date === date),
        food: db.food_records.filter(r => r.user_id === userId && r.record_date === date),
        sleep: db.sleep_records.filter(r => r.user_id === userId && r.record_date === date),
        exercise: db.exercise_records.filter(r => r.user_id === userId && r.record_date === date),
        dailyIndex: calculateDailyIndex(userId, date)
    };
}

function getCurrentHealthIndex(userId) {
    const indexData = calculateFinalHealthIndex(userId);
    return indexData;
}

// ==================== 导出 ====================

module.exports = {
    // 记录
    recordWater,
    recordFood,
    recordSleep,
    recordExercise,
    
    // 查询
    getHealthIndexHistory,
    getDailyRecords,
    getCurrentHealthIndex,
    calculateDailyIndex,
    
    // 计算
    calculateFinalHealthIndex,
    calculateWaterScore,
    calculateFoodScore,
    calculateSleepScore,
    calculateExerciseScore,
    
    // 工具
    getDateDaysAgo
};
