/**
 * vibe-healing Backend Server v2.0
 * SQLite 数据库版本 - 健康陪伴系统 API 服务
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// 导入数据库和健康指数引擎
const db = require('./db');
const healthIndex = require('./health-index-sqlite');

// 全局数据库连接
let dbConnected = false;

// ==================== 初始化 ====================

async function initApp() {
    try {
        await db.connect();
        dbConnected = true;
        console.log('✅ 数据库连接成功');
        
        // 确保测试用户存在
        const testUser = await db.getUserById(1);
        if (!testUser) {
            await db.createUser({
                wx_openid: 'demo_user_001',
                nickname: '小伙伴',
                gender: '女',
                height_cm: 168,
                weight_kg: 55,
                health_goal: '减脂'
            });
            console.log('✅ 测试用户已创建');
        }
        
        console.log('✅ 应用初始化完成');
    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        console.log('⚠️  将以 JSON 降级模式运行');
    }
}

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
app.post('/api/user/init', async (req, res) => {
    try {
        const { wx_openid, nickname, avatar_url, gender, age, height_cm, weight_kg, occupation, work_type } = req.body;
        
        let user = await db.getUserByOpenId(wx_openid || 'demo_user_001');
        
        if (!user) {
            const userId = await db.createUser({
                wx_openid: wx_openid || 'demo_user_001',
                nickname, avatar_url, gender, age, height_cm, weight_kg, occupation, work_type
            });
            user = await db.getUserById(userId);
        } else if (nickname || height_cm || weight_kg) {
            // 更新用户信息
            await db.updateUser(user.id, { nickname, height_cm, weight_kg });
            user = await db.getUserById(user.id);
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        console.error('用户初始化失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户信息
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await db.getUserById(parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新用户
app.put('/api/user/:id', async (req, res) => {
    try {
        const { height_cm, weight_kg, nickname } = req.body;
        await db.updateUser(parseInt(req.params.id), { height_cm, weight_kg, nickname });
        const user = await db.getUserById(parseInt(req.params.id));
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 健康记录 API
 */

// 记录喝水
app.post('/api/health/water', async (req, res) => {
    try {
        const { user_id, amount_ml, time_period } = req.body;
        
        if (!user_id || !amount_ml) {
            return res.json({ success: false, message: '缺少必要参数' });
        }
        
        const result = await healthIndex.recordWater(user_id, amount_ml, time_period);
        res.json({ success: true, recordId: result.recordId, healthIndex: result.healthIndex });
    } catch (error) {
        console.error('记录喝水失败:', error);
        res.json({ success: false, message: '记录失败' });
    }
});

// 记录饮食
app.post('/api/health/food', async (req, res) => {
    try {
        const { user_id, food_type, meal_type } = req.body;
        
        if (!user_id || !food_type) {
            return res.json({ success: false, message: '缺少必要参数' });
        }
        
        const result = await healthIndex.recordFood(user_id, food_type, meal_type);
        res.json({ success: true, recordId: result.recordId, healthIndex: result.healthIndex });
    } catch (error) {
        console.error('记录饮食失败:', error);
        res.json({ success: false, message: '记录失败' });
    }
});

// 记录睡眠
app.post('/api/health/sleep', async (req, res) => {
    try {
        const { user_id, sleep_hours, sleep_quality, time_period } = req.body;
        
        if (!user_id || !sleep_hours) {
            return res.json({ success: false, message: '缺少必要参数' });
        }
        
        const result = await healthIndex.recordSleep(user_id, sleep_hours, sleep_quality, time_period);
        res.json({ success: true, recordId: result.recordId, healthIndex: result.healthIndex });
    } catch (error) {
        console.error('记录睡眠失败:', error);
        res.json({ success: false, message: '记录失败' });
    }
});

// 记录运动
app.post('/api/health/exercise', async (req, res) => {
    try {
        const { user_id, duration_min, exercise_type, time_period } = req.body;
        
        if (!user_id || !duration_min) {
            return res.json({ success: false, message: '缺少必要参数' });
        }
        
        const result = await healthIndex.recordExercise(user_id, duration_min, exercise_type, time_period);
        res.json({ success: true, recordId: result.recordId, healthIndex: result.healthIndex });
    } catch (error) {
        console.error('记录运动失败:', error);
        res.json({ success: false, message: '记录失败' });
    }
});

