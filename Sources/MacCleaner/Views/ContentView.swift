import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) private var state
    @State private var showCleanConfirm = false

    var body: some View {
        @Bindable var state = state
        NavigationSplitView {
            List(selection: $state.selectedCategory) {
                Section("清理类别") {
                    ForEach(CleanCategory.allCases) { category in
                        CategoryRow(category: category)
                            .tag(category)
                    }
                }
            }
            .navigationSplitViewColumnWidth(min: 220, ideal: 240)
        } detail: {
            if let category = state.selectedCategory {
                ResultListView(category: category)
            } else {
                OverviewView()
            }
        }
        .navigationTitle("MacCleaner")
        .toolbar { toolbarContent }
        .confirmationDialog("确定要清理吗？", isPresented: $showCleanConfirm) {
            Button("移到废纸篓", role: .destructive) { state.cleanSelected() }
        } message: {
            Text("将把 \(state.selectedItems.count) 个项目（共 \(CleanableItem.format(state.selectedSize))）移入废纸篓，可随时恢复。")
        }
        .alert("清理完成", isPresented: cleanResultPresented, presenting: state.lastCleanResult) { _ in
            Button("好") { state.lastCleanResult = nil }
        } message: { result in
            Text(summary(of: result))
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button {
                state.startScan()
            } label: {
                Label(state.phase == .scanning ? "扫描中…" : "扫描", systemImage: "magnifyingglass")
            }
            .disabled(state.phase != .idle)
        }
        ToolbarItem(placement: .primaryAction) {
            Button {
                showCleanConfirm = true
            } label: {
                Label("清理 \(CleanableItem.format(state.selectedSize))", systemImage: "trash")
            }
            .disabled(state.phase != .idle || state.selectedItems.isEmpty)
        }
    }

    private var cleanResultPresented: Binding<Bool> {
        Binding(
            get: { state.lastCleanResult != nil },
            set: { if !$0 { state.lastCleanResult = nil } }
        )
    }

    private func summary(of result: CleanResult) -> String {
        var text = "已把 \(result.cleanedIDs.count) 个项目（\(CleanableItem.format(result.cleanedSize))）移入废纸篓。"
        if !result.failures.isEmpty {
            let detail = result.failures.prefix(5)
                .map { "\($0.name)：\($0.reason)" }
                .joined(separator: "\n")
            text += "\n\(result.failures.count) 项清理失败：\n\(detail)"
        }
        return text
    }
}

private struct CategoryRow: View {
    @Environment(AppState.self) private var state
    let category: CleanCategory

    var body: some View {
        HStack {
            Label(category.title, systemImage: category.systemImage)
            Spacer()
            if state.pendingCategories.contains(category), state.phase == .scanning {
                ProgressView()
                    .controlSize(.small)
            } else if state.hasScanned {
                Text(CleanableItem.format(state.totalSize(in: category)))
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct OverviewView: View {
    @Environment(AppState.self) private var state

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "sparkles")
                .font(.system(size: 56))
                .foregroundStyle(.tint)
            Text("MacCleaner")
                .font(.largeTitle.bold())

            if state.phase == .scanning {
                ProgressView("正在扫描…")
            } else if state.hasScanned {
                VStack(spacing: 6) {
                    Text("发现 \(state.allItems.count) 项可清理，合计 \(CleanableItem.format(state.totalSize))")
                        .font(.title3)
                    Text("已默认勾选 \(state.selectedItems.count) 项安全内容（\(CleanableItem.format(state.selectedSize))），从左侧选择类别查看明细")
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("扫描缓存、开发者垃圾、大文件和应用残留")
                    .foregroundStyle(.secondary)
                Button("开始扫描") { state.startScan() }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
