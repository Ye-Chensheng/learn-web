/**
 * vibe-healing 前端应用
 * 健康陪伴系统 H5 客户端
 */

// API 基础 URL
const API_BASE = window.location.origin + '/api';

// 当前用户 ID（MVP 使用固定 ID）
let currentUserId = 1;
let currentUser = null;

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

async function initApp() {
    console.log('🦞 vibe-healing 启动中...');
    
    // 初始化用户
    await initUser();
    
    // 加载首页数据
    await loadHomeData();
    
    // 加载今日日志
    await loadTodayLog();
    
    console.log('✅ 应用初始化完成');
}

function setupEventListeners() {
    // 范围输入显示值
    const energySlider = document.getElementById('energy-level');
    const moodSlider = document.getElementById('mood-level');
    
    if (energySlider) {
        energySlider.addEventListener('input', (e) => {
            document.getElementById('energy-value').textContent = e.target.value;
        });
    }
    
    if (moodSlider) {
        moodSlider.addEventListener('input', (e) => {
            document.getElementById('mood-value').textContent = e.target.value;
        });
    }
    
    // 表单提交
    const logForm = document.getElementById('log-form');
    if (logForm) {
        logForm.addEventListener('submit', handleLogSubmit);
    }
    
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

// ==================== 首页数据 ====================

async function loadHomeData() {
    try {
        const res = await fetch(`${API_BASE}/home?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success) {
            renderHomeData(result.data);
        }
    } catch (error) {
        console.error('加载首页数据失败:', error);
    }
}

function renderHomeData(data) {
    // 日期
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
        const today = new Date();
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        dateEl.textContent = `${today.getMonth() + 1}月${today.getDate()}日 ${weekDays[today.getDay()]}`;
    }
    
    // 模式
    const modeEl = document.getElementById('today-mode');
    if (modeEl) {
        const modeMap = {
            'light': { text: '保底模式', class: 'mode-light' },
            'stable': { text: '稳态模式', class: 'mode-stable' },
            'heavy': { text: '进阶模式', class: 'mode-heavy' }
        };
        const mode = modeMap[data.mode] || modeMap['stable'];
        modeEl.textContent = mode.text;
        modeEl.className = `mode-badge ${mode.class}`;
    }
    
    // 连续天数
    const daysEl = document.getElementById('continuous-days');
    if (daysEl) {
        daysEl.textContent = data.continuousDays || 0;
    }
    
    // 状态文本
    const statusEl = document.getElementById('status-text');
    if (statusEl) {
        const hour = new Date().getHours();
        if (hour < 12) {
            statusEl.textContent = '早上好！今天有什么健康小目标吗？';
        } else if (hour < 18) {
            statusEl.textContent = '下午好！记得起来活动活动～';
        } else {
            statusEl.textContent = '晚上好！今天过得怎么样？';
        }
    }
    
    // 建议列表
    renderSuggestions(data.suggestions || []);
}

function renderSuggestions(suggestions) {
    const container = document.getElementById('suggestions-list');
    if (!container) return;
    
    if (suggestions.length === 0) {
        container.innerHTML = '<div class="empty-state">暂无建议</div>';
        return;
    }
    
    const iconMap = {
        'water': '💧',
        'food': '🍽️',
        'move': '🚶',
        'sleep': '😴',
        'exercise': '🏃'
    };
    
    container.innerHTML = suggestions.map(s => `
        <div class="suggestion-item">
            <span class="suggestion-icon">${iconMap[s.type] || '💡'}</span>
            <div class="suggestion-content">
                <div class="suggestion-text">${s.text}</div>
                <span class="suggestion-priority ${s.priority}">${s.priority === 'high' ? '重要' : '建议'}</span>
            </div>
        </div>
    `).join('');
}

async function loadTodayLog() {
    try {
        const res = await fetch(`${API_BASE}/logs/today?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success && result.data) {
            fillLogForm(result.data);
        }
    } catch (error) {
        console.error('加载今日日志失败:', error);
    }
}

function fillLogForm(log) {
    if (!log) return;
    
    const fields = {
        'work-load': log.work_load,
        'energy-level': log.energy_level,
        'mood-level': log.mood_level,
        'sleep-hours': log.sleep_hours,
        'water-cups': log.water_cups,
        'steps': log.steps,
        'special-note': log.special_note
    };
    
    for (const [id, value] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el && value !== null && value !== undefined) {
            el.value = value;
            // 更新范围值显示
            if (id === 'energy-level' || id === 'mood-level') {
                const displayEl = document.getElementById(id.replace('-level', '-value'));
                if (displayEl) displayEl.textContent = value;
            }
        }
    }
}

