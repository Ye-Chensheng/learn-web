# 📊 vibe-healing 数据库查询指南

## 🔍 数据库位置

```
vibe-healing/db/vibe-healing.db
```

---

## 🛠️ 查询工具

### 方法 1: 使用 SQLite 命令行

```bash
# 进入项目目录
cd vibe-healing

# 打开数据库
sqlite3 db/vibe-healing.db
```

### 方法 2: 使用 DB Browser for SQLite（图形化）

1. 下载：https://sqlitebrowser.org/dl/
2. 打开软件
3. 选择数据库文件：`vibe-healing/db/vibe-healing.db`
4. 浏览数据和执行 SQL

---

## 📋 常用查询 SQL

### 1. 查看所有用户

```sql
SELECT id, wx_openid, nickname, gender, height_cm, weight_kg, health_goal 
FROM users;
```

### 2. 查看特定用户的基础信息

```sql
-- 查看测试用户 10000
SELECT * FROM users WHERE id = 10000;
```

### 3. 查看某用户的每日健康记录

```sql
-- 查看用户 10000 最近 7 天的记录
SELECT record_date, mood_level, energy_level, work_load, 
       water_total_ml, sleep_total_hours, exercise_total_min
FROM daily_health_records
WHERE user_id = 10000
ORDER BY record_date DESC
LIMIT 7;
```

### 4. 查看某用户的喝水记录

```sql
-- 查看用户 10000 今天的所有喝水记录
SELECT record_date, record_time, amount_ml, time_period
FROM water_records
WHERE user_id = 10000
  AND record_date = date('now')
ORDER BY record_time;
```

### 5. 查看某用户的饮食记录

```sql
-- 查看用户 10000 最近 3 天的饮食
SELECT record_date, record_time, meal_type, food_type, is_healthy
FROM food_records
WHERE user_id = 10000
ORDER BY record_date DESC, record_time
LIMIT 20;
```

### 6. 查看某用户的睡眠记录

```sql
-- 查看用户 10000 的睡眠记录
SELECT record_date, sleep_hours, sleep_quality, bedtime, wake_time
FROM sleep_records
WHERE user_id = 10000
ORDER BY record_date DESC
LIMIT 7;
```

### 7. 查看某用户的运动记录

```sql
-- 查看用户 10000 的运动记录
SELECT record_date, exercise_type, duration_min, intensity, time_period
FROM exercise_records
WHERE user_id = 10000
ORDER BY record_date DESC
LIMIT 10;
```

### 8. 查看健康指数历史

```sql
-- 查看用户 10000 的健康指数趋势
SELECT calc_date, final_index, water_score, food_score, sleep_score, exercise_score
FROM health_index_history
WHERE user_id = 10000
ORDER BY calc_date DESC
LIMIT 30;
```

### 9. 统计某用户的平均数据（最近 7 天）

```sql
SELECT 
    COUNT(*) as days,
    AVG(water_total_ml) as avg_water,
    AVG(sleep_total_hours) as avg_sleep,
    AVG(exercise_total_min) as avg_exercise,
    AVG(mood_level) as avg_mood,
    AVG(energy_level) as avg_energy
FROM daily_health_records
WHERE user_id = 10000
  AND record_date >= date('now', '-7 days');
```

### 10. 查看用户画像标签

```sql
SELECT tag_name, tag_value, confidence, source
FROM user_tags
WHERE user_id = 10000;
```

---

## 🧪 测试用户数据说明

### 用户 ID: 10000

**基础信息**:
- 昵称：测试用户
- 性别：男
- 年龄：28 岁
- 身高：175 cm
- 体重：70 kg
- 健康目标：减脂

**数据范围**: 30 天完整记录

**数据特点**:
- 每天喝水 5-6 次（200-500ml/次）
- 每天 3 餐饮食记录
- 每天睡眠 6.5-8.5 小时
- 每周运动 3-5 次（20-70 分钟/次）
- 健康指数 60-95 分波动

---

## 📱 C 端验证流程

### 1. 访问用户选择页面

```
http://localhost:3000/select-user.html
```

### 2. 输入用户 ID

- 输入 `10000` 查看测试用户
- 输入 `1` 查看默认用户

### 3. 验证首页数据

- 查看基础信息（性别、身高、体重）
- 查看健康指数
- 尝试记录喝水/饮食/睡眠/运动

### 4. 验证统计页面

- 点击底部导航"统计"
- 切换 7 天/14 天/30 天
- 切换图表类型（综合/喝水/睡眠/运动）
- 验证数据是否随时间范围变化

### 5. 验证数据持久化

**在首页记录一次喝水**:
1. 点击"喝水" → "500ml"
2. 选择时间 → 确认

**在数据库验证**:
```sql
-- 查看最新的喝水记录
SELECT record_date, record_time, amount_ml, time_period
FROM water_records
WHERE user_id = 10000
ORDER BY record_time DESC
LIMIT 1;

-- 查看今日汇总是否更新
SELECT record_date, water_total_ml
FROM daily_health_records
WHERE user_id = 10000
  AND record_date = date('now');
```

**刷新统计页面**:
- 喝水数据应该增加
- 趋势图应该显示最新数据

---

## 🔧 重置测试数据

如果想重新生成测试用户 10000 的数据：

```bash
cd vibe-healing
npm run generate-test-data
```

---

## 📊 数据表关系

```
users (用户表)
  └── user_id (外键关联所有表)
       ├── daily_health_records (每日汇总)
       ├── water_records (喝水明细)
       ├── food_records (饮食明细)
       ├── sleep_records (睡眠明细)
       ├── exercise_records (运动明细)
       ├── health_index_history (健康指数)
       ├── chat_summaries (聊天记录)
       ├── user_tags (用户画像)
       └── ai_suggestions (AI 建议)
```

**数据流向**:
```
用户操作 → 写入明细表 → 更新每日汇总 → 重新计算健康指数 → 统计页展示
```

---

## 🎯 验证清单

- [ ] 用户 10000 的基础信息正确显示
- [ ] 统计页 7 天/14 天/30 天数据不同
- [ ] 喝水/睡眠/运动图表数据准确
- [ ] 首页记录后数据库立即更新
- [ ] 刷新后统计数据同步更新
- [ ] 不同用户 ID 显示不同数据

---

**完成以上验证后，说明前后端数据库联动成功！**
