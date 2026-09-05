import Foundation

struct CacheScanner: CleanupScanner {
    var category: CleanCategory { .userCache }

    /// 这两个缓存归开发者垃圾扫描器管，避免重复统计
    private static let devOwnedCaches: Set<String> = ["CocoaPods", "Homebrew"]

    func scan() async -> [CleanableItem] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        var results: [CleanableItem] = []
        results += collectChildren(
            of: home.appending(path: "Library/Caches"),
            detail: "用户缓存，删除后应用会自动重建",
            safety: .safe,
            excluding: Self.devOwnedCaches
        )
        results += collectChildren(
            of: home.appending(path: "Library/Logs"),
            detail: "应用日志",
            safety: .safe
        )
        results += collectChildren(
            of: URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true),
            detail: "临时文件，可能仍被运行中的应用使用",
            safety: .caution
        )
        return results
    }
}
