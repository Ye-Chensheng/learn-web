/**
 * vibe-healing Backend Server
 * 健康陪伴系统 API 服务 (JSON 文件存储版本)
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// 数据文件路径
const dbPath = path.join(__dirname, '../db/data.json');

// 初始化数据结构
function initDatabase() {
    const defaultData = {
        users: [],
        userGoals: [],
        dailyLogs: [],
        foodRecords: [],
        chatSummaries: [],
        userTags: [],
        weeklyPlans: [],
        aiSuggestions: []
    };
    
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
        console.log('✅ 数据库初始化完成');
    }
    
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

// 保存数据
function saveDatabase(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// 获取数据库
function getDatabase() {
    try {
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (error) {
        return initDatabase();
    }
}

// 初始化
let db = initDatabase();

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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== API 路由 ====================

/**
 * 用户相关 API
 */

// 创建/获取用户
app.post('/api/user/init', (req, res) => {
    const { wx_openid, nickname, avatar_url, gender, age, height_cm, weight_kg, occupation, work_type } = req.body;
    
    try {
        db = getDatabase();
        let user = db.users.find(u => u.wx_openid === (wx_openid || 'demo_user_001'));
        
        if (!user) {
            user = {
                id: db.users.length + 1,
                wx_openid: wx_openid || 'demo_user_001',
                nickname: nickname || '小伙伴',
                avatar_url: avatar_url || '',
                gender: gender || 0,
                age: age || null,
                height_cm: height_cm || null,
                weight_kg: weight_kg || null,
                occupation: occupation || '',
                work_type: work_type || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.users.push(user);
            saveDatabase(db);
        }
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取用户信息
app.get('/api/user/:id', (req, res) => {
    try {
        db = getDatabase();
        const user = db.users.find(u => u.id === parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 更新用户
app.put('/api/user/:id', (req, res) => {
    try {
        db = getDatabase();
        const userIndex = db.users.findIndex(u => u.id === parseInt(req.params.id));
        if (userIndex === -1) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        
        const { height_cm, weight_kg } = req.body;
        if (height_cm !== undefined) db.users[userIndex].height_cm = height_cm;
        if (weight_kg !== undefined) db.users[userIndex].weight_kg = weight_kg;
        db.users[userIndex].updatedAt = new Date().toISOString();
        
        saveDatabase(db);
        res.json({ success: true, data: db.users[userIndex] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 健康日志 API
 */

// 获取今日日志
app.get('/api/logs/today', (req, res) => {
    const userId = parseInt(req.query.user_id) || 1;
    const today = getToday();
    
    try {
        db = getDatabase();
        let log = db.dailyLogs.find(l => l.userId === userId && l.logDate === today);
        
        if (!log) {
            log = {
                id: generateId(),
                userId,
                logDate: today,
                weightKg: null,
                sleepHours: null,
                sleepQuality: null,
                waterCups: 0,
                steps: 0,
                exerciseType: null,
                exerciseDuration: 0,
                moodLevel: 5,
                energyLevel: 5,
                workLoad: 'normal',
                specialNote: '',
                modeType: 'stable',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.dailyLogs.push(log);
            saveDatabase(db);
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
        db = getDatabase();
        const logIndex = db.dailyLogs.findIndex(l => l.id === req.params.id);
        
        if (logIndex === -1) {
            return res.status(404).json({ success: false, error: '日志不存在' });
        }
        
        const log = db.dailyLogs[logIndex];
        if (weight_kg !== undefined) log.weightKg = weight_kg;
        if (sleep_hours !== undefined) log.sleepHours = sleep_hours;
        if (sleep_quality !== undefined) log.sleepQuality = sleep_quality;
        if (water_cups !== undefined) log.waterCups = water_cups;
        if (steps !== undefined) log.steps = steps;
        if (exercise_type !== undefined) log.exerciseType = exercise_type;
        if (exercise_duration !== undefined) log.exerciseDuration = exercise_duration;
        if (mood_level !== undefined) log.moodLevel = mood_level;
        if (energy_level !== undefined) log.energyLevel = energy_level;
        if (work_load !== undefined) log.workLoad = work_load;
        if (special_note !== undefined) log.specialNote = special_note;
        log.updatedAt = new Date().toISOString();
        
        // 根据工作负荷调整模式
        if (work_load === 'heavy' || energy_level <= 3) {
            log.modeType = 'light';
        } else if (work_load === 'normal') {
            log.modeType = 'stable';
        } else {
            log.modeType = 'heavy';
        }
        
        saveDatabase(db);
        res.json({ success: true, data: log });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取历史日志
app.get('/api/logs/history', (req, res) => {
    const userId = parseInt(req.query.user_id) || 1;
    const days = parseInt(req.query.days) || 7;
    
    try {
        db = getDatabase();
        const logs = db.dailyLogs
            .filter(l => l.userId === userId)
            .sort((a, b) => b.logDate.localeCompare(a.logDate))
            .slice(0, days);
        
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
        db = getDatabase();
        const record = {
            id: generateId(),
            userId: user_id || 1,
            logDate: getToday(),
            mealType: meal_type,
            foodName: food_name,
            foodDesc: food_desc || '',
            calories: calories || null,
            isHealthy: is_healthy !== undefined ? is_healthy : true,
            createdAt: new Date().toISOString()
        };
        
        db.foodRecords.push(record);
        saveDatabase(db);
        
        res.json({ success: true, data: { id: record.id } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 获取今日饮食
app.get('/api/food/today', (req, res) => {
    const userId = parseInt(req.query.user_id) || 1;
    const today = getToday();
    
    try {
        db = getDatabase();
        const foods = db.foodRecords
            .filter(f => f.userId === userId && f.logDate === today)
            .sort((a, b) => {
                const order = { breakfast: 1, lunch: 2, dinner: 3, snack: 4 };
                return (order[a.mealType] || 5) - (order[b.mealType] || 5);
            });
        
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
        db = getDatabase();
        const user = db.users.find(u => u.id === (user_id || 1));
        const today = getToday();
        const log = db.dailyLogs.find(l => l.userId === (user_id || 1) && l.logDate === today);
        const recentLogs = db.dailyLogs
            .filter(l => l.userId === (user_id || 1))
            .sort((a, b) => b.logDate.localeCompare(a.logDate))
            .slice(0, 7);
        
        // AI 回复
        const reply = generateAIReply(message, user, log, recentLogs);
        
        // 保存聊天记录
        db.chatSummaries.push({
            id: generateId(),
            userId: user_id || 1,
            sessionId: 'session_' + today,
            userMessage: message,
            agentReply: reply,
            sentiment: 'neutral',
            createdAt: new Date().toISOString()
        });
        saveDatabase(db);
        
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

// AI 回复生成器 - 拟人化陪伴逻辑
function generateAIReply(message, user, log, recentLogs) {
    const lowerMsg = message.toLowerCase();
    
    // 获取用户画像标签
    const userTags = db?.userTags?.filter(t => t.userId === (user?.id || 1)) || [];
    const isOvertimeType = userTags.some(t => t.tagName === '高压加班型');
    const needsEncouragement = userTags.some(t => t.tagName === '适合鼓励式沟通');
    
    // 计算最近平均状态
    const avgSleep = recentLogs.length > 0 
        ? recentLogs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / recentLogs.length 
        : 7;
    const avgEnergy = recentLogs.length > 0 
        ? recentLogs.reduce((sum, l) => sum + (l.energyLevel || 5), 0) / recentLogs.length 
        : 5;
    
    // 情绪理解优先
    if (lowerMsg.includes('累') || lowerMsg.includes('烦') || lowerMsg.includes('辛苦') || lowerMsg.includes('烦')) {
        if (isOvertimeType) {
            return `最近加班挺多的吧，辛苦了。这种时候别给自己太大压力，健康是长期的事，先把基本的水喝够、饭吃好就已经很好了。我在这儿陪着你呢～ 🌙`;
        }
        return `听起来今天确实不容易呢。工作辛苦的时候，健康计划可以适当放松一些。今晚早点休息，明天又是新的一天～ 🌙`;
    }
    
    // 加班场景
    if (lowerMsg.includes('加班') || lowerMsg.includes('忙') || lowerMsg.includes('工作多')) {
        const currentHour = new Date().getHours();
        if (currentHour >= 21) {
            return `这么晚还在忙啊，辛苦了！这种情况下，咱们启动「保底模式」：记得多喝水，晚饭尽量清淡，睡前别吃太饱。能做到的话，站起来活动 2 分钟就已经很好了！💪`;
        }
        return `加班辛苦了！这种情况下，咱们启动「保底模式」：记得多喝水，晚饭尽量清淡，睡前别吃太饱。能做到的话，站起来活动 2 分钟就已经很好了！💪`;
    }
    
    // 睡眠相关
    if (lowerMsg.includes('睡') || lowerMsg.includes('困') || lowerMsg.includes('熬夜')) {
        const sleepHours = log?.sleepHours || avgSleep;
        if (sleepHours && sleepHours < 7) {
            return `昨晚只睡了${sleepHours.toFixed(1)}小时啊，今天确实容易犯困。中午可以小憩 15-20 分钟，下午会精神一些。今晚争取早点休息，我到时候提醒你～`;
        }
        return `睡眠还好就好！精力充足的时候，可以试试午饭后散个步，对身体很有好处～`;
    }
    
    // 饮食相关
    if (lowerMsg.includes('吃') || lowerMsg.includes('饭') || lowerMsg.includes('饿') || lowerMsg.includes('奶茶') || lowerMsg.includes('外卖')) {
        if (lowerMsg.includes('奶茶')) {
            return `想喝奶茶了？可以选无糖或三分糖，解馋又健康～ 或者试试气泡水加柠檬，也挺满足的！🥤`;
        }
        if (lowerMsg.includes('外卖')) {
            return `点外卖的话，建议选清淡一些的，比如蒸菜、沙拉、鸡胸肉这类。避免油炸和重口味的，对身体负担小～ 🥗`;
        }
        return `吃饭是大事！如果点外卖，建议选清淡一些的，比如蒸菜、沙拉、鸡胸肉这类。奶茶可以选无糖或三分糖，解馋又健康～ 🥗`;
    }
    
    // 运动相关
    if (lowerMsg.includes('运动') || lowerMsg.includes('锻炼') || lowerMsg.includes('跑') || lowerMsg.includes('健身')) {
        const workLoad = log?.workLoad || 'normal';
        const energyLevel = log?.energyLevel || avgEnergy;
        
        if (workLoad === 'heavy' || energyLevel <= 3) {
            return `今天工作强度大/状态一般，运动可以适度降低一些。散步 20 分钟或者做做拉伸就很好，别给自己太大压力～`;
        }
        return `运动计划可以安排上！如果时间紧张，20 分钟居家训练也有效果。关键是动起来，不求完美～ 🏃`;
    }
    
    // 体重相关
    if (lowerMsg.includes('体重') || lowerMsg.includes('称') || lowerMsg.includes('kg') || lowerMsg.includes('斤')) {
        const weight = log?.weightKg || user?.weightKg;
        if (weight) {
            return `当前体重 ${weight}kg。记住，体重只是参考，更重要的是你的整体状态和感受。持续记录就是进步！📊`;
        }
        return `还没记录体重呢。找个固定的时间（比如早起空腹）称重，数据会更有参考价值～`;
    }
    
    // 生理期关怀 (针对女性用户)
    if (lowerMsg.includes('生理期') || lowerMsg.includes('姨妈') || lowerMsg.includes('肚子疼')) {
        return `生理期要多注意休息，别碰冷水，吃点温热的食物。运动可以暂停几天，等身体舒服了再继续。照顾好自己～ 🌸`;
    }
    
    // 出差场景
    if (lowerMsg.includes('出差') || lowerMsg.includes('酒店') || lowerMsg.includes('旅行')) {
        return `出差在外，条件有限，咱们调整一下目标：少油少甜、每天走 6000 步、多喝水。酒店房间也可以做简单的拉伸，保持活动就好～`;
    }
    
    // 进步鼓励
    if (lowerMsg.includes('好') || lowerMsg.includes('棒') || lowerMsg.includes('谢谢') || lowerMsg.includes('有用')) {
        return `你做得很好！健康是长期的事，不用追求完美。每天进步一点点，积累起来就是大变化～ 我会一直陪着你的！🌟`;
    }
    
    // 负面情绪安抚
    if (lowerMsg.includes('放弃') || lowerMsg.includes('没用') || lowerMsg.includes('坚持不了')) {
        return `别这么说，你已经做得很好了。健康不是短跑，是马拉松。有时候慢一点、停一停都没关系，重要的是别放弃自己。我在这儿陪着你，咱们一起慢慢来～ 💚`;
    }
    
    // 默认回复 (带时间感知)
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
 * 每日建议 API
 */

app.get('/api/suggestions/today', (req, res) => {
    const userId = parseInt(req.query.user_id) || 1;
    const today = getToday();
    
    try {
        db = getDatabase();
        const log = db.dailyLogs.find(l => l.userId === userId && l.logDate === today);
        const user = db.users.find(u => u.id === userId);
        
        const suggestions = generateDailySuggestions(log, user);
        
        res.json({ success: true, data: { date: today, suggestions, mode: log?.modeType || 'stable' } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function generateDailySuggestions(log, user) {
    const suggestions = [];
    const hour = new Date().getHours();
    
    const workLoad = log?.workLoad || 'normal';
    const energyLevel = log?.energyLevel || 5;
    
    if (workLoad === 'heavy' || energyLevel <= 3) {
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
 * 周报 API
 */

app.get('/api/report/weekly', (req, res) => {
    const userId = parseInt(req.query.user_id) || 1;
    
    try {
        db = getDatabase();
        const weekRange = getWeekRange();
        const logs = db.dailyLogs
            .filter(l => l.userId === userId && l.logDate >= weekRange.start && l.logDate <= weekRange.end)
            .sort((a, b) => a.logDate.localeCompare(b.logDate));
        
        const stats = {
            weekStart: weekRange.start,
            weekEnd: weekRange.end,
            totalDays: logs.length,
            avgSleep: logs.reduce((sum, l) => sum + (l.sleepHours || 0), 0) / (logs.length || 1),
            avgWater: logs.reduce((sum, l) => sum + (l.waterCups || 0), 0) / (logs.length || 1),
            totalSteps: logs.reduce((sum, l) => sum + (l.steps || 0), 0),
            exerciseDays: logs.filter(l => l.exerciseDuration > 0).length,
            avgMood: logs.reduce((sum, l) => sum + (l.moodLevel || 5), 0) / (logs.length || 1),
            avgEnergy: logs.reduce((sum, l) => sum + (l.energyLevel || 5), 0) / (logs.length || 1),
        };
        
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
    const userId = parseInt(req.query.user_id) || 1;
    const today = getToday();
    
    try {
        db = getDatabase();
        const log = db.dailyLogs.find(l => l.userId === userId && l.logDate === today);
        const suggestions = generateDailySuggestions(log, null);
        
        const recentLogs = db.dailyLogs
            .filter(l => l.userId === userId && (l.waterCups > 0 || l.exerciseDuration > 0))
            .sort((a, b) => b.logDate.localeCompare(a.logDate))
            .slice(0, 30);
        
        const continuousDays = calculateContinuousDays(recentLogs);
        
        res.json({
            success: true,
            data: {
                date: today,
                mode: log?.modeType || 'stable',
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
        const prevDate = new Date(logs[i].logDate);
        const currDate = new Date(logs[i - 1].logDate);
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
