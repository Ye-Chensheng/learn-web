# 🗄️ vibe-healing 数据库设计方案

## 设计原则

1. **多用户支持** - 每个数据表都有 `user_id` 关联
2. **可扩展性** - 健康动作（喝水/饮食/睡眠/运动）设计为可添加新类型
3. **时间序列优化** - 按日期索引，支持高效查询历史趋势
4. **数据可修改** - 所有记录支持更新和软删除
5. **AI 友好** - 聊天记录与健康数据关联，支持自动提取和反向查询

---

## 核心数据表设计

### 1. users - 用户基础信息表

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wx_openid VARCHAR(100) UNIQUE NOT NULL,
    nickname VARCHAR(50) DEFAULT '小伙伴',
    avatar_url VARCHAR(255),
    gender VARCHAR(10),  -- '男' | '女'
    age INTEGER,
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    occupation VARCHAR(50),
    work_type VARCHAR(30),  -- '久坐型' | '高压加班型' | '户外型'
    wake_time TIME,         -- 起床时间
    work_start TIME,        -- 上班时间
    work_end TIME,          -- 下班时间
    health_goal VARCHAR(50), -- '减脂' | '增肌' | '维持' | '改善睡眠'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. daily_health_records - 每日健康总览表

```sql
CREATE TABLE daily_health_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    
    -- 基础指标
    weight_kg DECIMAL(5,2),
    mood_level INTEGER CHECK(mood_level BETWEEN 1 AND 10),
    energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
    
    -- 工作负荷（影响 AI 建议）
    work_load VARCHAR(20),  -- 'light' | 'normal' | 'heavy'
    mode_type VARCHAR(20) DEFAULT 'stable',  -- 'light' | 'stable' | 'heavy'
    
    -- 汇总数据（冗余存储，便于快速查询）
    water_total_ml INTEGER DEFAULT 0,
    food_count INTEGER DEFAULT 0,
    sleep_total_hours DECIMAL(4,2),
    exercise_total_min INTEGER DEFAULT 0,
    
    -- AI 生成的每日总结
    ai_summary TEXT,
    special_note TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, record_date)
);

CREATE INDEX idx_daily_user_date ON daily_health_records(user_id, record_date);
```

### 3. water_records - 喝水记录表

```sql
CREATE TABLE water_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    amount_ml INTEGER NOT NULL,
    time_period VARCHAR(20),  -- '早晨' | '上午' | '下午' | '晚上'
    note TEXT,
    is_auto_recorded BOOLEAN DEFAULT FALSE,  -- 是否 AI 自动记录
    source VARCHAR(30),  -- 'manual' | 'chat_extract' | 'device_sync'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_water_user_date ON water_records(user_id, record_date);
```

### 4. food_records - 饮食记录表

```sql
CREATE TABLE food_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    
    meal_type VARCHAR(20),  -- '早餐' | '午餐' | '晚餐' | '加餐'
    food_type VARCHAR(50),  -- '健康减脂' | '低卡/节食' | '常规饮食' | '吃太多啦'
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

CREATE INDEX idx_food_user_date ON food_records(user_id, record_date);
CREATE INDEX idx_food_meal_type ON food_records(user_id, meal_type);
```

### 5. sleep_records - 睡眠记录表

```sql
CREATE TABLE sleep_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,  -- 记录所属日期（起床日期）
    
    sleep_date DATE NOT NULL,   -- 实际睡觉日期（可能是前一天）
    bedtime TIME,               -- 上床时间
    wake_time TIME,             -- 起床时间
    
    sleep_hours DECIMAL(4,2) NOT NULL,
    sleep_quality INTEGER CHECK(sleep_quality BETWEEN 1 AND 10),
    deep_sleep_hours DECIMAL(4,2),
    
    time_period VARCHAR(20),    -- '昨晚' | '今晚' | '午睡'
    note TEXT,
    
    is_auto_recorded BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',  -- 'manual' | 'chat_extract' | 'device_sync'
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sleep_user_date ON sleep_records(user_id, record_date);
```

### 6. exercise_records - 运动记录表

```sql
CREATE TABLE exercise_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    record_date DATE NOT NULL,
    record_time TIME NOT NULL,
    
    exercise_type VARCHAR(50),  -- '跑步' | '健身' | '瑜伽' | '散步' | '其他'
    duration_min INTEGER NOT NULL,
    intensity VARCHAR(20),      -- 'low' | 'medium' | 'high'
    calories_burned INTEGER,
    
    time_period VARCHAR(20),    -- '早晨' | '上午' | '下午' | '晚上'
    note TEXT,
    
    is_auto_recorded BOOLEAN DEFAULT FALSE,
    source VARCHAR(30) DEFAULT 'manual',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_exercise_user_date ON exercise_records(user_id, record_date);
```

### 7. health_index_history - 健康指数历史表

