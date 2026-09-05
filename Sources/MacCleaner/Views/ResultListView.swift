import AppKit
import SwiftUI

struct ResultListView: View {
    @Environment(AppState.self) private var state
    let category: CleanCategory

    var body: some View {
        let items = state.items(in: category)
        VStack(spacing: 0) {
            header(items: items)
            Divider()
            if items.isEmpty {
                emptyView
            } else {
                List(items) { item in
                    ItemRow(item: item)
                }
            }
        }
        .navigationTitle(category.title)
    }

    private func header(items: [CleanableItem]) -> some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 2) {
                Text(category.subtitle)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                Text("\(items.count) 项 · \(CleanableItem.format(state.totalSize(in: category)))")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            Spacer()
            Button("全选") { state.setSelection(true, in: category) }
                .disabled(items.isEmpty)
            Button("全不选") { state.setSelection(false, in: category) }
                .disabled(items.isEmpty)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }

    @ViewBuilder
    private var emptyView: some View {
        if state.phase == .scanning {
            ProgressView("正在扫描…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if state.hasScanned {
            ContentUnavailableView("没有发现可清理的内容", systemImage: "checkmark.circle")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ContentUnavailableView("还未扫描", systemImage: "magnifyingglass", description: Text("点击工具栏的\u{201C}扫描\u{201D}开始"))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

private struct ItemRow: View {
    @Environment(AppState.self) private var state
    let item: CleanableItem

    var body: some View {
        HStack(spacing: 10) {
            Toggle("", isOn: isSelected)
                .toggleStyle(.checkbox)
                .labelsHidden()
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(item.name)
                        .lineLimit(1)
                    if item.safety == .caution {
                        Text("谨慎")
                            .font(.caption2)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(.orange.opacity(0.15), in: Capsule())
                            .foregroundStyle(.orange)
                    }
                }
                Text(item.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            Text(item.formattedSize)
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
        .help(item.url.path)
        .contextMenu {
            Button("在 Finder 中显示") {
                NSWorkspace.shared.activateFileViewerSelecting([item.url])
            }
        }
    }

    private var isSelected: Binding<Bool> {
        Binding(
            get: { state.selectedIDs.contains(item.id) },
            set: { selected in
                if selected {
                    state.selectedIDs.insert(item.id)
                } else {
                    state.selectedIDs.remove(item.id)
                }
            }
        )
    }
}
