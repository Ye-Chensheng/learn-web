# 🗄️ vibe-healing v2.0 数据库设计文档

## ✅ 数据库状态确认

**数据库类型**: SQLite  
**数据库文件**: `db/vibe-healing.db`  
**数据表数量**: 10 张核心表 + 1 个视图  
**当前数据量**:
- 用户：1 人
- 每日健康记录：7 天
- 喝水记录：33 条
- 饮食记录：17 条
- 睡眠记录：7 条
- 运动记录：5 条
- 健康指数：7 条

---

## 📊 核心数据表设计

### 1. users - 用户基础信息表
**用途**: 存储用户基本信息和健康目标

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 用户 ID | 1 |
| wx_openid | VARCHAR(100) UNIQUE | 微信 openid | demo_user_001 |
| nickname | VARCHAR(50) | 昵称 | 小伙伴 |
| gender | VARCHAR(10) | 性别 | 女 |
| age | INTEGER | 年龄 | 25 |
| height_cm | DECIMAL(5,2) | 身高 (cm) | 168 |
| weight_kg | DECIMAL(5,2) | 体重 (kg) | 55 |
| occupation | VARCHAR(50) | 职业 | 程序员 |
| work_type | VARCHAR(30) | 工作类型 | 久坐型 |
| wake_time | TIME | 起床时间 | 08:00 |
| work_start | TIME | 上班时间 | 09:30 |
| work_end | TIME | 下班时间 | 21:00 |
| health_goal | VARCHAR(50) | 健康目标 | 减脂 |
| created_at | DATETIME | 创建时间 | 2026-03-17 |
| updated_at | DATETIME | 更新时间 | 2026-03-17 |

**索引**: `wx_openid` (UNIQUE)

---

### 2. daily_health_records - 每日健康总览表
**用途**: 每日健康数据汇总，支持快速查询和统计

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| record_date | DATE | 记录日期 | 2026-03-17 |
| weight_kg | DECIMAL(5,2) | 体重 | 55.2 |
| mood_level | INTEGER (1-10) | 心情等级 | 7 |
| energy_level | INTEGER (1-10) | 精力等级 | 6 |
| work_load | VARCHAR(20) | 工作负荷 | normal |
| mode_type | VARCHAR(20) | 模式 | stable |
| water_total_ml | INTEGER | 喝水总量 (ml) | 1619 |
| food_count | INTEGER | 饮食次数 | 3 |
| sleep_total_hours | DECIMAL(4,2) | 睡眠总时长 (h) | 7.4 |
| exercise_total_min | INTEGER | 运动总时长 (min) | 30 |
| ai_summary | TEXT | AI 总结 | - |
| special_note | TEXT | 备注 | - |
| created_at | DATETIME | 创建时间 | - |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, record_date)` UNIQUE  
**用途**: 统计页直接读取此表的汇总数据

---

### 3. water_records - 喝水记录表
**用途**: 记录每次喝水的详细信息

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| record_date | DATE | 记录日期 | 2026-03-17 |
| record_time | TIME | 记录时间 | 10:30 |
| amount_ml | INTEGER | 喝水量 (ml) | 500 |
| time_period | VARCHAR(20) | 时段 | 上午 |
| note | TEXT | 备注 | - |
| is_auto_recorded | BOOLEAN | 是否 AI 自动记录 | false |
| source | VARCHAR(30) | 来源 | manual/chat_extract |
| created_at | DATETIME | 创建时间 | - |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, record_date)`  
**统计用途**: 计算每日/每周平均喝水量

---

