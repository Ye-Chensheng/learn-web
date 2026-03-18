/**
 * 生成测试用户数据
 * 用户 ID: 10000
 * 数据范围：30 天
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'vibe-healing.db');
const db = new sqlite3.Database(DB_PATH);

// 测试用户 ID
const TEST_USER_ID = 10000;

// 生成 30 天前的日期
function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

// 生成随机时间
function getRandomTime(hourStart, hourEnd) {
    const hour = Math.floor(Math.random() * (hourEnd - hourStart + 1)) + hourStart;
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
}

// 删除现有测试用户数据（如果存在）
function deleteExistingData() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('DELETE FROM health_index_history WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM exercise_records WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM sleep_records WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM food_records WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM water_records WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM daily_health_records WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM user_tags WHERE user_id = ?', [TEST_USER_ID]);
            db.run('DELETE FROM users WHERE id = ?', [TEST_USER_ID], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
}

// 创建测试用户
function createTestUser() {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO users (id, wx_openid, nickname, gender, age, height_cm, weight_kg, health_goal, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;
        
        db.run(sql, [
            TEST_USER_ID,
            `user_${TEST_USER_ID}`,
            '测试用户',
            '男',
            28,
            175,
            70,
            '减脂'
        ], function(err) {
            if (err) reject(err);
            else {
                console.log('✅ 测试用户已创建');
                resolve();
            }
        });
    });
}

// 生成 30 天的健康数据
function generateHealthData() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            for (let i = 29; i >= 0; i--) {
                const date = getDateDaysAgo(i);
                const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
                
                // 基础数据变化因子（模拟真实波动）
                const variation = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
                
                // 1. 每日健康记录
                const moodLevel = Math.floor(5 + Math.random() * 4 * variation); // 5-9
                const energyLevel = Math.floor(5 + Math.random() * 4 * variation); // 5-9
                const workLoad = ['light', 'normal', 'heavy'][Math.floor(Math.random() * 3)];
                
                db.run(`
                    INSERT INTO daily_health_records 
                    (user_id, record_date, mood_level, energy_level, work_load, mode_type)
                    VALUES (?, ?, ?, ?, ?, 'stable')
                `, [TEST_USER_ID, date, moodLevel, energyLevel, workLoad]);
                
                // 2. 喝水记录（每天 4-8 次）
                const waterTimes = isWeekend ? [9, 11, 14, 16, 19, 21] : [9, 11, 14, 16, 19];
                const waterCount = isWeekend ? 6 : 5;
                for (let j = 0; j < waterCount; j++) {
                    const hour = waterTimes[j] + Math.floor(Math.random() * 2);
                    const time = `${hour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
                    const amount = 200 + Math.floor(Math.random() * 300); // 200-500ml
                    const period = hour < 12 ? '上午' : (hour < 18 ? '下午' : '晚上');
                    
                    db.run(`
                        INSERT INTO water_records 
                        (user_id, record_date, record_time, amount_ml, time_period, source)
                        VALUES (?, ?, ?, ?, ?, 'manual')
                    `, [TEST_USER_ID, date, time, amount, period]);
                }
                
                // 3. 饮食记录（每天 3 餐）
                const meals = [
                    { type: '早餐', hour: 8, foodTypes: ['健康减脂', '低卡/节食', '常规饮食'] },
                    { type: '午餐', hour: 12, foodTypes: ['健康减脂', '常规饮食', '吃太多啦'] },
                    { type: '晚餐', hour: 19, foodTypes: ['健康减脂', '低卡/节食', '常规饮食'] }
                ];
                
                meals.forEach(meal => {
                    const time = `${meal.hour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
                    const foodType = meal.foodTypes[Math.floor(Math.random() * meal.foodTypes.length)];
                    const isHealthy = foodType === '健康减脂' || foodType === '低卡/节食';
                    
                    db.run(`
                        INSERT INTO food_records 
                        (user_id, record_date, record_time, meal_type, food_type, is_healthy, source)
                        VALUES (?, ?, ?, ?, ?, ?, 'manual')
                    `, [TEST_USER_ID, date, time, meal.type, foodType, isHealthy]);
                });
                
                // 4. 睡眠记录（每天 1 次）
                const sleepHours = 6.5 + Math.random() * 2 * variation; // 6.5-8.5h
                const sleepQuality = Math.floor(6 + Math.random() * 4); // 6-10
                const bedtime = 22 + Math.floor(Math.random() * 2); // 22-23 点
                const wakeTime = 6 + Math.floor(Math.random() * 2); // 6-7 点
                
                db.run(`
                    INSERT INTO sleep_records 
                    (user_id, record_date, sleep_date, bedtime, wake_time, sleep_hours, sleep_quality, time_period, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, '昨晚', 'manual')
                `, [
                    TEST_USER_ID, date, date,
                    `${bedtime.toString().padStart(2, '0')}:30:00`,
                    `${wakeTime.toString().padStart(2, '0')}:00:00`,
                    parseFloat(sleepHours.toFixed(2)),
                    sleepQuality
                ]);
                
                // 5. 运动记录（每周 3-5 次）
                const shouldExercise = Math.random() > 0.3; // 70% 概率运动
                if (shouldExercise || isWeekend) {
                    const exerciseTypes = ['跑步', '健身', '瑜伽', '散步', '游泳'];
                    const exerciseType = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
                    const duration = 20 + Math.floor(Math.random() * 50); // 20-70 分钟
                    const intensity = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
                    const exerciseHour = isWeekend ? 10 : 19; // 周末上午，工作日晚间
                    
                    db.run(`
                        INSERT INTO exercise_records 
                        (user_id, record_date, record_time, exercise_type, duration_min, intensity, time_period, source)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')
                    `, [
                        TEST_USER_ID, date,
                        `${exerciseHour.toString().padStart(2, '0')}:00:00`,
                        exerciseType, duration, intensity,
                        exerciseHour < 12 ? '上午' : '晚上'
                    ]);
                }
            }
            
            // 等待写入完成后更新每日汇总
            setTimeout(() => {
                // 更新每日汇总数据
                for (let i = 29; i >= 0; i--) {
                    const date = getDateDaysAgo(i);
                    
                    // 计算喝水总量
                    db.get('SELECT SUM(amount_ml) as total FROM water_records WHERE user_id=? AND record_date=?', 
                        [TEST_USER_ID, date], (err, row) => {
                            const waterTotal = row?.total || 0;
                            db.run('UPDATE daily_health_records SET water_total_ml=? WHERE user_id=? AND record_date=?',
                                [waterTotal, TEST_USER_ID, date]);
                        });
                    
                    // 计算睡眠总量
                    db.get('SELECT SUM(sleep_hours) as total FROM sleep_records WHERE user_id=? AND record_date=?', 
                        [TEST_USER_ID, date], (err, row) => {
                            const sleepTotal = row?.total || 0;
                            db.run('UPDATE daily_health_records SET sleep_total_hours=? WHERE user_id=? AND record_date=?',
                                [sleepTotal, TEST_USER_ID, date]);
                        });
                    
                    // 计算运动总量
                    db.get('SELECT SUM(duration_min) as total FROM exercise_records WHERE user_id=? AND record_date=?', 
                        [TEST_USER_ID, date], (err, row) => {
                            const exerciseTotal = row?.total || 0;
                            db.run('UPDATE daily_health_records SET exercise_total_min=? WHERE user_id=? AND record_date=?',
                                [exerciseTotal, TEST_USER_ID, date]);
                        });
                    
                    // 计算饮食次数
                    db.get('SELECT COUNT(*) as count FROM food_records WHERE user_id=? AND record_date=?', 
                        [TEST_USER_ID, date], (err, row) => {
                            const foodCount = row?.count || 0;
                            db.run('UPDATE daily_health_records SET food_count=? WHERE user_id=? AND record_date=?',
                                [foodCount, TEST_USER_ID, date]);
                        });
                }
                
                console.log('✅ 30 天健康数据已生成');
                resolve();
            }, 500);
        });
    });
}

// 生成健康指数历史
function generateHealthIndex() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            for (let i = 29; i >= 0; i--) {
                const date = getDateDaysAgo(i);
                
                // 计算各维度分数
                const waterScore = 70 + Math.random() * 25;
                const foodScore = 65 + Math.random() * 30;
                const sleepScore = 70 + Math.random() * 25;
                const hasExercise = Math.random() > 0.3;
                const exerciseScore = hasExercise ? 70 + Math.random() * 25 : 0;
                
                // 计算综合指数
                const finalIndex = (waterScore * 0.25 + foodScore * 0.30 + sleepScore * 0.25 + exerciseScore * 0.20) / 
                                   (0.25 + 0.30 + 0.25 + (hasExercise ? 0.20 : 0));
                
                db.run(`
                    INSERT INTO health_index_history 
                    (user_id, calc_date, water_score, food_score, sleep_score, exercise_score,
                     index_1d, index_3d, index_7d, index_30d, final_index,
                     water_total_ml, food_count, sleep_total_hours, exercise_total_min)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    TEST_USER_ID, date,
                    parseFloat(waterScore.toFixed(2)),
                    parseFloat(foodScore.toFixed(2)),
                    parseFloat(sleepScore.toFixed(2)),
                    parseFloat(exerciseScore.toFixed(2)),
                    parseFloat((70 + Math.random() * 25).toFixed(2)),
                    parseFloat((70 + Math.random() * 25).toFixed(2)),
                    parseFloat((70 + Math.random() * 25).toFixed(2)),
                    parseFloat((70 + Math.random() * 25).toFixed(2)),
                    parseFloat(finalIndex.toFixed(2)),
                    Math.floor(1200 + Math.random() * 800),
                    3,
                    parseFloat((6.5 + Math.random() * 2).toFixed(2)),
                    hasExercise ? Math.floor(20 + Math.random() * 50) : 0
                ]);
            }
            
            console.log('✅ 健康指数历史已生成');
            resolve();
        });
    });
}

// 生成用户画像标签
function generateUserTags() {
    return new Promise((resolve, reject) => {
        const tags = [
            ['高压加班型', 'true', 0.85],
            ['适合鼓励式沟通', 'true', 0.90],
            ['运动爱好者', 'true', 0.75],
            ['饮食控制中', 'true', 0.80]
        ];
        
        db.serialize(() => {
            tags.forEach(([tagName, tagValue, confidence]) => {
                db.run(`
                    INSERT INTO user_tags (user_id, tag_name, tag_value, confidence, source)
                    VALUES (?, ?, ?, ?, 'ai_inferred')
                `, [TEST_USER_ID, tagName, tagValue, confidence]);
            });
            
            console.log('✅ 用户画像标签已生成');
            resolve();
        });
    });
}

// 统计数据的辅助函数（Promise 化）
function countRecords(table, whereClause) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`, (err, row) => {
            if (err) reject(err);
            else resolve(row.count);
        });
    });
}

// 主函数
async function main() {
    try {
        console.log('🔄 开始生成测试用户数据...');
        console.log(`📊 用户 ID: ${TEST_USER_ID}`);
        console.log(`📅 数据范围：30 天`);
        
        await deleteExistingData();
        await createTestUser();
        await generateHealthData();
        await generateHealthIndex();
        await generateUserTags();
        
        console.log('\n✅ 测试数据生成完成！');
        
        // 等待数据库写入完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('\n📊 数据统计:');
        
        // 统计生成的数据（使用 Promise 确保完成）
        const stats = await Promise.all([
            countRecords('daily_health_records', `user_id = ${TEST_USER_ID}`),
            countRecords('water_records', `user_id = ${TEST_USER_ID}`),
            countRecords('food_records', `user_id = ${TEST_USER_ID}`),
            countRecords('sleep_records', `user_id = ${TEST_USER_ID}`),
            countRecords('exercise_records', `user_id = ${TEST_USER_ID}`),
            countRecords('health_index_history', `user_id = ${TEST_USER_ID}`)
        ]);
        
        console.log(`   - 每日健康记录：${stats[0]} 条`);
        console.log(`   - 喝水记录：${stats[1]} 条`);
        console.log(`   - 饮食记录：${stats[2]} 条`);
        console.log(`   - 睡眠记录：${stats[3]} 条`);
        console.log(`   - 运动记录：${stats[4]} 条`);
        console.log(`   - 健康指数记录：${stats[5]} 条`);
        
        db.close();
        
    } catch (error) {
        console.error('❌ 生成失败:', error);
        db.close();
        process.exit(1);
    }
}

main();
