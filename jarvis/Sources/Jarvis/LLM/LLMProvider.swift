import Foundation

public protocol LLMProvider: Sendable {
    var name: String { get }
    /// `messages` уже включает текущий запрос пользователя последним элементом.
    func complete(messages: [ChatMessage]) async throws -> String
}

public struct EchoLLMProvider: LLMProvider {
    public init() {}
    public var name: String { "echo (заглушка)" }

    public func complete(messages: [ChatMessage]) async throws -> String {
        try await Task.sleep(nanoseconds: 200_000_000)
        let last = messages.last?.content ?? ""
        return "Услышал: \(last). (Подключи реального провайдера в LLM/AnthropicProvider.swift или LLM/LocalProvider.swift.)"
    }
}
