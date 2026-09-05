import Foundation

/// 找出疑似已卸载应用留下的孤儿数据。
/// 只识别反域名（com.foo.bar）形式的条目，跳过 com.apple.* 和
/// 与任何已装应用同厂商前缀的条目，宁可漏报不可误报。
struct AppLeftoverScanner: CleanupScanner {
    var category: CleanCategory { .appLeftovers }

    func scan() async -> [CleanableItem] {
        let home = FileManager.default.homeDirectoryForCurrentUser
        let knownIDs = installedBundleIDs()
        let knownPrefixes = Set(knownIDs.compactMap(vendorPrefix(of:)))

        var results: [CleanableItem] = []
        results += orphans(
            in: home.appending(path: "Library/Application Support"),
            knownIDs: knownIDs, knownPrefixes: knownPrefixes,
            detail: "应用数据"
        )
        results += orphans(
            in: home.appending(path: "Library/Containers"),
            knownIDs: knownIDs, knownPrefixes: knownPrefixes,
            detail: "沙盒容器"
        )
        results += orphans(
            in: home.appending(path: "Library/Preferences"),
            suffix: ".plist",
            knownIDs: knownIDs, knownPrefixes: knownPrefixes,
            detail: "偏好设置"
        )
        return results
    }

    private func orphans(
        in directory: URL,
        suffix: String = "",
        knownIDs: Set<String>,
        knownPrefixes: Set<String>,
        detail: String
    ) -> [CleanableItem] {
        guard let children = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { return [] }

        var results: [CleanableItem] = []
        for child in children {
            var candidate = child.lastPathComponent
            if !suffix.isEmpty {
                guard candidate.hasSuffix(suffix) else { continue }
                candidate = String(candidate.dropLast(suffix.count))
            }
            guard isReverseDNS(candidate) else { continue }
            let id = candidate.lowercased()
            guard !id.hasPrefix("com.apple.") else { continue }
            guard !knownIDs.contains(id) else { continue }
            guard let prefix = vendorPrefix(of: id), !knownPrefixes.contains(prefix) else { continue }
            let size = DiskUsage.size(of: child)
            guard size > 0 else { continue }
            results.append(CleanableItem(
                url: child,
                name: candidate,
                detail: "\(detail) · 未找到对应的应用",
                size: size,
                category: category,
                safety: .caution
            ))
        }
        return results
    }

    private func isReverseDNS(_ name: String) -> Bool {
        let parts = name.components(separatedBy: ".")
        return parts.count >= 3 && parts.allSatisfy { !$0.isEmpty }
    }

    private func vendorPrefix(of id: String) -> String? {
        let parts = id.lowercased().components(separatedBy: ".")
        guard parts.count >= 2 else { return nil }
        return parts.prefix(2).joined(separator: ".")
    }

    private func installedBundleIDs() -> Set<String> {
        let fm = FileManager.default
        let home = fm.homeDirectoryForCurrentUser.path
        let dirs = [
            "/Applications",
            "/Applications/Utilities",
            "/System/Applications",
            "/System/Applications/Utilities",
            "/System/Library/CoreServices",
            "/Library/Input Methods",
            home + "/Applications",
            home + "/Library/Input Methods",
        ]

        var ids: Set<String> = []
        for dir in dirs {
            guard let names = try? fm.contentsOfDirectory(atPath: dir) else { continue }
            for name in names where name.hasSuffix(".app") {
                if let bundle = Bundle(path: dir + "/" + name),
                   let id = bundle.bundleIdentifier {
                    ids.insert(id.lowercased())
                }
            }
        }
        return ids
    }
}
