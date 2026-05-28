import SwiftUI

@main
struct JarvisApp: App {
    @StateObject private var settings: JarvisSettings
    @StateObject private var orchestrator: Orchestrator

    init() {
        let settings = JarvisSettings()
        let memory: MemoryStore = (try? DiskStore()) ?? InMemoryStore()
        _settings = StateObject(wrappedValue: settings)
        _orchestrator = StateObject(wrappedValue: Orchestrator(
            settings: settings,
            memory: memory
        ))
    }

    var body: some Scene {
        WindowGroup("Jarvis") {
            ContentView()
                .environmentObject(orchestrator)
                .environmentObject(settings)
                .frame(minWidth: 520, minHeight: 600)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("Очистить контекст") {
                    Task { await orchestrator.clearConversation() }
                }
                .keyboardShortcut("k", modifiers: [.command, .shift])
            }
        }

        Settings {
            SettingsView()
                .environmentObject(settings)
        }
    }
}
