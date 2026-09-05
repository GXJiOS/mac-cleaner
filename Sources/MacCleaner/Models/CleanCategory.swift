import Foundation

enum CleanCategory: String, CaseIterable, Identifiable, Sendable {
    case userCache
    case devJunk
    case largeFiles
    case appLeftovers

    var id: String { rawValue }

    var title: String {
        switch self {
        case .userCache: "系统垃圾"
        case .devJunk: "开发者垃圾"
        case .largeFiles: "大文件"
        case .appLeftovers: "应用残留"
        }
    }

    var subtitle: String {
        switch self {
        case .userCache: "用户缓存、应用日志和临时文件"
        case .devJunk: "Xcode 构建产物、模拟器和包管理器缓存"
        case .largeFiles: "超过 500 MB 且 90 天未访问的文件，请自行判断后勾选"
        case .appLeftovers: "疑似已卸载应用留下的配置和数据，请确认后勾选"
        }
    }

    var systemImage: String {
        switch self {
        case .userCache: "internaldrive"
        case .devJunk: "hammer"
        case .largeFiles: "shippingbox"
        case .appLeftovers: "puzzlepiece.extension"
        }
    }
}
