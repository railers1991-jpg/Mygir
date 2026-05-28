import XCTest
@testable import Jarvis

final class OrchestratorTests: XCTestCase {
    @MainActor
    func testEchoFlow() async {
        let orchestrator = Orchestrator(llm: EchoLLMProvider(), memory: InMemoryStore())
        await orchestrator.handle(userInput: "тест")

        XCTAssertGreaterThanOrEqual(orchestrator.messages.count, 3)
        XCTAssertEqual(orchestrator.messages[1].role, .user)
        XCTAssertEqual(orchestrator.messages[1].content, "тест")
        XCTAssertEqual(orchestrator.messages[2].role, .assistant)
        XCTAssertTrue(orchestrator.messages[2].content.contains("тест"))
    }

    func testInMemoryStoreRecent() async {
        let store = InMemoryStore()
        for i in 0..<5 {
            await store.append(ChatMessage(role: .user, content: "m\(i)"))
        }
        let last = await store.recentContext(limit: 3)
        XCTAssertEqual(last.map(\.content), ["m2", "m3", "m4"])
    }
}
