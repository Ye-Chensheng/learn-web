/**
 * vibe-healing SQLite 数据访问层
 * 提供所有数据库操作的封装接口
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../db/vibe-healing.db');

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ 已连接到 SQLite 数据库');
                    resolve(this.db);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // ==================== 通用查询方法 ====================

    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ==================== 用户相关操作 ====================

    async createUser(userData) {
        const { wx_openid, nickname, avatar_url, gender, age, height_cm, weight_kg, occupation, work_type, health_goal } = userData;
        
        const sql = `
            INSERT INTO users (wx_openid, nickname, avatar_url, gender, age, height_cm, weight_kg, 
                              occupation, work_type, health_goal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await this.run(sql, [
            wx_openid, nickname || '小伙伴', avatar_url, gender, age, 
            height_cm, weight_kg, occupation, work_type, health_goal
        ]);
        
        return result.lastID;
    }

    async getUserByOpenId(wx_openid) {
        return await this.get('SELECT * FROM users WHERE wx_openid = ?', [wx_openid]);
    }

    async getUserById(id) {
        return await this.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    async updateUser(id, userData) {
        const fields = [];
        const values = [];
        
        for (const [key, value] of Object.entries(userData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }
        
        if (fields.length === 0) return;
        
        values.push(id);
        const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        
        await this.run(sql, values);
    }

    // ==================== 每日健康记录 ====================

    async getDailyRecord(userId, date) {
        return await this.get(
            'SELECT * FROM daily_health_records WHERE user_id = ? AND record_date = ?',
            [userId, date]
        );
    }

    async getDailyRecords(userId, startDate, endDate) {
        return await this.all(
            `SELECT * FROM daily_health_records 
             WHERE user_id = ? AND record_date BETWEEN ? AND ?
             ORDER BY record_date DESC`,
            [userId, startDate, endDate]
        );
    }

    async upsertDailyRecord(record) {
        const { user_id, record_date, weight_kg, mood_level, energy_level, work_load, mode_type, special_note } = record;
        
        // 检查是否存在
        const existing = await this.getDailyRecord(user_id, record_date);
        
        if (existing) {
            await this.run(`
                UPDATE daily_health_records 
                SET weight_kg = COALESCE(?, weight_kg),
                    mood_level = COALESCE(?, mood_level),
                    energy_level = COALESCE(?, energy_level),
                    work_load = COALESCE(?, work_load),
                    mode_type = COALESCE(?, mode_type),
                    special_note = COALESCE(?, special_note),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND record_date = ?
            `, [weight_kg, mood_level, energy_level, work_load, mode_type, special_note, user_id, record_date]);
        } else {
            await this.run(`
                INSERT INTO daily_health_records 
                (user_id, record_date, weight_kg, mood_level, energy_level, work_load, mode_type, special_note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [user_id, record_date, weight_kg, mood_level, energy_level, work_load, mode_type, special_note]);
        }
    }

    // ==================== 喝水记录 ====================

    async recordWater(record) {
        const { user_id, record_date, record_time, amount_ml, time_period, note, is_auto_recorded, source } = record;
        
        const result = await this.run(`
            INSERT INTO water_records 
            (user_id, record_date, record_time, amount_ml, time_period, note, is_auto_recorded, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, record_date || new Date().toISOString().split('T')[0], 
            record_time || new Date().toTimeString().split(' ')[0],
            amount_ml, time_period, note, is_auto_recorded || false, source || 'manual']);
        
        // 更新每日汇总
        await this.updateDailyWaterTotal(user_id, record_date || new Date().toISOString().split('T')[0]);
        
        return result.lastID;
    }

    async getWaterRecords(userId, date) {
        return await this.all(
            'SELECT * FROM water_records WHERE user_id = ? AND record_date = ? ORDER BY record_time',
            [userId, date]
        );
    }

    async updateDailyWaterTotal(userId, date) {
        const result = await this.get(
            'SELECT SUM(amount_ml) as total FROM water_records WHERE user_id = ? AND record_date = ?',
            [userId, date]
        );
        
        const total = result?.total || 0;
        
        await this.run(`
            INSERT INTO daily_health_records (user_id, record_date, water_total_ml)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, record_date) DO UPDATE SET 
                water_total_ml = ?,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, date, total, total]);
    }

    // ==================== 饮食记录 ====================

    async recordFood(record) {
        const { user_id, record_date, record_time, meal_type, food_type, food_name, food_desc, calories, is_healthy, is_auto_recorded, source } = record;
        
        const result = await this.run(`
            INSERT INTO food_records 
            (user_id, record_date, record_time, meal_type, food_type, food_name, food_desc, 
             calories, is_healthy, is_auto_recorded, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, record_date || new Date().toISOString().split('T')[0],
            record_time || new Date().toTimeString().split(' ')[0],
            meal_type, food_type, food_name, food_desc, calories, 
            is_healthy !== undefined ? is_healthy : true, is_auto_recorded || false, source || 'manual']);
        
        // 更新每日汇总
        await this.updateDailyFoodCount(user_id, record_date || new Date().toISOString().split('T')[0]);
        
        return result.lastID;
    }

    async getFoodRecords(userId, date) {
        return await this.all(
            'SELECT * FROM food_records WHERE user_id = ? AND record_date = ? ORDER BY record_time',
            [userId, date]
        );
    }

    async updateDailyFoodCount(userId, date) {
        const result = await this.get(
            'SELECT COUNT(*) as count FROM food_records WHERE user_id = ? AND record_date = ?',
            [userId, date]
        );
        
        const count = result?.count || 0;
        
        await this.run(`
            INSERT INTO daily_health_records (user_id, record_date, food_count)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, record_date) DO UPDATE SET 
                food_count = ?,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, date, count, count]);
    }

    // ==================== 睡眠记录 ====================

    async recordSleep(record) {
        const { user_id, record_date, sleep_date, bedtime, wake_time, sleep_hours, sleep_quality, deep_sleep_hours, time_period, note, is_auto_recorded, source } = record;
        
        const result = await this.run(`
            INSERT INTO sleep_records 
            (user_id, record_date, sleep_date, bedtime, wake_time, sleep_hours, sleep_quality, 
             deep_sleep_hours, time_period, note, is_auto_recorded, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, record_date || new Date().toISOString().split('T')[0],
            sleep_date || new Date().toISOString().split('T')[0],
            bedtime, wake_time, sleep_hours, sleep_quality, deep_sleep_hours, 
            time_period, note, is_auto_recorded || false, source || 'manual']);
        
        // 更新每日汇总
        await this.updateDailySleepTotal(user_id, record_date || new Date().toISOString().split('T')[0]);
        
        return result.lastID;
    }

    async getSleepRecords(userId, date) {
        return await this.all(
            'SELECT * FROM sleep_records WHERE user_id = ? AND record_date = ? ORDER BY record_time',
            [userId, date]
        );
    }

    async updateDailySleepTotal(userId, date) {
        const result = await this.get(
            'SELECT SUM(sleep_hours) as total FROM sleep_records WHERE user_id = ? AND record_date = ?',
            [userId, date]
        );
        
        const total = result?.total || 0;
        
        await this.run(`
            INSERT INTO daily_health_records (user_id, record_date, sleep_total_hours)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, record_date) DO UPDATE SET 
                sleep_total_hours = ?,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, date, total, total]);
    }

    // ==================== 运动记录 ====================

    async recordExercise(record) {
        const { user_id, record_date, record_time, exercise_type, duration_min, intensity, calories_burned, time_period, note, is_auto_recorded, source } = record;
        
        const result = await this.run(`
            INSERT INTO exercise_records 
            (user_id, record_date, record_time, exercise_type, duration_min, intensity, 
             calories_burned, time_period, note, is_auto_recorded, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, record_date || new Date().toISOString().split('T')[0],
            record_time || new Date().toTimeString().split(' ')[0],
            exercise_type, duration_min, intensity, calories_burned, 
            time_period, note, is_auto_recorded || false, source || 'manual']);
        
        // 更新每日汇总
        await this.updateDailyExerciseTotal(user_id, record_date || new Date().toISOString().split('T')[0]);
        
        return result.lastID;
    }

    async getExerciseRecords(userId, date) {
        return await this.all(
            'SELECT * FROM exercise_records WHERE user_id = ? AND record_date = ? ORDER BY record_time',
            [userId, date]
        );
    }

    async updateDailyExerciseTotal(userId, date) {
        const result = await this.get(
            'SELECT SUM(duration_min) as total FROM exercise_records WHERE user_id = ? AND record_date = ?',
            [userId, date]
        );
        
        const total = result?.total || 0;
        
        await this.run(`
            INSERT INTO daily_health_records (user_id, record_date, exercise_total_min)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, record_date) DO UPDATE SET 
                exercise_total_min = ?,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, date, total, total]);
    }

    // ==================== 健康指数 ====================

    async saveHealthIndex(indexData) {
        const { user_id, calc_date, water_score, food_score, sleep_score, exercise_score,
                index_1d, index_3d, index_7d, index_30d, final_index,
                water_total_ml, food_count, sleep_total_hours, exercise_total_min } = indexData;
        
        await this.run(`
            INSERT INTO health_index_history 
            (user_id, calc_date, water_score, food_score, sleep_score, exercise_score,
             index_1d, index_3d, index_7d, index_30d, final_index,
             water_total_ml, food_count, sleep_total_hours, exercise_total_min)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, calc_date) DO UPDATE SET
                water_score = ?, food_score = ?, sleep_score = ?, exercise_score = ?,
                index_1d = ?, index_3d = ?, index_7d = ?, index_30d = ?, final_index = ?,
                water_total_ml = ?, food_count = ?, sleep_total_hours = ?, exercise_total_min = ?,
                updated_at = CURRENT_TIMESTAMP
        `, [
            user_id, calc_date,
            water_score, food_score, sleep_score, exercise_score,
            index_1d, index_3d, index_7d, index_30d, final_index,
            water_total_ml, food_count, sleep_total_hours, exercise_total_min,
            water_score, food_score, sleep_score, exercise_score,
            index_1d, index_3d, index_7d, index_30d, final_index,
            water_total_ml, food_count, sleep_total_hours, exercise_total_min
        ]);
    }

    async getHealthIndexHistory(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        return await this.all(
            `SELECT * FROM health_index_history 
             WHERE user_id = ? AND calc_date >= ?
             ORDER BY calc_date DESC`,
            [userId, startDate.toISOString().split('T')[0]]
        );
    }

    async getLatestHealthIndex(userId) {
        return await this.get(
            'SELECT * FROM health_index_history WHERE user_id = ? ORDER BY calc_date DESC LIMIT 1',
            [userId]
        );
    }

    // ==================== 统计数据 ====================

    async getWeeklyStats(userId) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        
        return await this.get(`
            SELECT 
                COUNT(DISTINCT record_date) as record_days,
                AVG(water_total_ml) as avg_water,
                AVG(sleep_total_hours) as avg_sleep,
                AVG(exercise_total_min) as avg_exercise,
                AVG(mood_level) as avg_mood,
                AVG(energy_level) as avg_energy
            FROM daily_health_records
            WHERE user_id = ? AND record_date >= ?
        `, [userId, weekStart.toISOString().split('T')[0]]);
    }

    async getMonthlyTrend(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        return await this.all(`
            SELECT 
                record_date,
                water_total_ml,
                sleep_total_hours,
                exercise_total_min,
                mood_level,
                energy_level
            FROM daily_health_records
            WHERE user_id = ? AND record_date >= ?
            ORDER BY record_date ASC
        `, [userId, startDate.toISOString().split('T')[0]]);
    }

    // ==================== 聊天记录 ====================

    async saveChatSummary(record) {
        const { user_id, session_id, user_message, agent_reply, extracted_data, sentiment, user_mood, related_record_id, related_record_type } = record;
        
        const result = await this.run(`
            INSERT INTO chat_summaries 
            (user_id, session_id, user_message, agent_reply, extracted_data, sentiment, user_mood, related_record_id, related_record_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [user_id, session_id, user_message, agent_reply, 
            extracted_data ? JSON.stringify(extracted_data) : null, 
            sentiment, user_mood, related_record_id, related_record_type]);
        
        return result.lastID;
    }

    async getChatHistory(userId, limit = 50) {
        return await this.all(
            'SELECT * FROM chat_summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userId, limit]
        );
    }

    // ==================== 用户标签 ====================

    async getUserTags(userId) {
        return await this.all('SELECT * FROM user_tags WHERE user_id = ?', [userId]);
    }

    async updateUserTag(userId, tagName, tagValue, confidence, source) {
        await this.run(`
            INSERT INTO user_tags (user_id, tag_name, tag_value, confidence, source)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(user_id, tag_name) DO UPDATE SET
                tag_value = ?, confidence = ?, source = ?, updated_at = CURRENT_TIMESTAMP
        `, [userId, tagName, tagValue, confidence, source, tagValue, confidence, source]);
    }
}

// 导出单例
const database = new Database();
module.exports = database;
