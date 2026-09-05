import Foundation

struct DevJunkScanner: CleanupScanner {
    var category: CleanCategory { .devJunk }

    func scan() async -> [CleanableItem] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let xcode = home.appending(path: "Library/Developer/Xcode")
        var results: [CleanableItem] = []

        results += collectChildren(
            of: xcode.appending(path: "DerivedData"),
            detail: "Xcode 构建产物，可随时重新生成",
            safety: .safe
        )
        results += collectChildren(
            of: xcode.appending(path: "Archives"),
            detail: "App 归档，可能包含未上传的发布版本",
            safety: .caution
        )
        results += collectChildren(
            of: xcode.appending(path: "iOS DeviceSupport"),
            detail: "设备调试符号，连接设备后可重新生成",
            safety: .safe
        )

        let singles: [(path: String, name: String, detail: String, safety: CleanableItem.Safety)] = [
            ("Library/Developer/CoreSimulator/Caches", "模拟器缓存", "CoreSimulator 缓存，可自动重建", .safe),
            ("Library/Caches/CocoaPods", "CocoaPods 缓存", "Pod 下载缓存，需要时会重新下载", .safe),
            ("Library/Caches/Homebrew", "Homebrew 缓存", "brew 下载缓存，等价于 brew cleanup", .safe),
            (".npm/_cacache", "npm 缓存", "npm 下载缓存，需要时会重新下载", .safe),
            (".pub-cache", "Dart/Flutter 包缓存", "删除后所有 Flutter 项目需重新 pub get", .caution),
            (".gradle/caches", "Gradle 缓存", "删除后 Android 构建需重新下载依赖", .caution),
        ]
        for entry in singles {
            if let item = collectItem(
                at: home.appending(path: entry.path),
                name: entry.name,
                detail: entry.detail,
                safety: entry.safety
            ) {
                results.append(item)
            }
        }

        results += unavailableSimulators(home: home)
        return results
    }

    /// 运行时已被删除、无法再启动的模拟器（等价于 simctl delete unavailable）
    private func unavailableSimulators(home: URL) -> [CleanableItem] {
        struct DeviceList: Decodable { let devices: [String: [Device]] }
        struct Device: Decodable {
            let udid: String
            let name: String
            let isAvailable: Bool
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/xcrun")
        process.arguments = ["simctl", "list", "devices", "-j"]
        let stdout = Pipe()
        process.standardOutput = stdout
        process.standardError = Pipe()
        do { try process.run() } catch { return [] }
        let data = stdout.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        guard process.terminationStatus == 0,
              let list = try? JSONDecoder().decode(DeviceList.self, from: data) else { return [] }

        let devicesDir = home.appending(path: "Library/Developer/CoreSimulator/Devices")
        var results: [CleanableItem] = []
        for device in list.devices.values.flatMap({ $0 }) where !device.isAvailable {
            if let item = collectItem(
                at: devicesDir.appending(path: device.udid),
                name: "不可用模拟器：\(device.name)",
                detail: "对应运行时已删除，模拟器无法再启动",
                safety: .safe
            ) {
                results.append(item)
            }
        }
        return results
    }
}
