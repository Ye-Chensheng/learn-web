# 🦞 vibe-healing 快速启动指南

## 🚀 5 分钟启动演示

### 前提条件

- Node.js 14+ 已安装
- npm 已安装

### 启动步骤

```bash
# 1. 进入项目目录
cd /home/admin/.openclaw/workspace/vibe-healing

# 2. 安装依赖 (首次运行)
npm install

# 3. 启动服务器
npm start

# 4. 打开浏览器访问
# http://localhost:3000
```

### 验证运行

服务器启动后会显示：

```
╔═══════════════════════════════════════════════════════════╗
║   🦞 vibe-healing 健康陪伴系统                            ║
║   服务器已启动：http://localhost:3000                     ║
║   MVP 版本 v2.1 - 持续开发中...                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 📱 功能演示路径

### 第一次使用

1. **访问首页** → 自动创建用户 (ID: 1)
2. **查看今日建议** → 显示 3 条建议卡片
3. **点击快捷记录** → 记录喝水/饮食/运动等
4. **切换到聊天页** → 和 AI 聊聊天
5. **查看记录页** → 填写今日健康数据

### 测试聊天

在聊天页面输入以下内容测试 AI 回复：

```
今天加班好累
昨晚没睡好
想喝奶茶
今天运动了 30 分钟
```

### 测试记录

1. 点击"喝水"按钮 → 输入杯数 → 保存
2. 点击"饮食"按钮 → 输入食物 → 保存
3. 切换到"记录"页面 → 填写完整表单 → 保存

---

## 🔧 常见问题

### 端口被占用

如果 3000 端口被占用，可以修改：

```bash
PORT=3001 npm start
```

### 依赖安装失败

```bash
# 清除缓存重试
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 数据文件位置

数据存储在：`db/data.json`

可以手动删除此文件重置数据。

---

## 📊 API 测试

使用 curl 测试 API：

```bash
# 获取首页数据
curl http://localhost:3000/api/home?user_id=1

# 获取今日日志
curl http://localhost:3000/api/logs/today?user_id=1

# 发送聊天消息
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"message":"今天好累"}'

# 获取周报
curl http://localhost:3000/api/report/weekly?user_id=1
```

---

## 🎯 下一步

### 开发环境

```bash
# 实时监控代码变化 (需安装 nodemon)
npm install -g nodemon
nodemon backend/server.js
```

### 部署到服务器

```bash
# 使用 PM2 守护进程
npm install -g pm2
pm2 start backend/server.js --name vibe-healing
pm2 save
```

---

## 📝 项目结构

```
vibe-healing/
├── backend/
│   └── server.js          # 主服务器
├── frontend/
│   ├── index.html         # 主页面
│   ├── css/main.css       # 样式
│   └── js/app.js          # 前端逻辑
├── db/
│   └── data.json          # 数据存储
├── package.json           # 依赖配置
├── README.md              # 产品文档
├── ACCEPTANCE_REPORT.md   # 验收报告
└── DEV_LOG.md            # 开发日志
```

---

## 🎉 开始使用

访问 `http://localhost:3000` 开始体验！

有任何问题请查看：
- README.md - 完整产品文档
- ACCEPTANCE_REPORT.md - 验收报告
- DEV_LOG.md - 开发日志

---

**vibe-healing Team** © 2026
