import Foundation
import Combine

@MainActor
public final class Orchestrator: ObservableObject {
    @Published public private(set) var messages: [ChatMessage] = []
    @Published public private(set) var isThinking: Bool = false

    private let llm: LLMProvider
    private let memory: MemoryStore

    public var providerName: String { llm.name }

    public init(llm: LLMProvider, memory: MemoryStore) {
        self.llm = llm
        self.memory = memory
        let greeting = ChatMessage(
            role: .system,
            content: "Привет. Я — Jarvis (скелет v0.1). Голос, память и управление маком подключим в следующих фазах."
        )
        messages = [greeting]
    }

    public func handle(userInput: String) async {
        let userMessage = ChatMessage(role: .user, content: userInput)
        messages.append(userMessage)
        await memory.append(userMessage)

        isThinking = true
        defer { isThinking = false }

        do {
            let context = await memory.recentContext(limit: 20)
            let reply = try await llm.complete(messages: context)
            let assistantMessage = ChatMessage(role: .assistant, content: reply)
            messages.append(assistantMessage)
            await memory.append(assistantMessage)
        } catch {
            messages.append(ChatMessage(
                role: .system,
                content: "Ошибка LLM: \(error.localizedDescription)"
            ))
        }
    }
}
