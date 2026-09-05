import Foundation

/// 各类别扫描器的统一接口（命名避开 Foundation.Scanner）
protocol CleanupScanner: Sendable {
    var category: CleanCategory { get }
    func scan() async -> [CleanableItem]
}

enum ScanOrchestrator {
    static func makeScanners() -> [any CleanupScanner] {
        [CacheScanner(), DevJunkScanner(), LargeFileScanner(), AppLeftoverScanner()]
    }
}

enum DiskUsage {
    /// 计算文件或目录实际占用的磁盘空间
    static func size(of url: URL) -> Int64 {
        let keys: Set<URLResourceKey> = [.isDirectoryKey, .totalFileAllocatedSizeKey, .fileAllocatedSizeKey]
        guard let values = try? url.resourceValues(forKeys: keys) else { return 0 }
        guard values.isDirectory == true else {
            return Int64(values.totalFileAllocatedSize ?? values.fileAllocatedSize ?? 0)
        }
        var total: Int64 = 0
        let enumerator = FileManager.default.enumerator(
            at: url,
            includingPropertiesForKeys: [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey],
            options: [],
            errorHandler: { _, _ in true }
        )
        while let child = enumerator?.nextObject() as? URL {
            let v = try? child.resourceValues(forKeys: [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey])
            total += Int64(v?.totalFileAllocatedSize ?? v?.fileAllocatedSize ?? 0)
        }
        return total
    }
}

extension CleanupScanner {
    /// 把目录下每个直接子项收集为一个可清理项
    func collectChildren(
        of directory: URL,
        detail: String,
        safety: CleanableItem.Safety,
        excluding excludedNames: Set<String> = []
    ) -> [CleanableItem] {
        guard let children = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return [] }
        return children.compactMap { child in
            guard !excludedNames.contains(child.lastPathComponent) else { return nil }
            let size = DiskUsage.size(of: child)
            guard size > 0 else { return nil }
            return CleanableItem(
                url: child,
                name: child.lastPathComponent,
                detail: detail,
                size: size,
                category: category,
                safety: safety
            )
        }
    }

    /// 把单个路径整体收集为一个可清理项，路径不存在或为空时返回 nil
    func collectItem(
        at url: URL,
        name: String? = nil,
        detail: String,
        safety: CleanableItem.Safety
    ) -> CleanableItem? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        let size = DiskUsage.size(of: url)
        guard size > 0 else { return nil }
        return CleanableItem(
            url: url,
            name: name ?? url.lastPathComponent,
            detail: detail,
            size: size,
            category: category,
            safety: safety
        )
    }
}
