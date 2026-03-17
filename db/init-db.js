/**
 * vibe-healing SQLite 数据库初始化脚本
 * 创建所有核心数据表和索引
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../db/vibe-healing.db');
const SCHEMA_SQL = path.join(__dirname, '../db/schema.sql');

// 确保 db 目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ 无法创建数据库:', err.message);
        process.exit(1);
    }
    console.log('✅ 已连接到 SQLite 数据库:', DB_PATH);
});

// 读取并执行 SQL schema
function initDatabase() {
    const sql = fs.readFileSync(SCHEMA_SQL, 'utf8');
    
    db.exec(sql, (err) => {
        if (err) {
            console.error('❌ 数据库初始化失败:', err.message);
            process.exit(1);
        }
        
        console.log('✅ 数据库表结构创建完成');
        
        // 创建默认测试用户
        createDemoUser();
    });
}

function createDemoUser() {
    const sql = `
        INSERT OR IGNORE INTO users (
            id, wx_openid, nickname, gender, height_cm, weight_kg, health_goal
        ) VALUES (
            1, 'demo_user_001', '小伙伴', '女', 168, 55, '减脂'
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('创建测试用户失败:', err.message);
        } else {
            console.log('✅ 测试用户已创建 (ID: 1)');
        }
        
        // 插入一些测试数据
        insertDemoData();
    });
}

function insertDemoData() {
    const today = new Date();
    const records = [];
    
    // 生成最近 7 天的测试数据
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // 每日健康记录
        records.push({
            date: dateStr,
            water: 1200 + Math.random() * 800,
            food: 2 + Math.floor(Math.random() * 2),
            sleep: 6 + Math.random() * 3,
            exercise: Math.random() > 0.5 ? 20 + Math.random() * 40 : 0,
            mood: 5 + Math.floor(Math.random() * 4),
            energy: 4 + Math.floor(Math.random() * 5)
        });
    }
    
    let completed = 0;
    
    records.forEach((record, index) => {
        // 插入每日健康记录
        db.run(`
            INSERT INTO daily_health_records (
                user_id, record_date, water_total_ml, food_count, 
                sleep_total_hours, exercise_total_min, mood_level, energy_level,
                work_load, mode_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            1, record.date, 
            Math.round(record.water), 
            record.food,
            parseFloat(record.sleep.toFixed(2)),
            Math.round(record.exercise),
            record.mood,
            record.energy,
            ['light', 'normal', 'heavy'][Math.floor(Math.random() * 3)],
            ['light', 'stable', 'heavy'][Math.floor(Math.random() * 3)]
        ], (err) => {
            if (err) console.error('插入每日记录失败:', err.message);
        });
        
        // 插入喝水记录（每天 3-6 条）
        const waterCount = 3 + Math.floor(Math.random() * 4);
        for (let j = 0; j < waterCount; j++) {
            const hour = 8 + Math.floor(Math.random() * 12);
            const minute = Math.floor(Math.random() * 60);
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            const period = hour < 12 ? '上午' : (hour < 18 ? '下午' : '晚上');
            
            db.run(`
                INSERT INTO water_records (
                    user_id, record_date, record_time, amount_ml, time_period
                ) VALUES (?, ?, ?, ?, ?)
            `, [1, record.date, time, 200 + Math.floor(Math.random() * 300), period]);
        }
        
        // 插入饮食记录（每天 2-4 条）
        const meals = ['早餐', '午餐', '晚餐', '加餐'];
        const foodTypes = ['健康减脂', '低卡/节食', '常规饮食', '吃太多啦'];
        const mealCount = 2 + Math.floor(Math.random() * 2);
        
        for (let j = 0; j < mealCount; j++) {
            const mealTime = { '早餐': '08:00:00', '午餐': '12:30:00', '晚餐': '19:00:00', '加餐': '15:30:00' };
            const meal = meals[j % meals.length];
            const foodType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
            
            db.run(`
                INSERT INTO food_records (
                    user_id, record_date, record_time, meal_type, food_type, is_healthy
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                1, record.date, mealTime[meal], meal, foodType,
                foodType === '健康减脂' || foodType === '低卡/节食'
            ]);
        }
        
        // 插入睡眠记录
        const sleepBedtime = 22 + Math.floor(Math.random() * 3);
        const sleepWake = 6 + Math.floor(Math.random() * 2);
        
        db.run(`
            INSERT INTO sleep_records (
                user_id, record_date, sleep_date, bedtime, wake_time,
                sleep_hours, sleep_quality, time_period
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            1, record.date, record.date,
            `${sleepBedtime.toString().padStart(2, '0')}:30:00`,
            `${sleepWake.toString().padStart(2, '0')}:00:00`,
            parseFloat(record.sleep.toFixed(2)),
            4 + Math.floor(Math.random() * 5),
            '昨晚'
        ]);
        
        // 插入运动记录（部分天数有）
        if (record.exercise > 0) {
            const exerciseTypes = ['跑步', '健身', '瑜伽', '散步'];
            const exerciseType = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];
            const exerciseTime = ['早晨', '下午', '晚上'][Math.floor(Math.random() * 3)];
            const exerciseHour = exerciseTime === '早晨' ? 7 : (exerciseTime === '下午' ? 18 : 20);
            
            db.run(`
                INSERT INTO exercise_records (
                    user_id, record_date, record_time, exercise_type, 
                    duration_min, intensity, time_period
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                1, record.date,
                `${exerciseHour.toString().padStart(2, '0')}:00:00`,
                exerciseType,
                Math.round(record.exercise),
                ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
                exerciseTime
            ]);
        }
        
        // 插入健康指数历史
        const healthIndex = 60 + Math.random() * 35;
        
        db.run(`
            INSERT INTO health_index_history (
                user_id, calc_date, water_score, food_score, sleep_score,
                exercise_score, index_1d, index_3d, index_7d, index_30d,
                final_index, water_total_ml, food_count, sleep_total_hours, exercise_total_min
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            1, record.date,
            70 + Math.random() * 25,
            65 + Math.random() * 30,
            60 + Math.random() * 35,
            record.exercise > 0 ? 70 + Math.random() * 25 : 0,
            65 + Math.random() * 30,
            65 + Math.random() * 30,
            65 + Math.random() * 30,
            65 + Math.random() * 30,
            parseFloat(healthIndex.toFixed(2)),
            Math.round(record.water),
            record.food,
            parseFloat(record.sleep.toFixed(2)),
            Math.round(record.exercise)
        ]);
        
        completed++;
        
        if (completed === records.length) {
            console.log('✅ 测试数据已生成（最近 7 天）');
            console.log('\n🎉 数据库初始化完成！');
            console.log('\n📊 数据统计:');
            
            // 统计生成的数据
            db.get('SELECT COUNT(*) as count FROM daily_health_records WHERE user_id = 1', (err, row) => {
                console.log(`   - 每日健康记录：${row.count} 条`);
            });
            
            db.get('SELECT COUNT(*) as count FROM water_records WHERE user_id = 1', (err, row) => {
                console.log(`   - 喝水记录：${row.count} 条`);
            });
            
            db.get('SELECT COUNT(*) as count FROM food_records WHERE user_id = 1', (err, row) => {
                console.log(`   - 饮食记录：${row.count} 条`);
            });
            
            db.get('SELECT COUNT(*) as count FROM sleep_records WHERE user_id = 1', (err, row) => {
                console.log(`   - 睡眠记录：${row.count} 条`);
            });
            
            db.get('SELECT COUNT(*) as count FROM exercise_records WHERE user_id = 1', (err, row) => {
                console.log(`   - 运动记录：${row.count} 条`);
            });
            
            db.get('SELECT COUNT(*) as count FROM health_index_history WHERE user_id = 1', (err, row) => {
                console.log(`   - 健康指数记录：${row.count} 条`);
            });
            
            db.close();
        }
    });
}

// 启动初始化
initDatabase();

module.exports = { db, DB_PATH };
