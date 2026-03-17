/**
 * vibe-healing 前端应用 - v3.1 日期选择优化
 */

const API_BASE = window.location.origin + '/api';

let currentUserId = 1;
let currentUser = null;
let currentRecordType = null;
let currentRecordValue = null;
let selectedTime = null;

// 打卡记录存储
let checkInRecords = {};

// 用户示例数据
const userDemoProfile = {
    wakeTime: '7:30-8:00',
    workStart: '9:00-9:30',
    lunchBreak: '12:00-13:00',
    offWork: '20:00-21:00',
    goal: '减脂'
};

// 日期相关
let selectedDate = new Date();
let currentPickerMonth = new Date();
const today = new Date();

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    loadCheckInRecords();
});

async function initApp() {
    console.log('🦞 vibe-healing v3.2 启动中...');
    await initUser();
    updateDateTime();
    updateBackToTodayButton();
    updateCheckInDisplay();
    await loadHomeData();
    await loadHealthIndex();
    console.log('✅ 应用初始化完成');
}

function setupEventListeners() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
}

// ==================== 日期时间 ====================

function updateDateTime() {
    const dateEl = document.getElementById('ai-date');
    const dateStr = formatDate(selectedDate);
    if (dateEl) dateEl.textContent = dateStr;
}

function formatDate(date) {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${weekDays[date.getDay()]}`;
}

function isToday(date) {
    return date.toDateString() === today.toDateString();
}

function updateBackToTodayButton() {
    const btn = document.getElementById('btn-back-today');
    if (btn) {
        if (isToday(selectedDate)) {
            btn.classList.add('hidden');
        } else {
            btn.classList.remove('hidden');
        }
    }
}

window.backToToday = function() {
    selectedDate = new Date();
    currentPickerMonth = new Date();
    updateDateTime();
    updateBackToTodayButton();
    showToast('✅ 已返回今天', 'success');
}

// ==================== 打卡统计 ====================

function loadCheckInRecords() {
    const stored = localStorage.getItem('vibe-healing-checkins');
    if (stored) {
        checkInRecords = JSON.parse(stored);
    }
}

function saveCheckIn(dateStr) {
    checkInRecords[dateStr] = true;
    localStorage.setItem('vibe-healing-checkins', JSON.stringify(checkInRecords));
    updateCheckInDisplay();
}

function getCheckInDays() {
    return Object.keys(checkInRecords).length;
}

function hasCheckIn(dateStr) {
    return checkInRecords[dateStr] === true;
}

function updateCheckInDisplay() {
    const streakEl = document.getElementById('ai-streak');
    const days = getCheckInDays();
    if (streakEl) {
        streakEl.textContent = `已坚持记录 ${days}天`;
    }
}

function recordCheckIn() {
    const dateStr = formatDateSimple(today);
    if (!hasCheckIn(dateStr)) {
        saveCheckIn(dateStr);
        showToast('🎉 恭喜！完成今日健康打卡', 'success');
    }
}

// ==================== 健康指数 ====================

async function loadHealthIndex() {
    try {
        const res = await fetch(`${API_BASE}/health/index?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success && result.data) {
            updateHealthIndexDisplay(result.data);
        }
    } catch (error) {
        console.error('加载健康指数失败:', error);
    }
}

function updateHealthIndexDisplay(indexData) {
    // 更新首页健康指数显示
    const healthIndexEl = document.getElementById('stat-health-index');
    if (healthIndexEl && indexData.finalIndex > 0) {
        healthIndexEl.textContent = Math.round(indexData.finalIndex);
    }
    
    // 更新"我的"页面健康指数
    const profileHealthIndexEl = document.getElementById('profile-health-index');
    if (profileHealthIndexEl && indexData.finalIndex > 0) {
        profileHealthIndexEl.textContent = Math.round(indexData.finalIndex);
    }
}

