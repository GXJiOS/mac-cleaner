import Foundation

struct LargeFileScanner: CleanupScanner {
    var category: CleanCategory { .largeFiles }

    static let minSize: Int64 = 500 * 1024 * 1024
    static let minIdleDays = 90
    /// 依赖目录体积大但不该按单文件清理；~/Library 由其它扫描器负责
    private static let excludedDirNames: Set<String> = ["node_modules", "Pods", ".build"]

    func scan() async -> [CleanableItem] {
        let fm = FileManager.default
        let home = fm.homeDirectoryForCurrentUser
        let libraryPath = home.appending(path: "Library").path
        let keys: Set<URLResourceKey> = [
            .isRegularFileKey, .isDirectoryKey,
            .totalFileAllocatedSizeKey, .fileAllocatedSizeKey,
            .contentAccessDateKey, .contentModificationDateKey,
        ]
        guard let enumerator = fm.enumerator(
            at: home,
            includingPropertiesForKeys: Array(keys),
            options: [.skipsHiddenFiles, .skipsPackageDescendants],
            errorHandler: { _, _ in true }
        ) else { return [] }

        let cutoff = Calendar.current.date(byAdding: .day, value: -Self.minIdleDays, to: Date()) ?? Date()
        var results: [CleanableItem] = []

        while let url = enumerator.nextObject() as? URL {
            guard let values = try? url.resourceValues(forKeys: keys) else { continue }
            if values.isDirectory == true {
                if Self.excludedDirNames.contains(url.lastPathComponent) || url.path == libraryPath {
                    enumerator.skipDescendants()
                }
                continue
            }
            guard values.isRegularFile == true else { continue }
            let size = Int64(values.totalFileAllocatedSize ?? values.fileAllocatedSize ?? 0)
            guard size >= Self.minSize else { continue }
            let lastUsed = values.contentAccessDate ?? values.contentModificationDate ?? .distantPast
            guard lastUsed < cutoff else { continue }

            let dateText = lastUsed == .distantPast
                ? "未知"
                : lastUsed.formatted(date: .numeric, time: .omitted)
            let folder = url.deletingLastPathComponent().path
                .replacingOccurrences(of: home.path, with: "~")
            results.append(CleanableItem(
                url: url,
                name: url.lastPathComponent,
                detail: "上次访问 \(dateText) · \(folder)",
                size: size,
                category: category,
                safety: .caution
            ))
        }
        return results
    }
}
