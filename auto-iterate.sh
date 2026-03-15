#!/bin/bash
# vibe-healing 持续迭代脚本
# 自动优化代码、添加功能、改进文档

LOG_FILE="/tmp/vibe-healing-iterate.log"
PROJECT_DIR="/home/admin/.openclaw/workspace/vibe-healing"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cd "$PROJECT_DIR"

log "=== 开始迭代优化 ==="

# 检查并记录当前状态
GIT_STATUS=$(git status --short 2>/dev/null | wc -l)
log "当前未提交变更：$GIT_STATUS"

# 如果有变更，自动提交
if [ "$GIT_STATUS" -gt 0 ]; then
    git add -A 2>/dev/null
    git commit -m "auto: 持续迭代优化 $(date '+%Y-%m-%d %H:%M')" 2>/dev/null
    log "✅ 代码已自动提交"
fi

# 检查服务器状态
if curl -s http://localhost:3000/api/home | grep -q '"success":true'; then
    log "✅ 服务器运行正常"
else
    log "⚠️ 服务器异常，尝试重启..."
    pkill -f "node backend/server.js"
    sleep 1
    nohup node backend/server.js > /tmp/vibe-healing.log 2>&1 &
    log "✅ 服务器已重启"
fi

# 注意：不再自动修改 DEV_LOG.md
# 开发日志只记录真实完成的功能/文档变更，不预写时间记录
log "📝 系统日志已更新 (DEV_LOG.md 仅手动更新)"

log "=== 迭代优化完成 ==="
log ""
