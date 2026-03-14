#!/bin/bash
# vibe-healing 心跳检查脚本
# 每 30 分钟检查一次，持续迭代优化

LOG_FILE="/tmp/vibe-healing-heartbeat.log"
PROJECT_DIR="/home/admin/.openclaw/workspace/vibe-healing"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 心跳检查启动 ==="

# 检查服务器是否运行
if ! pgrep -f "node backend/server.js" > /dev/null; then
    log "⚠️ 服务器未运行，重启中..."
    cd "$PROJECT_DIR"
    nohup node backend/server.js > /tmp/vibe-healing.log 2>&1 &
    sleep 2
    log "✅ 服务器已重启"
else
    log "✅ 服务器运行正常"
fi

# 检查 API 是否响应
RESPONSE=$(curl -s http://localhost:3000/api/home 2>/dev/null)
if echo "$RESPONSE" | grep -q '"success":true'; then
    log "✅ API 响应正常"
else
    log "⚠️ API 响应异常，尝试重启..."
    pkill -f "node backend/server.js"
    sleep 1
    cd "$PROJECT_DIR"
    nohup node backend/server.js > /tmp/vibe-healing.log 2>&1 &
    log "✅ 服务器已重启"
fi

# 自动迭代优化检查
log "📝 检查代码优化点..."

# 检查是否需要添加新功能或优化
# 这里可以添加自动化的代码改进逻辑

log "=== 心跳检查完成 ==="
log ""