function formatDateSimple(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// ==================== 用户相关 ====================

async function initUser() {
    try {
        const res = await fetch(`${API_BASE}/user/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wx_openid: 'demo_user_001',
                nickname: '小伙伴',
                gender: '女',
                height_cm: 168,
                weight_kg: 55,
                goal: '减脂'
            })
        });
        
        const result = await res.json();
        if (result.success) {
            currentUser = result.data;
            currentUserId = result.data.id;
            updateUserProfile();
            updateBasicStats();
        }
    } catch (error) {
        console.error('初始化用户失败:', error);
        currentUser = {
            id: 1,
            nickname: '小伙伴',
            gender: '女',
            height_cm: 168,
            weight_kg: 55,
            goal: '减脂'
        };
        updateUserProfile();
        updateBasicStats();
    }
}

function updateUserProfile() {
    if (!currentUser) return;
    
    document.getElementById('user-nickname').textContent = currentUser.nickname || '小伙伴';
    document.getElementById('user-id').textContent = currentUser.id;
    document.getElementById('profile-gender').textContent = currentUser.gender || '--';
    document.getElementById('profile-height').textContent = currentUser.height_cm ? `${currentUser.height_cm} cm` : '--';
    document.getElementById('profile-weight').textContent = currentUser.weight_kg ? `${currentUser.weight_kg} kg` : '--';
    // 健康指数由 loadHealthIndex() 从 API 获取后更新
}

function updateBasicStats() {
    if (!currentUser) return;
    
    document.getElementById('stat-gender').textContent = currentUser.gender || '--';
    document.getElementById('stat-height').textContent = currentUser.height_cm ? `${currentUser.height_cm}cm` : '--';
    document.getElementById('stat-weight').textContent = currentUser.weight_kg ? `${currentUser.weight_kg}kg` : '--';
    // 健康指数由 loadHealthIndex() 从 API 获取后更新
}

// ==================== 首页数据 ====================

async function loadHomeData() {
    try {
        const res = await fetch(`${API_BASE}/home?user_id=${currentUserId}`);
        const result = await res.json();
        if (result.success) renderAIInsight(result.data);
    } catch (error) {
        renderDefaultAIInsight();
    }
}

function renderAIInsight(data) {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('ai-greeting');
    const suggestionEl = document.getElementById('ai-suggestion');
    
    let greeting = '你好呀！';
    if (hour >= 5 && hour < 12) greeting = '早上好！';
    else if (hour >= 12 && hour < 18) greeting = '下午好！';
    else if (hour >= 18 && hour < 23) greeting = '晚上好！';
    else greeting = '夜深啦！';
    
    const suggestions = [
        '最近您有部分可支配时间，可以尝试利用一点固定时间做运动哦～喝水健康饮食的习惯也不要忘了哦！',
        '最近工作较忙，可以试试多喝一杯水，饭后多走两步路～',
        '最近状态不错哦！继续保持运动和健康饮食的好习惯～'
    ];
    
    if (greetingEl) greetingEl.textContent = greeting;
    if (suggestionEl) suggestionEl.textContent = suggestions[Math.floor(Math.random() * suggestions.length)];
}

function renderDefaultAIInsight() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('ai-greeting');
    const suggestionEl = document.getElementById('ai-suggestion');
    
    let greeting = '今天辛苦啦！';
    if (hour >= 5 && hour < 12) greeting = '早上好！';
    else if (hour >= 12 && hour < 18) greeting = '下午好！';
    else if (hour >= 18 && hour < 23) greeting = '晚上好！';
    
    if (greetingEl) greetingEl.textContent = greeting;
    if (suggestionEl) suggestionEl.textContent = '💬 点击查看今日健康小 tips';
}

// ==================== 日期选择器 ====================

window.openDateSelector = function() {
    const content = `
        <div class="date-picker-nav">
            <button onclick="changeMonth(-1)">‹</button>
            <span id="picker-month">${currentPickerMonth.getFullYear()}年 ${currentPickerMonth.getMonth() + 1}月</span>
            <button onclick="changeMonth(1)">›</button>
        </div>
        <div class="date-grid" id="date-grid"></div>
        <div class="date-picker-actions">
            <button class="btn btn-secondary" onclick="closeBottomSheet()">取消</button>
            <button class="btn btn-primary" onclick="confirmDateSelection()">确认选择</button>
        </div>
    `;
    
    openBottomSheet('选择日期补充记录', content);
    renderDateGrid();
}

window.changeMonth = function(delta) {
    currentPickerMonth.setMonth(currentPickerMonth.getMonth() + delta);
    renderDateGrid();
}

function renderDateGrid() {
    const grid = document.getElementById('date-grid');
    if (!grid) return;
    
    const year = currentPickerMonth.getFullYear();
    const month = currentPickerMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    
    document.getElementById('picker-month').textContent = `${year}年 ${month + 1}月`;
    
    let html = '';
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    // 星期标题
    weekDays.forEach(day => {
        html += `<div style="font-size: 11px; color: var(--text-secondary); text-align: center;">${day}</div>`;
    });
    
    // 空白填充
    for (let i = 0; i < startDay; i++) {
        html += '<div></div>';
    }
    
    // 日期
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${month + 1}-${day}`;
        const isTodayDate = date.toDateString() === today.toDateString();
        const hasRecord = hasCheckIn(dateStr);
        const isSelected = date.toDateString() === selectedDate.toDateString();
        
        let classes = 'date-cell';
        if (isTodayDate) classes += ' today';
        if (hasRecord) classes += ' has-record';
        if (isSelected) classes += ' selected';
        
        html += `
            <div class="${classes}" onclick="selectDate(${year}, ${month}, ${day})">
                <span class="day-num">${day}</span>
                <span class="day-week">${weekDays[date.getDay()]}</span>
            </div>
        `;
    }
    
    grid.innerHTML = html;
}

window.selectDate = function(year, month, day) {
    selectedDate = new Date(year, month, day);
    renderDateGrid();
}

window.confirmDateSelection = function() {
    updateDateTime();
    updateBackToTodayButton();
    closeBottomSheet();
    
    const dateStr = formatDate(selectedDate);
    if (isToday(selectedDate)) {
        showToast('✅ 已选择今天', 'success');
    } else {
        showToast(`📅 已选择 ${dateStr}，可为该日补充记录`, 'success');
    }
}

// ==================== 跳转聊天页 ====================

window.goToChatWithPlan = function() {
    switchTab('chat');
    setTimeout(() => addHealthPlanMessage(), 300);
}

function addHealthPlanMessage() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const existingPlan = container.querySelector('.health-plan');
    if (existingPlan) {
        container.scrollTop = container.scrollHeight;
        return;
    }
    
    const planHTML = `
        <h4>📋 您的个性化健康小计划</h4>
        <p><strong>⏰ 作息分析</strong></p>
        <p>根据您的作息：早上${userDemoProfile.wakeTime}起床，${userDemoProfile.workStart}到公司，晚上${userDemoProfile.offWork}下班</p>
        
        <p style="margin-top: 12px;"><strong>🏃 运动建议</strong></p>
        <p>• 午休时间：吃完饭可以去溜达 20-30 分钟，或去公司健身房锻炼</p>
        <p>• 晚间时间：如果不吃晚饭可以去健身房锻炼，吃晚饭就散步溜达</p>
        <p>• 下班后：有余力可以再去运动一小会，没有余力就回家休息～</p>
        
        <p style="margin-top: 12px;"><strong>🥗 饮食建议</strong></p>
        <p>• 减脂期推荐：早餐鸡蛋 + 牛奶 + 全麦面包，午餐选择清淡档口</p>
        <p>• 如果带饭：可以准备鸡胸肉/鱼肉 + 糙米饭 + 西兰花/时蔬</p>
        <p>• 多喝水！每天目标 8 杯以上～</p>
        
        <p class="plan-note">💡 小贴士：不用追求完美，偶尔吃多了也没关系～健康是长期的，不是短期的刻意哦！🦞</p>
    `;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message agent';
    messageEl.innerHTML = `<div class="message-content health-plan">${planHTML}</div>`;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// ==================== 统计页数据 ====================

async function loadStatsData() {
    try {
        const res = await fetch(`${API_BASE}/report/weekly?user_id=${currentUserId}`);
        const result = await res.json();
        if (result.success) renderStats(result.data.stats);
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

function renderStats(stats) {
    document.getElementById('avg-sleep').textContent = stats.avgSleep?.toFixed(1) || '--';
    document.getElementById('avg-water').textContent = stats.avgWater?.toFixed(0) || '--';
    document.getElementById('exercise-days').textContent = stats.exerciseDays || 0;
    document.getElementById('avg-mood').textContent = stats.avgMood?.toFixed(1) || '--';
}

// ==================== 编辑健康信息 ====================

window.editStat = function(statType) {
    const configs = {
        gender: {
            title: '编辑性别',
            content: `
                <div class="time-options">
                    <button class="time-btn" onclick="selectStatValue(this, '女')">女</button>
                    <button class="time-btn" onclick="selectStatValue(this, '男')">男</button>
                </div>
            `,
            onSave: (value) => {
                currentUser.gender = value;
                updateUserProfile();
                updateBasicStats();
                showToast(`✅ 性别已更新为 ${value}`, 'success');
            }
        },
        height: {
            title: '编辑身高',
            content: `
                <div class="form-group">
                    <label>身高 (cm)</label>
                    <input type="number" id="edit-height-input" value="${currentUser.height_cm || 168}" class="form-control">
                </div>
                <button class="btn btn-primary btn-block" onclick="saveStatValue('height', document.getElementById('edit-height-input').value)">保存</button>
            `
        },
        weight: {
            title: '编辑体重',
            content: `
                <div class="form-group">
                    <label>体重 (kg)</label>
                    <input type="number" id="edit-weight-input" value="${currentUser.weight_kg || 55}" step="0.1" class="form-control">
                </div>
                <button class="btn btn-primary btn-block" onclick="saveStatValue('weight', document.getElementById('edit-weight-input').value)">保存</button>
            `
        },
        health: {
            title: '健康指数说明',
            content: `
                <div style="padding: 16px 0; line-height: 1.8; font-size: 14px;">
                    <p style="margin-bottom: 12px;"><strong>📊 健康指数基于 4 项指标：</strong></p>
                    <p>💧 <strong>喝水 (25%)</strong> - 基于性别×体重建议量</p>
                    <p>🥗 <strong>饮食 (30%)</strong> - 健康减脂 90 分，常规 70 分</p>
                    <p>😴 <strong>睡眠 (25%)</strong> - 7-8 小时 85 分，8-10 小时 95 分</p>
                    <p>🏃 <strong>运动 (20%)</strong> - 1-2 小时 95 分，30-60 分钟 80 分</p>
                    <p style="margin-top: 16px; color: var(--primary-color);"><strong>📈 时间权重：</strong>1 天 40% + 3 天 30% + 7 天 20% + 30 天 10%</p>
                    <p style="margin-top: 12px;"><strong>80-100</strong> 健康范围 | <strong>60-79</strong> 需关注 | <strong>0-59</strong> 建议咨询</p>
                </div>
                <button class="btn btn-secondary btn-block" onclick="closeBottomSheet()">知道了</button>
            `
        }
    };
    
    const config = configs[statType];
    if (config) openBottomSheet(config.title, config.content, config.onSave);
}

window.selectStatValue = function(btn, value) {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    saveStatValue(null, value);
}

window.saveStatValue = function(type, value) {
    if (type === 'height') {
        currentUser.height_cm = parseFloat(value);
        updateBasicStats();
        updateUserProfile();
        showToast(`✅ 身高已更新为 ${value}cm`, 'success');
    } else if (type === 'weight') {
        currentUser.weight_kg = parseFloat(value);
        updateBasicStats();
        updateUserProfile();
        showToast(`✅ 体重已更新为 ${value}kg`, 'success');
    } else if (type === 'gender' || (type === null && value)) {
        // type === null 时来自 selectStatValue 的性别选择
        currentUser.gender = value;
        updateBasicStats();
        updateUserProfile();
        showToast(`✅ 性别已更新为 ${value}`, 'success');
    }
    closeBottomSheet();
}

// ==================== 快捷记录 ====================

window.quickRecord = function(type, value) {
    currentRecordType = type;
    currentRecordValue = value;
    
    const timeOptions = {
        water: ['早晨', '上午', '下午', '晚上'],
        food: ['早餐', '午餐', '晚餐', '加餐'],
        sleep: ['昨晚', '今晚'],
        exercise: ['早晨', '上午', '下午', '晚上']
    };
    
    const times = timeOptions[type] || ['默认'];
    
    const content = `
        <div class="form-group">
            <label>已选择：<strong>${getValueLabel(type, value)}</strong></label>
        </div>
        <div class="form-group">
            <label>请选择时间</label>
            <div class="time-options">
                ${times.map((t, i) => `
                    <button class="time-btn ${i === 0 ? 'selected' : ''}" onclick="selectTime(this, '${t}')">${t}</button>
                `).join('')}
            </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 16px;">
            <button class="btn btn-secondary" style="flex: 1;" onclick="closeBottomSheet()">取消</button>
            <button class="btn btn-primary" style="flex: 1;" onclick="confirmRecord()">确认记录</button>
        </div>
    `;
    
    openBottomSheet('记录健康努力', content);
}

function getValueLabel(type, value) {
    const labels = {
        water: `💧 ${value}`,
        food: `🥗 ${value}`,
        sleep: `🌙 ${value}`,
        exercise: `🏃 ${value}`
    };
    return labels[type] || value;
}

window.selectTime = function(btn, time) {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedTime = time;
}

window.confirmRecord = async function() {
    if (!selectedTime) selectedTime = '默认';
    
    // 调用后端 API 记录健康数据
    try {
        let endpoint = '';
        let data = { user_id: currentUserId };
        
        switch (currentRecordType) {
            case 'water':
                endpoint = '/health/water';
                // 根据选择的水量转换为 ml
                const waterMap = { '300ml': 300, '500ml': 500, '1L': 1000, '2L': 2000 };
                data.amount_ml = waterMap[currentRecordValue] || 300;
                data.time_period = selectedTime;
                break;
            case 'food':
                endpoint = '/health/food';
                data.food_type = currentRecordValue;
                data.meal_type = selectedTime;
                break;
            case 'sleep':
                endpoint = '/health/sleep';
                // 根据选择的睡眠时长转换为小时
                const sleepMap = { '<6h': 5, '6-7h': 6.5, '7-8h': 7.5, '>8h': 9 };
                data.sleep_hours = sleepMap[currentRecordValue] || 7;
                data.time_period = selectedTime;
                break;
            case 'exercise':
                endpoint = '/health/exercise';
                // 根据选择的运动时长转换为分钟
                const exerciseMap = { '<30min': 20, '30-60min': 45, '1-2h': 90, '>2h': 150 };
                data.duration_min = exerciseMap[currentRecordValue] || 30;
                data.time_period = selectedTime;
                break;
        }
        
        if (endpoint) {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            if (result.success) {
                showToast(`✅ 已记录：${getValueLabel(currentRecordType, currentRecordValue)} (${selectedTime})`, 'success');
                recordCheckIn();
                // 更新健康指数显示
                loadHealthIndex();
            } else {
                showToast('❌ 记录失败', 'error');
            }
        }
    } catch (error) {
        console.error('记录健康数据失败:', error);
        showToast(`✅ 已记录：${getValueLabel(currentRecordType, currentRecordValue)} (${selectedTime})`, 'success');
        recordCheckIn();
    }
    
    closeBottomSheet();
}

// ==================== 底部弹窗 ====================

let sheetCallback = null;

function openBottomSheet(title, content, callback) {
    document.getElementById('sheet-title').textContent = title;
    document.getElementById('sheet-body').innerHTML = content;
    document.getElementById('bottom-sheet').classList.add('show');
    selectedTime = null;
    sheetCallback = callback;
}

window.closeBottomSheet = function() {
    document.getElementById('bottom-sheet').classList.remove('show');
    sheetCallback = null;
}

// ==================== 聊天功能 ====================

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    addChatMessage(message, 'user');
    input.value = '';
    
    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUserId, message })
        });
        
        const result = await res.json();
        if (result.success) addChatMessage(result.data.reply, 'agent');
    } catch (error) {
        addChatMessage('抱歉，我现在有点累，稍后再聊～', 'agent');
    }
}