### 4. food_records - 饮食记录表
**用途**: 记录每餐饮食信息

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| record_date | DATE | 记录日期 | 2026-03-17 |
| record_time | TIME | 记录时间 | 12:30 |
| meal_type | VARCHAR(20) | 餐次 | 午餐 |
| food_type | VARCHAR(50) | 饮食类型 | 健康减脂 |
| food_name | TEXT | 食物名称 | 鸡胸肉沙拉 |
| food_desc | TEXT | 描述 | 清淡 |
| calories | INTEGER | 卡路里 | 350 |
| protein_g | DECIMAL(5,2) | 蛋白质 (g) | 25 |
| carbs_g | DECIMAL(5,2) | 碳水 (g) | 30 |
| fat_g | DECIMAL(5,2) | 脂肪 (g) | 10 |
| is_healthy | BOOLEAN | 是否健康 | true |
| is_auto_recorded | BOOLEAN | 是否 AI 自动记录 | false |
| source | VARCHAR(30) | 来源 | manual/chat_extract |
| created_at | DATETIME | 创建时间 | - |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, record_date)`, `(user_id, meal_type)`  
**统计用途**: 分析饮食健康度、餐次分布

---

### 5. sleep_records - 睡眠记录表
**用途**: 记录每日睡眠情况

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| record_date | DATE | 记录日期 (起床日) | 2026-03-17 |
| sleep_date | DATE | 睡觉日期 | 2026-03-16 |
| bedtime | TIME | 上床时间 | 23:30 |
| wake_time | TIME | 起床时间 | 07:00 |
| sleep_hours | DECIMAL(4,2) | 睡眠时长 (h) | 7.5 |
| sleep_quality | INTEGER (1-10) | 睡眠质量 | 8 |
| deep_sleep_hours | DECIMAL(4,2) | 深睡时长 (h) | 2.1 |
| time_period | VARCHAR(20) | 时段 | 昨晚 |
| note | TEXT | 备注 | - |
| is_auto_recorded | BOOLEAN | 是否 AI 自动记录 | false |
| source | VARCHAR(30) | 来源 | manual/device_sync |
| created_at | DATETIME | 创建时间 | - |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, record_date)`  
**统计用途**: 分析睡眠趋势、质量变化

---

### 6. exercise_records - 运动记录表
**用途**: 记录每次运动情况

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| record_date | DATE | 记录日期 | 2026-03-17 |
| record_time | TIME | 记录时间 | 19:00 |
| exercise_type | VARCHAR(50) | 运动类型 | 跑步 |
| duration_min | INTEGER | 时长 (分钟) | 30 |
| intensity | VARCHAR(20) | 强度 | medium |
| calories_burned | INTEGER | 消耗卡路里 | 250 |
| time_period | VARCHAR(20) | 时段 | 晚上 |
| note | TEXT | 备注 | - |
| is_auto_recorded | BOOLEAN | 是否 AI 自动记录 | false |
| source | VARCHAR(30) | 来源 | manual/device_sync |
| created_at | DATETIME | 创建时间 | - |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, record_date)`  
**统计用途**: 统计运动天数、时长、类型分布

---

### 7. health_index_history - 健康指数历史表
**用途**: 存储每日计算的健康指数，支持趋势分析

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| calc_date | DATE | 计算日期 | 2026-03-17 |
| water_score | DECIMAL(5,2) | 喝水分数 | 85.0 |
| food_score | DECIMAL(5,2) | 饮食分数 | 75.0 |
| sleep_score | DECIMAL(5,2) | 睡眠分数 | 90.0 |
| exercise_score | DECIMAL(5,2) | 运动分数 | 60.0 |
| index_1d | DECIMAL(5,2) | 1 天指数 | 83.8 |
| index_3d | DECIMAL(5,2) | 3 天指数 | 81.5 |
| index_7d | DECIMAL(5,2) | 7 天指数 | 79.2 |
| index_30d | DECIMAL(5,2) | 30 天指数 | 78.0 |
| final_index | DECIMAL(5,2) | 最终指数 | 81.1 |
| water_total_ml | INTEGER | 喝水总量 | 1619 |
| food_count | INTEGER | 饮食次数 | 3 |
| sleep_total_hours | DECIMAL(4,2) | 睡眠总时长 | 7.4 |
| exercise_total_min | INTEGER | 运动总时长 | 30 |
| created_at | DATETIME | 创建时间 | - |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, calc_date)` UNIQUE  
**统计用途**: 统计页健康指数趋势图数据源

---

### 8. chat_summaries - 聊天记录表
**用途**: 存储用户与 AI 的聊天内容，支持 AI 自动提取健康数据

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| session_id | VARCHAR(50) | 会话 ID | session_2026-03-17 |
| user_message | TEXT | 用户消息 | 今天喝了 500ml 水 |
| agent_reply | TEXT | AI 回复 | 很棒！继续保持～ |
| extracted_data | JSON | 提取的数据 | {"type":"water","value":500} |
| sentiment | VARCHAR(20) | 情感 | positive |
| user_mood | INTEGER | 用户心情 | 8 |
| related_record_id | INTEGER | 关联记录 ID | 5 |
| related_record_type | VARCHAR(20) | 关联记录类型 | water |
| created_at | DATETIME | 创建时间 | - |

