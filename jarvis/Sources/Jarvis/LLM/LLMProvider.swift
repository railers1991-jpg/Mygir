import Foundation

public protocol LLMProvider: Sendable {
    var name: String { get }
    /// Поток текстовых дельт. `messages` уже включает последний запрос пользователя.
    func stream(messages: [ChatMessage], systemPrompt: String) -> AsyncThrowingStream<String, Error>
}

extension LLMProvider {
    /// Удобная обёртка: собирает весь стрим в одну строку.
    public func complete(messages: [ChatMessage], systemPrompt: String) async throws -> String {
        var result = ""
        for try await chunk in stream(messages: messages, systemPrompt: systemPrompt) {
            result += chunk
        }
        return result
    }
}

public struct EchoLLMProvider: LLMProvider {
    public init() {}
    public var name: String { "echo (заглушка)" }

    public func stream(messages: [ChatMessage], systemPrompt: String) -> AsyncThrowingStream<String, Error> {
        let last = messages.last?.content ?? ""
        let reply = "Услышал: \(last). (Открой Settings → выбери Anthropic и вставь ключ, чтобы говорить с настоящим Claude.)"
        return AsyncThrowingStream { continuation in
            Task {
                for word in reply.split(separator: " ", omittingEmptySubsequences: false) {
                    try? await Task.sleep(nanoseconds: 50_000_000)
                    continuation.yield(String(word) + " ")
                }
                continuation.finish()
            }
        }
    }
}
