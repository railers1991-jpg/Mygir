import Foundation

public protocol MemoryStore: Sendable {
    func append(_ message: ChatMessage) async
    func recentContext(limit: Int) async -> [ChatMessage]
    func search(query: String, limit: Int) async -> [ChatMessage]
}

public actor InMemoryStore: MemoryStore {
    private var messages: [ChatMessage] = []

    public init() {}

    public func append(_ message: ChatMessage) async {
        messages.append(message)
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
}
