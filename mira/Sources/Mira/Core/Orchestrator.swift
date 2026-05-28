import Foundation
import Combine

@MainActor
public final class Orchestrator: ObservableObject {
    @Published public private(set) var messages: [ChatMessage] = []
    @Published public private(set) var isThinking: Bool = false
    @Published public private(set) var providerName: String

    private var llm: LLMProvider
    private let memory: MemoryStore
    private let settings: MiraSettings
    private let synthesizer = SystemSpeechSynthesizer()
    private var settingsCancellable: AnyCancellable?

    public init(settings: MiraSettings, memory: MemoryStore) {
        self.settings = settings
        self.memory = memory
        let initial = settings.makeProvider()
        self.llm = initial
        self.providerName = initial.name

        Task { @MainActor in
            let stored = await memory.recentContext(limit: 100)
            if stored.isEmpty {
                let greeting = ChatMessage(
                    role: .system,
                    content: "Привет. Я — Mira (v0.3). Нажми кнопку микрофона или ⌘L, чтобы говорить."
                )
                messages = [greeting]
                await memory.append(greeting)
            } else {
                messages = stored
            }
        }

        settingsCancellable = Publishers.Merge4(
            settings.$provider.map { _ in () },
            settings.$anthropicAPIKey.map { _ in () },
            settings.$anthropicModel.map { _ in () },
            settings.$ollamaModel.map { _ in () }
        )
        .dropFirst()
        .receive(on: RunLoop.main)
        .sink { [weak self] in self?.rebuildProvider() }
    }

    private func rebuildProvider() {
        llm = settings.makeProvider()
        providerName = llm.name
    }

    public func handle(userInput: String) async {
        let trimmed = userInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        let userMessage = ChatMessage(role: .user, content: trimmed)
        messages.append(userMessage)
        await memory.append(userMessage)

        isThinking = true
        defer { isThinking = false }

        let context = await memory.recentContext(limit: 20)
        let assistantId = UUID()
        messages.append(ChatMessage(id: assistantId, role: .assistant, content: ""))

        do {
            var collected = ""
            let stream = llm.stream(messages: context, systemPrompt: settings.systemPrompt)
            for try await chunk in stream {
                collected += chunk
                if let idx = messages.firstIndex(where: { $0.id == assistantId }) {
                    messages[idx] = ChatMessage(
                        id: assistantId, role: .assistant,
                        content: collected, createdAt: messages[idx].createdAt
                    )
                }
            }
            if let idx = messages.firstIndex(where: { $0.id == assistantId }) {
                await memory.append(messages[idx])
                if settings.ttsEnabled {
                    let voiceID = settings.ttsVoiceID.isEmpty ? nil : settings.ttsVoiceID
                    synthesizer.speak(messages[idx].content, voiceID: voiceID)
                }
            }
        } catch {
            if let idx = messages.firstIndex(where: { $0.id == assistantId }) {
                messages.remove(at: idx)
            }
            messages.append(ChatMessage(
                role: .system,
                content: "Ошибка \(providerName): \(error.localizedDescription)"
            ))
        }
    }

    public func stopSpeaking() {
        synthesizer.stop()
    }

    public func clearConversation() async {
        synthesizer.stop()
        messages.removeAll()
        await memory.clear()
        let greeting = ChatMessage(role: .system, content: "Контекст очищен.")
        messages.append(greeting)
        await memory.append(greeting)
    }
}
