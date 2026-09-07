#!/bin/bash
# MacCleaner 一键安装：在本机构建并安装到 /Applications。
# 本地构建的产物没有 quarantine 标记，不触发 Gatekeeper 拦截。
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="MacCleaner"
NEED_NODE_MAJOR=22

fail() { echo "✗ $1" >&2; exit 1; }

echo "▸ 检查构建环境"

command -v node >/dev/null 2>&1 || fail "未找到 Node.js。请安装 Node ${NEED_NODE_MAJOR} 或更高版本：https://nodejs.org"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge "$NEED_NODE_MAJOR" ] || fail "Node.js 版本过低（当前 v${NODE_MAJOR}，需要 ${NEED_NODE_MAJOR}+）。"

command -v npm >/dev/null 2>&1 || fail "未找到 npm。"
xcode-select -p >/dev/null 2>&1 || fail "未找到 Xcode 命令行工具。请先运行：xcode-select --install"
command -v swift >/dev/null 2>&1 || fail "未找到 swift。请先运行：xcode-select --install"

case "$(uname -m)" in
  arm64)  APP_DIR="release/mac-arm64/${APP_NAME}.app" ;;
  x86_64) APP_DIR="release/mac/${APP_NAME}.app" ;;
  *) fail "不支持的 CPU 架构：$(uname -m)" ;;
esac

echo "  node $(node -v) / npm $(npm -v) / $(uname -m)"

echo "▸ 安装依赖"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "▸ 构建（首次会下载 Electron，约几分钟）"
Scripts/make-app.sh

[ -d "$APP_DIR" ] || fail "构建结束但未找到产物：$APP_DIR"

echo "▸ 安装到 /Applications"
if pgrep -f "/Applications/${APP_NAME}.app/Contents/MacOS/${APP_NAME}" >/dev/null 2>&1; then
  echo "  检测到正在运行的旧版本，先退出"
  pkill -f "/Applications/${APP_NAME}.app/Contents/MacOS/${APP_NAME}" || true
  sleep 1
fi

rm -rf "/Applications/${APP_NAME}.app"
cp -R "$APP_DIR" /Applications/

echo
echo "✓ 已安装：/Applications/${APP_NAME}.app"
echo
echo "  启动：open -a ${APP_NAME}"
echo "  若要扫描 Safari/Mail 缓存等受保护目录，请在"
echo "  系统设置 → 隐私与安全性 → 完全磁盘访问 中加入 ${APP_NAME}。"
