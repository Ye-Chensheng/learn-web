#!/bin/bash
# vibe-healing 实时时钟记录与提醒
# 每小时报时 + 记录当前时间

LOG_FILE="/tmp/vibe-healing-clock.log"
PROJECT_DIR="/home/admin/.openclaw/workspace/vibe-healing"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 当前时间
CURRENT_TIME=$(date '+%Y年%m月%d日 %H:%M')
HOUR=$(date '+%H')

log "⏰ 当前时间：$CURRENT_TIME"

# 根据时间段给出不同提醒
if [ "$HOUR" -ge 0 ] && [ "$HOUR" -lt 6 ]; then
    log "🌙 深夜时段 - 服务器持续运行中"
elif [ "$HOUR" -ge 6 ] && [ "$HOUR" -lt 8 ]; then
    log "🌅 清晨时段 - 距离验收还有 $((8 - HOUR)) 小时"
elif [ "$HOUR" -eq 8 ]; then
    log "☀️ 验收时间到！发送验收报告"
    /tmp/vibe-healing-8am.sh
else
    log "☀️ 白天时段 - 正常运行"
fi

# 记录服务器状态
if pgrep -f "node backend/server.js" > /dev/null; then
    log "✅ 服务器运行正常"
else
    log "⚠️ 服务器已停止，尝试重启..."
    cd "$PROJECT_DIR"
    nohup node backend/server.js > /tmp/vibe-healing.log 2>&1 &
    log "✅ 服务器已重启"
fi

# 更新时钟记录文件
cat > "$PROJECT_DIR/CLOCK_LOG.md" << EOF
# 🕐 vibe-healing 实时时钟记录

**最后更新**: $CURRENT_TIME

## 当前状态

| 项目 | 状态 |
|------|------|
| 服务器 | $(pgrep -f "node backend/server.js" > /dev/null && echo "✅ 运行中" || echo "❌ 已停止") |
| 端口 | 3000 |
| 版本 | v2.1 |
| Git 提交 | $(cd $PROJECT_DIR && git log --oneline | wc -l) 次 |

## 时间线

$(cat /tmp/vibe-healing-clock.log 2>/dev/null | tail -20)

## 距离验收

$(if [ "$HOUR" -lt 8 ]; then echo "⏱️ 还有 $((8 - HOUR)) 小时"; else echo "✅ 验收时间已到"; fi)

---

*自动更新中...*
EOF

log "📝 时钟记录已更新"
