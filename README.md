# MacCleaner

本地优先的 macOS 清理工具。桌面界面使用 Electron + React + Vite，扫描与清理由随应用打包的 Swift 核心执行，不需要后端服务。

## 功能

| 类别 | 内容 | 默认勾选 |
| --- | --- | --- |
| 系统垃圾 | `~/Library/Caches`、`~/Library/Logs`、用户临时目录 | ✅（临时文件除外） |
| 开发者垃圾 | DerivedData、旧 DeviceSupport、不可用模拟器、CocoaPods / Homebrew / npm 缓存；Archives、`.pub-cache`、Gradle 缓存标记为"谨慎" | ✅ 安全项 |
| 大文件 | 家目录中 >500 MB 且 90 天未访问的文件 | ❌ 手动勾选 |
| 应用残留 | Application Support / Preferences / Containers 中找不到对应应用的反域名条目 | ❌ 手动勾选 |

**安全策略**：所有清理一律移入废纸篓（可恢复），绝不直接删除；家目录顶层目录、`~/Library` 及其关键子目录本身在白名单保护内，永远不会被清理。

## 开发

```bash
# Node.js 22
npm install

# 启动 Vite 与 Electron；启动前会构建 Swift 调试版本
npm run dev

# 单元测试、TypeScript 检查和 Vite 生产构建
npm run check
```

浏览器预览模式使用内置演示数据，不会读取或修改本机文件：

```bash
npm run dev:web
```

## 打包

```bash
# 构建 Vite、Swift release helper 和 Electron .app
Scripts/make-app.sh
```

Apple Silicon 输出：

```text
release/mac-arm64/MacCleaner.app
```

Swift 核心命令行模式（调试用）：

```bash
.build/debug/MacCleaner --scan          # 只扫描并打印结果
.build/debug/MacCleaner --trash <path>  # 把指定路径移入废纸篓（走同一套安全检查）
```

Electron 与 Swift 核心之间使用本机进程标准输入输出交换 JSON。渲染页面没有 Node.js 权限，清理请求只能引用本轮扫描返回的项目，Swift 核心会再次执行路径与安全级别校验。

## 权限说明

部分目录（Safari/Mail 缓存、其它 App 的沙盒容器）受系统 TCC 保护，未授权时扫描会自动跳过。如需完整扫描，把 `MacCleaner.app` 加入「系统设置 → 隐私与安全性 → 完全磁盘访问」。

清理包管理器缓存（npm / CocoaPods / Homebrew / pub / Gradle）后，下次构建会重新下载对应依赖，属预期行为。
