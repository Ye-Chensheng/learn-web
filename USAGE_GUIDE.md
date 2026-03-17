# 🚀 vibe-healing v2.1 使用指南

## ✅ 已完成功能

### 1. 用户 ID 体系
- ✅ 用户选择页面
- ✅ localStorage 存储用户 ID
- ✅ 支持多用户数据隔离

### 2. 数据库设计
- ✅ 10 张核心表完整设计
- ✅ 用户数据完全隔离（通过 user_id）
- ✅ 支持时间戳记录（每次交互的时间）

### 3. 测试数据
- ✅ 用户 10000：30 天完整健康记录
- ✅ 用户 1：7 天基础数据

### 4. 前后端联动
- ✅ 首页交互 → 数据库存储
- ✅ 统计页面 → 真实 API 查询
- ✅ 时间范围切换 → 数据动态变化

---

## 📥 本地部署步骤

### 1. 拉取最新代码

```powershell
cd D:\learn-python\learn-python-ycs\learn-web

# 拉取最新代码
git pull origin main
```

### 2. 安装依赖

```powershell
# 进入项目目录（直接在 learn-web 根目录）
cd D:\learn-python\learn-python-ycs\learn-web

# 安装依赖
npm install
```

### 3. 生成测试数据

```powershell
# 生成测试用户 10000 的 30 天数据
npm run generate-test-data
```

### 4. 启动服务

```powershell
# 启动服务器
npm start
```

### 5. 访问应用

**用户选择页面**:
```
http://localhost:3000/select-user.html
```

**首页**:
```
http://localhost:3000/
```

---

## 🧪 测试流程

### 第一步：选择用户

1. 访问 `http://localhost:3000/select-user.html`
2. 点击 "🧪 测试用户 (10000)"
3. 系统会跳转到首页

### 第二步：查看首页

**验证内容**:
- 性别：男
- 身高：175cm
- 体重：70kg
- 健康指数：约 80 分左右

**尝试交互**:
- 点击"喝水" → "500ml" → 选择时间 → 确认
- 系统会提示记录成功

### 第三步：查看统计页面

1. 点击底部导航"📊 统计"
2. 查看概览卡片数据
3. 切换时间范围（7 天/14 天/30 天）
4. 切换图表类型（综合/喝水/睡眠/运动）

**验证数据变化**:
- 7 天：平均喝水约 1500-1800ml
- 14 天：平均喝水约 1500-1800ml
- 30 天：平均喝水约 1500-1800ml
- 数值应该**不同**（因为是真实数据）

### 第四步：验证数据库

**查看喝水记录**:
```bash
# 在项目目录执行
sqlite3 db/vibe-healing.db

# 执行 SQL
SELECT record_date, record_time, amount_ml, time_period
FROM water_records
WHERE user_id = 10000
ORDER BY record_time DESC
LIMIT 5;
```

**查看每日汇总**:
```sql
SELECT record_date, water_total_ml, sleep_total_hours, exercise_total_min
FROM daily_health_records
WHERE user_id = 10000
ORDER BY record_date DESC
LIMIT 7;
```

**查看健康指数**:
```sql
SELECT calc_date, final_index, water_score, food_score, sleep_score, exercise_score
FROM health_index_history
WHERE user_id = 10000
ORDER BY calc_date DESC
LIMIT 7;
```

### 第五步：验证数据持久化

1. **在首页记录一次喝水**
   - 点击"喝水" → "500ml"
   - 选择时间 → 确认

2. **立即查询数据库**
   ```sql
   -- 查看最新记录
   SELECT record_date, record_time, amount_ml
   FROM water_records
   WHERE user_id = 10000
   ORDER BY record_time DESC
   LIMIT 1;
   
   -- 查看今日汇总
   SELECT record_date, water_total_ml
   FROM daily_health_records
   WHERE user_id = 10000
   AND record_date = date('now');
   ```

3. **刷新统计页面**
   - 喝水数据应该增加
   - 趋势图应该更新

---

## 📊 测试用户 10000 数据说明

### 基础信息
| 字段 | 值 |
|------|-----|
| 用户 ID | 10000 |
| 昵称 | 测试用户 |
| 性别 | 男 |
| 年龄 | 28 岁 |
| 身高 | 175 cm |
| 体重 | 70 kg |
| 健康目标 | 减脂 |

### 数据范围
- **时间跨度**: 30 天（2026-02-15 到 2026-03-17）
- **喝水记录**: 约 150-180 条（每天 5-6 次）
- **饮食记录**: 90 条（每天 3 餐）
- **睡眠记录**: 30 条（每天 1 条）
- **运动记录**: 约 20-25 条（每周 3-5 次）
- **健康指数**: 30 条（每天计算）

### 数据特点
- 喝水：每次 200-500ml，时段分布均匀
- 饮食：健康减脂/常规饮食/低卡节食随机
- 睡眠：6.5-8.5 小时，质量 6-10 分
- 运动：20-70 分钟，类型多样
- 健康指数：60-95 分波动

---

## 🔍 数据库查询速查

### 查看所有表
```sql
.tables
```

### 查看表结构
```sql
.schema users
.schema water_records
```

### 统计各表数据量
```sql
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'daily_health_records', COUNT(*) FROM daily_health_records WHERE user_id=10000
UNION ALL
SELECT 'water_records', COUNT(*) FROM water_records WHERE user_id=10000
UNION ALL
SELECT 'food_records', COUNT(*) FROM food_records WHERE user_id=10000
UNION ALL
SELECT 'sleep_records', COUNT(*) FROM sleep_records WHERE user_id=10000
UNION ALL
SELECT 'exercise_records', COUNT(*) FROM exercise_records WHERE user_id=10000
UNION ALL
SELECT 'health_index_history', COUNT(*) FROM health_index_history WHERE user_id=10000;
```

### 查看某用户 7 天趋势
```sql
SELECT 
    record_date,
    water_total_ml,
    sleep_total_hours,
    exercise_total_min,
    mood_level
FROM daily_health_records
WHERE user_id = 10000
ORDER BY record_date DESC
LIMIT 7;
```

---

## 🎯 验证清单

完成以下检查确保系统正常工作：

- [ ] 能访问用户选择页面
- [ ] 选择用户 10000 后进入首页
- [ ] 首页显示正确的基础信息
- [ ] 首页记录喝水后数据库有记录
- [ ] 统计页面显示真实数据
- [ ] 切换 7/14/30 天数据有变化
- [ ] 切换图表类型显示正确数据
- [ ] 数据库查询结果与前端一致
- [ ] 刷新后数据保持同步

---

## 📖 完整文档

- `DATABASE_DESIGN.md` - 数据库设计文档
- `DATABASE_QUERY_GUIDE.md` - 数据库查询指南
- `DB_DESIGN.md` - 原始设计文档
- `RELEASE_v2.md` - v2.0 发布报告

---

## 🐛 常见问题

### Q: 统计页面数据不变化？
A: 检查是否选择了正确的用户 ID，确保数据库中有该用户的数据。

### Q: 首页记录后数据库没更新？
A: 检查浏览器控制台是否有错误，确认 API 请求成功。

### Q: 如何切换用户？
A: 访问 `http://localhost:3000/select-user.html` 重新选择。

### Q: 如何重置测试数据？
A: 执行 `npm run generate-test-data` 重新生成。

---

**🎉 完成以上步骤后，你就拥有了一套完整的、基于真实用户 ID 体系的健康管理系统！**
