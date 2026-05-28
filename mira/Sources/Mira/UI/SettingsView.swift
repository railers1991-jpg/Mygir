import SwiftUI
import AVFoundation

struct SettingsView: View {
    @EnvironmentObject var settings: MiraSettings
    @State private var keyDraft: String = ""
    @State private var showKey: Bool = false

    var body: some View {
        TabView {
            providerTab.tabItem { Label("Провайдер", systemImage: "brain") }
            promptTab.tabItem { Label("Промпт", systemImage: "text.bubble") }
            voiceTab.tabItem { Label("Голос", systemImage: "waveform") }
        }
        .frame(width: 560, height: 460)
        .padding(20)
        .onAppear { keyDraft = settings.anthropicAPIKey }
    }

    // MARK: - Провайдер

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
            Text("Ключ хранится в Keychain под service `Mira`, account `anthropic_api_key`.")
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

    // MARK: - Промпт

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

    // MARK: - Голос

    private var voiceTab: some View {
        Form {
            Section("Распознавание") {
                Picker("Язык", selection: $settings.speechLocale) {
                    ForEach(speechLocales, id: \.self) { code in
                        Text(localeLabel(code)).tag(code)
                    }
                }
                Text("Системе нужно разрешение на микрофон и распознавание речи — будет запрошено при первом нажатии ⌘L.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Озвучка") {
                Toggle("Озвучивать ответы", isOn: $settings.ttsEnabled)
                Picker("Голос", selection: $settings.ttsVoiceID) {
                    Text("Системный по умолчанию").tag("")
                    ForEach(voices, id: \.identifier) { voice in
                        Text("\(voice.name) — \(voice.language)").tag(voice.identifier)
                    }
                }
                .disabled(!settings.ttsEnabled)
            }
        }
    }

    private var voices: [AVSpeechSynthesisVoice] {
        SystemSpeechSynthesizer.availableVoices
    }

    private let speechLocales = [
        "ru-RU", "en-US", "en-GB", "uk-UA", "de-DE", "fr-FR", "es-ES", "it-IT",
        "pt-BR", "ja-JP", "zh-CN", "tr-TR", "pl-PL", "nl-NL"
    ]

    private func localeLabel(_ code: String) -> String {
        let locale = Locale(identifier: code)
        let name = locale.localizedString(forIdentifier: code) ?? code
        return "\(name) (\(code))"
    }
}