// ==================== 记录功能 ====================

async function handleLogSubmit(e) {
    e.preventDefault();
    
    const logData = {
        work_load: document.getElementById('work-load').value,
        energy_level: parseInt(document.getElementById('energy-level').value),
        mood_level: parseInt(document.getElementById('mood-level').value),
        sleep_hours: parseFloat(document.getElementById('sleep-hours').value) || null,
        water_cups: parseInt(document.getElementById('water-cups').value) || 0,
        steps: parseInt(document.getElementById('steps').value) || 0,
        special_note: document.getElementById('special-note').value
    };
    
    try {
        // 先获取今日日志 ID
        const res = await fetch(`${API_BASE}/logs/today?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success && result.data) {
            const updateRes = await fetch(`${API_BASE}/logs/${result.data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData)
            });
            
            const updateResult = await updateRes.json();
            if (updateResult.success) {
                showToast('✅ 记录已保存');
                loadHomeData(); // 刷新首页
            } else {
                showToast('❌ 保存失败');
            }
        }
    } catch (error) {
        console.error('保存日志失败:', error);
        showToast('❌ 保存失败');
    }
}

// ==================== 快捷记录 ====================

function quickRecord(type) {
    const modals = {
        water: {
            title: '💧 记录喝水',
            content: `
                <div class="form-group">
                    <label>喝了几杯？</label>
                    <input type="number" id="quick-water-cups" value="1" min="1" class="form-control">
                </div>
            `,
            action: async () => {
                const cups = parseInt(document.getElementById('quick-water-cups').value) || 1;
                await updateLog({ water_cups: cups });
            }
        },
        food: {
            title: '🍽️ 记录饮食',
            content: `
                <div class="form-group">
                    <label>餐次</label>
                    <select id="quick-meal-type" class="form-control">
                        <option value="breakfast">早餐</option>
                        <option value="lunch">午餐</option>
                        <option value="dinner">晚餐</option>
                        <option value="snack">加餐</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>吃了什么</label>
                    <input type="text" id="quick-food-name" placeholder="例如：沙拉 + 鸡胸肉" class="form-control">
                </div>
            `,
            action: async () => {
                const mealType = document.getElementById('quick-meal-type').value;
                const foodName = document.getElementById('quick-food-name').value;
                if (foodName) {
                    await addFoodRecord({ meal_type: mealType, food_name: foodName });
                }
            }
        },
        exercise: {
            title: '🏃 记录运动',
            content: `
                <div class="form-group">
                    <label>运动类型</label>
                    <select id="quick-exercise-type" class="form-control">
                        <option value="walking">散步</option>
                        <option value="running">跑步</option>
                        <option value="home">居家训练</option>
                        <option value="gym">健身房</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>时长 (分钟)</label>
                    <input type="number" id="quick-exercise-duration" value="20" min="1" class="form-control">
                </div>
            `,
            action: async () => {
                const type = document.getElementById('quick-exercise-type').value;
                const duration = parseInt(document.getElementById('quick-exercise-duration').value) || 0;
                await updateLog({ exercise_type: type, exercise_duration: duration });
            }
        },
        sleep: {
            title: '😴 记录睡眠',
            content: `
                <div class="form-group">
                    <label>昨晚睡了多久 (小时)</label>
                    <input type="number" id="quick-sleep-hours" step="0.5" placeholder="例如：7.5" class="form-control">
                </div>
                <div class="form-group">
                    <label>睡眠质量 (1-10)</label>
                    <input type="range" id="quick-sleep-quality" min="1" max="10" value="7" class="form-control">
                    <div style="text-align: center; margin-top: 8px;" id="quick-sleep-quality-value">7</div>
                </div>
            `,
            action: async () => {
                const hours = parseFloat(document.getElementById('quick-sleep-hours').value) || 0;
                const quality = parseInt(document.getElementById('quick-sleep-quality').value) || 5;
                await updateLog({ sleep_hours: hours, sleep_quality: quality });
            }
        },
        weight: {
            title: '⚖️ 记录体重',
            content: `
                <div class="form-group">
                    <label>体重 (kg)</label>
                    <input type="number" id="quick-weight" step="0.1" placeholder="例如：65.5" class="form-control">
                </div>
            `,
            action: async () => {
                const weight = parseFloat(document.getElementById('quick-weight').value) || 0;
                if (weight > 0) {
                    await updateUser({ weight_kg: weight });
                }
            }
        },
        mood: {
            title: '😊 记录心情',
            content: `
                <div class="form-group">
                    <label>今天心情如何 (1-10)</label>
                    <input type="range" id="quick-mood-level" min="1" max="10" value="7" class="form-control">
                    <div style="text-align: center; margin-top: 8px; font-size: 24px;" id="quick-mood-value">7</div>
                </div>
                <div class="form-group">
                    <label>精力水平 (1-10)</label>
                    <input type="range" id="quick-energy-level" min="1" max="10" value="7" class="form-control">
                    <div style="text-align: center; margin-top: 8px; font-size: 24px;" id="quick-energy-value">7</div>
                </div>
            `,
            action: async () => {
                const mood = parseInt(document.getElementById('quick-mood-level').value) || 5;
                const energy = parseInt(document.getElementById('quick-energy-level').value) || 5;
                await updateLog({ mood_level: mood, energy_level: energy });
            }
        }
    };
    
    const modal = modals[type];
    if (modal) {
        showModal(modal.title, modal.content, modal.action);
    }
    
    // 为范围输入添加事件监听
    setTimeout(() => {
        const sleepQuality = document.getElementById('quick-sleep-quality');
        if (sleepQuality) {
            sleepQuality.addEventListener('input', (e) => {
                document.getElementById('quick-sleep-quality-value').textContent = e.target.value;
            });
        }
        
        const moodLevel = document.getElementById('quick-mood-level');
        if (moodLevel) {
            moodLevel.addEventListener('input', (e) => {
                document.getElementById('quick-mood-value').textContent = e.target.value;
            });
        }
        
        const energyLevel = document.getElementById('quick-energy-level');
        if (energyLevel) {
            energyLevel.addEventListener('input', (e) => {
                document.getElementById('quick-energy-value').textContent = e.target.value;
            });
        }
    }, 100);
}