**索引**: `(user_id)`, `(session_id)`  
**用途**: AI 对话历史、自动记录溯源

---

### 9. user_tags - 用户画像标签表
**用途**: 存储 AI 分析的用户画像标签

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| tag_name | VARCHAR(50) | 标签名 | 高压加班型 |
| tag_value | VARCHAR(100) | 标签值 | true |
| confidence | DECIMAL(3,2) | 置信度 | 0.85 |
| source | VARCHAR(30) | 来源 | ai_inferred |
| updated_at | DATETIME | 更新时间 | - |

**索引**: `(user_id, tag_name)` UNIQUE  
**用途**: AI 个性化建议、用户分层

---

### 10. ai_suggestions - AI 建议历史表
**用途**: 记录 AI 给出的健康建议及用户采纳情况

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| id | INTEGER PRIMARY KEY | 记录 ID | 1 |
| user_id | INTEGER | 用户 ID | 1 |
| suggestion_date | DATE | 建议日期 | 2026-03-17 |
| suggestion_type | VARCHAR(30) | 建议类型 | water |
| suggestion_text | TEXT | 建议内容 | 今天记得多喝两杯水 |
| priority | VARCHAR(20) | 优先级 | high |
| is_accepted | BOOLEAN | 是否接受 | true |
| accepted_at | DATETIME | 接受时间 | - |
| completed_at | DATETIME | 完成时间 | - |
| created_at | DATETIME | 创建时间 | - |

**索引**: `(user_id, suggestion_date)`  
**用途**: AI 建议效果分析、用户依从性统计

---

## 🔍 数据流转设计

### 用户交互数据留存流程

```
用户操作 → 后端 API → SQLite 数据库 → 统计 API → 前端图表
   ↓
AI 聊天 → 自动提取 → 写入对应表 → 标记来源
```

### 数据来源标记

| 来源 | 说明 | 示例 |
|------|------|------|
| manual | 用户手动记录 | 点击首页快捷按钮 |
| chat_extract | AI 聊天自动提取 | "今天喝了 500ml 水" |
| device_sync | 设备同步 | 手环睡眠数据 |

---

## 📈 统计 Tab 数据映射

### 概览卡片数据源

| 指标 | 数据表 | 计算方式 |
|------|--------|---------|
| 健康指数 | health_index_history | AVG(final_index) |
| 平均睡眠 | daily_health_records | AVG(sleep_total_hours) |
| 平均喝水 | daily_health_records | AVG(water_total_ml) |
| 运动天数 | daily_health_records | COUNT(exercise_total_min > 0) |

### 趋势图数据源

| 图表类型 | 数据表 | 字段 |
|---------|--------|------|
| 综合指数 | health_index_history | final_index |
| 喝水 | daily_health_records | water_total_ml |
| 睡眠 | daily_health_records | sleep_total_hours |
| 运动 | daily_health_records | exercise_total_min |

---

## 🎯 API 接口

### 统计 API

```
GET /api/stats?user_id=1&days=7
```

**返回示例**:
```json
{
  "success": true,
  "data": {
    "totalDays": 7,
    "avgWater": 1619,
    "avgSleep": 7.4,
    "avgExercise": 27,
    "avgMood": 7,
    "avgEnergy": 5.7,
    "exerciseDays": 5,
    "avgHealthIndex": 81.1,
    "trend": [
      {
        "record_date": "2026-03-11",
        "water_total_ml": 1665,
        "sleep_total_hours": 6.7,
        "exercise_total_min": 0,
        "mood_level": 8,
        "energy_level": 8
      }
    ]
  }
}
```

---

## ✅ 设计验证

### 数据完整性
- ✅ 用户信息可存储
- ✅ 四项健康动作独立落表
- ✅ 每日汇总自动计算
- ✅ 健康指数自动计算并存储
- ✅ 聊天记录可追溯
- ✅ 用户画像可积累

### 统计能力
- ✅ 支持 7/14/30 天时间范围
- ✅ 支持 4 种图表类型切换
- ✅ 趋势数据完整
- ✅ 汇总数据准确

### 扩展性
- ✅ 支持多用户
- ✅ 支持 AI 自动记录
- ✅ 支持设备数据接入
- ✅ 支持新增健康动作类型

---

**数据库设计完成，完全支持用户交互数据的存储、统计和可视化展示！**
