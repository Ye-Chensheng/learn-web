/**
 * vibe-healing Backend Server
 * 健康陪伴系统 API 服务
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// 初始化数据库
const dbPath = path.join(__dirname, '../db/vibe_healing.db');
const db = new Database(dbPath);

// 读取并执行 schema
const schemaPath = path.join(__dirname, '../db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

console.log('✅ 数据库初始化完成');

// ==================== 工具函数 ====================

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

// ==================== API 路由 ====================

/**
 * 用户相关 API
 */

// 创建/获取用户
app.post('/api/user/init', (req, res) => {
    const { wx_openid, nickname, avatar_url, gender, age, height_cm, weight_kg, occupation, work_type } = req.body;
    
    try {
        const stmt = db.prepare(`
            INSERT INTO users (wx_openid, nickname, avatar_url, gender, age, height_cm, weight_kg, occupation, work_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(wx_openid) DO UPDATE SET
                nickname = excluded.nickname,
                avatar_url = excluded.avatar_url,
                updated_at = CURRENT_TIMESTAMP
        `);
        
        const result = stmt.run(
            wx_openid || 'demo_user_001',
            nickname || '小伙伴',
            avatar_url || '',
            gender || 0,
            age || null,
            height_cm || null,
            weight_kg || null,
            occupation || '',
            work_type || ''
        );
        
        const user = db.prepare('SELECT * FROM users WHERE wx_openid = ?').get(wx_openid || 'demo_user_001');
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户信息
app.get('/api/user/:id', (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 健康日志 API
 */

// 获取今日日志
app.get('/api/logs/today', (req, res) => {
    const userId = req.query.user_id || 1;
    const today = getToday();
    
    try {
        let log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?').get(userId, today);
        
        if (!log) {
            // 创建空日志
            const stmt = db.prepare(`
                INSERT INTO daily_logs (user_id, log_date, mode_type)
                VALUES (?, ?, 'stable')
            `);
            stmt.run(userId, today);
            log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?').get(userId, today);
        }
        
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新日志
app.put('/api/logs/:id', (req, res) => {
    const { weight_kg, sleep_hours, sleep_quality, water_cups, steps, exercise_type, exercise_duration, mood_level, energy_level, work_load, special_note } = req.body;
    
    try {
        const stmt = db.prepare(`
            UPDATE daily_logs SET
                weight_kg = COALESCE(?, weight_kg),
                sleep_hours = COALESCE(?, sleep_hours),
                sleep_quality = COALESCE(?, sleep_quality),
                water_cups = COALESCE(?, water_cups),
                steps = COALESCE(?, steps),
                exercise_type = COALESCE(?, exercise_type),
                exercise_duration = COALESCE(?, exercise_duration),
                mood_level = COALESCE(?, mood_level),
                energy_level = COALESCE(?, energy_level),
                work_load = COALESCE(?, work_load),
                special_note = COALESCE(?, special_note),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        
        stmt.run(
            weight_kg, sleep_hours, sleep_quality, water_cups, steps,
            exercise_type, exercise_duration, mood_level, energy_level,
            work_load, special_note, req.params.id
        );
        
        const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(req.params.id);
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取历史日志
app.get('/api/logs/history', (req, res) => {
    const userId = req.query.user_id || 1;
    const days = req.query.days || 7;
    
    try {
        const logs = db.prepare(`
            SELECT * FROM daily_logs 
            WHERE user_id = ? 
            ORDER BY log_date DESC 
            LIMIT ?
        `).all(userId, days);
        
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 饮食记录 API
 */

// 添加饮食记录
app.post('/api/food', (req, res) => {
    const { user_id, meal_type, food_name, food_desc, calories, is_healthy } = req.body;
    
    try {
        const stmt = db.prepare(`
            INSERT INTO food_records (user_id, log_date, meal_type, food_name, food_desc, calories, is_healthy)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(
            user_id || 1,
            getToday(),
            meal_type,
            food_name,
            food_desc || '',
            calories || null,
            is_healthy !== undefined ? is_healthy : 1
        );
        
        res.json({ success: true, data: { id: result.lastInsertRowid } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取今日饮食
app.get('/api/food/today', (req, res) => {
    const userId = req.query.user_id || 1;
    const today = getToday();
    
    try {
        const foods = db.prepare(`
            SELECT * FROM food_records 
            WHERE user_id = ? AND log_date = ?
            ORDER BY 
                CASE meal_type 
                    WHEN 'breakfast' THEN 1 
                    WHEN 'lunch' THEN 2 
                    WHEN 'dinner' THEN 3 
                    WHEN 'snack' THEN 4 
                END
        `).all(userId, today);
        
        res.json({ success: true, data: foods });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * AI 聊天 API
 */

// 发送消息
app.post('/api/chat', (req, res) => {
    const { user_id, message } = req.body;
    
    try {
        // 获取用户信息
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id || 1);
        
        // 获取今日日志
        const today = getToday();
        const log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?').get(user_id || 1, today);
        
        // 获取最近 7 天日志
        const recentLogs = db.prepare(`
            SELECT * FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 7
        `).all(user_id || 1);
        
        // 简单的 AI 回复逻辑（MVP 版本）
        const reply = generateAIReply(message, user, log, recentLogs);
        
        // 保存聊天记录
        const stmt = db.prepare(`
            INSERT INTO chat_summaries (user_id, session_id, user_message, agent_reply, sentiment)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(user_id || 1, 'session_' + today, message, reply, 'neutral');
        
        res.json({ 
            success: true, 
            data: { 
                reply,
                timestamp: new Date().toISOString()
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 简单的 AI 回复生成器
function generateAIReply(message, user, log, recentLogs) {
    const lowerMsg = message.toLowerCase();
    
    // 检测情绪
    if (lowerMsg.includes('累') || lowerMsg.includes('烦') || lowerMsg.includes('辛苦')) {
        return `听起来今天确实不容易呢。工作辛苦的时候，健康计划可以适当放松一些。今晚早点休息，明天又是新的一天～ 🌙`;
    }
    
    if (lowerMsg.includes('加班')) {
        return `加班辛苦了！这种情况下，咱们启动「保底模式」：记得多喝水，晚饭尽量清淡，睡前别吃太饱。能做到的话，站起来活动 2 分钟就已经很好了！💪`;
    }
    
    if (lowerMsg.includes('睡') || lowerMsg.includes('困')) {
        const sleepHours = log?.sleep_hours || 0;
        if (sleepHours < 7) {
            return `昨晚只睡了${sleepHours}小时啊，今天确实容易犯困。中午可以小憩 15-20 分钟，下午会精神一些。今晚争取早点休息～`;
        }
        return `睡眠还好就好！精力充足的时候，可以试试午饭后散个步，对身体很有好处～`;
    }
    
    if (lowerMsg.includes('吃') || lowerMsg.includes('饭') || lowerMsg.includes('饿')) {
        return `吃饭是大事！如果点外卖，建议选清淡一些的，比如蒸菜、沙拉、鸡胸肉这类。奶茶可以选无糖或三分糖，解馋又健康～ 🥗`;
    }
    
    if (lowerMsg.includes('运动') || lowerMsg.includes('锻炼') || lowerMsg.includes('跑')) {
        const workLoad = log?.work_load || 'normal';
        if (workLoad === 'heavy') {
            return `今天工作强度大，运动可以适度降低一些。散步 20 分钟或者做做拉伸就很好，别给自己太大压力～`;
        }
        return `运动计划可以安排上！如果时间紧张，20 分钟居家训练也有效果。关键是动起来，不求完美～ 🏃`;
    }
    
    if (lowerMsg.includes('体重') || lowerMsg.includes('称') || lowerMsg.includes('kg')) {
        const weight = log?.weight_kg || user?.weight_kg;
        if (weight) {
            return `当前体重 ${weight}kg。记住，体重只是参考，更重要的是你的整体状态和感受。持续记录就是进步！📊`;
        }
        return `还没记录体重呢。找个固定的时间（比如早起空腹）称重，数据会更有参考价值～`;
    }
    
    if (lowerMsg.includes('好') || lowerMsg.includes('棒') || lowerMsg.includes('谢谢')) {
        return `你做得很好！健康是长期的事，不用追求完美。每天进步一点点，积累起来就是大变化～ 🌟`;
    }
    
    // 默认回复
    const hour = new Date().getHours();
    if (hour < 12) {
        return `早上好呀！今天有什么健康小目标吗？比如多喝两杯水、午饭后散个步，都是很好的开始～ ☀️`;
    } else if (hour < 18) {
        return `下午好！工作累的话记得起来活动活动，接杯水、伸个懒腰，对身体都好～ 💪`;
    } else {
        return `晚上好！今天过得怎么样？如果还没记录今天的饮食和运动，可以花一分钟记一下～ `;
    }
}

/**
 * 每日建议 API
 */

app.get('/api/suggestions/today', (req, res) => {
    const userId = req.query.user_id || 1;
    const today = getToday();
    
    try {
        const log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?').get(userId, today);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        
        // 根据状态生成建议
        const suggestions = generateDailySuggestions(log, user);
        
        res.json({ success: true, data: { date: today, suggestions, mode: log?.mode_type || 'stable' } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateDailySuggestions(log, user) {
    const suggestions = [];
    const hour = new Date().getHours();
    
    // 根据工作负荷调整建议
    const workLoad = log?.work_load || 'normal';
    const energyLevel = log?.energy_level || 5;
    
    if (workLoad === 'heavy' || energyLevel <= 3) {
        // 保底模式
        suggestions.push({ type: 'water', text: '今天比较累，记得多喝几杯水', priority: 'high' });
        suggestions.push({ type: 'move', text: '饭后站立 10 分钟，不需要额外运动', priority: 'medium' });
        suggestions.push({ type: 'sleep', text: '今晚早点休息，别熬夜', priority: 'high' });
    } else if (workLoad === 'normal') {
        // 稳态模式
        suggestions.push({ type: 'water', text: '今天目标：喝够 8 杯水', priority: 'medium' });
        suggestions.push({ type: 'move', text: '午休后散步 15 分钟', priority: 'medium' });
        suggestions.push({ type: 'food', text: '晚饭控制主食量，多吃蔬菜', priority: 'medium' });
    } else {
        // 进阶模式
        suggestions.push({ type: 'water', text: '今天状态不错，喝够 10 杯水', priority: 'medium' });
        suggestions.push({ type: 'move', text: '可以安排 30 分钟运动（跑步/居家训练）', priority: 'high' });
        suggestions.push({ type: 'food', text: '注意蛋白质摄入，帮助身体恢复', priority: 'medium' });
    }
    
    // 根据时间添加建议
    if (hour >= 11 && hour < 14) {
        suggestions.push({ type: 'food', text: '午饭时间到，记得好好吃饭', priority: 'high' });
    } else if (hour >= 18 && hour < 21) {
        suggestions.push({ type: 'food', text: '晚饭时间，别吃太晚太饱', priority: 'high' });
    } else if (hour >= 22) {
        suggestions.push({ type: 'sleep', text: '时间不早了，准备休息吧', priority: 'high' });
    }
    
    return suggestions;
}

/**
 * 周报 API
 */

app.get('/api/report/weekly', (req, res) => {
    const userId = req.query.user_id || 1;
    
    try {
        const weekRange = getWeekRange();
        const logs = db.prepare(`
            SELECT * FROM daily_logs 
            WHERE user_id = ? AND log_date BETWEEN ? AND ?
            ORDER BY log_date
        `).all(userId, weekRange.start, weekRange.end);
        
        // 计算统计数据
        const stats = {
            weekStart: weekRange.start,
            weekEnd: weekRange.end,
            totalDays: logs.length,
            avgSleep: logs.reduce((sum, l) => sum + (l.sleep_hours || 0), 0) / (logs.length || 1),
            avgWater: logs.reduce((sum, l) => sum + (l.water_cups || 0), 0) / (logs.length || 1),
            totalSteps: logs.reduce((sum, l) => sum + (l.steps || 0), 0),
            exerciseDays: logs.filter(l => l.exercise_duration > 0).length,
            avgMood: logs.reduce((sum, l) => sum + (l.mood_level || 5), 0) / (logs.length || 1),
            avgEnergy: logs.reduce((sum, l) => sum + (l.energy_level || 5), 0) / (logs.length || 1),
        };
        
        // 生成周报复语文案
        const summary = generateWeeklySummary(stats, logs);
        
        res.json({ success: true, data: { stats, summary } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateWeeklySummary(stats, logs) {
    const messages = [];
    
    if (stats.avgSleep >= 7) {
        messages.push('🌙 这周睡眠整体不错，继续保持！');
    } else if (stats.avgSleep < 6) {
        messages.push('😴 这周睡得有点少，下周争取早点休息～');
    }
    
    if (stats.exerciseDays >= 3) {
        messages.push('🏃 运动坚持得很好，已经养成习惯了！');
    } else if (stats.exerciseDays > 0) {
        messages.push('💪 有运动就是好的开始，下周可以继续增加～');
    }
    
    if (stats.avgWater >= 8) {
        messages.push('💧 喝水习惯很好，身体会感谢你的！');
    }
    
    if (logs.length < 7) {
        messages.push('📝 这周记录还不够完整，下周记得每天都来打卡哦～');
    }
    
    if (messages.length === 0) {
        messages.push('🌟 这周平稳度过，下周继续加油！');
    }
    
    return messages.join('\n');
}

/**
 * 首页数据 API
 */

app.get('/api/home', (req, res) => {
    const userId = req.query.user_id || 1;
    const today = getToday();
    
    try {
        const log = db.prepare('SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?').get(userId, today);
        const suggestions = generateDailySuggestions(log, null);
        
        // 计算连续打卡天数
        const recentLogs = db.prepare(`
            SELECT log_date FROM daily_logs 
            WHERE user_id = ? AND water_cups > 0 OR exercise_duration > 0
            ORDER BY log_date DESC LIMIT 30
        `).all(userId);
        
        const continuousDays = calculateContinuousDays(recentLogs);
        
        res.json({
            success: true,
            data: {
                date: today,
                mode: log?.mode_type || 'stable',
                continuousDays,
                suggestions: suggestions.slice(0, 3),
                todayLog: log
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function calculateContinuousDays(logs) {
    if (logs.length === 0) return 0;
    
    let days = 1;
    const today = new Date();
    
    for (let i = 1; i < logs.length; i++) {
        const prevDate = new Date(logs[i].log_date);
        const currDate = new Date(logs[i - 1].log_date);
        const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (diff === 1) {
            days++;
        } else {
            break;
        }
    }
    
    return days;
}

// ==================== 启动服务器 ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🦞 vibe-healing 健康陪伴系统                            ║
║                                                           ║
║   服务器已启动：http://localhost:${PORT}                    ║
║   数据库：${dbPath}                                          ║
║                                                           ║
║   MVP 版本 v1.0 - 持续开发中...                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
