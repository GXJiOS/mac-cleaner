import Foundation
import Observation

@MainActor
@Observable
final class AppState {
    enum Phase: Equatable {
        case idle, scanning, cleaning
    }

    var phase: Phase = .idle
    var hasScanned = false
    var itemsByCategory: [CleanCategory: [CleanableItem]] = [:]
    /// 扫描中尚未出结果的类别
    var pendingCategories: Set<CleanCategory> = []
    var selectedIDs: Set<String> = []
    var selectedCategory: CleanCategory?
    var lastCleanResult: CleanResult?

    var allItems: [CleanableItem] {
        CleanCategory.allCases.flatMap { itemsByCategory[$0] ?? [] }
    }

    var totalSize: Int64 { allItems.reduce(0) { $0 + $1.size } }

    var selectedItems: [CleanableItem] { allItems.filter { selectedIDs.contains($0.id) } }

    var selectedSize: Int64 { selectedItems.reduce(0) { $0 + $1.size } }

    func items(in category: CleanCategory) -> [CleanableItem] {
        itemsByCategory[category] ?? []
    }

    func totalSize(in category: CleanCategory) -> Int64 {
        items(in: category).reduce(0) { $0 + $1.size }
    }

    func startScan() {
        guard phase == .idle else { return }
        phase = .scanning
        hasScanned = true
        itemsByCategory = [:]
        selectedIDs = []
        lastCleanResult = nil
        pendingCategories = Set(CleanCategory.allCases)

        Task {
            await withTaskGroup(of: (CleanCategory, [CleanableItem]).self) { group in
                for scanner in ScanOrchestrator.makeScanners() {
                    group.addTask { (scanner.category, await scanner.scan()) }
                }
                for await (category, items) in group {
                    itemsByCategory[category] = items.sorted { $0.size > $1.size }
                    pendingCategories.remove(category)
                    for item in items where item.safety == .safe {
                        selectedIDs.insert(item.id)
                    }
                }
            }
            phase = .idle
        }
    }

    func cleanSelected() {
        guard phase == .idle, !selectedItems.isEmpty else { return }
        phase = .cleaning
        let items = selectedItems
        Task {
            let result = await Task.detached(priority: .userInitiated) {
                CleanerService.clean(items)
            }.value
            apply(result)
            phase = .idle
        }
    }

    func setSelection(_ selected: Bool, in category: CleanCategory) {
        let ids = items(in: category).map(\.id)
        if selected {
            selectedIDs.formUnion(ids)
        } else {
            selectedIDs.subtract(ids)
        }
    }

    private func apply(_ result: CleanResult) {
        let cleaned = Set(result.cleanedIDs)
        for category in CleanCategory.allCases {
            itemsByCategory[category]?.removeAll { cleaned.contains($0.id) }
        }
        selectedIDs.subtract(cleaned)
        lastCleanResult = result
    }
}
