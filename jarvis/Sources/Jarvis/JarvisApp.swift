import SwiftUI

@main
struct JarvisApp: App {
    @StateObject private var orchestrator = Orchestrator(
        llm: EchoLLMProvider(),
        memory: InMemoryStore()
    )

    var body: some Scene {
        WindowGroup("Jarvis") {
            ContentView()
                .environmentObject(orchestrator)
                .frame(minWidth: 520, minHeight: 600)
        }
        .windowStyle(.hiddenTitleBar)
    }
}