function addChatMessage(text, type) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// ==================== 页面切换 ====================

window.switchTab = function(tabName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    const targetPage = document.getElementById(`page-${tabName}`);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
    
    if (tabName === 'home') { loadHomeData(); updateCheckInDisplay(); loadHealthIndex(); }
    else if (tabName === 'stats') { 
        // 初始化时间按钮状态
        document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('stats-btn-7').classList.add('active');
        loadStatsData(); 
    }
    else if (tabName === 'profile') { updateUserProfile(); updateBasicStats(); loadHealthIndex(); }
}

// ==================== 工具函数 ====================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 统计图表功能 ====================

let statsChart = null;
let currentStatsDays = 7;
let currentChartType = 'index';

// 设置统计时间范围
window.setStatsRange = function(days) {
    currentStatsDays = days;
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`stats-btn-${days}`).classList.add('active');
    loadStatsData();
};

// 切换图表类型
window.switchStatsChart = function(type) {
    currentChartType = type;
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`chart-tab-${type}`).classList.add('active');
    if (statsChart) renderStatsChart(statsChart.data.labels, window.statsTrendData);
};

// 加载统计数据
async function loadStatsData() {
    try {
        const res = await fetch(`${API_BASE}/stats?user_id=${currentUserId}&days=${currentStatsDays}`);
        const result = await res.json();
        
        if (result.success && result.data) {
            window.statsTrendData = result.data.trend;
            renderStatsOverview(result.data);
            renderStatsChart(result.data.trend);
            renderStatsDetail(result.data);
        }
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 渲染统计概览
function renderStatsOverview(data) {
    document.getElementById('stats-health-index').textContent = data.avgHealthIndex?.toFixed(1) || '--';
    document.getElementById('stats-avg-sleep').textContent = data.avgSleep?.toFixed(1) || '--';
    document.getElementById('stats-avg-water').textContent = data.avgWater?.toFixed(0) || '--';
    document.getElementById('stats-exercise-days').textContent = data.exerciseDays || '--';
}

// 渲染统计图表
function renderStatsChart(trendData) {
    const ctx = document.getElementById('stats-chart').getContext('2d');
    
    if (statsChart) {
        statsChart.destroy();
    }
    
    const labels = trendData.map(d => {
        const date = new Date(d.record_date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }).reverse();
    
    let chartData = [];
    let label = '';
    let color = '';
    
    if (currentChartType === 'index') {
        label = '健康指数';
        color = '#87B095';
        chartData = trendData.map(d => calculateIndexFromDaily(d)).reverse();
    } else if (currentChartType === 'water') {
        label = '喝水 (ml)';
        color = '#3b82f6';
        chartData = trendData.map(d => d.water_total_ml || 0).reverse();
    } else if (currentChartType === 'sleep') {
        label = '睡眠 (小时)';
        color = '#8b5cf6';
        chartData = trendData.map(d => d.sleep_total_hours || 0).reverse();
    } else if (currentChartType === 'exercise') {
        label = '运动 (分钟)';
        color = '#f59e0b';
        chartData = trendData.map(d => d.exercise_total_min || 0).reverse();
    }
    
    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data: chartData,
                borderColor: color,
                backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba').replace('#', ''),
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// 从每日数据计算指数（简化版）
function calculateIndexFromDaily(daily) {
    let score = 0;
    let count = 0;
    
    if (daily.water_total_ml > 0) {
        score += Math.min(100, (daily.water_total_ml / 1500) * 100) * 0.25;
        count++;
    }
    if (daily.sleep_total_hours > 0) {
        const sleepScore = daily.sleep_total_hours >= 7 && daily.sleep_total_hours <= 8 ? 95 : 
                           daily.sleep_total_hours >= 6 ? 70 : 50;
        score += sleepScore * 0.25;
        count++;
    }
    if (daily.exercise_total_min > 0) {
        const exerciseScore = daily.exercise_total_min >= 60 ? 95 : 
                              daily.exercise_total_min >= 30 ? 80 : 60;
        score += exerciseScore * 0.20;
        count++;
    }
    
    return count > 0 ? Math.round(score / (0.25 * count + 0.20)) : 0;
}

// 渲染详细数据
function renderStatsDetail(data) {
    const list = document.getElementById('stats-detail-list');
    
    list.innerHTML = `
        <div class="stats-detail-item">
            <span class="stats-detail-label">📅 记录天数</span>
            <span class="stats-detail-value">${data.totalDays || '--'} 天</span>
        </div>
        <div class="stats-detail-item">
            <span class="stats-detail-label">😊 平均心情</span>
            <span class="stats-detail-value">${data.avgMood?.toFixed(1) || '--'}/10</span>
        </div>
        <div class="stats-detail-item">
            <span class="stats-detail-label">⚡ 平均精力</span>
            <span class="stats-detail-value">${data.avgEnergy?.toFixed(1) || '--'}/10</span>
        </div>
    `;
}

// ==================== 导出 ====================

window.quickRecord = quickRecord;
window.sendMessage = sendMessage;
window.switchTab = switchTab;
window.closeBottomSheet = closeBottomSheet;
window.editStat = editStat;
window.goToChatWithPlan = goToChatWithPlan;
window.selectStatValue = selectStatValue;
window.saveStatValue = saveStatValue;
window.openDateSelector = openDateSelector;
window.changeMonth = changeMonth;
window.selectDate = selectDate;
window.confirmDateSelection = confirmDateSelection;
window.backToToday = backToToday;
window.setStatsRange = setStatsRange;
window.switchStatsChart = switchStatsChart;
