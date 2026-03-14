-- vibe-healing 数据库架构
-- 健康陪伴系统核心数据表

-- 用户基础信息表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wx_openid VARCHAR(100) UNIQUE,
    nickname VARCHAR(50),
    avatar_url VARCHAR(255),
    gender INTEGER DEFAULT 0,
    age INTEGER,
    height_cm INTEGER,
    weight_kg DECIMAL(5,2),
    occupation VARCHAR(50),
    work_type VARCHAR(30),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户健康目标表
CREATE TABLE IF NOT EXISTS user_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    goal_type VARCHAR(30),
    goal_value VARCHAR(100),
    target_weight DECIMAL(5,2),
    target_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 每日健康日志表
CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    log_date DATE,
    weight_kg DECIMAL(5,2),
    sleep_hours DECIMAL(4,2),
    sleep_quality INTEGER,
    water_cups INTEGER DEFAULT 0,
    steps INTEGER DEFAULT 0,
    exercise_type VARCHAR(50),
    exercise_duration INTEGER,
    mood_level INTEGER,
    energy_level INTEGER,
    work_load VARCHAR(20),
    special_note TEXT,
    mode_type VARCHAR(20) DEFAULT 'stable',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, log_date)
);

-- 饮食记录表
CREATE TABLE IF NOT EXISTS food_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    log_date DATE,
    meal_type VARCHAR(20),
    food_name TEXT,
    food_desc TEXT,
    calories INTEGER,
    is_healthy BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 聊天摘要表
CREATE TABLE IF NOT EXISTS chat_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id VARCHAR(50),
    user_message TEXT,
    agent_reply TEXT,
    extracted_data JSON,
    sentiment VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 用户画像标签表
CREATE TABLE IF NOT EXISTS user_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    tag_name VARCHAR(50),
    tag_value VARCHAR(100),
    confidence DECIMAL(3,2),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, tag_name)
);

-- 周计划表
CREATE TABLE IF NOT EXISTS weekly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    week_start DATE,
    week_end DATE,
    plan_type VARCHAR(20),
    goals JSON,
    completed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI 建议历史表
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    suggestion_type VARCHAR(30),
    suggestion_text TEXT,
    is_accepted BOOLEAN,
    accepted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_food_user_date ON food_records(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON user_tags(user_id);
