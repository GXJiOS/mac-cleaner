import Foundation

struct CleanableItem: Identifiable, Hashable, Sendable {
    enum Safety: Hashable, Sendable {
        /// 删除后系统或应用可自动重建，默认勾选
        case safe
        /// 删除有代价或有误判可能，默认不勾选
        case caution
    }

    let url: URL
    let name: String
    let detail: String
    let size: Int64
    let category: CleanCategory
    let safety: Safety

    var id: String { url.path }

    var formattedSize: String { Self.format(size) }

    static func format(_ bytes: Int64) -> String {
        ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
    }
}
