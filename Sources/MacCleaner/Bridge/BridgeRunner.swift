import Foundation

enum BridgeRunner {
    private struct CategoryPayload: Encodable {
        let id: String
        let title: String
        let subtitle: String
    }

    private struct ItemPayload: Codable, Sendable {
        let id: String
        let path: String
        let name: String
        let detail: String
        let size: Int64
        let category: String
        let safety: String

        init(item: CleanableItem) {
            id = item.id
            path = item.url.path
            name = item.name
            detail = item.detail
            size = item.size
            category = item.category.rawValue
            safety = item.safety == .safe ? "safe" : "caution"
        }

        func cleanableItem() -> CleanableItem? {
            guard id == path,
                  let cleanCategory = CleanCategory(rawValue: category),
                  safety == "safe" || safety == "caution"
            else { return nil }

            let url = URL(fileURLWithPath: path).standardizedFileURL
            return CleanableItem(
                url: url,
                name: url.lastPathComponent,
                detail: detail,
                size: DiskUsage.size(of: url),
                category: cleanCategory,
                safety: safety == "safe" ? .safe : .caution
            )
        }
    }

    private struct CategoryEvent: Encodable {
        let type = "category"
        let category: CategoryPayload
        let items: [ItemPayload]
    }

    private struct CompleteEvent: Encodable {
        let type = "complete"
    }

    private struct FailurePayload: Encodable {
        let name: String
        let reason: String
    }

    private struct CleanRequest: Decodable {
        let items: [ItemPayload]
    }

    private struct CleanEvent: Encodable {
        let type = "clean-result"
        let cleanedIDs: [String]
        let cleanedSize: Int64
        let failures: [FailurePayload]
    }

    private struct ErrorEvent: Encodable {
        let type = "error"
        let message: String
    }

    static func scan() async {
        await withTaskGroup(of: (CleanCategory, [CleanableItem]).self) { group in
            for scanner in ScanOrchestrator.makeScanners() {
                group.addTask { (scanner.category, await scanner.scan()) }
            }

            for await (category, items) in group {
                write(CategoryEvent(
                    category: CategoryPayload(
                        id: category.rawValue,
                        title: category.title,
                        subtitle: category.subtitle
                    ),
                    items: items.sorted { $0.size > $1.size }.map(ItemPayload.init)
                ))
            }
        }
        write(CompleteEvent())
    }

    static func clean() {
        let data = FileHandle.standardInput.readDataToEndOfFile()
        do {
            let request = try JSONDecoder().decode(CleanRequest.self, from: data)
            guard request.items.count <= 10_000 else {
                write(ErrorEvent(message: "一次最多清理 10000 个项目"))
                return
            }
            let items = request.items.compactMap { $0.cleanableItem() }
            guard items.count == request.items.count else {
                write(ErrorEvent(message: "清理请求包含无效项目"))
                return
            }
            let result = CleanerService.clean(items)
            write(CleanEvent(
                cleanedIDs: result.cleanedIDs,
                cleanedSize: result.cleanedSize,
                failures: result.failures.map {
                    FailurePayload(name: $0.name, reason: $0.reason)
                }
            ))
        } catch {
            write(ErrorEvent(message: "无法解析清理请求：\(error.localizedDescription)"))
        }
    }

    private static func write<T: Encodable>(_ payload: T) {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.withoutEscapingSlashes]
        guard let data = try? encoder.encode(payload) else { return }
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data([0x0A]))
    }
}
