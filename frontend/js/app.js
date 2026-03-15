/**
 * vibe-healing 前端应用 - v2.7 全新设计
 * 健康陪伴系统 H5 客户端
 */

// API 基础 URL
const API_BASE = window.location.origin + '/api';

// 当前用户 ID（MVP 使用固定 ID）
let currentUserId = 1;
let currentUser = null;

// 临时存储
let currentRecordType = null;
let currentRecordValue = null;

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    console.log('🦞 vibe-healing v2.7 启动中...');
    
    // 初始化用户
    await initUser();
    
    // 加载首页数据
    await loadHomeData();
    
    console.log('✅ 应用初始化完成');
}

function setupEventListeners() {
    // 聊天输入回车发送
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
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
    }
}

function updateUserProfile() {
    if (!currentUser) return;
    
    document.getElementById('user-nickname').textContent = currentUser.nickname || '小伙伴';
    document.getElementById('user-id').textContent = currentUser.id;
    document.getElementById('user-height').textContent = currentUser.height_cm ? `${currentUser.height_cm} cm` : '--';
    document.getElementById('user-weight').textContent = currentUser.weight_kg ? `${currentUser.weight_kg} kg` : '--';
}

function updateBasicStats() {
    if (!currentUser) return;
    
    // 性别
    document.getElementById('stat-gender').textContent = currentUser.gender || '--';
    
    // 身高
    document.getElementById('stat-height').textContent = currentUser.height_cm ? `${currentUser.height_cm}cm` : '--';
    
    // 体重
    document.getElementById('stat-weight').textContent = currentUser.weight_kg ? `${currentUser.weight_kg}kg` : '--';
    
    // 健康指数 (简化计算)
    const bmi = currentUser.height_cm && currentUser.weight_kg 
        ? (currentUser.weight_kg / ((currentUser.height_cm / 100) ** 2)).toFixed(1)
        : '--';
    document.getElementById('stat-health-index').textContent = bmi !== '--' ? `BMI ${bmi}` : '--';
}

// ==================== 首页数据 ====================

async function loadHomeData() {
    try {
        const res = await fetch(`${API_BASE}/home?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success) {
            renderAIInsight(result.data);
        }
    } catch (error) {
        console.error('加载首页数据失败:', error);
        // 显示默认问候
        renderDefaultAIInsight();
    }
}

function renderAIInsight(data) {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('ai-greeting');
    const suggestionEl = document.getElementById('ai-suggestion');
    
    // 根据时间段设置问候
    let greeting = '你好呀！';
    if (hour >= 5 && hour < 12) {
        greeting = '早上好！';
    } else if (hour >= 12 && hour < 18) {
        greeting = '下午好！';
    } else if (hour >= 18 && hour < 23) {
        greeting = '晚上好！';
    } else {
        greeting = '夜深啦！';
    }
    
    // 基于用户状态的建议（MVP 简化版）
    const suggestions = [
        '最近您的工作/学习/事情较忙，可支配时间少，可以试试多喝一杯水，饭后多走两步路，少吃一口晚餐，从良好健康小习惯做起。',
        '最近您有部分可支配时间，可以尝试利用一点固定时间做运动哦～喝水健康饮食的习惯也不要忘了哦！',
        '最近您晚上有空余的时间，可以尝试夜跑，或家附近的健身房/公园多锻炼一下哦！'
    ];
    
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    
    if (greetingEl) greetingEl.textContent = greeting;
    if (suggestionEl) suggestionEl.textContent = randomSuggestion;
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
    if (suggestionEl) suggestionEl.textContent = '记录您的健康点滴，让 AI 助手更懂你～';
}

// ==================== 统计页数据 ====================

async function loadStatsData() {
    try {
        const res = await fetch(`${API_BASE}/report/weekly?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success) {
            renderStats(result.data.stats);
        }
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

// ==================== 快捷记录 ====================

function quickRecord(type, value) {
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
            <label>已选择：${getValueLabel(type, value)}</label>
        </div>
        <div class="form-group">
            <label>请选择时间</label>
            <div class="time-options">
                ${times.map((t, i) => `
                    <button class="time-btn ${i === 0 ? 'selected' : ''}" onclick="selectTime(this, '${t}')">${t}</button>
                `).join('')}
            </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="confirmRecord()">确认记录</button>
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

let selectedTime = null;

window.selectTime = function(btn, time) {
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedTime = time;
}

window.confirmRecord = async function() {
    if (!selectedTime) {
        selectedTime = '默认';
    }
    
    showToast(`✅ 已记录：${getValueLabel(currentRecordType, currentRecordValue)} (${selectedTime})`, 'success');
    closeBottomSheet();
    
    // 这里可以调用 API 保存数据
    // await saveRecord(currentRecordType, currentRecordValue, selectedTime);
}

// ==================== 底部弹窗 ====================

function openBottomSheet(title, content) {
    document.getElementById('sheet-title').textContent = title;
    document.getElementById('sheet-body').innerHTML = content;
    document.getElementById('bottom-sheet').classList.add('show');
    selectedTime = null;
}

window.closeBottomSheet = function() {
    document.getElementById('bottom-sheet').classList.remove('show');
}

// ==================== 聊天功能 ====================

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // 添加用户消息
    addChatMessage(message, 'user');
    input.value = '';
    
    // 发送 API 请求
    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUserId,
                message: message
            })
        });
        
        const result = await res.json();
        if (result.success) {
            addChatMessage(result.data.reply, 'agent');
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        addChatMessage('抱歉，我现在有点累，稍后再聊～', 'agent');
    }
}

function addChatMessage(text, type) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = `
        <div class="message-content">${escapeHtml(text)}</div>
    `;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// ==================== 页面切换 ====================

window.switchTab = function(tabName) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 显示目标页面
    const targetPage = document.getElementById(`page-${tabName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 加载对应页面数据
    if (tabName === 'home') {
        loadHomeData();
    } else if (tabName === 'stats') {
        loadStatsData();
    } else if (tabName === 'profile') {
        updateUserProfile();
        updateBasicStats();
    }
}

// ==================== 工具函数 ====================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // 3 秒后移除
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

// ==================== 导出给外部调用 ====================

window.quickRecord = quickRecord;
window.sendMessage = sendMessage;
window.switchTab = switchTab;
window.closeBottomSheet = closeBottomSheet;
