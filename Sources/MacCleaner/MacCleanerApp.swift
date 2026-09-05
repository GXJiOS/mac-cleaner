import SwiftUI

@main
enum Main {
    static func main() {
        let args = CommandLine.arguments
        if args.contains("--bridge-scan") {
            runBlocking { await BridgeRunner.scan() }
        } else if args.contains("--bridge-clean") {
            BridgeRunner.clean()
        } else if args.contains("--scan") {
            runBlocking { await HeadlessRunner.scan() }
        } else if let index = args.firstIndex(of: "--trash"), args.count > index + 1 {
            HeadlessRunner.trash(path: args[index + 1])
        } else {
            MacCleanerApp.main()
        }
    }

    private static func runBlocking(_ body: @escaping @Sendable () async -> Void) {
        let semaphore = DispatchSemaphore(value: 0)
        Task.detached {
            await body()
            semaphore.signal()
        }
        semaphore.wait()
    }
}

struct MacCleanerApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .frame(minWidth: 920, minHeight: 580)
                .onAppear {
                    // SPM 可执行文件没有 app bundle，需要手动升级为常规应用才能显示窗口和 Dock 图标
                    NSApp.setActivationPolicy(.regular)
                    NSApp.activate(ignoringOtherApps: true)
                }
        }
    }
}

/// 命令行模式，便于无界面验证扫描与清理逻辑：
/// MacCleaner --scan            只扫描并打印结果
/// MacCleaner --trash <path>    把指定路径移入废纸篓（走同一套安全检查）
enum HeadlessRunner {
    static func scan() async {
        for scanner in ScanOrchestrator.makeScanners() {
            let items = await scanner.scan()
            let total = items.reduce(Int64(0)) { $0 + $1.size }
            print("== \(scanner.category.title)：\(items.count) 项，共 \(CleanableItem.format(total))")
            for item in items.sorted(by: { $0.size > $1.size }).prefix(10) {
                let tag = item.safety == .safe ? "安全" : "谨慎"
                print("  [\(tag)] \(item.formattedSize)\t\(item.url.path)")
            }
        }
    }

    static func trash(path: String) {
        let url = URL(fileURLWithPath: (path as NSString).expandingTildeInPath)
        let item = CleanableItem(
            url: url,
            name: url.lastPathComponent,
            detail: "",
            size: DiskUsage.size(of: url),
            category: .userCache,
            safety: .caution
        )
        let result = CleanerService.clean([item])
        if let failure = result.failures.first {
            print("失败：\(failure.reason)")
        } else {
            print("已移入废纸篓：\(url.path)")
        }
    }
}