async function updateLog(data) {
    try {
        const res = await fetch(`${API_BASE}/logs/today?user_id=${currentUserId}`);
        const result = await res.json();
        
        if (result.success && result.data) {
            const updateRes = await fetch(`${API_BASE}/logs/${result.data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const updateResult = await updateRes.json();
            if (updateResult.success) {
                showToast('✅ 已记录');
                closeModal();
                loadHomeData();
            }
        }
    } catch (error) {
        console.error('更新日志失败:', error);
        showToast('❌ 记录失败');
    }
}

async function addFoodRecord(data) {
    try {
        const res = await fetch(`${API_BASE}/food`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, user_id: currentUserId })
        });
        
        const result = await res.json();
        if (result.success) {
            showToast('✅ 饮食已记录');
            closeModal();
        }
    } catch (error) {
        console.error('添加饮食记录失败:', error);
        showToast('❌ 记录失败');
    }
}

async function updateUser(data) {
    // MVP 简化版本，实际应该调用用户更新 API
    showToast('✅ 已更新');
    closeModal();
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

function switchTab(tabName) {
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
    } else if (tabName === 'logs') {
        loadTodayLog();
    } else if (tabName === 'profile') {
        updateUserProfile();
    }
}

// ==================== 弹窗 ====================

let modalCallback = null;

function showModal(title, content, callback) {
    const modal = document.getElementById('modal');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = content;
    
    modalCallback = callback;
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    modalCallback = null;
}

// 处理弹窗确认
document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// 弹窗确认按钮
document.querySelector('#modal .btn')?.addEventListener('click', () => {
    if (modalCallback) {
        modalCallback();
    }
    closeModal();
});

// ==================== 工具函数 ====================

function showToast(message) {
    // 简单实现：用 alert 替代
    // 实际项目中应该用更好的 toast 组件
    console.log('Toast:', message);
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
window.closeModal = closeModal;
