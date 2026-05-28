import XCTest
@testable import Mira

final class MiraCoreTests: XCTestCase {

    func testEchoProviderStreamsText() async throws {
        let provider = EchoLLMProvider()
        let messages = [ChatMessage(role: .user, content: "привет")]
        var collected = ""
        for try await chunk in provider.stream(messages: messages, systemPrompt: "") {
            collected += chunk
        }
        XCTAssertTrue(collected.contains("привет"))
    }

    func testInMemoryStoreRecentAndClear() async {
        let store = InMemoryStore()
        for i in 0..<5 {
            await store.append(ChatMessage(role: .user, content: "m\(i)"))
        }
        let last = await store.recentContext(limit: 3)
        XCTAssertEqual(last.map(\.content), ["m2", "m3", "m4"])

        await store.clear()
        let empty = await store.recentContext(limit: 10)
        XCTAssertTrue(empty.isEmpty)
    }

    @MainActor
    func testOrchestratorAppendsStreamedAssistantMessage() async {
        let settings = MiraSettings()
        settings.provider = .echo
        let memory = InMemoryStore()
        let orchestrator = Orchestrator(settings: settings, memory: memory)

        // Дожидаемся, пока ассинхронный init заполнит приветствием.
        try? await Task.sleep(nanoseconds: 50_000_000)

        await orchestrator.handle(userInput: "тест")

        let assistant = orchestrator.messages.last(where: { $0.role == .assistant })
        XCTAssertNotNil(assistant)
        XCTAssertTrue(assistant?.content.contains("тест") == true)
        XCTAssertFalse(orchestrator.isThinking)
    }
}
