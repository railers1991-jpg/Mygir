import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var settings: JarvisSettings
    @State private var keyDraft: String = ""
    @State private var showKey: Bool = false

    var body: some View {
        TabView {
            providerTab.tabItem { Label("Провайдер", systemImage: "brain") }
            promptTab.tabItem { Label("Промпт", systemImage: "text.bubble") }
        }
        .frame(width: 520, height: 420)
        .padding(20)
        .onAppear { keyDraft = settings.anthropicAPIKey }
    }

    private var providerTab: some View {
        Form {
            Picker("Провайдер", selection: $settings.provider) {
                ForEach(ProviderKind.allCases) { kind in
                    Text(kind.label).tag(kind)
                }
            }
            .pickerStyle(.segmented)

            Divider()

            switch settings.provider {
            case .echo:
                Text("Echo-провайдер просто эхо — для проверки UI. Выбери Anthropic или Local, чтобы говорить с настоящей моделью.")
                    .foregroundStyle(.secondary)
            case .anthropic:
                anthropicSection
            case .local:
                localSection
            }
        }
    }

    private var anthropicSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Anthropic API key")
                .font(.subheadline)
            HStack {
                Group {
                    if showKey {
                        TextField("sk-ant-...", text: $keyDraft)
                    } else {
                        SecureField("sk-ant-...", text: $keyDraft)
                    }
                }
                .textFieldStyle(.roundedBorder)
                Button(showKey ? "Скрыть" : "Показать") { showKey.toggle() }
                Button("Сохранить") {
                    settings.anthropicAPIKey = keyDraft.trimmingCharacters(in: .whitespaces)
                }
                .disabled(keyDraft == settings.anthropicAPIKey)
            }
            Text("Ключ хранится в Keychain под service `Jarvis`, account `anthropic_api_key`.")
                .font(.caption)
                .foregroundStyle(.secondary)

            Divider().padding(.vertical, 4)
            TextField("Модель", text: $settings.anthropicModel)
                .textFieldStyle(.roundedBorder)
        }
    }

    private var localSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Endpoint: http://localhost:11434/api/chat")
                .font(.caption)
                .foregroundStyle(.secondary)
            TextField("Модель (например, llama3.2)", text: $settings.ollamaModel)
                .textFieldStyle(.roundedBorder)
            Text("Запусти `ollama serve` и `ollama pull <модель>` в терминале.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var promptTab: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Системный промпт")
                .font(.subheadline)
            TextEditor(text: $settings.systemPrompt)
                .font(.body.monospaced())
                .frame(minHeight: 240)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color.gray.opacity(0.3)))
            HStack {
                Spacer()
                Button("Сбросить к дефолту") { settings.resetSystemPrompt() }
            }
        }
    }
}
