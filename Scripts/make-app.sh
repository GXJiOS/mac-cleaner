#!/bin/bash
# 构建 Vite 界面、Swift 清理核心，并组装成可直接运行的 MacCleaner.app。
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v npm >/dev/null 2>&1; then
  echo "未找到 npm。请安装 Node.js 22 后重试。" >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "依赖尚未安装，请先运行 npm install。" >&2
  exit 1
fi

export CSC_IDENTITY_AUTO_DISCOVERY=false
export ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
npm run dist:mac

case "$(uname -m)" in
  arm64) APP_DIR="release/mac-arm64/MacCleaner.app" ;;
  x86_64) APP_DIR="release/mac/MacCleaner.app" ;;
  *) echo "当前 CPU 架构暂不支持：$(uname -m)" >&2; exit 1 ;;
esac

if [[ ! -d "$APP_DIR" ]]; then
  echo "打包完成，但未找到预期应用：$APP_DIR" >&2
  exit 1
fi

# 本地构建使用 ad-hoc 签名。
codesign --force --deep --sign - "$APP_DIR"

echo "已生成 $(pwd)/$APP_DIR"
echo "可直接运行，或拖到 /Applications 后授权「完全磁盘访问」以扫描受保护目录。"