// 获取健康指数
app.get('/api/health/index', async (req, res) => {
    try {
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.json({ success: false, message: '缺少 user_id' });
        }
        
        const indexData = await healthIndex.getCurrentHealthIndex(user_id);
        res.json({ success: true, data: indexData });
    } catch (error) {
        console.error('获取健康指数失败:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

// 获取健康指数历史
app.get('/api/health/history', async (req, res) => {
    try {
        const { user_id, days = 30 } = req.query;
        
        if (!user_id) {
            return res.json({ success: false, message: '缺少 user_id' });
        }
        
        const history = await healthIndex.getHealthIndexHistory(user_id, parseInt(days));
        res.json({ success: true, data: history });
    } catch (error) {
        console.error('获取健康指数历史失败:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

// 获取每日记录
app.get('/api/health/daily', async (req, res) => {
    try {
        const { user_id, date } = req.query;
        
        if (!user_id) {
            return res.json({ success: false, message: '缺少 user_id' });
        }
        
        const records = await healthIndex.getDailyRecords(user_id, date || getToday());
        res.json({ success: true, data: records });
    } catch (error) {
        console.error('获取每日记录失败:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

/**
 * 统计数据 API (新增)
 */

app.get('/api/stats', async (req, res) => {
    try {
        const { user_id, days = 7 } = req.query;
        
        if (!user_id) {
            return res.json({ success: false, message: '缺少 user_id' });
        }
        
        const statsData = await healthIndex.getStatsData(user_id, parseInt(days));
        
        if (!statsData) {
            return res.json({ success: false, message: '暂无数据' });
        }
        
        res.json({ success: true, data: statsData });
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

/**
 * 首页数据 API
 */

app.get('/api/home', async (req, res) => {
    try {
        const { user_id } = req.query;
        const today = getToday();
        
        if (!user_id) {
            return res.json({ success: false, message: '缺少 user_id' });
        }
        
        const user = await db.getUserById(user_id);
        const dailyRecord = await db.getDailyRecord(user_id, today);
        const indexData = await healthIndex.getCurrentHealthIndex(user_id);
        
        // 计算连续打卡天数
        const records = await db.getDailyRecords(user_id, getToday(), getToday());
        const continuousDays = records && records.length > 0 ? 1 : 0; // 简化版
        
        // 生成建议
        const suggestions = generateDailySuggestions(dailyRecord, user);
        
        res.json({
            success: true,
            data: {
                date: today,
                mode: dailyRecord?.mode_type || 'stable',
                continuousDays,
                suggestions: suggestions.slice(0, 3),
                todayLog: dailyRecord,
                healthIndex: indexData.finalIndex
            }
        });
    } catch (error) {
        console.error('获取首页数据失败:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

function generateDailySuggestions(log, user) {
    const suggestions = [];
    const hour = new Date().getHours();
    
    const workLoad = log?.work_load || 'normal';
    const energyLevel = log?.energy_level || 5;
    
    if (workLoad === 'heavy' || energy_level <= 3) {
        suggestions.push({ type: 'water', text: '今天比较累，记得多喝几杯水', priority: 'high' });
        suggestions.push({ type: 'move', text: '饭后站立 10 分钟，不需要额外运动', priority: 'medium' });
        suggestions.push({ type: 'sleep', text: '今晚早点休息，别熬夜', priority: 'high' });
    } else if (workLoad === 'normal') {
        suggestions.push({ type: 'water', text: '今天目标：喝够 8 杯水', priority: 'medium' });
        suggestions.push({ type: 'move', text: '午休后散步 15 分钟', priority: 'medium' });
        suggestions.push({ type: 'food', text: '晚饭控制主食量，多吃蔬菜', priority: 'medium' });
    } else {
        suggestions.push({ type: 'water', text: '今天状态不错，喝够 10 杯水', priority: 'medium' });
        suggestions.push({ type: 'move', text: '可以安排 30 分钟运动（跑步/居家训练）', priority: 'high' });
        suggestions.push({ type: 'food', text: '注意蛋白质摄入，帮助身体恢复', priority: 'medium' });
    }
    
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
 * AI 聊天 API
 */

app.post('/api/chat', async (req, res) => {
    try {
        const { user_id, message } = req.body;
        
        if (!user_id || !message) {
            return res.json({ success: false, message: '缺少参数' });
        }
        
        const user = await db.getUserById(user_id);
        const today = getToday();
        const dailyRecord = await db.getDailyRecord(user_id, today);
        const userTags = await db.getUserTags(user_id);
        
        // AI 回复
        const reply = generateAIReply(message, user, dailyRecord, userTags);
        
        // 保存聊天记录
        await db.saveChatSummary({
            user_id,
            session_id: 'session_' + today,
            user_message: message,
            agent_reply: reply,
            sentiment: 'neutral'
        });
        
        res.json({ 
            success: true, 
            data: { 
                reply,
                timestamp: new Date().toISOString()
            } 
        });
    } catch (error) {
        console.error('聊天失败:', error);
        res.json({ success: false, message: '聊天失败' });
    }
});

// AI 回复生成器
function generateAIReply(message, user, log, userTags) {
    const lowerMsg = message.toLowerCase();
    
    const isOvertimeType = userTags?.some(t => t.tag_name === '高压加班型');
    
    if (lowerMsg.includes('累') || lowerMsg.includes('烦') || lowerMsg.includes('辛苦')) {
        if (isOvertimeType) {
            return `最近加班挺多的吧，辛苦了。这种时候别给自己太大压力，健康是长期的事，先把基本的水喝够、饭吃好就已经很好了。我在这儿陪着你呢～ 🌙`;
        }
        return `听起来今天确实不容易呢。工作辛苦的时候，健康计划可以适当放松一些。今晚早点休息，明天又是新的一天～ 🌙`;
    }
    
    if (lowerMsg.includes('加班') || lowerMsg.includes('忙') || lowerMsg.includes('工作多')) {
        const currentHour = new Date().getHours();
        if (currentHour >= 21) {
            return `这么晚还在忙啊，辛苦了！这种情况下，咱们启动「保底模式」：记得多喝水，晚饭尽量清淡，睡前别吃太饱。能做到的话，站起来活动 2 分钟就已经很好了！💪`;
        }
        return `加班辛苦了！这种情况下，咱们启动「保底模式」：记得多喝水，晚饭尽量清淡，睡前别吃太饱。能做到的话，站起来活动 2 分钟就已经很好了！💪`;
    }
    
    if (lowerMsg.includes('睡') || lowerMsg.includes('困') || lowerMsg.includes('熬夜')) {
        return `睡眠很重要哦！尽量保证 7-8 小时的睡眠，中午也可以小憩 15-20 分钟。今晚争取早点休息，我到时候提醒你～`;
    }
    
    if (lowerMsg.includes('吃') || lowerMsg.includes('饭') || lowerMsg.includes('饿') || lowerMsg.includes('奶茶') || lowerMsg.includes('外卖')) {
        if (lowerMsg.includes('奶茶')) {
            return `想喝奶茶了？可以选无糖或三分糖，解馋又健康～ 或者试试气泡水加柠檬，也挺满足的！🥤`;
        }
        if (lowerMsg.includes('外卖')) {
            return `点外卖的话，建议选清淡一些的，比如蒸菜、沙拉、鸡胸肉这类。避免油炸和重口味的，对身体负担小～ 🥗`;
        }
        return `吃饭是大事！如果点外卖，建议选清淡一些的，比如蒸菜、沙拉、鸡胸肉这类。奶茶可以选无糖或三分糖，解馋又健康～ 🥗`;
    }
    
    if (lowerMsg.includes('运动') || lowerMsg.includes('锻炼') || lowerMsg.includes('跑') || lowerMsg.includes('健身')) {
        return `运动计划可以安排上！如果时间紧张，20 分钟居家训练也有效果。关键是动起来，不求完美～ 🏃`;
    }
    
    if (lowerMsg.includes('好') || lowerMsg.includes('棒') || lowerMsg.includes('谢谢') || lowerMsg.includes('有用')) {
        return `你做得很好！健康是长期的事，不用追求完美。每天进步一点点，积累起来就是大变化～ 我会一直陪着你的！🌟`;
    }
    
    const hour = new Date().getHours();
    if (hour < 12) {
        return `早上好呀！今天有什么健康小目标吗？比如多喝两杯水、午饭后散个步，都是很好的开始～ ☀️`;
    } else if (hour < 18) {
        return `下午好！工作累的话记得起来活动活动，接杯水、伸个懒腰，对身体都好～ 💪`;
    } else if (hour < 23) {
        return `晚上好！今天过得怎么样？如果还没记录今天的饮食和运动，可以花一分钟记一下～`;
    } else {
        return `这么晚还没休息呀？早点睡吧，明天又是新的一天。晚安～ 🌙`;
    }
}

/**
 * 周报 API
 */

app.get('/api/report/weekly', async (req, res) => {
    try {
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.json({ success: false, message: '缺少 user_id' });
        }
        
        const statsData = await healthIndex.getStatsData(user_id, 7);
        
        if (!statsData) {
            return res.json({ success: false, message: '暂无数据' });
        }
        
        const summary = generateWeeklySummary(statsData);
        
        res.json({ success: true, data: { stats: statsData, summary } });
    } catch (error) {
        console.error('获取周报失败:', error);
        res.json({ success: false, message: '获取失败' });
    }
});

function generateWeeklySummary(stats) {
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
    
    if (stats.avgWater >= 1500) {
        messages.push('💧 喝水习惯很好，身体会感谢你的！');
    }
    
    if (messages.length === 0) {
        messages.push('🌟 这周平稳度过，下周继续加油！');
    }
    
    return messages.join('\n');
}

// ==================== 页面路由 ====================

app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/pages/stats.html'));
});

app.get('/select-user.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/select-user.html'));
});

// ==================== 启动服务器 ====================

initApp().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🦞 vibe-healing 健康陪伴系统 v2.0                       ║
║                                                           ║
║   服务器已启动：http://localhost:${PORT}                    ║
║   数据库：SQLite                                          ║
║   统计页面：http://localhost:${PORT}/stats                  ║
║                                                           ║
║   功能：SQLite 存储 + 健康指数 + 数据可视化               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
        `);
    });
});

module.exports = app;
