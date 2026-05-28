import Foundation

/// Простое JSON-хранилище — на следующей фазе заменим на SQLite + векторный индекс.
public actor DiskStore: MemoryStore {
    private let url: URL
    private var messages: [ChatMessage] = []

    public init(filename: String = "jarvis-memory.json") throws {
        let fm = FileManager.default
        let dir = try fm.url(for: .applicationSupportDirectory, in: .userDomainMask,
                             appropriateFor: nil, create: true)
            .appendingPathComponent("Jarvis", isDirectory: true)
        try fm.createDirectory(at: dir, withIntermediateDirectories: true)
        self.url = dir.appendingPathComponent(filename)
        if let data = try? Data(contentsOf: url),
           let decoded = try? JSONDecoder().decode([ChatMessage].self, from: data) {
            self.messages = decoded
        }
    }

    public func append(_ message: ChatMessage) async {
        messages.append(message)
        persist()
    }

    public func recentContext(limit: Int) async -> [ChatMessage] {
        Array(messages.suffix(limit))
    }

    public func search(query: String, limit: Int) async -> [ChatMessage] {
        let q = query.lowercased()
        return messages
            .filter { $0.content.lowercased().contains(q) }
            .suffix(limit)
            .map { $0 }
    }

    public func clear() async {
        messages.removeAll()
        persist()
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(messages) else { return }
        try? data.write(to: url, options: .atomic)
    }
}
