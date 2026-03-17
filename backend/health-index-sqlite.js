/**
 * 健康指数计算引擎 v2.0 - SQLite 版本
 * vibe-healing 核心算法
 */

const db = require('./db');

// ==================== 评分标准 ====================

/**
 * 喝水评分
 * 基于用户性别和体重的建议饮水量
 */
function calculateWaterScore(amountMl, user) {
    if (!user || !user.weight_kg) return 0;
    
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

/**
 * 饮食评分
 * 基于饮食类型
 */
function calculateFoodScore(foodType) {
    const scores = {
        '健康减脂': 90,
        '低卡/节食': 80,
        '常规饮食': 70,
        '吃太多啦': 50
    };
    return scores[foodType] || 70;
}

/**
 * 睡眠评分
 * 基于睡眠时长
 */
function calculateSleepScore(hours) {
    if (!hours || hours <= 0) return 0;
    if (hours < 6) return 50;
    if (hours < 7) return 70;
    if (hours < 8) return 85;
    if (hours <= 10) return 95;
    return 80; // > 10h
}

/**
 * 运动评分
 * 基于运动时长
 */
function calculateExerciseScore(minutes) {
    if (!minutes || minutes <= 0) return 0;
    if (minutes < 30) return 60;
    if (minutes < 60) return 80;
    if (minutes <= 120) return 95;
    return 85; // > 2h
}

// ==================== 每日健康指数计算 ====================

/**
 * 计算指定日期的健康指数
 */
async function calculateDailyIndex(userId, date) {
    const user = await db.getUserById(userId);
    if (!user) return null;
    
    // 获取当日记录
    const waterRecords = await db.getWaterRecords(userId, date);
    const foodRecords = await db.getFoodRecords(userId, date);
    const sleepRecords = await db.getSleepRecords(userId, date);
    const exerciseRecords = await db.getExerciseRecords(userId, date);
    
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
    let totalWeight = 0;
    
    if (waterScore > 0) { 
        healthIndex += waterScore * 0.25; 
        totalWeight += 0.25;
        validCount++;
    }
    if (foodScore > 0) { 
        healthIndex += foodScore * 0.30; 
        totalWeight += 0.30;
        validCount++;
    }
    if (sleepScore > 0) { 
        healthIndex += sleepScore * 0.25; 
        totalWeight += 0.25;
        validCount++;
    }
    if (exerciseScore > 0) { 
        healthIndex += exerciseScore * 0.20; 
        totalWeight += 0.20;
        validCount++;
    }
    
    // 计算加权平均
    const finalScore = totalWeight > 0 ? healthIndex / totalWeight : 0;
    
    return {
        date,
        waterScore: Math.round(waterScore * 10) / 10,
        foodScore: Math.round(foodScore * 10) / 10,
        sleepScore: Math.round(sleepScore * 10) / 10,
        exerciseScore: Math.round(exerciseScore * 10) / 10,
        healthIndex: Math.round(finalScore * 10) / 10,
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

async function calculateTimeDimensionIndex(userId, days) {
    const records = [];
    
    for (let i = 0; i < days; i++) {
        const date = getDateDaysAgo(i);
        const dailyIndex = await calculateDailyIndex(userId, date);
        if (dailyIndex && dailyIndex.healthIndex > 0) {
            records.push(dailyIndex.healthIndex);
        }
    }
    
    if (records.length === 0) return 0;
    const avg = records.reduce((a, b) => a + b, 0) / records.length;
    return Math.round(avg * 10) / 10;
}

// ==================== 最终健康指数计算 ====================

async function calculateFinalHealthIndex(userId) {
    // 计算各时间维度指数
    const index1d = await calculateTimeDimensionIndex(userId, 1);
    const index3d = await calculateTimeDimensionIndex(userId, 3);
    const index7d = await calculateTimeDimensionIndex(userId, 7);
    const index30d = await calculateTimeDimensionIndex(userId, 30);
    
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
    
    // 计算有效权重
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const [key, value] of Object.entries(indices)) {
        if (value > 0) {
            weightedSum += value * weights[key];
            totalWeight += weights[key];
        }
    }
    
    if (totalWeight === 0) return {
        index1d: 0,
        index3d: 0,
        index7d: 0,
        index30d: 0,
        finalIndex: 0,
        calcDate: new Date().toISOString().split('T')[0]
    };
    
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

async function saveHealthIndexHistory(userId, indexData) {
    // 获取当日详细数据
    const today = indexData.calcDate;
    const dailyData = await calculateDailyIndex(userId, today);
    
    await db.saveHealthIndex({
        user_id: userId,
        calc_date: today,
        water_score: dailyData?.waterScore || 0,
        food_score: dailyData?.foodScore || 0,
        sleep_score: dailyData?.sleepScore || 0,
        exercise_score: dailyData?.exerciseScore || 0,
        index_1d: indexData.index1d,
        index_3d: indexData.index3d,
        index_7d: indexData.index7d,
        index_30d: indexData.index30d,
        final_index: indexData.finalIndex,
        water_total_ml: dailyData?.waterMl || 0,
        food_count: dailyData?.foodCount || 0,
        sleep_total_hours: dailyData?.sleepHours || 0,
        exercise_total_min: dailyData?.exerciseMinutes || 0
    });
}

// ==================== 记录健康数据并重新计算指数 ====================

async function recordWater(userId, amountMl, timePeriod) {
    const recordDate = new Date().toISOString().split('T')[0];
    const recordTime = new Date().toTimeString().split(' ')[0];
    
    const recordId = await db.recordWater({
        user_id: userId,
        record_date: recordDate,
        record_time: recordTime,
        amount_ml: amountMl,
        time_period: timePeriod || '默认'
    });
    
    // 重新计算健康指数
    const indexData = await calculateFinalHealthIndex(userId);
    await saveHealthIndexHistory(userId, indexData);
    
    return { 
        success: true, 
        recordId,
        healthIndex: indexData.finalIndex 
    };
}

async function recordFood(userId, foodType, mealType) {
    const recordDate = new Date().toISOString().split('T')[0];
    const recordTime = new Date().toTimeString().split(' ')[0];
    
    const recordId = await db.recordFood({
        user_id: userId,
        record_date: recordDate,
        record_time: recordTime,
        meal_type: mealType,
        food_type: foodType,
        is_healthy: foodType === '健康减脂' || foodType === '低卡/节食'
    });
    
    // 重新计算健康指数
    const indexData = await calculateFinalHealthIndex(userId);
    await saveHealthIndexHistory(userId, indexData);
    
    return { 
        success: true, 
        recordId,
        healthIndex: indexData.finalIndex 
    };
}

async function recordSleep(userId, sleepHours, sleepQuality, timePeriod) {
    const recordDate = new Date().toISOString().split('T')[0];
    
    // 计算睡觉时间（如果是"昨晚"）
    const sleepDate = timePeriod === '昨晚' 
        ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
        : recordDate;
    
    const recordId = await db.recordSleep({
        user_id: userId,
        record_date: recordDate,
        sleep_date: sleepDate,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality || 5,
        time_period: timePeriod || '昨晚'
    });
    
    // 重新计算健康指数
    const indexData = await calculateFinalHealthIndex(userId);
    await saveHealthIndexHistory(userId, indexData);
    
    return { 
        success: true, 
        recordId,
        healthIndex: indexData.finalIndex 
    };
}

async function recordExercise(userId, durationMin, exerciseType, timePeriod) {
    const recordDate = new Date().toISOString().split('T')[0];
    const recordTime = new Date().toTimeString().split(' ')[0];
    
    const recordId = await db.recordExercise({
        user_id: userId,
        record_date: recordDate,
        record_time: recordTime,
        exercise_type: exerciseType || '其他',
        duration_min: durationMin,
        time_period: timePeriod || '默认'
    });
    
    // 重新计算健康指数
    const indexData = await calculateFinalHealthIndex(userId);
    await saveHealthIndexHistory(userId, indexData);
    
    return { 
        success: true, 
        recordId,
        healthIndex: indexData.finalIndex 
    };
}

// ==================== 查询接口 ====================

async function getHealthIndexHistory(userId, days = 30) {
    return await db.getHealthIndexHistory(userId, days);
}

async function getDailyRecords(userId, date) {
    const [water, food, sleep, exercise, dailyIndex] = await Promise.all([
        db.getWaterRecords(userId, date),
        db.getFoodRecords(userId, date),
        db.getSleepRecords(userId, date),
        db.getExerciseRecords(userId, date),
        calculateDailyIndex(userId, date)
    ]);
    
    return {
        water,
        food,
        sleep,
        exercise,
        dailyIndex
    };
}

async function getCurrentHealthIndex(userId) {
    const latest = await db.getLatestHealthIndex(userId);
    
    if (!latest) {
        // 如果没有历史记录，计算当前指数
        const indexData = await calculateFinalHealthIndex(userId);
        await saveHealthIndexHistory(userId, indexData);
        return indexData;
    }
    
    return {
        index1d: latest.index_1d,
        index3d: latest.index_3d,
        index7d: latest.index_7d,
        index30d: latest.index_30d,
        finalIndex: latest.final_index,
        calcDate: latest.calc_date
    };
}

async function getStatsData(userId, days = 7) {
    const startDate = getDateDaysAgo(days);
    const records = await db.getMonthlyTrend(userId, days);
    
    if (!records || records.length === 0) {
        return null;
    }
    
    // 计算统计数据
    const totalDays = records.length;
    const avgWater = records.reduce((sum, r) => sum + (r.water_total_ml || 0), 0) / totalDays;
    const avgSleep = records.reduce((sum, r) => sum + (r.sleep_total_hours || 0), 0) / totalDays;
    const avgExercise = records.reduce((sum, r) => sum + (r.exercise_total_min || 0), 0) / totalDays;
    const avgMood = records.reduce((sum, r) => sum + (r.mood_level || 5), 0) / totalDays;
    const avgEnergy = records.reduce((sum, r) => sum + (r.energy_level || 5), 0) / totalDays;
    
    // 计算运动天数
    const exerciseDays = records.filter(r => r.exercise_total_min > 0).length;
    
    // 获取健康指数趋势
    const healthIndexHistory = await db.getHealthIndexHistory(userId, days);
    const avgHealthIndex = healthIndexHistory.length > 0 
        ? healthIndexHistory.reduce((sum, r) => sum + (r.final_index || 0), 0) / healthIndexHistory.length 
        : 0;
    
    return {
        totalDays,
        avgWater: Math.round(avgWater),
        avgSleep: Math.round(avgSleep * 10) / 10,
        avgExercise: Math.round(avgExercise),
        avgMood: Math.round(avgMood * 10) / 10,
        avgEnergy: Math.round(avgEnergy * 10) / 10,
        exerciseDays,
        avgHealthIndex: Math.round(avgHealthIndex * 10) / 10,
        trend: records
    };
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
    getStatsData,
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
