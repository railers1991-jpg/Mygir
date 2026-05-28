import SwiftUI

@main
struct MiraApp: App {
    @StateObject private var settings: MiraSettings
    @StateObject private var orchestrator: Orchestrator

    init() {
        let settings = MiraSettings()
        let memory: MemoryStore = (try? DiskStore()) ?? InMemoryStore()
        _settings = StateObject(wrappedValue: settings)
        _orchestrator = StateObject(wrappedValue: Orchestrator(
            settings: settings,
            memory: memory
        ))
    }

    var body: some Scene {
        WindowGroup("Mira") {
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
