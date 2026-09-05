import Foundation

struct CleanResult: Sendable {
    struct Failure: Sendable, Identifiable {
        let id = UUID()
        let name: String
        let reason: String
    }

    var cleanedIDs: [String] = []
    var cleanedSize: Int64 = 0
    var failures: [Failure] = []
}

enum CleanerService {
    /// 清理选中的项目：一律移入废纸篓，不做永久删除
    static func clean(_ items: [CleanableItem]) -> CleanResult {
        var result = CleanResult()
        let fm = FileManager.default
        for item in items {
            guard isAllowed(item.url) else {
                result.failures.append(.init(name: item.name, reason: "受保护路径，已跳过"))
                continue
            }
            do {
                try fm.trashItem(at: item.url, resultingItemURL: nil)
                result.cleanedIDs.append(item.id)
                result.cleanedSize += item.size
            } catch {
                result.failures.append(.init(name: item.name, reason: error.localizedDescription))
            }
        }
        return result
    }

    /// 只允许清理用户域（家目录、用户临时目录）内的路径，
    /// 且这些顶层目录本身绝不允许作为清理对象。
    static func isAllowed(_ url: URL) -> Bool {
        let path = url.standardizedFileURL.resolvingSymlinksInPath().path
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let inHome = path.hasPrefix(home + "/")
        let inTemp = path.hasPrefix("/private/var/folders/") || path.hasPrefix("/var/folders/")
        guard inHome || inTemp else { return false }

        let protected: Set<String> = [
            home,
            home + "/Library",
            home + "/Library/Caches",
            home + "/Library/Logs",
            home + "/Library/Preferences",
            home + "/Library/Application Support",
            home + "/Library/Containers",
            home + "/Library/Developer",
            home + "/Documents",
            home + "/Desktop",
            home + "/Downloads",
            home + "/Pictures",
            home + "/Movies",
            home + "/Music",
        ]
        return !protected.contains(path)
    }
}
