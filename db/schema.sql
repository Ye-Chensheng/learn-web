-- ============================================================
-- vibe-healing 数据库架构 v2.0
-- SQLite 版本 - 支持多用户和可扩展健康动作
-- ============================================================

-- 用户基础信息表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wx_openid VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(50) DEFAULT '小伙伴',
    avatar_url VARCHAR(255),
    gender VARCHAR(10),
    age INTEGER,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    occupation VARCHAR(50),
    work_type VARCHAR(30),
    wake_time TIME,
    work_start TIME,
    work_end TIME,
    health_goal VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 每日健康总览表
CREATE TABLE IF NOT EXISTS daily_health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    weight_kg DECIMAL(5,2),
    mood_level INTEGER CHECK(mood_level BETWEEN 1 AND 10),
    energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
    work_load VARCHAR(20),
    mode_type VARCHAR(20) DEFAULT 'stable',
    water_total_ml INTEGER DEFAULT 0,
    food_count INTEGER DEFAULT 0,
    sleep_total_hours DECIMAL(4,2),
    exercise_total_min INTEGER DEFAULT 0,
    ai_summary TEXT,
    special_note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_user_date ON daily_health_records(user_id, record_date);

-- 喝水记录表
CREATE TABLE IF NOT EXISTS water_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    amount_ml INTEGER NOT NULL,
    time_period VARCHAR(20),
    note TEXT,
    is_auto_recorded BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_water_user_date ON water_records(user_id, record_date);

-- 饮食记录表
CREATE TABLE IF NOT EXISTS food_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    meal_type VARCHAR(20),
    food_type VARCHAR(50),
    food_name TEXT,
    food_desc TEXT,
    calories INTEGER,
    protein_g DECIMAL(5,2),
    carbs_g DECIMAL(5,2),
    fat_g DECIMAL(5,2),
    is_healthy BOOLEAN DEFAULT TRUE,
    is_auto_recorded BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_records(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_food_meal_type ON food_records(user_id, meal_type);

-- 睡眠记录表
CREATE TABLE IF NOT EXISTS sleep_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    sleep_date DATE NOT NULL,
    bedtime TIME,
    wake_time TIME,
    sleep_hours DECIMAL(4,2) NOT NULL,
    sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 10),
    deep_sleep_hours DECIMAL(4,2),
    time_period VARCHAR(20),
    note TEXT,
    is_auto_recorded BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON sleep_records(user_id, record_date);

-- 运动记录表
CREATE TABLE IF NOT EXISTS exercise_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    exercise_type VARCHAR(50),
    duration_min INTEGER NOT NULL,
    intensity VARCHAR(20),
    calories_burned INTEGER,
    time_period VARCHAR(20),
    note TEXT,
    is_auto_recorded BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON exercise_records(user_id, record_date);

-- 健康指数历史表
CREATE TABLE IF NOT EXISTS health_index_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    calc_date DATE NOT NULL,
    water_score DECIMAL(5,2),
    food_score DECIMAL(5,2),
    sleep_score DECIMAL(5,2),
    exercise_score DECIMAL(5,2),
    index_1d DECIMAL(5,2),
    index_3d DECIMAL(5,2),
    index_7d DECIMAL(5,2),
    index_30d DECIMAL(5,2),
    final_index DECIMAL(5,2),
    water_total_ml INTEGER,
    food_count INTEGER,
    sleep_total_hours DECIMAL(4,2),
    exercise_total_min INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, calc_date)
);

CREATE INDEX IF NOT EXISTS idx_health_index_user_date ON health_index_history(user_id, calc_date);

-- 聊天记录表
CREATE TABLE IF NOT EXISTS chat_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(50),
    user_message TEXT NOT NULL,
    agent_reply TEXT NOT NULL,
    extracted_data JSON,
    sentiment VARCHAR(20),
    user_mood INTEGER,
    related_record_id INTEGER,
    related_record_type VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_summaries(session_id);

-- 用户画像标签表
CREATE TABLE IF NOT EXISTS user_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    tag_value VARCHAR(100),
    confidence DECIMAL(3,2),
    source VARCHAR(30),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, tag_name)
);

-- AI 建议历史表
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    suggestion_date DATE NOT NULL,
    suggestion_type VARCHAR(30),
    suggestion_text TEXT NOT NULL,
    priority VARCHAR(20),
    is_accepted BOOLEAN,
    accepted_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user_date ON ai_suggestions(user_id, suggestion_date);

-- ============================================================
-- 视图：用户健康统计概览
-- ============================================================

CREATE VIEW IF NOT EXISTS user_health_summary AS
SELECT 
    u.id as user_id,
    u.nickname,
    COUNT(DISTINCT d.record_date) as total_record_days,
    AVG(d.water_total_ml) as avg_daily_water,
    AVG(d.sleep_total_hours) as avg_sleep_hours,
    AVG(d.exercise_total_min) as avg_exercise_min,
    AVG(h.final_index) as avg_health_index,
    MAX(h.calc_date) as last_calc_date
FROM users u
LEFT JOIN daily_health_records d ON u.id = d.user_id
LEFT JOIN health_index_history h ON u.id = h.user_id
GROUP BY u.id, u.nickname;

-- ============================================================
-- 初始数据
-- ============================================================

-- 插入默认测试用户（如果不存在）
INSERT OR IGNORE INTO users (id, wx_openid, nickname, gender, height_cm, weight_kg, health_goal)
VALUES (1, 'demo_user_001', '小伙伴', '女', 168, 55, '减脂');

-- 插入示例用户标签
INSERT OR IGNORE INTO user_tags (user_id, tag_name, tag_value, confidence, source)
VALUES 
    (1, '高压加班型', 'true', 0.85, 'ai_inferred'),
    (1, '适合鼓励式沟通', 'true', 0.90, 'ai_inferred'),
    (1, '晚睡型', 'true', 0.75, 'ai_inferred');