```sql
CREATE TABLE health_index_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    calc_date DATE NOT NULL,
    
    -- 各维度分数
    water_score DECIMAL(5,2),
    food_score DECIMAL(5,2),
    sleep_score DECIMAL(5,2),
    exercise_score DECIMAL(5,2),
    
    -- 时间维度指数
    index_1d DECIMAL(5,2),
    index_3d DECIMAL(5,2),
    index_7d DECIMAL(5,2),
    index_30d DECIMAL(5,2),
    
    -- 最终指数
    final_index DECIMAL(5,2),
    
    -- 详细数据快照
    water_total_ml INTEGER,
    food_count INTEGER,
    sleep_total_hours DECIMAL(4,2),
    exercise_total_min INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, calc_date)
);

CREATE INDEX idx_health_index_user_date ON health_index_history(user_id, calc_date);
```

### 8. chat_summaries - 聊天记录表

```sql
CREATE TABLE chat_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(50),
    
    user_message TEXT NOT NULL,
    agent_reply TEXT NOT NULL,
    
    -- AI 提取的结构化数据
    extracted_data JSON,  -- {"type": "water", "value": "500ml", "time": "下午"}
    
    -- 情感分析
    sentiment VARCHAR(20),  -- 'positive' | 'neutral' | 'negative'
    user_mood INTEGER,      -- 1-10
    
    -- 关联的健康记录
    related_record_id INTEGER,  -- 关联的 health record id
    related_record_type VARCHAR(20),  -- 'water' | 'food' | 'sleep' | 'exercise'
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_chat_user ON chat_summaries(user_id);
CREATE INDEX idx_chat_session ON chat_summaries(session_id);
```

### 9. user_tags - 用户画像标签表

```sql
CREATE TABLE user_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tag_name VARCHAR(50) NOT NULL,  -- '久坐型' | '高压加班型' | '晚睡型'
    tag_value VARCHAR(100),
    confidence DECIMAL(3,2),        -- 0.00-1.00
    source VARCHAR(30),             -- 'manual' | 'ai_inferred'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, tag_name)
);
```

### 10. ai_suggestions - AI 建议历史表

```sql
CREATE TABLE ai_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    suggestion_date DATE NOT NULL,
    
    suggestion_type VARCHAR(30),  -- 'water' | 'food' | 'sleep' | 'exercise'
    suggestion_text TEXT NOT NULL,
    priority VARCHAR(20),         -- 'low' | 'medium' | 'high'
    
    is_accepted BOOLEAN,
    accepted_at DATETIME,
    completed_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_suggestions_user_date ON ai_suggestions(user_id, suggestion_date);
```

---

## 未来扩展性设计

### 新增健康动作类型

如需添加新的健康动作（如"冥想"、"体重记录"），只需：

1. 创建新表（如 `meditation_records`）
2. 在 `daily_health_records` 中添加汇总字段
3. 更新健康指数计算逻辑

### AI 自动记录流程

```
用户聊天 → AI 识别意图 → 提取数据 → 写入对应表 → 标记 is_auto_recorded=true
                                        → 关联 chat_summaries.related_record_id
```

### 数据修改审计

当前设计支持直接更新（`updated_at` 记录修改时间）。如需完整审计：

```sql
CREATE TABLE data_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    table_name VARCHAR(50),
    record_id INTEGER,
    action VARCHAR(20),  -- 'INSERT' | 'UPDATE' | 'DELETE'
    old_values JSON,
    new_values JSON,
    changed_by VARCHAR(30),  -- 'user' | 'ai' | 'system'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 索引优化策略

| 表名 | 索引字段 | 用途 |
|------|---------|------|
| daily_health_records | (user_id, record_date) | 按用户 + 日期查询 |
| water_records | (user_id, record_date) | 按用户 + 日期聚合 |
| food_records | (user_id, record_date), (user_id, meal_type) | 查询 + 按餐次统计 |
| sleep_records | (user_id, record_date) | 睡眠趋势分析 |
| exercise_records | (user_id, record_date) | 运动趋势分析 |
| health_index_history | (user_id, calc_date) | 指数历史查询 |
| chat_summaries | (user_id), (session_id) | 聊天历史查询 |
| ai_suggestions | (user_id, suggestion_date) | 建议历史追踪 |

---

## 迁移策略

### 阶段一：双写模式
- 保持 JSON 写入
- 新增 SQLite 写入
- 对比验证数据一致性

### 阶段二：读迁移
- 查询接口逐步切换到 SQLite
- JSON 作为备份

### 阶段三：清理
- 移除 JSON 依赖
- 保留导出功能

---

## 统计可视化数据需求

### 1. 首页重点信息
- 今日健康指数（实时计算）
- 今日完成进度（4 项动作完成度）
- 连续打卡天数
- AI 动态建议

### 2. 统计页可视化

#### 2.1 概览卡片
- 本周平均健康指数
- 本周 vs 上周对比
- 最佳/最差日期

#### 2.2 分项时间线（可切换）
- **喝水**：每日总量折线图 + 时段分布热力图
- **饮食**：每日餐次分布 + 健康度趋势
- **睡眠**：每日时长 + 质量趋势
- **运动**：每日时长 + 类型分布

#### 2.3 关联分析
- 睡眠 vs 精力水平
- 运动 vs 心情
- 饮食健康度 vs 体重变化

### 3. 数据导出
- 支持导出 CSV/JSON
- 支持选择日期范围
